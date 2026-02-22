import { useState, useEffect } from 'react'
import { formatUZS } from '../types'
import { api } from '../lib/api'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts'
import { BarChart3, TrendingUp, PieChart as PieIcon, Activity, DollarSign, Users, Percent, Calendar } from 'lucide-react'

const MONTHS_UZ = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek']

const PIE_COLORS = ['#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1e2131] border border-white/10 rounded-xl px-4 py-3 shadow-2xl">
      <p className="text-xs text-white/50 mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-sm font-medium" style={{ color: p.color }}>
          {p.name}: {formatUZS(p.value)}
        </p>
      ))}
    </div>
  )
}

function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1e2131] border border-white/10 rounded-xl px-4 py-3 shadow-2xl">
      <p className="text-sm font-medium text-white">{payload[0].name}</p>
      <p className="text-xs text-white/50">{formatUZS(payload[0].value)}</p>
    </div>
  )
}

function SimpleTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1e2131] border border-white/10 rounded-xl px-4 py-3 shadow-2xl">
      <p className="text-xs text-white/50 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-sm font-medium" style={{ color: p.color }}>
          {p.name}: {p.value}%
        </p>
      ))}
    </div>
  )
}

export default function StatisticsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    api.getStatistics()
      .then(d => { if (!cancelled) setData(d) })
      .catch(err => { if (!cancelled) console.error(err) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "'Georgia', serif" }}>Statistika</h2>
          <p className="text-white/30 text-sm mt-1">Ma'lumotlar yuklanmoqda...</p>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "'Georgia', serif" }}>Statistika</h2>
          <p className="text-white/30 text-sm mt-1">Ma'lumotlarni yuklashda xatolik</p>
        </div>
      </div>
    )
  }

  // KPI data
  const kpi = data.kpi || { totalRevenue: 0, totalExpense: 0, totalCheckins: 0, avgMonthlyRevenue: 0, currentOccupancy: 0 }

  // Format monthly data
  const monthlyChart = (data.monthlyData || []).map((d: any) => {
    const [, m] = d.month.split('-')
    return {
      name: MONTHS_UZ[parseInt(m) - 1],
      Daromad: d.income || 0,
      Xarajat: d.expense || 0,
    }
  })

  // Format weekly data
  const weeklyChart = (data.weeklyData || []).map((d: any) => ({
    name: d.weeks_ago === 0 ? 'Bu hafta' : `${d.weeks_ago} hafta oldin`,
    Kirim: d.income || 0,
    Chiqim: d.expense || 0,
  })).reverse()

  // Format daily activity for occupancy trend
  const dailyChart = (data.dailyActivity || []).map((d: any) => {
    const date = new Date(d.day)
    const totalRooms = data.totalRooms || 30
    const occupancy = totalRooms > 0 ? Math.round(((d.check_ins || 0) / totalRooms) * 100) : 0
    return {
      name: `${date.getDate()}/${date.getMonth() + 1}`,
      'Kirish': d.check_ins || 0,
      'Chiqish': d.check_outs || 0,
      'Bandlik': Math.min(100, occupancy),
    }
  })

  // Format top rooms
  const topRoomsChart = (data.topRooms || []).map((r: any) => ({
    name: `${r.room_number}-xona`,
    Daromad: r.revenue || 0,
  }))

  // Format expense categories
  const expenseChart = (data.expenseCategories || []).map((c: any, i: number) => ({
    name: c.category,
    value: c.total || 0,
    fill: PIE_COLORS[i % PIE_COLORS.length],
  }))

  // Format income categories
  const incomeChart = (data.incomeCategories || []).map((c: any, i: number) => ({
    name: c.category,
    value: c.total || 0,
    fill: PIE_COLORS[i % PIE_COLORS.length],
  }))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "'Georgia', serif" }}>Statistika</h2>
        <p className="text-white/30 text-sm mt-1">Mehmonxona faoliyati tahlili</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard icon={DollarSign} label="Jami daromad" value={formatUZS(kpi.totalRevenue)} color="emerald" />
        <KPICard icon={Calendar} label="O'rtacha oylik" value={formatUZS(kpi.avgMonthlyRevenue)} color="amber" />
        <KPICard icon={Percent} label="Joriy bandlik" value={`${kpi.currentOccupancy}%`} color="blue" />
        <KPICard icon={Users} label="Jami mehmonlar" value={String(kpi.totalCheckins)} color="purple" />
      </div>

      {/* Weekly chart - full width */}
      {weeklyChart.length > 0 && (
        <div className="bg-[#161923] rounded-2xl border border-white/[0.06] p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/15 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Haftalik kirim/chiqim</h3>
              <p className="text-[10px] text-white/25">Oxirgi 4 hafta</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={weeklyChart} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="Kirim" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Chiqim" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Occupancy trend - LineChart */}
      {dailyChart.length > 0 && (
        <div className="bg-[#161923] rounded-2xl border border-white/[0.06] p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/15 flex items-center justify-center">
              <Activity className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Bandlik trendi</h3>
              <p className="text-[10px] text-white/25">Oxirgi 30 kun — kunlik joylashishlar</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={dailyChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<SimpleTooltip />} />
              <Line type="monotone" dataKey="Kirish" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly Income/Expense */}
        <div className="bg-[#161923] rounded-2xl border border-white/[0.06] p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/15 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Oylik daromad va xarajat</h3>
              <p className="text-[10px] text-white/25">Oxirgi 12 oy</p>
            </div>
          </div>
          {monthlyChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyChart} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Daromad" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Xarajat" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-white/20 text-sm">Ma'lumot yo'q</div>
          )}
        </div>

        {/* Income Categories - Pie */}
        <div className="bg-[#161923] rounded-2xl border border-white/[0.06] p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center">
              <PieIcon className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Kirim kategoriyalari</h3>
              <p className="text-[10px] text-white/25">Daromadlar taqsimoti</p>
            </div>
          </div>
          {incomeChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={incomeChart}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {incomeChart.map((entry: any, index: number) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value: string) => <span className="text-[11px] text-white/50">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-white/20 text-sm">Ma'lumot yo'q</div>
          )}
        </div>

        {/* Top Rooms by Revenue */}
        <div className="bg-[#161923] rounded-2xl border border-white/[0.06] p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Eng daromadli xonalar</h3>
              <p className="text-[10px] text-white/25">Daromad bo'yicha</p>
            </div>
          </div>
          {topRoomsChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topRoomsChart} layout="vertical" barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                <YAxis type="category" dataKey="name" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Daromad" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-white/20 text-sm">Ma'lumot yo'q</div>
          )}
        </div>

        {/* Expense Categories */}
        <div className="bg-[#161923] rounded-2xl border border-white/[0.06] p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/15 flex items-center justify-center">
              <PieIcon className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Xarajatlar taqsimoti</h3>
              <p className="text-[10px] text-white/25">Kategoriya bo'yicha</p>
            </div>
          </div>
          {expenseChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={expenseChart}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {expenseChart.map((entry: any, index: number) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value: string) => <span className="text-[11px] text-white/50">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-white/20 text-sm">Ma'lumot yo'q</div>
          )}
        </div>
      </div>
    </div>
  )
}

