import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import Reveal from './Reveal'

export default function CTA() {
  return (
    <section className="relative overflow-hidden bg-navy-950 py-24 sm:py-28">
      <motion.div
        aria-hidden
        animate={{ x: [0, 40, 0], y: [0, -20, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-accent-500/25 blur-[100px]"
      />
      <motion.div
        aria-hidden
        animate={{ x: [0, -30, 0], y: [0, 30, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-violet-500/25 blur-[100px]"
      />

      <Reveal className="container-shell relative text-center">
        <h2 className="text-[2.1rem] font-extrabold tracking-tight text-white sm:text-4xl">
          Ready to make HR simpler?
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-[15.5px] text-slate-300">
          Bring your entire HR workflow together with Dayflow.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <motion.a
            href="#home"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="group inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-[15px] font-semibold text-navy-900 shadow-[0_16px_35px_-10px_rgba(0,0,0,0.4)]"
          >
            Get Started Free
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </motion.a>
          <motion.a
            href="#home"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-6 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-white/5"
          >
            Talk to Sales
          </motion.a>
        </div>
      </Reveal>
    </section>
  )
}
