import { Component, type ReactNode } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { DataProvider } from './context/DataContext'
import { useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import RoomsPage from './pages/RoomsPage'
import BookingsPage from './pages/BookingsPage'
import GuestsPage from './pages/GuestsPage'
import FinancePage from './pages/FinancePage'
import ShiftReport from './pages/ShiftReport'
import LoginPage from './pages/LoginPage'
import StatisticsPage from './pages/StatisticsPage'
import AdminsPage from './pages/AdminsPage'

// Error Boundary — ilova crash bo'lganda oq ekran o'rniga xato ko'rsatadi
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-4">
          <div className="bg-[#161923] border border-red-500/20 rounded-2xl p-8 max-w-md w-full text-center">
            <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-red-400 text-2xl">!</span>
            </div>
            <h2 className="text-lg font-bold text-white mb-2">Xatolik yuz berdi</h2>
            <p className="text-white/40 text-sm mb-4">
              {this.state.error?.message || 'Kutilmagan xatolik. Sahifani yangilang.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold px-6 py-2.5 rounded-xl text-sm"
            >
              Sahifani yangilash
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function AppRoutes() {
  const { admin } = useAuth()

  return (
    <Routes>
      <Route
        path="/login"
        element={admin ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/rooms" element={<RoomsPage />} />
          <Route path="/bookings" element={<BookingsPage />} />
          <Route path="/guests" element={<GuestsPage />} />
          <Route path="/finance" element={<FinancePage />} />
          <Route path="/shift" element={<ShiftReport />} />
          <Route path="/statistics" element={<StatisticsPage />} />
          <Route path="/admins" element={admin?.role === 'super_admin' ? <AdminsPage /> : <Navigate to="/" replace />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <DataProvider>
        <AppRoutes />
      </DataProvider>
    </ErrorBoundary>
  )
}

export default App