function KPICard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string; color: string
}) {
  const colorMap: Record<string, { bg: string; text: string; border: string; iconBg: string }> = {
    emerald: { bg: 'from-emerald-500/10 to-emerald-500/5', border: 'border-emerald-500/10', text: 'text-emerald-400', iconBg: 'bg-emerald-500/15' },
    amber: { bg: 'from-amber-500/10 to-amber-500/5', border: 'border-amber-500/10', text: 'text-amber-400', iconBg: 'bg-amber-500/15' },
    blue: { bg: 'from-blue-500/10 to-blue-500/5', border: 'border-blue-500/10', text: 'text-blue-400', iconBg: 'bg-blue-500/15' },
    purple: { bg: 'from-purple-500/10 to-purple-500/5', border: 'border-purple-500/10', text: 'text-purple-400', iconBg: 'bg-purple-500/15' },
  }
  const c = colorMap[color] || colorMap.emerald

  return (
    <div className={`bg-gradient-to-br ${c.bg} border ${c.border} rounded-2xl p-4 md:p-5`}>
      <div className={`w-9 h-9 rounded-xl ${c.iconBg} ${c.text} flex items-center justify-center mb-3`}>
        <Icon className="w-[18px] h-[18px]" />
      </div>
      <p className="text-[10px] text-white/35 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-base sm:text-lg font-bold text-white truncate">{value}</p>
    </div>
  )
}
