import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { Admin, ShiftLog } from '../types'
import { api, setToken, clearToken } from '../lib/api'

interface AuthContextType {
  admin: Admin | null
  currentShift: ShiftLog | null
  login: (username: string, password: string) => Promise<string | null>
  logout: () => void
  setCurrentShift: React.Dispatch<React.SetStateAction<ShiftLog | null>>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null)
  const [currentShift, setCurrentShift] = useState<ShiftLog | null>(null)
  const [loading, setLoading] = useState(true)

  // Check localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('samo_admin')
    if (stored) {
      try {
        setAdmin(JSON.parse(stored))
      } catch {
        localStorage.removeItem('samo_admin')
      }
    }
    setLoading(false)
  }, [])

  const login = useCallback(async (username: string, password: string): Promise<string | null> => {
    try {
      const res = await api.login(username, password)
      setToken(res.token)
      const adminData: Admin = {
        id: String(res.admin.id),
        name: res.admin.name,
        username: res.admin.username,
        role: res.admin.role || 'admin',
      }
      setAdmin(adminData)
      localStorage.setItem('samo_admin', JSON.stringify(adminData))

      // Start a new shift (only for regular admins, not super_admin)
      if (adminData.role !== 'super_admin') {
        const shift = await api.startShift()
        const shiftLog: ShiftLog = {
          id: String(shift.id),
          admin: shift.admin_name || adminData.name,
          shift: new Date().toLocaleString('uz-UZ'),
          startTime: shift.start_time || new Date().toISOString(),
          totalIncome: shift.total_income || 0,
          totalExpense: shift.total_expense || 0,
          notes: shift.notes || '',
          closed: false,
        }
        setCurrentShift(shiftLog)
        localStorage.setItem('samo_shift', JSON.stringify(shiftLog))
      }

      return null
    } catch (err: any) {
      return err.message || 'Login yoki parol noto\'g\'ri!'
    }
  }, [])

  const logout = useCallback(() => {
    clearToken()
    setAdmin(null)
    setCurrentShift(null)
    localStorage.removeItem('samo_admin')
    localStorage.removeItem('samo_shift')
  }, [])

  // Restore shift from localStorage
  useEffect(() => {
    if (admin) {
      const storedShift = localStorage.getItem('samo_shift')
      if (storedShift) {
        try {
          const parsed = JSON.parse(storedShift)
          if (!parsed.closed) {
            setCurrentShift(parsed)
          }
        } catch {
          localStorage.removeItem('samo_shift')
        }
      }
    }
  }, [admin])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ admin, currentShift, login, logout, setCurrentShift }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
