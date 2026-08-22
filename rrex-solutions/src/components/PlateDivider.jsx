import { motion } from 'framer-motion'
import { viewportOnce } from '../animations/variants'

const JAG_LEFT = 'polygon(0% 0%, 55% 0%, 45% 45%, 60% 55%, 40% 100%, 0% 100%)'
const JAG_RIGHT = 'polygon(45% 0%, 100% 0%, 100% 100%, 60% 100%, 40% 55%, 55% 45%)'

/**
 * Two "tectonic plates" that slide apart on entry and settle back together,
 * with a glowing amber fault line at the seam. Purely decorative section break.
 */
export default function PlateDivider({ className = '' }) {
  return (
    <div className={`relative h-16 w-full overflow-hidden sm:h-20 ${className}`}>
      <motion.div
        initial={{ x: -18, opacity: 0 }}
        whileInView={{ x: 0, opacity: 1 }}
        viewport={viewportOnce}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        style={{ clipPath: JAG_LEFT }}
        className="absolute inset-0 bg-gradient-to-r from-obsidian-800 to-obsidian-900"
      />
      <motion.div
        initial={{ x: 18, opacity: 0 }}
        whileInView={{ x: 0, opacity: 1 }}
        viewport={viewportOnce}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        style={{ clipPath: JAG_RIGHT }}
        className="absolute inset-0 bg-gradient-to-l from-obsidian-800 to-obsidian-900"
      />
      <motion.div
        initial={{ scaleY: 0, opacity: 0 }}
        whileInView={{ scaleY: 1, opacity: 1 }}
        viewport={viewportOnce}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="absolute left-1/2 top-1/2 h-[140%] w-px -translate-x-1/2 -translate-y-1/2 bg-gradient-to-b from-transparent via-amber-500 to-transparent shadow-[0_0_20px_4px_rgba(201,122,61,0.55)]"
      />
    </div>
  )
}
