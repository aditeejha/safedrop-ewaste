import { useQuery } from '@tanstack/react-query'
import { ExternalLink, Zap } from 'lucide-react'
import { Page, PageHeader, Picture, Spinner, Stat } from '../components/ui'
import { api } from '../lib/api'
import { formatKg, formatKwh, kindLabels, ledHours, useFacts } from '../lib/data'
import type { DeviceKind, Fact, Stats } from '../lib/types'

type Factor = { recycling: number; landfilling: number }
type ImpactData = {
  warm: { source: { title: string; url: string }; materials: Record<string, Factor> }
  energy: { source: { title: string; url: string }; materials: Record<string, Factor>; kwhPerMillionBtu: number; sourceReductionPortable: number }
  kindMaterial: Record<string, string>
  typicalKg: Record<string, { kg: number; basis: string }>
  typicalKgSource: { title: string; url: string }
  phoneMetals: { gramsPerPhone: Record<string, number>; basis: string; source: { title: string; url: string } }
}

const topics: Record<string, string> = {
  A: 'India’s e-waste',
  B: 'Old phones at home',
  C: 'The law',
  D: 'What’s inside',
  G: 'Health and safety',
}

function FactList({ facts }: { facts: Fact[] }) {
  const groups = Object.entries(topics).map(([letter, title]) => ({ title, facts: facts.filter((f) => f.id.startsWith(letter)) }))
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {groups.map((g) => (
        <section key={g.title} className="card p-5">
          <h3 className="text-sm font-semibold">{g.title}</h3>
          <ul className="mt-3 space-y-3">
            {g.facts.map((f) => (
              <li key={f.id} className="text-sm leading-relaxed text-ink-2">
                {f.statement}{' '}
                <a href={f.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 whitespace-nowrap font-mono text-[11px] text-sky-700 hover:underline">
                  {f.publisher.split(',')[0].split('(')[0].trim()}, {f.date.slice(0, 7)} <ExternalLink className="size-3" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

export default function Impact() {
  const stats = useQuery({ queryKey: ['stats'], queryFn: () => api<Stats>('/stats') })
  const impact = useQuery({ queryKey: ['impact'], queryFn: async () => (await fetch('/data/impact.json')).json() as Promise<ImpactData>, staleTime: Infinity })
  const facts = useFacts()
  const s = stats.data
  const data = impact.data

  const materials = data ? [...new Set(Object.values(data.kindMaterial))] : []
  const kindsFor = (material: string) =>
    Object.entries(data?.kindMaterial ?? {})
      .filter(([, m]) => m === material)
      .map(([k]) => kindLabels[k as DeviceKind])
      .join(', ')

  const recyclingEnergy = data ? data.energy.materials['Portable Electronic Devices'] : null
  const reuseRatio = data && recyclingEnergy ? Math.abs(data.energy.sourceReductionPortable) / Math.abs(recyclingEnergy.recycling) : null

  return (
    <Page>
      <PageHeader
        eyebrow="Impact"
        title="Waste turned back into energy and materials"
        intro="Every number here comes from a real handover weighed at a SafeDrop point, multiplied by published US EPA factors. Nothing is projected."
      />

      <div className="card grid grid-cols-2 gap-6 p-6 md:grid-cols-3 lg:grid-cols-6">
        <Stat value={s ? String(s.devicesAdded) : '…'} label="Devices added" />
        <Stat value={s ? String(s.devicesWiped) : '…'} label="Devices wiped" />
        <Stat value={s ? String(s.devicesRecycled) : '…'} label="Devices recycled" />
        <Stat value={s ? formatKg(s.kgRecycled) : '…'} label="Kept from landfill" />
        <Stat value={s ? `${s.co2eKgAvoided.toLocaleString('en-IN', { maximumFractionDigits: 1 })} kg` : '…'} label="CO₂e avoided" />
        <Stat value={s ? formatKwh(s.energyKwhSaved) : '…'} label="Energy saved" hint={s ? `${ledHours(s.energyKwhSaved).toLocaleString('en-IN')} LED-bulb hours` : undefined} />
      </div>
      {s && (s.demo.devicesAdded > 0 || s.demo.devicesRecycled > 0) && (
        <p className="mt-3 text-xs text-ink-3">
          Demo activity is kept out of these totals: {s.demo.devicesAdded} devices added, {s.demo.devicesRecycled} recycled ({formatKg(s.demo.kgRecycled)}) with the
          judges’ test account at the demo drop point.
        </p>
      )}

      <section className="mt-14 grid items-center gap-10 md:grid-cols-2">
        <Picture name="materials-macro" alt="Copper wire, gold-plated pins, circuit board and solder recovered from electronics" className="aspect-[3/2] w-full border border-line" />
        <div>
          <p className="eyebrow flex items-center gap-2"><Zap className="size-3.5 text-gold-500" /> Waste to energy</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight">Recycling a device saves the energy of mining its metals again</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
            Copper, gold and aluminium recovered by a registered recycler replace metal that would otherwise be mined, smelted and refined. US EPA’s WARM
            model puts a number on that: recycling a short ton of phones, tablets and laptops saves{' '}
            {recyclingEnergy ? `${Math.abs(recyclingEnergy.recycling)}` : '…'} million Btu compared with making them from virgin material, while landfilling costs
            energy.
          </p>
          {reuseRatio && (
            <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
              Reuse saves even more. WARM credits <em>not making</em> a new portable device with {Math.abs(data!.energy.sourceReductionPortable)} million Btu per
              short ton, about {reuseRatio.toFixed(0)}× the recycling credit. That’s why SafeDrop shows registered refurbishers for working devices first.
            </p>
          )}
        </div>
      </section>

      <section className="mt-14">
        <p className="eyebrow">Context</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight">The facts behind SafeDrop</h2>
        <p className="mt-2 max-w-2xl text-sm text-ink-2">Every figure was checked against the source document. Older or non-Indian figures are labelled as such.</p>
        <div className="mt-6">{facts.data ? <FactList facts={facts.data} /> : <Spinner />}</div>
      </section>

      <section id="method" className="mt-14 scroll-mt-24">
        <p className="eyebrow">Method</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight">How we count</h2>
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <div className="space-y-3 text-sm leading-relaxed text-ink-2">
            <p>
              <span className="font-medium text-ink">Weight</span> is recorded by drop-point staff on a scale at handover. Suggested weights only prefill the
              form, using UNU average weights per item.
            </p>
            <p>
              <span className="font-medium text-ink">CO₂e avoided</span> = weight × (landfilling factor − recycling factor) from US EPA WARM v16, in tonnes CO₂e
              per short ton (907.18 kg).
            </p>
            <p>
              <span className="font-medium text-ink">Energy saved</span> = weight × (landfilling − recycling) WARM energy factor in million Btu per short ton ×
              293.07 kWh per million Btu (NIST SP 811). LED-bulb hours assume a 9 W bulb.
            </p>
            <p>
              <span className="font-medium text-ink">Metals</span> for phones use USGS Fact Sheet 2006-3097: a typical 113 g phone holds 16 g copper, 0.35 g silver,
              0.034 g gold and 0.015 g palladium. These are recoverable amounts, not guaranteed yields.
            </p>
            <p>Loose batteries are not covered by WARM electronics factors, so they count towards weight only.</p>
          </div>
          {data && (
            <div className="card overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line font-mono text-[10.5px] uppercase tracking-wider text-ink-3">
                    <th className="px-3 py-2 font-medium">WARM material</th>
                    <th className="px-3 py-2 font-medium">CO₂e t / short ton</th>
                    <th className="px-3 py-2 font-medium">kWh / short ton</th>
                  </tr>
                </thead>
                <tbody>
                  {materials.map((m) => {
                    const g = data.warm.materials[m]
                    const e = data.energy.materials[m]
                    return (
                      <tr key={m} className="border-b border-line align-top">
                        <td className="px-3 py-2.5">
                          {m}
                          <span className="block text-xs text-ink-3">{kindsFor(m)}</span>
                        </td>
                        <td className="px-3 py-2.5 tabular-nums">{(g.landfilling - g.recycling).toFixed(2)}</td>
                        <td className="px-3 py-2.5 tabular-nums">{Math.round((e.landfilling - e.recycling) * data.energy.kwhPerMillionBtu).toLocaleString('en-IN')}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div className="space-y-1 p-3 text-xs">
                <a href={data.warm.source.url} target="_blank" rel="noreferrer" className="block text-sky-700 hover:underline">US EPA: {data.warm.source.title}</a>
                <a href={data.energy.source.url} target="_blank" rel="noreferrer" className="block text-sky-700 hover:underline">US EPA: {data.energy.source.title}</a>
                <a href={data.typicalKgSource.url} target="_blank" rel="noreferrer" className="block text-sky-700 hover:underline">UNU/UNEP average weights</a>
                <a href={data.phoneMetals.source.url} target="_blank" rel="noreferrer" className="block text-sky-700 hover:underline">USGS Fact Sheet 2006-3097</a>
              </div>
            </div>
          )}
        </div>
      </section>
    </Page>
  )
}
