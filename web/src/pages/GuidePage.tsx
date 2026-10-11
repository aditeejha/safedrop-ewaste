import { ArrowLeft, BatteryWarning, Clock, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { AskBox } from '../components/AskBox'
import { BatterySafety } from '../components/BatterySafety'
import { Checklist, guideProgress, ProgressBar, type StepStates } from '../components/Checklist'
import { Page, Spinner } from '../components/ui'
import { formatDate, useGuides } from '../lib/data'
import type { StepState } from '../lib/types'

const storageKey = (id: string) => `safedrop.guide.${id}`

// Progress on the public guides stays on this device only; older saves stored a timestamp per finished step.
export function readLocalProgress(id: string): StepStates {
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey(id)) ?? '{}') as Record<string, string>
    return Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, (['done', 'na', 'skipped'].includes(v) ? v : 'done') as StepState]))
  } catch {
    return {}
  }
}

function writeLocalProgress(id: string, value: StepStates) {
  try {
    localStorage.setItem(storageKey(id), JSON.stringify(value))
  } catch {}
}

const suggestions: Record<string, string[]> = {
  android: ['How do I remove my Google account?', 'Is my phone encrypted?', 'पुराने फोन से UPI कैसे हटाएं?'],
  samsung: ['How do I sign out of my Samsung account?', 'Where is factory reset in One UI?'],
  iphone: ['How do I turn off Find My?', 'What happens to my eSIM?'],
  windows: ['What does Clean data do?', 'Do I need BitLocker?'],
}

export default function GuidePage() {
  const { guideId = '' } = useParams()
  const guides = useGuides()
  const [states, setStates] = useState(() => readLocalProgress(guideId))
  const guide = guides.data?.guides.find((g) => g.id === guideId)

  if (guides.isLoading) return <Page><Spinner /></Page>
  if (!guide) {
    return (
      <Page>
        <p className="text-ink-2">That guide doesn’t exist.</p>
        <Link to="/wipe" className="link">All guides</Link>
      </Page>
    )
  }

  const progress = guideProgress(guide, states)
  const change = (stepId: string, state: StepState | null) => {
    const next = { ...states }
    if (state) next[stepId] = state
    else delete next[stepId]
    setStates(next)
    writeLocalProgress(guide.id, next)
  }
  const showBattery = guide.appliesTo.some((a) => ['phone', 'tablet', 'laptop'].includes(a))

  return (
    <Page>
      <Link to="/wipe" className="inline-flex items-center gap-1 text-sm text-ink-2 hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" /> All guides
      </Link>
      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_340px]">
        <div>
          <p className="eyebrow">Wipe guide</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">{guide.title}</h1>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] uppercase tracking-wider text-ink-3">
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" aria-hidden="true" /> about {guide.minutes} minutes
            </span>
            <span>{progress.critical} critical steps</span>
            <span>
              Reviewed {formatDate(guide.reviewedAt)} · v{guide.version}
            </span>
          </div>
          {guide.note && <p className="mt-4 text-sm text-ink-2">{guide.note}</p>}
          <div className="sticky top-16 z-10 -mx-4 mt-6 border-y border-line bg-paper/95 px-4 py-3 backdrop-blur sm:mx-0 sm:border-x">
            <ProgressBar done={progress.answered} total={progress.total} />
            {progress.criticalLeft === 0 && progress.answered > 0 ? (
              <p className="mt-2 text-xs font-medium text-sky-700">All critical steps are marked. Add the device to your drawer to record a wipe attestation.</p>
            ) : (
              <p className="mt-2 text-xs text-ink-3">
                {progress.criticalLeft} critical step{progress.criticalLeft === 1 ? '' : 's'} left. Mark “Doesn’t apply” if your device doesn’t have that feature.
              </p>
            )}
          </div>
          <div className="mt-6">
            <Checklist guide={guide} states={states} onChange={change} />
          </div>
          {progress.answered > 0 && (
            <button
              type="button"
              className="mt-4 inline-flex items-center gap-1 text-xs text-ink-3 hover:text-ink"
              onClick={() => {
                setStates({})
                writeLocalProgress(guide.id, {})
              }}
            >
              <RotateCcw className="size-3" aria-hidden="true" /> Start over
            </button>
          )}
        </div>
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <AskBox guideId={guide.id} suggestions={suggestions[guide.id] ?? []} />
          <div className="card p-4">
            <p className="text-sm font-semibold">Get a wipe record and a receipt</p>
            <p className="mt-1 text-sm text-ink-2">Add the device to your drawer, mark the steps there and sign the attestation. It then goes on your handover receipt.</p>
            <Link to={`/drawer/add?guide=${guide.id}`} className="btn-gold mt-3 w-full">
              Add to my drawer
            </Link>
          </div>
          {showBattery && (
            <div className="card p-4">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <BatteryWarning className="size-4 text-ember-500" aria-hidden="true" /> Battery looks puffy?
              </p>
              <BatterySafety compact />
            </div>
          )}
        </aside>
      </div>
    </Page>
  )
}
