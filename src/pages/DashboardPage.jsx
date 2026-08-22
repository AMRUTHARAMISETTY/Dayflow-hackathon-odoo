import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { User, CalendarCheck, Plane, Wallet, ArrowUpRight, Bell, CheckCircle2, Clock3 } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import AnimatedCounter from '../components/ui/AnimatedCounter'
import StatusBadge from '../components/ui/StatusBadge'
import { useStore } from '../lib/store'

const QUICK_LINKS = [
  { to: '/profile', label: 'Profile', desc: 'View & edit your details', icon: User, from: 'from-brand-500', to2: 'to-brand-700' },
  { to: '/attendance', label: 'Attendance', desc: 'Check in / view history', icon: CalendarCheck, from: 'from-emerald-500', to2: 'to-teal-600' },
  { to: '/leave', label: 'Leave Requests', desc: 'Apply & track status', icon: Plane, from: 'from-fuchsia-500', to2: 'to-purple-600' },
  { to: '/payroll', label: 'Payroll', desc: 'Salary & pay slips', icon: Wallet, from: 'from-amber-500', to2: 'to-orange-600' },
]

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function DashboardPage() {
  const { currentUser, attendance, leaveRequests } = useStore()

  const monthKey = new Date().toISOString().slice(0, 7)
  const presentThisMonth = attendance.filter((a) => a.date.startsWith(monthKey) && a.status === 'present').length
  const pendingLeave = leaveRequests.filter((l) => l.status === 'pending').length
  const totalWorked = attendance.filter((a) => a.status === 'present' || a.status === 'half-day').length
  const attendanceRate = attendance.length ? Math.round((totalWorked / attendance.length) * 100) : 0

  const activity = [
    ...attendance.slice(0, 2).map((a) => ({
      icon: CheckCircle2,
      text: `Marked ${a.status} on ${a.date}`,
      color: 'text-emerald-500',
    })),
    ...leaveRequests.slice(0, 2).map((l) => ({
      icon: Clock3,
      text: `${l.type} leave request ${l.status}`,
      color: l.status === 'approved' ? 'text-emerald-500' : l.status === 'rejected' ? 'text-red-500' : 'text-amber-500',
    })),
  ]

  return (
    <div>
      <PageHeader
        eyebrow="Dashboard"
        title={`${greeting()}, ${currentUser?.name?.split(' ')[0]} 👋`}
        subtitle="Here's what's happening with your workday."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: 'Present this month', value: presentThisMonth, suffix: ' days' },
          { label: 'Attendance rate', value: attendanceRate, suffix: '%' },
          { label: 'Pending leaves', value: pendingLeave, suffix: '' },
          { label: 'Leave records', value: leaveRequests.length, suffix: '' },
        ].map((s, i) => (
          <Card key={s.label} delay={i * 0.05} className="p-4">
            <p className="text-2xl font-bold text-ink-900 font-display">
              <AnimatedCounter value={s.value} suffix={s.suffix} />
            </p>
            <p className="mt-1 text-xs text-ink-900/50">{s.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-ink-900/60">Quick access</h2>
          <div className="grid grid-cols-2 gap-3">
            {QUICK_LINKS.map((item, i) => (
              <Card key={item.to} delay={0.1 + i * 0.05} hover className="p-0 overflow-hidden">
                <Link to={item.to} className="block h-full p-4">
                  <div
                    className={`mb-8 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${item.from} ${item.to2} text-white shadow-md`}
                  >
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-ink-900">{item.label}</p>
                      <p className="text-xs text-ink-900/45">{item.desc}</p>
                    </div>
                    <motion.div whileHover={{ x: 3, y: -3 }}>
                      <ArrowUpRight className="h-4 w-4 text-ink-900/30" />
                    </motion.div>
                  </div>
                </Link>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold text-ink-900/60">Recent activity</h2>
          <Card delay={0.2} className="p-4">
            {activity.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-900/40">No activity yet.</p>
            ) : (
              <ul className="space-y-3">
                {activity.map((a, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.06 }}
                    className="flex items-start gap-2.5 text-sm"
                  >
                    <a.icon className={`mt-0.5 h-4 w-4 shrink-0 ${a.color}`} />
                    <span className="text-ink-900/70">{a.text}</span>
                  </motion.li>
                ))}
              </ul>
            )}
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700">
              <Bell className="h-3.5 w-3.5 shrink-0" />
              You're all caught up for today.
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
