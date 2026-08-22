import { AnimatePresence, motion } from "framer-motion"
import { WifiOff } from "lucide-react"
import { useOnlineStatus } from "../../hooks/useOnlineStatus"

export default function OfflineBanner({ lastUpdatedLabel }: { lastUpdatedLabel?: string }) {
  const online = useOnlineStatus()
  return (
    <AnimatePresence>
      {!online && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="mb-4 flex items-center gap-2 overflow-hidden rounded-lg bg-dawn-dim px-3 py-2 text-xs font-medium text-dawn"
        >
          <WifiOff className="h-3.5 w-3.5 shrink-0" />
          You're offline — showing the last loaded view{lastUpdatedLabel ? ` (as of ${lastUpdatedLabel})` : ""}.
        </motion.div>
      )}
    </AnimatePresence>
  )
}
