import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Award, Camera, CheckCircle2, Loader2, Scale, ScanLine, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { RequireAuth } from '../components/RequireAuth'
import { ErrorNote, Page, PageHeader, Picture, StatusBadge } from '../components/ui'
import { api, errorText } from '../lib/api'
import { formatDate, formatKg, formatKwh, kindLabels } from '../lib/data'
import type { Booking, Certificate, Point } from '../lib/types'

type Detector = { detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]> }

function codeFrom(text: string) {
  const fromUrl = text.match(/code=([A-Z0-9]{6})/i)?.[1]
  return (fromUrl ?? text).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
}

function Scanner({ onCode, onClose }: { onCode: (code: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    const Ctor = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector
    if (!Ctor) {
      setError('QR scanning is not supported in this browser. Type the code instead.')
      return
    }
    const detector = new Ctor({ formats: ['qr_code'] })
    let stream: MediaStream | null = null
    let stopped = false
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then(async (s) => {
        stream = s
        if (!video.current) return
        video.current.srcObject = s
        await video.current.play()
        const tick = async () => {
          if (stopped || !video.current) return
          const found = await detector.detect(video.current).catch(() => [])
          const code = found[0] ? codeFrom(found[0].rawValue) : ''
          if (code.length === 6) onCode(code)
          else requestAnimationFrame(tick)
        }
        tick()
      })
      .catch(() => setError('Camera permission was denied. Type the code instead.'))
    return () => {
      stopped = true
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [onCode])
  return (
    <div className="card relative overflow-hidden">
      <button type="button" onClick={onClose} className="absolute right-2 top-2 z-10 bg-white p-1.5" aria-label="Close scanner">
        <X className="size-4" />
      </button>
      {error ? <p className="p-5 text-sm text-ink-2">{error}</p> : <video ref={video} className="aspect-[4/3] w-full bg-ink object-cover" muted playsInline />}
    </div>
  )
}

function PartnerView() {
  const [params] = useSearchParams()
  const client = useQueryClient()
  const [code, setCode] = useState(codeFrom(params.get('code') ?? ''))
  const [scanning, setScanning] = useState(false)
  const [weights, setWeights] = useState<Record<string, string>>({})
  const [issued, setIssued] = useState<Certificate | null>(null)

  const point = useQuery({ queryKey: ['partner-point'], queryFn: () => api<Point>('/partner/point') })
  const bookings = useQuery({ queryKey: ['partner-bookings'], queryFn: () => api<Booking[]>('/partner/bookings'), refetchInterval: 15000 })

  const lookup = useMutation({
    mutationFn: (c: string) => api<Booking>(`/partner/handover/${c}`),
    onSuccess: (b) => {
      setIssued(null)
      setWeights(Object.fromEntries(b.devices.map((d) => [d.id, d.suggestedKg ? String(d.suggestedKg) : ''])))
    },
  })

  const confirm = useMutation({
    mutationFn: () =>
      api<Certificate>(`/partner/handover/${lookup.data!.code}`, {
        method: 'POST',
        json: { items: lookup.data!.devices.map((d) => ({ deviceId: d.id, kg: Number(weights[d.id]) })) },
      }),
    onSuccess: (cert) => {
      setIssued(cert)
      lookup.reset()
      setCode('')
      client.invalidateQueries({ queryKey: ['partner-bookings'] })
      client.invalidateQueries({ queryKey: ['stats'] })
    },
  })

  useEffect(() => {
    if (code.length === 6 && params.get('code')) lookup.mutate(code)
    // Only auto-load a code that arrived in the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const booking = lookup.data
  const upcoming = (bookings.data ?? []).filter((b) => b.status === 'booked').sort((a, b) => a.date.localeCompare(b.date))
  const done = (bookings.data ?? []).filter((b) => b.status === 'received')

  return (
    <Page>
      <PageHeader eyebrow="Partner portal" title={point.data?.name ?? 'Your drop point'} intro="Verify the handover code, weigh each item and confirm. The customer gets their certificate instantly.">
        {point.data?.demo && <span className="chip border-ember-400 text-ember-700">Demo drop point</span>}
      </PageHeader>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <form
            className="card flex flex-wrap gap-2 p-4"
            onSubmit={(e) => {
              e.preventDefault()
              if (code.length === 6) lookup.mutate(code)
            }}
          >
            <input
              className="field min-w-0 flex-1 font-mono text-lg uppercase tracking-[0.3em]"
              placeholder="HANDOVER CODE"
              value={code}
              maxLength={6}
              onChange={(e) => setCode(codeFrom(e.target.value))}
              aria-label="Handover code"
            />
            <button type="submit" className="btn-primary" disabled={code.length !== 6 || lookup.isPending}>
              {lookup.isPending ? <Loader2 className="size-4 animate-spin" /> : <ScanLine className="size-4" />} Verify
            </button>
            <button type="button" className="btn-ghost" onClick={() => setScanning((s) => !s)}>
              <Camera className="size-4" /> Scan QR
            </button>
          </form>
          {scanning && (
            <Scanner
              onClose={() => setScanning(false)}
              onCode={(c) => {
                setScanning(false)
                setCode(c)
                lookup.mutate(c)
              }}
            />
          )}
          {lookup.isError && <ErrorNote>{errorText(lookup.error)}</ErrorNote>}

          {issued && (
            <div className="card border-emerald-600 p-6">
              <p className="flex items-center gap-2 text-lg font-semibold text-emerald-700">
                <CheckCircle2 className="size-5" /> Handover confirmed
              </p>
              <p className="mt-1 text-sm text-ink-2">
                {issued.totals.devices} item{issued.totals.devices > 1 ? 's' : ''} · {formatKg(issued.totals.kg)} · {issued.totals.co2eKg} kg CO₂e avoided ·{' '}
                {formatKwh(issued.totals.energyKwh)} saved
              </p>
              <Link to={`/certificate/${issued.id}`} className="btn-gold mt-4">
                <Award className="size-4" /> View certificate
              </Link>
            </div>
          )}

          {booking && (
            <form
              className="card p-5"
              onSubmit={(e) => {
                e.preventDefault()
                confirm.mutate()
              }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-lg font-semibold">{booking.userName}</p>
                <span className="font-mono text-sm tracking-[0.2em] text-sky-700">{booking.code}</span>
              </div>
              <p className="text-sm text-ink-3">
                Booked for {formatDate(booking.date)}
                {booking.mode === 'pickup' && booking.collectorName ? ` · brought by pickup partner ${booking.collectorName}` : ''}
              </p>
              <div className="mt-4 divide-y divide-line border border-line">
                {booking.devices.map((d) => (
                  <div key={d.id} className="flex flex-wrap items-center gap-3 px-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{d.label}</p>
                      <p className="text-xs text-ink-3">
                        {kindLabels[d.kind]} · {d.holdsData ? (d.wipedAt ? `wiped ${formatDate(d.wipedAt)}` : 'not wiped') : 'no data'}
                      </p>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-ink-3">
                      <Scale className="size-4" />
                      <input
                        type="number"
                        step="0.001"
                        min="0.001"
                        max="60"
                        required
                        className="field w-24 py-1.5 text-right tabular-nums"
                        value={weights[d.id] ?? ''}
                        onChange={(e) => setWeights((w) => ({ ...w, [d.id]: e.target.value }))}
                        aria-label={`Weight of ${d.label} in kg`}
                      />
                      kg
                    </label>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-ink-3">Prefilled with typical weights (UNU averages). Replace them with the scale reading.</p>
              {confirm.isError && <div className="mt-3"><ErrorNote>{errorText(confirm.error)}</ErrorNote></div>}
              <button type="submit" className="btn-gold mt-4 w-full py-3" disabled={confirm.isPending}>
                {confirm.isPending && <Loader2 className="size-4 animate-spin" />} Confirm handover and issue certificate
              </button>
            </form>
          )}
        </div>

        <aside className="space-y-4">
          <Picture name="partner-weigh" alt="Staff weighing an old phone at a recycling counter" className="aspect-[3/2] w-full border border-line" />
          <div className="card">
            <p className="border-b border-line px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider text-ink-3">Upcoming ({upcoming.length})</p>
            <ul className="divide-y divide-line">
              {upcoming.length === 0 && <li className="px-4 py-3 text-sm text-ink-3">No bookings yet.</li>}
              {upcoming.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span>
                    {b.userName}
                    <span className="block text-xs text-ink-3">
                      {formatDate(b.date)} · {b.devices.length} item{b.devices.length > 1 ? 's' : ''}
                    </span>
                  </span>
                  <StatusBadge status={b.status} />
                </li>
              ))}
            </ul>
            {done.length > 0 && <p className="border-t border-line px-4 py-2.5 text-xs text-ink-3">{done.length} handover{done.length > 1 ? 's' : ''} confirmed so far</p>}
          </div>
        </aside>
      </div>
    </Page>
  )
}

export default function Partner() {
  return <RequireAuth partner>{() => <PartnerView />}</RequireAuth>
}
