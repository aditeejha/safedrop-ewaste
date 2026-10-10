export const deviceKinds = [
  'phone',
  'feature-phone',
  'tablet',
  'laptop',
  'desktop',
  'monitor',
  'tv',
  'router',
  'printer',
  'storage',
  'smartwatch',
  'earphones',
  'charger',
  'battery',
  'other',
] as const

export type DeviceKind = (typeof deviceKinds)[number]

export const osNames = ['android', 'ios', 'ipados', 'windows', 'macos', 'chromeos', 'other'] as const
export type OsName = (typeof osNames)[number]

const dataKinds = new Set<DeviceKind>(['phone', 'feature-phone', 'tablet', 'laptop', 'desktop', 'tv', 'router', 'printer', 'storage', 'smartwatch'])

export function holdsData(kind: DeviceKind) {
  return dataKinds.has(kind)
}

export function isDeviceKind(value: unknown): value is DeviceKind {
  return typeof value === 'string' && (deviceKinds as readonly string[]).includes(value)
}

export function guideFor(kind: DeviceKind, brand?: string | null, os?: string | null): string | null {
  const b = (brand ?? '').toLowerCase()
  const apple = b.includes('apple') || b.includes('iphone') || b.includes('ipad') || os === 'ios' || os === 'ipados'
  switch (kind) {
    case 'phone':
    case 'tablet':
    case 'smartwatch':
      if (apple) return 'iphone'
      if (b.includes('samsung')) return 'samsung'
      return 'android'
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
