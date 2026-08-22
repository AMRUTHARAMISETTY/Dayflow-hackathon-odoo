import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import Card from '../ui/Card'

const COLORS = ['#6366f1', '#06b6d4', '#a855f7', '#f59e0b', '#ef4444']

export default function SalaryBreakdownChart({ breakdown, netPay }) {
  const data = breakdown.filter((b) => b.amount > 0)

  return (
    <Card delay={0.1} className="p-5">
      <h3 className="mb-4 font-semibold text-ink-900">Salary breakdown</h3>
      <div className="relative h-52">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="amount"
              nameKey="label"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={3}
              animationDuration={900}
              animationBegin={100}
            >
              {data.map((entry, i) => (
                <Cell key={entry.label} fill={COLORS[i % COLORS.length]} stroke="none" />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [`₹${value.toLocaleString('en-IN')}`, name]}
              contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-xs text-ink-900/40">Net pay</p>
          <p className="text-xl font-bold text-ink-900 font-display">
            ₹{netPay.toLocaleString('en-IN')}
          </p>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {data.map((d, i) => (
          <div key={d.label} className="flex items-center gap-1.5 text-xs text-ink-900/55">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            {d.label}
          </div>
        ))}
      </div>
    </Card>
  )
}
