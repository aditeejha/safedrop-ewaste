import { Check, ExternalLink, ShieldAlert } from 'lucide-react'
import type { Guide, Step } from '../lib/types'

export function guideProgress(guide: Guide, checked: Record<string, string>) {
  const steps = guide.sections.flatMap((s) => s.steps)
  const critical = steps.filter((s) => s.critical)
  return {
    done: steps.filter((s) => checked[s.id]).length,
    total: steps.length,
    criticalLeft: critical.filter((s) => !checked[s.id]).length,
    critical: critical.length,
  }
}

export function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total ? Math.round((done / total) * 100) : 0
  return (
    <div>
      <div className="flex justify-between font-mono text-[11px] uppercase tracking-wider text-ink-3">
        <span>
          {done} of {total} steps
        </span>
        <span>{pct}%</span>
      </div>
      <div className="mt-1.5 h-1.5 bg-line">
        <div className="h-full bg-gold-400 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function StepRow({ step, done, disabled, onToggle }: { step: Step; done: boolean; disabled?: boolean; onToggle: (done: boolean) => void }) {
  return (
    <li>
      <label className={`flex gap-3 px-4 py-3.5 transition-colors ${disabled ? '' : 'cursor-pointer hover:bg-paper'} ${done ? 'bg-sky-50/50' : ''}`}>
        <input type="checkbox" className="peer sr-only" checked={done} disabled={disabled} onChange={(e) => onToggle(e.target.checked)} />
        <span
          className={`mt-0.5 flex size-5 shrink-0 items-center justify-center border transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-sky-500 ${
            done ? 'border-sky-500 bg-sky-500 text-white' : 'border-line-2 bg-white'
          }`}
        >
          {done && <Check className="size-3.5" strokeWidth={3} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className={`text-[14.5px] leading-snug ${done ? 'text-ink-2 line-through decoration-ink-3/40' : 'text-ink'}`}>{step.text}</span>
          {step.critical && (
            <span className="ml-2 inline-flex translate-y-[-1px] items-center gap-1 border border-ember-400/50 bg-ember-50 px-1.5 py-px align-middle font-mono text-[10px] uppercase tracking-wider text-ember-700">
              <ShieldAlert className="size-3" /> Critical
            </span>
          )}
          {step.detail && <span className="mt-1 block text-[13px] leading-relaxed text-ink-3">{step.detail}</span>}
        </span>
      </label>
    </li>
  )
}

export function Checklist({
  guide,
  checked,
  onToggle,
  disabled,
}: {
  guide: Guide
  checked: Record<string, string>
  onToggle: (stepId: string, done: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="space-y-6">
      {guide.sections.map((section, i) => (
        <section key={section.id} className="card">
          <header className="flex items-baseline gap-3 border-b border-line px-4 py-3">
            <span className="font-mono text-xs text-ink-3">{String(i + 1).padStart(2, '0')}</span>
            <h3 className="text-[15px] font-semibold">{section.title}</h3>
          </header>
          <ul className="divide-y divide-line">
            {section.steps.map((step) => (
              <StepRow key={step.id} step={step} done={Boolean(checked[step.id])} disabled={disabled} onToggle={(done) => onToggle(step.id, done)} />
            ))}
          </ul>
          {section.sources.length > 0 && (
            <footer className="flex flex-wrap gap-x-4 gap-y-1 border-t border-line bg-paper px-4 py-2.5">
              <span className="font-mono text-[10.5px] uppercase tracking-wider text-ink-3">Source</span>
              {section.sources.map((source) => (
                <a
                  key={source.url}
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-sky-700 hover:underline"
                >
                  {source.publisher}: {source.title} <ExternalLink className="size-3" />
                </a>
              ))}
            </footer>
          )}
        </section>
      ))}
    </div>
  )
}
