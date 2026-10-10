import { useQuery } from '@tanstack/react-query'
import { BadgeCheck, Factory, LocateFixed, Mail, MapPin, Navigation, Phone, RefreshCw, Search, Store } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { RecyclerMap } from '../components/RecyclerMap'
import { ErrorNote, Page, PageHeader, Spinner } from '../components/ui'
import { api, errorText } from '../lib/api'
import { useRecyclers } from '../lib/data'
import { currentPosition, directionsUrl, distanceKm, formatKm, geocodePlace, type LatLng } from '../lib/geo'
import type { Point, Recycler } from '../lib/types'

type Filter = 'all' | 'recycler' | 'refurbisher'

const precisionNote: Record<string, string> = {
  address: 'Location from street address',
  area: 'Location approximate (locality)',
  pincode: 'Location approximate (pincode centre)',
  district: 'Location approximate (district centre)',
}

function normalise(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\b(pvt|private|ltd|limited|llp|co|company|india|the)\b/g, '').replace(/\s+/g, ' ').trim()
}

function LegitCheck({ recyclers }: { recyclers: Recycler[] }) {
  const [name, setName] = useState('')
  const query = normalise(name)
  const matches = query.length >= 3 ? recyclers.filter((r) => normalise(r.name).includes(query)).slice(0, 5) : []
  return (
    <div className="card p-5">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <BadgeCheck className="size-4 text-sky-600" /> Is this recycler registered?
      </p>
      <p className="mt-1 text-xs text-ink-3">Someone offering to collect your e-waste? Check their company name against the CPCB list.</p>
      <input className="field mt-3" placeholder="Company name, e.g. Attero" value={name} onChange={(e) => setName(e.target.value)} />
      {query.length >= 3 && (
        <div className="mt-3 text-sm">
          {matches.length ? (
            <ul className="space-y-2">
              {matches.map((r) => (
                <li key={r.id} className="flex gap-2">
                  <BadgeCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                  <span>
                    <span className="font-medium">{r.name}</span>
                    <span className="block text-xs text-ink-3">
                      CPCB-registered {r.type} · {[r.city, r.state].filter(Boolean).join(', ')}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ember-700">
              Not found in the CPCB registered list. Ask them for their CPCB registration, or choose a registered site from the map.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default function Recyclers() {
  const recyclers = useRecyclers()
  const points = useQuery({ queryKey: ['points'], queryFn: () => api<Point[]>('/points') })
  const [filter, setFilter] = useState<Filter>('all')
  const [state, setState] = useState('')
  const [text, setText] = useState('')
  const [place, setPlace] = useState('')
  const [origin, setOrigin] = useState<(LatLng & { label: string }) | null>(null)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const all = recyclers.data ?? []
  const states = useMemo(() => [...new Set(all.map((r) => r.state))].sort(), [all])

  const visible = useMemo(() => {
    const q = normalise(text)
    return all.filter(
      (r) =>
        (filter === 'all' || r.type === filter) &&
        (!state || r.state === state) &&
        (!q || normalise(`${r.name} ${r.city ?? ''} ${r.district ?? ''} ${r.pincode ?? ''}`).includes(q)),
    )
  }, [all, filter, state, text])

  const ranked = useMemo(() => {
    const rows = visible.map((r) => ({ r, km: origin && r.lat !== null && r.lng !== null ? distanceKm(origin, { lat: r.lat, lng: r.lng! }) : null }))
    if (origin) rows.sort((a, b) => (a.km ?? 1e9) - (b.km ?? 1e9))
    return rows.slice(0, 60)
  }, [visible, origin])

  const partnerPoints = points.data ?? []
  const selected = all.find((r) => r.id === selectedId)
  const selectedPoint = partnerPoints.find((p) => p.id === selectedId)

  async function locate(kind: 'gps' | 'place') {
    setError('')
    setLocating(true)
    try {
      if (kind === 'gps') {
        const pos = await currentPosition()
        setOrigin({ ...pos, label: 'Your location' })
      } else {
        const found = await geocodePlace(place)
        if (!found) throw new Error('We couldn’t find that place. Try a 6-digit pincode.')
        setOrigin(found)
      }
      setState('')
    } catch (err) {
      setError(errorText(err))
    } finally {
      setLocating(false)
    }
  }

  return (
    <Page>
      <PageHeader
        eyebrow="Find a recycler"
        title="Every CPCB-registered recycler and refurbisher"
        intro={
          <>
            {all.filter((r) => r.type === 'recycler').length || '…'} recyclers and {all.filter((r) => r.type === 'refurbisher').length || '…'}{' '}
            refurbishers from the government’s E-Waste EPR portal, mapped with Amazon Location Service. Working devices? Try a refurbisher first, reuse
            beats recycling.
          </>
        }
      />

      <div className="card mb-4 grid gap-3 p-4 lg:grid-cols-[1.3fr_1fr_auto]">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (place.trim()) locate('place')
          }}
        >
          <div className="relative min-w-0 flex-1">
            <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
            <input className="field pl-9" placeholder="Pincode or area, e.g. 110042" value={place} onChange={(e) => setPlace(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary shrink-0 px-3" disabled={locating || !place.trim()}>
            Near this
          </button>
          <button type="button" className="btn-ghost px-3" onClick={() => locate('gps')} disabled={locating} title="Use my location">
            <LocateFixed className="size-4" />
            <span className="sr-only">Use my location</span>
          </button>
        </form>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
          <input className="field pl-9" placeholder="Filter by name, city or pincode" value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <select className="field min-w-0 flex-1 lg:w-auto lg:flex-none" value={state} onChange={(e) => setState(e.target.value)} aria-label="State">
            <option value="">All states</option>
            {states.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select className="field min-w-0 flex-1 lg:w-auto lg:flex-none" value={filter} onChange={(e) => setFilter(e.target.value as Filter)} aria-label="Type">
            <option value="all">All types</option>
            <option value="recycler">Recyclers</option>
            <option value="refurbisher">Refurbishers</option>
          </select>
        </div>
      </div>
      {error && (
        <div className="mb-4">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}
      {origin && <p className="mb-3 text-sm text-ink-2">Nearest to <span className="font-medium text-ink">{origin.label}</span></p>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_380px]">
        <div className="card relative h-[460px] overflow-hidden lg:h-[640px]">
          {recyclers.isLoading ? <Spinner label="Loading map" /> : <RecyclerMap recyclers={visible} points={partnerPoints} origin={origin} selectedId={selectedId} onSelect={setSelectedId} />}
          <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap gap-2 bg-white/90 px-3 py-2 text-[11px] text-ink-2">
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-sky-500" /> Recycler</span>
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-gold-400" /> Refurbisher</span>
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-ember-500" /> SafeDrop drop point</span>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {selectedPoint && (
            <div className="card border-ember-400 p-5">
              <p className="eyebrow text-ember-700">SafeDrop drop point{selectedPoint.demo ? ' · demo' : ''}</p>
              <h2 className="mt-2 text-lg font-semibold">{selectedPoint.name}</h2>
              <p className="mt-1 text-sm text-ink-2">{selectedPoint.address}</p>
              <p className="mt-1 text-xs text-ink-3">{selectedPoint.hours}</p>
              {selectedPoint.note && <p className="mt-2 text-xs text-ink-3">{selectedPoint.note}</p>}
              <div className="mt-4 flex gap-2">
                <Link to={`/book?point=${selectedPoint.id}`} className="btn-gold flex-1">
                  Book drop-off
                </Link>
                <a href={directionsUrl(selectedPoint)} target="_blank" rel="noreferrer" className="btn-ghost">
                  <Navigation className="size-4" />
                </a>
              </div>
            </div>
          )}
          {selected && <RecyclerCard recycler={selected} km={origin && selected.lat !== null ? distanceKm(origin, { lat: selected.lat, lng: selected.lng! }) : null} />}
          <div className="card flex max-h-[420px] flex-col overflow-hidden">
            <div className="border-b border-line px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider text-ink-3">
              {visible.length} sites{ranked.length < visible.length ? ` · showing ${ranked.length}` : ''}
            </div>
            <ul className="divide-y divide-line overflow-y-auto">
              {partnerPoints.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => setSelectedId(p.id)} className={`flex w-full gap-3 px-4 py-3 text-left hover:bg-paper ${selectedId === p.id ? 'bg-ember-50' : ''}`}>
                    <Store className="mt-0.5 size-4 shrink-0 text-ember-500" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{p.name}</span>
                      <span className="block text-xs text-ink-3">Book a drop-off · {origin ? formatKm(distanceKm(origin, p)) : p.hours}</span>
                    </span>
                  </button>
                </li>
              ))}
              {ranked.map(({ r, km }) => (
                <li key={r.id}>
                  <button type="button" onClick={() => setSelectedId(r.id)} className={`flex w-full gap-3 px-4 py-3 text-left hover:bg-paper ${selectedId === r.id ? 'bg-sky-50' : ''}`}>
                    {r.type === 'refurbisher' ? <RefreshCw className="mt-0.5 size-4 shrink-0 text-gold-500" /> : <Factory className="mt-0.5 size-4 shrink-0 text-sky-500" />}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{r.name}</span>
                      <span className="block truncate text-xs text-ink-3">{[r.city ?? r.district, r.state].filter(Boolean).join(', ')}</span>
                    </span>
                    {km !== null && <span className="shrink-0 font-mono text-xs text-ink-2">{formatKm(km)}</span>}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <LegitCheck recyclers={all} />
        </div>
      </div>
      <p className="mt-4 text-xs text-ink-3">
        Source: CPCB E-Waste EPR portal, registration-granted lists for recyclers and refurbishers, downloaded 10 Oct 2026. Addresses geocoded with Amazon
        Location Service; some pins sit at the pincode or district centre. Always call ahead before visiting.
      </p>
    </Page>
  )
}

function RecyclerCard({ recycler: r, km }: { recycler: Recycler; km: number | null }) {
  return (
    <div className="card p-5">
      <p className="eyebrow">{r.type === 'refurbisher' ? 'CPCB-registered refurbisher' : 'CPCB-registered recycler'}</p>
      <h2 className="mt-2 text-lg font-semibold leading-snug">{r.name}</h2>
      <p className="mt-1 text-sm text-ink-2">{r.address}</p>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-3">
        {km !== null && <span>{formatKm(km)} away</span>}
        {r.capacityTpa !== null && <span>Capacity {r.capacityTpa.toLocaleString('en-IN')} t/yr</span>}
        {r.precision && <span>{precisionNote[r.precision]}</span>}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {r.phone && (
          <a href={`tel:${r.phone}`} className="btn-ghost">
            <Phone className="size-4" /> Call
          </a>
        )}
        {r.email && (
          <a href={`mailto:${r.email}`} className="btn-ghost">
            <Mail className="size-4" /> Email
          </a>
        )}
        {r.lat !== null && (
          <a href={directionsUrl({ lat: r.lat, lng: r.lng! })} target="_blank" rel="noreferrer" className="btn-ghost">
            <Navigation className="size-4" /> Directions
          </a>
        )}
      </div>
      <p className="mt-3 text-xs text-ink-3">Not on SafeDrop yet: call ahead to arrange a drop-off. Bookings and certificates work at SafeDrop drop points.</p>
    </div>
  )
}
