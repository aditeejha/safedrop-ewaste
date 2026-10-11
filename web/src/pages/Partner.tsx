import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Award, Camera, CheckCircle2, Loader2, PackageCheck, Scale, ScanLine, Send, Truck, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { RequireAuth } from '../components/RequireAuth'
import { ErrorNote, Page, PageHeader, Picture, StatusBadge } from '../components/ui'
import { api, errorText, useIdempotencyKey } from '../lib/api'
import { formatDate, formatKg, formatKwh, kindLabels, useSites } from '../lib/data'
import type { Booking, Certificate, Dispatch, Facility, HeldItem, Point } from '../lib/types'

type Detector = { detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]> }
type Handle = { code?: string; qr?: string }

function readScan(text: string): Handle | null {
  try {
    const url = new URL(text)
    const qr = url.searchParams.get('qr')
    const code = url.searchParams.get('code')
    if (qr) return { qr }
    if (code) return { code: code.toUpperCase() }
  } catch {}
  const code = text.toUpperCase().replace(/[^A-Z0-9]/g, '')
  return code.length === 6 ? { code } : null
}

function Scanner({ onScan, onClose }: { onScan: (handle: Handle) => void; onClose: () => void }) {
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
          const handle = found[0] ? readScan(found[0].rawValue) : null
          if (handle) onScan(handle)
          else requestAnimationFrame(tick)
        }
        tick()
      })
      .catch(() => setError('Camera permission was denied. Type the code instead.'))
    return () => {
      stopped = true
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [onScan])
  return (
    <div className="card relative overflow-hidden">
      <button type="button" onClick={onClose} className="absolute right-2 top-2 z-10 bg-white p-1.5" aria-label="Close scanner">
        <X className="size-4" />
      </button>
      {error ? <p className="p-5 text-sm text-ink-2">{error}</p> : <video ref={video} className="aspect-[4/3] w-full bg-ink object-cover" muted playsInline />}
    </div>
  )
}

