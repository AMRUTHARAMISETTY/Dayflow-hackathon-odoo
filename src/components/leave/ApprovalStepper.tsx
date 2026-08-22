import { motion } from "framer-motion"
import { Check, X } from "lucide-react"
import type { ApprovalStep } from "../../types"
import { useReducedMotion } from "../../hooks/useReducedMotion"

function timeAgo(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr + "T00:00:00").getTime()
  const days = Math.floor(diffMs / 86_400_000)
  if (days <= 0) return "today"
  if (days === 1) return "1 day"
  return `${days} days`
}

export default function ApprovalStepper({ steps, appliedOn }: { steps: ApprovalStep[]; appliedOn: string }) {
  const reduced = useReducedMotion()

  return (
    <div className="flex items-start gap-1">
      {steps.map((step, i) => (
        <div key={i} className="flex flex-1 items-start gap-1">
          <div className="flex flex-col items-center" style={{ minWidth: 96 }}>
            <motion.div
              initial={false}
              animate={
                step.status === "approved"
                  ? { backgroundColor: "var(--color-meridian)", scale: [1, 1.15, 1] }
                  : step.status === "rejected"
                    ? { backgroundColor: "var(--color-rose)" }
                    : step.status === "active"
                      ? { backgroundColor: "var(--color-dawn)" }
                      : { backgroundColor: "color-mix(in srgb, var(--color-ink) 8%, transparent)" }
              }
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="relative flex h-7 w-7 items-center justify-center rounded-full text-white"
            >
              {step.status === "approved" && <Check className="h-3.5 w-3.5" />}
              {step.status === "rejected" && <X className="h-3.5 w-3.5" />}
              {step.status === "active" && !reduced && (
                <motion.span
                  animate={{ opacity: [0.6, 0, 0.6], scale: [1, 1.7, 1] }}
                  transition={{ repeat: Infinity, duration: 1.8 }}
                  className="absolute inset-0 rounded-full bg-dawn"
                />
              )}
              {step.status === "active" && <span className="relative h-2 w-2 rounded-full bg-white" />}
            </motion.div>
            <p className="mt-1.5 text-center text-xs font-medium text-ink">{step.approverName}</p>
            <p className="text-center text-[10px] text-slate">{step.role === "hr" ? "HR" : "Manager"}</p>
            {step.delegationReason && (
              <p className="mt-0.5 text-center text-[10px] text-dawn">
                Reassigned — {step.delegationReason}
              </p>
            )}
            {step.status === "active" && (
              <p className="mt-0.5 text-center text-[10px] text-slate">Waiting {timeAgo(appliedOn)}</p>
            )}
            {step.comment && <p className="mt-0.5 max-w-[110px] text-center text-[10px] text-slate">"{step.comment}"</p>}
          </div>
          {i < steps.length - 1 && (
            <motion.div
              initial={false}
              animate={{
                backgroundColor:
                  step.status === "approved"
                    ? "var(--color-meridian)"
                    : "color-mix(in srgb, var(--color-ink) 10%, transparent)",
              }}
              transition={{ duration: 0.4 }}
              className="mt-3.5 h-0.5 flex-1"
            />
          )}
        </div>
      ))}
    </div>
  )
}
