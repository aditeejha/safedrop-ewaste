import { BedrockRuntimeClient, ConverseCommand, type ContentBlock } from '@aws-sdk/client-bedrock-runtime'
import { config } from '../config.js'

const client = new BedrockRuntimeClient({ region: config.region })
const cooldownMs = 10 * 60_000
let blockedUntil = 0

export function bedrockReady() {
  return process.env.BEDROCK_ENABLED === 'true' && Date.now() > blockedUntil
}

export async function bedrockConverse(content: ContentBlock[], system?: string) {
  try {
    const res = await client.send(
      new ConverseCommand({
        modelId: config.bedrockModelId,
        system: system ? [{ text: system }] : undefined,
        messages: [{ role: 'user', content }],
        inferenceConfig: { maxTokens: 1024, temperature: 0.2 },
      }),
    )
    const text = res.output?.message?.content?.map((block) => block.text ?? '').join('') ?? ''
    if (!text) throw new Error('Bedrock returned an empty answer')
    return text
  } catch (err) {
    // Account-level blocks (e.g. "Operation not allowed") would fail every call, so skip Bedrock for a while.
    if (err instanceof Error && ['AccessDeniedException', 'ValidationException'].includes(err.name)) blockedUntil = Date.now() + cooldownMs
    throw err
  }
}
