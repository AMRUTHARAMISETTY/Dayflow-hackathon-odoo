import { useState } from "react"
import { Search } from "lucide-react"
import Card from "../ui/Card"
import type { PolicyDoc } from "../../types"

export default function PolicyList({ policies }: { policies: PolicyDoc[] }) {
  const [q, setQ] = useState("")
  const filtered = policies.filter(
    (p) => p.title.toLowerCase().includes(q.toLowerCase()) || p.category.toLowerCase().includes(q.toLowerCase()),
  )

  return (
    <Card delay={0.1}>
      <div className="mb-3 flex items-center gap-2 rounded-lg hairline px-3 py-2">
        <Search className="h-4 w-4 text-slate" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search policies…"
          className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-slate/60"
        />
      </div>
      <div className="space-y-2">
        {filtered.map((p) => (
          <div key={p.id} className="rounded-lg px-2 py-2.5 hover:bg-ink/2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-ink">{p.title}</p>
              <span className="font-mono-tabular text-xs text-slate">{p.version}</span>
            </div>
            <p className="mt-0.5 text-xs text-slate">{p.summary}</p>
            <p className="mt-1 text-[11px] text-slate/70">
              {p.category} · effective {p.effectiveDate}
            </p>
          </div>
        ))}
      </div>
    </Card>
  )
}
