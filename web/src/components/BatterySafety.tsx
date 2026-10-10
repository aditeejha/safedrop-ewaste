import { ExternalLink } from 'lucide-react'
import { useGuides } from '../lib/data'
import { Picture } from './ui'

export function BatterySafety({ compact }: { compact?: boolean }) {
  const guides = useGuides()
  const safety = guides.data?.batterySafety
  if (!safety) return null
  const steps = compact ? safety.steps.slice(0, 4) : safety.steps
  return (
    <div className={compact ? 'mt-2' : 'grid gap-5 sm:grid-cols-[160px_1fr]'}>
      {!compact && <Picture name="battery-warning" alt="A swollen phone battery with taped terminals" className="aspect-square w-full border border-line" />}
      <div>
        <ul className="space-y-2">
          {steps.map((step) => (
            <li key={step.id} className="flex gap-2 text-sm text-ink-2">
              <span className="mt-1.5 size-1.5 shrink-0 bg-ember-500" />
              <span>
                <span className="text-ink">{step.text}</span>
                {!compact && step.detail && <span className="block text-xs text-ink-3">{step.detail}</span>}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
          {safety.sources.map((s) => (
            <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-sky-700 hover:underline">
              {s.publisher} <ExternalLink className="size-3" />
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
