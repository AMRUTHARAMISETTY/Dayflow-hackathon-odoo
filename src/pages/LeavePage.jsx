import { useState } from 'react'
import { Plus } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import LeaveForm from '../components/leave/LeaveForm'
import LeaveHistoryList from '../components/leave/LeaveHistoryList'
import { useStore } from '../lib/store'

export default function LeavePage() {
  const { leaveRequests } = useStore()
  const [open, setOpen] = useState(false)

  return (
    <div>
      <PageHeader
        eyebrow="Time off"
        title="Leave requests"
        subtitle="Apply for leave and track approval status."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Apply for Leave
          </Button>
        }
      />

      <LeaveHistoryList requests={leaveRequests} />

      <Modal open={open} onClose={() => setOpen(false)} title="Apply for Leave">
        <LeaveForm onDone={() => setOpen(false)} />
      </Modal>
    </div>
  )
}
