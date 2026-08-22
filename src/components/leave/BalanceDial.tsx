import Card from "../ui/Card"
import Dial from "../ui/Dial"
import CountUp from "../ui/CountUp"
import type { LeaveBalance } from "../../types"

export default function BalanceDial({ balance, index }: { balance: LeaveBalance; index: number }) {
  const uncapped = balance.entitled === 0
  const available = balance.entitled - balance.taken - balance.pending
  return (
    <Card delay={index * 0.05} className="flex items-center gap-4">
      <Dial
        takenFraction={uncapped ? 0 : balance.entitled ? (balance.taken + balance.pending) / balance.entitled : 0}
        pendingFraction={uncapped ? 0 : balance.entitled ? balance.pending / balance.entitled : 0}
        hasPending={!uncapped && balance.pending > 0}
      >
        <span className="text-xl font-bold text-ink font-mono-tabular">
          <CountUp value={uncapped ? balance.taken : available} />
        </span>
        <span className="text-[9px] text-slate">{uncapped ? "taken" : "left"}</span>
      </Dial>
      <div>
        <p className="font-semibold text-ink">{balance.type}</p>
        <p className="text-xs text-slate">
          {uncapped
            ? `${balance.taken} taken · no entitlement cap`
            : `${balance.taken} taken · ${balance.pending} pending · ${balance.entitled} entitled`}
        </p>
        <p className="mt-0.5 text-xs text-meridian">{balance.accrualNote}</p>
      </div>
    </Card>
  )
}
