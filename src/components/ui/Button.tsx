import { motion, type HTMLMotionProps } from "framer-motion"
import clsx from "clsx"

const variants = {
  primary: "bg-meridian text-white shadow-sm hover:brightness-110",
  ghost: "bg-surface text-ink hairline hover:bg-ink/3",
  danger: "bg-rose text-white shadow-sm hover:brightness-110",
  subtle: "bg-meridian-dim text-meridian hover:brightness-95",
}

interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: keyof typeof variants
}

export default function Button({ children, variant = "primary", className, disabled, ...props }: ButtonProps) {
  return (
    <motion.button
      whileHover={disabled ? {} : { scale: 1.02 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      transition={{ type: "spring", stiffness: 420, damping: 30 }}
      disabled={disabled}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </motion.button>
  )
}
