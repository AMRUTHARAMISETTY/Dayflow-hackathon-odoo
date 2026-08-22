import { Link } from "react-router-dom"
import { Download, FileText } from "lucide-react"
import Card from "../ui/Card"
import { CardSkeleton } from "../ui/Skeleton"
import CountUp from "../ui/CountUp"
import { usePaySlipsQuery } from "../../lib/queries"

export default function LatestSlipCard() {
  const { data, isLoading } = usePaySlipsQuery()
  if (isLoading) return <CardSkeleton lines={2} />

  const latest = (data ?? [])[data && data.length > 0 ? data.length - 1 : 0]
  if (!latest) return null

  return (
    <Card delay={0.25}>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate">Latest slip</h2>
        <FileText className="h-4 w-4 text-slate" />
      </div>
      <p className="text-sm text-ink">
        {latest.month} {latest.year}
      </p>
      <p className="mt-0.5 text-xl font-bold text-ink font-display">
        <CountUp value={latest.netPay} prefix="₹" />
      </p>
      <Link
        to="/pay"
        className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-meridian-dim px-2.5 py-1.5 text-xs font-semibold text-meridian hover:brightness-95"
      >
        <Download className="h-3.5 w-3.5" /> View slip
      </Link>
    </Card>
  )
}
