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

export type Step = { id: string; text: string; detail?: string; critical?: boolean }
export type Source = { title: string; publisher: string; url: string; updated?: string }
export type Section = { id: string; title: string; steps: Step[]; sources: Source[] }
export type Guide = { id: string; title: string; appliesTo: string[]; minutes: number; sections: Section[]; note?: string }
export type GuideData = { generatedAt: string; guides: Guide[]; batterySafety: { steps: Step[]; sources: Source[] } }

export type Recycler = {
  id: string
  name: string
  address: string
  state: string
  district: string | null
  city: string | null
  pincode: string | null
  capacityTpa: number | null
  phone: string | null
  email: string | null
  type: 'recycler' | 'refurbisher'
  lat: number | null
  lng: number | null
  precision: 'address' | 'area' | 'pincode' | 'district' | null
  disabled: boolean
}

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
}

export type Device = {
  id: string
  kind: DeviceKind
  brand: string | null
  model: string | null
  label: string
  guideId: string | null
  holdsData: boolean
  steps: Record<string, string>
  status: 'added' | 'ready' | 'booked' | 'recycled'
  wipedAt?: string
  bookingId?: string
  certificateId?: string
  identification?: Identification
  createdAt: string
}

export type BookingStatus = 'booked' | 'accepted' | 'collected' | 'received' | 'cancelled'

export type Booking = {
  id: string
  code: string
  mode: 'dropoff' | 'pickup'
  userName: string
  pointId: string
  pointName: string
  date: string
  devices: (Pick<Device, 'id' | 'kind' | 'brand' | 'model' | 'label' | 'wipedAt' | 'holdsData'> & { suggestedKg?: number | null })[]
  status: BookingStatus
  pickup?: { address: string; pincode: string; phone: string }
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
  status: 'pending' | 'approved'
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
  holderName: string
  pointName: string
  pointAddress: string
  demo?: boolean
  collectorName?: string
  items: CertificateItem[]
  totals: { devices: number; kg: number; co2eKg: number; energyKwh: number; metalsGrams: Record<string, number> }
  issuedAt: string
  verified?: boolean
}

export type StatCounts = {
  devicesAdded: number
  devicesWiped: number
  devicesRecycled: number
  kgRecycled: number
  co2eKgAvoided: number
  energyKwhSaved: number
  bookings: number
}

export type Stats = StatCounts & { demo: StatCounts }

export type Answer = { answer: string; sources: Source[]; engine: 'bedrock' | 'gemini' | 'search' }
