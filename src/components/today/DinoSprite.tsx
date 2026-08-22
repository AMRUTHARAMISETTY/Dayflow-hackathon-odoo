import { useEffect, useRef, useState } from "react"
import { motion, animate as animateDom, type AnimationPlaybackControls } from "framer-motion"
import type { MascotEvent, MascotStatus } from "./TodayMascot"
import { useReducedMotion } from "../../hooks/useReducedMotion"

interface Props {
  status: MascotStatus
  event: MascotEvent
  waveTrigger: number
  danceTrigger: number
  shockedTrigger: number
  angryTrigger: number
  onEventComplete: () => void
}

type StatusPhase = "idle" | "alert" | "tired" | "sleeping"
type ActivityPhase = "sitting-laptop" | "reading" | "relaxed"
type BasePhase = StatusPhase | ActivityPhase

const LOOP_ANIMATE: Record<BasePhase, Record<string, number[] | number>> = {
  idle: { y: [0, -3, 0], scaleY: [1, 1.02, 1], rotate: 0, scaleX: 1 },
  alert: { y: [0, -6, 0], rotate: [0, -4, 0], scaleY: 1, scaleX: 1 },
  tired: { y: [4, -2, 4], rotate: 3, scaleY: 1, scaleX: 1 },
  sleeping: { y: [0, -2, 0], scaleY: [1, 1.03, 1], rotate: 0, scaleX: 1 },
  "sitting-laptop": { y: 16, scaleY: 0.86, scaleX: 1, rotate: [0, -1.5, 0, 1.5, 0] },
  reading: { y: 6, scaleY: 0.95, scaleX: 1, rotate: [-3, 3, -3] },
  relaxed: { y: [8, 3, 8], scaleY: [1, 1.03, 1], scaleX: 1, rotate: 6 },
}

const LOOP_TRANSITION: Record<BasePhase, Record<string, object>> = {
  idle: { y: { duration: 3, repeat: Infinity, ease: "easeInOut" }, scaleY: { duration: 3, repeat: Infinity, ease: "easeInOut" } },
  alert: {
    y: { duration: 2, repeat: Infinity, ease: "easeInOut" },
    rotate: { duration: 0.6, repeat: Infinity, repeatDelay: 6.4, ease: "easeInOut" },
  },
  tired: { y: { duration: 3.3, repeat: Infinity, ease: "easeInOut" } },
  sleeping: { y: { duration: 4, repeat: Infinity, ease: "easeInOut" }, scaleY: { duration: 4, repeat: Infinity, ease: "easeInOut" } },
  "sitting-laptop": { rotate: { duration: 2.2, repeat: Infinity, ease: "easeInOut" } },
  reading: { rotate: { duration: 4, repeat: Infinity, ease: "easeInOut" } },
  relaxed: { y: { duration: 3.5, repeat: Infinity, ease: "easeInOut" }, scaleY: { duration: 3.5, repeat: Infinity, ease: "easeInOut" } },
}

const ACTIVITY_POOL: ActivityPhase[] = ["sitting-laptop", "reading", "relaxed"]

function statusPhaseFor(status: MascotStatus): StatusPhase {
  if (status === "not-checked-in") return "sleeping"
  if (status === "working-late" || status === "overtime") return "tired"
  if (status === "day-complete") return "idle"
  return "alert"
}

