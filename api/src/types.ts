import type { DeviceKind } from './lib/kinds.js'
import type { Identification } from './lib/vision.js'

export type DeviceStatus = 'added' | 'ready' | 'booked' | 'recycled'

export type Device = {
  id: string
  userId: string
  kind: DeviceKind
  brand: string | null
  model: string | null
  label: string
  guideId: string | null
  holdsData: boolean
  steps: Record<string, string>
  status: DeviceStatus
  wipedAt?: string
  bookingId?: string
  certificateId?: string
  identification?: Identification
  createdAt: string
}

export type BookingDevice = Pick<Device, 'id' | 'kind' | 'brand' | 'model' | 'label' | 'wipedAt' | 'holdsData'>

export type BookingStatus = 'booked' | 'accepted' | 'collected' | 'received' | 'cancelled'

export type Pickup = { address: string; pincode: string; phone: string }

export type Booking = {
  id: string
  code: string
  mode: 'dropoff' | 'pickup'
  userId: string
  userName: string
  pointId: string
  pointName: string
  date: string
  devices: BookingDevice[]
  status: BookingStatus
  pickup?: Pickup
  collectorId?: string
  collectorName?: string
  collectorPhone?: string
  acceptedAt?: string
  collectedAt?: string
  createdAt: string
  receivedAt?: string
  certificateId?: string
}

export type Collector = {
  id: string
  name: string
  phone: string
  area: string
  pincodes: string[]
  status: 'pending' | 'approved'
  createdAt: string
}

export type CertificateItem = {
  label: string
  kind: DeviceKind
  kg: number
  co2eKg: number
  energyKwh: number
  material: string | null
  metalsGrams: Record<string, number> | null
  wipedAt?: string
}

export type Certificate = {
  id: string
  bookingId: string
  userId: string
  holderName: string
  pointId: string
  pointName: string
  pointAddress: string
  demo: boolean
  collectorName?: string
  items: CertificateItem[]
  totals: { devices: number; kg: number; co2eKg: number; energyKwh: number; metalsGrams: Record<string, number> }
  receivedBy: string
  issuedAt: string
}

export type Point = {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  hours: string
  demo: boolean
  note?: string
}
