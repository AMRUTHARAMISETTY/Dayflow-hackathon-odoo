import { NavLink } from "react-router-dom"
import { motion } from "framer-motion"
import { NAV_ITEMS } from "./nav"

export default function BottomTabBar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex md:hidden items-stretch justify-around border-t border-ink/8 bg-surface/95 backdrop-blur-xl h-14 pb-[env(safe-area-inset-bottom)]">
      {NAV_ITEMS.slice(0, 5).map((item) => (
        <NavLink key={item.to} to={item.to} className="relative flex-1">
          {({ isActive }) => (
            <div className="relative flex h-full min-h-[48px] flex-col items-center justify-center gap-0.5 text-[10px] font-medium">
              {isActive && (
                <motion.div
                  layoutId="mobile-nav-pill"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  className="absolute top-1 h-1 w-5 rounded-full bg-meridian"
                />
              )}
              <item.icon className={`h-5 w-5 ${isActive ? "text-meridian" : "text-slate"}`} strokeWidth={2} />
              <span className={isActive ? "text-meridian" : "text-slate"}>{item.label}</span>
            </div>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
