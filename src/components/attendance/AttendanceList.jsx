import { motion } from 'framer-motion'
import Card from '../ui/Card'
import StatusBadge from '../ui/StatusBadge'
import { ATTENDANCE_STATUS_META } from '../../lib/mockData'

export default function AttendanceList({ records }) {
  const sorted = [...records].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 12)

  return (
    <Card delay={0.15} className="p-5">
      <h3 className="mb-4 font-semibold text-ink-900">Recent records</h3>
      <div className="space-y-1">
        {sorted.map((r, i) => (
          <motion.div
            key={r.date}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            className="flex items-center justify-between rounded-lg px-2 py-2.5 text-sm hover:bg-black/[0.02]"
          >
            <div className="flex items-center gap-3">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: ATTENDANCE_STATUS_META[r.status]?.color }}
              />
              <span className="font-medium text-ink-900">
                {new Date(r.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {r.checkIn && (
                <span className="text-xs text-ink-900/40">
                  {r.checkIn} {r.checkOut ? `– ${r.checkOut}` : ''}
                </span>
              )}
              <StatusBadge status={r.status} />
            </div>
          </motion.div>
        ))}
      </div>
    </Card>
  )
}
