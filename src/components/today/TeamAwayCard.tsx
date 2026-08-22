import Card from "../ui/Card"
import EmptyState from "../ui/EmptyState"
import { teamAwayToday } from "../../lib/mockApi"
import { Users } from "lucide-react"

export default function TeamAwayCard() {
  const away = teamAwayToday()

  return (
    <Card delay={0.3}>
      <h2 className="mb-3 text-sm font-semibold text-slate">Team away today</h2>
      {away.length === 0 ? (
        <EmptyState icon={Users} title="Everyone's in today." />
      ) : (
        <div className="flex flex-wrap gap-3">
          {away.map((m) => (
            <div key={m.name} className="flex items-center gap-2">
              <img src={m.avatarUrl} alt={m.name} className="h-7 w-7 rounded-full" />
              <span className="text-sm text-ink">{m.name}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
