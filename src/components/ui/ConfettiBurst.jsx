import { motion } from 'framer-motion'

const COLORS = ['#6366f1', '#06b6d4', '#22c55e', '#f59e0b', '#ec4899']
const PARTICLES = Array.from({ length: 12 }, (_, i) => i)

export default function ConfettiBurst() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible">
      {PARTICLES.map((i) => {
        const angle = (i / PARTICLES.length) * Math.PI * 2
        const distance = 30 + Math.random() * 20
        return (
          <motion.span
            key={i}
            initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            animate={{
              opacity: 0,
              x: Math.cos(angle) * distance,
              y: Math.sin(angle) * distance - 10,
              scale: 0,
            }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="absolute left-4 top-4 h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: COLORS[i % COLORS.length] }}
          />
        )
      })}
    </div>
  )
}
