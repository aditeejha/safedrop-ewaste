import type { DeviceKind } from './lib/kinds.js'
import type { BookingState, DeviceState } from './lib/lifecycle.js'
import type { Condition } from './lib/route.js'
import type { Identification } from './lib/vision.js'

export type StepState = 'done' | 'na' | 'skipped'

export type WipeSummary = { total: number; critical: number; done: number; na: number; skipped: number }

export type WipeRecord = {
  guideId: string
  guideVersion: string
  startedAt?: string
  steps: Record<string, { state: StepState; at: string }>
  attestedAt?: string
  attestation?: string
  summary?: WipeSummary
}

export type Device = {
  id: string
  userId: string
  kind: DeviceKind
  brand: string | null
  model: string | null
  label: string
  guideId: string | null
  holdsData: boolean
  status: DeviceState
  demo: boolean
  trailSeq: number
  trailHash: string
  wipe?: WipeRecord
  condition?: Condition
  weightKg?: number
  receivedAt?: string
  bookingId?: string
  certificateId?: string
  dispatchId?: string
  impactSeq?: number
  identification?: Identification
  createdAt: string
}

export type BookingDevice = Pick<Device, 'id' | 'kind' | 'brand' | 'model' | 'label' | 'holdsData'> & {
  wipeAttestedAt?: string
  guideVersion?: string
}

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
  expiresAt: string
  devices: BookingDevice[]
  status: BookingState
  demo: boolean
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
  requestedPincodes?: string[]
  status: 'pending' | 'approved' | 'rejected'
  consentAt?: string
  createdAt: string
}

export type CertificateItem = {
  deviceId: string
  eventId: string
  label: string
  kind: DeviceKind
  kg: number
  unit: 'kg'
  co2eKg: number
  energyKwh: number
  material: string | null
  metalsGrams: Record<string, number> | null
  wipe: { guideId: string; guideVersion: string; attestedAt?: string; summary?: WipeSummary } | null
  corrected?: boolean
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
  version: { formula: string; factors: string }
  issuedAt: string
  updatedAt?: string
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
  accepts: { kinds: DeviceKind[]; damagedBatteries: boolean; services: ('dropoff' | 'pickup')[] }
  confirmedAt: string
}

export type Facility = { id: string; name: string; address: string; demo: boolean; note?: string }

export type DispatchItem = { deviceId: string; bookingId: string; userId: string; label: string; kind: DeviceKind; kg: number }

export type Dispatch = {
  id: string
  pointId: string
  pointName: string
  facility: { type: 'onboarded' | 'cpcb'; id: string; name: string }
  reference: string
  items: DispatchItem[]
  totalKg: number
  status: 'dispatched' | 'processed'
  demo: boolean
  createdAt: string
  processedAt?: string
  evidence?: string
}
