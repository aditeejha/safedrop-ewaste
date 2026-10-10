import { config } from './config'

export type LatLng = { lat: number; lng: number }

export function distanceKm(a: LatLng, b: LatLng) {
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(h))
}

export function formatKm(km: number) {
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km).toLocaleString('en-IN')} km`
}

// Amazon Location Service Places v2, called from the browser with the referer-restricted API key.
export async function geocodePlace(query: string): Promise<(LatLng & { label: string }) | null> {
  const { region, mapKey } = config()
  const pincode = /^\d{6}$/.test(query.trim())
  const body = pincode
    ? { QueryComponents: { PostalCode: query.trim(), Country: 'IND' }, MaxResults: 1 }
    : { QueryText: `${query.trim()}, India`, Filter: { IncludeCountries: ['IND'] }, MaxResults: 1 }
  const res = await fetch(`https://places.geo.${region}.amazonaws.com/v2/geocode?key=${encodeURIComponent(mapKey)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error('Could not look up that place.')
  const data = (await res.json()) as { ResultItems?: { Position?: [number, number]; Address?: { Label?: string }; Title?: string }[] }
  const item = data.ResultItems?.[0]
  if (!item?.Position) return null
  return { lng: item.Position[0], lat: item.Position[1], label: item.Address?.Label ?? item.Title ?? query }
}

export function currentPosition(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Location is not available in this browser.'))
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => reject(new Error('Location permission was denied. Try your pincode instead.')),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    )
  })
}

export function directionsUrl(to: LatLng) {
  return `https://www.google.com/maps/dir/?api=1&destination=${to.lat},${to.lng}`
}
