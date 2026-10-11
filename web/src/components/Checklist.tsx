import { Check, ExternalLink, ShieldAlert } from 'lucide-react'
import type { Guide, Step, StepState } from '../lib/types'

export type StepStates = Record<string, StepState | undefined>

export function guideProgress(guide: Guide, states: StepStates) {
  const steps = guide.sections.flatMap((s) => s.steps)
  const critical = steps.filter((s) => s.critical)
  return {
    answered: steps.filter((s) => states[s.id]).length,
    total: steps.length,
    criticalLeft: critical.filter((s) => states[s.id] !== 'done' && states[s.id] !== 'na').length,
    critical: critical.length,
  }
}

export function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total ? Math.round((done / total) * 100) : 0
  return (
    <div>
      <div className="flex justify-between font-mono text-[11px] uppercase tracking-wider text-ink-3">
        <span>
          {done} of {total} steps answered
        </span>
        <span>{pct}%</span>
      </div>
      <div className="mt-1.5 h-1.5 bg-line" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full bg-gold-400 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

const stateLabel: Record<StepState, string> = { done: 'Done', na: 'Doesn’t apply', skipped: 'Skipped' }

function StepRow({ step, state, disabled, onChange }: { step: Step; state?: StepState; disabled?: boolean; onChange: (state: StepState | null) => void }) {
  const done = state === 'done'
  const alt: StepState = step.critical ? 'na' : 'skipped'
  return (
    <li className={`flex flex-wrap items-start gap-x-3 gap-y-2 px-4 py-3.5 ${state ? 'bg-sky-50/40' : ''}`}>
      <label className={`flex min-w-0 flex-1 gap-3 ${disabled ? '' : 'cursor-pointer'}`}>
        <input type="checkbox" className="peer sr-only" checked={done} disabled={disabled} onChange={(e) => onChange(e.target.checked ? 'done' : null)} />
        <span
          aria-hidden="true"
          className={`mt-0.5 flex size-5 shrink-0 items-center justify-center border transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-sky-500 ${
            done ? 'border-sky-500 bg-sky-500 text-white' : 'border-line-2 bg-white'
          }`}
        >
          {done && <Check className="size-3.5" strokeWidth={3} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className={`text-[14.5px] leading-snug ${state ? 'text-ink-2' : 'text-ink'} ${done ? 'line-through decoration-ink-3/40' : ''}`}>{step.text}</span>
          {step.critical && (
            <span className="ml-2 inline-flex translate-y-[-1px] items-center gap-1 border border-ember-400/50 bg-ember-50 px-1.5 py-px align-middle font-mono text-[10px] uppercase tracking-wider text-ember-700">
              <ShieldAlert className="size-3" aria-hidden="true" /> Critical
            </span>
          )}
          {state && state !== 'done' && <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-ink-3">{stateLabel[state]}</span>}
          {step.detail && <span className="mt-1 block text-[13px] leading-relaxed text-ink-3">{step.detail}</span>}
        </span>
      </label>
      {!disabled && !done && (
        <button
          type="button"
          onClick={() => onChange(state === alt ? null : alt)}
          aria-pressed={state === alt}
          className={`ml-8 shrink-0 border px-2 py-1 text-[11px] sm:ml-0 ${state === alt ? 'border-ink bg-ink text-white' : 'border-line-2 text-ink-3 hover:border-ink-3 hover:text-ink'}`}
        >
          {step.critical ? 'Doesn’t apply' : 'Skip'}
        </button>
      )}
    </li>
  )
}

export function Checklist({
  guide,
  states,
  onChange,
  disabled,
}: {
  guide: Guide
  states: StepStates
  onChange: (stepId: string, state: StepState | null) => void
  disabled?: boolean
}) {
  return (
    <div className="space-y-6">
      {guide.sections.map((section, i) => (
        <section key={section.id} className="card" aria-labelledby={`section-${section.id}`}>
          <header className="flex items-baseline gap-3 border-b border-line px-4 py-3">
            <span className="font-mono text-xs text-ink-3">{String(i + 1).padStart(2, '0')}</span>
            <h3 id={`section-${section.id}`} className="text-[15px] font-semibold">
              {section.title}
            </h3>
          </header>
          <ul className="divide-y divide-line">
            {section.steps.map((step) => (
              <StepRow key={step.id} step={step} state={states[step.id]} disabled={disabled} onChange={(state) => onChange(step.id, state)} />
            ))}
          </ul>
          {section.sources.length > 0 && (
            <footer className="flex flex-wrap gap-x-4 gap-y-1 border-t border-line bg-paper px-4 py-2.5">
              <span className="font-mono text-[10.5px] uppercase tracking-wider text-ink-3">Source</span>
              {section.sources.map((source) => (
                <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-sky-700 hover:underline">
                  {source.publisher}: {source.title} <ExternalLink className="size-3" aria-hidden="true" />
                </a>
              ))}
            </footer>
          )}
        </section>
      ))}
    </div>
  )
}
