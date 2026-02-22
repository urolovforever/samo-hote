import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute() {
  const { admin } = useAuth()

  if (!admin) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
