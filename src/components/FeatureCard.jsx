import { motion } from 'framer-motion'
import { fadeUp } from '../animations/variants'

export default function FeatureCard({ index, icon: Icon, title, description, points }) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -6 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-7 transition-shadow duration-300 hover:border-slate-300 hover:shadow-premium"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-accent-100 to-violet-100 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-70"
      />
      <div className="relative">
        <div className="flex items-center justify-between">
          <motion.div
            whileHover={{ scale: 1.08 }}
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-accent-500 to-violet-500 text-white shadow-glow"
          >
            <Icon size={20} />
          </motion.div>
          <span className="text-[13px] font-semibold text-slate-300">
            {String(index + 1).padStart(2, '0')}
          </span>
        </div>

        <h3 className="mt-5 text-[17px] font-bold text-navy-900">{title}</h3>
        <p className="mt-2 text-[14px] leading-relaxed text-slate-500">{description}</p>

        <ul className="mt-4 space-y-1.5">
          {points.map((point) => (
            <li key={point} className="flex items-center gap-2 text-[13px] text-slate-500">
              <span className="h-1 w-1 rounded-full bg-accent-400" />
              {point}
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  )
}
