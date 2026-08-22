import { useEffect, useState } from "react"
import PageHeader from "../components/ui/PageHeader"
import Card from "../components/ui/Card"
import { CardSkeleton } from "../components/ui/Skeleton"
import ErrorState from "../components/ui/ErrorState"
import OfflineBanner from "../components/ui/OfflineBanner"
import SlipList from "../components/pay/SlipList"
import SlipDetail from "../components/pay/SlipDetail"
import { usePaySlipsQuery } from "../lib/queries"

export default function PayPage() {
  const { data, isLoading, isError, refetch } = usePaySlipsQuery()
  const [selectedId, setSelectedId] = useState<string>("")

  useEffect(() => {
    if (data && data.length > 0 && !selectedId) {
      setSelectedId(data[data.length - 1].id)
    }
  }, [data, selectedId])

  return (
    <div>
      <PageHeader eyebrow="Pay" title="Salary & pay slips" subtitle="Read-only, and only after publication." />
      <OfflineBanner />

      {isLoading && (
        <div className="grid gap-4 md:grid-cols-[220px_1fr]">
          <CardSkeleton lines={4} />
          <CardSkeleton lines={6} />
        </div>
      )}
      {isError && <ErrorState message="Couldn't load your pay slips." onRetry={() => refetch()} />}

      {data && data.length > 0 && (
        <div className="grid gap-4 md:grid-cols-[220px_1fr]">
          <Card delay={0}>
            <SlipList slips={data} selectedId={selectedId} onSelect={setSelectedId} />
          </Card>
          {(() => {
            const idx = data.findIndex((s) => s.id === selectedId)
            const slip = data[idx]
            const previous = idx > 0 ? data[idx - 1] : undefined
            return slip ? <SlipDetail slip={slip} previous={previous} /> : null
          })()}
        </div>
      )}
    </div>
  )
}
