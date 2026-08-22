import { useEffect, useRef, useState } from "react"
import { useAutoAnimate } from "@formkit/auto-animate/react"
import { motion } from "framer-motion"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Zap, X, CalendarOff } from "lucide-react"
import type { LeaveRequest } from "../../types"
import Card from "../ui/Card"
import StatusPill from "../ui/StatusPill"
import ConfettiBurst from "../ui/ConfettiBurst"
import ApprovalStepper from "./ApprovalStepper"
import EmptyState from "../ui/EmptyState"
import { apiCancelLeave } from "../../lib/mockApi"
import { useAuth } from "../../lib/auth"
import { eachDate } from "../../lib/dateUtils"
import { useReducedMotion } from "../../hooks/useReducedMotion"

export default function RequestList({ requests }: { requests: LeaveRequest[] }) {
  const [listRef] = useAutoAnimate({ duration: 250 })

  if (requests.length === 0) {
    return (
      <Card>
        <EmptyState icon={CalendarOff} title="No leave requests yet" description="Apply for time off to see it here." />
      </Card>
    )
  }

  return (
    <div ref={listRef} className="space-y-3">
      {requests.map((req) => (
        <RequestCard key={req.id} request={req} />
      ))}
    </div>
  )
}

function RequestCard({ request }: { request: LeaveRequest }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const reduced = useReducedMotion()
  const prevStatus = useRef(request.status)
  const [justApproved, setJustApproved] = useState(false)

  useEffect(() => {
    if (prevStatus.current !== "approved" && request.status === "approved") {
      setJustApproved(true)
      const t = setTimeout(() => setJustApproved(false), 1600)
      return () => clearTimeout(t)
    }
    prevStatus.current = request.status
  }, [request.status])

  const cancelMutation = useMutation({
    mutationFn: () => apiCancelLeave(user!.id, request.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] })
      queryClient.invalidateQueries({ queryKey: ["leave-balances"] })
    },
  })

  const dates = eachDate(request.startDate, request.endDate)
  const canCancel = request.status === "pending" || (request.status === "approved" && request.startDate > todayIso())

  return (
    <Card className="relative overflow-hidden">
      {justApproved && !reduced && (
        <>
          <motion.div
            initial={{ x: "-120%" }}
            animate={{ x: "220%" }}
            transition={{ duration: 0.9, ease: "easeInOut" }}
            className="pointer-events-none absolute inset-y-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/60 to-transparent"
          />
          <ConfettiBurst />
        </>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <p className="font-semibold text-ink">{request.type} Leave</p>
            <motion.span
              animate={justApproved && !reduced ? { rotateX: [0, 90, 0] } : {}}
              transition={{ duration: 0.5 }}
              style={{ transformStyle: "preserve-3d" }}
            >
              <StatusPill status={request.status} />
            </motion.span>
            {request.autoApprovedRule && (
              <span className="flex items-center gap-1 text-[10px] font-medium text-meridian">
                <Zap className="h-3 w-3" /> Auto-approved
              </span>
            )}
          </div>
          <p className="text-xs text-slate font-mono-tabular">
            {request.startDate} → {request.endDate} · {request.workingDays} day(s) · applied {request.appliedOn}
          </p>
          {request.reason && <p className="mt-2 text-sm text-ink/80">{request.reason}</p>}
        </div>
        {canCancel && (
          <button
            onClick={() => cancelMutation.mutate()}
            disabled={cancelMutation.isPending}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate hover:bg-rose-dim hover:text-rose"
          >
            <X className="h-3 w-3" /> Cancel
          </button>
        )}
      </div>

      {request.status !== "cancelled" && (
        <div className="mt-4">
          <ApprovalStepper steps={request.steps} appliedOn={request.appliedOn} />
        </div>
      )}

      {justApproved && dates.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {dates.map((d, i) => (
            <motion.span
              key={d}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: reduced ? 0 : i * 0.04 }}
              className="rounded-md bg-meridian-dim px-1.5 py-0.5 text-[10px] font-mono-tabular text-meridian"
            >
              {d.slice(5)}
            </motion.span>
          ))}
        </div>
      )}
    </Card>
  )
}

function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}
