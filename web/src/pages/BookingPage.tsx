import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Award, CalendarDays, Check, Loader2, MapPin, Navigation, Phone, Truck } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { Qr } from '../components/Qr'
import { RequireAuth } from '../components/RequireAuth'
import { ErrorNote, Page, Spinner, StatusBadge } from '../components/ui'
import { api, errorText } from '../lib/api'
import { formatDate, kindLabels } from '../lib/data'
import { directionsUrl } from '../lib/geo'
import type { Booking, Point } from '../lib/types'

function BookingView() {
  const { bookingId = '' } = useParams()
  const client = useQueryClient()
  const booking = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => api<Booking>(`/me/bookings/${bookingId}`),
    refetchInterval: (q) => (['booked', 'accepted', 'collected'].includes(q.state.data?.status ?? '') ? 8000 : false),
  })
  const points = useQuery({ queryKey: ['points'], queryFn: () => api<Point[]>('/points') })
  const cancel = useMutation({
    mutationFn: () => api<Booking>(`/me/bookings/${bookingId}/cancel`, { method: 'POST' }),
    onSuccess: () => client.invalidateQueries(),
  })

  if (booking.isLoading) return <Page><Spinner /></Page>
  if (!booking.data) return <Page><ErrorNote>{errorText(booking.error)}</ErrorNote></Page>
  const b = booking.data
  const point = points.data?.find((p) => p.id === b.pointId)
  const partnerUrl = b.qr ? `${location.origin}/partner?qr=${encodeURIComponent(b.qr)}` : `${location.origin}/partner?code=${b.code}`

  return (
    <Page narrow>
      <Link to="/drawer" className="inline-flex items-center gap-1 text-sm text-ink-2 hover:text-ink">
        <ArrowLeft className="size-4" /> My drawer
      </Link>
      <div className="mt-6 flex items-center gap-3">
        <p className="eyebrow">Drop-off booking</p>
        <StatusBadge status={b.status} />
      </div>

      {b.status === 'received' && b.certificateId ? (
        <div className="card mt-4 border-gold-400 bg-gradient-to-b from-gold-50 to-white p-8 text-center">
          <Award className="mx-auto size-12 text-gold-500" />
          <h1 className="mt-4 text-2xl font-semibold">Handed over. Thank you!</h1>
          <p className="mt-2 text-sm text-ink-2">The drop point weighed your devices and issued your recycling certificate.</p>
          <Link to={`/certificate/${b.certificateId}`} className="btn-gold mt-6">View certificate</Link>
        </div>
      ) : (
        <div className="card mt-4 grid gap-6 p-6 sm:grid-cols-[auto_1fr] sm:items-center">
          <div className="mx-auto border border-line p-2">
            <Qr value={partnerUrl} size={180} label={`QR code for handover code ${b.code}`} />
          </div>
          <div className="text-center sm:text-left">
            <p className="text-sm text-ink-2">{b.mode === 'pickup' ? 'Show this to your pickup partner' : 'Show this at the counter'}</p>
            <p className="mt-1 font-mono text-5xl font-semibold tracking-[0.18em] text-ink">{b.code}</p>
            <p className="mt-1 text-xs text-ink-3">
              Works once · valid until {formatDate(b.expiresAt)} {new Date(b.expiresAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}. The QR carries a signed token, so it can’t be forged.
            </p>
            <p className="mt-3 text-sm text-ink-2">
              {b.mode === 'pickup'
                ? 'The partner types this code when they collect. The drop point checks it again before issuing your certificate.'
                : 'Staff scan the QR or type the code, weigh your items and confirm. Your certificate appears here straight away.'}
            </p>
            {b.status !== 'cancelled' && (
              <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-sky-700">
                <Loader2 className="size-3 animate-spin" /> {b.mode === 'pickup' ? 'Updates live as your pickup moves' : 'Waiting for handover'}
              </p>
            )}
          </div>
        </div>
      )}

      {b.mode === 'pickup' && <PickupTimeline booking={b} />}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="card p-5">
          <p className="flex items-center gap-2 text-sm font-semibold"><MapPin className="size-4 text-ember-500" /> {b.pointName}</p>
          {point && (
            <>
              <p className="mt-1 text-sm text-ink-2">{point.address}</p>
              <p className="mt-1 text-xs text-ink-3">{point.hours}</p>
              <a href={directionsUrl(point)} target="_blank" rel="noreferrer" className="btn-ghost mt-3">
                <Navigation className="size-4" /> Directions
              </a>
            </>
          )}
        </div>
        <div className="card p-5">
          <p className="flex items-center gap-2 text-sm font-semibold"><CalendarDays className="size-4 text-sky-600" /> {formatDate(b.date)}</p>
          <ul className="mt-3 space-y-1.5 text-sm">
            {b.devices.map((d) => (
              <li key={d.id} className="flex justify-between gap-3">
                <span>{d.label}</span>
                <span className="text-xs text-ink-3">{kindLabels[d.kind]}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {(b.status === 'booked' || b.status === 'accepted') && (
        <div className="mt-6">
          {cancel.isError && <ErrorNote>{errorText(cancel.error)}</ErrorNote>}
          <button type="button" className="text-xs text-ink-3 hover:text-ember-700" disabled={cancel.isPending} onClick={() => confirm('Cancel this drop-off?') && cancel.mutate()}>
            Cancel booking
          </button>
        </div>
      )}
    </Page>
  )
}

function PickupTimeline({ booking: b }: { booking: Booking }) {
  const order = ['booked', 'accepted', 'collected', 'received']
  const at = order.indexOf(b.status)
  const steps = [
    { label: 'Pickup requested', detail: b.pickup ? `${b.pickup.address} · ${b.pickup.pincode}` : '' },
    { label: b.collectorName ? `Accepted by ${b.collectorName}` : 'Waiting for a partner to accept', detail: b.acceptedAt ? formatDate(b.acceptedAt) : 'Partners covering your pincode can see the request' },
    { label: 'Collected from your door', detail: b.collectedAt ? formatDate(b.collectedAt) : 'The partner enters your code at pickup' },
    { label: `Received at ${b.pointName}`, detail: b.receivedAt ? formatDate(b.receivedAt) : 'Weighed and certified at the drop point' },
  ]
  return (
    <div className="card mt-6 p-5">
      <p className="flex items-center gap-2 text-sm font-semibold"><Truck className="size-4 text-gold-500" /> Doorstep pickup</p>
      <ol className="mt-4 space-y-4">
        {steps.map((step, i) => (
          <li key={step.label} className="flex gap-3">
            <span className={`flex size-6 shrink-0 items-center justify-center rounded-full border text-xs ${i <= at ? 'border-sky-500 bg-sky-500 text-white' : 'border-line-2 text-ink-3'}`}>
              {i <= at ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
            </span>
            <span>
              <span className={`block text-sm ${i <= at ? 'font-medium text-ink' : 'text-ink-2'}`}>{step.label}</span>
              <span className="block text-xs text-ink-3">{step.detail}</span>
            </span>
          </li>
        ))}
      </ol>
      {b.collectorPhone && b.status === 'accepted' && (
        <a href={`tel:${b.collectorPhone}`} className="btn-ghost mt-4">
          <Phone className="size-4" /> Call {b.collectorName}
        </a>
      )}
    </div>
  )
}

export default function BookingPage() {
  return <RequireAuth>{() => <BookingView />}</RequireAuth>
}
