import { useEffect, useState, useSyncExternalStore } from "react"

// A demo-only override so offline states can be shown without unplugging
// wifi. It never lies to a real user — it's an explicit debug toggle, not a
// simulated success/failure of an actual request.
let forcedOffline = false
const listeners = new Set<() => void>()

export function setForcedOffline(value: boolean) {
  forcedOffline = value
  listeners.forEach((l) => l())
}

export function isForcedOffline() {
  return forcedOffline
}

function subscribeForced(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function useOnlineStatus() {
  const [browserOnline, setBrowserOnline] = useState(
    () => typeof navigator === "undefined" || navigator.onLine,
  )
  const forced = useSyncExternalStore(subscribeForced, isForcedOffline, () => false)

  useEffect(() => {
    const goOnline = () => setBrowserOnline(true)
    const goOffline = () => setBrowserOnline(false)
    window.addEventListener("online", goOnline)
    window.addEventListener("offline", goOffline)
    return () => {
      window.removeEventListener("online", goOnline)
      window.removeEventListener("offline", goOffline)
    }
  }, [])

  return browserOnline && !forced
}
