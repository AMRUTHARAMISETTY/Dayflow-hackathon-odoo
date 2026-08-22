import { motion } from 'framer-motion'
import {
  BarChart3,
  Bell,
  CalendarClock,
  CheckCircle2,
  DollarSign,
  LayoutDashboard,
  Search,
  Settings,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react'
import Reveal from './Reveal'
import CountUp from './CountUp'
import { fadeUp, staggerContainer, viewportOnce } from '../animations/variants'

const SIDEBAR_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', active: true },
  { icon: Users, label: 'Employees' },
  { icon: CalendarClock, label: 'Attendance' },
  { icon: DollarSign, label: 'Payroll' },
  { icon: BarChart3, label: 'Analytics' },
  { icon: Settings, label: 'Settings' },
]

const STATS = [
  { label: 'Total Employees', value: 1248, trend: '+4.2%', icon: Users },
  { label: 'Present Today', value: 94.7, decimals: 1, suffix: '%', trend: '+1.1%', icon: CheckCircle2 },
  { label: 'Open Positions', value: 12, trend: '+3', icon: TrendingUp },
  { label: 'Payroll Processed', value: 482, prefix: '$', suffix: 'K', trend: 'On time', icon: DollarSign },
]

const BARS = [55, 68, 48, 74, 62, 88, 96]

const TEAM = [
  { name: 'Maya Patel', role: 'Product Designer', status: 'Active', color: 'from-accent-500 to-violet-500' },
  { name: 'Jordan Lee', role: 'Backend Engineer', status: 'Active', color: 'from-violet-500 to-accent-400' },
  { name: 'Riya Shah', role: 'Recruiter', status: 'On Leave', color: 'from-accent-400 to-accent-600' },
]

export default function ProductPreview() {
  return (
    <section id="product" className="relative overflow-hidden bg-slate-50 py-24 sm:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-gradient-to-b from-accent-50/70 to-transparent"
      />

      <div className="container-shell relative">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-[13px] font-bold tracking-wide text-accent-600">PRODUCT PREVIEW</span>
          <h2 className="mt-3 text-[2.1rem] font-extrabold tracking-tight text-navy-900 sm:text-4xl">
            One dashboard for your entire workforce.
          </h2>
          <p className="mt-4 text-[15.5px] leading-relaxed text-slate-500">
            A real-time command center for HR — attendance, payroll, hiring, and performance,
            visualized the moment it happens.
          </p>
        </Reveal>

        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={viewportOnce}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative mx-auto mt-16 max-w-5xl"
        >
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
            className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-premium"
          >
            <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/80 px-5 py-3.5">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
              </div>
              <div className="ml-2 hidden flex-1 items-center gap-2 rounded-md bg-white px-3 py-1.5 text-[12px] text-slate-400 ring-1 ring-slate-200 sm:flex">
                <Search size={12} />
                app.dayflow.io/dashboard
              </div>
              <Bell size={15} className="ml-auto text-slate-300 sm:ml-0" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[188px_1fr]">
              <div className="hidden flex-col gap-1 border-r border-slate-100 bg-slate-50/60 p-4 md:flex">
                {SIDEBAR_ITEMS.map((item) => (
                  <div
                    key={item.label}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors ${
                      item.active
                        ? 'bg-gradient-to-r from-accent-500 to-violet-500 text-white shadow-glow'
                        : 'text-slate-500 hover:bg-white'
                    }`}
                  >
                    <item.icon size={15} />
                    {item.label}
                  </div>
                ))}
              </div>

              <div className="p-5 sm:p-7">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-[16px] font-bold text-navy-900">Dashboard Overview</h3>
                    <p className="text-[12.5px] text-slate-400">Friday, 22 August 2026</p>
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-accent-500 to-violet-500 text-[12px] font-bold text-white">
                    AK
                  </div>
                </div>

                <motion.div
                  initial="hidden"
                  whileInView="show"
                  viewport={viewportOnce}
                  variants={staggerContainer(0.08)}
                  className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4"
                >
                  {STATS.map((stat) => (
                    <motion.div
                      key={stat.label}
                      variants={fadeUp}
                      className="rounded-xl border border-slate-100 bg-slate-50/70 p-4"
                    >
                      <stat.icon size={15} className="text-accent-600" />
                      <p className="mt-2 text-[19px] font-bold text-navy-900">
                        <CountUp
                          value={stat.value}
                          prefix={stat.prefix || ''}
                          suffix={stat.suffix || ''}
                          decimals={stat.decimals || 0}
                        />
                      </p>
                      <p className="mt-0.5 text-[11.5px] text-slate-500">{stat.label}</p>
                      <p className="mt-1.5 text-[11px] font-semibold text-emerald-600">{stat.trend}</p>
                    </motion.div>
                  ))}
                </motion.div>

                <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
                  <div className="rounded-xl border border-slate-100 p-4">
                    <p className="text-[12.5px] font-semibold text-slate-500">Weekly Attendance</p>
                    <div className="mt-4 flex h-28 items-end gap-2">
                      {BARS.map((value, i) => (
                        <motion.div
                          key={i}
                          initial={{ height: 0 }}
                          whileInView={{ height: `${value}%` }}
                          viewport={viewportOnce}
                          transition={{ duration: 0.6, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                          className="flex-1 rounded-t-md bg-gradient-to-t from-accent-500 to-violet-400"
                        />
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-100 p-4">
                    <p className="text-[12.5px] font-semibold text-slate-500">Team</p>
                    <div className="mt-3 space-y-2.5">
                      {TEAM.map((member, i) => (
                        <motion.div
                          key={member.name}
                          initial={{ opacity: 0, x: -8 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={viewportOnce}
                          transition={{ duration: 0.4, delay: i * 0.1 }}
                          className="flex items-center gap-2.5"
                        >
                          <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${member.color} text-[10px] font-bold text-white`}
                          >
                            {member.name.split(' ').map((n) => n[0]).join('')}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[12.5px] font-medium text-navy-900">{member.name}</p>
                            <p className="truncate text-[11px] text-slate-400">{member.role}</p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              member.status === 'Active'
                                ? 'bg-emerald-50 text-emerald-600'
                                : 'bg-amber-50 text-amber-600'
                            }`}
                          >
                            {member.status}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: -10, x: 10 }}
            whileInView={{ opacity: 1, y: [0, -8, 0], x: 0 }}
            viewport={viewportOnce}
            transition={{
              opacity: { duration: 0.5, delay: 0.5 },
              x: { duration: 0.5, delay: 0.5 },
              y: { duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 },
            }}
            className="absolute -right-4 -top-6 hidden items-center gap-2 rounded-xl border border-slate-200/70 bg-white px-4 py-3 shadow-premium sm:flex"
          >
            <Sparkles size={15} className="text-accent-500" />
            <span className="text-[12.5px] font-semibold text-navy-900">Synced in real time</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10, x: -10 }}
            whileInView={{ opacity: 1, y: [0, 8, 0], x: 0 }}
            viewport={viewportOnce}
            transition={{
              opacity: { duration: 0.5, delay: 0.7 },
              x: { duration: 0.5, delay: 0.7 },
              y: { duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 0.7 },
            }}
            className="absolute -bottom-6 -left-4 hidden items-center gap-2 rounded-xl border border-slate-200/70 bg-white px-4 py-3 shadow-premium sm:flex"
          >
            <CheckCircle2 size={15} className="text-emerald-500" />
            <span className="text-[12.5px] font-semibold text-navy-900">Payroll processed</span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
