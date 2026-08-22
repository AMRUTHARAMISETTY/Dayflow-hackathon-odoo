import { motion } from 'framer-motion'
import Reveal from './Reveal'
import CountUp from './CountUp'
import { staggerContainer, fadeUp, viewportOnce } from '../animations/variants'

const BARS = [42, 58, 49, 67, 74, 88, 96]
const DONUT_SEGMENTS = [
  { label: 'Engineering', value: 38, color: '#3b6ef6' },
  { label: 'Sales', value: 24, color: '#7c6cf6' },
  { label: 'Design', value: 16, color: '#6c8cff' },
  { label: 'Other', value: 22, color: '#c7d2fe' },
]

function Donut() {
  const circumference = 2 * Math.PI * 42
  let offset = 0
  return (
    <svg viewBox="0 0 100 100" className="h-32 w-32 -rotate-90">
      <circle cx="50" cy="50" r="42" fill="none" stroke="#f1f5f9" strokeWidth="12" />
      {DONUT_SEGMENTS.map((seg) => {
        const length = (seg.value / 100) * circumference
        const dashoffset = offset
        offset += length
        return (
          <motion.circle
            key={seg.label}
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke={seg.color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            whileInView={{ strokeDashoffset: circumference - length }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.2 }}
            style={{ transform: `rotate(${(dashoffset / circumference) * 360}deg)`, transformOrigin: '50% 50%' }}
          />
        )
      })}
    </svg>
  )
}

export default function Analytics() {
  return (
    <section id="analytics" className="bg-slate-50 py-24 sm:py-28">
      <div className="container-shell">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-[13px] font-bold tracking-wide text-accent-600">ANALYTICS</span>
          <h2 className="mt-3 text-[2.1rem] font-extrabold tracking-tight text-navy-900 sm:text-4xl">
            Turn HR data into better decisions.
          </h2>
        </Reveal>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          variants={staggerContainer(0.12)}
          className="mt-14 grid grid-cols-1 gap-5 lg:grid-cols-3"
        >
          <motion.div variants={fadeUp} className="rounded-2xl border border-slate-200 bg-white p-6">
            <p className="text-[13px] font-semibold text-slate-500">Employee Growth</p>
            <p className="mt-1 text-2xl font-bold text-navy-900">
              +<CountUp value={186} /> this year
            </p>
            <div className="mt-6 flex h-32 items-end gap-2.5">
              {BARS.map((value, i) => (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  whileInView={{ height: `${value}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  className="flex-1 rounded-t-md bg-gradient-to-t from-accent-500 to-violet-400"
                />
              ))}
            </div>
          </motion.div>

          <motion.div variants={fadeUp} className="rounded-2xl border border-slate-200 bg-white p-6">
            <p className="text-[13px] font-semibold text-slate-500">Attendance Trend</p>
            <p className="mt-1 text-2xl font-bold text-navy-900">
              <CountUp value={94.2} decimals={1} suffix="%" /> avg
            </p>
            <svg viewBox="0 0 220 100" className="mt-6 h-32 w-full">
              <motion.polyline
                points="0,70 35,55 70,60 105,35 140,42 175,18 220,25"
                fill="none"
                stroke="#3b6ef6"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.4, ease: 'easeInOut' }}
              />
            </svg>
          </motion.div>

          <motion.div variants={fadeUp} className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-6">
            <p className="self-start text-[13px] font-semibold text-slate-500">Department Distribution</p>
            <div className="mt-4">
              <Donut />
            </div>
            <div className="mt-4 grid w-full grid-cols-2 gap-2">
              {DONUT_SEGMENTS.map((seg) => (
                <div key={seg.label} className="flex items-center gap-1.5 text-[12px] text-slate-500">
                  <span className="h-2 w-2 rounded-full" style={{ background: seg.color }} />
                  {seg.label}
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
