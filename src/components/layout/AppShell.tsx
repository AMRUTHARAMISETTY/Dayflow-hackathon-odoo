import { Outlet, useLocation } from "react-router-dom"
import { AnimatePresence, motion } from "framer-motion"
import SideRail from "./SideRail"
import BottomTabBar from "./BottomTabBar"
import DebugOfflineToggle from "./DebugOfflineToggle"
import { useReducedMotion } from "../../hooks/useReducedMotion"

export default function AppShell() {
  const location = useLocation()
  const reduced = useReducedMotion()

  return (
    <div className="flex min-h-screen bg-paper">
      <SideRail />

      <main className="flex-1 min-w-0 px-4 py-6 pb-24 md:px-8 md:py-8 md:pb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduced ? {} : { opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={location.pathname === "/today" ? "mx-auto max-w-[720px]" : "mx-auto max-w-5xl"}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <BottomTabBar />
      {location.pathname !== "/today" && <DebugOfflineToggle />}
    </div>
  )
}
