import { useEffect, useRef, useState } from "react"
import { motion, animate as animateDom, type AnimationPlaybackControls } from "framer-motion"
import type { MascotEvent, MascotStatus } from "./TodayMascot"
import { useReducedMotion } from "../../hooks/useReducedMotion"

interface Props {
  status: MascotStatus
  event: MascotEvent
  waveTrigger: number
  danceTrigger: number
  onEventComplete: () => void
}

type BasePhase = "idle" | "alert" | "tired" | "sleeping"

const LOOP_ANIMATE: Record<BasePhase, Record<string, number[] | number>> = {
  idle: { y: [0, -3, 0], scaleY: [1, 1.02, 1], rotate: 0, scaleX: 1 },
  alert: { y: [0, -6, 0], rotate: [0, -4, 0], scaleY: 1, scaleX: 1 },
  tired: { y: [4, -2, 4], rotate: 3, scaleY: 1, scaleX: 1 },
  sleeping: { y: [0, -2, 0], scaleY: [1, 1.03, 1], rotate: 0, scaleX: 1 },
}

const LOOP_TRANSITION: Record<BasePhase, Record<string, object>> = {
  idle: { y: { duration: 3, repeat: Infinity, ease: "easeInOut" }, scaleY: { duration: 3, repeat: Infinity, ease: "easeInOut" } },
  alert: {
    y: { duration: 2, repeat: Infinity, ease: "easeInOut" },
    rotate: { duration: 0.6, repeat: Infinity, repeatDelay: 6.4, ease: "easeInOut" },
  },
  tired: { y: { duration: 3.3, repeat: Infinity, ease: "easeInOut" } },
  sleeping: { y: { duration: 4, repeat: Infinity, ease: "easeInOut" }, scaleY: { duration: 4, repeat: Infinity, ease: "easeInOut" } },
}

function basePhaseFor(status: MascotStatus): BasePhase {
  if (status === "not-checked-in") return "sleeping"
  if (status === "working-late" || status === "overtime") return "tired"
  if (status === "day-complete") return "idle"
  return "alert"
}