export default function DinoSprite({ status, event, waveTrigger, danceTrigger, shockedTrigger, angryTrigger, onEventComplete }: Props) {
  const reduced = useReducedMotion()
  const imgRef = useRef<HTMLImageElement>(null)
  const shadowRef = useRef<HTMLDivElement>(null)
  const [oneShotActive, setOneShotActive] = useState(false)
  const [showRing, setShowRing] = useState(false)
  const [confetti, setConfetti] = useState(false)
  const [angerMark, setAngerMark] = useState(false)
  const [shockedMark, setShockedMark] = useState(false)
  const [activityPhase, setActivityPhase] = useState<ActivityPhase | null>(null)
  const prevWave = useRef(waveTrigger)
  const prevDance = useRef(danceTrigger)
  const prevShocked = useRef(shockedTrigger)
  const prevAngry = useRef(angryTrigger)
  const loopControl = useRef<AnimationPlaybackControls | null>(null)
  const clickTimes = useRef<number[]>([])
  const sequence = useRef(0)

  const statusPhase = statusPhaseFor(status)
  const basePhase: BasePhase = activityPhase ?? statusPhase
  const showZzz = basePhase === "sleeping" && !reduced
  const showLaptop = basePhase === "sitting-laptop" && !oneShotActive
  const showNewspaper = basePhase === "reading" && !oneShotActive

  // A monotonic token lets a newer one-shot (e.g. a real check-in) cleanly
  // preempt an older one still mid-sequence (e.g. a playful Angry from rapid
  // clicking) instead of the two racing to set the final pose.
  function beginSequence() {
    sequence.current += 1
    return sequence.current
  }
  function isCurrent(token: number) {
    return sequence.current === token
  }

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

  // "Talking Tom" idle behaviour: while genuinely at the desk (not sleeping,
  // not tired-and-overtime), randomly drop into a little vignette — typing,
  // reading, or leaning back — every 18–30s, for 6–10s at a time.
  useEffect(() => {
    if (reduced || (statusPhase !== "alert" && statusPhase !== "idle")) {
      setActivityPhase(null)
      return
    }
    let hideTimer: number
    let nextTimer: number
    function scheduleNext() {
      nextTimer = window.setTimeout(() => {
        if (!oneShotActive) {
          const pick = ACTIVITY_POOL[Math.floor(Math.random() * ACTIVITY_POOL.length)]
          setActivityPhase(pick)
          hideTimer = window.setTimeout(() => setActivityPhase(null), 6000 + Math.random() * 4000)
        }
        scheduleNext()
      }, 18000 + Math.random() * 12000)
    }
    scheduleNext()
    return () => {
      window.clearTimeout(hideTimer)
      window.clearTimeout(nextTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusPhase, reduced])

  async function resetPose(el: HTMLElement) {
    await animateDom(el, { y: 0, rotate: 0, scaleX: 1, scaleY: 1 }, { duration: 0.05 })
  }

  async function runJump() {
    const token = beginSequence()
    const el = imgRef.current
    if (!el || reduced) {
      onEventComplete()
      return
    }
    stopLoop()
    setOneShotActive(true)
    setActivityPhase(null)
    const shadow = shadowRef.current
    await resetPose(el)
    if (!isCurrent(token)) return
    await animateDom(el, { scaleY: 0.85, scaleX: 1.1 }, { duration: 0.15, ease: "easeIn" })
    if (!isCurrent(token)) return
    if (shadow) void animateDom(shadow, { scale: 0.6, opacity: 0.15 }, { duration: 0.15 })
    await animateDom(el, { y: -60, scaleY: 1.15, scaleX: 0.92 }, { duration: 0.3, ease: "easeOut" })
    if (!isCurrent(token)) return
    await new Promise((resolve) => setTimeout(resolve, 100))
    if (!isCurrent(token)) return
    if (shadow) void animateDom(shadow, { scale: 1, opacity: 0.3 }, { duration: 0.35 })
    await animateDom(el, { y: 0, scaleY: 0.9, scaleX: 1 }, { duration: 0.25, ease: "easeIn" })
    if (!isCurrent(token)) return
    setShowRing(true)
    window.setTimeout(() => setShowRing(false), 600)
    await animateDom(el, { scaleY: 1, scaleX: 1 }, { type: "spring", stiffness: 260, damping: 16 })
    if (!isCurrent(token)) return
    setOneShotActive(false)
    onEventComplete()
  }

  async function runRevertShake() {
    const token = beginSequence()
    const el = imgRef.current
    if (!el || reduced) {
      onEventComplete()
      return
    }
    stopLoop()
    setOneShotActive(true)
    await animateDom(el, { rotate: [0, -3, 3, 0] }, { duration: 0.3, ease: "easeInOut" })
    if (!isCurrent(token)) return
    setOneShotActive(false)
    onEventComplete()
  }

  async function runWave() {
    const token = beginSequence()
    const el = imgRef.current
    if (!el || reduced) return
    stopLoop()
    setOneShotActive(true)
    await animateDom(el, { rotate: [0, -6, 6, -4, 0] }, { type: "spring", stiffness: 200, damping: 12 })
    if (!isCurrent(token)) return
    setOneShotActive(false)
  }

  async function runDance() {
    const token = beginSequence()
    const el = imgRef.current
    if (!el || reduced) return
    stopLoop()
    setOneShotActive(true)
    setActivityPhase(null)
    setConfetti(true)
    await resetPose(el)
    if (!isCurrent(token)) return
    for (let beat = 0; beat < 5; beat += 1) {
      const dir = beat % 2 === 0 ? -8 : 8
      const flip = beat === 2 ? -1 : 1
      await animateDom(el, { rotate: dir, y: -10, scaleX: flip }, { duration: 0.4, ease: "easeInOut" })
      if (!isCurrent(token)) return
    }
    await animateDom(el, { rotate: 0, y: 0, scaleX: 1 }, { duration: 0.3, ease: "easeOut" })
    if (!isCurrent(token)) return
    window.setTimeout(() => setConfetti(false), 1000)
    setOneShotActive(false)
    await runJump()
  }

  async function runAngry() {
    const token = beginSequence()
    const el = imgRef.current
    if (!el || reduced) return
    stopLoop()
    setOneShotActive(true)
    setActivityPhase(null)
    await resetPose(el)
    if (!isCurrent(token)) return
    setAngerMark(true)
    await animateDom(el, { scaleY: [1, 0.9, 1.08, 0.95, 1], scaleX: [1, 1.08, 0.94, 1.04, 1] }, { duration: 0.35, ease: "easeInOut" })
    if (!isCurrent(token)) return
    await animateDom(el, { rotate: [-4, 4, -4, 4, 0] }, { duration: 0.4, ease: "easeInOut" })
    if (!isCurrent(token)) return
    window.setTimeout(() => setAngerMark(false), 500)
    setOneShotActive(false)
  }

  async function runShocked() {
    const token = beginSequence()
    const el = imgRef.current
    if (!el || reduced) return
    stopLoop()
    setOneShotActive(true)
    setActivityPhase(null)
    await resetPose(el)
    if (!isCurrent(token)) return
    setShockedMark(true)
    await animateDom(el, { y: 6, scaleY: 1.12, scaleX: 0.94 }, { duration: 0.18, ease: "easeOut" })
    if (!isCurrent(token)) return
    await new Promise((resolve) => setTimeout(resolve, 550))
    if (!isCurrent(token)) return
    await animateDom(el, { y: 0, scaleY: 1, scaleX: 1 }, { type: "spring", stiffness: 300, damping: 18 })
    if (!isCurrent(token)) return
    window.setTimeout(() => setShockedMark(false), 200)
    setOneShotActive(false)
  }

  useEffect(() => {
    if (event === "check-in") runJump()
    else if (event === "revert") runRevertShake()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event])

  useEffect(() => {
    if (waveTrigger !== prevWave.current) {
      prevWave.current = waveTrigger
      runWave()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waveTrigger])

  useEffect(() => {
    if (danceTrigger !== prevDance.current) {
      prevDance.current = danceTrigger
      runDance()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [danceTrigger])

  useEffect(() => {
    if (shockedTrigger !== prevShocked.current) {
      prevShocked.current = shockedTrigger
      runShocked()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shockedTrigger])

  useEffect(() => {
    if (angryTrigger !== prevAngry.current) {
      prevAngry.current = angryTrigger
      runAngry()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [angryTrigger])

  function handleClick() {
    const now = Date.now()
    clickTimes.current = [...clickTimes.current.filter((t) => now - t < 1400), now]
    if (clickTimes.current.length >= 3) {
      clickTimes.current = []
      runAngry()
      return
    }
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
      {showLaptop && <LaptopProp />}
      {showNewspaper && <NewspaperProp />}
      {angerMark && !reduced && <AngerMark />}
      {shockedMark && !reduced && <ShockedMark />}
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

function LaptopProp() {
  return (
    <motion.div
      className="dino-prop dino-prop-laptop"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.3 }}
      aria-hidden="true"
    >
      <svg width="56" height="40" viewBox="0 0 56 40" fill="none">
        <rect x="6" y="2" width="34" height="22" rx="2" fill="var(--today-line)" />
        <rect x="8" y="4" width="30" height="18" rx="1" fill="#fff" />
        <rect x="0" y="24" width="46" height="4" rx="1.5" fill="var(--today-line)" />
      </svg>
      <span className="dino-prop-blink" />
    </motion.div>
  )
}

function NewspaperProp() {
  return (
    <motion.div
      className="dino-prop dino-prop-newspaper"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.3 }}
      aria-hidden="true"
    >
      <motion.svg
        width="44"
        height="34"
        viewBox="0 0 44 34"
        fill="none"
        animate={{ scaleX: [1, 0.92, 1] }}
        transition={{ duration: 0.25, repeat: Infinity, repeatDelay: 3.8 }}
      >
        <rect x="1" y="1" width="42" height="32" rx="2" fill="#fff" stroke="var(--today-line)" />
        <rect x="5" y="6" width="15" height="3" rx="1" fill="var(--today-secondary)" />
        <rect x="5" y="12" width="15" height="2" rx="1" fill="var(--today-line)" />
        <rect x="5" y="17" width="15" height="2" rx="1" fill="var(--today-line)" />
        <rect x="5" y="22" width="15" height="2" rx="1" fill="var(--today-line)" />
        <rect x="24" y="6" width="15" height="2" rx="1" fill="var(--today-line)" />
        <rect x="24" y="11" width="15" height="2" rx="1" fill="var(--today-line)" />
        <rect x="24" y="16" width="10" height="10" rx="1" fill="var(--today-line)" />
      </motion.svg>
    </motion.div>
  )
}

function AngerMark() {
  return (
    <div className="dino-anger" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="dino-anger-line"
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: [0, 1, 1, 0], scale: 1, rotate: -20 + i * 20 }}
          transition={{ duration: 0.5, delay: i * 0.04 }}
        />
      ))}
    </div>
  )
}

function ShockedMark() {
  return (
    <motion.div
      className="dino-shocked-mark"
      initial={{ opacity: 0, scale: 0.4, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 14 }}
      aria-hidden="true"
    >
      !
    </motion.div>
  )
}
