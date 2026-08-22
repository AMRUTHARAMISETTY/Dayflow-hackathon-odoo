import Card from "../ui/Card"
import { CardSkeleton } from "../ui/Skeleton"
import StatusPill from "../ui/StatusPill"
import { useAttendanceQuery } from "../../lib/queries"
import { daysFromToday, isoDate } from "../../lib/mockData"

export default function WeekStripCard() {
  const { data, isLoading } = useAttendanceQuery()
  if (isLoading) return <CardSkeleton lines={3} />

  const byDate = new Map((data ?? []).map((d) => [d.date, d]))
  const start = new Date()
  start.setDate(start.getDate() - start.getDay() + 1) // Monday

  const week = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const date = isoDate(d)
    return { date, label: d.toLocaleDateString(undefined, { weekday: "short" }), day: byDate.get(date) }
  })

  const today = isoDate(daysFromToday(0))

  return (
    <Card delay={0.2}>
      <h2 className="mb-3 text-sm font-semibold text-slate">This week</h2>
      <div className="grid grid-cols-5 gap-2">
        {week.map((w) => (
          <div
            key={w.date}
            className={`flex flex-col items-center gap-2 rounded-lg py-2.5 ${
              w.date === today ? "bg-meridian-dim" : ""
            }`}
          >
            <span className="text-xs font-medium text-slate">{w.label}</span>
            {w.day ? (
              <StatusPill status={w.day.status} iconOnly />
            ) : (
              <span className="h-5 w-5 rounded-full bg-ink/5" />
            )}
            {w.day?.checkIn && (
              <span className="text-[10px] text-slate font-mono-tabular">{w.day.checkIn.time}</span>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}
