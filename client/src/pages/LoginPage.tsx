import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Hotel, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setError('')
    if (!username.trim() || !password.trim()) {
      setError('Login va parolni kiriting!')
      return
    }
    setLoading(true)
    const err = await login(username.trim(), password.trim())
    setLoading(false)
    if (err) {
      setError(err)
    } else {
      navigate('/')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleClick()
  }

  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-orange-500/5 rounded-full blur-[100px]" />

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center mx-auto mb-5 shadow-2xl shadow-amber-500/30">
            <Hotel className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight" style={{ fontFamily: "'Georgia', serif" }}>
            SAMO HOTEL
          </h1>
          <p className="text-white/30 text-sm mt-2 tracking-wide">Boshqaruv tizimiga kirish</p>
        </div>

        <div className="space-y-4">
          <div className="bg-[#161923] rounded-2xl border border-white/[0.06] p-6 space-y-4 shadow-2xl">
            <div>
              <label className="text-[11px] text-white/40 uppercase tracking-wider font-medium block mb-2">
                Login
              </label>
              <input
                type="text"
                value={username}
                onChange={e => { setUsername(e.target.value); setError('') }}
                onKeyDown={handleKeyDown}
                placeholder="Login"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20 transition-all text-sm"
              />
            </div>
            <div>
              <label className="text-[11px] text-white/40 uppercase tracking-wider font-medium block mb-2">
                Parol
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  onKeyDown={handleKeyDown}
                  placeholder="Parol"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20 transition-all text-sm pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 text-red-400 text-xs">
                {error}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleClick}
            disabled={loading}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:from-amber-400 hover:to-orange-500 transition-all duration-300 text-sm tracking-wide disabled:opacity-50"
          >
            {loading ? 'Kirish...' : 'Kirish'}
          </button>
        </div>

      </div>
    </div>
  )
}
