import { useQuery } from '@tanstack/react-query'
import { BadgeCheck, CircleHelp, Factory, LocateFixed, Mail, MapPin, Navigation, Phone, RefreshCw, Search, Store } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { RecyclerMap } from '../components/RecyclerMap'
import { ErrorNote, Page, PageHeader, Spinner } from '../components/ui'
import { api, errorText } from '../lib/api'
import { formatDate, kindLabels, useSites } from '../lib/data'
import { currentPosition, directionsUrl, distanceKm, formatKm, geocodePlace, type LatLng } from '../lib/geo'
import { matchName, normaliseName } from '../lib/match'
import { directoryStates } from '../lib/status'
import type { DeviceKind, Point, Site } from '../lib/types'

type Filter = 'all' | 'recycler' | 'refurbisher'
const radii = [0, 10, 25, 50, 100]

const levelText = { exact: 'Exact name match', strong: 'Strong name match', partial: 'Partial name match: check carefully' }

function LegitCheck({ sites, checkedAt }: { sites: Site[]; checkedAt: string }) {
  const [name, setName] = useState('')
  const matches = matchName(name, sites)
  const companies = new Set(matches.filter((m) => m.level !== 'partial').map((m) => normaliseName(m.site.name)))
  return (
    <div className="card p-5">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <BadgeCheck className="size-4 text-sky-600" aria-hidden="true" /> Is this recycler registered?
      </p>
      <p className="mt-1 text-xs text-ink-3">Compares a company name with the CPCB registration list checked on {formatDate(checkedAt)}.</p>
      <input className="field mt-3" placeholder="Company name, e.g. Attero" value={name} onChange={(e) => setName(e.target.value)} aria-label="Company name to check" />
      {normaliseName(name).length >= 3 && (
        <div className="mt-3 text-sm" aria-live="polite">
          {matches.length ? (
            <>
              {companies.size > 1 && <p className="mb-2 text-xs text-gold-700">Several companies match. Compare the address before you trust any of them.</p>}
              <ul className="space-y-2">
                {matches.map((m) => (
                  <li key={m.site.id} className="flex gap-2">
                    {m.level === 'partial' ? (
                      <CircleHelp className="mt-0.5 size-4 shrink-0 text-gold-500" aria-hidden="true" />
                    ) : (
                      <BadgeCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden="true" />
                    )}
                    <span>
                      <span className="font-medium">{m.site.name}</span>
                      <span className="block text-xs text-ink-3">
                        {levelText[m.level]} ({Math.round(m.score * 100)}%) · listed {m.site.type} · {[m.site.city ?? m.site.district, m.site.state].filter(Boolean).join(', ')}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-ink-3">
                A name match only means a similar name is on the official list. It doesn’t prove the person you’re talking to represents that company: ask for their CPCB
                registration certificate and check the address.
              </p>
            </>
          ) : (
            <p className="text-ember-700">No match in the CPCB list. Ask for their registration, or choose a listed site from the map.</p>
          )}
        </div>
      )}
    </div>
  )
}

export default function Recyclers() {
  const [params] = useSearchParams()
  const sites = useSites()
  const points = useQuery({ queryKey: ['points'], queryFn: () => api<Point[]>('/points') })
  const [filter, setFilter] = useState<Filter>((params.get('type') as Filter) || 'all')
  const [state, setState] = useState('')
  const [text, setText] = useState('')
  const [place, setPlace] = useState('')
  const [radius, setRadius] = useState(0)
  const [accepts, setAccepts] = useState<DeviceKind | ''>('')
  const [origin, setOrigin] = useState<(LatLng & { label: string }) | null>(null)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const all = sites.data?.sites ?? []
  const states = useMemo(() => [...new Set(all.map((r) => r.state))].sort(), [all])
  const partnerPoints = (points.data ?? []).filter((p) => !accepts || p.accepts.kinds.includes(accepts))

  const visible = useMemo(() => {
    if (accepts) return []
    const q = normaliseName(text)
    return all.filter(
      (r) =>
        (filter === 'all' || r.type === filter) &&
        (!state || r.state === state) &&
        (!q || normaliseName(`${r.name} ${r.city ?? ''} ${r.district ?? ''} ${r.pincode ?? ''}`).includes(q)) &&
        (!radius || !origin || (r.lat !== null && r.lng !== null && distanceKm(origin, { lat: r.lat, lng: r.lng }) <= radius)),
    )
  }, [all, filter, state, text, radius, origin, accepts])

  const ranked = useMemo(() => {
    const rows = visible.map((r) => ({ r, km: origin && r.lat !== null && r.lng !== null ? distanceKm(origin, { lat: r.lat, lng: r.lng }) : null }))
    if (origin) rows.sort((a, b) => (a.km ?? 1e9) - (b.km ?? 1e9))
    return rows.slice(0, 60)
  }, [visible, origin])

  const selected = all.find((r) => r.id === selectedId)
  const selectedPoint = (points.data ?? []).find((p) => p.id === selectedId)

  async function locate(kind: 'gps' | 'place') {
    setError('')
    setLocating(true)
    try {
      if (kind === 'gps') setOrigin({ ...(await currentPosition()), label: 'Your location' })
      else {
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
        title="Registered recyclers and refurbishers"
        intro={
          <>
            {all.filter((r) => r.type === 'recycler').length || '…'} recyclers and {all.filter((r) => r.type === 'refurbisher').length || '…'} refurbishers from CPCB’s
            registration list (checked {sites.data ? formatDate(sites.data.source.checkedAt) : '…'}), after removing test and disabled entries and merging repeat
            registrations. Being listed means registered with CPCB, not that a site works with SafeDrop.
          </>
        }
      />

      <div className="card mb-4 grid grid-cols-1 gap-3 p-4 lg:grid-cols-[1.3fr_1fr_auto]">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (place.trim()) locate('place')
          }}
        >
          <div className="relative min-w-0 flex-1">
            <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" aria-hidden="true" />
            <input className="field pl-9" placeholder="Pincode or area, e.g. 110042" value={place} onChange={(e) => setPlace(e.target.value)} aria-label="Pincode or area" />
          </div>
          <button type="submit" className="btn-primary shrink-0 px-3" disabled={locating || !place.trim()}>
            Near this
          </button>
          <button type="button" className="btn-ghost px-3" onClick={() => locate('gps')} disabled={locating} title="Use my location">
            <LocateFixed className="size-4" aria-hidden="true" />
            <span className="sr-only">Use my location</span>
          </button>
        </form>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" aria-hidden="true" />
          <input className="field pl-9" placeholder="Filter by name, city or pincode" value={text} onChange={(e) => setText(e.target.value)} aria-label="Filter sites" />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <select className="field min-w-0 lg:w-auto" value={state} onChange={(e) => setState(e.target.value)} aria-label="State">
            <option value="">All states</option>
            {states.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select className="field min-w-0 lg:w-auto" value={filter} onChange={(e) => setFilter(e.target.value as Filter)} aria-label="Type">
            <option value="all">All types</option>
            <option value="recycler">Recyclers</option>
            <option value="refurbisher">Refurbishers</option>
          </select>
          <select className="field min-w-0 lg:w-auto" value={radius} onChange={(e) => setRadius(Number(e.target.value))} aria-label="Distance" disabled={!origin}>
            {radii.map((r) => (
              <option key={r} value={r}>
                {r ? `Within ${r} km` : 'Any distance'}
              </option>
            ))}
          </select>
          <select className="field min-w-0 lg:w-auto" value={accepts} onChange={(e) => setAccepts(e.target.value as DeviceKind | '')} aria-label="Confirmed to accept">
            <option value="">Any item</option>
            {(Object.keys(kindLabels) as DeviceKind[]).map((k) => (
              <option key={k} value={k}>
                Confirmed: {kindLabels[k]}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error && <div className="mb-4"><ErrorNote>{error}</ErrorNote></div>}
      {origin && <p className="mb-3 text-sm text-ink-2">Nearest to <span className="font-medium text-ink">{origin.label}</span></p>}
      {accepts && (
        <p className="mb-3 text-sm text-ink-2">
          Only SafeDrop partners publish what they accept, so this shows partner points that confirmed “{kindLabels[accepts]}”. CPCB-listed sites may also take it: call
          ahead.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_380px]">
        <div className="card relative h-[460px] overflow-hidden lg:h-[640px]">
          {sites.isLoading ? <Spinner label="Loading map" /> : <RecyclerMap recyclers={visible} points={partnerPoints} origin={origin} selectedId={selectedId} onSelect={setSelectedId} />}
          <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap gap-2 bg-white/90 px-3 py-2 text-[11px] text-ink-2">
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-sky-500" /> Recycler</span>
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-gold-400" /> Refurbisher</span>
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full border-2 border-sky-500 bg-sky-500/40" /> Approximate pin</span>
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-ember-500" /> SafeDrop partner</span>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          {selectedPoint && (
            <div className="card border-ember-400 p-5">
              <div className="flex flex-wrap gap-1.5">
                <span className="chip border-ember-400 text-ember-700">{directoryStates.partner}</span>
                <span className="chip border-emerald-600 text-emerald-700">{directoryStates.confirmed} · {formatDate(selectedPoint.confirmedAt)}</span>
                {selectedPoint.demo && <span className="chip">Demo</span>}
              </div>
              <h2 className="mt-3 text-lg font-semibold">{selectedPoint.name}</h2>
              <p className="mt-1 text-sm text-ink-2">{selectedPoint.address}</p>
              <p className="mt-1 text-xs text-ink-3">{selectedPoint.hours}</p>
              <p className="mt-2 text-xs text-ink-2">
                Accepts {selectedPoint.accepts.kinds.map((k) => kindLabels[k]).join(', ')} · {selectedPoint.accepts.services.includes('pickup') ? 'drop-off and kabadiwala pickup' : 'drop-off only'} ·{' '}
                {selectedPoint.accepts.damagedBatteries ? 'takes damaged batteries' : 'no damaged batteries'}
              </p>
              {selectedPoint.note && <p className="mt-2 text-xs text-ink-3">{selectedPoint.note}</p>}
              <div className="mt-4 flex gap-2">
                <Link to={`/book?point=${selectedPoint.id}`} className="btn-gold flex-1">
                  Book a handover
                </Link>
                <a href={directionsUrl(selectedPoint)} target="_blank" rel="noreferrer" className="btn-ghost" aria-label="Directions">
                  <Navigation className="size-4" aria-hidden="true" />
                </a>
              </div>
            </div>
          )}
          {selected && <SiteCard site={selected} km={origin && selected.lat !== null && selected.lng !== null ? distanceKm(origin, { lat: selected.lat, lng: selected.lng }) : null} />}
          <div className="card flex max-h-[420px] flex-col overflow-hidden">
            <div className="border-b border-line px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider text-ink-3">
              {partnerPoints.length + visible.length} result{partnerPoints.length + visible.length === 1 ? '' : 's'}
              {ranked.length < visible.length ? ` · showing ${ranked.length + partnerPoints.length}` : ''}
            </div>
            <ul className="divide-y divide-line overflow-y-auto">
              {partnerPoints.length + visible.length === 0 && (
                <li className="px-4 py-6 text-sm text-ink-3">No site matches these filters. Widen the distance or clear a filter.</li>
              )}
              {partnerPoints.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => setSelectedId(p.id)} className={`flex w-full gap-3 px-4 py-3 text-left hover:bg-paper ${selectedId === p.id ? 'bg-ember-50' : ''}`}>
                    <Store className="mt-0.5 size-4 shrink-0 text-ember-500" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{p.name}</span>
                      <span className="block text-xs text-ink-3">SafeDrop partner · {origin ? formatKm(distanceKm(origin, p)) : p.hours}</span>
                    </span>
                  </button>
                </li>
              ))}
              {ranked.map(({ r, km }) => (
                <li key={r.id}>
                  <button type="button" onClick={() => setSelectedId(r.id)} className={`flex w-full gap-3 px-4 py-3 text-left hover:bg-paper ${selectedId === r.id ? 'bg-sky-50' : ''}`}>
                    {r.type === 'refurbisher' ? <RefreshCw className="mt-0.5 size-4 shrink-0 text-gold-500" aria-hidden="true" /> : <Factory className="mt-0.5 size-4 shrink-0 text-sky-500" aria-hidden="true" />}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{r.name}</span>
                      <span className="block truncate text-xs text-ink-3">
                        {[r.city ?? r.district, r.state].filter(Boolean).join(', ')}
                        {r.location?.approximate ? ' · approximate pin' : ''}
                      </span>
                    </span>
                    {km !== null && <span className="shrink-0 font-mono text-xs text-ink-2">{formatKm(km)}</span>}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <LegitCheck sites={all} checkedAt={sites.data?.source.checkedAt ?? ''} />
        </div>
      </div>
      <p className="mt-4 text-xs text-ink-3">
        Source: {sites.data?.source.name}, checked {sites.data ? formatDate(sites.data.source.checkedAt) : '…'}. Addresses geocoded with Amazon Location Service; pins at a
        pincode or district centre are shown faded and labelled approximate. The audit of removed and merged rows is in the project’s research folder. Always call ahead.
      </p>
    </Page>
  )
}

function SiteCard({ site, km }: { site: Site; km: number | null }) {
  return (
    <div className="card p-5">
      <div className="flex flex-wrap gap-1.5">
        <span className="chip border-sky-300 text-sky-700">{directoryStates.listed}</span>
        <span className="chip">Not a SafeDrop partner yet</span>
      </div>
      <h2 className="mt-3 text-lg font-semibold leading-snug">{site.name}</h2>
      <p className="mt-1 text-sm text-ink-2">{site.address}</p>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-ink-3">
        {km !== null && (
          <>
            <dt>Distance</dt>
            <dd>{formatKm(km)}</dd>
          </>
        )}
        <dt>Location</dt>
        <dd>{site.location?.label ?? 'Not located'}</dd>
        {site.capacityTpa !== null && (
          <>
            <dt>Capacity</dt>
            <dd>{site.capacityTpa.toLocaleString('en-IN')} t/yr</dd>
          </>
        )}
        <dt>Registrations</dt>
        <dd>{site.registrations.length} (portal id {site.registrations.map((r) => r.portalId).join(', ')})</dd>
        <dt>Source</dt>
        <dd>
          <a href={site.source.url} target="_blank" rel="noreferrer" className="text-sky-700 hover:underline">
            CPCB E-Waste EPR portal
          </a>
          , checked {formatDate(site.source.checkedAt)}
        </dd>
        <dt>Accepts</dt>
        <dd>Not published; call to confirm</dd>
      </dl>
      <div className="mt-4 flex flex-wrap gap-2">
        {site.phone && (
          <a href={`tel:${site.phone}`} className="btn-ghost">
            <Phone className="size-4" aria-hidden="true" /> Call
          </a>
        )}
        {site.email && (
          <a href={`mailto:${site.email}`} className="btn-ghost">
            <Mail className="size-4" aria-hidden="true" /> Email
          </a>
        )}
        {site.lat !== null && site.lng !== null && (
          <a href={directionsUrl({ lat: site.lat, lng: site.lng })} target="_blank" rel="noreferrer" className="btn-ghost">
            <Navigation className="size-4" aria-hidden="true" /> Directions
          </a>
        )}
      </div>
    </div>
  )
}
