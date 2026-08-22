import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts'
import Card from '../ui/Card'
import { ATTENDANCE_STATUS_META } from '../../lib/mockData'

function toWeekly(records) {
  const weeks = {}
  records.forEach((r) => {
    const d = new Date(r.date)
    const weekStart = new Date(d)
    weekStart.setDate(d.getDate() - d.getDay())
    const key = weekStart.toISOString().slice(0, 10)
    weeks[key] = weeks[key] || { week: key, present: 0, absent: 0, 'half-day': 0, leave: 0 }
    weeks[key][r.status] += 1
  })
  return Object.values(weeks)
    .sort((a, b) => (a.week > b.week ? 1 : -1))
    .slice(-6)
    .map((w) => ({ ...w, label: new Date(w.week).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) }))
}

export default function AttendanceChart({ records }) {
  const [view, setView] = useState('daily')

  const dailyData = useMemo(
    () =>
      [...records]
        .sort((a, b) => (a.date > b.date ? 1 : -1))
        .slice(-14)
        .map((r) => ({
          ...r,
          label: new Date(r.date).toLocaleDateString(undefined, { weekday: 'short' }),
          value: 1,
        })),
    [records],
  )

  const weeklyData = useMemo(() => toWeekly(records), [records])

  return (
    <Card delay={0.1} className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-ink-900">Attendance overview</h3>
        <div className="flex rounded-lg bg-ink-900/5 p-1">
          {['daily', 'weekly'].map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="relative rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors"
            >
              {view === v && (
                <motion.span
                  layoutId="chart-toggle"
                  className="absolute inset-0 rounded-md bg-white shadow-sm"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
              <span className={`relative z-10 ${view === v ? 'text-ink-900' : 'text-ink-900/40'}`}>{v}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          {view === 'daily' ? (
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#00000010" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#14152b80' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                cursor={{ fill: '#6366f108' }}
                content={({ active, payload }) =>
                  active && payload?.length ? (
                    <div className="rounded-lg bg-ink-950 px-3 py-2 text-xs text-white shadow-lg">
                      <p className="font-semibold capitalize">{payload[0].payload.status}</p>
                      <p className="text-white/50">{payload[0].payload.date}</p>
                    </div>
                  ) : null
                }
              />
              <Bar dataKey="value" radius={[6, 6, 6, 6]} isAnimationActive animationDuration={800}>
                {dailyData.map((entry, i) => (
                  <Cell key={i} fill={ATTENDANCE_STATUS_META[entry.status]?.color || '#94a3b8'} />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#00000010" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#14152b80' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip cursor={{ fill: '#6366f108' }} />
              <Bar dataKey="present" stackId="a" fill={ATTENDANCE_STATUS_META.present.color} radius={[0, 0, 0, 0]} animationDuration={800} />
              <Bar dataKey="half-day" stackId="a" fill={ATTENDANCE_STATUS_META['half-day'].color} animationDuration={800} />
              <Bar dataKey="leave" stackId="a" fill={ATTENDANCE_STATUS_META.leave.color} animationDuration={800} />
              <Bar dataKey="absent" stackId="a" fill={ATTENDANCE_STATUS_META.absent.color} radius={[6, 6, 0, 0]} animationDuration={800} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex flex-wrap gap-3">
        {Object.entries(ATTENDANCE_STATUS_META).map(([key, meta]) => (
          <div key={key} className="flex items-center gap-1.5 text-xs text-ink-900/50">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.color }} />
            {meta.label}
          </div>
        ))}
      </div>
    </Card>
  )
}
