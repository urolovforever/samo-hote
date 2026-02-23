import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { Room, Transaction, ShiftLog, Booking } from '../types'
import { parseTashkentDate } from '../types'
import { api } from '../lib/api'
import { useAuth } from './AuthContext'

interface DataContextType {
  rooms: Room[]
  transactions: Transaction[]
  shifts: ShiftLog[]
  bookings: Booking[]
  activeShifts: ShiftLog[]
  loading: boolean
  updateRoom: (roomId: string, updates: Partial<Room>) => Promise<void>
  addTransaction: (tx: Omit<Transaction, 'id' | 'admin' | 'shift'>) => Promise<void>
  deleteTransaction: (id: string) => Promise<void>
  editTransaction: (id: string, data: { description?: string; amount?: number; category?: string }) => Promise<void>
  addBooking: (booking: Omit<Booking, 'id' | 'createdAt' | 'createdBy' | 'status'>) => Promise<void>
  updateBooking: (id: string, data: Record<string, any>) => Promise<void>
  cancelBooking: (id: string) => Promise<void>
  checkInFromBooking: (id: string, passport: string, nights: number, date?: string, totalPrice?: number) => Promise<void>
  closeShift: (notes: string) => Promise<void>
  refreshData: () => Promise<void>
}

const DataContext = createContext<DataContextType | null>(null)

// Map snake_case DB fields to camelCase
function mapRoom(r: any): Room {
  return {
    id: String(r.id),
    number: r.number,
    floor: r.floor,
    status: r.status,
    guestName: r.guest_name || undefined,
    guestPassport: r.guest_passport || undefined,
    guestPhone: r.guest_phone || undefined,
    checkIn: r.check_in || undefined,
    checkOut: r.check_out || undefined,
    pricePerNight: r.price_per_night,
    notes: r.notes || undefined,
    bookingId: r.booking_id ? String(r.booking_id) : undefined,
  }
}

function mapTransaction(t: any): Transaction {
  return {
    id: String(t.id),
    date: t.date,
    type: t.type,
    category: t.category,
    amount: t.amount,
    description: t.description,
    roomNumber: t.room_number || undefined,
    admin: t.admin_name || t.admin || '',
    shift: t.shift_id ? String(t.shift_id) : '',
  }
}

function mapShift(s: any): ShiftLog {
  return {
    id: String(s.id),
    admin: s.admin_name || '',
    shift: s.start_time ? parseTashkentDate(s.start_time).toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' }) : '',
    startTime: s.start_time || '',
    endTime: s.end_time || undefined,
    totalIncome: s.total_income || 0,
    totalExpense: s.total_expense || 0,
    notes: s.notes || '',
    closed: !!s.closed,
  }
}

