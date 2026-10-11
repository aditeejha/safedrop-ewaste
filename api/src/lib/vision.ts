import { DetectLabelsCommand, DetectTextCommand, RekognitionClient } from '@aws-sdk/client-rekognition'
import { config } from '../config.js'
import { bedrockConverse, bedrockReady } from './bedrock.js'
import { geminiGenerate, geminiReady } from './gemini.js'
import { deviceKinds, guideFor, isDeviceKind, osNames, type DeviceKind } from './kinds.js'

export type Identification = {
  kind: DeviceKind
  brand: string | null
  model: string | null
  os: string | null
  confidence: number
  batteryRisk: 'none' | 'possible' | 'likely' | 'unknown'
  damage: string[]
  notes: string
  guideId: string | null
  engine: 'bedrock' | 'gemini' | 'rekognition'
  labels?: string[]
}

const rekognition = new RekognitionClient({ region: config.region })

const prompt = `You identify old electronic devices in a photo for an e-waste recycling app in India.
Reply with JSON only, exactly this shape:
{"kind": one of ${JSON.stringify(deviceKinds)},
 "brand": string or null, "model": string or null,
 "os": one of ${JSON.stringify(osNames)} or null,
 "confidence": number from 0 to 1,
 "batteryRisk": "none" | "possible" | "likely",
 "damage": array of short phrases such as "cracked screen",
 "notes": one short sentence for the owner}
Use "feature-phone" for keypad phones. batteryRisk is "likely" only when a swollen or bulging battery is visible, or the back panel or screen is pushed out by swelling; "possible" when the case is split or the device is crushed. Name a brand or model only if a logo, text or a very distinctive design is visible. If the photo shows no electronic device, use kind "other" with confidence below 0.3.`

// Models sometimes add text or a second object after the JSON, so read only the first complete object.
export function firstJsonObject(text: string) {
  const start = text.indexOf('{')
  if (start === -1) throw new Error('No JSON object in the model reply')
  let depth = 0
  let inString = false
  for (let i = start; i < text.length; i++) {
    const ch = text[i]
    if (inString) {
      if (ch === '\\') i++
      else if (ch === '"') inString = false
    } else if (ch === '"') inString = true
    else if (ch === '{') depth++
    else if (ch === '}' && --depth === 0) return JSON.parse(text.slice(start, i + 1)) as Record<string, unknown>
  }
  throw new Error('Unfinished JSON object in the model reply')
}

function parseModelJson(text: string) {
  const raw = firstJsonObject(text)
  const kind = isDeviceKind(raw.kind) ? raw.kind : 'other'
  const brand = typeof raw.brand === 'string' && raw.brand.trim() ? raw.brand.trim() : null
  const os = typeof raw.os === 'string' && (osNames as readonly string[]).includes(raw.os) ? raw.os : null
  const risk = raw.batteryRisk === 'likely' || raw.batteryRisk === 'possible' ? raw.batteryRisk : 'none'
  return {
    kind,
    brand,
    model: typeof raw.model === 'string' && raw.model.trim() ? raw.model.trim() : null,
    os,
    confidence: Math.max(0, Math.min(1, Number(raw.confidence) || 0)),
    batteryRisk: risk,
    damage: Array.isArray(raw.damage) ? raw.damage.filter((d): d is string => typeof d === 'string').slice(0, 5) : [],
    notes: typeof raw.notes === 'string' ? raw.notes.slice(0, 240) : '',
    guideId: guideFor(kind, brand, os),
  } as const
}

