// Every script that touches AWS imports this first: it pins the hackathon profile and refuses any other account.
import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts'

export const hackathonAccount = '956118718493'
process.env.AWS_PROFILE = 'aditee'
process.env.AWS_REGION = 'ap-south-1'

const identity = await new STSClient({ region: 'ap-south-1' }).send(new GetCallerIdentityCommand({}))
if (identity.Account !== hackathonAccount) throw new Error(`Refusing to run against AWS account ${identity.Account}`)
