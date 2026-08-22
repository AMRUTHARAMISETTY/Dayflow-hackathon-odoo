import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { AlertTriangle, Send } from "lucide-react"
import Field, { TextArea, TextInput } from "../ui/Field"
import Button from "../ui/Button"
import { apiCreateTicket } from "../../lib/mockApi"
import { useAuth } from "../../lib/auth"
import type { TicketCategory } from "../../types"

const CATEGORIES: { value: TicketCategory; label: string }[] = [
  { value: "attendance", label: "Attendance" },
  { value: "leave", label: "Leave" },
  { value: "payroll", label: "Payroll" },
  { value: "benefits", label: "Benefits" },
  { value: "documents", label: "Documents" },
  { value: "policy", label: "Policy" },
  { value: "workplace-issue", label: "Workplace issue" },
  { value: "confidential-grievance", label: "Confidential grievance" },
]

export default function TicketForm({ onDone }: { onDone: () => void }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [category, setCategory] = useState<TicketCategory>("attendance")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")

  const mutation = useMutation({
    mutationFn: () => apiCreateTicket(user!.id, { category, subject, body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] })
      onDone()
    },
  })

  return (
    <div>
      <Field label="Category">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as TicketCategory)}
          className="w-full rounded-lg hairline bg-ink/2 px-3.5 py-2.5 text-sm text-ink outline-none focus:border-meridian/50"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </Field>

      {category === "confidential-grievance" && (
        <div className="mb-4 flex items-start gap-2 rounded-lg bg-dawn-dim px-3 py-2.5 text-xs text-dawn">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Confidential cases are visible only to authorised HR staff. Your manager will not see this.
        </div>
      )}

      <Field label="Subject">
        <TextInput value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Brief summary" />
      </Field>
      <Field label="Details">
        <TextArea rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="What happened?" />
      </Field>
      <Button
        className="w-full"
        disabled={!subject || !body || mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        <Send className="h-4 w-4" /> {mutation.isPending ? "Submitting…" : "Raise ticket"}
      </Button>
    </div>
  )
}
