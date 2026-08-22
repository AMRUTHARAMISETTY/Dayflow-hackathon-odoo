import clsx from 'clsx'

export default function Field({ label, error, dark = true, children }) {
  return (
    <div className="mb-4">
      {label && (
        <label className={clsx('mb-1.5 block text-xs font-medium', dark ? 'text-white/60' : 'text-ink-900/50')}>
          {label}
        </label>
      )}
      {children}
      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </div>
  )
}

export function TextInput({ dark = true, className, ...props }) {
  return (
    <input
      {...props}
      className={clsx(
        'w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-all',
        dark
          ? 'border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:border-accent-400/60 focus:bg-white/10 focus:ring-2 focus:ring-accent-400/20'
          : 'border-black/10 bg-black/2 text-ink-900 placeholder:text-ink-900/30 focus:border-brand-400/60 focus:bg-white focus:ring-2 focus:ring-brand-400/15',
        className,
      )}
    />
  )
}

export function TextArea({ dark = true, className, ...props }) {
  return (
    <textarea
      {...props}
      className={clsx(
        'w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-all resize-none',
        dark
          ? 'border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:border-accent-400/60 focus:bg-white/10 focus:ring-2 focus:ring-accent-400/20'
          : 'border-black/10 bg-black/2 text-ink-900 placeholder:text-ink-900/30 focus:border-brand-400/60 focus:bg-white focus:ring-2 focus:ring-brand-400/15',
        className,
      )}
    />
  )
}
