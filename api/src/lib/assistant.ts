import { bedrockConverse, bedrockReady } from './bedrock.js'
import { geminiGenerate, geminiReady } from './gemini.js'
import { batteryGuide, findGuide, guides, guideSources, searchSteps, type Guide, type Source } from './guides.js'

export type Action = { type: 'open-guide'; guideId: string; title: string } | { type: 'find-recyclers' } | { type: 'prepare-pickup' } | { type: 'battery-safety' }

export type Answer = {
  answer: string
  sources: Source[]
  engine: 'bedrock' | 'gemini' | 'search'
  actions: Action[]
}

// Follow-up buttons are chosen by rules from the question and the cited guides, never by the model,
// and each one only opens a page where the user confirms anything that changes data.
export function suggestActions(question: string, sources: Source[], focusedId?: string): Action[] {
  const q = question.toLowerCase()
  const actions: Action[] = []
  const cited = guides.filter((g) => g.id !== batteryGuide.id && guideSources(g).some((s) => sources.some((x) => x.url === s.url)))
  const focused = findGuide(focusedId)
  for (const guide of focused ? [focused] : cited.slice(0, 2)) {
    if (guide.id !== batteryGuide.id) actions.push({ type: 'open-guide', guideId: guide.id, title: guide.title })
  }
  if (/batter|swoll|swell|puff|fire|heat|leak|बैटरी/.test(q)) actions.push({ type: 'battery-safety' })
  if (/recycl|drop|dispos|where|give away|throw|scrap|kabad|collector|centre|center|रीसायकल|कबाड़/.test(q)) actions.push({ type: 'find-recyclers' })
  if (/pick ?up|collect|doorstep|kabad|home|घर|कबाड़ी/.test(q)) actions.push({ type: 'prepare-pickup' })
  return actions.slice(0, 4)
}

const system = `You are the SafeDrop eWaste helper. People in India ask how to wipe and safely hand over old phones, laptops and other electronics.
Answer ONLY from the official guide steps given to you. Cite sources with their number in square brackets, like [2].
If the steps don't cover the question, say you are not sure and suggest the device maker's official support site. Never invent menu paths.
Keep answers under 120 words, in plain, friendly language, as short numbered steps when there are steps.
Reply in the same language as the question (English or Hindi).`

function contextFor(guideList: Guide[]) {
  const sources: Source[] = []
  const blocks = guideList.map((guide) => {
    const lines = guide.sections.map((section) => {
      const refs = section.sources.map((source) => {
        let index = sources.findIndex((s) => s.url === source.url)
        if (index === -1) index = sources.push(source) - 1
        return `[${index + 1}]`
      })
      const steps = section.steps.map((s) => `- ${s.text}${s.detail ? ` (${s.detail})` : ''}`).join('\n')
      return `${section.title} ${refs.join('')}\n${steps}`
    })
    return `## ${guide.title}\n${lines.join('\n')}`
  })
  const sourceList = sources.map((s, i) => `[${i + 1}] ${s.publisher}: ${s.title}`).join('\n')
  return { text: `${blocks.join('\n\n')}\n\nSources:\n${sourceList}`, sources }
}

// The model cites sources by their number in the full context, as [3] or [3, 7]; renumber them 1..n in citation order.
function withCitations(answer: string, sources: Source[]) {
  const cite = /\[(\d+(?:\s*,\s*\d+)*)\]/g
  const order: number[] = []
  for (const match of answer.matchAll(cite)) {
    for (const n of match[1].split(',')) {
      const index = Number(n) - 1
      if (sources[index] && !order.includes(index)) order.push(index)
    }
  }
  const text = answer.replace(cite, (whole, list: string) => {
    const kept = list
      .split(',')
      .map((n) => order.indexOf(Number(n) - 1) + 1)
      .filter((n) => n > 0)
    return kept.length ? `[${kept.join(', ')}]` : ''
  })
  return { answer: text.trim(), sources: order.map((i) => sources[i]) }
}

export { withCitations }

export async function askHelper(question: string, guideId?: string): Promise<Answer> {
  const focused = findGuide(guideId)
  const extras = guides.filter((g) => g.id === 'india-phone-extras' || g.id === batteryGuide.id)
  const guideList = focused ? [focused, ...extras.filter((g) => g.id !== focused.id)] : guides
  const context = contextFor(guideList)
  const userText = `Official guide steps:\n${context.text}\n\nQuestion: ${question}`

  if (bedrockReady()) {
    try {
      const answer = withCitations(await bedrockConverse([{ text: userText }], system), context.sources)
      return { ...answer, engine: 'bedrock', actions: suggestActions(question, answer.sources, guideId) }
    } catch {}
  }
  if (await geminiReady()) {
    try {
      const answer = withCitations(await geminiGenerate([{ text: userText }], { system }), context.sources)
      return { ...answer, engine: 'gemini', actions: suggestActions(question, answer.sources, guideId) }
    } catch (err) {
      console.warn('gemini helper failed', (err as Error).message)
    }
  }

  const hits = searchSteps(question)
  if (!hits.length) {
    return {
      answer: "I couldn't find that in our official guides. Please check your device maker's support site.",
      sources: [],
      engine: 'search',
      actions: suggestActions(question, [], guideId),
    }
  }
  const answer = hits.map((h, i) => `${i + 1}. ${h.step.text} (${h.guide.title})`).join('\n')
  const sources = [...new Map(hits.flatMap((h) => guideSources(h.guide)).map((s) => [s.url, s])).values()].slice(0, 3)
  return { answer, sources, engine: 'search', actions: suggestActions(question, sources, guideId) }
}