export default function DinoSprite({ status, event, waveTrigger, danceTrigger, onEventComplete }: Props) {
  const reduced = useReducedMotion()
  const imgRef = useRef<HTMLImageElement>(null)
  const shadowRef = useRef<HTMLDivElement>(null)
  const [oneShotActive, setOneShotActive] = useState(false)
  const [showRing, setShowRing] = useState(false)
  const [confetti, setConfetti] = useState(false)
  const prevWave = useRef(waveTrigger)
  const prevDance = useRef(danceTrigger)
  const loopControl = useRef<AnimationPlaybackControls | null>(null)

  const basePhase = basePhaseFor(status)
  const showZzz = basePhase === "sleeping" && !reduced

  // One explicit controller owns the element's transform at all times — the
  // continuous loop and the one-shot sequences take turns, never overlap.
  function stopLoop() {
    loopControl.current?.stop()
    loopControl.current = null
  }

  function startLoop(phase: BasePhase) {
    const el = imgRef.current
    if (!el || reduced) return
    stopLoop()
    loopControl.current = animateDom(el, LOOP_ANIMATE[phase], LOOP_TRANSITION[phase])
  }

  useEffect(() => {
    if (!oneShotActive) startLoop(basePhase)
    return () => stopLoop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basePhase, oneShotActive, reduced])

  async function resetPose(el: HTMLElement) {
    await animateDom(el, { y: 0, rotate: 0, scaleX: 1, scaleY: 1 }, { duration: 0.05 })
  }

  async function runJump() {
    const el = imgRef.current
    if (!el || reduced) {
      onEventComplete()
      return
    }
    stopLoop()
    setOneShotActive(true)
    const shadow = shadowRef.current
    await resetPose(el)
    await animateDom(el, { scaleY: 0.85, scaleX: 1.1 }, { duration: 0.15, ease: "easeIn" })
    if (shadow) void animateDom(shadow, { scale: 0.6, opacity: 0.15 }, { duration: 0.15 })
    await animateDom(el, { y: -60, scaleY: 1.15, scaleX: 0.92 }, { duration: 0.3, ease: "easeOut" })
    await new Promise((resolve) => setTimeout(resolve, 100))
    if (shadow) void animateDom(shadow, { scale: 1, opacity: 0.3 }, { duration: 0.35 })
    await animateDom(el, { y: 0, scaleY: 0.9, scaleX: 1 }, { duration: 0.25, ease: "easeIn" })
    setShowRing(true)
    window.setTimeout(() => setShowRing(false), 600)
    await animateDom(el, { scaleY: 1, scaleX: 1 }, { type: "spring", stiffness: 260, damping: 16 })
    setOneShotActive(false)
    onEventComplete()
  }

  async function runRevertShake() {
    const el = imgRef.current
    if (!el || reduced) {
      onEventComplete()
      return
    }
    stopLoop()
    setOneShotActive(true)
    await animateDom(el, { rotate: [0, -3, 3, 0] }, { duration: 0.3, ease: "easeInOut" })
    setOneShotActive(false)
    onEventComplete()
  }

  async function runWave() {
    const el = imgRef.current
    if (!el || reduced) return
    stopLoop()
    setOneShotActive(true)
    await animateDom(el, { rotate: [0, -6, 6, -4, 0] }, { type: "spring", stiffness: 200, damping: 12 })
    setOneShotActive(false)
  }

  async function runDance() {
    const el = imgRef.current
    if (!el || reduced) return
    stopLoop()
    setOneShotActive(true)
    setConfetti(true)
    await resetPose(el)
    for (let beat = 0; beat < 5; beat += 1) {
      const dir = beat % 2 === 0 ? -8 : 8
      const flip = beat === 2 ? -1 : 1
      await animateDom(el, { rotate: dir, y: -10, scaleX: flip }, { duration: 0.4, ease: "easeInOut" })
    }
    await animateDom(el, { rotate: 0, y: 0, scaleX: 1 }, { duration: 0.3, ease: "easeOut" })
    window.setTimeout(() => setConfetti(false), 1000)
    setOneShotActive(false)
    await runJump()
  }

  useEffect(() => {
    if (event === "check-in") runJump()
    else if (event === "revert") runRevertShake()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event])

  useEffect(() => {
    if (waveTrigger !== prevWave.current) {
      prevWave.current = waveTrigger
      if (!oneShotActive) runWave()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waveTrigger])

  useEffect(() => {
    if (danceTrigger !== prevDance.current) {
      prevDance.current = danceTrigger
      if (!oneShotActive) runDance()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [danceTrigger])

  function handleClick() {
    if (!oneShotActive) runWave()
  }

  return (
    <div className="dino-sprite-inner">
      <div ref={shadowRef} className="dino-shadow" />
      <motion.img
        ref={imgRef}
        src="/images/dino-fallback.png"
        alt="Dayflow dinosaur"
        className="dino-img"
        onClick={handleClick}
        style={{ transformOrigin: "bottom center" }}
      />
      {showRing && (
        <motion.div
          className="dino-ring"
          initial={{ scale: 0, opacity: 0.6 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      )}
      {showZzz && (
        <div className="dino-zzz" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="dino-zzz-char"
              animate={{ y: [-4, -28], opacity: [0, 1, 0] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.8, ease: "easeOut" }}
            >
              z
            </motion.span>
          ))}
        </div>
      )}
      {confetti && !reduced && (
        <div className="dino-confetti" aria-hidden="true">
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.span
              key={i}
              className="dino-confetti-dot"
              style={{ left: `${(i * 47) % 100}%`, backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length] }}
              initial={{ y: -20, opacity: 1 }}
              animate={{ y: 160, opacity: 0 }}
              transition={{ duration: 1, delay: (i % 10) * 0.05, ease: "easeIn" }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

const CONFETTI_COLORS = ["#0F5C4E", "#E8A33D", "#6D7671", "#B9B09B"]