function mapBooking(b: any): Booking {
  return {
    id: String(b.id),
    roomNumber: b.room_number,
    guestName: b.guest_name,
    guestPhone: b.guest_phone,
    checkInDate: b.check_in_date,
    checkOutDate: b.check_out_date || '',
    nights: b.nights || 1,
    notes: b.notes || '',
    createdAt: b.created_at,
    createdBy: b.created_by,
    status: b.status,
    prepayment: b.prepayment || 0,
  }
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { admin, currentShift, setCurrentShift } = useAuth()
  const [rooms, setRooms] = useState<Room[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [shifts, setShifts] = useState<ShiftLog[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [activeShifts, setActiveShifts] = useState<ShiftLog[]>([])
  const [loading, setLoading] = useState(true)

  const refreshData = useCallback(async () => {
    if (!admin) return
    try {
      const [roomsData, txData, shiftsData, bookingsData, activeShiftsData] = await Promise.all([
        api.getRooms(),
        api.getTransactions(),
        api.getShifts(),
        api.getBookings(),
        api.getActiveShifts(),
      ])
      setRooms(roomsData.map(mapRoom))
      setTransactions(txData.map(mapTransaction))
      setShifts(shiftsData.filter((s: any) => s.closed).map(mapShift))
      setBookings(bookingsData.map(mapBooking))
      setActiveShifts(activeShiftsData.map(mapShift))

      // Sync current shift totals from server data
      if (currentShift) {
        // Serverdan joriy shift ni topish (yopilmagan)
        const serverShift = shiftsData.find((s: any) => String(s.id) === currentShift.id && !s.closed)
        // Yopilgan shift lardan ham tekshirish
        const closedOnServer = !serverShift && shiftsData.find((s: any) => String(s.id) === currentShift.id && s.closed)

        if (serverShift) {
          const updated = {
            ...currentShift,
            totalIncome: serverShift.total_income || 0,
            totalExpense: serverShift.total_expense || 0,
          }
          setCurrentShift(updated)
          localStorage.setItem('samo_shift', JSON.stringify(updated))
        } else {
          // Shift serverda topilmadi yoki yopilgan — local state ni tozalash
          if (closedOnServer) {
            console.warn('Shift boshqa joyda yopilgan, local state tozalanmoqda')
          }
          setCurrentShift(null)
          localStorage.removeItem('samo_shift')
        }
      }
    } catch (err) {
      console.error('Data fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [admin, currentShift, setCurrentShift])

  useEffect(() => {
    if (admin) {
      refreshData()
    } else {
      setRooms([])
      setTransactions([])
      setShifts([])
      setBookings([])
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admin])

  const updateRoom = useCallback(async (roomId: string, updates: Partial<Room>) => {
    const apiUpdates: Record<string, any> = {}
    if (updates.status !== undefined) apiUpdates.status = updates.status
    if (updates.guestName !== undefined) apiUpdates.guest_name = updates.guestName || null
    if (updates.guestPassport !== undefined) apiUpdates.guest_passport = updates.guestPassport || null
    if (updates.guestPhone !== undefined) apiUpdates.guest_phone = updates.guestPhone || null
    if (updates.checkIn !== undefined) apiUpdates.check_in = updates.checkIn || null
    if (updates.checkOut !== undefined) apiUpdates.check_out = updates.checkOut || null
    if (updates.pricePerNight !== undefined) apiUpdates.price_per_night = updates.pricePerNight
    if (updates.notes !== undefined) apiUpdates.notes = updates.notes || null
    if (updates.bookingId !== undefined) apiUpdates.booking_id = updates.bookingId || null

    try {
      const result = await api.updateRoom(roomId, apiUpdates)
      setRooms(prev => prev.map(r => r.id === roomId ? mapRoom(result) : r))
    } catch (err: any) {
      throw new Error(err.message || 'Xona yangilashda xatolik')
    }
  }, [])

  const addTransaction = useCallback(async (tx: Omit<Transaction, 'id' | 'admin' | 'shift'>) => {
    try {
      const result = await api.addTransaction({
        type: tx.type,
        category: tx.category,
        amount: tx.amount,
        description: tx.description,
        room_number: tx.roomNumber || null,
        shift_id: currentShift?.id || null,
        date: tx.date || null,
      })

      setTransactions(prev => [mapTransaction(result), ...prev])

      // Update current shift totals locally (server already updated atomically)
      if (currentShift) {
        const updated = {
          ...currentShift,
          totalIncome: currentShift.totalIncome + (tx.type === 'income' ? tx.amount : 0),
          totalExpense: currentShift.totalExpense + (tx.type === 'expense' ? tx.amount : 0),
        }
        setCurrentShift(updated)
        localStorage.setItem('samo_shift', JSON.stringify(updated))
      }
    } catch (err: any) {
      throw new Error(err.message || 'Tranzaksiya qo\'shishda xatolik')
    }
  }, [currentShift, setCurrentShift])

  const addBooking = useCallback(async (booking: Omit<Booking, 'id' | 'createdAt' | 'createdBy' | 'status'>) => {
    try {
      const result = await api.addBooking({
        room_number: booking.roomNumber,
        guest_name: booking.guestName,
        guest_phone: booking.guestPhone,
        check_in_date: booking.checkInDate,
        check_out_date: booking.checkOutDate || null,
        nights: booking.nights,
        notes: booking.notes,
        prepayment: booking.prepayment || 0,
        shift_id: currentShift?.id || null,
      })

      setBookings(prev => [mapBooking(result), ...prev])

      // Oldindan to'lov bo'lsa shift totalini yangilash
      if (booking.prepayment && booking.prepayment > 0 && currentShift) {
        const updated = {
          ...currentShift,
          totalIncome: currentShift.totalIncome + booking.prepayment,
        }
        setCurrentShift(updated)
        localStorage.setItem('samo_shift', JSON.stringify(updated))
      }

      // Refresh rooms and transactions in background (non-blocking)
      Promise.all([api.getRooms(), api.getTransactions()]).then(([roomsData, txData]) => {
        setRooms(roomsData.map(mapRoom))
        setTransactions(txData.map(mapTransaction))
      }).catch(() => {})
    } catch (err: any) {
      throw new Error(err.message || 'Bron qilishda xatolik')
    }
  }, [currentShift, setCurrentShift])

  const cancelBooking = useCallback(async (id: string) => {
    try {
      const booking = bookings.find(b => b.id === id)
      await api.cancelBooking(id, currentShift?.id || null)
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled' as const } : b))

      // Oldindan to'lov qaytarilsa shift totalini yangilash
      if (booking && booking.prepayment > 0 && currentShift) {
        const updated = {
          ...currentShift,
          totalExpense: currentShift.totalExpense + booking.prepayment,
        }
        setCurrentShift(updated)
        localStorage.setItem('samo_shift', JSON.stringify(updated))
      }

      // Refresh rooms and transactions in background (non-blocking)
      Promise.all([api.getRooms(), api.getTransactions()]).then(([roomsData, txData]) => {
        setRooms(roomsData.map(mapRoom))
        setTransactions(txData.map(mapTransaction))
      }).catch(() => {})
    } catch (err: any) {
      throw new Error(err.message || 'Bekor qilishda xatolik')
    }
  }, [bookings, currentShift, setCurrentShift])

  const checkInFromBooking = useCallback(async (id: string, passport: string, nights: number, date?: string, totalPrice?: number) => {
    try {
      await api.checkInFromBooking(id, {
        passport,
        nights,
        shift_id: currentShift?.id || null,
        date: date || null,
        total_price: totalPrice ?? null,
      })

      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'checked_in' as const } : b))

      // Refresh all data since this affects rooms, transactions, and shifts
      await refreshData()
    } catch (err: any) {
      throw new Error(err.message || 'Joylashtirishda xatolik')
    }
  }, [currentShift, refreshData])

  const deleteTransaction = useCallback(async (id: string) => {
    try {
      const tx = transactions.find(t => t.id === id)
      await api.deleteTransaction(id)
      setTransactions(prev => prev.filter(t => t.id !== id))

      // Update current shift totals locally (manfiy bo'lmasligi kerak)
      if (tx && currentShift && tx.shift === currentShift.id) {
        const updated = {
          ...currentShift,
          totalIncome: Math.max(0, currentShift.totalIncome - (tx.type === 'income' ? tx.amount : 0)),
          totalExpense: Math.max(0, currentShift.totalExpense - (tx.type === 'expense' ? tx.amount : 0)),
        }
        setCurrentShift(updated)
        localStorage.setItem('samo_shift', JSON.stringify(updated))
      }
    } catch (err: any) {
      throw new Error(err.message || 'Tranzaksiya o\'chirishda xatolik')
    }
  }, [transactions, currentShift, setCurrentShift])

  const editTransaction = useCallback(async (id: string, data: { description?: string; amount?: number; category?: string }) => {
    try {
      const oldTx = transactions.find(t => t.id === id)
      const result = await api.updateTransaction(id, data)
      setTransactions(prev => prev.map(t => t.id === id ? mapTransaction(result) : t))

      // Update current shift totals locally (manfiy bo'lmasligi kerak)
      if (oldTx && data.amount && currentShift && oldTx.shift === currentShift.id) {
        const diff = data.amount - oldTx.amount
        const updated = {
          ...currentShift,
          totalIncome: Math.max(0, currentShift.totalIncome + (oldTx.type === 'income' ? diff : 0)),
          totalExpense: Math.max(0, currentShift.totalExpense + (oldTx.type === 'expense' ? diff : 0)),
        }
        setCurrentShift(updated)
        localStorage.setItem('samo_shift', JSON.stringify(updated))
      }
    } catch (err: any) {
      throw new Error(err.message || 'Tranzaksiya tahrirlashda xatolik')
    }
  }, [transactions, currentShift, setCurrentShift])

  const updateBooking = useCallback(async (id: string, data: Record<string, any>) => {
    try {
      const result = await api.updateBooking(id, {
        guest_name: data.guestName,
        guest_phone: data.guestPhone,
        check_in_date: data.checkInDate,
        check_out_date: data.checkOutDate,
        nights: data.nights,
        room_number: data.roomNumber,
        notes: data.notes,
        prepayment: data.prepayment,
      })
      setBookings(prev => prev.map(b => b.id === id ? mapBooking(result) : b))

      // Refresh rooms since room status may have changed
      const roomsData = await api.getRooms()
      setRooms(roomsData.map(mapRoom))
    } catch (err: any) {
      throw new Error(err.message || 'Bronni tahrirlashda xatolik')
    }
  }, [])

  const closeShift = useCallback(async (notes: string) => {
    if (!currentShift) return
    try {
      const result = await api.closeShift(currentShift.id, notes)

      const closedShift = mapShift(result)
      setShifts(prev => [closedShift, ...prev])
      setCurrentShift(null)
      localStorage.removeItem('samo_shift')
    } catch (err: any) {
      throw new Error(err.message || 'Smenani yopishda xatolik')
    }
  }, [currentShift, setCurrentShift])

  return (
    <DataContext.Provider value={{
      rooms, transactions, shifts, bookings, activeShifts, loading,
      updateRoom, addTransaction, deleteTransaction, editTransaction,
      addBooking, updateBooking, cancelBooking, checkInFromBooking, closeShift, refreshData,
    }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}
