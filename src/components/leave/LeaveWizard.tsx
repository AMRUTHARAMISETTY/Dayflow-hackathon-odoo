import { useState } from "react"
import { FormProvider, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { AnimatePresence, motion } from "framer-motion"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Check, ChevronLeft, ChevronRight } from "lucide-react"
import { DEFAULT_LEAVE_FORM, leaveFormSchema, type LeaveFormValues } from "../../lib/leaveSchema"
import type { LeaveBalance } from "../../types"
import { computeWorkingDays } from "../../lib/dateUtils"
import { apiApplyLeave, previewBalanceImpact } from "../../lib/mockApi"
import { useAuth } from "../../lib/auth"
import Button from "../ui/Button"
import DatesStep from "./DatesStep"
import TypeReasonStep from "./TypeReasonStep"
import ReviewStep from "./ReviewStep"

const STEP_LABELS = ["Dates", "Type & reason", "Review"]

export default function LeaveWizard({
  balances,
  onDone,
}: {
  balances: LeaveBalance[]
  onDone: () => void
}) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)

  const methods = useForm<LeaveFormValues>({
    resolver: zodResolver(leaveFormSchema),
    defaultValues: DEFAULT_LEAVE_FORM,
    mode: "onChange",
  })
  const { watch, trigger, handleSubmit } = methods
  const values = watch()
  const workingDays = computeWorkingDays(values.startDate, values.endDate, values.halfDayStart, values.halfDayEnd)
  const impact = previewBalanceImpact(balances, values.type, workingDays)

  const mutation = useMutation({
    mutationFn: () =>
      apiApplyLeave(user!.id, {
        type: values.type,
        startDate: values.startDate,
        endDate: values.endDate,
        halfDayStart: values.halfDayStart,
        halfDayEnd: values.halfDayEnd,
        workingDays,
        reason: values.reason,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] })
      queryClient.invalidateQueries({ queryKey: ["leave-balances"] })
      queryClient.invalidateQueries({ queryKey: ["attention"] })
      onDone()
    },
  })

  async function goNext() {
    if (step === 0) {
      const valid = await trigger(["startDate", "endDate"])
      if (!valid || !values.startDate || !values.endDate) return
    }
    if (step === 1) {
      const valid = await trigger(["reason"])
      if (!valid || !impact.sufficient) return
    }
    setDirection(1)
    setStep((s) => Math.min(2, s + 1))
  }

  function goBack() {
    setDirection(-1)
    setStep((s) => Math.max(0, s - 1))
  }

  const submit = handleSubmit(() => mutation.mutate())

  return (
    <FormProvider {...methods}>
      <div className="mb-5 flex items-center gap-2">
        {STEP_LABELS.map((label, i) => (
          <div key={label} className="flex flex-1 items-center gap-2">
            <div
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                i < step ? "bg-meridian text-white" : i === step ? "bg-meridian-dim text-meridian" : "bg-ink/6 text-slate"
              }`}
            >
              {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <span className={`text-xs ${i === step ? "font-medium text-ink" : "text-slate"}`}>{label}</span>
            {i < STEP_LABELS.length - 1 && <div className="h-px flex-1 bg-ink/10" />}
          </div>
        ))}
      </div>

      {/* Not a native <form> — a multi-step wizard has no single submit
          moment for the browser to own, and reusing one <button> DOM slot
          for both "Next" (type=button) and "Submit" (type=submit) caused
          the browser to auto-submit the instant the slot's type flipped. */}
      <div>
        <div className="relative overflow-hidden">
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={step}
              custom={direction}
              initial={{ opacity: 0, x: direction * 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -24 }}
              transition={{ type: "spring", stiffness: 340, damping: 32 }}
            >
              {step === 0 && <DatesStep />}
              {step === 1 && <TypeReasonStep balances={balances} />}
              {step === 2 && <ReviewStep balances={balances} />}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-5 flex items-center justify-between gap-2">
          <Button type="button" variant="ghost" onClick={goBack} disabled={step === 0}>
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
          {step < 2 ? (
            <Button type="button" onClick={goNext}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="button" onClick={submit} disabled={mutation.isPending}>
              {mutation.isPending ? "Submitting…" : "Submit request"}
            </Button>
          )}
        </div>
        {mutation.isError && (
          <p className="mt-2 text-right text-xs text-rose">
            {mutation.error instanceof Error ? mutation.error.message : "Something went wrong."}
          </p>
        )}
      </div>
    </FormProvider>
  )
}
