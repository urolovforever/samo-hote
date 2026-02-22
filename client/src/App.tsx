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
          <Route path="/admins" element={<AdminsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <DataProvider>
      <AppRoutes />
    </DataProvider>
  )
}

export default App
