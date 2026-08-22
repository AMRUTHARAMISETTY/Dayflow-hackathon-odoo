import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronDown, Info } from "lucide-react"
import type { PayLineItem } from "../../types"
import CountUp from "../ui/CountUp"

export default function ExplainLine({ item }: { item: PayLineItem }) {
  const [open, setOpen] = useState(false)
  const hasLink = !!item.linkedDates?.length
  const negative = item.amount < 0

  return (
    <div className="border-b border-ink/5 last:border-0">
      <button
        type="button"
        onClick={() => hasLink && setOpen((o) => !o)}
        className={`flex w-full items-center justify-between py-2.5 text-left ${hasLink ? "cursor-pointer" : "cursor-default"}`}
      >
        <span className="flex items-center gap-1.5 text-sm text-ink">
          {item.label}
          {hasLink && <Info className="h-3.5 w-3.5 text-slate" />}
        </span>
        <span className="flex items-center gap-1.5">
          <span className={`font-mono-tabular text-sm ${negative ? "text-rose" : "text-ink"}`}>
            {negative ? "-" : ""}₹<CountUp value={Math.abs(item.amount)} />
          </span>
          {hasLink && (
            <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="h-3.5 w-3.5 text-slate" />
            </motion.span>
          )}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && hasLink && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mb-2.5 flex flex-wrap gap-1.5">
              {item.linkedDates!.map((d) => (
                <span key={d} className="rounded-md bg-ink/4 px-2 py-1 text-xs font-mono-tabular text-slate">
                  {d}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
