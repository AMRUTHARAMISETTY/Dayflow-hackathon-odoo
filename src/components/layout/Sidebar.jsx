import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LayoutDashboard, User, CalendarCheck, Plane, Wallet, LogOut } from 'lucide-react'
import { useStore } from '../../lib/store'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/profile', label: 'Profile', icon: User },
  { to: '/attendance', label: 'Attendance', icon: CalendarCheck },
  { to: '/leave', label: 'Leave', icon: Plane },
  { to: '/payroll', label: 'Payroll', icon: Wallet },
]

export default function Sidebar() {
  const { currentUser, profile, signOut } = useStore()

  return (
    <aside className="hidden md:flex md:w-64 shrink-0 flex-col border-r border-black/5 bg-white/70 backdrop-blur-xl px-4 py-6">
      <div className="mb-8 flex items-center gap-2 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-400 font-bold text-white shadow-md shadow-brand-500/30">
          D
        </div>
        <span className="text-lg font-bold font-display text-ink-900">Dayflow</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} className="relative">
            {({ isActive }) => (
              <div className="relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium">
                {isActive && (
                  <motion.div
                    layoutId="nav-pill"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-brand-600 to-accent-500 shadow-md shadow-brand-500/30"
                  />
                )}
                <item.icon
                  className={`relative z-10 h-4 w-4 ${isActive ? 'text-white' : 'text-ink-900/50'}`}
                />
                <span className={`relative z-10 ${isActive ? 'text-white' : 'text-ink-900/70'}`}>
                  {item.label}
                </span>
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-4 flex items-center gap-3 rounded-xl border border-black/5 bg-white/60 p-3">
        <img
          src={profile?.avatarUrl}
          alt={currentUser?.name}
          className="h-9 w-9 rounded-full border border-black/5"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink-900">{currentUser?.name}</p>
          <p className="truncate text-xs text-ink-900/40">{currentUser?.employeeId}</p>
        </div>
        <button
          onClick={signOut}
          title="Logout"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-900/40 hover:bg-red-50 hover:text-red-500 transition-colors"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </aside>
  )
}
