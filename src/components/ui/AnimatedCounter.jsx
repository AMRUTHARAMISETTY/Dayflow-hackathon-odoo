import { useEffect, useRef } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'

export default function AnimatedCounter({ value, suffix = '', decimals = 0 }) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (v) => v.toFixed(decimals))
  const ref = useRef(null)

  useEffect(() => {
    const controls = animate(count, value, { duration: 1.1, ease: [0.16, 1, 0.3, 1] })
    return controls.stop
  }, [value])

  return (
    <span className="tabular-nums">
      <motion.span ref={ref}>{rounded}</motion.span>
      {suffix}
    </span>
  )
}
