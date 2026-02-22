import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { formatDateTashkent } from '../types'
import {
  ShieldCheck,
  UserPlus,
  Trash2,
  X,
  Shield,
  User,
  KeyRound,
} from 'lucide-react'

interface AdminItem {
  id: number
  name: string
  username: string
  role: 'super_admin' | 'admin'
  created_at: string
}

export default function AdminsPage() {
  const { admin: currentAdmin } = useAuth()
  const [admins, setAdmins] = useState<AdminItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [error, setError] = useState('')

  // Form state
  const [form, setForm] = useState({ name: '', username: '', password: '', role: 'admin' })
  const [formError, setFormError] = useState('')
  const [creating, setCreating] = useState(false)

  // Password change
  const [showPassword, setShowPassword] = useState(false)
  const [pwForm, setPwForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' })
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState('')
  const [changingPw, setChangingPw] = useState(false)

  const fetchAdmins = async () => {
    try {
      const data = await api.getAdmins()
      setAdmins(data)
    } catch {
      setError('Adminlarni yuklashda xatolik')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAdmins()
  }, [])

  const handleCreate = async () => {
    if (!form.name.trim() || !form.username.trim() || !form.password.trim()) {
      setFormError('Barcha maydonlarni to\'ldiring')
      return
    }
    setCreating(true)
    setFormError('')
    try {
      await api.createAdmin(form)
      setShowDialog(false)
      setForm({ name: '', username: '', password: '', role: 'admin' })
      fetchAdmins()
    } catch (err: any) {
      setFormError(err.message || 'Xatolik yuz berdi')
    } finally {
      setCreating(false)
    }
  }

  const handleChangePassword = async () => {
    if (!pwForm.oldPassword || !pwForm.newPassword || !pwForm.confirmPassword) {
      setPwError('Barcha maydonlarni to\'ldiring')
      return
    }
    if (pwForm.newPassword.length < 4) {
      setPwError('Yangi parol kamida 4 belgi bo\'lishi kerak')
      return
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError('Yangi parollar mos kelmaydi')
      return
    }
    setChangingPw(true)
    setPwError('')
    setPwSuccess('')
    try {
      await api.changePassword(pwForm.oldPassword, pwForm.newPassword)
      setPwSuccess('Parol muvaffaqiyatli o\'zgartirildi')
      setPwForm({ oldPassword: '', newPassword: '', confirmPassword: '' })
      setTimeout(() => setShowPassword(false), 1500)
    } catch (err: any) {
      setPwError(err.message || 'Parolni o\'zgartirishda xatolik')
    } finally {
      setChangingPw(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await api.deleteAdmin(String(id))
      setDeleteId(null)
      fetchAdmins()
    } catch (err: any) {
      setError(err.message || 'O\'chirishda xatolik')
      setDeleteId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "'Georgia', serif" }}>Adminlar</h2>
          <p className="text-white/30 text-sm mt-1">Tizim adminlarini boshqarish — {admins.length} ta admin</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowPassword(true); setPwError(''); setPwSuccess(''); setPwForm({ oldPassword: '', newPassword: '', confirmPassword: '' }) }}
            className="flex items-center gap-2 px-3 sm:px-4 py-2.5 bg-white/[0.05] border border-white/[0.08] text-white/60 rounded-xl text-sm font-medium hover:text-white/80 transition-all"
          >
            <KeyRound className="w-4 h-4" />
            <span className="hidden sm:inline">Parol o'zgartirish</span>
            <span className="sm:hidden">Parol</span>
          </button>
          <button
            onClick={() => setShowDialog(true)}
            className="flex items-center gap-2 px-3 sm:px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl text-sm font-medium hover:from-amber-400 hover:to-orange-500 transition-all shadow-lg shadow-amber-500/20"
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Yangi admin</span>
            <span className="sm:hidden">Yangi</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Admin table - desktop */}
      <div className="bg-[#161923] rounded-2xl border border-white/[0.06] overflow-hidden hidden md:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left px-5 py-4 text-[11px] text-white/30 uppercase tracking-wider font-medium">Ism</th>
              <th className="text-left px-5 py-4 text-[11px] text-white/30 uppercase tracking-wider font-medium">Username</th>
              <th className="text-left px-5 py-4 text-[11px] text-white/30 uppercase tracking-wider font-medium">Role</th>
              <th className="text-left px-5 py-4 text-[11px] text-white/30 uppercase tracking-wider font-medium">Yaratilgan</th>
              <th className="text-right px-5 py-4 text-[11px] text-white/30 uppercase tracking-wider font-medium">Amallar</th>
            </tr>
          </thead>
          <tbody>
            {admins.map(a => (
              <tr key={a.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${
                      a.role === 'super_admin'
                        ? 'bg-gradient-to-br from-amber-400 to-orange-600 shadow-lg shadow-amber-500/20'
                        : 'bg-gradient-to-br from-emerald-400 to-teal-600 shadow-lg shadow-emerald-500/20'
                    }`}>
                      {a.name.split(' ').map(w => w[0]).join('')}
                    </div>
                    <span className="text-sm font-medium text-white/80">{a.name}</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-sm text-white/40 font-mono">{a.username}</td>
                <td className="px-5 py-4">
                  {a.role === 'super_admin' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 text-xs font-medium border border-amber-500/20">
                      <Shield className="w-3 h-3" />
                      Super Admin
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.05] text-white/40 text-xs font-medium border border-white/[0.06]">
                      <User className="w-3 h-3" />
                      Admin
                    </span>
                  )}
                </td>
                <td className="px-5 py-4 text-sm text-white/30">
                  {a.created_at ? formatDateTashkent(a.created_at, { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                </td>
                <td className="px-5 py-4 text-right">
                  {String(a.id) !== currentAdmin?.id ? (
                    deleteId === a.id ? (
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-xs text-red-400/70">O'chirilsinmi?</span>
                        <button
                          onClick={() => handleDelete(a.id)}
                          className="px-3 py-1.5 bg-red-500/15 text-red-400 rounded-lg text-xs font-medium border border-red-500/20 hover:bg-red-500/25 transition-all"
                        >
                          Ha
                        </button>
                        <button
                          onClick={() => setDeleteId(null)}
                          className="px-3 py-1.5 bg-white/[0.05] text-white/40 rounded-lg text-xs font-medium border border-white/[0.06] hover:text-white/60 transition-all"
                        >
                          Yo'q
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteId(a.id)}
                        className="p-2 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )
                  ) : (
                    <span className="text-[10px] text-white/15 italic">Siz</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Admin cards - mobile */}
      <div className="md:hidden space-y-3">
        {admins.map(a => (
          <div key={a.id} className="bg-[#161923] rounded-2xl border border-white/[0.06] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${
                  a.role === 'super_admin'
                    ? 'bg-gradient-to-br from-amber-400 to-orange-600 shadow-lg shadow-amber-500/20'
                    : 'bg-gradient-to-br from-emerald-400 to-teal-600 shadow-lg shadow-emerald-500/20'
                }`}>
                  {a.name.split(' ').map(w => w[0]).join('')}
                </div>
                <div>
                  <p className="text-sm font-medium text-white/80">{a.name}</p>
                  <p className="text-xs text-white/30 font-mono">{a.username}</p>
                </div>
              </div>
              {String(a.id) !== currentAdmin?.id ? (
                deleteId === a.id ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleDelete(a.id)}
                      className="px-2.5 py-1.5 bg-red-500/15 text-red-400 rounded-lg text-xs font-medium border border-red-500/20"
                    >
                      Ha
                    </button>
                    <button
                      onClick={() => setDeleteId(null)}
                      className="px-2.5 py-1.5 bg-white/[0.05] text-white/40 rounded-lg text-xs font-medium border border-white/[0.06]"
                    >
                      Yo'q
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteId(a.id)}
                    className="p-2 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )
              ) : (
                <span className="text-[10px] text-white/15 italic">Siz</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-3">
              {a.role === 'super_admin' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 text-xs font-medium border border-amber-500/20">
                  <Shield className="w-3 h-3" />
                  Super Admin
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.05] text-white/40 text-xs font-medium border border-white/[0.06]">
                  <User className="w-3 h-3" />
                  Admin
                </span>
              )}
              <span className="text-[11px] text-white/20">
                {a.created_at ? formatDateTashkent(a.created_at, { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Create dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a1d2e] rounded-2xl border border-white/[0.08] w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                </div>
                <h3 className="text-base font-semibold">Yangi admin</h3>
              </div>
              <button onClick={() => { setShowDialog(false); setFormError('') }} className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white/60 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {formError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 text-sm text-red-400">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs text-white/30 mb-1.5 uppercase tracking-wider">Ism</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Admin ismi"
                  className="w-full bg-[#0f1117] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/30"
                />
              </div>

              <div>
                <label className="block text-xs text-white/30 mb-1.5 uppercase tracking-wider">Username</label>
                <input
                  type="text"
                  value={form.username}
                  onChange={e => setForm({ ...form, username: e.target.value })}
                  placeholder="admin_username"
                  className="w-full bg-[#0f1117] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/30"
                />
              </div>

              <div>
                <label className="block text-xs text-white/30 mb-1.5 uppercase tracking-wider">Parol</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="Parol"
                  className="w-full bg-[#0f1117] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/30"
                />
              </div>

              <div>
                <label className="block text-xs text-white/30 mb-1.5 uppercase tracking-wider">Role</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, role: 'admin' })}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      form.role === 'admin'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                        : 'bg-white/[0.03] text-white/30 border border-white/[0.06] hover:text-white/50'
                    }`}
                  >
                    <User className="w-4 h-4" />
                    Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, role: 'super_admin' })}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      form.role === 'super_admin'
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                        : 'bg-white/[0.03] text-white/30 border border-white/[0.06] hover:text-white/50'
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    Super Admin
                  </button>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-white/[0.06] flex gap-3">
              <button
                onClick={() => { setShowDialog(false); setFormError('') }}
                className="flex-1 px-4 py-2.5 bg-white/[0.05] text-white/40 rounded-xl text-sm font-medium hover:text-white/60 transition-all border border-white/[0.06]"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl text-sm font-medium hover:from-amber-400 hover:to-orange-500 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
              >
                {creating ? 'Yaratilmoqda...' : 'Yaratish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password change dialog */}
      {showPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a1d2e] rounded-2xl border border-white/[0.08] w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
                  <KeyRound className="w-4 h-4 text-blue-400" />
                </div>
                <h3 className="text-base font-semibold">Parol o'zgartirish</h3>
              </div>
              <button onClick={() => { setShowPassword(false); setPwError(''); setPwSuccess('') }} className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white/60 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {pwError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 text-sm text-red-400">
                  {pwError}
                </div>
              )}
              {pwSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2.5 text-sm text-emerald-400">
                  {pwSuccess}
                </div>
              )}

              <div>
                <label className="block text-xs text-white/30 mb-1.5 uppercase tracking-wider">Eski parol</label>
                <input
                  type="password"
                  value={pwForm.oldPassword}
                  onChange={e => setPwForm({ ...pwForm, oldPassword: e.target.value })}
                  placeholder="Joriy parolingiz"
                  className="w-full bg-[#0f1117] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/30"
                />
              </div>

              <div>
                <label className="block text-xs text-white/30 mb-1.5 uppercase tracking-wider">Yangi parol</label>
                <input
                  type="password"
                  value={pwForm.newPassword}
                  onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })}
                  placeholder="Yangi parol (kamida 4 belgi)"
                  className="w-full bg-[#0f1117] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/30"
                />
              </div>

              <div>
                <label className="block text-xs text-white/30 mb-1.5 uppercase tracking-wider">Yangi parolni tasdiqlang</label>
                <input
                  type="password"
                  value={pwForm.confirmPassword}
                  onChange={e => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                  placeholder="Yangi parolni qayta kiriting"
                  className="w-full bg-[#0f1117] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/30"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-white/[0.06] flex gap-3">
              <button
                onClick={() => { setShowPassword(false); setPwError(''); setPwSuccess('') }}
                className="flex-1 px-4 py-2.5 bg-white/[0.05] text-white/40 rounded-xl text-sm font-medium hover:text-white/60 transition-all border border-white/[0.06]"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleChangePassword}
                disabled={changingPw}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl text-sm font-medium hover:from-blue-400 hover:to-blue-500 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
              >
                {changingPw ? 'O\'zgartirilmoqda...' : 'O\'zgartirish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
