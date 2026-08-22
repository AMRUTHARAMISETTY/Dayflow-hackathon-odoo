import { useFormContext } from "react-hook-form"
import type { LeaveFormValues } from "../../lib/leaveSchema"
import type { LeaveBalance, LeaveType } from "../../types"
import { LEAVE_TYPES } from "../../lib/leaveTypes"
import { computeWorkingDays } from "../../lib/dateUtils"
import { previewBalanceImpact } from "../../lib/mockApi"
import { TextArea } from "../ui/Field"
import { AlertTriangle } from "lucide-react"

export default function TypeReasonStep({ balances }: { balances: LeaveBalance[] }) {
  const { watch, setValue, register, formState } = useFormContext<LeaveFormValues>()
  const { startDate, endDate, halfDayStart, halfDayEnd, type } = watch()
  const workingDays = computeWorkingDays(startDate, endDate, halfDayStart, halfDayEnd)
  const impact = previewBalanceImpact(balances, type, workingDays)

  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-slate">Leave type</p>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {LEAVE_TYPES.map((t) => (
          <button
            type="button"
            key={t}
            onClick={() => setValue("type", t as LeaveType)}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
              type === t
                ? "border-meridian bg-meridian-dim text-meridian"
                : "border-ink/10 text-slate hover:bg-ink/3"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div
        className={`mb-4 rounded-lg px-3 py-2.5 text-sm ${
          impact.sufficient ? "bg-meridian-dim text-meridian" : "bg-rose-dim text-rose"
        }`}
      >
        {!impact.sufficient && <AlertTriangle className="mb-1 h-4 w-4" />}
        {type === "Unpaid" ? (
          <>Unpaid leave has no balance cap — {workingDays} day(s) will be deducted from pay.</>
        ) : impact.sufficient ? (
          <>
            {workingDays} day{workingDays === 1 ? "" : "s"} requested, {impact.available} available,{" "}
            {impact.remainingAfter} remaining after approval.
          </>
        ) : (
          <>
            Only {impact.available} day{impact.available === 1 ? "" : "s"} available — this request needs{" "}
            {workingDays}. Reduce the range, switch type, or apply for Unpaid leave instead.
          </>
        )}
      </div>

      <p className="mb-1.5 text-xs font-medium text-slate">Remarks</p>
      <TextArea rows={3} placeholder="Reason for leave…" {...register("reason")} />
      {formState.errors.reason && <p className="mt-1.5 text-xs text-rose">{formState.errors.reason.message}</p>}
    </div>
  )
}
