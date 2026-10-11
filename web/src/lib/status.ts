import type { BookingStatus, DeviceStage } from './types'

// One vocabulary for every screen: registered, partner, accepted, received, processed always mean the same thing.
export const stageLabels: Record<DeviceStage, string> = {
  added: 'Added',
  wiping: 'Wipe in progress',
  ready: 'Ready to hand over',
  booked: 'Handover booked',
  collected: 'Collected by pickup partner',
  received: 'Received and weighed',
  dispatched: 'Sent for processing',
  processed: 'Processor confirmed',
}

export const stageOrder: DeviceStage[] = ['added', 'wiping', 'ready', 'booked', 'collected', 'received', 'dispatched', 'processed']

export const bookingLabels: Record<BookingStatus, string> = {
  booked: 'Booked',
  accepted: 'Pickup accepted',
  collected: 'Collected',
  received: 'Received and weighed',
  cancelled: 'Cancelled',
}

export const eventLabels: Record<string, string> = {
  'device.added': 'Added to the drawer',
  'wipe.started': 'Wipe checklist started',
  'wipe.attested': 'Wipe self-attested by the owner',
  'handover.booked': 'Handover booked',
  'handover.cancelled': 'Booking cancelled',
  'pickup.accepted': 'Pickup accepted by a kabadiwala partner',
  'pickup.collected': 'Collected from home',
  'handover.received': 'Received and weighed at the drop point',
  'weight.corrected': 'Weight corrected (audited)',
  'dispatch.sent': 'Sent for processing',
  'processing.confirmed': 'Processing confirmed by the facility',
}

export const roleLabels: Record<string, string> = {
  owner: 'Owner',
  partner: 'Drop-point staff',
  collector: 'Pickup partner',
  processor: 'Recycling facility',
}

export const directoryStates = {
  listed: 'CPCB-registered (official list)',
  partner: 'SafeDrop partner',
  confirmed: 'Confirmed to accept',
} as const
