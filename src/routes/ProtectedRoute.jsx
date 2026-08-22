import { Navigate, Outlet } from 'react-router-dom'
import { useStore } from '../lib/store'

export default function ProtectedRoute() {
  const { currentUser } = useStore()
  if (!currentUser) return <Navigate to="/sign-in" replace />
  return <Outlet />
}
