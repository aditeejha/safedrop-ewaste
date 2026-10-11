import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm'
import { config } from '../config.js'

const ssm = new SSMClient({ region: config.region })
const cache = new Map<string, Promise<string>>()

// Secrets come from SSM SecureString parameters; a plain env var is only used for local development.
export function secret(envName: string, parameter: string | undefined) {
  const local = process.env[envName]
  if (local) return Promise.resolve(local)
  if (!parameter) return Promise.resolve('')
  if (!cache.has(parameter)) {
    const value = ssm
      .send(new GetParameterCommand({ Name: parameter, WithDecryption: true }))
      .then((res) => res.Parameter?.Value ?? '')
      .catch((err) => {
        cache.delete(parameter)
        throw err
      })
    cache.set(parameter, value)
  }
  return cache.get(parameter)!
}

export const geminiKey = () => secret('GEMINI_API_KEY', process.env.GEMINI_PARAM)
export const qrSecret = () => secret('QR_SECRET', process.env.QR_SECRET_PARAM)
