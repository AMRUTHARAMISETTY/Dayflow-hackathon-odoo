import { motion } from 'framer-motion'
import { fadeUp } from '../animations/variants'

export default function GlassCard({ className = '', children, hover = true, variants = fadeUp }) {
  return (
    <motion.div
      variants={variants}
      whileHover={hover ? { y: -6, boxShadow: '0 24px 60px -16px rgba(201,122,61,0.35)' } : undefined}
      transition={{ type: 'spring', stiffness: 280, damping: 22 }}
      className={`glass-panel relative overflow-hidden p-7 transition-colors duration-300 hover:border-amber-500/35 ${className}`}
    >
      {children}
    </motion.div>
  )
}
