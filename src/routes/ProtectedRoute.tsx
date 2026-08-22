import { Navigate, Outlet } from "react-router-dom"
import { useAuth } from "../lib/auth"

export default function ProtectedRoute({ role }: { role?: "ADMIN_HR" | "EMPLOYEE" }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/sign-in" replace />
  if (role && !user.roles.includes(role)) return <Navigate to={user.roles.includes("ADMIN_HR") ? "/admin/dashboard" : "/employee/dashboard"} replace />
  return <Outlet />
}
