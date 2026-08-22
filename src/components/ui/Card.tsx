import { motion, type HTMLMotionProps } from "framer-motion"
import clsx from "clsx"
import { useReducedMotion } from "../../hooks/useReducedMotion"

interface CardProps extends HTMLMotionProps<"div"> {
  delay?: number
  hover?: boolean
}

export default function Card({ children, className, delay = 0, hover = false, ...props }: CardProps) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: reduced ? 0 : delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={hover && !reduced ? { y: -2 } : {}}
      className={clsx("bg-surface hairline rounded-xl p-5", className)}
      {...props}
    >
      {children}
    </motion.div>
  )
}
