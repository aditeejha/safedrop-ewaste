import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, ArrowLeft, Award, CalendarCheck, Loader2, PenLine, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { AskBox } from '../components/AskBox'
import { BatterySafety } from '../components/BatterySafety'
import { Checklist, guideProgress, ProgressBar } from '../components/Checklist'
import { ConditionForm, RouteAdvice } from '../components/Condition'
import { RequireAuth } from '../components/RequireAuth'
import { TrailTimeline } from '../components/Trail'
import { ErrorNote, Page, Spinner, StatusBadge } from '../components/ui'
import { attestationText, WipeRecordCard } from '../components/WipeRecord'
import { api, errorText, useIdempotencyKey } from '../lib/api'
import { formatDate, kindLabels, useGuides } from '../lib/data'
import { stageLabels, stageOrder } from '../lib/status'
import type { Condition, Device, DeviceStage, StepState, TrailEvent } from '../lib/types'

function Stepper({ stage, pickup }: { stage: DeviceStage; pickup: boolean }) {
  const stages = stageOrder.filter((s) => (pickup ? true : s !== 'collected'))
  const at = stages.indexOf(stage)
  return (
    <ol className="mt-5 grid grid-cols-4 gap-1 sm:grid-cols-7" aria-label="Device journey">
      {stages.map((s, i) => (
        <li key={s} className="min-w-0">
          <div className={`h-1.5 ${i <= at ? 'bg-sky-500' : 'bg-line'}`} />
          <p className={`mt-1 truncate text-[10.5px] ${i === at ? 'font-semibold text-ink' : 'text-ink-3'}`} title={stageLabels[s]}>
            {stageLabels[s]}
          </p>
        </li>
      ))}
    </ol>
  )
}

