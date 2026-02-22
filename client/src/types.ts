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
  return n.toLocaleString('uz-UZ') + ' som'
}

const TZ = 'Asia/Tashkent'
const TZ_OFFSET = '+05:00' // Tashkent UTC+5 (DST yo'q)

/**
 * Serverdan kelgan sanani to'g'ri parse qilish.
 * Server sanalarni "2026-02-22T17:33:12" yoki "2026-02-22" formatda saqlaydi.
 * Bu Tashkent vaqti, shuning uchun +05:00 qo'shamiz.
 */
export function parseTashkentDate(date: string | Date): Date {
  if (date instanceof Date) return date
  if (!date) return new Date(NaN)
  // Allaqachon timezone bor
  if (date.endsWith('Z') || date.includes('+')) return new Date(date)
  // "2026-02-22T17:33:12" — vaqtli format
  if (date.includes('T')) return new Date(date + TZ_OFFSET)
  // "2026-02-22" — faqat sana
  return new Date(date + 'T00:00:00' + TZ_OFFSET)
}

/** Bugungi sanani Tashkent vaqtida qaytaradi: YYYY-MM-DD */
export function todayTashkent(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: TZ })
}

/** Hozirgi oy: YYYY-MM */
export function currentMonthTashkent(): string {
  return todayTashkent().slice(0, 7)
}

/** Tashkent vaqtida hozirgi soat:minut:soniya */
export function nowTimeTashkent(): string {
  return new Date().toLocaleTimeString('en-GB', { timeZone: TZ, hour12: false })
}

/** Date ni Tashkent vaqtida formatlash */
export function formatDateTashkent(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  return parseTashkentDate(date).toLocaleDateString('uz-UZ', { timeZone: TZ, ...options })
}

export function formatTimeTashkent(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  return parseTashkentDate(date).toLocaleTimeString('uz-UZ', { timeZone: TZ, hour: '2-digit', minute: '2-digit', ...options })
}

export function formatDateTimeTashkent(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  return parseTashkentDate(date).toLocaleString('uz-UZ', { timeZone: TZ, ...options })
}
