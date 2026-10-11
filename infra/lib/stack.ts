import { CfnOutput, Duration, RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib'
import { CfnApp, CfnBranch } from 'aws-cdk-lib/aws-amplify'
import { CfnStage, CorsHttpMethod, HttpApi } from 'aws-cdk-lib/aws-apigatewayv2'
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations'
import { CfnBudget } from 'aws-cdk-lib/aws-budgets'
import { Alarm, ComparisonOperator, Dashboard, GraphWidget, Metric, TextWidget, TreatMissingData } from 'aws-cdk-lib/aws-cloudwatch'
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions'
import {
  AccountRecovery,
  CfnUserPoolGroup,
  ClientAttributes,
  StringAttribute,
  UserPool,
} from 'aws-cdk-lib/aws-cognito'
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb'
import { Rule, Schedule } from 'aws-cdk-lib/aws-events'
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets'
import { PolicyStatement } from 'aws-cdk-lib/aws-iam'
import { Architecture, Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda'
import { CfnAPIKey } from 'aws-cdk-lib/aws-location'
import { FilterPattern, type IFilterPattern, LogGroup, MetricFilter, RetentionDays } from 'aws-cdk-lib/aws-logs'
import { BlockPublicAccess, Bucket, BucketEncryption, HttpMethods } from 'aws-cdk-lib/aws-s3'
import { Topic } from 'aws-cdk-lib/aws-sns'
import { EmailSubscription } from 'aws-cdk-lib/aws-sns-subscriptions'
import type { Construct } from 'constructs'
import { fileURLToPath } from 'node:url'

const root = (path: string) => fileURLToPath(new URL(`../../${path}`, import.meta.url))

export class SafeDropStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props)
    const alertEmail = process.env.BUDGET_EMAIL ?? 'aditeejha2005@gmail.com'

    const table = new Table(this, 'Table', {
      partitionKey: { name: 'pk', type: AttributeType.STRING },
      sortKey: { name: 'sk', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'expiresAt',
      removalPolicy: RemovalPolicy.DESTROY,
    })
    for (const index of ['gsi1', 'gsi2']) {
      table.addGlobalSecondaryIndex({
        indexName: index,
        partitionKey: { name: `${index}pk`, type: AttributeType.STRING },
        sortKey: { name: `${index}sk`, type: AttributeType.STRING },
      })
    }

    const userPool = new UserPool(this, 'Users', {
      userPoolName: 'safedrop-users',
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: { fullname: { required: true, mutable: true } },
      customAttributes: { pointId: new StringAttribute({ mutable: true }) },
      passwordPolicy: { minLength: 8, requireSymbols: false, requireUppercase: false },
      accountRecovery: AccountRecovery.EMAIL_ONLY,
      removalPolicy: RemovalPolicy.DESTROY,
    })
    const client = userPool.addClient('Web', {
      authFlows: { userSrp: true, userPassword: true },
      generateSecret: false,
      preventUserExistenceErrors: true,
      writeAttributes: new ClientAttributes().withStandardAttributes({ fullname: true, email: true }),
    })
    new CfnUserPoolGroup(this, 'PartnerGroup', {
      userPoolId: userPool.userPoolId,
      groupName: 'partner',
      description: 'Staff at SafeDrop drop-off points',
    })
    new CfnUserPoolGroup(this, 'DemoGroup', {
      userPoolId: userPool.userPoolId,
      groupName: 'demo',
      description: 'Judges demo account; its activity is excluded from public impact totals',
    })
    new CfnUserPoolGroup(this, 'ProcessorGroup', {
      userPoolId: userPool.userPoolId,
      groupName: 'processor',
      description: 'Staff at onboarded recycling facilities who confirm processing',
    })
    new CfnUserPoolGroup(this, 'AdminGroup', {
      userPoolId: userPool.userPoolId,
      groupName: 'admin',
      description: 'SafeDrop admins who approve pickup partners',
    })

    // The website is hosted on AWS Amplify Hosting (manual deployments from scripts/deploy.mjs).
    const site = new CfnApp(this, 'Site', {
      name: 'safedrop-ewaste',
      platform: 'WEB',
      customRules: [
        {
          source: String.raw`</^[^.]+$|\.(?!(css|gif|ico|jpg|jpeg|js|png|txt|svg|woff|woff2|ttf|map|json|webp|webmanifest)$)([^.]+$)/>`,
          target: '/index.html',
          status: '200',
        },
      ],
    })
    const branch = new CfnBranch(this, 'SiteMain', { appId: site.attrAppId, branchName: 'main', stage: 'PRODUCTION' })
    const siteUrl = `https://${branch.branchName}.${site.attrDefaultDomain}`

    // Secrets live in SSM SecureString parameters written by scripts/deploy.mjs, never in Lambda env vars.
    const secretParams = ['/safedrop/gemini-api-key', '/safedrop/qr-secret']
    const apiLogs = new LogGroup(this, 'ApiLogs', { retention: RetentionDays.ONE_WEEK, removalPolicy: RemovalPolicy.DESTROY })
    const code = Code.fromAsset(root('api/dist'))
    const api = new Function(this, 'Api', {
      runtime: Runtime.NODEJS_22_X,
      architecture: Architecture.ARM_64,
      handler: 'lambda.handler',
      code,
      memorySize: 1024,
      timeout: Duration.seconds(30),
      logGroup: apiLogs,
      environment: {
        TABLE_NAME: table.tableName,
        USER_POOL_ID: userPool.userPoolId,
        USER_POOL_CLIENT_ID: client.userPoolClientId,
        GEMINI_PARAM: secretParams[0],
        QR_SECRET_PARAM: secretParams[1],
        GEMINI_MODELS: process.env.GEMINI_MODELS ?? 'gemini-3.5-flash,gemini-3.6-flash,gemini-3.5-flash-lite,gemini-flash-latest',
        BEDROCK_ENABLED: process.env.BEDROCK_ENABLED ?? 'false',
        BEDROCK_MODEL_ID: 'apac.amazon.nova-lite-v1:0',
        AI_DAILY_LIMIT: '40',
      },
    })
    table.grantReadWriteData(api)
    api.addToRolePolicy(
      new PolicyStatement({
        actions: ['ssm:GetParameter'],
        resources: secretParams.map((name) => `arn:aws:ssm:${this.region}:${this.account}:parameter${name}`),
      }),
    )
    api.addToRolePolicy(new PolicyStatement({ actions: ['rekognition:DetectLabels', 'rekognition:DetectText'], resources: ['*'] }))
    api.addToRolePolicy(
      new PolicyStatement({
        actions: ['bedrock:InvokeModel'],
        resources: ['arn:aws:bedrock:*::foundation-model/amazon.nova-*', `arn:aws:bedrock:*:${this.account}:inference-profile/*`],
      }),
    )

    const httpApi = new HttpApi(this, 'HttpApi', {
      apiName: 'safedrop-api',
      defaultIntegration: new HttpLambdaIntegration('ApiIntegration', api),
      corsPreflight: {
        allowOrigins: [siteUrl, 'http://localhost:5173', 'http://localhost:4173'],
        allowMethods: [CorsHttpMethod.GET, CorsHttpMethod.POST, CorsHttpMethod.PUT, CorsHttpMethod.DELETE],
        allowHeaders: ['authorization', 'content-type', 'idempotency-key'],
        maxAge: Duration.hours(1),
      },
    })
    const stage = httpApi.defaultStage?.node.defaultChild as CfnStage
    stage.defaultRouteSettings = { throttlingRateLimit: 25, throttlingBurstLimit: 50 }


    const photoBucket = new Bucket(this, 'Photos', {
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      lifecycleRules: [{ prefix: 'photos/', expiration: Duration.days(7) }],
      cors: [
        {
          allowedMethods: [HttpMethods.POST],
          allowedOrigins: [siteUrl, 'http://localhost:5173'],
          allowedHeaders: ['*'],
          maxAge: 3000,
        },
      ],
    })
    photoBucket.grantPut(api, 'photos/*')
    photoBucket.grantRead(api, 'photos/*')
    api.addEnvironment('PHOTO_BUCKET', photoBucket.bucketName)

    // A daily job proves the 7-day photo deletion holds: it counts and removes anything the lifecycle rule missed.
    const retention = new Function(this, 'PhotoRetention', {
      runtime: Runtime.NODEJS_22_X,
      architecture: Architecture.ARM_64,
      handler: 'retention.handler',
      code,
      memorySize: 256,
      timeout: Duration.minutes(2),
      logGroup: new LogGroup(this, 'RetentionLogs', { retention: RetentionDays.ONE_MONTH, removalPolicy: RemovalPolicy.DESTROY }),
      environment: { PHOTO_BUCKET: photoBucket.bucketName },
    })
    photoBucket.grantRead(retention, 'photos/*')
    photoBucket.grantDelete(retention, 'photos/*')
    new Rule(this, 'DailyRetentionCheck', { schedule: Schedule.rate(Duration.days(1)), targets: [new LambdaFunction(retention)] })

    const alerts = new Topic(this, 'Alerts', { displayName: 'SafeDrop alerts' })
    alerts.addSubscription(new EmailSubscription(alertEmail))
    const logMetric = (name: string, pattern: IFilterPattern) =>
      new MetricFilter(this, `${name}Filter`, {
        logGroup: apiLogs,
        metricNamespace: 'SafeDrop',
        metricName: name,
        filterPattern: pattern,
        metricValue: '1',
        defaultValue: 0,
      }).metric({ statistic: 'Sum', period: Duration.minutes(5) })
    const rejected = logMetric('HandoverRejected', FilterPattern.stringValue('$.event', '=', 'handover_rejected'))
    const confirmed = logMetric('HandoverConfirmed', FilterPattern.stringValue('$.event', '=', 'handover_confirmed'))
    const apiErrors = logMetric('ApiErrors', FilterPattern.stringValue('$.event', '=', 'api_error'))
    const helperSearch = logMetric(
      'HelperSearchFallback',
      FilterPattern.all(FilterPattern.stringValue('$.event', '=', 'helper_answered'), FilterPattern.stringValue('$.engine', '=', 'search')),
    )
    const helperGemini = logMetric(
      'HelperGemini',
      FilterPattern.all(FilterPattern.stringValue('$.event', '=', 'helper_answered'), FilterPattern.stringValue('$.engine', '=', 'gemini')),
    )
    const retentionMetric = (name: string) =>
      new Metric({ namespace: 'SafeDrop', metricName: name, dimensionsMap: { Service: 'photo-retention' }, statistic: 'Maximum', period: Duration.days(1) })
    const stalePhotos = retentionMetric('StalePhotosFound')

    const alarm = (id: string, metric: Metric, threshold: number, description: string) => {
      const created = new Alarm(this, id, {
        metric,
        threshold,
        evaluationPeriods: 1,
        comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: TreatMissingData.NOT_BREACHING,
        alarmDescription: description,
      })
      created.addAlarmAction(new SnsAction(alerts))
      return created
    }
    alarm('ReplayAttemptsAlarm', rejected.with({ period: Duration.minutes(15) }), 10, 'Many rejected handover codes in 15 minutes: possible QR replay or code guessing.')
    alarm('ApiErrorsAlarm', apiErrors, 5, 'The API returned 5 or more server errors in 5 minutes.')
    alarm('StalePhotosAlarm', stalePhotos, 1, 'A device photo older than 8 days was found: the 7-day deletion policy missed it.')
    alarm('RetentionJobErrorsAlarm', retention.metricErrors({ period: Duration.days(1) }), 1, 'The daily photo-retention check failed.')

    new Dashboard(this, 'Ops', {
      dashboardName: 'SafeDrop',
      widgets: [
        [new TextWidget({ markdown: '# SafeDrop eWaste\nAPI health, handover integrity, AI usage and the daily photo-retention check.', width: 24, height: 2 })],
        [
          new GraphWidget({ title: 'API requests and errors', left: [api.metricInvocations(), api.metricErrors()], right: [apiErrors], width: 8 }),
          new GraphWidget({ title: 'API latency (p95)', left: [api.metricDuration({ statistic: 'p95' })], width: 8 }),
          new GraphWidget({ title: 'Handovers: confirmed vs rejected', left: [confirmed, rejected], width: 8 }),
        ],
        [
          new GraphWidget({ title: 'Ask SafeDrop: Gemini vs guide search', left: [helperGemini, helperSearch], width: 12 }),
          new GraphWidget({ title: 'Photo retention (daily)', left: [retentionMetric('PhotosChecked'), stalePhotos, retentionMetric('StalePhotosDeleted')], width: 12 }),
        ],
      ],
    })

    const mapKey = new CfnAPIKey(this, 'MapKey', {
      keyName: 'safedrop-web',
      noExpiry: true,
      restrictions: {
        allowActions: ['geo-maps:GetTile', 'geo-maps:GetStaticMap', 'geo-places:Geocode', 'geo-places:Autocomplete', 'geo-places:Suggest'],
        allowResources: [
          `arn:aws:geo-maps:${this.region}::provider/default`,
          `arn:aws:geo-places:${this.region}::provider/default`,
        ],
        allowReferers: [`${siteUrl}/*`, 'http://localhost:5173/*', 'http://localhost:4173/*'],
      },
    })

    new CfnBudget(this, 'Budget', {
      budget: {
        budgetName: 'safedrop-monthly',
        budgetType: 'COST',
        timeUnit: 'MONTHLY',
        budgetLimit: { amount: 5, unit: 'USD' },
      },
      notificationsWithSubscribers: [
        {
          notification: { notificationType: 'ACTUAL', comparisonOperator: 'GREATER_THAN', threshold: 50 },
          subscribers: [{ subscriptionType: 'EMAIL', address: alertEmail }],
        },
        {
          notification: { notificationType: 'FORECASTED', comparisonOperator: 'GREATER_THAN', threshold: 100 },
          subscribers: [{ subscriptionType: 'EMAIL', address: alertEmail }],
        },
      ],
    })

    new CfnOutput(this, 'SiteUrl', { value: siteUrl })
    new CfnOutput(this, 'AmplifyAppId', { value: site.attrAppId })
    new CfnOutput(this, 'ApiUrl', { value: httpApi.apiEndpoint })
    new CfnOutput(this, 'TableName', { value: table.tableName })
    new CfnOutput(this, 'PhotoBucket', { value: photoBucket.bucketName })
    new CfnOutput(this, 'UserPoolId', { value: userPool.userPoolId })
    new CfnOutput(this, 'UserPoolClientId', { value: client.userPoolClientId })
    new CfnOutput(this, 'MapKeyName', { value: mapKey.keyName })
    new CfnOutput(this, 'RetentionFunction', { value: retention.functionName })
  }
}
