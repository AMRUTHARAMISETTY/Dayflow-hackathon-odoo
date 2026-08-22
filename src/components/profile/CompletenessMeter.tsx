import { motion } from "framer-motion"
import Card from "../ui/Card"
import type { Profile } from "../../types"
import { computeCompleteness } from "../../lib/completeness"
import { useReducedMotion } from "../../hooks/useReducedMotion"

export default function CompletenessMeter({ profile }: { profile: Profile }) {
  const reduced = useReducedMotion()
  const { percent, missing } = computeCompleteness(profile)

  return (
    <Card delay={0}>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate">Profile completeness</h2>
        <span className="font-mono-tabular text-sm font-semibold text-ink">{percent}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-ink/7">
        <motion.div
          className="h-full origin-left rounded-full bg-meridian"
          initial={reduced ? false : { scaleX: 0 }}
          animate={{ scaleX: percent / 100 }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
      </div>
      {missing.length > 0 && (
        <ul className="mt-3 space-y-1">
          {missing.map((m) => (
            <li key={m.label} className="text-xs text-slate">
              <span className="font-medium text-ink">{m.label} missing</span> — {m.reason}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
