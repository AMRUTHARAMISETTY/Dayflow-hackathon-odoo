import { motion } from 'framer-motion'
import { Download, FileText } from 'lucide-react'
import { useStore } from '../../lib/store'

export default function SalarySlipCard({ slip, index }) {
  const { pushToast } = useStore()

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      whileHover={{ x: 3 }}
      className="flex items-center justify-between rounded-xl border border-black/5 bg-white/70 px-4 py-3"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
          <FileText className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold text-ink-900">
            {slip.month} {slip.year}
          </p>
          <p className="text-xs text-ink-900/40">₹{slip.netPay.toLocaleString('en-IN')} · {slip.status}</p>
        </div>
      </div>
      <button
        onClick={() => pushToast(`${slip.month} ${slip.year} pay slip (demo) — no real file to download yet.`, 'info')}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-900/40 hover:bg-brand-50 hover:text-brand-600 transition-colors"
      >
        <Download className="h-4 w-4" />
      </button>
    </motion.div>
  )
}
