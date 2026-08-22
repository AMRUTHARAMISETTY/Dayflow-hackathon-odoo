import type { LucideIcon } from "lucide-react"
import { Inbox } from "lucide-react"
import type { ReactNode } from "react"

export default function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: {
  icon?: LucideIcon
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl py-14 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-ink/5 text-slate">
        <Icon className="h-5 w-5" />
      </div>
      <p className="font-medium text-ink">{title}</p>
      {description && <p className="mt-1 max-w-xs text-sm text-slate">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
