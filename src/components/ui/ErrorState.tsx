import { AlertCircle, RotateCw } from "lucide-react"
import Button from "./Button"

export default function ErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl bg-rose-dim py-10 text-center">
      <AlertCircle className="mb-2 h-5 w-5 text-rose" />
      <p className="text-sm font-medium text-rose">{message}</p>
      {onRetry && (
        <Button variant="ghost" className="mt-3" onClick={onRetry}>
          <RotateCw className="h-3.5 w-3.5" /> Retry
        </Button>
      )}
    </div>
  )
}
