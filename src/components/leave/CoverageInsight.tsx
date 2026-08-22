import { motion } from "framer-motion"
import { Users } from "lucide-react"
import CountUp from "../ui/CountUp"
import { computeCoverage } from "../../lib/mockApi"
import { useReducedMotion } from "../../hooks/useReducedMotion"

export default function CoverageInsight({ startDate, endDate }: { startDate: string; endDate: string }) {
  const reduced = useReducedMotion()
  const { count, total, teammates } = computeCoverage(startDate, endDate)
  const fraction = total ? count / total : 0

  return (
    <div className="rounded-lg hairline p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate">
        <Users className="h-3.5 w-3.5" /> Coverage insight
      </div>
      <p className="mb-3 text-sm text-ink">
        <span className="font-mono-tabular font-semibold">
          <CountUp value={count} />
        </span>{" "}
        of <span className="font-mono-tabular">{total}</span> in your team are away{" "}
        {formatRange(startDate, endDate)}.
      </p>

      {count > 0 && (
        <div className="mb-3 flex -space-x-2">
          {teammates.map((m, i) => (
            <motion.img
              key={m.name}
              src={m.avatarUrl}
              alt={m.name}
              title={m.name}
              initial={reduced ? false : { opacity: 0, y: -10, x: -6, scale: 0.6 }}
              animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
              transition={{ delay: reduced ? 0 : i * 0.1, type: "spring", stiffness: 300, damping: 20 }}
              className="h-8 w-8 rounded-full ring-2 ring-surface"
            />
          ))}
        </div>
      )}

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink/7">
        <motion.div
          className="h-full origin-left rounded-full bg-dawn"
          initial={reduced ? false : { scaleX: 0 }}
          animate={{ scaleX: fraction }}
          transition={{ duration: 0.7, delay: reduced ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <p className="mt-2 text-xs text-slate">
        This isn't a block — shifting your dates by a day or two can reduce overlap voluntarily.
      </p>
    </div>
  )
}

function formatRange(start: string, end: string) {
  const s = new Date(start).toLocaleDateString(undefined, { day: "numeric", month: "short" })
  const e = new Date(end).toLocaleDateString(undefined, { day: "numeric", month: "short" })
  return start === end ? s : `${s} – ${e}`
}
