import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import Reveal from './Reveal'

export default function CTASection() {
  return (
    <section className="relative overflow-hidden bg-obsidian-950 py-24 sm:py-28">
      <motion.div
        aria-hidden
        animate={{ x: [0, 40, 0], y: [0, -20, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-amber-500/20 blur-[100px]"
      />
      <motion.div
        aria-hidden
        animate={{ x: [0, -30, 0], y: [0, 30, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-bronze-500/20 blur-[100px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-strata-grid [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_10%,transparent_75%)]"
      />

      <Reveal className="container-shell relative text-center">
        <span className="text-[13px] font-bold tracking-[0.14em] text-amber-400">READY TO BUILD?</span>
        <h2 className="mt-4 font-display text-[2.1rem] font-extrabold tracking-tight text-bone-500 sm:text-4xl">
          Software with prehistoric power, engineered for today.
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-[15.5px] text-bone-500/60">
          Bring your hardest engineering problems to R-REX. We build systems that outlast trends.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <motion.a
            href="#contact"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="claw-btn group inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3.5 text-[15px] font-semibold text-obsidian-900 shadow-amberGlow"
          >
            <span>Start a Project</span>
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </motion.a>
          <motion.a
            href="/solutions#contact"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="claw-btn inline-flex items-center gap-2 rounded-xl border border-amber-500/30 px-6 py-3.5 text-[15px] font-semibold text-bone-500 transition-colors hover:bg-obsidian-800"
          >
            <span>Talk to Us</span>
          </motion.a>
        </div>
      </Reveal>
    </section>
  )
}
