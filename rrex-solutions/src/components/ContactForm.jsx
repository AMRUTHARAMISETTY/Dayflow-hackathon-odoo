import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, CheckCircle2 } from 'lucide-react'

const FIELD_CLASS =
  'w-full rounded-lg border border-obsidian-600 bg-obsidian-900/70 px-4 py-3 text-[14px] text-bone-500 placeholder:text-bone-500/35 outline-none transition-colors focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40'

export default function ContactForm() {
  const [sent, setSent] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setSent(true)
  }

  return (
    <div className="glass-panel relative overflow-hidden p-7 sm:p-9">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-amber-radial opacity-40 blur-3xl"
      />

      <AnimatePresence mode="wait">
        {sent ? (
          <motion.div
            key="sent"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="relative flex flex-col items-center justify-center py-10 text-center"
          >
            <CheckCircle2 size={38} className="text-amber-400" />
            <h3 className="mt-4 font-display text-xl font-bold text-bone-500">Signal received.</h3>
            <p className="mt-2 max-w-xs text-[14px] text-bone-500/60">
              Our team will excavate your message and get back to you shortly.
            </p>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onSubmit={handleSubmit}
            className="relative space-y-4"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[12.5px] font-medium text-bone-500/70">Name</label>
                <input required type="text" placeholder="Your name" className={FIELD_CLASS} />
              </div>
              <div>
                <label className="mb-1.5 block text-[12.5px] font-medium text-bone-500/70">Email</label>
                <input required type="email" placeholder="you@company.com" className={FIELD_CLASS} />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[12.5px] font-medium text-bone-500/70">Company</label>
              <input type="text" placeholder="Company name" className={FIELD_CLASS} />
            </div>

            <div>
              <label className="mb-1.5 block text-[12.5px] font-medium text-bone-500/70">Message</label>
              <textarea
                required
                rows={4}
                placeholder="Tell us what you're building…"
                className={`${FIELD_CLASS} resize-none`}
              />
            </div>

            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="claw-btn group inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-6 py-3.5 text-[15px] font-semibold text-obsidian-900 shadow-amberGlow transition-shadow hover:shadow-[0_20px_45px_-10px_rgba(201,122,61,0.55)] sm:w-auto"
            >
              <span>Send Message</span>
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </motion.button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  )
}
