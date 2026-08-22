import { Component, Suspense, lazy, useEffect, useState, type ErrorInfo, type ReactNode } from "react"
import Skeleton from "../ui/Skeleton"
import DinoSprite from "./DinoSprite"

export type MascotStatus = "not-checked-in" | "checking-in" | "working" | "working-late" | "overtime" | "day-complete"
export type MascotEvent = "none" | "check-in" | "revert"
interface Props {
  status: MascotStatus
  event: MascotEvent
  hours: string
  waveTrigger: number
  danceTrigger: number
  onEventComplete: () => void
}
const DinoCanvas = lazy(() => import("./DinoCanvas"))

function canUseWebGL() {
  try {
    const canvas = document.createElement("canvas")
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"))
  } catch {
    return false
  }
}

class MascotBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.info("Dinosaur model fallback", error, info.componentStack)
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

export default function TodayMascot(props: Props) {
  const [modelAvailable, setModelAvailable] = useState<boolean | null>(null)
  useEffect(() => {
    if (!canUseWebGL()) {
      setModelAvailable(false)
      return
    }
    let active = true
    fetch("/models/dino.glb", { method: "HEAD" })
      .then((response) => {
        const type = response.headers.get("content-type") ?? ""
        if (active) setModelAvailable(response.ok && !type.includes("text/html"))
      })
      .catch(() => {
        if (active) setModelAvailable(false)
      })
    return () => {
      active = false
    }
  }, [])

  const sprite = (
    <DinoSprite
      status={props.status}
      event={props.event}
      waveTrigger={props.waveTrigger}
      danceTrigger={props.danceTrigger}
      onEventComplete={props.onEventComplete}
    />
  )

  return (
    <div className="dino-sprite-box" aria-label={`Dayflow dinosaur — ${props.hours} worked today`}>
      {modelAvailable === null ? (
        <Skeleton className="today-mascot-skeleton" />
      ) : modelAvailable ? (
        <MascotBoundary fallback={sprite}>
          <Suspense fallback={<Skeleton className="today-mascot-skeleton" />}>
            <DinoCanvas
              status={props.status}
              event={props.event}
              hours={props.hours}
              onEventComplete={props.onEventComplete}
            />
          </Suspense>
        </MascotBoundary>
      ) : (
        sprite
      )}
    </div>
  )
}
