import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { LogIn, LogOut, Check, WifiOff, AlertCircle } from "lucide-react"
import type { AttendanceDay } from "../../types"
import { apiCheckIn, apiCheckOut, OfflineError } from "../../lib/mockApi"
import { useOnlineStatus } from "../../hooks/useOnlineStatus"
import { useAuth } from "../../lib/auth"
import { useReducedMotion } from "../../hooks/useReducedMotion"

type Phase = "ready" | "sending" | "confirmed" | "failed"

export default function CheckInControl({ day }: { day: AttendanceDay }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const online = useOnlineStatus()
  const reduced = useReducedMotion()
  const [phase, setPhase] = useState<Phase>("ready")
  const [errorMsg, setErrorMsg] = useState("")

  const action = day.checkIn && !day.checkOut ? "out" : day.checkIn && day.checkOut ? "done" : "in"

  const mutation = useMutation({
    mutationFn: () => (action === "in" ? apiCheckIn(user!.id) : apiCheckOut(user!.id)),
    onMutate: () => {
      setPhase("sending")
      setErrorMsg("")
    },
    onSuccess: () => {
      setPhase("confirmed")
      queryClient.invalidateQueries({ queryKey: ["attendance"] })
      queryClient.invalidateQueries({ queryKey: ["attention"] })
      setTimeout(() => setPhase("ready"), reduced ? 0 : 1400)
    },
    onError: (err) => {
      setPhase("failed")
      setErrorMsg(err instanceof OfflineError ? err.message : "Something went wrong. Try again.")
    },
  })

  if (action === "done") {
    return (
      <div className="flex h-16 w-full flex-col items-center justify-center rounded-xl bg-meridian-dim text-meridian">
        <span className="flex items-center gap-1.5 text-sm font-semibold">
          <Check className="h-4 w-4" /> Day complete
        </span>
        <span className="font-mono-tabular text-xs text-meridian/70">
          {day.checkIn?.time} – {day.checkOut?.time}
        </span>
      </div>
    )
  }

  if (!online && phase !== "sending") {
    return (
      <div className="flex h-16 w-full flex-col items-center justify-center gap-1 rounded-xl bg-ink/5 text-slate">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <WifiOff className="h-4 w-4" /> Check-in needs a connection
        </span>
        <span className="text-xs">Reconnecting…</span>
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col items-center">
      <button
        onClick={() => mutation.mutate()}
        disabled={phase === "sending" || phase === "confirmed"}
        className="relative h-16 w-full overflow-hidden rounded-xl text-base font-semibold text-white shadow-sm disabled:cursor-default"
        style={{ backgroundColor: action === "in" ? "var(--color-meridian)" : "var(--color-rose)" }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {phase === "ready" && (
            <motion.span
              key="ready"
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduced ? {} : { opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 flex items-center justify-center gap-2"
            >
              {action === "in" ? <LogIn className="h-5 w-5" /> : <LogOut className="h-5 w-5" />}
              {action === "in" ? "Check in" : "Check out"}
            </motion.span>
          )}
          {phase === "sending" && (
            <motion.span
              key="sending"
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduced ? {} : { opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center gap-2"
            >
              <motion.span
                animate={reduced ? {} : { rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }}
                className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white"
              />
              Sending…
            </motion.span>
          )}
          {phase === "confirmed" && (
            <motion.span
              key="confirmed"
              initial={reduced ? false : { opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduced ? {} : { opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 22 }}
              className="absolute inset-0 flex items-center justify-center gap-2"
            >
              <Check className="h-5 w-5" /> {action === "in" ? "Checked in" : "Checked out"}
            </motion.span>
          )}
          {phase === "failed" && (
            <motion.span
              key="failed"
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduced ? {} : { opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center gap-2"
            >
              <AlertCircle className="h-5 w-5" /> Retry
            </motion.span>
          )}
        </AnimatePresence>

        {phase === "ready" && !reduced && (
          <motion.span
            animate={{
              boxShadow: [
                "0 0 0 0 rgba(15,92,78,0.35)",
                "0 0 0 10px rgba(15,92,78,0)",
              ],
            }}
            transition={{ repeat: Infinity, duration: 1.8 }}
            className="pointer-events-none absolute inset-0 rounded-xl"
          />
        )}
      </button>
      {phase === "failed" && errorMsg && <p className="mt-2 text-xs text-rose">{errorMsg}</p>}
      {day.checkIn && action === "out" && phase === "ready" && (
        <p className="mt-2 text-xs text-slate font-mono-tabular">Checked in at {day.checkIn.time}</p>
      )}
    </div>
  )
}
