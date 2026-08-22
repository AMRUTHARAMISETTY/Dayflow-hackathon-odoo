import { motion } from 'framer-motion'
import { fadeUp, viewportOnce } from '../animations/variants'

export default function Reveal({ as = 'div', variants = fadeUp, className = '', delay = 0, children }) {
  const Component = motion[as]
  return (
    <Component
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={viewportOnce}
      variants={variants}
      transition={{ delay }}
    >
      {children}
    </Component>
  )
}
