import { useData } from '../context/DataContext'
import { Users, Phone, CreditCard, Calendar, BedDouble } from 'lucide-react'

export default function GuestsPage() {
  const { rooms } = useData()
  const occupiedRooms = rooms.filter(r => r.status === 'occupied' && r.guestName)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "'Georgia', serif" }}>Mehmonlar</h2>
        <p className="text-white/30 text-sm mt-1">Hozirda {occupiedRooms.length} ta mehmon bor</p>
      </div>

      {occupiedRooms.length === 0 ? (
        <div className="bg-[#161923] rounded-2xl border border-white/[0.06] p-12 text-center">
          <Users className="w-12 h-12 text-white/10 mx-auto mb-4" />
          <p className="text-white/30 text-sm">Hozirda mehmonlar yo'q</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {occupiedRooms.map(room => (
            <div key={room.id} className="bg-[#161923] rounded-2xl border border-white/[0.06] p-5 hover:border-white/10 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-sm font-bold shadow-lg shadow-blue-500/20">
                    {room.guestName?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="font-semibold">{room.guestName}</p>
                    <div className="flex items-center gap-1.5">
                      <BedDouble className="w-3 h-3 text-blue-400/60" />
                      <span className="text-xs text-blue-400/60">{room.number}-xona</span>
                    </div>
                  </div>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/15 rounded-lg px-2.5 py-1">
                  <span className="text-[10px] text-blue-400 font-medium">{room.floor}-qavat</span>
                </div>
              </div>

              <div className="space-y-2.5 bg-white/[0.02] rounded-xl p-3">
                {room.guestPassport && (
                  <div className="flex items-center gap-2.5">
                    <CreditCard className="w-3.5 h-3.5 text-white/20" />
                    <span className="text-sm text-white/50">{room.guestPassport}</span>
                  </div>
                )}
                {room.guestPhone && (
                  <div className="flex items-center gap-2.5">
                    <Phone className="w-3.5 h-3.5 text-white/20" />
                    <span className="text-sm text-white/50">{room.guestPhone}</span>
                  </div>
                )}
                {room.checkIn && (
                  <div className="flex items-center gap-2.5">
                    <Calendar className="w-3.5 h-3.5 text-white/20" />
                    <span className="text-sm text-white/50">
                      Kirish: {new Date(room.checkIn).toLocaleDateString('uz-UZ')}
                    </span>
                  </div>
                )}
                {room.checkOut && (
                  <div className="flex items-center gap-2.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-400/30" />
                    <span className="text-sm text-amber-400/50">
                      Chiqish: {new Date(room.checkOut).toLocaleDateString('uz-UZ')}
                    </span>
                  </div>
                )}
                {room.notes && (
                  <p className="text-xs text-white/25 italic border-t border-white/[0.04] pt-2 mt-2">
                    {room.notes}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
