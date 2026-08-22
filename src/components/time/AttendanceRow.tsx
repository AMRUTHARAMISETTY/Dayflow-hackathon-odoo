import { motion } from "framer-motion"
import type { AttendanceDay } from "../../types"
import StatusPill from "../ui/StatusPill"
import { daysFromToday, isoDate } from "../../lib/mockData"

function durationLabel(day: AttendanceDay) {
  const totalMin = day.segments.reduce((sum, s) => sum + Math.max(0, s.endMinutes - s.startMinutes), 0)
  if (!totalMin) return "—"
  const h = Math.floor(totalMin / 60)
  const m = Math.round(totalMin % 60)
  return `${h}h ${m}m`
}

export default function AttendanceRow({
  day,
  index,
  onRequestCorrection,
}: {
  day: AttendanceDay
  index: number
  onRequestCorrection: (day: AttendanceDay) => void
}) {
  const isToday = day.date === isoDate(daysFromToday(0))
  const needsFix = day.status === "exception" || (day.checkIn && !day.checkOut && !isToday)

  return (
    <motion.div
      initial={index < 20 ? { opacity: 0, x: -6 } : false}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index, 20) * 0.02 }}
      className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 text-sm hover:bg-ink/2"
    >
      <div className="flex min-w-0 items-center gap-3">
        <StatusPill status={day.status} iconOnly />
        <div className="min-w-0">
          <p className="font-medium text-ink">
            {new Date(day.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
          </p>
          {(day.checkIn || day.checkOut) && (
            <p className="text-xs text-slate font-mono-tabular">
              {day.checkIn?.time ?? "—"} → {day.checkOut?.time ?? "—"}
              {day.checkIn && <span className="ml-1 text-slate/70">({day.checkIn.source})</span>}
            </p>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="font-mono-tabular text-xs text-slate">{durationLabel(day)}</span>
        {day.correctionId ? (
          <span className="text-xs text-meridian">Correction applied</span>
        ) : needsFix ? (
          <button
            onClick={() => onRequestCorrection(day)}
            className="rounded-md bg-dawn-dim px-2 py-1 text-xs font-medium text-dawn hover:brightness-95"
          >
            Request correction
          </button>
        ) : null}
      </div>
    </motion.div>
  )
}