function HandoverDesk() {
  const [params] = useSearchParams()
  const client = useQueryClient()
  const handoverKey = useIdempotencyKey()
  const initial = params.get('qr') ? { qr: params.get('qr')! } : params.get('code') ? { code: params.get('code')!.toUpperCase() } : null
  const [code, setCode] = useState(initial?.code ?? '')
  const [handle, setHandle] = useState<Handle | null>(initial)
  const [scanning, setScanning] = useState(false)
  const [weights, setWeights] = useState<Record<string, string>>({})
  const [issued, setIssued] = useState<Certificate | null>(null)

  const query = (h: Handle) => (h.qr ? `qr=${encodeURIComponent(h.qr)}` : `code=${h.code}`)
  const lookup = useMutation({
    mutationFn: (h: Handle) => api<Booking>(`/partner/handover?${query(h)}`),
    onSuccess: (b, h) => {
      setHandle(h)
      setIssued(null)
      setWeights(Object.fromEntries(b.devices.map((d) => [d.id, d.suggestedKg ? String(d.suggestedKg) : ''])))
    },
  })
  const confirm = useMutation({
    mutationFn: () =>
      api<Certificate>('/partner/handover', {
        method: 'POST',
        json: { ...handle, items: lookup.data!.devices.map((d) => ({ deviceId: d.id, kg: Number(weights[d.id]), unit: 'kg' })) },
        idempotencyKey: handoverKey.key,
      }),
    onSuccess: (cert) => {
      handoverKey.renew()
      setIssued(cert)
      lookup.reset()
      setCode('')
      setHandle(null)
      client.invalidateQueries({ queryKey: ['partner-bookings'] })
      client.invalidateQueries({ queryKey: ['partner-held'] })
    },
  })

  useEffect(() => {
    if (initial) lookup.mutate(initial)
    // Only auto-load a code that arrived in the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const booking = lookup.data
  return (
    <div className="space-y-4">
      <form
        className="card flex flex-wrap gap-2 p-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (code.length === 6) lookup.mutate({ code })
        }}
      >
        <input
          className="field min-w-0 flex-1 font-mono text-lg uppercase tracking-[0.3em]"
          placeholder="HANDOVER CODE"
          value={code}
          maxLength={6}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
          aria-label="Handover code"
        />
        <button type="submit" className="btn-primary" disabled={code.length !== 6 || lookup.isPending}>
          {lookup.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <ScanLine className="size-4" aria-hidden="true" />} Verify
        </button>
        <button type="button" className="btn-ghost" onClick={() => setScanning((s) => !s)}>
          <Camera className="size-4" aria-hidden="true" /> Scan QR
        </button>
      </form>
      {scanning && (
        <Scanner
          onClose={() => setScanning(false)}
          onScan={(h) => {
            setScanning(false)
            if (h.code) setCode(h.code)
            lookup.mutate(h)
          }}
        />
      )}
      {lookup.isError && <ErrorNote>{errorText(lookup.error)}</ErrorNote>}

      {issued && (
        <div className="card border-emerald-600 p-6">
          <p className="flex items-center gap-2 text-lg font-semibold text-emerald-700">
            <CheckCircle2 className="size-5" aria-hidden="true" /> Handover confirmed
          </p>
          <p className="mt-1 text-sm text-ink-2">
            {issued.totals.devices} item{issued.totals.devices > 1 ? 's' : ''} · {formatKg(issued.totals.kg)} weighed · estimated {issued.totals.co2eKg} kg CO₂e and{' '}
            {formatKwh(issued.totals.energyKwh)} once recycled
          </p>
          <Link to={`/certificate/${issued.id}`} className="btn-gold mt-4">
            <Award className="size-4" aria-hidden="true" /> View receipt
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
            <StatusBadge status={booking.status} />
          </div>
          <p className="text-sm text-ink-3">
            {booking.mode === 'pickup' ? `Pickup brought by ${booking.collectorName}` : 'Drop-off'} · booked for {formatDate(booking.date)} · code valid until {formatDate(booking.expiresAt)}
          </p>
          <div className="mt-4 divide-y divide-line border border-line">
            {booking.devices.map((d) => (
              <div key={d.id} className="flex flex-wrap items-center gap-3 px-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{d.label}</p>
                  <p className="text-xs text-ink-3">
                    {kindLabels[d.kind]} · {d.holdsData ? (d.wipeAttestedAt ? `wipe self-attested ${formatDate(d.wipeAttestedAt)}` : 'no wipe record') : 'no personal data'} ·{' '}
                    <span className="font-mono">{d.id}</span>
                  </p>
                </div>
                <label className="flex items-center gap-2 text-xs text-ink-3">
                  <Scale className="size-4" aria-hidden="true" />
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
          <p className="mt-2 text-xs text-ink-3">Prefilled with typical UNU weights. Replace them with the scale reading; corrections stay possible for 48 hours and are logged.</p>
          {confirm.isError && <div className="mt-3"><ErrorNote>{errorText(confirm.error)}</ErrorNote></div>}
          <button type="submit" className="btn-gold mt-4 w-full py-3" disabled={confirm.isPending}>
            {confirm.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />} Confirm handover and issue receipt
          </button>
        </form>
      )}
    </div>
  )
}

function HeldAndDispatch() {
  const client = useQueryClient()
  const sites = useSites()
  const dispatchKey = useIdempotencyKey()
  const held = useQuery({ queryKey: ['partner-held'], queryFn: () => api<HeldItem[]>('/partner/held') })
  const facilities = useQuery({ queryKey: ['facilities'], queryFn: () => api<Facility[]>('/facilities') })
  const dispatches = useQuery({ queryKey: ['partner-dispatches'], queryFn: () => api<Dispatch[]>('/partner/dispatches') })
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [target, setTarget] = useState('')
  const [search, setSearch] = useState('')
  const [reference, setReference] = useState('')
  const [fix, setFix] = useState<{ id: string; kg: string; reason: string } | null>(null)

  const recyclerMatches = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (q.length < 2) return []
    return (sites.data?.sites ?? []).filter((s) => s.type === 'recycler' && `${s.name} ${s.city ?? ''} ${s.district ?? ''}`.toLowerCase().includes(q)).slice(0, 6)
  }, [search, sites.data])

  const refresh = () => {
    client.invalidateQueries({ queryKey: ['partner-held'] })
    client.invalidateQueries({ queryKey: ['partner-dispatches'] })
  }
  const correct = useMutation({
    mutationFn: () => api('/partner/corrections', { method: 'POST', json: { deviceId: fix!.id, kg: Number(fix!.kg), reason: fix!.reason } }),
    onSuccess: () => {
      setFix(null)
      refresh()
    },
  })
  const send = useMutation({
    mutationFn: () => {
      const [type, id] = target.split(':')
      return api<Dispatch>('/partner/dispatches', { method: 'POST', json: { deviceIds: [...selected], facility: { type, id }, reference }, idempotencyKey: dispatchKey.key })
    },
    onSuccess: () => {
      dispatchKey.renew()
      setSelected(new Set())
      setReference('')
      refresh()
    },
  })

  const items = held.data ?? []
  return (
    <div className="space-y-6">
      <section className="card">
        <p className="flex items-center gap-2 border-b border-line px-4 py-3 text-sm font-semibold">
          <PackageCheck className="size-4 text-sky-600" aria-hidden="true" /> Held here, not yet dispatched ({items.length})
        </p>
        {items.length === 0 ? (
          <p className="px-4 py-4 text-sm text-ink-3">Nothing waiting. Received items appear here until you send them for processing.</p>
        ) : (
          <ul className="divide-y divide-line">
            {items.map((item) => (
              <li key={item.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="checkbox"
                    className="size-4 accent-sky-600"
                    checked={selected.has(item.id)}
                    onChange={(e) => {
                      const next = new Set(selected)
                      if (e.target.checked) next.add(item.id)
                      else next.delete(item.id)
                      setSelected(next)
                    }}
                    aria-label={`Select ${item.label} for dispatch`}
                  />
                  <span className="min-w-0 flex-1 text-sm">
                    {item.label}
                    <span className="block text-xs text-ink-3">
                      {kindLabels[item.kind]} · {item.weightKg} kg · received {formatDate(item.receivedAt)}
                    </span>
                  </span>
                  {Date.now() - Date.parse(item.receivedAt) < 48 * 3600_000 && (
                    <button type="button" className="text-xs text-sky-700 hover:underline" onClick={() => setFix({ id: item.id, kg: String(item.weightKg), reason: '' })}>
                      Correct weight
                    </button>
                  )}
                </div>
                {fix?.id === item.id && (
                  <form
                    className="mt-3 flex flex-wrap gap-2"
                    onSubmit={(e) => {
                      e.preventDefault()
                      correct.mutate()
                    }}
                  >
                    <input className="field w-24" type="number" step="0.001" min="0.001" max="60" value={fix.kg} onChange={(e) => setFix({ ...fix, kg: e.target.value })} aria-label="Corrected weight in kg" />
                    <input className="field min-w-0 flex-1" placeholder="Reason, e.g. re-weighed without the case" value={fix.reason} onChange={(e) => setFix({ ...fix, reason: e.target.value })} />
                    <button type="submit" className="btn-primary" disabled={correct.isPending}>Save</button>
                    {correct.isError && <div className="w-full"><ErrorNote>{errorText(correct.error)}</ErrorNote></div>}
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {items.length > 0 && (
        <form
          className="card space-y-3 p-4"
          onSubmit={(e) => {
            e.preventDefault()
            send.mutate()
          }}
        >
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Truck className="size-4 text-gold-500" aria-hidden="true" /> Send {selected.size || ''} selected item{selected.size === 1 ? '' : 's'} for processing
          </p>
          <fieldset>
            <legend className="label">Receiving facility</legend>
            {(facilities.data ?? []).map((f) => (
              <label key={f.id} className="flex items-start gap-2 py-1 text-sm">
                <input type="radio" name="facility" checked={target === `onboarded:${f.id}`} onChange={() => setTarget(`onboarded:${f.id}`)} className="mt-1" />
                <span>
                  {f.name} {f.demo && <span className="font-mono text-[10px] uppercase text-ember-700">demo</span>}
                  <span className="block text-xs text-ink-3">Onboarded: can confirm processing in SafeDrop</span>
                </span>
              </label>
            ))}
            <input className="field mt-2" placeholder="Or search CPCB-registered recyclers by name or city" value={search} onChange={(e) => setSearch(e.target.value)} />
            {recyclerMatches.map((s) => (
              <label key={s.id} className="flex items-start gap-2 py-1 text-sm">
                <input type="radio" name="facility" checked={target === `cpcb:${s.id}`} onChange={() => setTarget(`cpcb:${s.id}`)} className="mt-1" />
                <span>
                  {s.name}
                  <span className="block text-xs text-ink-3">
                    {[s.city ?? s.district, s.state].filter(Boolean).join(', ')} · not onboarded yet, so processing stays “awaiting confirmation”
                  </span>
                </span>
              </label>
            ))}
          </fieldset>
          <input className="field" placeholder="Dispatch or manifest reference" value={reference} onChange={(e) => setReference(e.target.value)} required minLength={3} />
          {send.isError && <ErrorNote>{errorText(send.error)}</ErrorNote>}
          <button type="submit" className="btn-sky" disabled={!selected.size || !target || reference.trim().length < 3 || send.isPending}>
            {send.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />} Record dispatch
          </button>
        </form>
      )}

      {(dispatches.data ?? []).length > 0 && (
        <section className="card">
          <p className="border-b border-line px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider text-ink-3">Dispatches</p>
          <ul className="divide-y divide-line">
            {dispatches.data!.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <span>
                  {d.facility.name}
                  <span className="block text-xs text-ink-3">
                    {d.items.length} item{d.items.length > 1 ? 's' : ''} · {d.totalKg} kg · ref {d.reference} · {formatDate(d.createdAt)}
                    {d.evidence ? ` · confirmed with ${d.evidence}` : ''}
                  </span>
                </span>
                <StatusBadge status={d.status} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function PartnerView() {
  const point = useQuery({ queryKey: ['partner-point'], queryFn: () => api<Point>('/partner/point') })
  const bookings = useQuery({ queryKey: ['partner-bookings'], queryFn: () => api<Booking[]>('/partner/bookings'), refetchInterval: 15000 })
  const upcoming = (bookings.data ?? []).filter((b) => b.status === 'booked').sort((a, b) => a.date.localeCompare(b.date))
  return (
    <Page>
      <PageHeader
        eyebrow="Partner portal"
        title={point.data?.name ?? 'Your drop point'}
        intro="Verify the single-use code, weigh each item and confirm. Then send received items to a registered recycler and record the manifest reference."
      >
        {point.data?.demo && <span className="chip border-ember-400 text-ember-700">Demo drop point · excluded from public impact</span>}
      </PageHeader>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          <HandoverDesk />
          <HeldAndDispatch />
        </div>
        <aside className="space-y-4">
          <Picture name="partner-weigh" alt="Staff weighing an old phone at a recycling counter" className="aspect-[3/2] w-full border border-line" />
          <div className="card">
            <p className="border-b border-line px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider text-ink-3">Upcoming drop-offs ({upcoming.length})</p>
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
          </div>
        </aside>
      </div>
    </Page>
  )
}

export default function Partner() {
  return <RequireAuth partner>{() => <PartnerView />}</RequireAuth>
}
