import Card from "../ui/Card"
import CountUp from "../ui/CountUp"
import ExplainLine from "./ExplainLine"
import type { PaySlip } from "../../types"

const GROUP_LABEL: Record<PaySlip["lineItems"][number]["group"], string> = {
  earnings: "Earnings",
  allowances: "Allowances",
  deductions: "Deductions",
  tax: "Tax",
}
const GROUP_ORDER: PaySlip["lineItems"][number]["group"][] = ["earnings", "allowances", "deductions", "tax"]

export default function SlipDetail({ slip, previous }: { slip: PaySlip; previous?: PaySlip }) {
  const groups = GROUP_ORDER.map((g) => ({ group: g, items: slip.lineItems.filter((i) => i.group === g) })).filter(
    (g) => g.items.length > 0,
  )

  const delta = previous ? slip.netPay - previous.netPay : null
  const explainLines = slip.lineItems.filter((i) => i.linkedDates?.length)

  return (
    <Card delay={0.1}>
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <p className="text-sm text-slate">
            {slip.month} {slip.year}
          </p>
          <p className="text-2xl font-bold text-ink font-display">
            ₹<CountUp value={slip.netPay} />
          </p>
        </div>
        <span className="rounded-full bg-meridian-dim px-2.5 py-1 text-xs font-semibold text-meridian">
          {slip.status}
        </span>
      </div>

      {delta !== null && (
        <div
          className={`mb-4 rounded-lg px-3 py-2.5 text-sm ${
            delta < 0 ? "bg-dawn-dim text-dawn" : "bg-meridian-dim text-meridian"
          }`}
        >
          {delta === 0
            ? "Same as last month."
            : `₹${Math.abs(delta).toLocaleString("en-IN")} ${delta < 0 ? "lower" : "higher"} than ${previous!.month}${
                explainLines.length
                  ? ` — ${explainLines.map((l) => `${l.label.toLowerCase()} (${l.linkedDates!.join(", ")})`).join("; ")}`
                  : ""
              }`}
        </div>
      )}

      {groups.map((g) => (
        <div key={g.group} className="mb-3 last:mb-0">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate/70">
            {GROUP_LABEL[g.group]}
          </p>
          <div>
            {g.items.map((item) => (
              <ExplainLine key={item.label} item={item} />
            ))}
          </div>
        </div>
      ))}
    </Card>
  )
}
