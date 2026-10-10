import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Loader2, MapPin, Store, Truck } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { RequireAuth } from '../components/RequireAuth'
import { ErrorNote, Page, PageHeader, Picture, Spinner } from '../components/ui'
import { api, errorText } from '../lib/api'
import { kindLabels } from '../lib/data'
import type { Booking, Device, Point } from '../lib/types'

function isoDate(offsetDays: number) {
  const d = new Date(Date.now() + 5.5 * 3600_000)
  d.setUTCDate(d.getUTCDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

function BookForm() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const client = useQueryClient()
  const points = useQuery({ queryKey: ['points'], queryFn: () => api<Point[]>('/points') })
  const devices = useQuery({ queryKey: ['devices'], queryFn: () => api<Device[]>('/me/devices') })
  const [pointId, setPointId] = useState(params.get('point') ?? '')
  const [date, setDate] = useState(isoDate(1))
  const [selected, setSelected] = useState<Set<string>>(() => new Set((params.get('devices') ?? '').split(',').filter(Boolean)))
  const [mode, setMode] = useState<'dropoff' | 'pickup'>(params.get('mode') === 'pickup' ? 'pickup' : 'dropoff')
  const [address, setAddress] = useState('')
  const [pincode, setPincode] = useState('')
  const [phone, setPhone] = useState('')
  const coverage = useQuery({
    queryKey: ['coverage', pincode],
    queryFn: () => api<{ partners: number }>(`/coverage/${pincode}`),
    enabled: mode === 'pickup' && /^[1-9]\d{5}$/.test(pincode),
  })

  const ready = (devices.data ?? []).filter((d) => d.status === 'ready')
  const point = points.data?.find((p) => p.id === pointId) ?? (points.data?.length === 1 ? points.data[0] : undefined)

  const book = useMutation({
    mutationFn: () =>
      api<Booking>('/me/bookings', {
        method: 'POST',
        json: { pointId: point?.id, date, deviceIds: [...selected], mode, pickup: mode === 'pickup' ? { address, pincode, phone } : undefined },
      }),
    onSuccess: (booking) => {
      client.invalidateQueries()
      navigate(`/bookings/${booking.id}`)
    },
  })

  if (points.isLoading || devices.isLoading) return <Page><Spinner /></Page>

  return (
    <Page>
      <PageHeader
        eyebrow="Book a handover"
        title="Drop it off, or have a kabadiwala partner pick it up"
        intro="Either way you get a 6-character handover code, and the certificate is issued when the devices reach the drop point."
      />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px]">
        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault()
            book.mutate()
          }}
        >
          <section className="card p-5">
            <h2 className="text-sm font-semibold">How should the devices travel?</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {(
                [
                  ['dropoff', Store, 'I’ll drop them off', 'Carry them to a SafeDrop drop point.'],
                  ['pickup', Truck, 'Pickup by a kabadiwala partner', 'A verified local collector picks up from your door.'],
                ] as const
              ).map(([value, Icon, title, text]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value)}
                  className={`flex gap-3 border p-3 text-left ${mode === value ? 'border-ink bg-paper' : 'border-line hover:border-ink-3'}`}
                >
                  <Icon className={`mt-0.5 size-5 shrink-0 ${value === 'pickup' ? 'text-gold-500' : 'text-ember-500'}`} />
                  <span>
                    <span className="block text-sm font-medium">{title}</span>
                    <span className="block text-xs text-ink-3">{text}</span>
                  </span>
                </button>
              ))}
            </div>
            {mode === 'pickup' && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="label" htmlFor="address">Pickup address</label>
                  <input id="address" className="field" required minLength={8} maxLength={200} placeholder="House, street, area, city" value={address} onChange={(e) => setAddress(e.target.value)} />
                </div>
                <div>
                  <label className="label" htmlFor="pincode">Pincode</label>
                  <input id="pincode" className="field" required inputMode="numeric" maxLength={6} value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))} />
                  {coverage.data && (
                    <p className={`mt-1 text-xs ${coverage.data.partners ? 'text-emerald-700' : 'text-gold-700'}`}>
                      {coverage.data.partners
                        ? `${coverage.data.partners} pickup partner${coverage.data.partners > 1 ? 's' : ''} cover this pincode`
                        : 'No pickup partner covers this pincode yet. Your request stays open until one joins.'}
                    </p>
                  )}
                </div>
                <div>
                  <label className="label" htmlFor="phone">Mobile number</label>
                  <input id="phone" className="field" required inputMode="tel" maxLength={14} placeholder="98xxxxxxxx" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  <p className="mt-1 text-xs text-ink-3">Shared only with the partner who accepts your pickup.</p>
                </div>
              </div>
            )}
          </section>

          <section className="card p-5">
            <h2 className="text-sm font-semibold">1. {mode === 'pickup' ? 'Drop point the partner delivers to' : 'Drop point'}</h2>
            <div className="mt-3 space-y-2">
              {(points.data ?? []).map((p) => (
                <label key={p.id} className={`flex cursor-pointer gap-3 border p-3 ${point?.id === p.id ? 'border-ink bg-paper' : 'border-line'}`}>
                  <input type="radio" name="point" className="mt-1" checked={point?.id === p.id} onChange={() => setPointId(p.id)} />
                  <span>
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <MapPin className="size-4 text-ember-500" /> {p.name}
                    </span>
                    <span className="mt-0.5 block text-xs text-ink-3">{p.address}</span>
                    <span className="block text-xs text-ink-3">{p.hours}</span>
                  </span>
                </label>
              ))}
            </div>
            <p className="mt-3 text-xs text-ink-3">
              Only SafeDrop partner points can confirm handovers and issue certificates. Other <Link to="/recyclers" className="link">registered recyclers</Link> can be
              visited directly.
            </p>
          </section>

          <section className="card p-5">
            <h2 className="text-sm font-semibold">2. {mode === 'pickup' ? 'Pickup day' : 'Day'}</h2>
            <input type="date" className="field mt-3 max-w-xs" min={isoDate(0)} max={isoDate(14)} value={date} required onChange={(e) => setDate(e.target.value)} />
          </section>

          <section className="card p-5">
            <h2 className="text-sm font-semibold">3. Devices</h2>
            {ready.length === 0 ? (
              <p className="mt-3 text-sm text-ink-2">
                No devices are ready yet. Finish wiping one in <Link to="/drawer" className="link">your drawer</Link> first.
              </p>
            ) : (
              <div className="mt-3 space-y-1.5">
                {ready.map((d) => {
                  const on = selected.has(d.id)
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => {
                        const next = new Set(selected)
                        if (on) next.delete(d.id)
                        else next.add(d.id)
                        setSelected(next)
                      }}
                      className={`flex w-full items-center gap-3 border px-3 py-2.5 text-left ${on ? 'border-sky-500 bg-sky-50' : 'border-line hover:border-ink-3'}`}
                    >
                      <span className={`flex size-5 items-center justify-center border ${on ? 'border-sky-500 bg-sky-500 text-white' : 'border-line-2'}`}>
                        {on && <Check className="size-3.5" strokeWidth={3} />}
                      </span>
                      <span className="flex-1 text-sm">{d.label}</span>
                      <span className="text-xs text-ink-3">{kindLabels[d.kind]}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </section>

          {book.isError && <ErrorNote>{errorText(book.error)}</ErrorNote>}
          <button type="submit" className="btn-gold w-full py-3" disabled={book.isPending || !point || selected.size === 0}>
            {book.isPending && <Loader2 className="size-4 animate-spin" />} {mode === 'pickup' ? 'Request pickup' : 'Confirm booking'}
          </button>
        </form>
        <aside className="space-y-4">
          <Picture name="step-dropoff" alt="Handing a box of old phones to a recycling counter" className="aspect-[3/2] w-full border border-line" />
          <div className="card p-4 text-sm text-ink-2">
            <p className="font-semibold text-ink">What to bring</p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>The wiped devices, with SIM and memory cards removed</li>
              <li>Chargers and cables, if you want them recycled too</li>
              <li>Swollen batteries taped and bagged separately</li>
              <li>Your handover code (on your phone is fine)</li>
            </ul>
          </div>
        </aside>
      </div>
    </Page>
  )
}

export default function Book() {
  return <RequireAuth>{() => <BookForm />}</RequireAuth>
}
