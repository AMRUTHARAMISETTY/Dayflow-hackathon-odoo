import clsx from "clsx"
import { motion } from "framer-motion"
import { FileText } from "lucide-react"
import type { PaySlip } from "../../types"
import CountUp from "../ui/CountUp"

export default function SlipList({
  slips,
  selectedId,
  onSelect,
}: {
  slips: PaySlip[]
  selectedId: string
  onSelect: (id: string) => void
}) {
  return (
    <div className="space-y-1.5">
      {slips.map((slip, i) => (
        <motion.button
          key={slip.id}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.04 }}
          onClick={() => onSelect(slip.id)}
          className={clsx(
            "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors",
            slip.id === selectedId ? "bg-meridian-dim" : "hover:bg-ink/3",
          )}
        >
          <span className="flex items-center gap-2.5">
            <FileText className={clsx("h-4 w-4", slip.id === selectedId ? "text-meridian" : "text-slate")} />
            <span
              className={clsx("text-sm font-medium", slip.id === selectedId ? "text-meridian" : "text-ink")}
            >
              {slip.month} {slip.year}
            </span>
          </span>
          <span className="font-mono-tabular text-xs text-slate">
            ₹<CountUp value={slip.netPay} />
          </span>
        </motion.button>
      ))}
    </div>
  )
}
