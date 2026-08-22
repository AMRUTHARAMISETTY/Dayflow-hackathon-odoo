import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useReducedMotion } from "../../hooks/useReducedMotion"

const ROTATE_MS = 8000

export default function SpeechBubble({
  messages,
  onNewMessage,
}: {
  messages: string[]
  onNewMessage: () => void
}) {
  const reduced = useReducedMotion()
  const [index, setIndex] = useState(0)
  const prevIndex = useRef(0)

  useEffect(() => {
    setIndex(0)
  }, [messages.length])

  useEffect(() => {
    if (messages.length <= 1) return
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % messages.length)
    }, ROTATE_MS)
    return () => window.clearInterval(id)
  }, [messages.length])

  useEffect(() => {
    // Compare against the previous VALUE, not an invocation-count flag — a
    // simple "have we mounted yet" boolean gets flipped by React 18
    // StrictMode's mount→cleanup→remount effect replay in dev, which fires
    // this on first paint even though the index never really changed.
    if (index !== prevIndex.current) {
      prevIndex.current = index
      onNewMessage()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  const text = messages[index] ?? ""

  return (
    <motion.div layout={!reduced} className="dino-bubble">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={text}
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0, transition: reduced ? { duration: 0 } : { duration: 0.25, ease: [0.22, 1, 0.36, 1] } }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8, transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] } }}
          className="dino-bubble-text"
        >
          {text}
        </motion.span>
      </AnimatePresence>
      <span className="dino-bubble-tail" aria-hidden="true" />
    </motion.div>
  )
}
