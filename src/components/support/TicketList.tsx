import { useAutoAnimate } from "@formkit/auto-animate/react"
import { Inbox } from "lucide-react"
import type { Ticket } from "../../types"
import Card from "../ui/Card"
import StatusPill from "../ui/StatusPill"
import EmptyState from "../ui/EmptyState"

export default function TicketList({ tickets }: { tickets: Ticket[] }) {
  const [listRef] = useAutoAnimate({ duration: 250 })

  if (tickets.length === 0) {
    return (
      <Card>
        <EmptyState icon={Inbox} title="No tickets yet" description="Raise a ticket and it'll show up here with live status." />
      </Card>
    )
  }

  return (
    <div ref={listRef} className="space-y-2">
      {tickets.map((t) => (
        <Card key={t.id}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium text-ink">{t.subject}</p>
              <p className="mt-0.5 text-xs text-slate capitalize">
                {t.category.replace("-", " ")} · {t.createdAt} · {t.slaNote}
              </p>
              <p className="mt-2 text-sm text-ink/80">{t.body}</p>
            </div>
            <StatusPill status={t.status} />
          </div>
        </Card>
      ))}
    </div>
  )
}
