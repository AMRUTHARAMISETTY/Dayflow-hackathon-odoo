import { useState } from "react"
import { Plus, Sparkles } from "lucide-react"
import PageHeader from "../components/ui/PageHeader"
import Button from "../components/ui/Button"
import Modal from "../components/ui/Modal"
import Card from "../components/ui/Card"
import { CardSkeleton } from "../components/ui/Skeleton"
import OfflineBanner from "../components/ui/OfflineBanner"
import TicketForm from "../components/support/TicketForm"
import TicketList from "../components/support/TicketList"
import PolicyList from "../components/support/PolicyList"
import { useTicketsQuery, usePoliciesQuery } from "../lib/queries"

export default function SupportPage() {
  const ticketsQuery = useTicketsQuery()
  const policiesQuery = usePoliciesQuery()
  const [open, setOpen] = useState(false)

  return (
    <div>
      <PageHeader
        eyebrow="Support"
        title="Help desk & policies"
        subtitle="Who answers this, and what does policy say?"
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Raise a ticket
          </Button>
        }
      />
      <OfflineBanner />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {ticketsQuery.isLoading ? (
            <CardSkeleton lines={3} />
          ) : (
            <TicketList tickets={ticketsQuery.data ?? []} />
          )}
        </div>
        <div className="space-y-4">
          {policiesQuery.data && <PolicyList policies={policiesQuery.data} />}
          <Card delay={0.15}>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate">
              <Sparkles className="h-4 w-4" /> Assistant
            </div>
            <p className="mt-2 text-sm text-ink/70">
              Coming soon — a permission-aware assistant that answers from your own data and cited policy, and
              always confirms before it acts.
            </p>
          </Card>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Raise a ticket">
        <TicketForm onDone={() => setOpen(false)} />
      </Modal>
    </div>
  )
}
