import { AlertTriangle, HelpCircle, Recycle, RefreshCw } from 'lucide-react'
import { Link } from 'react-router'
import type { Condition, Route } from '../lib/types'
import { BatterySafety } from './BatterySafety'

const questions: { key: keyof Condition; label: string; options: [string, string][]; dataOnly?: boolean }[] = [
  { key: 'powersOn', label: 'Does it switch on?', options: [['yes', 'Yes'], ['no', 'No'], ['unknown', 'Not sure']] },
  { key: 'screenWorks', label: 'Is the screen usable?', options: [['yes', 'Yes'], ['no', 'No'], ['unknown', 'Not sure']], dataOnly: true },
  { key: 'accountLocked', label: 'Is it still locked to an account (Google, Apple, Samsung)?', options: [['no', 'No'], ['yes', 'Yes'], ['unknown', 'Not sure']], dataOnly: true },
  { key: 'damage', label: 'Any visible damage?', options: [['none', 'None'], ['minor', 'Minor'], ['major', 'Major'], ['unknown', 'Not sure']] },
  { key: 'battery', label: 'Is the battery swollen, hot or leaking?', options: [['ok', 'No'], ['swollen', 'Yes'], ['unknown', 'Not sure']] },
]

export function ConditionForm({ value, holdsData, onChange, disabled }: { value: Condition; holdsData: boolean; onChange: (next: Condition) => void; disabled?: boolean }) {
  return (
    <div className="space-y-3">
      {questions
        .filter((q) => holdsData || !q.dataOnly)
        .map((q) => (
          <fieldset key={q.key} disabled={disabled}>
            <legend className="mb-1.5 text-xs font-medium text-ink-2">{q.label}</legend>
            <div className="flex flex-wrap gap-1.5">
              {q.options.map(([option, label]) => {
                const on = value[q.key] === option
                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={on}
                    onClick={() => onChange({ ...value, [q.key]: option })}
                    className={`border px-2.5 py-1.5 text-xs ${on ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink-2 hover:border-ink-3'}`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </fieldset>
        ))}
      <p className="text-xs text-ink-3">Your answers decide the advice below. A photo can’t tell whether a device works or how healthy its battery is.</p>
    </div>
  )
}

const advice: Record<Route, { icon: typeof Recycle; title: string; tone: string }> = {
  reuse: { icon: RefreshCw, title: 'Reuse first', tone: 'border-gold-400 bg-gold-50' },
  recycle: { icon: Recycle, title: 'Recycle it', tone: 'border-sky-300 bg-sky-50' },
  'battery-hazard': { icon: AlertTriangle, title: 'Battery hazard: special handling', tone: 'border-ember-400 bg-ember-50' },
  'not-enough-info': { icon: HelpCircle, title: 'Not enough information yet', tone: 'border-line-2 bg-paper' },
}

export function RouteAdvice({ route, reasons }: { route: Route; reasons: string[] }) {
  const { icon: Icon, title, tone } = advice[route]
  return (
    <div className={`border p-4 ${tone}`}>
      <p className="flex items-center gap-2 font-semibold">
        <Icon className="size-4" aria-hidden="true" /> {title}
      </p>
      {reasons.map((r) => (
        <p key={r} className="mt-1 text-sm text-ink-2">
          {r}
        </p>
      ))}
      {route === 'reuse' && (
        <p className="mt-2 text-sm text-ink-2">
          Registered refurbishers near you are on the <Link to="/recyclers?type=refurbisher" className="link">map</Link>. None has confirmed on SafeDrop that it accepts
          this device yet, so call ahead. If they can’t take it, recycle it through a drop point.
        </p>
      )}
      {route === 'battery-hazard' && (
        <div className="mt-3">
          <p className="mb-2 text-sm text-ink-2">Don’t bring it to an ordinary drop-off. The demo drop point does not accept damaged batteries.</p>
          <BatterySafety compact />
        </div>
      )}
      {route === 'not-enough-info' && <p className="mt-1 text-sm text-ink-2">You can still wipe and book it; the advice appears once you answer.</p>}
    </div>
  )
}
