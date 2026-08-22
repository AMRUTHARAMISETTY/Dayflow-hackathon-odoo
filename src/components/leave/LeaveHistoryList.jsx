import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare } from 'lucide-react'
import Card from '../ui/Card'
import StatusBadge from '../ui/StatusBadge'
import ConfettiBurst from '../ui/ConfettiBurst'

export default function LeaveHistoryList({ requests }) {
  return (
    <div className="space-y-3">
      <AnimatePresence initial={false}>
        {requests.map((req) => {
          const showConfetti = req.status === 'approved'
          return (
            <motion.div
              key={req.id}
              layout
              initial={{ opacity: 0, y: -12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            >
              <Card className="relative p-4">
                {showConfetti && <ConfettiBurst />}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <p className="font-semibold text-ink-900">{req.type} Leave</p>
                      <StatusBadge status={req.status} />
                    </div>
                    <p className="text-xs text-ink-900/45">
                      {req.startDate} → {req.endDate} · applied {req.appliedOn}
                    </p>
                    {req.remarks && (
                      <p className="mt-2 text-sm text-ink-900/60">{req.remarks}</p>
                    )}
                    {req.comment && (
                      <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-black/3 px-2.5 py-1.5 text-xs text-ink-900/50">
                        <MessageSquare className="mt-0.5 h-3 w-3 shrink-0" />
                        {req.comment}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          )
        })}
      </AnimatePresence>
      {requests.length === 0 && (
        <p className="py-10 text-center text-sm text-ink-900/40">No leave requests yet.</p>
      )}
    </div>
  )
}
