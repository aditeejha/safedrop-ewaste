import { bedrockConverse, bedrockReady } from './bedrock.js'
import { geminiGenerate, geminiReady } from './gemini.js'
import { findGuide, guides, guideSources, searchSteps, type Guide, type Source } from './guides.js'

export type Answer = {
  answer: string
  sources: Source[]
  engine: 'bedrock' | 'gemini' | 'search'
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

// The model cites sources by their number in the full context; renumber them 1..n in citation order.
function withCitations(answer: string, sources: Source[]) {
  const order: number[] = []
  for (const match of answer.matchAll(/\[(\d+)\]/g)) {
    const index = Number(match[1]) - 1
    if (sources[index] && !order.includes(index)) order.push(index)
  }
  const text = answer.replace(/\[(\d+)\]/g, (whole, n) => {
    const position = order.indexOf(Number(n) - 1)
    return position === -1 ? '' : `[${position + 1}]`
  })
  return { answer: text.trim(), sources: order.map((i) => sources[i]) }
}

export { withCitations }

export async function askHelper(question: string, guideId?: string): Promise<Answer> {
  const focused = findGuide(guideId)
  const extras = guides.filter((g) => g.id === 'india-phone-extras')
  const guideList = focused ? [focused, ...extras.filter((g) => g.id !== focused.id)] : guides
  const context = contextFor(guideList)
  const userText = `Official guide steps:\n${context.text}\n\nQuestion: ${question}`

  if (bedrockReady()) {
    try {
      const answer = await bedrockConverse([{ text: userText }], system)
      return { ...withCitations(answer, context.sources), engine: 'bedrock' }
    } catch {}
  }
  if (geminiReady()) {
    try {
      const answer = await geminiGenerate([{ text: userText }], { system })
      return { ...withCitations(answer, context.sources), engine: 'gemini' }
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
    }
  }
  const answer = hits.map((h, i) => `${i + 1}. ${h.step.text} (${h.guide.title})`).join('\n')
  const sources = [...new Map(hits.flatMap((h) => guideSources(h.guide)).map((s) => [s.url, s])).values()].slice(0, 3)
  return { answer, sources, engine: 'search' }
}
