export type RoomStatus = 'available' | 'occupied' | 'cleaning' | 'maintenance' | 'booked'

export interface Room {
  id: string
  number: string
  floor: number
  status: RoomStatus
  guestName?: string
  guestPassport?: string
  guestPhone?: string
  checkIn?: string
  checkOut?: string
  pricePerNight: number
  notes?: string
  bookingId?: string
}

export interface Booking {
  id: string
  roomNumber: string
  guestName: string
  guestPhone: string
  checkInDate: string
  checkOutDate: string
  nights: number
  notes: string
  createdAt: string
  createdBy: string
  status: 'active' | 'checked_in' | 'cancelled'
  prepayment: number
}

export interface Transaction {
  id: string
  date: string
  type: 'income' | 'expense'
  category: string
  amount: number
  description: string
  roomNumber?: string
  admin: string
  shift: string
}

export interface ShiftLog {
  id: string
  admin: string
  shift: string
  startTime: string
  endTime?: string
  totalIncome: number
  totalExpense: number
  notes: string
  closed: boolean
}

export interface Admin {
  id: string
  name: string
  username: string
  role: 'super_admin' | 'admin'
}

export function formatUZS(n: number): string {
  return n.toLocaleString('uz-UZ') + ' so\'m'
}
