import { useState } from "react"
import { Plus } from "lucide-react"
import PageHeader from "../components/ui/PageHeader"
import Button from "../components/ui/Button"
import Modal from "../components/ui/Modal"
import OfflineBanner from "../components/ui/OfflineBanner"
import { CardSkeleton } from "../components/ui/Skeleton"
import ErrorState from "../components/ui/ErrorState"
import BalanceDial from "../components/leave/BalanceDial"
import LeaveWizard from "../components/leave/LeaveWizard"
import RequestList from "../components/leave/RequestList"
import { useLeaveBalancesQuery, useLeaveRequestsQuery } from "../lib/queries"

export default function LeavePage() {
  const balancesQuery = useLeaveBalancesQuery()
  const requestsQuery = useLeaveRequestsQuery()
  const [open, setOpen] = useState(false)

  return (
    <div>
      <PageHeader
        eyebrow="Leave"
        title="Leave requests"
        subtitle="Apply for time off and track approval status."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Apply for leave
          </Button>
        }
      />

      <OfflineBanner />

      <div className="mb-6 grid gap-3 md:grid-cols-3">
        {balancesQuery.isLoading &&
          Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} lines={2} />)}
        {balancesQuery.isError && (
          <div className="md:col-span-3">
            <ErrorState message="Couldn't load your balances." onRetry={() => balancesQuery.refetch()} />
          </div>
        )}
        {balancesQuery.data?.map((b, i) => <BalanceDial key={b.type} balance={b} index={i} />)}
      </div>

      {requestsQuery.isLoading ? (
        <CardSkeleton lines={4} />
      ) : requestsQuery.isError ? (
        <ErrorState message="Couldn't load your requests." onRetry={() => requestsQuery.refetch()} />
      ) : (
        <RequestList requests={requestsQuery.data ?? []} />
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Apply for leave">
        {balancesQuery.data && <LeaveWizard balances={balancesQuery.data} onDone={() => setOpen(false)} />}
      </Modal>
    </div>
  )
}
