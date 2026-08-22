import { motion } from 'framer-motion'
import { fadeUp } from '../animations/variants'

const FRAGMENTS = [
  { x: -34, y: -24, rotate: -25, size: 12 },
  { x: 32, y: -28, rotate: 40, size: 9 },
  { x: -28, y: 28, rotate: 15, size: 8 },
  { x: 36, y: 24, rotate: -35, size: 10 },
  { x: 0, y: -38, rotate: 60, size: 7 },
]

export default function SolutionCard({ icon: Icon, title, description, points = [] }) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover="hover"
      initial="rest"
      animate="rest"
      className="glass-panel group relative overflow-hidden p-7 transition-colors duration-300 hover:border-amber-500/35"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-radial opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-60"
      />

      <div className="relative flex h-14 w-14 items-center justify-center">
        {FRAGMENTS.map((f, i) => (
          <motion.span
            key={i}
            variants={{
              rest: { x: 0, y: 0, opacity: 0, scale: 0, rotate: 0 },
              hover: {
                x: f.x,
                y: f.y,
                opacity: 0.85,
                scale: 1,
                rotate: f.rotate,
                transition: { duration: 0.45, delay: i * 0.03, ease: [0.16, 1, 0.3, 1] },
              },
            }}
            style={{ width: f.size, height: f.size }}
            className="absolute rounded-[2px] bg-amber-200 shadow-[0_0_14px_3px_rgba(201,122,61,0.9)]"
          />
        ))}
        <motion.div
          variants={{
            rest: { scale: 1, rotate: 0 },
            hover: { scale: 1.08, rotate: -4, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
          }}
          className="flex h-14 w-14 items-center justify-center rounded-xl border border-amber-500/40 bg-obsidian-800 text-amber-400 shadow-amberGlow"
        >
          <Icon size={22} />
        </motion.div>
      </div>

      <h3 className="mt-6 font-display text-[17px] font-bold text-bone-500">{title}</h3>
      <p className="mt-2 text-[14px] leading-relaxed text-bone-500/60">{description}</p>

      {points.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {points.map((point) => (
            <li key={point} className="flex items-center gap-2 text-[13px] text-bone-500/55">
              <span className="h-1 w-1 rounded-full bg-amber-500" />
              {point}
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  )
}
