import { CfnOutput, Duration, RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib'
import { CfnApp, CfnBranch } from 'aws-cdk-lib/aws-amplify'
import { CfnStage, CorsHttpMethod, HttpApi } from 'aws-cdk-lib/aws-apigatewayv2'
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations'
import { CfnBudget } from 'aws-cdk-lib/aws-budgets'
import {
  AccountRecovery,
  CfnUserPoolGroup,
  ClientAttributes,
  StringAttribute,
  UserPool,
} from 'aws-cdk-lib/aws-cognito'
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb'
import { PolicyStatement } from 'aws-cdk-lib/aws-iam'
import { Architecture, Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda'
import { CfnAPIKey } from 'aws-cdk-lib/aws-location'
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs'
import { BlockPublicAccess, Bucket, BucketEncryption, HttpMethods } from 'aws-cdk-lib/aws-s3'
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

    const api = new Function(this, 'Api', {
      runtime: Runtime.NODEJS_22_X,
      architecture: Architecture.ARM_64,
      handler: 'index.handler',
      code: Code.fromAsset(root('api/dist')),
      memorySize: 1024,
      timeout: Duration.seconds(30),
      logGroup: new LogGroup(this, 'ApiLogs', { retention: RetentionDays.ONE_WEEK, removalPolicy: RemovalPolicy.DESTROY }),
      environment: {
        TABLE_NAME: table.tableName,
        USER_POOL_ID: userPool.userPoolId,
        USER_POOL_CLIENT_ID: client.userPoolClientId,
        GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? '',
        GEMINI_MODELS: process.env.GEMINI_MODELS ?? 'gemini-3.5-flash,gemini-3.6-flash,gemini-3.5-flash-lite,gemini-flash-latest',
        BEDROCK_ENABLED: process.env.BEDROCK_ENABLED ?? 'false',
        BEDROCK_MODEL_ID: 'apac.amazon.nova-lite-v1:0',
        AI_DAILY_LIMIT: '40',
      },
    })
    table.grantReadWriteData(api)
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
        allowHeaders: ['authorization', 'content-type'],
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
          allowedMethods: [HttpMethods.PUT],
          allowedOrigins: [siteUrl, 'http://localhost:5173'],
          allowedHeaders: ['content-type'],
          maxAge: 3000,
        },
      ],
    })
    photoBucket.grantReadWrite(api)
    api.addEnvironment('PHOTO_BUCKET', photoBucket.bucketName)

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
  }
}
