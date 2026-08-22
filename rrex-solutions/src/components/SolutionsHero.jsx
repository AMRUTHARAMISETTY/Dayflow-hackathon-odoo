import { motion } from 'framer-motion'
import { ArrowRight, MessageCircle } from 'lucide-react'
import RRexCore from './RRexCoreLazy'

export default function SolutionsHero() {
  return (
    <section
      id="top"
      className="relative overflow-hidden bg-gradient-to-b from-obsidian-900 via-obsidian-900 to-obsidian-950 pb-20 pt-40 sm:pb-24 sm:pt-44"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-strata-grid [mask-image:radial-gradient(ellipse_55%_50%_at_50%_10%,#000_10%,transparent_70%)]"
      />

      <div className="container-shell relative flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="relative mx-auto aspect-square w-full max-w-[280px] sm:max-w-[340px]"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full bg-amber-radial opacity-70 blur-2xl"
          />
          <RRexCore className="relative h-full w-full" variant="avatar" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="mt-4 font-display text-[2.2rem] font-bold tracking-tight text-bone-500 sm:text-[2.75rem]"
        >
          Software with{' '}
          <span className="bg-gradient-to-r from-amber-400 to-bronze-400 bg-clip-text text-transparent">
            prehistoric power.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.32 }}
          className="mt-5 max-w-lg text-[15.5px] leading-relaxed text-bone-500/60"
        >
          R-REX Core is the fossil-tech artifact at the heart of everything we build — the face
          of a team engineering systems that endure.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.44 }}
          className="mt-8 flex flex-col gap-3 sm:flex-row"
        >
          <motion.a
            href="#solutions"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="claw-btn group inline-flex items-center justify-center gap-2 rounded-full border border-amber-500/50 bg-obsidian-800/70 px-6 py-3 text-[14.5px] font-semibold text-amber-300 backdrop-blur-md transition-colors hover:bg-amber-500/10"
          >
            <span className="inline-flex items-center gap-2">
              Explore Solutions
              <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
            </span>
          </motion.a>
          <motion.a
            href="#contact"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="claw-btn inline-flex items-center justify-center gap-2 rounded-full border border-obsidian-600 bg-obsidian-800/40 px-6 py-3 text-[14.5px] font-semibold text-bone-500 backdrop-blur-md transition-colors hover:border-amber-500/40"
          >
            <span className="inline-flex items-center gap-2">
              <MessageCircle size={15} />
              Talk to Us
            </span>
          </motion.a>
        </motion.div>
      </div>
    </section>
  )
}
