import { useQuery } from '@tanstack/react-query'
import type { DeviceKind, Fact, GuideData, SiteData } from './types'

async function json<T>(path: string) {
  const res = await fetch(path)
  if (!res.ok) throw new Error(`Could not load ${path}`)
  return (await res.json()) as T
}

const forever = { staleTime: Infinity, gcTime: Infinity }

export function useGuides() {
  return useQuery({ queryKey: ['guides'], queryFn: () => json<GuideData>('/data/guides.json'), ...forever })
}

export function useSites() {
  return useQuery({ queryKey: ['sites'], queryFn: () => json<SiteData>('/data/sites.json'), ...forever })
}

export function useFacts() {
  return useQuery({
    queryKey: ['facts'],
    queryFn: async () => (await json<{ facts: Fact[] }>('/data/facts.json')).facts,
    ...forever,
  })
}

export const kindLabels: Record<DeviceKind, string> = {
  phone: 'Smartphone',
  'feature-phone': 'Keypad phone',
  tablet: 'Tablet',
  laptop: 'Laptop',
  desktop: 'Desktop PC',
  monitor: 'Monitor',
  tv: 'TV',
  router: 'Wi-Fi router / modem',
  printer: 'Printer',
  storage: 'Hard disk / USB / memory card',
  smartwatch: 'Smartwatch',
  earphones: 'Earphones / headphones',
  charger: 'Charger / cable',
  battery: 'Loose battery / power bank',
  other: 'Something else',
}

export const dataKinds: DeviceKind[] = ['phone', 'feature-phone', 'tablet', 'laptop', 'desktop', 'tv', 'router', 'printer', 'storage', 'smartwatch']

export function guideFor(kind: DeviceKind, brand?: string | null, os?: string | null): string | null {
  const b = (brand ?? '').toLowerCase()
  const apple = b.includes('apple') || b.includes('iphone') || b.includes('ipad') || os === 'ios' || os === 'ipados'
  switch (kind) {
    case 'phone':
    case 'tablet':
    case 'smartwatch':
      return apple ? 'iphone' : b.includes('samsung') ? 'samsung' : 'android'
    case 'feature-phone':
      return 'feature-phone'
    case 'laptop':
    case 'desktop':
      if (apple || b.includes('mac') || os === 'macos') return 'mac'
      if (os === 'chromeos' || b.includes('chromebook')) return 'chromebook'
      return 'windows'
    case 'storage':
      return 'storage'
    case 'tv':
    case 'router':
    case 'printer':
      return 'tv-router-printer'
    default:
      return null
  }
}

export function formatKg(kg: number) {
  return kg >= 1 ? `${kg.toLocaleString('en-IN', { maximumFractionDigits: 1 })} kg` : `${Math.round(kg * 1000)} g`
}

export function formatDate(iso: string) {
  return new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatKwh(kwh: number) {
  return kwh >= 100 ? `${Math.round(kwh).toLocaleString('en-IN')} kWh` : `${kwh.toLocaleString('en-IN', { maximumFractionDigits: 1 })} kWh`
}

export function ledHours(kwh: number) {
  return Math.round((kwh * 1000) / 9)
}
