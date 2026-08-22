import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LayoutDashboard, User, CalendarCheck, Plane, Wallet } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { to: '/attendance', label: 'Attend', icon: CalendarCheck },
  { to: '/leave', label: 'Leave', icon: Plane },
  { to: '/payroll', label: 'Payroll', icon: Wallet },
  { to: '/profile', label: 'Profile', icon: User },
]

export default function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex md:hidden items-center justify-around border-t border-black/5 bg-white/90 backdrop-blur-xl px-2 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
      {NAV_ITEMS.map((item) => (
        <NavLink key={item.to} to={item.to} className="relative flex-1">
          {({ isActive }) => (
            <div className="relative flex flex-col items-center gap-0.5 py-1 text-[10px] font-medium">
              {isActive && (
                <motion.div
                  layoutId="mobile-nav-pill"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  className="absolute -top-2 h-1 w-6 rounded-full bg-gradient-to-r from-brand-600 to-accent-500"
                />
              )}
              <item.icon className={`h-5 w-5 ${isActive ? 'text-brand-600' : 'text-ink-900/40'}`} />
              <span className={isActive ? 'text-brand-600' : 'text-ink-900/40'}>{item.label}</span>
            </div>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
