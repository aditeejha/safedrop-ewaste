import { useQuery } from '@tanstack/react-query'
import { BadgeCheck, CircleCheck, CircleX, Printer, Share2 } from 'lucide-react'
import { useState } from 'react'
import { useParams } from 'react-router'
import { LogoMark } from '../components/Logo'
import { Qr } from '../components/Qr'
import { TrailTimeline } from '../components/Trail'
import { ErrorNote, Page, Spinner, StatusBadge } from '../components/ui'
import { WipeRecordCard } from '../components/WipeRecord'
import { api, errorText } from '../lib/api'
import { formatDate, formatKg, formatKwh, kindLabels, ledHours, useGuides } from '../lib/data'
import type { Certificate } from '../lib/types'

const metalNames: Record<string, string> = { copper: 'Copper', silver: 'Silver', gold: 'Gold', palladium: 'Palladium' }

export default function CertificatePage() {
  const { certificateId = '' } = useParams()
  const [copied, setCopied] = useState(false)
  const guides = useGuides()
  const cert = useQuery({ queryKey: ['certificate', certificateId], queryFn: () => api<Certificate>(`/certificates/${certificateId}`) })

  if (cert.isLoading) return <Page><Spinner /></Page>
  if (!cert.data) return <Page narrow><ErrorNote>{errorText(cert.error)}</ErrorNote></Page>
  const c = cert.data
  const url = `${location.origin}/certificate/${c.id}`
  const metals = Object.entries(c.totals.metalsGrams ?? {})
  const trailFor = (deviceId: string) => c.trails?.find((t) => t.deviceId === deviceId)
  const processed = (c.trails ?? []).filter((t) => t.stage === 'processed').length

  return (
    <Page narrow>
      <div className="mb-4 flex justify-end gap-2 print:hidden">
        <button
          type="button"
          className="btn-ghost"
          onClick={async () => {
            if (navigator.share) await navigator.share({ title: 'SafeDrop handover receipt', url }).catch(() => {})
            else {
              await navigator.clipboard.writeText(url)
              setCopied(true)
            }
          }}
        >
          <Share2 className="size-4" aria-hidden="true" /> {copied ? 'Link copied' : 'Share'}
        </button>
        <button type="button" className="btn-ghost" onClick={() => window.print()}>
          <Printer className="size-4" aria-hidden="true" /> Print
        </button>
      </div>

      <article className="card relative overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-sky-500 via-gold-400 to-ember-500" />
        <div className="p-6 sm:p-10">
          <div className="flex items-start justify-between gap-6">
            <div className="flex items-center gap-3">
              <LogoMark className="size-10" />
              <div>
                <p className="eyebrow">SafeDrop eWaste</p>
                <p className="text-sm text-ink-3">Handover receipt and recycling record</p>
              </div>
            </div>
            {c.demo ? (
              <span className="inline-flex items-center gap-1.5 border border-ember-400 bg-ember-50 px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider text-ember-700">
                Demo handover
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 border border-emerald-600 bg-emerald-50 px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider text-emerald-700">
                <BadgeCheck className="size-3.5" aria-hidden="true" /> Recorded handover
              </span>
            )}
          </div>

          <h1 className="mt-8 text-3xl font-semibold tracking-tight">
            {c.totals.devices} device{c.totals.devices > 1 ? 's' : ''} handed over{processed ? `, ${processed} confirmed processed` : ''}
          </h1>
          <p className="mt-2 text-ink-2">
            Handed over by <span className="font-medium text-ink">{c.holderName}</span> at <span className="font-medium text-ink">{c.pointName}</span> on{' '}
            {formatDate(c.issuedAt)}
            {c.collectorName ? `, collected from home by pickup partner ${c.collectorName}` : ''}.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Metric value={formatKg(c.totals.kg)} label="Weighed at the counter" tag="measured" />
            <Metric value={`${c.totals.co2eKg.toLocaleString('en-IN', { maximumFractionDigits: 2 })} kg`} label="CO₂e avoided if recycled" tag="estimate" />
            <Metric value={formatKwh(c.totals.energyKwh)} label="Energy saved if recycled" tag="estimate" />
            <Metric value={`${ledHours(c.totals.energyKwh).toLocaleString('en-IN')} h`} label="of a 9 W LED bulb" tag="estimate" />
          </div>

          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-line font-mono text-[10.5px] uppercase tracking-wider text-ink-3">
                  <th className="py-2 font-medium">Item</th>
                  <th className="py-2 font-medium">Weight</th>
                  <th className="py-2 font-medium">Stage now</th>
                  <th className="py-2 font-medium">CO₂e (est.)</th>
                  <th className="py-2 font-medium">Energy (est.)</th>
                </tr>
              </thead>
              <tbody>
                {c.items.map((item) => {
                  const trail = trailFor(item.deviceId)
                  return (
                    <tr key={item.deviceId} className="border-b border-line align-top">
                      <td className="py-2.5">
                        {item.label}
                        <span className="block text-xs text-ink-3">
                          {kindLabels[item.kind]} · <span className="font-mono">{item.deviceId}</span>
                        </span>
                      </td>
                      <td className="py-2.5 tabular-nums">
                        {formatKg(item.kg)}
                        {item.corrected && <span className="block text-[11px] text-ink-3">corrected, see trail</span>}
                      </td>
                      <td className="py-2.5">{trail?.stage ? <StatusBadge status={trail.stage} /> : '—'}</td>
                      <td className="py-2.5 tabular-nums">{item.co2eKg} kg</td>
                      <td className="py-2.5 tabular-nums">{formatKwh(item.energyKwh)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {c.items.some((i) => i.wipe) && (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {c.items
                .filter((i) => i.wipe)
                .map((i) => (
                  <WipeRecordCard
                    key={i.deviceId}
                    guideTitle={`${i.label}: ${guides.data?.guides.find((g) => g.id === i.wipe!.guideId)?.title ?? i.wipe!.guideId}`}
                    guideVersion={i.wipe!.guideVersion}
                    attestedAt={i.wipe!.attestedAt}
                    summary={i.wipe!.summary}
                  />
                ))}
            </div>
          )}

          {metals.length > 0 && (
            <div className="mt-6 bg-gold-50 p-4">
              <p className="text-sm font-semibold">Metals recoverable from a typical phone (USGS)</p>
              <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink-2">
                {metals.map(([metal, g]) => (
                  <span key={metal}>
                    {metalNames[metal] ?? metal}: <span className="font-medium text-ink">{g} g</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 grid gap-4 border-t border-line pt-6 sm:grid-cols-2">
            <div>
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <CircleCheck className="size-4 text-emerald-600" aria-hidden="true" /> What this record shows
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed text-ink-2">
                <li>A SafeDrop drop point recorded receiving these items, at these weights, at this time, with a single-use code.</li>
                <li>Every later step (dispatch, processing) is a hash-linked event below; editing any of them breaks the chain.</li>
                <li>Where the stage is “Processor confirmed”, the receiving facility recorded its own evidence reference.</li>
              </ul>
            </div>
            <div>
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <CircleX className="size-4 text-ember-500" aria-hidden="true" /> What it does not prove
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed text-ink-2">
                <li>That data was erased: the wipe checklist is self-attested by the owner.</li>
                <li>That an item was recycled, unless its stage is “Processor confirmed”.</li>
                <li>Exact climate benefit: CO₂e and energy are estimates from US EPA WARM v16 factors, not measured, and not validated for India.</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-6 border-t border-line pt-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="text-xs leading-relaxed text-ink-3">
              <p>Receipt {c.id}</p>
              {c.demo && <p>Issued at the demo drop point for judging; not counted in public impact totals.</p>}
              <p>{c.pointAddress}</p>
              <p className="mt-2 max-w-md">
                Method {c.version.formula} · factors {c.version.factors}. Estimates are for the weights recorded at handover.
                {c.updatedAt ? ` Updated ${formatDate(c.updatedAt)} after an audited weight correction.` : ''}
              </p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Qr value={url} size={96} label="QR code to open and verify this receipt" />
              <span className="font-mono text-[10px] uppercase tracking-wider text-ink-3">Scan to verify</span>
            </div>
          </div>
        </div>
      </article>

      {(c.trails ?? []).map((t) => {
        const item = c.items.find((i) => i.deviceId === t.deviceId)
        return (
          <section key={t.deviceId} className="card mt-6 p-6 print:hidden">
            <h2 className="text-sm font-semibold">Event trail: {item?.label}</h2>
            <p className="mb-4 font-mono text-[11px] text-ink-3">{t.deviceId}</p>
            <TrailTimeline deviceId={t.deviceId} events={t.events} serverIntact={t.intact} />
          </section>
        )
      })}
    </Page>
  )
}

function Metric({ value, label, tag }: { value: string; label: string; tag: 'measured' | 'estimate' }) {
  return (
    <div className="border border-line p-3">
      <div className="text-xl font-semibold tabular-nums">{value}</div>
      <div className="mt-0.5 text-xs text-ink-3">{label}</div>
      <div className={`mt-1 font-mono text-[9.5px] uppercase tracking-wider ${tag === 'measured' ? 'text-emerald-700' : 'text-gold-700'}`}>{tag}</div>
    </div>
  )
}
