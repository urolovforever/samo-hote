import { useState } from 'react'
import type { Room, RoomStatus } from '../types'
import { formatUZS, todayTashkent, nowTimeTashkent, formatDateTashkent } from '../types'
import { useData } from '../context/DataContext'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  BedDouble,
  DoorOpen,
  Sparkles,
  Wrench,
  UserPlus,
  LogOut as CheckOutIcon,
  Filter,
  CalendarCheck,
  Plus,
  Trash2,
  CalendarPlus,
} from 'lucide-react'

const STATUS_LABELS: Record<RoomStatus, string> = {
  available: "Bo'sh",
  occupied: 'Band',
  cleaning: 'Tozalanmoqda',
  maintenance: "Ta'mirda",
  booked: 'Bron',
}

const STATUS_STYLES: Record<RoomStatus, { bg: string; text: string; border: string; icon: React.ElementType }> = {
  available: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', icon: DoorOpen },
  occupied: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', icon: BedDouble },
  cleaning: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', icon: Sparkles },
  maintenance: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', icon: Wrench },
  booked: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20', icon: CalendarCheck },
}

interface ExtraCharge {
  description: string
  amount: string
  type: 'income' | 'expense'
}

export default function RoomsPage() {
  const { rooms, updateRoom, addTransaction } = useData()
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [dialogMode, setDialogMode] = useState<'checkin' | 'checkout' | 'status' | 'extend' | null>(null)
  const [filterFloor, setFilterFloor] = useState<number | null>(null)
  const [filterStatus, setFilterStatus] = useState<RoomStatus | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Check-in form state
  const [guestName, setGuestName] = useState('')
  const [guestPassport, setGuestPassport] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [priceOverride, setPriceOverride] = useState('')
  const [roomNotes, setRoomNotes] = useState('')
  const [nights, setNights] = useState('1')
  const [txDate, setTxDate] = useState(() => todayTashkent())

  // Extra charges for checkout
  const [extraCharges, setExtraCharges] = useState<ExtraCharge[]>([])

  // Extend stay
  const [extendNights, setExtendNights] = useState('1')
  const [extendPayment, setExtendPayment] = useState('')

  const filtered = rooms.filter(r => {
    if (filterFloor && r.floor !== filterFloor) return false
    if (filterStatus && r.status !== filterStatus) return false
    return true
  })

  const openCheckIn = (room: Room) => {
    setSelectedRoom(room)
    setDialogMode('checkin')
    setGuestName('')
    setGuestPassport('')
    setGuestPhone('')
    setPriceOverride(String(room.pricePerNight || 300000))
    setRoomNotes('')
    setNights('1')
    setTxDate(todayTashkent())
    setError('')
  }

  const openCheckOut = (room: Room) => {
    setSelectedRoom(room)
    setDialogMode('checkout')
    setExtraCharges([])
    setError('')
  }

  const openExtend = (room: Room) => {
    setSelectedRoom(room)
    setDialogMode('extend')
    setExtendNights('1')
    setExtendPayment(String(room.pricePerNight || 300000))
    setError('')
  }

  const openStatus = (room: Room) => {
    setSelectedRoom(room)
    setDialogMode('status')
    setError('')
  }

  const addExtraCharge = () => {
    setExtraCharges(prev => [...prev, { description: '', amount: '', type: 'income' }])
  }

  const removeExtraCharge = (index: number) => {
    setExtraCharges(prev => prev.filter((_, i) => i !== index))
  }

  const updateExtraCharge = (index: number, field: keyof ExtraCharge, value: string) => {
    setExtraCharges(prev => prev.map((c, i) => i === index ? { ...c, [field]: value } : c))
  }

  const handleCheckIn = async () => {
    if (!selectedRoom || !guestName.trim()) return
    const nightCount = Math.max(1, Number(nights) || 1)
    const total = Number(priceOverride) || 0

    if (total <= 0) {
      setError('Narx 0 dan katta bo\'lishi kerak')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const timeStr = `T${nowTimeTashkent()}`
      const fullDate = txDate + timeStr

      const [y, m, d] = txDate.split('-').map(Number)
      const checkInDate = new Date(y, m - 1, d + nightCount)
      const checkOutDate = `${checkInDate.getFullYear()}-${String(checkInDate.getMonth() + 1).padStart(2, '0')}-${String(checkInDate.getDate()).padStart(2, '0')}`

      await updateRoom(selectedRoom.id, {
        status: 'occupied',
        guestName: guestName.trim(),
        guestPassport: guestPassport.trim(),
        guestPhone: guestPhone.trim(),
        checkIn: fullDate,
        checkOut: checkOutDate,
        notes: roomNotes.trim(),
      })

      await addTransaction({
        date: fullDate,
        type: 'income',
        category: 'Xona to\'lovi',
        amount: total,
        description: `${selectedRoom.number}-xona, ${guestName.trim()}, ${nightCount} kecha`,
        roomNumber: selectedRoom.number,
      })

      closeDialog()
    } catch (err: any) {
      setError(err.message || 'Xatolik yuz berdi')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCheckOut = async () => {
    if (!selectedRoom) return
    setSubmitting(true)
    setError('')
    try {
      // Create extra charge transactions first
      for (const charge of extraCharges) {
        const amt = Number(charge.amount)
        if (amt > 0 && charge.description.trim()) {
          await addTransaction({
            date: todayTashkent() + 'T' + nowTimeTashkent(),
            type: charge.type,
            category: charge.type === 'income' ? 'Qo\'shimcha xizmat' : 'Boshqa chiqim',
            amount: amt,
            description: `${selectedRoom.number}-xona: ${charge.description.trim()}`,
            roomNumber: selectedRoom.number,
          })
        }
      }

      await updateRoom(selectedRoom.id, {
        status: 'cleaning',
        guestName: undefined,
        guestPassport: undefined,
        guestPhone: undefined,
        checkIn: undefined,
        checkOut: undefined,
        notes: undefined,
      })
      closeDialog()
    } catch (err: any) {
      setError(err.message || 'Xatolik yuz berdi')
    } finally {
      setSubmitting(false)
    }
  }

  const handleExtend = async () => {
    if (!selectedRoom) return
    const addNights = Math.max(1, Number(extendNights) || 1)
    const payment = Number(extendPayment) || 0

    setSubmitting(true)
    setError('')
    try {
      // Calculate new checkout date
      const coDate = selectedRoom.checkOut || todayTashkent()
      const [cy, cm, cd] = coDate.split('-').map(Number)
      const newCo = new Date(cy, cm - 1, cd + addNights)
      const newCheckOut = `${newCo.getFullYear()}-${String(newCo.getMonth() + 1).padStart(2, '0')}-${String(newCo.getDate()).padStart(2, '0')}`

      await updateRoom(selectedRoom.id, {
        checkOut: newCheckOut,
      })

      // Add payment transaction if specified
      if (payment > 0) {
        await addTransaction({
          date: todayTashkent() + 'T' + nowTimeTashkent(),
          type: 'income',
          category: 'Xona to\'lovi',
          amount: payment,
          description: `${selectedRoom.number}-xona, ${selectedRoom.guestName}, muddat uzaytirish +${addNights} kecha`,
          roomNumber: selectedRoom.number,
        })
      }

      closeDialog()
    } catch (err: any) {
      setError(err.message || 'Xatolik yuz berdi')
    } finally {
      setSubmitting(false)
    }
  }

  const handleStatusChange = async (status: RoomStatus) => {
    if (!selectedRoom) return
    setSubmitting(true)
    setError('')
    try {
      await updateRoom(selectedRoom.id, { status })
      closeDialog()
    } catch (err: any) {
      setError(err.message || 'Xatolik yuz berdi')
    } finally {
      setSubmitting(false)
    }
  }

  const closeDialog = () => {
    setSelectedRoom(null)
    setDialogMode(null)
    setError('')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ fontFamily: "'Georgia', serif" }}>Xonalar</h2>
          <p className="text-white/30 text-xs sm:text-sm mt-1">Barcha xonalarni boshqaring</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <div className="flex items-center gap-1.5 text-white/30 text-xs shrink-0">
            <Filter className="w-3.5 h-3.5" />
          </div>
          {[2, 3, 4].map(f => (
            <button
              key={f}
              onClick={() => setFilterFloor(filterFloor === f ? null : f)}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-all shrink-0 ${
                filterFloor === f
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                  : 'bg-white/[0.03] text-white/40 border border-white/[0.06] hover:text-white/60'
              }`}
            >
              {f}-qavat
            </button>
          ))}
          <span className="text-white/10 shrink-0 hidden sm:inline">|</span>
          {(Object.keys(STATUS_LABELS) as RoomStatus[]).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(filterStatus === s ? null : s)}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-all shrink-0 ${
                filterStatus === s
                  ? `${STATUS_STYLES[s].bg} ${STATUS_STYLES[s].text} border ${STATUS_STYLES[s].border}`
                  : 'bg-white/[0.03] text-white/40 border border-white/[0.06] hover:text-white/60'
              }`}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Rooms by floor */}
      {filtered.length === 0 && (filterFloor || filterStatus) && (
        <div className="bg-[#161923] rounded-2xl border border-white/[0.06] p-8 sm:p-12 text-center">
          <BedDouble className="w-10 h-10 sm:w-12 sm:h-12 text-white/10 mx-auto mb-3 sm:mb-4" />
          <p className="text-white/30 text-xs sm:text-sm">Filtrga mos xona topilmadi</p>
          <button
            onClick={() => { setFilterFloor(null); setFilterStatus(null) }}
            className="mt-3 text-xs text-amber-400/70 hover:text-amber-400 transition-colors"
          >
            Filtrlarni tozalash
          </button>
        </div>
      )}
      {[4, 3, 2].map(floor => {
        const floorRooms = filtered.filter(r => r.floor === floor)
        if (floorRooms.length === 0) return null
        return (
          <div key={floor}>
            <p className="text-[10px] text-white/20 uppercase tracking-[0.2em] mb-3 font-medium">
              {floor}-qavat
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
              {floorRooms.map(room => {
                const style = STATUS_STYLES[room.status]
                const Icon = style.icon
                return (
                  <div
                    key={room.id}
                    className={`${style.bg} border ${style.border} rounded-xl sm:rounded-2xl p-3 sm:p-4 hover:scale-[1.01] transition-all cursor-pointer group`}
                    onClick={() => {
                      if (room.status === 'available') openCheckIn(room)
                      else if (room.status === 'occupied') openCheckOut(room)
                      else openStatus(room)
                    }}
                  >
                    <div className="flex items-start justify-between mb-2 sm:mb-3">
                      <div className="flex items-center gap-2 sm:gap-2.5">
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl ${style.bg} border ${style.border} flex items-center justify-center`}>
                          <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${style.text}`} />
                        </div>
                        <div>
                          <p className="font-bold text-base sm:text-lg">{room.number}</p>
                          <p className={`text-[10px] sm:text-[11px] ${style.text} font-medium`}>{STATUS_LABELS[room.status]}</p>
                        </div>
                      </div>
                    </div>

                    {room.status === 'occupied' && room.guestName && (
                      <div className="bg-black/20 rounded-lg sm:rounded-xl p-2 sm:p-3 space-y-1 sm:space-y-1.5">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                            <span className="text-[9px] sm:text-[10px] font-bold text-blue-400">{room.guestName[0]}</span>
                          </div>
                          <p className="text-xs sm:text-sm font-medium truncate">{room.guestName}</p>
                        </div>
                        {room.checkIn && (
                          <p className="text-[9px] sm:text-[10px] text-white/25 pl-6 sm:pl-8">
                            Kirish: {formatDateTashkent(room.checkIn)}
                          </p>
                        )}
                        {room.checkOut && (
                          <p className="text-[9px] sm:text-[10px] text-white/25 pl-6 sm:pl-8">
                            Chiqish: {formatDateTashkent(room.checkOut)}
                          </p>
                        )}
                      </div>
                    )}

                    {room.status === 'available' && (
                      <div className="flex items-center gap-1.5 sm:gap-2 text-emerald-400/60 group-hover:text-emerald-400 transition-colors">
                        <UserPlus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        <span className="text-[10px] sm:text-xs">Joylashtirish</span>
                      </div>
                    )}
                    {room.status === 'occupied' && (
                      <div className="flex items-center gap-1.5 sm:gap-2 text-blue-400/60 group-hover:text-blue-400 transition-colors mt-1.5 sm:mt-2">
                        <CheckOutIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        <span className="text-[10px] sm:text-xs">Chiqarish</span>
                      </div>
                    )}
                    {room.status === 'booked' && (
                      <div className="bg-purple-500/5 rounded-lg p-1.5 sm:p-2 mt-1">
                        <div className="flex items-center gap-1.5 sm:gap-2 text-purple-400/70">
                          <CalendarCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                          <span className="text-[10px] sm:text-xs truncate">{room.guestName} — bron</span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Check-in Dialog */}
      <Dialog open={dialogMode === 'checkin'} onOpenChange={() => closeDialog()}>
        <DialogContent className="bg-[#1a1d2a] border-white/[0.08] text-white w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <UserPlus className="w-5 h-5 text-emerald-400 shrink-0" />
              {selectedRoom?.number}-xonaga joylashtirish
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4 mt-2">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-3 sm:px-4 py-2.5 text-xs sm:text-sm text-red-400">
                {error}
              </div>
            )}
            <Field label="Mehmon ismi *" value={guestName} onChange={setGuestName} placeholder="To'liq ism" />
            <Field label="Passport / ID" value={guestPassport} onChange={setGuestPassport} placeholder="AB1234567" />
            <Field label="Telefon" value={guestPhone} onChange={setGuestPhone} placeholder="+998 90 123 45 67" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="Umumiy narx" value={priceOverride} onChange={setPriceOverride} type="number" />
              <Field label="Necha kecha" value={nights} onChange={setNights} type="number" placeholder="1" min="1" />
              <Field label="Sana" value={txDate} onChange={setTxDate} type="date" />
            </div>
            {/* Total preview */}
            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] sm:text-xs text-white/40">Jami to'lov:</span>
                <span className="text-base sm:text-lg font-bold text-emerald-400">
                  {formatUZS(Number(priceOverride) || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] sm:text-xs text-white/40">Muddat:</span>
                <span className="text-[11px] sm:text-xs text-white/50">
                  {Math.max(1, Number(nights) || 1)} kecha — chiqish: {(() => {
                    const [yy, mm, dd] = txDate.split('-').map(Number)
                    const d = new Date(yy, mm - 1, dd + Math.max(1, Number(nights) || 1))
                    return formatDateTashkent(d)
                  })()}
                </span>
              </div>
            </div>
            <div>
              <label className="text-[11px] text-white/40 uppercase tracking-wider font-medium block mb-1.5">Izoh</label>
              <textarea
                value={roomNotes}
                onChange={e => setRoomNotes(e.target.value)}
                placeholder="Qo'shimcha ma'lumot..."
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/40 resize-none h-20"
              />
            </div>
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => { if (selectedRoom) { closeDialog(); openStatus(selectedRoom) } }}
                className="py-3 rounded-xl border border-white/[0.08] text-white/40 hover:text-white/70 text-xs font-medium transition-colors"
              >
                Holat
              </button>
              <button
                onClick={handleCheckIn}
                disabled={submitting || !guestName.trim()}
                className="col-span-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold py-3 rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all text-sm disabled:opacity-50"
              >
                {submitting ? 'Joylashtirilmoqda...' : 'Joylashtirish'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Check-out Dialog */}
      <Dialog open={dialogMode === 'checkout'} onOpenChange={() => closeDialog()}>
        <DialogContent className="bg-[#1a1d2a] border-white/[0.08] text-white w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <CheckOutIcon className="w-5 h-5 text-blue-400 shrink-0" />
              {selectedRoom?.number}-xonadan chiqarish
            </DialogTitle>
          </DialogHeader>
          {selectedRoom && (
            <div className="space-y-3 sm:space-y-4 mt-2">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-3 sm:px-4 py-2.5 text-xs sm:text-sm text-red-400">
                  {error}
                </div>
              )}
              <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-3 sm:p-4 space-y-2">
                <InfoRow label="Mehmon" value={selectedRoom.guestName || '-'} />
                <InfoRow label="Passport" value={selectedRoom.guestPassport || '-'} />
                <InfoRow label="Telefon" value={selectedRoom.guestPhone || '-'} />
                <InfoRow label="Kirish sanasi" value={selectedRoom.checkIn ? formatDateTashkent(selectedRoom.checkIn) : '-'} />
                <InfoRow label="Chiqish sanasi" value={selectedRoom.checkOut ? formatDateTashkent(selectedRoom.checkOut) : '-'} />
              </div>

              {/* Extra charges section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] text-white/40 uppercase tracking-wider font-medium">Qo'shimcha to'lovlar</label>
                  <button
                    type="button"
                    onClick={addExtraCharge}
                    className="flex items-center gap-1 text-[10px] text-amber-400/70 hover:text-amber-400 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    Qo'shish
                  </button>
                </div>
                {extraCharges.length > 0 && (
                  <div className="space-y-2">
                    {extraCharges.map((charge, i) => (
                      <div key={i} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <div className="flex items-center gap-2">
                          <select
                            value={charge.type}
                            onChange={e => updateExtraCharge(i, 'type', e.target.value)}
                            className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-2 text-xs text-white focus:outline-none w-20"
                          >
                            <option value="income">Kirim</option>
                            <option value="expense">Chiqim</option>
                          </select>
                          <input
                            type="text"
                            value={charge.description}
                            onChange={e => updateExtraCharge(i, 'description', e.target.value)}
                            placeholder="Tavsif"
                            className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={charge.amount}
                            onChange={e => updateExtraCharge(i, 'amount', e.target.value)}
                            placeholder="Summa"
                            className="flex-1 sm:w-24 sm:flex-none bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => removeExtraCharge(i)}
                            className="p-1.5 text-red-400/50 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <p className="text-[10px] sm:text-xs text-white/30 text-center">To'lov check-in paytida olingan. Xona "Tozalanmoqda" holatiga o'tadi.</p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={closeDialog}
                  disabled={submitting}
                  className="py-2.5 sm:py-3 rounded-xl border border-white/[0.08] text-white/50 hover:text-white/80 text-xs sm:text-sm font-medium transition-colors disabled:opacity-50"
                >
                  Bekor
                </button>
                <button
                  onClick={() => openExtend(selectedRoom)}
                  disabled={submitting}
                  className="py-2.5 sm:py-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs sm:text-sm font-medium hover:bg-purple-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  <CalendarPlus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span className="hidden sm:inline">Uzaytirish</span>
                  <span className="sm:hidden">+Kun</span>
                </button>
                <button
                  onClick={handleCheckOut}
                  disabled={submitting}
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold py-2.5 sm:py-3 rounded-xl shadow-lg shadow-blue-500/20 text-xs sm:text-sm disabled:opacity-50"
                >
                  {submitting ? '...' : 'Chiqarish'}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Extend stay dialog */}
      <Dialog open={dialogMode === 'extend'} onOpenChange={() => closeDialog()}>
        <DialogContent className="bg-[#1a1d2a] border-white/[0.08] text-white w-full max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <CalendarPlus className="w-5 h-5 text-purple-400 shrink-0" />
              Muddatni uzaytirish — {selectedRoom?.number}
            </DialogTitle>
          </DialogHeader>
          {selectedRoom && (
            <div className="space-y-3 sm:space-y-4 mt-2">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-3 sm:px-4 py-2.5 text-xs sm:text-sm text-red-400">
                  {error}
                </div>
              )}
              <div className="bg-purple-500/5 border border-purple-500/10 rounded-xl p-3 sm:p-4 space-y-2">
                <InfoRow label="Mehmon" value={selectedRoom.guestName || '-'} />
                <InfoRow label="Hozirgi chiqish" value={selectedRoom.checkOut ? formatDateTashkent(selectedRoom.checkOut) : '-'} />
              </div>

              <Field label="Qo'shimcha kechalar" value={extendNights} onChange={setExtendNights} type="number" min="1" />

              <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/40">Yangi chiqish sanasi:</span>
                  <span className="text-sm font-medium text-blue-400">
                    {(() => {
                      const co = selectedRoom.checkOut || todayTashkent()
                      const [yy, mm, dd] = co.split('-').map(Number)
                      const d = new Date(yy, mm - 1, dd + Math.max(1, Number(extendNights) || 1))
                      return formatDateTashkent(d)
                    })()}
                  </span>
                </div>
              </div>

              <Field label="To'lov summasi (ixtiyoriy)" value={extendPayment} onChange={setExtendPayment} type="number" placeholder="0" />

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={closeDialog}
                  disabled={submitting}
                  className="py-3 rounded-xl border border-white/[0.08] text-white/50 hover:text-white/80 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  Bekor qilish
                </button>
                <button
                  onClick={handleExtend}
                  disabled={submitting}
                  className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold py-3 rounded-xl shadow-lg shadow-purple-500/20 text-sm disabled:opacity-50"
                >
                  {submitting ? 'Saqlanmoqda...' : 'Uzaytirish'}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Status change dialog */}
      <Dialog open={dialogMode === 'status'} onOpenChange={() => closeDialog()}>
        <DialogContent className="bg-[#1a1d2a] border-white/[0.08] text-white w-full max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">{selectedRoom?.number}-xona holatini o'zgartirish</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-2">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-3 sm:px-4 py-2.5 text-xs sm:text-sm text-red-400">
                {error}
              </div>
            )}
            {(Object.keys(STATUS_LABELS) as RoomStatus[]).map(s => {
              const st = STATUS_STYLES[s]
              return (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  disabled={submitting}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl ${st.bg} border ${st.border} ${st.text} text-sm font-medium hover:scale-[1.02] transition-all disabled:opacity-50`}
                >
                  <st.icon className="w-4 h-4" />
                  {STATUS_LABELS[s]}
                </button>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text', min }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; min?: string
}) {
  return (
    <div>
      <label className="text-[10px] sm:text-[11px] text-white/40 uppercase tracking-wider font-medium block mb-1 sm:mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        min={min}
        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 sm:px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/40 transition-all"
      />
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center gap-2">
      <span className="text-[11px] sm:text-xs text-white/30 shrink-0">{label}</span>
      <span className="text-xs sm:text-sm text-white/70 text-right truncate">{value}</span>
    </div>
  )
}
