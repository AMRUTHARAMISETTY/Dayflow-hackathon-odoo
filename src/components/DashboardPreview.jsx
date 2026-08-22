import { motion } from 'framer-motion'
import { CalendarCheck, CheckCircle2, TrendingUp, UserPlus } from 'lucide-react'
import CountUp from './CountUp'

const STATS = [
  { label: 'Total Employees', value: 1248, icon: TrendingUp },
  { label: 'Present Today', value: 1182, icon: CalendarCheck },
]

const ACTIVITY = [
  { text: 'Sarah joined Marketing', time: '2m ago' },
  { text: 'Leave request approved', time: '18m ago' },
  { text: 'Payroll processed for August', time: '1h ago' },
]

export default function DashboardPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative"
    >
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="relative rounded-2xl border border-slate-200/70 bg-white/90 p-6 shadow-premium backdrop-blur-sm"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] text-slate-500">Good morning</p>
            <h3 className="text-lg font-bold text-navy-900">Welcome back, Alex</h3>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-accent-500 to-violet-500 text-sm font-bold text-white">
            AK
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.9 + i * 0.1 }}
              className="rounded-xl bg-slate-50 p-4"
            >
              <stat.icon size={16} className="text-accent-600" />
              <p className="mt-2 text-2xl font-bold text-navy-900">
                <CountUp value={stat.value} />
              </p>
              <p className="text-[12.5px] text-slate-500">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1.1 }}
          className="mt-4 rounded-xl bg-gradient-to-r from-accent-50 to-violet-50 p-4"
        >
          <div className="flex items-center justify-between text-[12.5px]">
            <span className="font-medium text-slate-600">Attendance today</span>
            <span className="font-bold text-accent-600">
              <CountUp value={96} suffix="%" />
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/70">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: '96%' }}
              viewport={{ once: true }}
              transition={{ duration: 1.1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="h-full rounded-full bg-gradient-to-r from-accent-500 to-violet-500"
            />
          </div>
        </motion.div>

        <div className="mt-4 space-y-2">
          {ACTIVITY.map((item, i) => (
            <motion.div
              key={item.text}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 1.3 + i * 0.12 }}
              className="flex items-center justify-between rounded-lg px-3 py-2 text-[12.5px] hover:bg-slate-50"
            >
              <span className="text-slate-600">{item.text}</span>
              <span className="text-slate-400">{item.time}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 20, y: -10 }}
        animate={{ opacity: 1, x: 0, y: [0, -8, 0] }}
        transition={{
          opacity: { duration: 0.5, delay: 1.6 },
          x: { duration: 0.5, delay: 1.6 },
          y: { duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1.6 },
        }}
        className="absolute -right-6 top-10 hidden items-center gap-2 rounded-xl border border-slate-200/70 bg-white px-4 py-3 shadow-premium sm:flex"
      >
        <CheckCircle2 size={16} className="text-emerald-500" />
        <span className="text-[12.5px] font-semibold text-navy-900">Leave Approved</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: -20, y: 10 }}
        animate={{ opacity: 1, x: 0, y: [0, 8, 0] }}
        transition={{
          opacity: { duration: 0.5, delay: 1.8 },
          x: { duration: 0.5, delay: 1.8 },
          y: { duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 1.8 },
        }}
        className="absolute -left-6 bottom-16 hidden items-center gap-2 rounded-xl border border-slate-200/70 bg-white px-4 py-3 shadow-premium sm:flex"
      >
        <UserPlus size={16} className="text-accent-500" />
        <span className="text-[12.5px] font-semibold text-navy-900">New Employee Added</span>
      </motion.div>
    </motion.div>
  )
}
