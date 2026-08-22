import { Link } from "react-router-dom"
import { motion } from "framer-motion"
import { CheckCircle2 } from "lucide-react"
import type { AttentionItem, AttentionUrgency } from "../../types"
import Card from "../ui/Card"
import { CardSkeleton } from "../ui/Skeleton"
import EmptyState from "../ui/EmptyState"
import { useAttentionQuery, useLeaveRequestsQuery } from "../../lib/queries"

const GROUP_LABEL: Record<AttentionUrgency, string> = {
  overdue: "Overdue",
  "due-today": "Due today",
  upcoming: "Upcoming",
  info: "For information",
}

const GROUP_ORDER: AttentionUrgency[] = ["overdue", "due-today", "upcoming", "info"]

export default function AttentionList() {
  const { data, isLoading } = useAttentionQuery()
  const { data: leaveRequests } = useLeaveRequestsQuery()

  if (isLoading) return <CardSkeleton lines={4} />

  const items = data ?? []
  const nextLeave = leaveRequests?.find((r) => r.status === "approved" && r.startDate >= isoToday())

  if (items.length === 0) {
    return (
      <Card delay={0.1}>
        <h2 className="mb-1 text-sm font-semibold text-slate">Needs your attention</h2>
        <EmptyState
          icon={CheckCircle2}
          title="Nothing needs you today."
          description={
            nextLeave
              ? `Your next leave is ${formatDate(nextLeave.startDate)}.`
              : "You're all caught up."
          }
        />
      </Card>
    )
  }

  const grouped = GROUP_ORDER.map((g) => ({ urgency: g, items: items.filter((i) => i.urgency === g) })).filter(
    (g) => g.items.length > 0,
  )

  return (
    <Card delay={0.1}>
      <h2 className="mb-3 text-sm font-semibold text-slate">Needs your attention</h2>
      <div className="space-y-4">
        {grouped.map((group) => (
          <div key={group.urgency}>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate/70">
              {GROUP_LABEL[group.urgency]}
            </p>
            <div className="space-y-1">
              {group.items.map((item, i) => (
                <AttentionRow key={item.id} item={item} index={i} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function AttentionRow({ item, index }: { item: AttentionItem; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-ink/2"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-ink">{item.title}</p>
        <p className="truncate text-xs text-slate">{item.detail}</p>
      </div>
      <Link
        to={item.actionHref}
        className="shrink-0 rounded-lg bg-meridian-dim px-2.5 py-1.5 text-xs font-semibold text-meridian hover:brightness-95"
      >
        {item.actionLabel}
      </Link>
    </motion.div>
  )
}

function isoToday() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "long" })
}
