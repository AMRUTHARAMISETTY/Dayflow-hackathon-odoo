import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import Modal from "../ui/Modal"
import Field, { TextArea } from "../ui/Field"
import Button from "../ui/Button"
import { apiCreateTicket } from "../../lib/mockApi"
import { useAuth } from "../../lib/auth"
import type { AttendanceDay } from "../../types"

const ISSUES = [
  { value: "missing-check-in", label: "Missing check-in" },
  { value: "missing-check-out", label: "Missing check-out" },
  { value: "wrong-time", label: "Wrong time recorded" },
  { value: "marked-absent", label: "Marked absent in error" },
  { value: "other", label: "Other" },
]

export default function CorrectionModal({ day, onClose }: { day: AttendanceDay | null; onClose: () => void }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [issue, setIssue] = useState(ISSUES[0].value)
  const [reason, setReason] = useState("")

  const mutation = useMutation({
    mutationFn: () =>
      apiCreateTicket(user!.id, {
        category: "attendance",
        subject: `${ISSUES.find((i) => i.value === issue)?.label} — ${day?.date}`,
        body: reason,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] })
      onClose()
      setReason("")
    },
  })

  return (
    <Modal open={!!day} onClose={onClose} title={`Request a correction — ${day?.date ?? ""}`}>
      <Field label="What's wrong">
        <select
          value={issue}
          onChange={(e) => setIssue(e.target.value)}
          className="w-full rounded-lg hairline bg-ink/2 px-3.5 py-2.5 text-sm text-ink outline-none focus:border-meridian/50"
        >
          {ISSUES.map((i) => (
            <option key={i.value} value={i.value}>
              {i.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Explain what happened">
        <TextArea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. badge reader was down at the east entrance…" />
      </Field>
      <p className="mb-4 text-xs text-slate">
        This opens a ticket with HR/your manager. You'll see submitted → viewed → decided in Support.
      </p>
      <Button className="w-full" disabled={!reason || mutation.isPending} onClick={() => mutation.mutate()}>
        {mutation.isPending ? "Submitting…" : "Submit correction"}
      </Button>
    </Modal>
  )
}
