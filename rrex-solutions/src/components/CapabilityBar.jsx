import { motion } from 'framer-motion'
import { viewportOnce } from '../animations/variants'

const SEGMENTS = 14

export default function CapabilityBar({ icon: Icon, label, value, delay = 0 }) {
  const activeCount = Math.round((value / 100) * SEGMENTS)

  return (
    <div>
      <div className="flex items-center justify-between text-[13.5px]">
        <span className="flex items-center gap-2 font-semibold text-bone-500">
          <Icon size={15} className="text-amber-400" />
          {label}
        </span>
        <span className="font-display font-bold text-amber-400">{value}%</span>
      </div>

      <div className="mt-3 flex h-6 w-full gap-[3px]">
        {Array.from({ length: SEGMENTS }).map((_, i) => {
          const isActive = i < activeCount
          return (
            <motion.div
              key={i}
              initial={{ scaleY: 0, opacity: 0 }}
              whileInView={{ scaleY: 1, opacity: 1 }}
              viewport={viewportOnce}
              transition={{ duration: 0.35, delay: delay + i * 0.035, ease: [0.16, 1, 0.3, 1] }}
              className="origin-bottom flex-1 rounded-[2px]"
              style={{
                background: isActive
                  ? `linear-gradient(to top, #6e4a2f, #C97A3D ${40 + (i / SEGMENTS) * 40}%, #e6b48a)`
                  : 'rgba(232,220,200,0.06)',
                boxShadow: isActive ? '0 0 8px rgba(201,122,61,0.45)' : 'none',
              }}
            />
          )
        })}
      </div>
    </div>
  )
}
