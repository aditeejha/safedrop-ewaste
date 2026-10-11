export type DeviceKind =
  | 'phone'
  | 'feature-phone'
  | 'tablet'
  | 'laptop'
  | 'desktop'
  | 'monitor'
  | 'tv'
  | 'router'
  | 'printer'
  | 'storage'
  | 'smartwatch'
  | 'earphones'
  | 'charger'
  | 'battery'
  | 'other'

export type DeviceStage = 'added' | 'wiping' | 'ready' | 'booked' | 'collected' | 'received' | 'dispatched' | 'processed'
export type BookingStatus = 'booked' | 'accepted' | 'collected' | 'received' | 'cancelled'
export type StepState = 'done' | 'na' | 'skipped'

export type Step = { id: string; text: string; detail?: string; critical?: boolean }
export type Source = { title: string; publisher: string; url: string; updated?: string }
export type Section = { id: string; title: string; steps: Step[]; sources: Source[] }
export type Guide = {
  id: string
  title: string
  appliesTo: string[]
  minutes: number
  sections: Section[]
  note?: string
  version: string
  reviewedAt: string
}
export type GuideData = { generatedAt: string; guides: Guide[]; batterySafety: { steps: Step[]; sources: Source[] } }

export type SiteLocation = { precision: 'address' | 'area' | 'pincode' | 'district'; label: string; approximate: boolean }
export type Site = {
  id: string
  name: string
  type: 'recycler' | 'refurbisher'
  address: string
  state: string
  district: string | null
  city: string | null
  pincode: string | null
  capacityTpa: number | null
  registrations: { portalId: string; capacityTpa: number | null }[]
  phone: string | null
  email: string | null
  lat: number | null
  lng: number | null
  location: SiteLocation | null
  source: { name: string; url: string; checkedAt: string }
}
export type SiteData = { source: Site['source']; sites: Site[] }

export type Fact = {
  id: string
  topic: string
  statement: string
  value: number | null
  unit: string | null
  quote: string
  sourceTitle: string
  publisher: string
  date: string
  url: string
}

export type Identification = {
  kind: DeviceKind
  brand: string | null
  model: string | null
  os: string | null
  confidence: number
  batteryRisk: 'none' | 'possible' | 'likely' | 'unknown'
  damage: string[]
  notes: string
  guideId: string | null
  engine: 'bedrock' | 'gemini' | 'rekognition'
  labels?: string[]
  note?: string
}

export type Condition = {
  powersOn?: 'yes' | 'no' | 'unknown'
  screenWorks?: 'yes' | 'no' | 'unknown'
  accountLocked?: 'yes' | 'no' | 'unknown'
  damage?: 'none' | 'minor' | 'major' | 'unknown'
  battery?: 'ok' | 'swollen' | 'unknown'
}
export type Route = 'battery-hazard' | 'reuse' | 'recycle' | 'not-enough-info'

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
  kind: DeviceKind
  brand: string | null
  model: string | null
  label: string
  guideId: string | null
  holdsData: boolean
  status: DeviceStage
  demo: boolean
  wipe?: WipeRecord
  condition?: Condition
  recommendation: { route: Route; reasons: string[] }
  weightKg?: number
  receivedAt?: string
  bookingId?: string
  certificateId?: string
  dispatchId?: string
  identification?: Identification
  createdAt: string
}

export type TrailEvent = {
  eventId: string
  deviceId: string
  seq: number
  type: string
  at: string
  actorRole: string
  actorRef: string
  from?: DeviceStage
  to?: DeviceStage
  bookingId?: string
  weightKg?: number
  unit?: 'kg'
  evidence?: string
  details?: Record<string, string | number | boolean>
  demo: boolean
  prevHash: string
  hash: string
}

export type BookingDevice = Pick<Device, 'id' | 'kind' | 'brand' | 'model' | 'label' | 'holdsData'> & {
  wipeAttestedAt?: string
  guideVersion?: string
  suggestedKg?: number | null
}

export type Booking = {
  id: string
  code: string
  qr?: string
  mode: 'dropoff' | 'pickup'
  userName: string
  pointId: string
  pointName: string
  date: string
  expiresAt: string
  devices: BookingDevice[]
  status: BookingStatus
  demo: boolean
  pickup?: { address: string; pincode: string; phone: string }
  collectorName?: string
  collectorPhone?: string
  acceptedAt?: string
  collectedAt?: string
  createdAt: string
  receivedAt?: string
  certificateId?: string
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

export type PickupRequest = {
  id: string
  date: string
  status: BookingStatus
  pointName: string
  pincode?: string
  area?: string
  devices: { id: string; kind: DeviceKind; label: string }[]
  userName?: string
  address?: string
  phone?: string
  collectedAt?: string
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
  trails?: { deviceId: string; intact: boolean; brokenAt: number | null; stage: DeviceStage | null; events: TrailEvent[] }[]
}

export type HeldItem = { id: string; label: string; kind: DeviceKind; weightKg: number; receivedAt: string; bookingId: string; certificateId: string }

export type Dispatch = {
  id: string
  pointId: string
  pointName: string
  facility: { type: 'onboarded' | 'cpcb'; id: string; name: string }
  reference: string
  items: { deviceId: string; bookingId: string; label: string; kind: DeviceKind; kg: number }[]
  totalKg: number
  status: 'dispatched' | 'processed'
  demo: boolean
  createdAt: string
  processedAt?: string
  evidence?: string
}

export type StatCounts = {
  devicesAdded: number
  wipesAttested: number
  bookings: number
  devicesCollected: number
  kgWeighed: number
  co2eKgEstimated: number
  energyKwhEstimated: number
  devicesDispatched: number
  kgDispatched: number
  devicesProcessed: number
  kgProcessed: number
}
export type Stats = StatCounts & { demo: StatCounts }

export type HelperAction =
  | { type: 'open-guide'; guideId: string; title: string }
  | { type: 'find-recyclers' }
  | { type: 'prepare-pickup' }
  | { type: 'battery-safety' }
export type Answer = { answer: string; sources: Source[]; engine: 'bedrock' | 'gemini' | 'search'; actions: HelperAction[] }
