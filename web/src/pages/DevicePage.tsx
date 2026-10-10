import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, ArrowLeft, Award, CalendarCheck, CheckCircle2, Loader2, Trash2 } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'
import { AskBox } from '../components/AskBox'
import { BatterySafety } from '../components/BatterySafety'
import { Checklist, guideProgress, ProgressBar } from '../components/Checklist'
import { RequireAuth } from '../components/RequireAuth'
import { ErrorNote, Page, Spinner, StatusBadge } from '../components/ui'
import { api, errorText } from '../lib/api'
import { formatDate, kindLabels, useGuides } from '../lib/data'
import type { Device } from '../lib/types'

function DeviceView() {
  const { deviceId = '' } = useParams()
  const navigate = useNavigate()
  const client = useQueryClient()
  const guides = useGuides()
  const key = ['device', deviceId]
  const device = useQuery({ queryKey: key, queryFn: () => api<Device>(`/me/devices/${deviceId}`) })

  const toggleKey = ['toggle-step', deviceId]
  const toggle = useMutation({
    mutationKey: toggleKey,
    mutationFn: ({ stepId, done }: { stepId: string; done: boolean }) =>
      api<Device>(`/me/devices/${deviceId}/steps/${encodeURIComponent(stepId)}`, { method: 'PUT', json: { done } }),
    onMutate: async ({ stepId, done }) => {
      await client.cancelQueries({ queryKey: key })
      const previous = client.getQueryData<Device>(key)
      if (previous) {
        const steps = { ...previous.steps }
        if (done) steps[stepId] = new Date().toISOString()
        else delete steps[stepId]
        client.setQueryData(key, { ...previous, steps })
      }
      return { previous }
    },
    onError: (error, variables, context) => context?.previous && client.setQueryData(key, context.previous),
    // Rapid ticks can return out of order, so refetch once the last one settles.
    onSettled: () => {
      if (client.isMutating({ mutationKey: toggleKey }) === 1) client.invalidateQueries({ queryKey: key })
    },
  })

  const markWiped = useMutation({
    mutationFn: () => api<Device>(`/me/devices/${deviceId}/wiped`, { method: 'POST' }),
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
  const progress = guide ? guideProgress(guide, d.steps) : null
  const risky = d.identification && (d.identification.batteryRisk === 'likely' || d.identification.batteryRisk === 'possible')
  const isPhone = ['android', 'samsung', 'iphone'].includes(d.guideId ?? '')

  return (
    <Page>
      <Link to="/drawer" className="inline-flex items-center gap-1 text-sm text-ink-2 hover:text-ink">
        <ArrowLeft className="size-4" /> My drawer
      </Link>
      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_340px]">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="eyebrow">{kindLabels[d.kind]}</p>
            <StatusBadge status={d.status} />
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">{d.label}</h1>
          <p className="mt-2 text-sm text-ink-3">Added {formatDate(d.createdAt)}{d.wipedAt ? ` · wiped ${formatDate(d.wipedAt)}` : ''}</p>

          {risky && (
            <div className="card mt-6 border-ember-400 p-5">
              <p className="flex items-center gap-2 font-semibold text-ember-700">
                <AlertTriangle className="size-4" /> The photo check flagged a possibly swollen battery
              </p>
              <BatterySafety />
            </div>
          )}

          {!d.holdsData && (
            <div className="card mt-6 p-5">
              <p className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="size-4 text-sky-600" /> No personal data on this item
              </p>
              <p className="mt-1 text-sm text-ink-2">It is ready to drop off with your other devices.</p>
            </div>
          )}

          {guide && d.status === 'added' && progress && (
            <>
              <div className="sticky top-16 z-10 -mx-4 mt-6 border-y border-line bg-paper/95 px-4 py-3 backdrop-blur sm:mx-0 sm:border-x">
                <ProgressBar done={progress.done} total={progress.total} />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-ink-3">
                    {progress.criticalLeft ? `${progress.criticalLeft} critical step${progress.criticalLeft > 1 ? 's' : ''} left before you can hand it over.` : 'All critical steps done.'}
                  </p>
                  <button type="button" className="btn-sky" disabled={progress.criticalLeft > 0 || markWiped.isPending} onClick={() => markWiped.mutate()}>
                    {markWiped.isPending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />} Mark as wiped
                  </button>
                </div>
                {markWiped.isError && <div className="mt-2"><ErrorNote>{errorText(markWiped.error)}</ErrorNote></div>}
              </div>
              <div className="mt-6">
                <Checklist guide={guide} checked={d.steps} onToggle={(stepId, done) => toggle.mutate({ stepId, done })} />
              </div>
              {toggle.isError && <div className="mt-3"><ErrorNote>{errorText(toggle.error)}</ErrorNote></div>}
            </>
          )}

          {d.status === 'ready' && (
            <div className="card mt-6 border-sky-300 p-6">
              <p className="text-lg font-semibold">{d.holdsData ? 'Wiped and ready to go' : 'Ready to go'}</p>
              <p className="mt-1 text-sm text-ink-2">Book a drop-off at a SafeDrop point and you’ll get a handover code.</p>
              <Link to={`/book?devices=${d.id}`} className="btn-sky mt-4">
                <CalendarCheck className="size-4" /> Book a drop-off
              </Link>
            </div>
          )}
          {d.status === 'booked' && d.bookingId && (
            <div className="card mt-6 border-sky-300 p-6">
              <p className="text-lg font-semibold">Drop-off booked</p>
              <Link to={`/bookings/${d.bookingId}`} className="btn-sky mt-4">Show handover code</Link>
            </div>
          )}
          {d.status === 'recycled' && d.certificateId && (
            <div className="card mt-6 border-gold-400 p-6">
              <p className="flex items-center gap-2 text-lg font-semibold">
                <Award className="size-5 text-gold-500" /> Recycled
              </p>
              <Link to={`/certificate/${d.certificateId}`} className="btn-gold mt-4">View certificate</Link>
            </div>
          )}

          {(d.status === 'added' || d.status === 'ready') && (
            <button
              type="button"
              className="mt-8 inline-flex items-center gap-1.5 text-xs text-ink-3 hover:text-ember-700"
              onClick={() => confirm('Remove this device from your drawer?') && remove.mutate()}
            >
              <Trash2 className="size-3.5" /> Remove from drawer
            </button>
          )}
        </div>
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <AskBox guideId={d.guideId ?? undefined} />
          {isPhone && d.status === 'added' && (
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
