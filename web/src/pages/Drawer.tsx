import { useQuery } from '@tanstack/react-query'
import { Award, CalendarCheck, ChevronRight, Plus } from 'lucide-react'
import { Link } from 'react-router'
import { RequireAuth } from '../components/RequireAuth'
import { Page, PageHeader, Spinner, Stat, StatusBadge } from '../components/ui'
import { api } from '../lib/api'
import type { Session } from '../lib/auth'
import { formatDate, formatKg, formatKwh, kindLabels } from '../lib/data'
import type { Booking, Certificate, Device } from '../lib/types'

function DrawerView({ session }: { session: Session }) {
  const devices = useQuery({ queryKey: ['devices'], queryFn: () => api<Device[]>('/me/devices') })
  const bookings = useQuery({ queryKey: ['bookings'], queryFn: () => api<Booking[]>('/me/bookings') })
  const certificates = useQuery({ queryKey: ['certificates'], queryFn: () => api<Certificate[]>('/me/certificates') })

  const list = devices.data ?? []
  const ready = list.filter((d) => d.status === 'ready')
  const certs = certificates.data ?? []
  const totals = certs.reduce(
    (t, c) => ({ devices: t.devices + c.totals.devices, kg: t.kg + c.totals.kg, co2e: t.co2e + c.totals.co2eKg, kwh: t.kwh + (c.totals.energyKwh ?? 0) }),
    { devices: 0, kg: 0, co2e: 0, kwh: 0 },
  )
  const upcoming = (bookings.data ?? []).filter((b) => ['booked', 'accepted', 'collected'].includes(b.status) && Date.now() <= Date.parse(b.expiresAt))

  return (
    <Page>
      <PageHeader eyebrow="My drawer" title={`Hi ${session.name.split(' ')[0]}`} intro="Everything you are clearing out, from wipe to certificate.">
        <div className="flex flex-wrap gap-2">
          {ready.length > 0 && (
            <Link to={`/book?devices=${ready.map((d) => d.id).join(',')}`} className="btn-sky">
              <CalendarCheck className="size-4" /> Book drop-off ({ready.length})
            </Link>
          )}
          <Link to="/drawer/add" className="btn-gold">
            <Plus className="size-4" /> Add device
          </Link>
        </div>
      </PageHeader>

      {certs.length > 0 && (
        <div className="card mb-8 grid grid-cols-2 gap-6 p-6 md:grid-cols-4">
          <Stat value={String(totals.devices)} label="Devices handed over" />
          <Stat value={formatKg(totals.kg)} label="Weighed at drop points" hint="measured" />
          <Stat value={`${totals.co2e.toLocaleString('en-IN', { maximumFractionDigits: 1 })} kg`} label="CO₂e avoided if recycled" hint="estimate" />
          <Stat value={formatKwh(totals.kwh)} label="Energy saved if recycled" hint="estimate" />
        </div>
      )}

      {upcoming.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold">Upcoming drop-offs</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {upcoming.map((b) => (
              <Link key={b.id} to={`/bookings/${b.id}`} className="card flex items-center gap-4 border-sky-300 p-4 hover:border-sky-500">
                <div className="bg-sky-50 px-3 py-2 text-center">
                  <div className="font-mono text-lg font-semibold tracking-widest text-sky-700">{b.code}</div>
                  <div className="font-mono text-[10px] uppercase text-ink-3">Handover code</div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{b.pointName}</p>
                  <p className="text-xs text-ink-3">
                    {b.mode === 'pickup' ? 'Pickup' : 'Drop-off'} · {formatDate(b.date)} · {b.devices.length} item{b.devices.length > 1 ? 's' : ''}
                  </p>
                </div>
                <StatusBadge status={b.status} />
                <ChevronRight className="size-4 text-ink-3" />
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold">Devices</h2>
        {devices.isLoading ? (
          <Spinner />
        ) : list.length === 0 ? (
          <div className="card flex flex-col items-center gap-3 p-10 text-center">
            <p className="text-ink-2">Your drawer is empty here. Add the first old device you want to let go of.</p>
            <Link to="/drawer/add" className="btn-gold">
              <Plus className="size-4" /> Add a device
            </Link>
          </div>
        ) : (
          <div className="card divide-y divide-line">
            {list.map((d) => {
              const done = Object.keys(d.wipe?.steps ?? {}).length
              return (
                <Link key={d.id} to={`/drawer/${d.id}`} className="flex items-center gap-4 px-4 py-3.5 hover:bg-paper">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium">{d.label}</p>
                    <p className="text-xs text-ink-3">
                      {kindLabels[d.kind]}
                      {(d.status === 'added' || d.status === 'wiping') && d.holdsData ? ` · ${done} steps answered` : ''}
                      {d.recommendation.route === 'battery-hazard' ? ' · battery hazard' : d.recommendation.route === 'reuse' ? ' · reuse first' : ''}
                    </p>
                  </div>
                  <StatusBadge status={d.status} />
                  <ChevronRight className="size-4 text-ink-3" />
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {certs.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold">Certificates</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {certs.map((c) => (
              <Link key={c.id} to={`/certificate/${c.id}`} className="card flex items-center gap-4 p-4 hover:border-gold-400">
                <Award className="size-8 text-gold-500" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.pointName}</p>
                  <p className="text-xs text-ink-3">
                    {formatDate(c.issuedAt)} · {c.totals.devices} item{c.totals.devices > 1 ? 's' : ''} · {formatKg(c.totals.kg)}
                  </p>
                </div>
                <ChevronRight className="size-4 text-ink-3" />
              </Link>
            ))}
          </div>
        </section>
      )}
    </Page>
  )
}

export default function Drawer() {
  return <RequireAuth>{(session) => <DrawerView session={session} />}</RequireAuth>
}
