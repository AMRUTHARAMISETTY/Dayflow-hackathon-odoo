import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Sidebar from './Sidebar'
import MobileNav from './MobileNav'
import ToastStack from '../ui/ToastStack'

export default function AppLayout() {
  const location = useLocation()

  return (
    <div className="flex min-h-screen bg-[#f5f6fb]">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-brand-200/40 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-accent-400/10 blur-3xl" />
      </div>

      <Sidebar />

      <main className="flex-1 min-w-0 px-4 py-6 pb-24 md:px-8 md:py-8 md:pb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto max-w-5xl"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <MobileNav />
      <ToastStack />
    </div>
  )
}
