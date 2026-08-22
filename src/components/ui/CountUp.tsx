import { useEffect } from "react"
import { motion, useMotionValue, useTransform, animate } from "framer-motion"
import { useReducedMotion } from "../../hooks/useReducedMotion"

export default function CountUp({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
}: {
  value: number
  prefix?: string
  suffix?: string
  decimals?: number
}) {
  const reduced = useReducedMotion()
  const count = useMotionValue(reduced ? value : 0)
  const rounded = useTransform(count, (v) =>
    Math.round(v).toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }),
  )

  useEffect(() => {
    if (reduced) {
      count.set(value)
      return
    }
    const controls = animate(count, value, { duration: 0.6, ease: [0.22, 1, 0.36, 1] })
    return controls.stop
  }, [value, reduced, count])

  return (
    <span className="font-mono-tabular">
      {prefix}
      <motion.span>{rounded}</motion.span>
      {suffix}
    </span>
  )
}
