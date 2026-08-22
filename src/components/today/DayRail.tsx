import { useRef, useState } from "react"
import { motion } from "framer-motion"
import { CalendarOff, PartyPopper } from "lucide-react"
import type { AttendanceDay } from "../../types"
import { useLiveClock } from "../../hooks/useLiveClock"
import { useReducedMotion } from "../../hooks/useReducedMotion"
import { minutesToClock } from "../../lib/mockData"

function clampPct(minutes: number, start: number, end: number) {
  return Math.min(1, Math.max(0, (minutes - start) / (end - start))) * 100
}

export default function DayRail({ day }: { day: AttendanceDay }) {
  const nowMinutes = useLiveClock()
  const reduced = useReducedMotion()
  const trackRef = useRef<HTMLDivElement>(null)
  const [scrub, setScrub] = useState<{ x: number; label: string } | null>(null)

  const { shiftStartMinutes: start, shiftEndMinutes: end } = day

  if (day.status === "leave") {
    return (
      <div className="relative h-16 w-full overflow-hidden rounded-xl bg-[repeating-linear-gradient(135deg,var(--color-slate)_0,var(--color-slate)_2px,transparent_2px,transparent_10px)] bg-ink/4 flex items-center justify-center">
        <span className="flex items-center gap-2 rounded-full bg-surface px-4 py-1.5 text-sm font-medium text-ink shadow-sm">
          <CalendarOff className="h-4 w-4 text-slate" /> On {day.leaveType ?? ""} leave today
        </span>
      </div>
    )
  }

  if (day.status === "holiday") {
    return (
      <div className="relative flex h-16 w-full items-center justify-center rounded-xl bg-dawn-dim">
        <span className="flex items-center gap-2 text-sm font-medium text-dawn">
          <PartyPopper className="h-4 w-4" /> {day.holidayName ?? "Holiday"} — enjoy your day off
        </span>
      </div>
    )
  }

  const checkInMin = day.checkIn ? toMinutes(day.checkIn.time) : null
  const checkOutMin = day.checkOut ? toMinutes(day.checkOut.time) : null
  const effectiveNow = checkOutMin ?? nowMinutes

  const workedEnd = Math.min(effectiveNow, end)
  const workedStartPct = checkInMin !== null ? clampPct(checkInMin, start, end) : 0
  const workedEndPct = checkInMin !== null ? clampPct(workedEnd, start, end) : 0
  const overtimeEndPct = checkInMin !== null ? clampPct(effectiveNow, start, end) : 0
  const hasOvertime = checkInMin !== null && effectiveNow > end
  const markerPct = clampPct(nowMinutes, start, end)
  const showMarker = nowMinutes >= start && nowMinutes <= end

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    const minutes = start + ratio * (end - start)
    setScrub({ x: ratio * 100, label: minutesToClock(Math.round(minutes)) })
  }

  return (
    <div className="w-full">
      <div className="mb-1.5 flex justify-between text-xs text-slate font-mono-tabular">
        <span>{minutesToClock(start)}</span>
        <span>{minutesToClock(end)}</span>
      </div>
      <div
        ref={trackRef}
        onMouseMove={handleMove}
        onMouseLeave={() => setScrub(null)}
        className="relative h-4 w-full cursor-crosshair rounded-full bg-ink/7"
      >
        {checkInMin !== null && (() => {
          const maxWidthPct = Math.max(0.0001, clampPct(end, start, end) - workedStartPct)
          const fraction = Math.max(0, workedEndPct - workedStartPct) / maxWidthPct
          return (
            <div
              className="absolute inset-y-0 overflow-hidden rounded-full"
              style={{ left: `${workedStartPct}%`, width: `${maxWidthPct}%` }}
            >
              <motion.div
                className="h-full w-full origin-left bg-meridian"
                initial={reduced ? false : { scaleX: 0 }}
                animate={{ scaleX: fraction }}
                transition={reduced ? { duration: 0 } : { duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          )
        })()}
        {hasOvertime && (() => {
          const otStart = clampPct(end, start, end)
          const maxWidthPct = Math.max(0.0001, 100 - otStart)
          const fraction = Math.max(0, overtimeEndPct - otStart) / maxWidthPct
          return (
            <div
              className="absolute inset-y-0 overflow-hidden rounded-r-full"
              style={{ left: `${otStart}%`, width: `${maxWidthPct}%` }}
            >
              <motion.div
                className="h-full w-full origin-left bg-dawn"
                initial={reduced ? false : { scaleX: 0 }}
                animate={{ scaleX: fraction }}
                transition={reduced ? { duration: 0 } : { duration: 0.4 }}
              />
            </div>
          )
        })()}

        {checkInMin !== null && (
          <div
            className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 -translate-x-1/2 rounded-full bg-meridian ring-2 ring-surface"
            style={{ left: `${workedStartPct}%` }}
          />
        )}
        {checkOutMin !== null && (
          <div
            className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 -translate-x-1/2 rounded-full bg-ink ring-2 ring-surface"
            style={{ left: `${clampPct(checkOutMin, start, end)}%` }}
          />
        )}

        {showMarker && !checkOutMin && (
          <motion.div
            className="absolute top-1/2 z-10 h-4 w-0.5 -translate-y-1/2 -translate-x-1/2 rounded-full bg-ink"
            style={{ left: `${markerPct}%` }}
          />
        )}

        {scrub && (
          <div
            className="pointer-events-none absolute -top-9 z-20 -translate-x-1/2 rounded-md bg-ink px-2 py-1 text-xs font-mono-tabular text-paper shadow-lg"
            style={{ left: `${scrub.x}%` }}
          >
            {scrub.label}
          </div>
        )}
      </div>
      <div className="mt-2 flex items-center gap-4 text-xs text-slate">
        <LegendDot color="bg-meridian" label="Worked" />
        <LegendDot color="bg-dawn" label="Overtime" />
        <LegendDot color="bg-ink/15" label="Remaining" />
      </div>
    </div>
  )
}

function toMinutes(clock: string) {
  const [h, m] = clock.split(":").map(Number)
  return h * 60 + m
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      {label}
    </span>
  )
}
