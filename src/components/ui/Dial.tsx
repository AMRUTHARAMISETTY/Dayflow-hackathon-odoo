import { motion } from "framer-motion"
import { useReducedMotion } from "../../hooks/useReducedMotion"

export default function Dial({
  size = 76,
  strokeWidth = 7,
  takenFraction,
  pendingFraction,
  hasPending,
  children,
}: {
  size?: number
  strokeWidth?: number
  takenFraction: number
  pendingFraction: number
  hasPending?: boolean
  children?: React.ReactNode
}) {
  const reduced = useReducedMotion()
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const takenLen = circumference * Math.min(1, Math.max(0, takenFraction))
  const pendingLen = circumference * Math.min(1, Math.max(0, pendingFraction))

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-ink)"
          strokeOpacity={0.07}
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-meridian)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={reduced ? false : { strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - takenLen }}
          transition={reduced ? { duration: 0 } : { duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />
        {hasPending && (
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--color-dawn)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - pendingLen}
            style={{ transform: `rotate(${(takenFraction * 360).toFixed(2)}deg)`, transformOrigin: "center" }}
            animate={reduced ? {} : { opacity: [1, 0.5, 1] }}
            transition={reduced ? {} : { repeat: Infinity, duration: 3 }}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  )
}
