import guideData from '../../../data/guides.json'

export type Step = { id: string; text: string; detail?: string; critical?: boolean }
export type Source = { title: string; publisher: string; url: string; updated?: string }
export type Section = { id: string; title: string; steps: Step[]; sources: Source[] }
export type Guide = { id: string; title: string; appliesTo: string[]; minutes: number; sections: Section[] }

export const guides = (guideData as { guides: Guide[] }).guides

export function findGuide(id: string | null | undefined) {
  return guides.find((g) => g.id === id)
}

export function stepIds(guide: Guide) {
  return guide.sections.flatMap((s) => s.steps.map((step) => step.id))
}

export function criticalStepIds(guide: Guide) {
  return guide.sections.flatMap((s) => s.steps.filter((step) => step.critical).map((step) => step.id))
}

export function guideSources(guide: Guide) {
  const seen = new Map<string, Source>()
  for (const section of guide.sections) for (const source of section.sources) seen.set(source.url, source)
  return [...seen.values()]
}

function words(text: string) {
  return text.toLowerCase().match(/[a-z0-9ऀ-ॿ]{3,}/g) ?? []
}

export function searchSteps(question: string, limit = 4) {
  const terms = new Set(words(question))
  const scored = guides.flatMap((guide) =>
    guide.sections.flatMap((section) =>
      section.steps.map((step) => {
        const haystack = words(`${guide.title} ${section.title} ${step.text} ${step.detail ?? ''}`)
        const score = haystack.filter((w) => terms.has(w)).length
        return { guide, section, step, score }
      }),
    ),
  )
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}
