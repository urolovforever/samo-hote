import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { formatUZS, todayTashkent, formatDateTashkent, formatTimeTashkent } from '../types'
import {
  BedDouble,
  TrendingUp,
  TrendingDown,
  DoorOpen,
  Sparkles,
  Wrench,
  ArrowRight,
  Clock,
  CalendarCheck,
  AlertTriangle,
  AlertCircle,
  Bell,
  Info,
  LogOut as CheckOutIcon,
  User,
  Phone,
} from 'lucide-react'

export default function Dashboard() {
  const { rooms, transactions, bookings } = useData()
  const { currentShift } = useAuth()
  const navigate = useNavigate()

  const { occupied, available, cleaning, maintenance, booked } = useMemo(() => ({
    occupied: rooms.filter(r => r.status === 'occupied').length,
    available: rooms.filter(r => r.status === 'available').length,
    cleaning: rooms.filter(r => r.status === 'cleaning').length,
    maintenance: rooms.filter(r => r.status === 'maintenance').length,
    booked: rooms.filter(r => r.status === 'booked').length,
  }), [rooms])

  const { todayIncome, todayExpense } = useMemo(() => {
    const today = todayTashkent()
    const todayTx = transactions.filter(t => t.date.split('T')[0] === today)
    return {
      todayIncome: todayTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
      todayExpense: todayTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    }
  }, [transactions])

  const occupancyRate = rooms.length > 0 ? Math.round((occupied / rooms.length) * 100) : 0

  // Today's checkout rooms - detailed data for the section
  const { todayCheckoutRooms, overdueCheckoutRooms, tomorrowCheckoutRooms } = useMemo(() => {
    const today = todayTashkent()
    // Tomorrow
    const t = new Date()
    t.setDate(t.getDate() + 1)
    const tomorrow = t.toLocaleDateString('sv-SE', { timeZone: 'Asia/Tashkent' })
    return {
      todayCheckoutRooms: rooms.filter(r => r.status === 'occupied' && r.checkOut === today),
      overdueCheckoutRooms: rooms.filter(r => r.status === 'occupied' && r.checkOut && r.checkOut < today),
      tomorrowCheckoutRooms: rooms.filter(r => r.status === 'occupied' && r.checkOut === tomorrow),
    }
  }, [rooms])

  // Notifications
  const notifications = useMemo(() => {
    const today = todayTashkent()
    const items: { type: 'red' | 'yellow' | 'blue' | 'info'; message: string; path: string }[] = []

    // Red: Overdue checkout (checkOut date passed)
    const overdueRooms = rooms.filter(r => r.status === 'occupied' && r.checkOut && r.checkOut < today)
    if (overdueRooms.length > 0) {
      items.push({
        type: 'red',
        message: `${overdueRooms.length} ta xonada chiqish muddati o'tgan (${overdueRooms.map(r => r.number).join(', ')})`,
        path: '/rooms',
      })
    }

    // Yellow: Today's checkouts
    const todayCheckouts = rooms.filter(r => r.status === 'occupied' && r.checkOut === today)
    if (todayCheckouts.length > 0) {
      items.push({
        type: 'yellow',
        message: `${todayCheckouts.length} ta xonada bugun chiqish (${todayCheckouts.map(r => r.number).join(', ')})`,
        path: '/rooms',
      })
    }

    // Blue: Today's expected arrivals
    const todayArrivals = bookings.filter(b => b.status === 'active' && b.checkInDate === today)
    if (todayArrivals.length > 0) {
      items.push({
        type: 'blue',
        message: `${todayArrivals.length} ta mehmon bugun kelishi kutilmoqda`,
        path: '/bookings',
      })
    }

    // Info: Cleaning rooms (if > 2)
    if (cleaning > 2) {
      items.push({
        type: 'info',
        message: `${cleaning} ta xona tozalanmoqda`,
        path: '/rooms',
      })
    }

    return items
  }, [rooms, bookings, cleaning])

  const statusColors: Record<string, { bg: string; text: string; border: string }> = {
    available: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
    occupied: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
    cleaning: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
    maintenance: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
    booked: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  }

  const notifStyles = {
    red: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', icon: AlertTriangle },
    yellow: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', icon: AlertCircle },
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', icon: Bell },
    info: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400', icon: Info },
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "'Georgia', serif" }}>
            Bosh sahifa
          </h2>
          <p className="text-white/30 text-sm mt-1">Bugungi holat — {formatDateTashkent(new Date(), { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.map((notif, i) => {
            const ns = notifStyles[notif.type]
            const NIcon = ns.icon
            return (
              <button
                key={i}
                onClick={() => navigate(notif.path)}
                className={`w-full flex items-center gap-3 ${ns.bg} border ${ns.border} rounded-xl px-4 py-3 text-left hover:scale-[1.01] transition-transform`}
              >
                <NIcon className={`w-4 h-4 ${ns.text} shrink-0`} />
                <span className={`text-sm ${ns.text} font-medium line-clamp-2`}>{notif.message}</span>
                <ArrowRight className={`w-3.5 h-3.5 ${ns.text} ml-auto shrink-0 opacity-50`} />
              </button>
            )
          })}
        </div>
      )}

      {/* Today's checkouts section - always visible */}
      <div className="bg-[#161923] rounded-2xl border border-white/[0.06] p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              overdueCheckoutRooms.length > 0 ? 'bg-red-500/10 border border-red-500/20' : 'bg-amber-500/10 border border-amber-500/20'
            }`}>
              <CheckOutIcon className={`w-4 h-4 ${overdueCheckoutRooms.length > 0 ? 'text-red-400' : 'text-amber-400'}`} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white/80">Chiqishlar</h3>
              <p className="text-[10px] text-white/30">
                {overdueCheckoutRooms.length + todayCheckoutRooms.length + tomorrowCheckoutRooms.length > 0
                  ? `${overdueCheckoutRooms.length + todayCheckoutRooms.length + tomorrowCheckoutRooms.length} ta xona`
                  : 'Hozircha yo\'q'
                }
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/rooms')}
            className="text-amber-400/70 hover:text-amber-400 text-xs flex items-center gap-1 transition-colors"
          >
            Xonalar <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {overdueCheckoutRooms.length === 0 && todayCheckoutRooms.length === 0 && tomorrowCheckoutRooms.length === 0 ? (
          <div className="text-center py-4">
            <CheckOutIcon className="w-8 h-8 text-white/10 mx-auto mb-2" />
            <p className="text-xs text-white/25">Bugun va ertaga chiqadigan mehmonlar yo'q</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Overdue rooms first (red) */}
            {overdueCheckoutRooms.map(room => (
              <div
                key={room.id}
                onClick={() => navigate('/rooms')}
                className="flex items-center gap-3 bg-red-500/5 border border-red-500/15 rounded-xl px-3 sm:px-4 py-3 cursor-pointer hover:bg-red-500/10 transition-colors"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                  <span className="text-sm sm:text-base font-bold text-red-400">{room.number}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3 h-3 text-red-400/60 shrink-0" />
                    <p className="text-sm font-medium text-white/80 truncate">{room.guestName || '-'}</p>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    {room.guestPhone && (
                      <div className="flex items-center gap-1">
                        <Phone className="w-2.5 h-2.5 text-white/20" />
                        <span className="text-[10px] text-white/30">{room.guestPhone}</span>
                      </div>
                    )}
                    <span className="text-[10px] text-red-400 font-medium">
                      Muddati o'tgan: {room.checkOut ? formatDateTashkent(room.checkOut) : ''}
                    </span>
                  </div>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-2 py-1 shrink-0">
                  <span className="text-[10px] font-semibold text-red-400">KECHIKKAN</span>
                </div>
              </div>
            ))}

            {/* Today's checkout rooms (amber) */}
            {todayCheckoutRooms.map(room => (
              <div
                key={room.id}
                onClick={() => navigate('/rooms')}
                className="flex items-center gap-3 bg-amber-500/5 border border-amber-500/15 rounded-xl px-3 sm:px-4 py-3 cursor-pointer hover:bg-amber-500/10 transition-colors"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                  <span className="text-sm sm:text-base font-bold text-amber-400">{room.number}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3 h-3 text-amber-400/60 shrink-0" />
                    <p className="text-sm font-medium text-white/80 truncate">{room.guestName || '-'}</p>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    {room.guestPhone && (
                      <div className="flex items-center gap-1">
                        <Phone className="w-2.5 h-2.5 text-white/20" />
                        <span className="text-[10px] text-white/30">{room.guestPhone}</span>
                      </div>
                    )}
                    {room.checkIn && (
                      <span className="text-[10px] text-white/30">
                        Kirgan: {formatDateTashkent(room.checkIn)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-2 py-1 shrink-0">
                  <span className="text-[10px] font-semibold text-amber-400">BUGUN</span>
                </div>
              </div>
            ))}

            {/* Tomorrow's checkout rooms (blue) */}
            {tomorrowCheckoutRooms.map(room => (
              <div
                key={room.id}
                onClick={() => navigate('/rooms')}
                className="flex items-center gap-3 bg-blue-500/5 border border-blue-500/15 rounded-xl px-3 sm:px-4 py-3 cursor-pointer hover:bg-blue-500/10 transition-colors"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                  <span className="text-sm sm:text-base font-bold text-blue-400">{room.number}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3 h-3 text-blue-400/60 shrink-0" />
                    <p className="text-sm font-medium text-white/80 truncate">{room.guestName || '-'}</p>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    {room.guestPhone && (
                      <div className="flex items-center gap-1">
                        <Phone className="w-2.5 h-2.5 text-white/20" />
                        <span className="text-[10px] text-white/30">{room.guestPhone}</span>
                      </div>
                    )}
                    {room.checkIn && (
                      <span className="text-[10px] text-white/30">
                        Kirgan: {formatDateTashkent(room.checkIn)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-2 py-1 shrink-0">
                  <span className="text-[10px] font-semibold text-blue-400">ERTAGA</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard icon={DoorOpen} label="Bo'sh" value={available} color="emerald" onClick={() => navigate('/rooms')} />
        <StatCard icon={BedDouble} label="Band" value={occupied} color="blue" onClick={() => navigate('/rooms')} />
        <StatCard icon={TrendingUp} label="Bugungi kirim" value={formatUZS(todayIncome)} color="amber" onClick={() => navigate('/finance')} />
        <StatCard icon={TrendingDown} label="Bugungi chiqim" value={formatUZS(todayExpense)} color="red" onClick={() => navigate('/finance')} />
      </div>

      {/* Occupancy + Current Shift */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Occupancy */}
        <div className="bg-[#161923] rounded-2xl border border-white/[0.06] p-6">
          <h3 className="text-sm font-medium text-white/50 mb-4">Bandlik darajasi</h3>
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6">
            <div className="relative w-28 h-28">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                <circle
                  cx="50" cy="50" r="42" fill="none"
                  stroke="url(#occGrad)" strokeWidth="8"
                  strokeDasharray={`${occupancyRate * 2.64} 264`}
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="occGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#ea580c" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold">{occupancyRate}%</span>
              </div>
            </div>
            <div className="flex-1 space-y-2 w-full">
              <MiniStat icon={DoorOpen} label="Bo'sh" value={available} colors={statusColors.available} />
              <MiniStat icon={BedDouble} label="Band" value={occupied} colors={statusColors.occupied} />
              <MiniStat icon={Sparkles} label="Tozalanmoqda" value={cleaning} colors={statusColors.cleaning} />
              <MiniStat icon={Wrench} label="Ta'mirda" value={maintenance} colors={statusColors.maintenance} />
              <MiniStat icon={CalendarCheck} label="Bron" value={booked} colors={statusColors.booked} />
            </div>
          </div>
        </div>

        {/* Current shift */}
        <div className="bg-[#161923] rounded-2xl border border-white/[0.06] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-white/50">Joriy smena</h3>
            <button
              onClick={() => navigate('/shift')}
              className="text-amber-400/70 hover:text-amber-400 text-xs flex items-center gap-1 transition-colors"
            >
              Batafsil <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {currentShift ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-sm font-bold">
                  {currentShift.admin.split(' ').map(w => w[0]).join('')}
                </div>
                <div>
                  <p className="font-medium">{currentShift.admin}</p>
                  <div className="flex items-center gap-1.5 text-white/30 text-xs">
                    <Clock className="w-3 h-3" />
                    {formatTimeTashkent(currentShift.startTime)} dan boshlab
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3">
                  <p className="text-[10px] text-emerald-400/60 uppercase tracking-wider mb-1">Kirim</p>
                  <p className="text-lg font-bold text-emerald-400">{formatUZS(currentShift.totalIncome)}</p>
                </div>
                <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-3">
                  <p className="text-[10px] text-red-400/60 uppercase tracking-wider mb-1">Chiqim</p>
                  <p className="text-lg font-bold text-red-400">{formatUZS(currentShift.totalExpense)}</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-white/20 text-sm">Smena boshlanmagan</p>
          )}
        </div>
      </div>

      {/* Room floor map */}
      <div className="bg-[#161923] rounded-2xl border border-white/[0.06] p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-medium text-white/50">Xonalar xaritasi</h3>
          <button
            onClick={() => navigate('/rooms')}
            className="text-amber-400/70 hover:text-amber-400 text-xs flex items-center gap-1 transition-colors"
          >
            Barchasini ko'rish <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        {[4, 3, 2].map(floor => (
          <div key={floor} className="mb-4 last:mb-0">
            <p className="text-[10px] text-white/25 uppercase tracking-wider mb-2">{floor}-qavat</p>
            <div className="flex gap-2 flex-wrap">
              {rooms.filter(r => r.floor === floor).map(room => {
                const sc = statusColors[room.status]
                return (
                  <div
                    key={room.id}
                    className={`${sc.bg} border ${sc.border} rounded-xl px-4 py-2.5 min-w-[80px] text-center cursor-pointer hover:scale-105 transition-transform`}
                    onClick={() => navigate('/rooms')}
                  >
                    <p className={`font-bold text-sm ${sc.text}`}>{room.number}</p>
                    <p className="text-[9px] text-white/30 mt-0.5">
                      {room.status === 'available' && "Bo'sh"}
                      {room.status === 'occupied' && 'Band'}
                      {room.status === 'cleaning' && 'Tozalanmoqda'}
                      {room.status === 'maintenance' && "Ta'mirda"}
                      {room.status === 'booked' && 'Bron'}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Recent transactions */}
      {transactions.length > 0 && (
        <div className="bg-[#161923] rounded-2xl border border-white/[0.06] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-white/50">So'nggi operatsiyalar</h3>
            <button
              onClick={() => navigate('/finance')}
              className="text-amber-400/70 hover:text-amber-400 text-xs flex items-center gap-1 transition-colors"
            >
              Barchasini ko'rish <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2">
            {transactions.slice(0, 5).map(tx => (
              <div key={tx.id} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    tx.type === 'income' ? 'bg-emerald-500/10' : 'bg-red-500/10'
                  }`}>
                    {tx.type === 'income' ? (
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium truncate">{tx.description}</p>
                    <p className="text-[11px] text-white/25 truncate">{tx.category} • {tx.admin}</p>
                  </div>
                </div>
                <span className={`font-semibold text-sm ${tx.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {tx.type === 'income' ? '+' : '-'}{formatUZS(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color, onClick }: {
  icon: React.ElementType
  label: string
  value: string | number
  color: string
  onClick: () => void
}) {
  const colorMap: Record<string, string> = {
    emerald: 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/10 text-emerald-400',
    blue: 'from-blue-500/10 to-blue-500/5 border-blue-500/10 text-blue-400',
    amber: 'from-amber-500/10 to-amber-500/5 border-amber-500/10 text-amber-400',
    red: 'from-red-500/10 to-red-500/5 border-red-500/10 text-red-400',
  }
  const iconColorMap: Record<string, string> = {
    emerald: 'bg-emerald-500/15 text-emerald-400',
    blue: 'bg-blue-500/15 text-blue-400',
    amber: 'bg-amber-500/15 text-amber-400',
    red: 'bg-red-500/15 text-red-400',
  }

  return (
    <button
      onClick={onClick}
      className={`bg-gradient-to-br ${colorMap[color]} border rounded-2xl p-4 md:p-5 text-left hover:scale-[1.02] transition-transform`}
    >
      <div className={`w-9 h-9 rounded-xl ${iconColorMap[color]} flex items-center justify-center mb-3`}>
        <Icon className="w-[18px] h-[18px]" />
      </div>
      <p className="text-[10px] text-white/35 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-base sm:text-xl font-bold text-white">{value}</p>
    </button>
  )
}

function MiniStat({ icon: Icon, label, value, colors }: {
  icon: React.ElementType; label: string; value: number
  colors: { bg: string; text: string; border: string }
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className={`w-3.5 h-3.5 ${colors.text}`} />
        <span className="text-xs text-white/40">{label}</span>
      </div>
      <span className={`text-sm font-semibold ${colors.text}`}>{value}</span>
    </div>
  )
}
