import { motion } from 'framer-motion'
import { ArrowRight, Sparkles } from 'lucide-react'
import RRexCore from './RRexCoreLazy'

export default function HomeHero() {
  return (
    <section
      id="home"
      className="relative overflow-hidden bg-gradient-to-b from-obsidian-900 via-obsidian-900 to-obsidian-950 pb-24 pt-40 sm:pb-28 sm:pt-44"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-strata-grid [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_10%,transparent_70%)]"
      />
      <motion.div
        aria-hidden
        animate={{ opacity: [0.35, 0.6, 0.35] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-amber-500/15 blur-3xl"
      />

      <div className="container-shell relative grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
        <div>
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1.5 text-[12.5px] font-semibold text-amber-300"
          >
            <Sparkles size={13} />
            Prehistoric power. Modern engineering.
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 font-display text-[2.5rem] font-bold leading-[1.08] tracking-tight text-bone-500 sm:text-[3.1rem] lg:text-[3.4rem]"
          >
            Built on fossil-deep
            <br />
            <span className="bg-gradient-to-r from-amber-400 to-bronze-400 bg-clip-text text-transparent">
              foundations. Engineered
            </span>
            <br />
            for what's next.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 max-w-xl text-[17px] leading-relaxed text-bone-500/65"
          >
            R-REX Solutions engineers resilient, scalable software with the weight of deep time
            behind it — systems built to survive extinction events, not just quarters.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.36 }}
            className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <motion.a
              href="#services"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="claw-btn group inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-3.5 text-[15px] font-semibold text-obsidian-900 shadow-amberGlow transition-shadow hover:shadow-[0_20px_45px_-10px_rgba(201,122,61,0.55)]"
            >
              <span className="inline-flex items-center gap-2">
                Get Started
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </span>
            </motion.a>
            <motion.a
              href="#services"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="claw-btn inline-flex items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-obsidian-800/50 px-6 py-3.5 text-[15px] font-semibold text-bone-500 transition-colors hover:border-amber-500/50"
            >
              <span>View Services</span>
            </motion.a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.5 }}
            className="mt-14 flex flex-wrap gap-x-10 gap-y-6"
          >
            {[
              { value: '15+', label: 'Years of combined depth' },
              { value: '99.98%', label: 'Uptime, tectonic-grade' },
              { value: '40+', label: 'Systems in production' },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="font-display text-2xl font-bold text-bone-500">{stat.value}</p>
                <p className="mt-1 text-[13px] text-bone-500/50">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="relative mx-auto aspect-square w-full max-w-[460px]"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full bg-amber-radial opacity-70 blur-2xl"
          />
          <RRexCore className="relative h-full w-full" variant="hero" />
        </motion.div>
      </div>
    </section>
  )
}
