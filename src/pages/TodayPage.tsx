import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ArrowRight, CalendarDays, Clock3, ReceiptText, UserRound } from "lucide-react"
import { Link } from "react-router-dom"
import Skeleton from "../components/ui/Skeleton"
import { useAttendanceQuery, useAttentionQuery } from "../lib/queries"
import { apiCheckIn, apiCheckOut, OfflineError } from "../lib/mockApi"
import { useAuth } from "../lib/auth"
import { useOnlineStatus } from "../hooks/useOnlineStatus"
import { useLiveClock } from "../hooks/useLiveClock"
import { daysFromToday, isoDate } from "../lib/mockData"
import type { AttendanceDay } from "../types"

type ActionPhase = "ready" | "checking-in" | "checking-out" | "failed"

function workedMinutes(day: AttendanceDay | undefined, currentMinutes: number) {
  if (!day?.checkIn) return 0
  const [hours, minutes] = day.checkIn.time.split(":").map(Number)
  const start = hours * 60 + minutes
  const end = day.checkOut ? day.checkOut.time.split(":").map(Number).reduce((h, m) => h * 60 + m) : currentMinutes
  return Math.max(0, end - start)
}

function durationLabel(minutes: number) {
  return `${Math.floor(minutes / 60)}h ${Math.floor(minutes % 60)}m`
}

function deadlineLabel(date?: string) {
  if (!date) return "Open"
  const today = isoDate(daysFromToday(0))
  if (date < today) return "Overdue"
  if (date === today) return "Today"
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" })
}

const shortcuts = [
  { label: "Attendance", detail: "View your time log", to: "/time", icon: Clock3 },
  { label: "Request leave", detail: "Plan time away", to: "/leave", icon: CalendarDays },
  { label: "Payslips", detail: "Review your pay", to: "/pay", icon: ReceiptText },
]

export default function TodayPage() {
  const { user } = useAuth()
  const online = useOnlineStatus()
  const currentMinutes = useLiveClock()
  const queryClient = useQueryClient()
  const attendance = useAttendanceQuery()
  const attention = useAttentionQuery()
  const [phase, setPhase] = useState<ActionPhase>("ready")
  const [error, setError] = useState("")

  const today = attendance.data?.find((day) => day.date === isoDate(daysFromToday(0)))
  const minutes = workedMinutes(today, currentMinutes)
  const action = today?.checkIn && !today.checkOut ? "out" : today?.checkOut ? "done" : "in"

  const mutation = useMutation({
    mutationFn: () => (action === "out" ? apiCheckOut(user!.id) : apiCheckIn(user!.id)),
    onMutate: () => {
      setError("")
      setPhase(action === "out" ? "checking-out" : "checking-in")
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["attendance"] })
      await queryClient.invalidateQueries({ queryKey: ["attention"] })
      setPhase("ready")
    },
    onError: (cause) => {
      setPhase("failed")
      setError(cause instanceof OfflineError ? "Check-in needs a connection." : "That didn't work. Please try again.")
    },
  })

  const buttonLabel =
    phase === "checking-in"
      ? "Checking in..."
      : phase === "checking-out"
        ? "Checking out..."
        : action === "out"
          ? "Check out"
          : action === "done"
            ? "Day complete"
            : "Check in"
  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })

  return (
    <div className="employee-home" aria-busy={attendance.isLoading}>
      <header className="employee-home-header">
        <div>
          <p>{dateLabel}</p>
          <h1>Welcome back, {user?.name.split(" ")[0]}</h1>
          <span>Here's what your workday looks like.</span>
        </div>
        <div className="employee-avatar" aria-hidden="true">
          <UserRound />
        </div>
      </header>

      <section className="employee-attendance" aria-labelledby="attendance-heading">
        <div className="employee-attendance-copy">
          <p className="employee-eyebrow">Today's attendance</p>
          {attendance.isLoading ? <Skeleton className="mt-3 h-12 w-36" /> : <h2 id="attendance-heading">{durationLabel(minutes)}</h2>}
          <p>{today?.checkIn ? `Started at ${today.checkIn.time}${today.checkOut ? ` - Finished at ${today.checkOut.time}` : ""}` : "You haven't checked in yet."}</p>
        </div>
        <div className="employee-attendance-action">
          <span className={`employee-status ${action === "out" ? "is-active" : ""}`}>
            {action === "done" ? "Complete" : action === "out" ? "Working" : "Not started"}
          </span>
          <button type="button" disabled={!online || mutation.isPending || action === "done"} onClick={() => mutation.mutate()}>
            {buttonLabel}
          </button>
          {error && <p role="alert">{error}</p>}
        </div>
      </section>

      <nav className="employee-shortcuts" aria-label="Employee shortcuts">
        {shortcuts.map(({ label, detail, to, icon: Icon }) => (
          <Link to={to} key={to}>
            <span><Icon /></span>
            <div>
              <strong>{label}</strong>
              <small>{detail}</small>
            </div>
            <ArrowRight />
          </Link>
        ))}
      </nav>

      <section className="employee-attention" aria-labelledby="attention-heading">
        <div className="employee-section-heading">
          <div>
            <p className="employee-eyebrow">Your queue</p>
            <h2 id="attention-heading">Needs you</h2>
          </div>
          <span>{attention.data?.length ?? 0} items</span>
        </div>
        {attention.isLoading ? (
          <div className="employee-loading">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : attention.isError ? (
          <p className="employee-empty">Tasks couldn't load. <button type="button" onClick={() => attention.refetch()}>Try again</button></p>
        ) : !attention.data?.length ? (
          <p className="employee-empty">You're all caught up. Nothing needs your attention.</p>
        ) : (
          <div className="employee-task-list">
            {attention.data.slice(0, 4).map((item) => (
              <Link to={item.actionHref} key={item.id}>
                <span>{item.title}</span>
                <time dateTime={item.dueDate}>{deadlineLabel(item.dueDate)}</time>
                <ArrowRight />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
