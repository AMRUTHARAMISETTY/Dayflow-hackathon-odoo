import { Link } from "react-router-dom"
import Card from "../ui/Card"
import Dial from "../ui/Dial"
import { CardSkeleton } from "../ui/Skeleton"
import { useLeaveBalancesQuery } from "../../lib/queries"

export default function LeaveGlanceCard() {
  const { data, isLoading } = useLeaveBalancesQuery()
  if (isLoading) return <CardSkeleton lines={2} />

  return (
    <Card delay={0.15}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate">Leave at a glance</h2>
        <Link to="/leave" className="text-xs font-semibold text-meridian hover:underline">
          Apply
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {(data ?? []).map((b) => {
          const uncapped = b.entitled === 0
          const available = b.entitled - b.taken - b.pending
          return (
            <div key={b.type} className="flex flex-col items-center">
              <Dial
                takenFraction={uncapped ? 0 : b.entitled ? (b.taken + b.pending) / b.entitled : 0}
                pendingFraction={uncapped ? 0 : b.entitled ? b.pending / b.entitled : 0}
                hasPending={!uncapped && b.pending > 0}
                size={64}
                strokeWidth={6}
              >
                <span className="text-base font-bold text-ink font-mono-tabular">
                  {uncapped ? b.taken : available}
                </span>
              </Dial>
              <p className="mt-1.5 text-xs font-medium text-ink">{b.type}</p>
              <p className="text-[10px] text-slate">{uncapped ? "taken, no cap" : "available"}</p>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
