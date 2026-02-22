import { useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Hotel,
  LayoutDashboard,
  BedDouble,
  Users,
  Wallet,
  ClipboardList,
  LogOut,
  Menu,
  X,
  CalendarCheck,
  BarChart3,
  ShieldCheck,
} from 'lucide-react'

const navItems = [
  { path: '/', label: 'Bosh sahifa', icon: LayoutDashboard },
  { path: '/rooms', label: 'Xonalar', icon: BedDouble },
  { path: '/bookings', label: 'Bronlar', icon: CalendarCheck },
  { path: '/guests', label: 'Mehmonlar', icon: Users },
  { path: '/finance', label: 'Moliya', icon: Wallet },
  { path: '/shift', label: 'Smena', icon: ClipboardList },
  { path: '/statistics', label: 'Statistika', icon: BarChart3 },
  { path: '/admins', label: 'Adminlar', icon: ShieldCheck, superOnly: true },
]

export default function Layout() {
  const { admin, logout, currentShift } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileMenu, setMobileMenu] = useState(false)
  const [showShiftWarning, setShowShiftWarning] = useState(false)

  const handleLogout = () => {
    if (currentShift) {
      setShowShiftWarning(true)
      return
    }
    logout()
    navigate('/login')
  }

  const forceLogout = () => {
    setShowShiftWarning(false)
    logout()
    navigate('/login')
  }

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <div className="min-h-screen bg-[#0f1117] text-white flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#161923] border-r border-white/[0.06] fixed h-screen z-30">
        <div className="p-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Hotel className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight" style={{ fontFamily: "'Georgia', serif" }}>SAMO</h1>
              <p className="text-[10px] text-white/30 uppercase tracking-[0.2em]">Hotel Management</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.filter(item => !item.superOnly || admin?.role === 'super_admin').map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-medium transition-all duration-200 ${
                isActive(item.path)
                  ? 'bg-gradient-to-r from-amber-500/15 to-orange-500/5 text-amber-400 shadow-inner'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/[0.03]'
              }`}
            >
              <item.icon className="w-[18px] h-[18px]" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-xs font-bold shadow-lg shadow-emerald-500/20">
              {admin?.name.split(' ').map(w => w[0]).join('')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{admin?.name}</p>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] text-emerald-400/70">Smena faol</span>
              </div>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] text-white/30 hover:text-red-400 hover:bg-red-500/5 rounded-xl transition-all">
            <LogOut className="w-4 h-4" />
            Chiqish
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-[#161923]/95 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center">
              <Hotel className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm tracking-tight" style={{ fontFamily: "'Georgia', serif" }}>SAMO HOTEL</span>
            {admin && (
              <span className="text-[10px] text-white/30 ml-1 hidden xs:inline">— {admin.name}</span>
            )}
          </div>
          <button onClick={() => setMobileMenu(!mobileMenu)} className="p-2 rounded-lg hover:bg-white/5">
            {mobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        {mobileMenu && (
          <>
            <div className="fixed inset-0 top-[53px] bg-black/50 z-30" onClick={() => setMobileMenu(false)} />
            <nav className="relative z-40 px-3 pb-3 space-y-0.5 border-t border-white/[0.06] pt-2 bg-[#161923]">
              {navItems.filter(item => !item.superOnly || admin?.role === 'super_admin').map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenu(false)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm ${
                    isActive(item.path) ? 'bg-amber-500/10 text-amber-400' : 'text-white/40'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              ))}
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400/50 rounded-lg">
                <LogOut className="w-4 h-4" />
                Chiqish
              </button>
            </nav>
          </>
        )}
      </div>

      {/* Main */}
      <main className="flex-1 lg:ml-64 pt-14 lg:pt-0">
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>

      {/* Smena yopilmagan warning */}
      <Dialog open={showShiftWarning} onOpenChange={setShowShiftWarning}>
        <DialogContent className="bg-[#1a1d2a] border-white/[0.08] text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-400">
              <ClipboardList className="w-5 h-5" />
              Smena yopilmagan!
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-white/50">
              Sizda ochiq smena bor. Chiqishdan oldin smenani yoping.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setShowShiftWarning(false)
                  navigate('/shift')
                }}
                className="bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold py-3 rounded-xl shadow-lg shadow-amber-500/20 text-sm"
              >
                Smenani yopish
              </button>
              <button
                onClick={forceLogout}
                className="py-3 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 text-sm font-medium transition-colors"
              >
                Baribir chiqish
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
