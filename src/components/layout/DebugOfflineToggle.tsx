import { Wifi, WifiOff } from "lucide-react"
import { isForcedOffline, setForcedOffline, useOnlineStatus } from "../../hooks/useOnlineStatus"

// Demo aid only: lets a presenter show the offline state without pulling the
// plug. It never fakes a request outcome — it just flips navigator.onLine's
// effective value that apiCheckIn/apiCheckOut already check for real.
export default function DebugOfflineToggle() {
  const online = useOnlineStatus()

  return (
    <button
      onClick={() => setForcedOffline(!isForcedOffline())}
      title="Demo: toggle offline state"
      className="fixed bottom-20 right-4 z-40 flex h-9 w-9 items-center justify-center rounded-full bg-ink/80 text-white shadow-lg backdrop-blur md:bottom-4"
    >
      {online ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4 text-dawn" />}
    </button>
  )
}
