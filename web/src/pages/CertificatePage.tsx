import { useQuery } from '@tanstack/react-query'
import { BadgeCheck, Printer, Share2 } from 'lucide-react'
import { useState } from 'react'
import { useParams } from 'react-router'
import { LogoMark } from '../components/Logo'
import { Qr } from '../components/Qr'
import { ErrorNote, Page, Spinner } from '../components/ui'
import { api, errorText } from '../lib/api'
import { formatDate, formatKg, formatKwh, kindLabels, ledHours } from '../lib/data'
import type { Certificate } from '../lib/types'

const metalNames: Record<string, string> = { copper: 'Copper', silver: 'Silver', gold: 'Gold', palladium: 'Palladium' }

export default function CertificatePage() {
  const { certificateId = '' } = useParams()
  const [copied, setCopied] = useState(false)
  const cert = useQuery({ queryKey: ['certificate', certificateId], queryFn: () => api<Certificate>(`/certificates/${certificateId}`) })

  if (cert.isLoading) return <Page><Spinner /></Page>
  if (!cert.data) return <Page narrow><ErrorNote>{errorText(cert.error)}</ErrorNote></Page>
  const c = cert.data
  const url = `${location.origin}/certificate/${c.id}`
  const metals = Object.entries(c.totals.metalsGrams ?? {})

  return (
    <Page narrow>
      <div className="mb-4 flex justify-end gap-2 print:hidden">
        <button
          type="button"
          className="btn-ghost"
          onClick={async () => {
            if (navigator.share) await navigator.share({ title: 'My SafeDrop recycling certificate', url }).catch(() => {})
            else {
              await navigator.clipboard.writeText(url)
              setCopied(true)
            }
          }}
        >
          <Share2 className="size-4" /> {copied ? 'Link copied' : 'Share'}
        </button>
        <button type="button" className="btn-ghost" onClick={() => window.print()}>
          <Printer className="size-4" /> Print
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
                <p className="text-sm text-ink-3">Recycling certificate</p>
              </div>
            </div>
            {c.demo ? (
              <span className="inline-flex items-center gap-1.5 border border-ember-400 bg-ember-50 px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider text-ember-700">
                Demo handover
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 border border-emerald-600 bg-emerald-50 px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider text-emerald-700">
                <BadgeCheck className="size-3.5" /> Verified
              </span>
            )}
          </div>

          <h1 className="mt-8 text-3xl font-semibold tracking-tight">
            {c.totals.devices} device{c.totals.devices > 1 ? 's' : ''} recycled responsibly
          </h1>
          <p className="mt-2 text-ink-2">
            Handed over by <span className="font-medium text-ink">{c.holderName}</span> at <span className="font-medium text-ink">{c.pointName}</span> on{' '}
            {formatDate(c.issuedAt)}. Each data-bearing device was wiped with SafeDrop’s official checklist before handover.
          </p>
          {c.collectorName && (
            <p className="mt-2 text-sm text-ink-2">
              Collected from the doorstep by SafeDrop pickup partner <span className="font-medium text-ink">{c.collectorName}</span>.
            </p>
          )}

          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Metric value={formatKg(c.totals.kg)} label="Weighed at counter" />
            <Metric value={`${c.totals.co2eKg.toLocaleString('en-IN', { maximumFractionDigits: 2 })} kg`} label="CO₂e avoided" />
            <Metric value={formatKwh(c.totals.energyKwh ?? 0)} label="Energy saved" />
            <Metric value={`${ledHours(c.totals.energyKwh ?? 0).toLocaleString('en-IN')} h`} label="of a 9 W LED bulb" />
          </div>

          <table className="mt-8 w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line font-mono text-[10.5px] uppercase tracking-wider text-ink-3">
                <th className="py-2 font-medium">Item</th>
                <th className="py-2 font-medium">Weight</th>
                <th className="py-2 font-medium">CO₂e avoided</th>
                <th className="py-2 font-medium">Energy saved</th>
              </tr>
            </thead>
            <tbody>
              {c.items.map((item, i) => (
                <tr key={i} className="border-b border-line">
                  <td className="py-2.5">
                    {item.label}
                    <span className="block text-xs text-ink-3">{kindLabels[item.kind]}{item.wipedAt ? ` · wiped ${formatDate(item.wipedAt)}` : ''}</span>
                  </td>
                  <td className="py-2.5 tabular-nums">{formatKg(item.kg)}</td>
                  <td className="py-2.5 tabular-nums">{item.co2eKg} kg</td>
                  <td className="py-2.5 tabular-nums">{formatKwh(item.energyKwh ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {metals.length > 0 && (
            <div className="mt-6 bg-gold-50 p-4">
              <p className="text-sm font-semibold">Metals recoverable from the phones</p>
              <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink-2">
                {metals.map(([metal, g]) => (
                  <span key={metal}>
                    {metalNames[metal] ?? metal}: <span className="font-medium text-ink">{g} g</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-col gap-6 border-t border-line pt-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="text-xs leading-relaxed text-ink-3">
              <p>Certificate {c.id}</p>
              {c.demo && <p>Issued at the demo drop point for judging; not counted in public impact totals.</p>}
              <p>{c.pointAddress}</p>
              <p className="mt-2 max-w-md">
                CO₂e and energy use US EPA WARM v16 factors (recycling compared with landfilling). Metals use USGS Fact Sheet 2006-3097 for a typical phone.
                These are estimates for the weights recorded at handover.
              </p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Qr value={url} size={96} label="QR code to verify this certificate" />
              <span className="font-mono text-[10px] uppercase tracking-wider text-ink-3">Scan to verify</span>
            </div>
          </div>
        </div>
      </article>
    </Page>
  )
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="border border-line p-3">
      <div className="text-xl font-semibold tabular-nums">{value}</div>
      <div className="mt-0.5 text-xs text-ink-3">{label}</div>
    </div>
  )
}
