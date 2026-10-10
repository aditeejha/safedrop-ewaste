import impactData from '../../../data/impact.json'
import type { DeviceKind } from './kinds.js'

type WarmFactor = { recycling: number; landfilling: number }
type ImpactData = {
  warm: { materials: Record<string, WarmFactor> }
  energy: { materials: Record<string, WarmFactor>; kwhPerMillionBtu: number; ledBulbWatts: number }
  kindMaterial: Record<string, string>
  typicalKg: Record<string, { kg: number }>
  phoneMetals: { gramsPerPhone: Record<string, number> }
}

const data = impactData as unknown as ImpactData
const shortTonKg = 907.18474
const metalKinds = new Set<DeviceKind>(['phone', 'feature-phone'])

function round(value: number, places = 2) {
  const f = 10 ** places
  return Math.round(value * f) / f
}

export function materialFor(kind: DeviceKind) {
  return data.kindMaterial[kind] ?? null
}

export function typicalKg(kind: DeviceKind) {
  return data.typicalKg[kind]?.kg ?? null
}

// WARM factors are tonnes CO2e per short ton; recycling instead of landfilling avoids (landfilling - recycling).
export function co2eAvoidedKg(kind: DeviceKind, kg: number) {
  const material = materialFor(kind)
  const factor = material ? data.warm.materials[material] : undefined
  if (!factor) return 0
  return round((factor.landfilling - factor.recycling) * (kg / shortTonKg) * 1000)
}

// WARM energy factors are million Btu per short ton; negative recycling values are energy saved.
export function energySavedKwh(kind: DeviceKind, kg: number) {
  const material = materialFor(kind)
  const factor = material ? data.energy.materials[material] : undefined
  if (!factor) return 0
  return round((factor.landfilling - factor.recycling) * (kg / shortTonKg) * data.energy.kwhPerMillionBtu)
}

export function ledHours(kwh: number) {
  return Math.round((kwh * 1000) / data.energy.ledBulbWatts)
}

export function metalsRecoverableGrams(kind: DeviceKind) {
  if (!metalKinds.has(kind)) return null
  return Object.fromEntries(Object.entries(data.phoneMetals.gramsPerPhone).map(([metal, g]) => [metal, round(g, 3)]))
}

export function itemImpact(kind: DeviceKind, kg: number) {
  return {
    material: materialFor(kind),
    co2eKg: co2eAvoidedKg(kind, kg),
    energyKwh: energySavedKwh(kind, kg),
    metalsGrams: metalsRecoverableGrams(kind),
  }
}

export function sumImpact(items: { kg: number; co2eKg: number; energyKwh: number; metalsGrams: Record<string, number> | null }[]) {
  const metals: Record<string, number> = {}
  for (const item of items) for (const [metal, g] of Object.entries(item.metalsGrams ?? {})) metals[metal] = round((metals[metal] ?? 0) + g, 3)
  return {
    kg: round(items.reduce((t, i) => t + i.kg, 0), 3),
    co2eKg: round(items.reduce((t, i) => t + i.co2eKg, 0)),
    energyKwh: round(items.reduce((t, i) => t + i.energyKwh, 0)),
    metalsGrams: metals,
  }
}
