import { useState } from 'react'
import { motion } from 'framer-motion'
import { Send } from 'lucide-react'
import Field, { TextInput, TextArea } from '../ui/Field'
import Button from '../ui/Button'
import { LEAVE_TYPES } from '../../lib/mockData'
import { useStore } from '../../lib/store'

export default function LeaveForm({ onDone }) {
  const { applyLeave, pushToast } = useStore()
  const [form, setForm] = useState({
    type: 'Paid',
    startDate: '',
    endDate: '',
    remarks: '',
  })
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.startDate || !form.endDate) {
      setError('Please select both start and end dates.')
      return
    }
    if (form.endDate < form.startDate) {
      setError('End date cannot be before start date.')
      return
    }
    applyLeave(form)
    pushToast('Leave request submitted for approval.')
    onDone?.()
  }

  return (
    <form onSubmit={handleSubmit}>
      <Field label="Leave type" dark={false}>
        <div className="grid grid-cols-3 gap-2">
          {LEAVE_TYPES.map((t) => (
            <motion.button
              type="button"
              key={t}
              whileTap={{ scale: 0.95 }}
              onClick={() => setForm((f) => ({ ...f, type: t }))}
              className={`rounded-xl border px-3 py-2 text-sm font-medium transition-all ${
                form.type === t
                  ? 'border-brand-400 bg-brand-50 text-brand-700'
                  : 'border-black/10 text-ink-900/50 hover:bg-black/[0.02]'
              }`}
            >
              {t}
            </motion.button>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Start date" dark={false}>
          <TextInput
            dark={false}
            type="date"
            required
            value={form.startDate}
            onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
          />
        </Field>
        <Field label="End date" dark={false}>
          <TextInput
            dark={false}
            type="date"
            required
            value={form.endDate}
            onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
          />
        </Field>
      </div>

      <Field label="Remarks" error={error} dark={false}>
        <TextArea
          dark={false}
          rows={3}
          placeholder="Reason for leave…"
          value={form.remarks}
          onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
        />
      </Field>

      <Button type="submit" className="w-full mt-1">
        <Send className="h-4 w-4" /> Submit Request
      </Button>
    </form>
  )
}
