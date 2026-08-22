import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import clsx from "clsx"
import { isNonWorkingDay } from "../../lib/dateUtils"

function pad(n: number) {
  return n.toString().padStart(2, "0")
}
function toIso(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export default function RangeCalendar({
  start,
  end,
  onChange,
}: {
  start: string
  end: string
  onChange: (start: string, end: string) => void
}) {
  const [viewDate, setViewDate] = useState(() => (start ? new Date(start + "T00:00:00") : new Date()))

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  const startOffset = (firstOfMonth.getDay() + 6) % 7 // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells: (Date | null)[] = [
    ...Array.from({ length: startOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ]

  const todayIso = toIso(new Date())

  function handleClick(date: Date) {
    const iso = toIso(date)
    if (isNonWorkingDay(iso) || iso < todayIso) return
    const midSelection = !!start && start === end
    if (!midSelection) {
      // No selection yet, or a full range was already chosen — start fresh.
      onChange(iso, iso)
    } else if (iso < start) {
      onChange(iso, start)
    } else {
      onChange(start, iso)
    }
  }

  return (
    <div className="rounded-lg hairline p-3">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setViewDate(new Date(year, month - 1, 1))}
          className="flex h-7 w-7 items-center justify-center rounded-md text-slate hover:bg-ink/4"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium text-ink">
          {viewDate.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </span>
        <button
          type="button"
          onClick={() => setViewDate(new Date(year, month + 1, 1))}
          className="flex h-7 w-7 items-center justify-center rounded-md text-slate hover:bg-ink/4"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-slate mb-1">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <span key={i} />
          const iso = toIso(date)
          const disabled = isNonWorkingDay(iso) || iso < todayIso
          const inRange = start && end && iso >= start && iso <= end
          const isEdge = iso === start || iso === end
          return (
            <button
              type="button"
              key={i}
              disabled={disabled}
              onClick={() => handleClick(date)}
              className={clsx(
                "h-8 rounded-md text-xs font-mono-tabular transition-colors",
                disabled && "text-slate/30 cursor-not-allowed line-through",
                !disabled && !inRange && "text-ink hover:bg-ink/5",
                inRange && !isEdge && "bg-meridian-dim text-meridian",
                isEdge && "bg-meridian text-white font-semibold",
              )}
            >
              {date.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}