const labelKinds: [RegExp, DeviceKind][] = [
  [/^(mobile phone|cell phone|phone|iphone|smartphone)$/i, 'phone'],
  [/^(tablet computer|ipad|tablet)$/i, 'tablet'],
  [/^(laptop|notebook|netbook)$/i, 'laptop'],
  [/^(desktop|computer|pc|computer hardware|server)$/i, 'desktop'],
  [/^(monitor|screen|display)$/i, 'monitor'],
  [/^(tv|television)$/i, 'tv'],
  [/^(router|modem|hub|network)$/i, 'router'],
  [/^(printer|scanner|copier)$/i, 'printer'],
  [/^(hard disk|hdd|ssd|usb|flash drive|memory card|disk)$/i, 'storage'],
  [/^(wristwatch|smart watch|watch)$/i, 'smartwatch'],
  [/^(headphones|earphone|headset|earbuds)$/i, 'earphones'],
  [/^(adapter|plug|cable|charger|power cord|wire)$/i, 'charger'],
  [/^(battery|power bank)$/i, 'battery'],
]

const brands = [
  'Samsung', 'Apple', 'iPhone', 'iPad', 'MacBook', 'Xiaomi', 'Redmi', 'POCO', 'Realme', 'OnePlus', 'OPPO', 'vivo', 'iQOO',
  'Nokia', 'Motorola', 'moto', 'Google', 'Pixel', 'Lenovo', 'HP', 'Dell', 'ASUS', 'Acer', 'Sony', 'LG', 'Micromax', 'Lava',
  'Karbonn', 'Intex', 'Huawei', 'Honor', 'Infinix', 'Tecno', 'itel', 'Jio', 'Nothing', 'Microsoft', 'Canon', 'Epson',
  'Brother', 'TP-Link', 'D-Link', 'Netgear', 'Seagate', 'WD', 'SanDisk', 'Kingston', 'boAt', 'JBL',
]

async function identifyWithRekognition(bytes: Uint8Array): Promise<Identification> {
  const [labels, text] = await Promise.all([
    rekognition.send(new DetectLabelsCommand({ Image: { Bytes: bytes }, MaxLabels: 25, MinConfidence: 55 })),
    rekognition.send(new DetectTextCommand({ Image: { Bytes: bytes } })),
  ])
  const names = (labels.Labels ?? []).map((l) => ({ name: l.Name ?? '', confidence: (l.Confidence ?? 0) / 100 }))
  let kind: DeviceKind = 'other'
  let confidence = 0.2
  for (const label of names) {
    const match = labelKinds.find(([pattern]) => pattern.test(label.name))
    if (match) {
      kind = match[1]
      confidence = label.confidence
      break
    }
  }
  const words = (text.TextDetections ?? []).filter((t) => t.Type === 'WORD').map((t) => t.DetectedText ?? '')
  const found = brands.find((b) => words.some((w) => w.toLowerCase() === b.toLowerCase()))
  const brand = found === 'iPhone' || found === 'iPad' || found === 'MacBook' ? 'Apple' : found ?? null
  return {
    kind,
    brand,
    model: null,
    os: null,
    confidence: Number(confidence.toFixed(2)),
    batteryRisk: 'unknown',
    damage: [],
    notes: 'Identified by Amazon Rekognition labels. Check the battery yourself: a puffed-up back or a lifted screen means a swollen battery.',
    guideId: guideFor(kind, brand, null),
    engine: 'rekognition',
    labels: names.slice(0, 8).map((l) => l.name),
  }
}

export async function identifyDevice(bytes: Uint8Array, mimeType: string): Promise<Identification> {
  const failures: string[] = []
  if (bedrockReady()) {
    try {
      const format = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpeg'
      const text = await bedrockConverse([{ image: { format, source: { bytes } } }, { text: prompt }])
      return { ...parseModelJson(text), engine: 'bedrock' }
    } catch (err) {
      failures.push(`bedrock: ${(err as Error).message}`)
    }
  }
  if (await geminiReady()) {
    try {
      const text = await geminiGenerate(
        [{ inline_data: { mime_type: mimeType, data: Buffer.from(bytes).toString('base64') } }, { text: prompt }],
        { json: true },
      )
      return { ...parseModelJson(text), engine: 'gemini' }
    } catch (err) {
      failures.push(`gemini: ${(err as Error).message}`)
    }
  }
  if (failures.length) console.warn('vision fallbacks', failures)
  return identifyWithRekognition(bytes)
}
