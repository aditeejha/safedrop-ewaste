import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Clock, Loader2, MapPin, Phone, ShieldCheck, Truck, Users } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { ErrorNote, Page, PageHeader, Picture, Spinner, StatusBadge } from '../components/ui'
import { api, ApiError, errorText } from '../lib/api'
import { useSession } from '../lib/auth'
import { formatDate, kindLabels } from '../lib/data'
import type { Collector, PickupRequest } from '../lib/types'

const benefits = [
  { icon: Truck, title: 'Steady pickups', text: 'Requests from homes in the pincodes you already work, with the address shared once you accept.' },
  { icon: ShieldCheck, title: 'A verified profile', text: 'Customers see your name and number, and every handover is recorded against your profile.' },
  { icon: Users, title: 'A registered buyer', text: 'Deliver to a SafeDrop drop point that hands everything to CPCB-registered recyclers, with no burning or acid baths.' },
]

function JoinForm({ existing }: { existing?: Collector }) {
  const client = useQueryClient()
  const [name, setName] = useState(existing?.name ?? '')
  const [phone, setPhone] = useState(existing?.phone ?? '')
  const [area, setArea] = useState(existing?.area ?? '')
  const [pincodes, setPincodes] = useState((existing?.requestedPincodes ?? existing?.pincodes ?? []).join(', '))
  const join = useMutation({
    mutationFn: () => api<Collector>('/me/collector', { method: 'POST', json: { name, phone, area, pincodes } }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['collector'] }),
  })
  return (
    <form
      className="card space-y-4 p-6"
      onSubmit={(e) => {
        e.preventDefault()
        join.mutate()
      }}
    >
      <p className="text-lg font-semibold">Join as a pickup partner</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="c-name">Name</label>
          <input id="c-name" className="field" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="c-phone">Mobile number</label>
          <input id="c-phone" className="field" required inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="c-area">Area you work in</label>
        <input id="c-area" className="field" placeholder="e.g. Rohini Sector 7–11, Delhi" value={area} onChange={(e) => setArea(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="c-pins">Pincodes you collect from</label>
        <input id="c-pins" className="field" required placeholder="110085, 110086" value={pincodes} onChange={(e) => setPincodes(e.target.value)} />
        <p className="mt-1 text-xs text-ink-3">Up to 10 pincodes, separated by commas.</p>
      </div>
      {join.isError && <ErrorNote>{errorText(join.error)}</ErrorNote>}
      <button type="submit" className="btn-gold w-full py-3" disabled={join.isPending}>
        {join.isPending && <Loader2 className="size-4 animate-spin" />} {existing ? 'Update details' : 'Send for verification'}
      </button>
    </form>
  )
}

function CollectCodeForm({ pickup }: { pickup: PickupRequest }) {
  const client = useQueryClient()
  const [code, setCode] = useState('')
  const collect = useMutation({
    mutationFn: () => api(`/me/collector/pickups/${pickup.id}/collect`, { method: 'POST', json: { code } }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['collector-pickups'] }),
  })
  return (
    <form
      className="mt-3 flex flex-wrap gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        collect.mutate()
      }}
    >
      <input
        className="field w-40 font-mono uppercase tracking-[0.25em]"
        placeholder="CODE"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        aria-label="Customer handover code"
      />
      <button type="submit" className="btn-primary" disabled={code.length !== 6 || collect.isPending}>
        {collect.isPending && <Loader2 className="size-4 animate-spin" />} Confirm collected
      </button>
      {collect.isError && <div className="w-full"><ErrorNote>{errorText(collect.error)}</ErrorNote></div>}
    </form>
  )
}

