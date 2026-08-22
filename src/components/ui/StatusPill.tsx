import clsx from "clsx"
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  CalendarOff,
  PartyPopper,
  Sun,
  CircleDot,
  type LucideIcon,
} from "lucide-react"

export type Tone = "meridian" | "dawn" | "rose" | "slate"

const TONE_CLASSES: Record<Tone, string> = {
  meridian: "bg-meridian-dim text-meridian",
  dawn: "bg-dawn-dim text-dawn",
  rose: "bg-rose-dim text-rose",
  slate: "bg-ink/6 text-slate",
}

const STATUS_META: Record<string, { icon: LucideIcon; label: string; tone: Tone }> = {
  present: { icon: CheckCircle2, label: "Present", tone: "meridian" },
  absent: { icon: XCircle, label: "Absent", tone: "rose" },
  "half-day": { icon: Sun, label: "Half-day", tone: "dawn" },
  leave: { icon: CalendarOff, label: "Leave", tone: "slate" },
  holiday: { icon: PartyPopper, label: "Holiday", tone: "slate" },
  weekend: { icon: CircleDot, label: "Weekend", tone: "slate" },
  exception: { icon: AlertTriangle, label: "Exception", tone: "dawn" },
  pending: { icon: Clock, label: "Pending", tone: "dawn" },
  approved: { icon: CheckCircle2, label: "Approved", tone: "meridian" },
  rejected: { icon: XCircle, label: "Rejected", tone: "rose" },
  cancelled: { icon: XCircle, label: "Cancelled", tone: "slate" },
  submitted: { icon: Clock, label: "Submitted", tone: "dawn" },
  viewed: { icon: Clock, label: "Under review", tone: "dawn" },
  "info-requested": { icon: AlertTriangle, label: "Info requested", tone: "dawn" },
  verified: { icon: CheckCircle2, label: "Verified", tone: "meridian" },
  expiring: { icon: AlertTriangle, label: "Expiring", tone: "dawn" },
  expired: { icon: XCircle, label: "Expired", tone: "rose" },
  available: { icon: CheckCircle2, label: "Available", tone: "meridian" },
  open: { icon: Clock, label: "Open", tone: "dawn" },
  "in-progress": { icon: Clock, label: "In progress", tone: "dawn" },
  resolved: { icon: CheckCircle2, label: "Resolved", tone: "meridian" },
  closed: { icon: XCircle, label: "Closed", tone: "slate" },
  saved: { icon: CheckCircle2, label: "Saved", tone: "meridian" },
}

export default function StatusPill({
  status,
  label,
  iconOnly = false,
}: {
  status: string
  label?: string
  iconOnly?: boolean
}) {
  const meta = STATUS_META[status] ?? { icon: Clock, label: status, tone: "slate" as Tone }
  const Icon = meta.icon
  if (iconOnly) {
    return (
      <span
        title={label ?? meta.label}
        className={clsx(
          "inline-flex h-6 w-6 items-center justify-center rounded-full",
          TONE_CLASSES[meta.tone],
        )}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
      </span>
    )
  }
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        TONE_CLASSES[meta.tone],
      )}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
      {label ?? meta.label}
    </span>
  )
}
