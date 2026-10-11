import { HTTPException } from 'hono/http-exception'

// One vocabulary for a device's journey. Only the server moves a device between these states.
export const deviceStates = ['added', 'wiping', 'ready', 'booked', 'collected', 'received', 'dispatched', 'processed'] as const
export type DeviceState = (typeof deviceStates)[number]

const deviceMoves: Record<DeviceState, DeviceState[]> = {
  added: ['wiping', 'ready'],
  wiping: ['wiping', 'ready'],
  ready: ['booked'],
  booked: ['booked', 'ready', 'collected', 'received'],
  collected: ['received'],
  received: ['received', 'dispatched'],
  dispatched: ['processed'],
  processed: [],
}

export const bookingStates = ['booked', 'accepted', 'collected', 'received', 'cancelled'] as const
export type BookingState = (typeof bookingStates)[number]

const bookingMoves: Record<BookingState, BookingState[]> = {
  booked: ['accepted', 'received', 'cancelled'],
  accepted: ['collected', 'cancelled'],
  collected: ['received'],
  received: [],
  cancelled: [],
}

export function canMoveDevice(from: DeviceState, to: DeviceState) {
  return deviceMoves[from]?.includes(to) ?? false
}

export function canMoveBooking(from: BookingState, to: BookingState) {
  return bookingMoves[from]?.includes(to) ?? false
}

export function assertDeviceMove(from: DeviceState, to: DeviceState) {
  if (!canMoveDevice(from, to)) throw new HTTPException(409, { message: `A device that is ${from} can’t move to ${to}.` })
}

export function assertBookingMove(from: BookingState, to: BookingState) {
  if (!canMoveBooking(from, to)) throw new HTTPException(409, { message: `A booking that is ${from} can’t move to ${to}.` })
}