function Dashboard({ profile }: { profile: Collector }) {
  const client = useQueryClient()
  const requests = useQuery({ queryKey: ['collector-requests'], queryFn: () => api<PickupRequest[]>('/me/collector/requests'), refetchInterval: 15000 })
  const pickups = useQuery({ queryKey: ['collector-pickups'], queryFn: () => api<PickupRequest[]>('/me/collector/pickups'), refetchInterval: 15000 })
  const accept = useMutation({
    mutationFn: (id: string) => api(`/me/collector/pickups/${id}/accept`, { method: 'POST' }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['collector-requests'] }).then(() => client.invalidateQueries({ queryKey: ['collector-pickups'] })),
  })
  const active = (pickups.data ?? []).filter((p) => p.status !== 'received' && p.status !== 'cancelled')
  const done = (pickups.data ?? []).filter((p) => p.status === 'received')

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_340px]">
      <div className="space-y-8">
        <section>
          <h2 className="mb-3 text-sm font-semibold">My pickups</h2>
          {active.length === 0 ? (
            <p className="card p-5 text-sm text-ink-3">No active pickups. Accept a request below.</p>
          ) : (
            <div className="space-y-3">
              {active.map((p) => (
                <div key={p.id} className="card p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{p.userName}</p>
                    <StatusBadge status={p.status} />
                  </div>
                  <p className="mt-1 flex items-start gap-1.5 text-sm text-ink-2">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-ink-3" /> {p.address} · {p.pincode}
                  </p>
                  <p className="mt-1 text-xs text-ink-3">
                    {formatDate(p.date)} · {p.devices.map((d) => d.label).join(', ')} · deliver to {p.pointName}
                  </p>
                  {p.status === 'accepted' && (
                    <>
                      {p.phone && (
                        <a href={`tel:${p.phone}`} className="btn-ghost mt-3">
                          <Phone className="size-4" /> Call customer
                        </a>
                      )}
                      <CollectCodeForm pickup={p} />
                    </>
                  )}
                  {p.status === 'collected' && (
                    <p className="mt-3 text-sm text-sky-700">Collected. Take the items to {p.pointName}; staff there confirm the handover.</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold">Open requests in your pincodes</h2>
          {requests.isLoading ? (
            <Spinner />
          ) : (requests.data ?? []).length === 0 ? (
            <p className="card p-5 text-sm text-ink-3">No open requests right now in {profile.pincodes.join(', ')}.</p>
          ) : (
            <div className="card divide-y divide-line">
              {requests.data!.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center gap-4 px-4 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {r.area || 'Pickup'} · {r.pincode}
                    </p>
                    <p className="text-xs text-ink-3">
                      {formatDate(r.date)} · {r.devices.map((d) => kindLabels[d.kind]).join(', ')}
                    </p>
                  </div>
                  <button type="button" className="btn-gold" disabled={accept.isPending} onClick={() => accept.mutate(r.id)}>
                    Accept
                  </button>
                </div>
              ))}
            </div>
          )}
          {accept.isError && <div className="mt-2"><ErrorNote>{errorText(accept.error)}</ErrorNote></div>}
        </section>
      </div>
      <aside className="space-y-4">
        <div className="card p-5">
          <p className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="size-4 text-emerald-600" /> {profile.name}
          </p>
          <p className="mt-1 text-sm text-ink-2">{profile.area}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {profile.pincodes.map((p) => (
              <span key={p} className="chip font-mono">{p}</span>
            ))}
          </div>
          <p className="mt-4 text-sm text-ink-2">{done.length} pickup{done.length === 1 ? '' : 's'} delivered and certified.</p>
        </div>
        <Picture name="step-dropoff" alt="Handing over a box of old devices at a counter" className="aspect-[3/2] w-full border border-line" />
      </aside>
    </div>
  )
}

export default function Collect() {
  const session = useSession()
  const profile = useQuery({
    queryKey: ['collector'],
    queryFn: async () => {
      try {
        return await api<Collector>('/me/collector')
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) return null
        throw err
      }
    },
    enabled: Boolean(session.data),
  })

  return (
    <Page>
      <PageHeader
        eyebrow="Kabadiwala partners"
        title="Informal collectors, welcome in"
        intro="Kabadiwalas already move much of a city’s scrap. SafeDrop gives them verified doorstep pickups of wiped devices and a safe, registered place to hand them over."
      />
      {!session.data && !session.isLoading && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            {benefits.map(({ icon: Icon, title, text }) => (
              <div key={title} className="card p-5">
                <Icon className="size-5 text-gold-500" />
                <p className="mt-3 font-semibold">{title}</p>
                <p className="mt-1 text-sm text-ink-2">{text}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/signup?next=/collect" className="btn-gold">Join as a pickup partner</Link>
            <Link to="/signin?next=/collect" className="btn-ghost">I already have an account</Link>
          </div>
        </>
      )}
      {session.data && profile.isLoading && <Spinner />}
      {session.data && profile.isError && <ErrorNote>{errorText(profile.error)}</ErrorNote>}
      {session.data && profile.data === null && (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px]">
          <JoinForm />
          <div className="space-y-3">
            {benefits.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex gap-3">
                <Icon className="mt-0.5 size-5 shrink-0 text-gold-500" />
                <p className="text-sm text-ink-2">
                  <span className="font-medium text-ink">{title}.</span> {text}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
      {profile.data?.status === 'pending' && (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px]">
          <div className="card p-6">
            <p className="flex items-center gap-2 text-lg font-semibold">
              <Clock className="size-5 text-gold-500" /> Under review
            </p>
            <p className="mt-2 text-sm text-ink-2">
              SafeDrop calls every new partner to verify them before pickups are shown. You’ll see requests here once you’re approved.
            </p>
          </div>
          <JoinForm existing={profile.data} />
        </div>
      )}
      {profile.data?.status === 'approved' && <Dashboard profile={profile.data} />}
    </Page>
  )
}
