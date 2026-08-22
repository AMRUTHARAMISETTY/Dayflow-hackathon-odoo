import { useFormContext } from "react-hook-form"
import type { LeaveFormValues } from "../../lib/leaveSchema"
import RangeCalendar from "./RangeCalendar"
import { computeWorkingDays } from "../../lib/dateUtils"
import CountUp from "../ui/CountUp"

export default function DatesStep() {
  const { watch, setValue, formState } = useFormContext<LeaveFormValues>()
  const { startDate, endDate, halfDayStart, halfDayEnd } = watch()
  const workingDays = computeWorkingDays(startDate, endDate, halfDayStart, halfDayEnd)
  const isSingleDay = startDate && startDate === endDate

  return (
    <div>
      <RangeCalendar
        start={startDate}
        end={endDate}
        onChange={(s, e) => {
          setValue("startDate", s, { shouldValidate: true })
          setValue("endDate", e, { shouldValidate: true })
        }}
      />
      {formState.errors.endDate && (
        <p className="mt-2 text-xs text-rose">{formState.errors.endDate.message}</p>
      )}

      {startDate && endDate && (
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate">
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={halfDayStart}
              onChange={(e) => setValue("halfDayStart", e.target.checked)}
              className="rounded border-slate/40"
            />
            Half-day on {startDate}
          </label>
          {!isSingleDay && (
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={halfDayEnd}
                onChange={(e) => setValue("halfDayEnd", e.target.checked)}
                className="rounded border-slate/40"
              />
              Half-day on {endDate}
            </label>
          )}
        </div>
      )}

      <div className="mt-4 rounded-lg bg-meridian-dim px-3 py-2.5 text-sm text-meridian">
        {startDate && endDate ? (
          <>
            <span className="font-mono-tabular font-semibold">
              <CountUp value={workingDays} decimals={workingDays % 1 !== 0 ? 1 : 0} />
            </span>{" "}
            working day{workingDays === 1 ? "" : "s"} requested — weekends and holidays excluded automatically.
          </>
        ) : (
          "Select a start and end date on the calendar."
        )}
      </div>
    </div>
  )
}
