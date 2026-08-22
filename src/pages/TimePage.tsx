import { useState } from "react"
import PageHeader from "../components/ui/PageHeader"
import Card from "../components/ui/Card"
import { CardSkeleton } from "../components/ui/Skeleton"
import ErrorState from "../components/ui/ErrorState"
import OfflineBanner from "../components/ui/OfflineBanner"
import AttendanceRow from "../components/time/AttendanceRow"
import CorrectionModal from "../components/time/CorrectionModal"
import { useAttendanceQuery } from "../lib/queries"
import { daysFromToday, isoDate } from "../lib/mockData"
import type { AttendanceDay } from "../types"

export default function TimePage() {
  const { data, isLoading, isError, refetch } = useAttendanceQuery()
  const [view, setView] = useState<"week" | "month">("week")
  const [correctionDay, setCorrectionDay] = useState<AttendanceDay | null>(null)

  const cutoff = isoDate(daysFromToday(view === "week" ? -7 : -31))
  const rows = (data ?? []).filter((d) => d.date >= cutoff)

  return (
    <div>
      <PageHeader
        eyebrow="Time"
        title="Attendance"
        subtitle="Is my record accurate?"
        action={
          <div className="flex rounded-lg bg-ink/5 p-1">
            {(["week", "month"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  view === v ? "bg-surface text-ink shadow-sm" : "text-slate"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        }
      />
      <OfflineBanner />

      {isLoading && <CardSkeleton lines={6} />}
      {isError && <ErrorState message="Couldn't load attendance." onRetry={() => refetch()} />}

      {rows.length > 0 && (
        <Card>
          <div className="space-y-0.5">
            {rows.map((day, i) => (
              <AttendanceRow key={day.date} day={day} index={i} onRequestCorrection={setCorrectionDay} />
            ))}
          </div>
        </Card>
      )}

      <CorrectionModal day={correctionDay} onClose={() => setCorrectionDay(null)} />
    </div>
  )
}
