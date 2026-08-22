import { motion } from "framer-motion"

const COLORS = ["var(--color-meridian)", "var(--color-dawn)", "#7c9cff", "#e08076", "#29d1ac"]
const PARTICLES = Array.from({ length: 14 }, (_, i) => i)

export default function ConfettiBurst() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {PARTICLES.map((i) => {
        const angle = (i / PARTICLES.length) * Math.PI * 2
        const distance = 40 + Math.random() * 40
        return (
          <motion.span
            key={i}
            initial={{ opacity: 0.9, x: "50%", y: "40%", scale: 1 }}
            animate={{
              opacity: 0,
              x: `calc(50% + ${Math.cos(angle) * distance}px)`,
              y: `calc(40% + ${Math.sin(angle) * distance - 20}px)`,
              scale: 0,
            }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            className="absolute h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: COLORS[i % COLORS.length] }}
          />
        )
      })}
    </div>
  )
}
