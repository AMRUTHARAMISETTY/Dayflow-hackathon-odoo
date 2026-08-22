import { useEffect, useMemo, useRef, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import TodayMascot, { type MascotEvent, type MascotStatus } from "../components/today/TodayMascot"
import SpeechBubble from "../components/today/SpeechBubble"
import DevMascotSwitcher from "../components/today/DevMascotSwitcher"
import Skeleton from "../components/ui/Skeleton"
import { useAttendanceQuery, useAttentionQuery, useLeaveRequestsQuery, usePaySlipsQuery } from "../lib/queries"
import { apiCheckIn, apiCheckOut, OfflineError } from "../lib/mockApi"
import { buildMascotMessages } from "../lib/mascotMessages"
import { useAuth } from "../lib/auth"
import { useOnlineStatus } from "../hooks/useOnlineStatus"
import { useLiveClock } from "../hooks/useLiveClock"
import { daysFromToday, isoDate } from "../lib/mockData"
import type { AttendanceDay } from "../types"

type ActionPhase = "ready" | "checking-in" | "checking-out" | "failed"

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

function workedMinutes(day: AttendanceDay | undefined, currentMinutes: number) {
  if (!day?.checkIn) return 0
  const [hours, minutes] = day.checkIn.time.split(":").map(Number)
  const start = hours * 60 + minutes
  const end = day.checkOut
    ? day.checkOut.time.split(":").map(Number).reduce((h, m) => h * 60 + m)
    : currentMinutes
  return Math.max(0, end - start)
}

function durationLabel(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = Math.floor(minutes % 60)
  return `${h}h ${m}m`
}

function deadlineLabel(date?: string) {
  if (!date) return "Open"
  const today = isoDate(daysFromToday(0))
  if (date < today) return "Overdue"
  if (date === today) return "Today"
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" })
}

export default function TodayPage() {
  const { user } = useAuth()
  const online = useOnlineStatus()
  const currentMinutes = useLiveClock()
  const queryClient = useQueryClient()
  const attendance = useAttendanceQuery()
  const attention = useAttentionQuery()
  const leaveRequests = useLeaveRequestsQuery()
  const paySlips = usePaySlipsQuery()

  const [phase, setPhase] = useState<ActionPhase>("ready")
  const [mascotEvent, setMascotEvent] = useState<MascotEvent>("none")
  const [waveTrigger, setWaveTrigger] = useState(0)
  const [danceTrigger, setDanceTrigger] = useState(0)
  const [error, setError] = useState("")
  const [devStatusOverride, setDevStatusOverride] = useState<MascotStatus | null>(null)

  const today = attendance.data?.find((day) => day.date === isoDate(daysFromToday(0)))
  const minutes = workedMinutes(today, currentMinutes)
  const action = today?.checkIn && !today.checkOut ? "out" : today?.checkOut ? "done" : "in"

  const mutation = useMutation({
    mutationFn: () => (action === "out" ? apiCheckOut(user!.id) : apiCheckIn(user!.id)),
    onMutate: () => {
      setError("")
      setPhase(action === "out" ? "checking-out" : "checking-in")
      if (action === "in") setMascotEvent("check-in")
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["attendance"] })
      await queryClient.invalidateQueries({ queryKey: ["attention"] })
      setPhase("ready")
    },
    onError: (cause) => {
      setMascotEvent("revert")
      setPhase("failed")
      setError(cause instanceof OfflineError ? "Check-in needs a connection." : "Check-in failed. Try again.")
    },
  })

  const mascotStatus = useMemo(() => {
    if (phase === "checking-in") return "checking-in" as const
    if (!today?.checkIn) return "not-checked-in" as const
    if (today.checkOut) return "day-complete" as const
    if (minutes >= 7 * 60) return "overtime" as const
    if (minutes >= 4 * 60) return "working-late" as const
    return "working" as const
  }, [minutes, phase, today])

  // A speech bubble message that just changed is how the dino "notices" new
  // state — the wave plays whenever the rotating message advances.
  const messages = useMemo(
    () =>
      buildMascotMessages({
        attention: attention.data,
        leaveRequests: leaveRequests.data,
        paySlips: paySlips.data,
        workedMinutes: minutes,
      }),
    [attention.data, leaveRequests.data, paySlips.data, minutes],
  )

  // Detect a leave request newly reaching "approved" (the live progression
  // simulator in mockApi advances pending requests in the background) and
  // fire the dance showpiece once, the moment it happens.
  const seenApproved = useRef<Set<string> | null>(null)
  useEffect(() => {
    // Wait for the query's real data — establishing the baseline against the
    // undefined/empty pre-load state made every already-approved seed
    // request look "new" the instant real data arrived.
    if (!leaveRequests.data) return
    const approvedIds = leaveRequests.data.filter((r) => r.status === "approved").map((r) => r.id)
    if (seenApproved.current === null) {
      seenApproved.current = new Set(approvedIds)
      return
    }
    const isNew = approvedIds.some((id) => !seenApproved.current!.has(id))
    seenApproved.current = new Set(approvedIds)
    if (isNew) setDanceTrigger((n) => n + 1)
  }, [leaveRequests.data])

  const buttonLabel =
    phase === "checking-in"
      ? "Checking in"
      : phase === "checking-out"
        ? "Checking out"
        : action === "out"
          ? "Check out"
          : action === "done"
            ? "Day complete"
            : "Check in"

  // Status preview and event triggers are independent: the dev switcher can
  // preview any continuous loop while Wave/Dance/Jump still fire for real,
  // through the same state a genuine check-in or live message uses.
  const effectiveStatus = devStatusOverride ?? mascotStatus

  return (
    <div className="today-page" aria-busy={attendance.isLoading}>
      <p className="today-greeting">
        {greeting()}, {user?.name.split(" ")[0]}
      </p>

      <div className="today-hero">
        <div className="today-dino-col">
          <SpeechBubble messages={messages} onNewMessage={() => setWaveTrigger((n) => n + 1)} />
          <TodayMascot
            status={effectiveStatus}
            event={mascotEvent}
            hours={durationLabel(minutes)}
            waveTrigger={waveTrigger}
            danceTrigger={danceTrigger}
            onEventComplete={() => setMascotEvent("none")}
          />
        </div>

        <div className="today-info-col">
          {attendance.isLoading ? (
            <>
              <Skeleton className="h-[13px] w-36" />
              <Skeleton className="mt-4 h-11 w-24" />
              <Skeleton className="mt-4 h-12 w-full" />
            </>
          ) : attendance.isError ? (
            <>
              <p className="today-label">Attendance failed to load.</p>
              <button className="today-primary" type="button" onClick={() => attendance.refetch()}>
                Try again
              </button>
            </>
          ) : (
            <>
              <p className="today-label">{today?.checkIn ? `Checked in at ${today.checkIn.time}` : "Not checked in"}</p>
              <p className="today-hours-number">{durationLabel(minutes)}</p>
              <button
                className="today-primary"
                type="button"
                disabled={!online || mutation.isPending || action === "done"}
                onClick={() => mutation.mutate()}
              >
                {buttonLabel}
              </button>
              {!online && <p className="today-message">Check-in needs a connection.</p>}
              {error && (
                <p className="today-error" role="alert">
                  {error}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      <section className="today-needs" aria-labelledby="needs-heading">
        <h1 id="needs-heading">Needs you</h1>
        {attention.isLoading ? (
          <div className="today-needs-skeleton" aria-label="Loading tasks">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
        ) : attention.isError ? (
          <p className="today-empty">
            Tasks failed to load.{" "}
            <button type="button" onClick={() => attention.refetch()}>
              Try again
            </button>
          </p>
        ) : (attention.data?.length ?? 0) === 0 ? (
          <p className="today-empty">Nothing needs you today.</p>
        ) : (
          <div>
            {attention.data?.slice(0, 3).map((item) => (
              <Link className="today-need-row" to={item.actionHref} key={item.id}>
                <span>{item.title}</span>
                <time dateTime={item.dueDate}>{deadlineLabel(item.dueDate)}</time>
              </Link>
            ))}
          </div>
        )}
        {!online && <p className="today-updated">Cached view · last updated just now</p>}
      </section>

      {import.meta.env.DEV && (
        <DevMascotSwitcher
          value={devStatusOverride}
          onChange={setDevStatusOverride}
          onWave={() => setWaveTrigger((n) => n + 1)}
          onDance={() => setDanceTrigger((n) => n + 1)}
          onJump={() => setMascotEvent("check-in")}
        />
      )}
    </div>
  )
}
