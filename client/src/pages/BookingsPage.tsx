import { useState } from 'react'
import type { Booking } from '../types'
import { formatUZS } from '../types'
import { useData } from '../context/DataContext'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  CalendarCheck,
  Plus,
  Phone,
  XCircle,
  UserPlus,
  Calendar,
  Search,
  BedDouble,
  Pencil,
  Banknote,
} from 'lucide-react'

export default function BookingsPage() {
  const { rooms, bookings, addBooking, updateBooking, cancelBooking, checkInFromBooking } = useData()
  const [showAdd, setShowAdd] = useState(false)
  const [showCheckIn, setShowCheckIn] = useState<Booking | null>(null)
  const [showEdit, setShowEdit] = useState<Booking | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'checked_in' | 'cancelled'>('all')

  // New booking form
  const [bRoom, setBRoom] = useState('')
  const [bName, setBName] = useState('')
  const [bPhone, setBPhone] = useState('')
  const [bCheckIn, setBCheckIn] = useState('')
  const [bNights, setBNights] = useState('1')
  const [bNotes, setBNotes] = useState('')
  const [bPrepayment, setBPrepayment] = useState('')

  // Edit booking form
  const [eName, setEName] = useState('')
  const [ePhone, setEPhone] = useState('')
  const [eCheckIn, setECheckIn] = useState('')
  const [eNights, setENights] = useState('1')
  const [eRoom, setERoom] = useState('')
  const [eNotes, setENotes] = useState('')
  const [ePrepayment, setEPrepayment] = useState('')

  // Check-in from booking
  const [ciPassport, setCiPassport] = useState('')
  const [ciNights, setCiNights] = useState('1')
  const [ciPrice, setCiPrice] = useState('')
  const [ciDate, setCiDate] = useState(() => new Date().toISOString().split('T')[0])

  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [cancelConfirm, setCancelConfirm] = useState<string | null>(null)

  const availableRooms = rooms.filter(r => r.status === 'available')

  const filtered = bookings.filter(b => {
    if (filterStatus !== 'all' && b.status !== filterStatus) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      if (!b.guestName.toLowerCase().includes(q) && !b.guestPhone.includes(q) && !b.roomNumber.includes(q)) return false
    }
    return true
  })

  const handleAddBooking = async () => {
    if (!bRoom || !bName.trim() || !bPhone.trim() || !bCheckIn) {
      setFormError('Barcha majburiy maydonlarni to\'ldiring')
      return
    }
    const today = new Date().toISOString().split('T')[0]
    if (bCheckIn < today) {
      setFormError('Kelish sanasi bugundan oldin bo\'lishi mumkin emas')
      return
    }
    const nightCount = Math.max(1, Number(bNights) || 1)

    setSubmitting(true)
    setFormError('')
    try {
      await addBooking({
        roomNumber: bRoom,
        guestName: bName.trim(),
        guestPhone: bPhone.trim(),
        checkInDate: bCheckIn,
        checkOutDate: '',
        nights: nightCount,
        notes: bNotes.trim(),
        prepayment: Number(bPrepayment) || 0,
      })
      setShowAdd(false)
      setBRoom(''); setBName(''); setBPhone(''); setBCheckIn(''); setBNights('1'); setBNotes(''); setBPrepayment('')
    } catch (err: any) {
      setFormError(err.message || 'Bron qilishda xatolik')
    } finally {
      setSubmitting(false)
    }
  }

  const openEdit = (booking: Booking) => {
    setShowEdit(booking)
    setEName(booking.guestName)
    setEPhone(booking.guestPhone)
    setECheckIn(booking.checkInDate)
    setENights(String(booking.nights))
    setERoom(booking.roomNumber)
    setENotes(booking.notes)
    setEPrepayment(String(booking.prepayment || ''))
    setFormError('')
  }

  const handleEditBooking = async () => {
    if (!showEdit) return
    if (!eName.trim() || !ePhone.trim() || !eCheckIn) {
      setFormError('Barcha majburiy maydonlarni to\'ldiring')
      return
    }

    setSubmitting(true)
    setFormError('')
    try {
      await updateBooking(showEdit.id, {
        guestName: eName.trim(),
        guestPhone: ePhone.trim(),
        checkInDate: eCheckIn,
        nights: Math.max(1, Number(eNights) || 1),
        roomNumber: eRoom !== showEdit.roomNumber ? eRoom : undefined,
        notes: eNotes.trim(),
        prepayment: Number(ePrepayment) || 0,
      })
      setShowEdit(null)
    } catch (err: any) {
      setFormError(err.message || 'Tahrirlashda xatolik')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCheckIn = async () => {
    if (!showCheckIn) return
    const price = Number(ciPrice) || 0
    if (price <= 0) {
      setFormError('Narx 0 dan katta bo\'lishi kerak')
      return
    }

    setSubmitting(true)
    setFormError('')
    try {
      const now = new Date()
      const timeStr = `T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
      const fullDate = ciDate + timeStr
      await checkInFromBooking(showCheckIn.id, ciPassport.trim(), Number(ciNights) || 1, fullDate, price)
      setShowCheckIn(null)
      setCiPassport(''); setCiNights('1'); setCiPrice(''); setCiDate(new Date().toISOString().split('T')[0])
    } catch (err: any) {
      setFormError(err.message || 'Joylashtirishda xatolik')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = async (id: string) => {
    try {
      await cancelBooking(id)
      setCancelConfirm(null)
    } catch (err: any) {
      alert(err.message || 'Bekor qilishda xatolik')
      setCancelConfirm(null)
    }
  }

  const statusConfig = {
    active: { label: 'Faol', bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
    checked_in: { label: 'Joylashgan', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
    cancelled: { label: 'Bekor', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
  }

  const activeCount = bookings.filter(b => b.status === 'active').length

  // Available rooms for edit (current room + available rooms)
  const editAvailableRooms = showEdit
    ? rooms.filter(r => r.status === 'available' || r.number === showEdit.roomNumber)
    : []

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "'Georgia', serif" }}>Bronlar</h2>
          <p className="text-white/30 text-sm mt-1">{activeCount} ta faol bron</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition-all text-sm"
        >
          <Plus className="w-4 h-4" />
          Yangi bron
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="w-4 h-4 text-white/20 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Ism, telefon yoki xona..."
            className="w-full bg-[#161923] border border-white/[0.06] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/30"
          />
        </div>
        {(['all', 'active', 'checked_in', 'cancelled'] as const).map(s => (
          <button
            key={s}
            type="button"
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterStatus === s
                ? s === 'all' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                : `${statusConfig[s].bg} ${statusConfig[s].text} border ${statusConfig[s].border}`
                : 'bg-white/[0.03] text-white/40 border border-white/[0.06]'
            }`}
          >
            {s === 'all' ? 'Barchasi' : statusConfig[s].label}
          </button>
        ))}
      </div>

      {/* Bookings list */}
      {filtered.length === 0 ? (
        <div className="bg-[#161923] rounded-2xl border border-white/[0.06] p-12 text-center">
          <CalendarCheck className="w-12 h-12 text-white/10 mx-auto mb-4" />
          <p className="text-white/30 text-sm">Bronlar topilmadi</p>
          <p className="text-white/15 text-xs mt-1">Yangi bron qo'shish uchun yuqoridagi tugmani bosing</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(booking => {
            const sc = statusConfig[booking.status]
            return (
              <div key={booking.id} className="bg-[#161923] rounded-2xl border border-white/[0.06] p-5 hover:border-white/10 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`w-11 h-11 rounded-xl ${sc.bg} border ${sc.border} flex items-center justify-center shrink-0`}>
                      <CalendarCheck className={`w-5 h-5 ${sc.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">{booking.guestName}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-md ${sc.bg} ${sc.text} font-medium`}>{sc.label}</span>
                        {booking.prepayment > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 font-medium flex items-center gap-1">
                            <Banknote className="w-3 h-3" />
                            {formatUZS(booking.prepayment)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap text-xs text-white/35">
                        <span className="flex items-center gap-1"><BedDouble className="w-3 h-3" />{booking.roomNumber}-xona</span>
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{booking.guestPhone}</span>
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{booking.checkInDate}</span>
                        <span>{booking.nights} kecha</span>
                      </div>
                      {booking.notes && (
                        <p className="text-[11px] text-white/20 mt-1.5 italic">{booking.notes}</p>
                      )}
                      <p className="text-[10px] text-white/15 mt-1">
                        {booking.createdBy} tomonidan — {new Date(booking.createdAt).toLocaleString('uz-UZ')}
                      </p>
                    </div>
                  </div>

                  {booking.status === 'active' && (
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <button
                        type="button"
                        onClick={() => openEdit(booking)}
                        className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 px-3 py-2 rounded-xl text-xs font-medium hover:bg-amber-500/20 transition-all"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Tahrirlash
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCheckIn(booking)
                          setCiNights(String(booking.nights))
                          const room = rooms.find(r => r.number === booking.roomNumber)
                          const totalPrice = (room?.pricePerNight || 300000) * (booking.nights || 1)
                          setCiPrice(String(Math.max(0, totalPrice - (booking.prepayment || 0))))
                          setFormError('')
                        }}
                        className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-2 rounded-xl text-xs font-medium hover:bg-emerald-500/20 transition-all"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        Joylashtirish
                      </button>
                      {cancelConfirm === booking.id ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-red-400/70">Ishonchingiz kommi?</span>
                          <button
                            type="button"
                            onClick={() => handleCancel(booking.id)}
                            className="px-2.5 py-1.5 bg-red-500/15 text-red-400 rounded-lg text-xs font-medium border border-red-500/20"
                          >
                            Ha
                          </button>
                          <button
                            type="button"
                            onClick={() => setCancelConfirm(null)}
                            className="px-2.5 py-1.5 bg-white/[0.05] text-white/40 rounded-lg text-xs font-medium border border-white/[0.06]"
                          >
                            Yo'q
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setCancelConfirm(booking.id)}
                          className="flex items-center gap-1.5 bg-red-500/5 border border-red-500/15 text-red-400/70 px-3 py-2 rounded-xl text-xs font-medium hover:bg-red-500/10 hover:text-red-400 transition-all"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Bekor
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add booking dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="bg-[#1a1d2a] border-white/[0.08] text-white max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-purple-400" />
              Yangi bron
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {/* Room select */}
            <div>
              <label className="text-[11px] text-white/40 uppercase tracking-wider font-medium block mb-1.5">Xona *</label>
              {availableRooms.length === 0 ? (
                <p className="text-xs text-red-400/70">Bo'sh xona yo'q</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {availableRooms.map(rm => (
                    <button
                      key={rm.id}
                      type="button"
                      onClick={() => setBRoom(rm.number)}
                      className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                        bRoom === rm.number
                          ? 'bg-purple-500/15 text-purple-400 border border-purple-500/20'
                          : 'bg-white/[0.03] text-white/40 border border-white/[0.06]'
                      }`}
                    >
                      {rm.number}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="text-[11px] text-white/40 uppercase tracking-wider font-medium block mb-1.5">Mehmon ismi *</label>
              <input type="text" value={bName} onChange={e => setBName(e.target.value)} placeholder="To'liq ism"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/40" />
            </div>

            <div>
              <label className="text-[11px] text-white/40 uppercase tracking-wider font-medium block mb-1.5">Telefon *</label>
              <input type="text" value={bPhone} onChange={e => setBPhone(e.target.value)} placeholder="+998 90 123 45 67"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/40" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-white/40 uppercase tracking-wider font-medium block mb-1.5">Kelish sanasi *</label>
                <input type="date" value={bCheckIn} onChange={e => setBCheckIn(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/40" />
              </div>
              <div>
                <label className="text-[11px] text-white/40 uppercase tracking-wider font-medium block mb-1.5">Necha kecha</label>
                <input type="number" min="1" value={bNights} onChange={e => setBNights(e.target.value)} placeholder="1"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/40" />
              </div>
            </div>

            <div>
              <label className="text-[11px] text-white/40 uppercase tracking-wider font-medium block mb-1.5">Oldindan to'lov (ixtiyoriy)</label>
              <input type="number" min="0" value={bPrepayment} onChange={e => setBPrepayment(e.target.value)} placeholder="0"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/40" />
            </div>

            <div>
              <label className="text-[11px] text-white/40 uppercase tracking-wider font-medium block mb-1.5">Izoh</label>
              <textarea value={bNotes} onChange={e => setBNotes(e.target.value)} placeholder="Qo'shimcha ma'lumot..."
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/40 resize-none h-16" />
            </div>

            {formError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 text-sm text-red-400">
                {formError}
              </div>
            )}
            <button
              type="button"
              onClick={handleAddBooking}
              disabled={submitting}
              className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold py-3 rounded-xl shadow-lg shadow-purple-500/20 text-sm disabled:opacity-50"
            >
              {submitting ? 'Bron qilinmoqda...' : 'Bron qilish'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit booking dialog */}
      <Dialog open={!!showEdit} onOpenChange={() => setShowEdit(null)}>
        <DialogContent className="bg-[#1a1d2a] border-white/[0.08] text-white max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-amber-400" />
              Bronni tahrirlash
            </DialogTitle>
          </DialogHeader>
          {showEdit && (
            <div className="space-y-4 mt-2">
              <div>
                <label className="text-[11px] text-white/40 uppercase tracking-wider font-medium block mb-1.5">Xona</label>
                <div className="flex flex-wrap gap-1.5">
                  {editAvailableRooms.map(rm => (
                    <button
                      key={rm.id}
                      type="button"
                      onClick={() => setERoom(rm.number)}
                      className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                        eRoom === rm.number
                          ? 'bg-purple-500/15 text-purple-400 border border-purple-500/20'
                          : 'bg-white/[0.03] text-white/40 border border-white/[0.06]'
                      }`}
                    >
                      {rm.number}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] text-white/40 uppercase tracking-wider font-medium block mb-1.5">Mehmon ismi *</label>
                <input type="text" value={eName} onChange={e => setEName(e.target.value)} placeholder="To'liq ism"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/40" />
              </div>

              <div>
                <label className="text-[11px] text-white/40 uppercase tracking-wider font-medium block mb-1.5">Telefon *</label>
                <input type="text" value={ePhone} onChange={e => setEPhone(e.target.value)} placeholder="+998 90 123 45 67"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/40" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-white/40 uppercase tracking-wider font-medium block mb-1.5">Kelish sanasi *</label>
                  <input type="date" value={eCheckIn} onChange={e => setECheckIn(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/40" />
                </div>
                <div>
                  <label className="text-[11px] text-white/40 uppercase tracking-wider font-medium block mb-1.5">Necha kecha</label>
                  <input type="number" min="1" value={eNights} onChange={e => setENights(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/40" />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-white/40 uppercase tracking-wider font-medium block mb-1.5">Oldindan to'lov</label>
                <input type="number" min="0" value={ePrepayment} onChange={e => setEPrepayment(e.target.value)} placeholder="0"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/40" />
              </div>

              <div>
                <label className="text-[11px] text-white/40 uppercase tracking-wider font-medium block mb-1.5">Izoh</label>
                <textarea value={eNotes} onChange={e => setENotes(e.target.value)} placeholder="Qo'shimcha ma'lumot..."
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/40 resize-none h-16" />
              </div>

              {formError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 text-sm text-red-400">
                  {formError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => { setShowEdit(null); setFormError('') }}
                  disabled={submitting}
                  className="py-3 rounded-xl border border-white/[0.08] text-white/50 hover:text-white/80 text-sm font-medium transition-colors disabled:opacity-50">
                  Bekor qilish
                </button>
                <button type="button" onClick={handleEditBooking}
                  disabled={submitting}
                  className="bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold py-3 rounded-xl shadow-lg shadow-amber-500/20 text-sm disabled:opacity-50">
                  {submitting ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Check-in from booking dialog */}
      <Dialog open={!!showCheckIn} onOpenChange={() => setShowCheckIn(null)}>
        <DialogContent className="bg-[#1a1d2a] border-white/[0.08] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-emerald-400" />
              Brondan joylashtirish
            </DialogTitle>
          </DialogHeader>
          {showCheckIn && (
            <div className="space-y-4 mt-2">
              <div className="bg-purple-500/5 border border-purple-500/10 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-white/30">Mehmon:</span>
                  <span className="text-white/70 font-medium">{showCheckIn.guestName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/30">Telefon:</span>
                  <span className="text-white/70">{showCheckIn.guestPhone}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/30">Xona:</span>
                  <span className="text-white/70">{showCheckIn.roomNumber}</span>
                </div>
                {showCheckIn.prepayment > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-white/30">Oldindan to'lov:</span>
                    <span className="text-amber-400 font-medium">{formatUZS(showCheckIn.prepayment)}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="text-[11px] text-white/40 uppercase tracking-wider font-medium block mb-1.5">Passport / ID</label>
                <input type="text" value={ciPassport} onChange={e => setCiPassport(e.target.value)} placeholder="AB1234567"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-emerald-500/40" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-white/40 uppercase tracking-wider font-medium block mb-1.5">Qoldiq to'lov</label>
                  <input type="number" value={ciPrice} onChange={e => setCiPrice(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-emerald-500/40" />
                </div>
                <div>
                  <label className="text-[11px] text-white/40 uppercase tracking-wider font-medium block mb-1.5">Necha kecha</label>
                  <input type="number" min="1" value={ciNights} onChange={e => setCiNights(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-emerald-500/40" />
                </div>
                <div>
                  <label className="text-[11px] text-white/40 uppercase tracking-wider font-medium block mb-1.5">Sana</label>
                  <input type="date" value={ciDate} onChange={e => setCiDate(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/40" />
                </div>
              </div>

              {showCheckIn.prepayment > 0 && (
                <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3 text-xs text-amber-400/70">
                  Oldindan to'lov: {formatUZS(showCheckIn.prepayment)} — qoldiq narxdan ayirilgan
                </div>
              )}

              {formError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 text-sm text-red-400">
                  {formError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => { setShowCheckIn(null); setFormError('') }}
                  disabled={submitting}
                  className="py-3 rounded-xl border border-white/[0.08] text-white/50 hover:text-white/80 text-sm font-medium transition-colors disabled:opacity-50">
                  Bekor qilish
                </button>
                <button type="button" onClick={handleCheckIn}
                  disabled={submitting}
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold py-3 rounded-xl shadow-lg shadow-emerald-500/20 text-sm disabled:opacity-50">
                  {submitting ? 'Joylashtirilmoqda...' : 'Joylashtirish'}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
