import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Megaphone, Check } from "lucide-react"
import Card from "../ui/Card"
import Button from "../ui/Button"
import { CardSkeleton } from "../ui/Skeleton"
import { useAnnouncementsQuery } from "../../lib/queries"
import { apiAcknowledgeAnnouncement } from "../../lib/mockApi"

export default function AnnouncementsCard() {
  const { data, isLoading } = useAnnouncementsQuery()
  const queryClient = useQueryClient()
  const ackMutation = useMutation({
    mutationFn: apiAcknowledgeAnnouncement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] })
      queryClient.invalidateQueries({ queryKey: ["attention"] })
    },
  })

  if (isLoading) return <CardSkeleton lines={2} />
  const latest = (data ?? []).find((a) => a.pinned) ?? data?.[0]
  if (!latest) return null

  return (
    <Card delay={0.35}>
      <div className="mb-2 flex items-center gap-2">
        <Megaphone className="h-4 w-4 text-slate" />
        <h2 className="text-sm font-semibold text-slate">Announcement</h2>
      </div>
      <p className="text-sm font-medium text-ink">{latest.title}</p>
      <p className="mt-1 text-xs text-slate">{latest.body}</p>
      {latest.requiresAck && !latest.acknowledged && (
        <Button
          variant="subtle"
          className="mt-3"
          onClick={() => ackMutation.mutate(latest.id)}
          disabled={ackMutation.isPending}
        >
          <Check className="h-3.5 w-3.5" /> Acknowledge
        </Button>
      )}
      {latest.acknowledged && (
        <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-meridian">
          <Check className="h-3.5 w-3.5" /> Acknowledged
        </p>
      )}
    </Card>
  )
}
