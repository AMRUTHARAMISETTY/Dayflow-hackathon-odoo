import { NavLink } from "react-router-dom"
import { motion } from "framer-motion"
import { LogOut } from "lucide-react"
import { NAV_ITEMS } from "./nav"
import { useAuth } from "../../lib/auth"
import { avatarFor } from "../../lib/mockData"

export default function SideRail() {
  const { user, signOut } = useAuth()

  return (
    <aside className="hidden md:flex md:w-60 shrink-0 flex-col border-r border-ink/8 bg-surface px-3 py-6">
      <div className="mb-8 flex items-center gap-2.5 px-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-meridian font-display text-sm font-bold text-white">
          D
        </div>
        <span className="text-base font-bold text-ink font-display">Dayflow</span>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} className="relative">
            {({ isActive }) => (
              <div className="relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium">
                {isActive && (
                  <motion.div
                    layoutId="nav-pill"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    className="absolute inset-0 rounded-lg bg-meridian-dim"
                  />
                )}
                <item.icon
                  className={`relative z-10 h-4 w-4 ${isActive ? "text-meridian" : "text-slate"}`}
                  strokeWidth={2}
                />
                <span className={`relative z-10 ${isActive ? "text-meridian" : "text-ink/70"}`}>
                  {item.label}
                </span>
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-4 flex items-center gap-3 rounded-lg hairline p-2.5">
        <img src={avatarFor(user?.name ?? "?")} alt={user?.name} className="h-8 w-8 rounded-full" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{user?.name}</p>
          <p className="truncate text-xs text-slate font-mono-tabular">{user?.employeeId}</p>
        </div>
        <button
          onClick={signOut}
          title="Sign out"
          className="flex h-7 w-7 items-center justify-center rounded-md text-slate hover:bg-rose-dim hover:text-rose transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>
      </div>
    </aside>
  )
}
