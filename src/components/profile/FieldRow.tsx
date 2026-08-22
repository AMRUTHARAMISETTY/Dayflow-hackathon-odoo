import { useState } from "react"
import { Pencil, Check, X } from "lucide-react"
import type { ProfileFieldState } from "../../types"
import StatusPill from "../ui/StatusPill"

export default function FieldRow({
  label,
  field,
  onSave,
  saving,
}: {
  label: string
  field: ProfileFieldState<string>
  onSave: (value: string) => void
  saving?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(field.value)

  return (
    <div className="py-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-slate">{label}</span>
        {editing ? (
          <div className="flex items-center gap-1.5">
            <input
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="rounded-md hairline bg-ink/2 px-2 py-1 text-sm text-ink outline-none focus:border-meridian/50"
            />
            <button
              onClick={() => {
                onSave(value)
                setEditing(false)
              }}
              disabled={saving}
              className="flex h-6 w-6 items-center justify-center rounded-md bg-meridian-dim text-meridian"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => {
                setValue(field.value)
                setEditing(false)
              }}
              className="flex h-6 w-6 items-center justify-center rounded-md text-slate hover:bg-ink/5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-ink">{field.value || "—"}</span>
            {field.state !== "saved" && <StatusPill status={field.state} />}
            <button
              onClick={() => setEditing(true)}
              className="flex h-6 w-6 items-center justify-center rounded-md text-slate hover:bg-ink/5"
            >
              <Pencil className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
      {field.state === "rejected" && field.rejectionReason && (
        <p className="mt-1 text-xs text-rose">{field.rejectionReason}</p>
      )}
    </div>
  )
}
