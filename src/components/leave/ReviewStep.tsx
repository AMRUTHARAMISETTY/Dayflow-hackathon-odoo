import { useFormContext } from "react-hook-form"
import { ArrowRight, Zap } from "lucide-react"
import type { LeaveFormValues } from "../../lib/leaveSchema"
import type { LeaveBalance } from "../../types"
import { computeWorkingDays } from "../../lib/dateUtils"
import { previewApprovalPath, previewBalanceImpact } from "../../lib/mockApi"
import CoverageInsight from "./CoverageInsight"

export default function ReviewStep({ balances }: { balances: LeaveBalance[] }) {
  const { watch } = useFormContext<LeaveFormValues>()
  const { startDate, endDate, halfDayStart, halfDayEnd, type, reason } = watch()
  const workingDays = computeWorkingDays(startDate, endDate, halfDayStart, halfDayEnd)
  const impact = previewBalanceImpact(balances, type, workingDays)
  const path = previewApprovalPath(type, workingDays, impact.available)

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-ink/3 p-3 text-sm">
        <div className="flex justify-between py-1">
          <span className="text-slate">Dates</span>
          <span className="font-mono-tabular text-ink">
            {startDate} → {endDate}
          </span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-slate">Type</span>
          <span className="text-ink">{type}</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-slate">Working days</span>
          <span className="font-mono-tabular text-ink">{workingDays}</span>
        </div>
        {reason && (
          <div className="pt-2 mt-1 border-t border-ink/5">
            <span className="text-slate">Remarks: </span>
            <span className="text-ink">{reason}</span>
          </div>
        )}
      </div>

      <CoverageInsight startDate={startDate} endDate={endDate} />

      <div className="rounded-lg hairline p-3">
        <p className="mb-2 text-xs font-medium text-slate">Approval path</p>
        {path.autoApprovedRule ? (
          <p className="flex items-center gap-1.5 text-sm text-meridian">
            <Zap className="h-3.5 w-3.5" /> Auto-approved — {path.autoApprovedRule}
          </p>
        ) : (
          <div className="flex items-center gap-2 text-sm text-ink">
            {path.roles.map((r, i) => (
              <span key={i} className="flex items-center gap-2">
                {i > 0 && <ArrowRight className="h-3.5 w-3.5 text-slate" />}
                <span>
                  {r.approverName}
                  <span className="ml-1 text-xs text-slate">({r.role === "hr" ? "HR" : "Manager"})</span>
                </span>
              </span>
            ))}
          </div>
        )}
        {path.roles[0]?.delegated && (
          <p className="mt-1.5 text-xs text-dawn">Reassigned to {path.roles[0].approverName} — your manager is on leave.</p>
        )}
      </div>
    </div>
  )
}
