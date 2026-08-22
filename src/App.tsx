import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { QueryClientProvider } from "@tanstack/react-query"
import { MotionConfig } from "framer-motion"
import { queryClient } from "./lib/queryClient"
import { AuthProvider } from "./lib/auth"
import ProtectedRoute from "./routes/ProtectedRoute"
import AppShell from "./components/layout/AppShell"
import SignInPage from "./pages/SignInPage"
import TodayPage from "./pages/TodayPage"
import TimePage from "./pages/TimePage"
import LeavePage from "./pages/LeavePage"
import PayPage from "./pages/PayPage"
import MePage from "./pages/MePage"
import SupportPage from "./pages/SupportPage"
import AdminDashboardPage from "./pages/AdminDashboardPage"
import SecurityDevicesPage from "./pages/SecurityDevicesPage"
import { ActivateEmployeePage, ForgotPasswordPage, OtpPage, ResetPasswordPage } from "./pages/AuthFlowPages"

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/sign-in" element={<SignInPage />} />
              <Route path="/activate" element={<ActivateEmployeePage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/verify-otp" element={<OtpPage />} />

              <Route element={<ProtectedRoute role="EMPLOYEE" />}>
                <Route element={<AppShell />}>
                  <Route path="/employee/dashboard" element={<TodayPage />} />
                  <Route path="/today" element={<TodayPage />} />
                  <Route path="/time" element={<TimePage />} />
                  <Route path="/leave" element={<LeavePage />} />
                  <Route path="/pay" element={<PayPage />} />
                  <Route path="/me" element={<MePage />} />
                  <Route path="/support" element={<SupportPage />} />
                  <Route path="/security" element={<SecurityDevicesPage />} />
                </Route>
              </Route>
              <Route element={<ProtectedRoute role="ADMIN_HR" />}>
                <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
              </Route>

              <Route path="/" element={<Navigate to="/sign-in" replace />} />
              <Route path="*" element={<Navigate to="/sign-in" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </MotionConfig>
    </QueryClientProvider>
  )
}
