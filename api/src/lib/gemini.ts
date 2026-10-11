import { config } from '../config.js'
import { geminiKey } from './secrets.js'

type Part = { text: string } | { inline_data: { mime_type: string; data: string } }

const cooldownMs = 5 * 60_000
const coolingUntil = new Map<string, number>()

export async function geminiReady() {
  return Boolean(await geminiKey().catch(() => ''))
}

async function generate(model: string, parts: Part[], options: { json?: boolean; system?: string }) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': await geminiKey() },
    signal: AbortSignal.timeout(20_000),
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      systemInstruction: options.system ? { parts: [{ text: options.system }] } : undefined,
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 2048,
        responseMimeType: options.json ? 'application/json' : 'text/plain',
        thinkingConfig: { thinkingLevel: 'low' },
      },
    }),
  })
  const body = (await res.json()) as {
    error?: { message?: string }
    candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[]
  }
  if (!res.ok) {
    // Overloaded, rate-limited or retired models are skipped for a while.
    if ([404, 429, 500, 503].includes(res.status)) coolingUntil.set(model, Date.now() + cooldownMs)
    throw new Error(`${model} ${res.status}: ${body.error?.message ?? 'request failed'}`)
  }
  const text = body.candidates?.[0]?.content?.parts?.filter((p) => !p.thought).map((p) => p.text ?? '').join('') ?? ''
  if (!text.trim()) throw new Error(`${model} returned an empty answer`)
  return text
}

export async function geminiGenerate(parts: Part[], options: { json?: boolean; system?: string } = {}) {
  const now = Date.now()
  const models = config.geminiModels.filter((m) => (coolingUntil.get(m) ?? 0) <= now)
  const failures: string[] = []
  for (const model of models.length ? models : config.geminiModels) {
    try {
      return await generate(model, parts, options)
    } catch (err) {
      failures.push((err as Error).message)
    }
  }
  throw new Error(failures.join(' | '))
}
