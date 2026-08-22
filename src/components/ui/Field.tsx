import clsx from "clsx"
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react"

export default function Field({
  label,
  error,
  hint,
  children,
}: {
  label?: string
  error?: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="mb-4">
      {label && <label className="mb-1.5 block text-xs font-medium text-slate">{label}</label>}
      {children}
      {hint && !error && <p className="mt-1.5 text-xs text-slate">{hint}</p>}
      {error && <p className="mt-1.5 text-xs text-rose">{error}</p>}
    </div>
  )
}

const inputClass =
  "w-full rounded-lg hairline bg-ink/2 px-3.5 py-2.5 text-sm text-ink placeholder:text-slate/60 outline-none transition-all focus:border-meridian/50 focus:bg-surface focus:ring-2 focus:ring-meridian/15"

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={clsx(inputClass, className)} />
}

export function TextArea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={clsx(inputClass, "resize-none", className)} />
}
