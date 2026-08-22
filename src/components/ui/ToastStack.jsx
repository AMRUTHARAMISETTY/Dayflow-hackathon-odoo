import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Info, X } from 'lucide-react'
import { useStore } from '../../lib/store'

const ICONS = {
  success: CheckCircle2,
  info: Info,
}

export default function ToastStack() {
  const { toasts, dismissToast } = useStore()

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 w-80 max-w-[90vw]">
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = ICONS[toast.variant] || Info
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, x: 60, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.9, transition: { duration: 0.2 } }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className="glass-dark flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm text-white shadow-xl shadow-black/20"
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-accent-400" />
              <p className="flex-1 leading-snug">{toast.message}</p>
              <button
                onClick={() => dismissToast(toast.id)}
                className="text-white/50 hover:text-white transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
