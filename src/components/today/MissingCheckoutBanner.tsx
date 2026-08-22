import { useState } from "react"
import { motion } from "framer-motion"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { AlertTriangle } from "lucide-react"
import Button from "../ui/Button"
import { TextInput } from "../ui/Field"
import { apiFixMissingCheckout } from "../../lib/mockApi"
import { useAuth } from "../../lib/auth"
import type { AttendanceDay } from "../../types"

export default function MissingCheckoutBanner({ day }: { day: AttendanceDay }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [time, setTime] = useState("18:00")

  const mutation = useMutation({
    mutationFn: () => apiFixMissingCheckout(user!.id, day.date, time),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] })
      queryClient.invalidateQueries({ queryKey: ["attention"] })
      setEditing(false)
    },
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-dawn-dim px-4 py-3"
    >
      <div className="flex items-center gap-2.5">
        <AlertTriangle className="h-4 w-4 shrink-0 text-dawn" />
        <p className="text-sm text-ink">
          <span className="font-medium">Missing checkout yesterday</span> — checked in at{" "}
          <span className="font-mono-tabular">{day.checkIn?.time}</span>, never checked out.
        </p>
      </div>
      {editing ? (
        <div className="flex items-center gap-2">
          <TextInput
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-28 py-1.5"
          />
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="py-1.5">
            Save
          </Button>
        </div>
      ) : (
        <Button variant="ghost" className="py-1.5" onClick={() => setEditing(true)}>
          Fix this
        </Button>
      )}
    </motion.div>
  )
}