function DeviceView() {
  const { deviceId = '' } = useParams()
  const navigate = useNavigate()
  const client = useQueryClient()
  const guides = useGuides()
  const attestKey = useIdempotencyKey()
  const [agreed, setAgreed] = useState(false)
  const key = ['device', deviceId]
  const device = useQuery({ queryKey: key, queryFn: () => api<Device>(`/me/devices/${deviceId}`) })
  const trail = useQuery({ queryKey: ['trail', deviceId, device.data?.status], queryFn: () => api<TrailEvent[]>(`/me/devices/${deviceId}/trail`), enabled: Boolean(device.data) })
  const toggleKey = ['step', deviceId]

  const step = useMutation({
    mutationKey: toggleKey,
    mutationFn: ({ stepId, state }: { stepId: string; state: StepState | null }) =>
      api<Device>(`/me/devices/${deviceId}/steps/${encodeURIComponent(stepId)}`, { method: 'PUT', json: { state } }),
    onMutate: async ({ stepId, state }) => {
      await client.cancelQueries({ queryKey: key })
      const previous = client.getQueryData<Device>(key)
      if (previous?.wipe) {
        const steps = { ...previous.wipe.steps }
        if (state) steps[stepId] = { state, at: new Date().toISOString() }
        else delete steps[stepId]
        client.setQueryData(key, { ...previous, status: previous.status === 'added' ? 'wiping' : previous.status, wipe: { ...previous.wipe, steps } })
      }
      return { previous }
    },
    onError: (error, variables, context) => context?.previous && client.setQueryData(key, context.previous),
    // Rapid ticks can return out of order, so refetch once the last one settles.
    onSettled: () => {
      if (client.isMutating({ mutationKey: toggleKey }) === 1) client.invalidateQueries({ queryKey: key })
    },
  })

  const condition = useMutation({
    mutationFn: (next: Condition) => api<Device>(`/me/devices/${deviceId}/condition`, { method: 'PUT', json: next }),
    onSuccess: (updated) => client.setQueryData(key, updated),
  })

  const attest = useMutation({
    mutationFn: () => api<Device>(`/me/devices/${deviceId}/attest`, { method: 'POST', json: { confirm: true, statement: 'attest-1' }, idempotencyKey: attestKey.key }),
    onSuccess: (updated) => {
      client.setQueryData(key, updated)
      client.invalidateQueries({ queryKey: ['devices'] })
    },
  })

  const remove = useMutation({
    mutationFn: () => api(`/me/devices/${deviceId}`, { method: 'DELETE' }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['devices'] })
      navigate('/drawer')
    },
  })

  if (device.isLoading || guides.isLoading) return <Page><Spinner /></Page>
  if (device.isError || !device.data) return <Page><ErrorNote>{errorText(device.error)}</ErrorNote></Page>

  const d = device.data
  const guide = guides.data?.guides.find((g) => g.id === d.guideId)
  const states = Object.fromEntries(Object.entries(d.wipe?.steps ?? {}).map(([k, v]) => [k, v.state]))
  const progress = guide ? guideProgress(guide, states) : null
  const photoRisk = d.identification && (d.identification.batteryRisk === 'likely' || d.identification.batteryRisk === 'possible')
  const isPhone = ['android', 'samsung', 'iphone'].includes(d.guideId ?? '')
  const wiping = d.status === 'added' || d.status === 'wiping'
  const editableCondition = ['added', 'wiping', 'ready'].includes(d.status)

  return (
    <Page>
      <Link to="/drawer" className="inline-flex items-center gap-1 text-sm text-ink-2 hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" /> My drawer
      </Link>
      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <p className="eyebrow">{kindLabels[d.kind]}</p>
            <StatusBadge status={d.status} />
            {d.demo && <span className="chip border-ember-400 text-ember-700">Demo account</span>}
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">{d.label}</h1>
          <p className="mt-2 font-mono text-[11px] text-ink-3">
            {d.id} · added {formatDate(d.createdAt)}
          </p>
          <Stepper stage={d.status} pickup={d.status === 'collected'} />

          {photoRisk && (
            <div className="card mt-6 border-ember-400 p-5">
              <p className="flex items-center gap-2 font-semibold text-ember-700">
                <AlertTriangle className="size-4" aria-hidden="true" /> The photo suggests the battery may be swollen
              </p>
              <p className="mt-1 text-sm text-ink-2">A photo can’t confirm it. Check the device yourself and answer the battery question below.</p>
              <BatterySafety />
            </div>
          )}

          <section className="card mt-6 p-5">
            <h2 className="text-sm font-semibold">Condition and next step</h2>
            <div className="mt-3 grid grid-cols-1 gap-5 md:grid-cols-2">
              <ConditionForm value={d.condition ?? {}} holdsData={d.holdsData} disabled={!editableCondition || condition.isPending} onChange={(next) => condition.mutate(next)} />
              <RouteAdvice route={d.recommendation.route} reasons={d.recommendation.reasons} />
            </div>
            {condition.isError && <div className="mt-3"><ErrorNote>{errorText(condition.error)}</ErrorNote></div>}
          </section>

          {guide && wiping && progress && (
            <>
              <div className="sticky top-16 z-10 -mx-4 mt-6 border-y border-line bg-paper/95 px-4 py-3 backdrop-blur sm:mx-0 sm:border-x">
                <ProgressBar done={progress.answered} total={progress.total} />
                <p className="mt-2 text-xs text-ink-3">
                  {progress.criticalLeft
                    ? `${progress.criticalLeft} critical step${progress.criticalLeft > 1 ? 's' : ''} left. Mark “Doesn’t apply” if your device doesn’t have it.`
                    : 'All critical steps are marked. Sign the attestation below.'}
                </p>
              </div>
              <p className="mt-4 font-mono text-[11px] text-ink-3">
                {guide.title} · v{d.wipe?.guideVersion} · reviewed {formatDate(guide.reviewedAt)}
              </p>
              <div className="mt-3">
                <Checklist guide={guide} states={states} onChange={(stepId, state) => step.mutate({ stepId, state })} />
              </div>
              {step.isError && <div className="mt-3"><ErrorNote>{errorText(step.error)}</ErrorNote></div>}
              <div className="card mt-6 border-sky-300 p-5">
                <p className="flex items-center gap-2 font-semibold">
                  <PenLine className="size-4 text-sky-600" aria-hidden="true" /> Sign the wipe attestation
                </p>
                <label className="mt-3 flex cursor-pointer gap-3 text-sm text-ink-2">
                  <input type="checkbox" className="mt-1 size-4 accent-sky-600" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} disabled={progress.criticalLeft > 0} />
                  <span>{attestationText}</span>
                </label>
                <button type="button" className="btn-sky mt-4" disabled={!agreed || progress.criticalLeft > 0 || attest.isPending} onClick={() => attest.mutate()}>
                  {attest.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />} Sign and mark ready
                </button>
                {attest.isError && <div className="mt-3"><ErrorNote>{errorText(attest.error)}</ErrorNote></div>}
              </div>
            </>
          )}

          {d.wipe?.attestedAt && (
            <div className="mt-6">
              <WipeRecordCard guideTitle={guide?.title} guideVersion={d.wipe.guideVersion} attestedAt={d.wipe.attestedAt} summary={d.wipe.summary} />
            </div>
          )}

          {d.status === 'ready' && (
            <div className="card mt-6 border-sky-300 p-6">
              <p className="text-lg font-semibold">{d.holdsData ? 'Wipe self-attested: ready to hand over' : 'No personal data: ready to hand over'}</p>
              <p className="mt-1 text-sm text-ink-2">Book a drop-off or a kabadiwala pickup and you’ll get a single-use handover code.</p>
              <Link to={`/book?devices=${d.id}`} className="btn-sky mt-4">
                <CalendarCheck className="size-4" aria-hidden="true" /> Book a handover
              </Link>
            </div>
          )}
          {(d.status === 'booked' || d.status === 'collected') && d.bookingId && (
            <div className="card mt-6 border-sky-300 p-6">
              <p className="text-lg font-semibold">{stageLabels[d.status]}</p>
              <Link to={`/bookings/${d.bookingId}`} className="btn-sky mt-4">Show handover code</Link>
            </div>
          )}
          {d.certificateId && (
            <div className="card mt-6 border-gold-400 p-6">
              <p className="flex items-center gap-2 text-lg font-semibold">
                <Award className="size-5 text-gold-500" aria-hidden="true" /> {stageLabels[d.status]}
              </p>
              <p className="mt-1 text-sm text-ink-2">{d.weightKg} kg recorded at the drop point.</p>
              <Link to={`/certificate/${d.certificateId}`} className="btn-gold mt-4">View receipt and trail</Link>
            </div>
          )}

          <section className="mt-8">
            <h2 className="mb-3 text-sm font-semibold">Event trail</h2>
            {trail.data ? <TrailTimeline deviceId={d.id} events={trail.data} /> : <Spinner label="Loading trail" />}
          </section>

          {(d.status === 'added' || d.status === 'wiping' || d.status === 'ready') && (
            <button
              type="button"
              className="mt-8 inline-flex items-center gap-1.5 text-xs text-ink-3 hover:text-ember-700"
              onClick={() => confirm('Remove this device and its trail from your drawer?') && remove.mutate()}
            >
              <Trash2 className="size-3.5" aria-hidden="true" /> Remove from drawer
            </button>
          )}
        </div>
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <AskBox guideId={d.guideId ?? undefined} />
          {isPhone && wiping && (
            <div className="card p-4">
              <p className="text-sm font-semibold">Also do the India extras</p>
              <p className="mt-1 text-sm text-ink-2">Deregister UPI apps, back up WhatsApp and remove the phone from Find My Device.</p>
              <Link to="/wipe/india-phone-extras" className="link mt-2 inline-block text-sm">Open the India checklist</Link>
            </div>
          )}
        </aside>
      </div>
    </Page>
  )
}

export default function DevicePage() {
  return <RequireAuth>{() => <DeviceView />}</RequireAuth>
}
