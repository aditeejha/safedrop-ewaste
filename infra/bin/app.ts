import { App } from 'aws-cdk-lib'
import { SafeDropStack } from '../lib/stack.js'

const app = new App()
new SafeDropStack(app, 'SafeDropEwaste', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: 'ap-south-1' },
  description: 'SafeDrop eWaste: wipe old devices and drop them at CPCB-registered recyclers',
})
