import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import AnimatedCounter from '../components/ui/AnimatedCounter'
import SalaryBreakdownChart from '../components/payroll/SalaryBreakdownChart'
import SalarySlipCard from '../components/payroll/SalarySlipCard'
import { useStore } from '../lib/store'

export default function PayrollPage() {
  const { payroll } = useStore()

  return (
    <div>
      <PageHeader eyebrow="Payroll" title="Salary & pay slips" subtitle="Read-only — reach out to HR for corrections." />

      <div className="mb-4 grid grid-cols-3 gap-3">
        {[
          { label: 'Base salary', value: payroll.baseSalary },
          { label: 'Allowances', value: payroll.allowances },
          { label: 'Deductions', value: payroll.deductions },
        ].map((s, i) => (
          <Card key={s.label} delay={i * 0.05} className="p-4">
            <p className="text-lg font-bold text-ink-900 font-display md:text-xl">
              ₹<AnimatedCounter value={s.value} />
            </p>
            <p className="mt-1 text-xs text-ink-900/50">{s.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <SalaryBreakdownChart breakdown={payroll.breakdown} netPay={payroll.netPay} />
        </div>
        <div className="lg:col-span-2">
          <Card delay={0.15} className="p-5">
            <h3 className="mb-4 font-semibold text-ink-900">Pay slips</h3>
            <div className="space-y-2">
              {payroll.slips.map((slip, i) => (
                <SalarySlipCard key={slip.id} slip={slip} index={i} />
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
