// Builds everything and deploys the CDK stack to the hackathon AWS account only.
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { setTimeout as wait } from 'node:timers/promises'

const profile = 'aditee'
const hackathonAccount = '956118718493'
const region = 'ap-south-1'

const run = (cmd, options = {}) => execSync(cmd, { stdio: 'inherit', ...options })
const output = (cmd) => execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()

const account = output(`aws sts get-caller-identity --profile ${profile} --query Account --output text`)
if (account !== hackathonAccount) throw new Error(`Refusing to deploy: profile ${profile} points at account ${account}`)

export function readEnv(path) {
  try {
    return Object.fromEntries(
      readFileSync(path, 'utf8')
        .split(/\r?\n/)
        .filter((line) => line.includes('=') && !line.startsWith('#'))
        .map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]),
    )
  } catch {
    return {}
  }
}

const apiEnv = readEnv('api/.env')
const cdkEnv = {
  ...process.env,
  AWS_PROFILE: profile,
  AWS_REGION: region,
  CDK_DEFAULT_ACCOUNT: hackathonAccount,
  GEMINI_API_KEY: apiEnv.GEMINI_API_KEY ?? '',
  BEDROCK_ENABLED: apiEnv.BEDROCK_ENABLED ?? 'false',
}

run('node scripts/build-data.mjs')
run('npm run build -w api')
if (!process.argv.includes('--skip-web')) run('npm run build -w web')

let bootstrapped = true
try {
  output(`aws cloudformation describe-stacks --stack-name CDKToolkit --profile ${profile} --region ${region}`)
} catch {
  bootstrapped = false
}
if (!bootstrapped) run(`npx cdk bootstrap aws://${hackathonAccount}/${region}`, { cwd: 'infra', env: cdkEnv })
run('npx cdk deploy --require-approval never --outputs-file outputs.json', { cwd: 'infra', env: cdkEnv })

const outputs = JSON.parse(readFileSync('infra/outputs.json', 'utf8')).SafeDropEwaste
const mapKey = output(`aws location describe-key --key-name ${outputs.MapKeyName} --profile ${profile} --region ${region} --query Key --output text`)

const webConfig = { region, apiBase: '/api', userPoolId: outputs.UserPoolId, userPoolClientId: outputs.UserPoolClientId, mapKey }
writeFileSync('web/public/config.json', JSON.stringify(webConfig, null, 2))

if (!process.argv.includes('--skip-web')) {
  writeFileSync('web/dist/config.json', JSON.stringify({ ...webConfig, apiBase: `${outputs.ApiUrl}/api` }, null, 2))
  execSync(
    `python -I -c "import shutil,sys; shutil.make_archive(sys.argv[1], 'zip', sys.argv[2])" web/site web/dist`,
    { stdio: 'inherit' },
  )
  const amplify = `--app-id ${outputs.AmplifyAppId} --branch-name main --profile ${profile} --region ${region}`
  const job = JSON.parse(output(`aws amplify create-deployment ${amplify} --output json`))
  const upload = await fetch(job.zipUploadUrl, { method: 'PUT', body: readFileSync('web/site.zip') })
  if (!upload.ok) throw new Error(`Amplify upload failed: ${upload.status}`)
  output(`aws amplify start-deployment ${amplify} --job-id ${job.jobId}`)
  let status = 'PENDING'
  while (!['SUCCEED', 'FAILED', 'CANCELLED'].includes(status)) {
    await wait(5000)
    status = output(`aws amplify get-job ${amplify} --job-id ${job.jobId} --query job.summary.status --output text`)
    console.log(`  amplify: ${status}`)
  }
  if (status !== 'SUCCEED') throw new Error(`Amplify deployment ${status}`)
}
const localEnv = {
  ...apiEnv,
  AWS_PROFILE: profile,
  AWS_REGION: region,
  TABLE_NAME: outputs.TableName,
  PHOTO_BUCKET: outputs.PhotoBucket,
  USER_POOL_ID: outputs.UserPoolId,
  USER_POOL_CLIENT_ID: outputs.UserPoolClientId,
}
writeFileSync('api/.env', Object.entries(localEnv).map(([k, v]) => `${k}=${v}`).join('\n') + '\n')
console.log(`\nLive at ${outputs.SiteUrl}`)
