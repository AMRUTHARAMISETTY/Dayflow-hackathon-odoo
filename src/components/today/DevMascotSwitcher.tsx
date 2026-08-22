import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Sparkles, X } from "lucide-react"
import type { MascotStatus } from "./TodayMascot"

const STATUSES: MascotStatus[] = ["not-checked-in", "checking-in", "working", "working-late", "overtime", "day-complete"]

export default function DevMascotSwitcher({
  value,
  onChange,
  onWave,
  onDance,
  onJump,
  onAngry,
  onShocked,
}: {
  value: MascotStatus | null
  onChange: (value: MascotStatus | null) => void
  onWave: () => void
  onDance: () => void
  onJump: () => void
  onAngry: () => void
  onShocked: () => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="dev-mascot-dock">
      <button
        type="button"
        className="dev-mascot-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        title="Dino preview (dev only)"
      >
        {open ? <X /> : <Sparkles />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="dev-mascot-switcher"
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
          >
            <p>Dino preview (dev only)</p>
            <div>
              <button type="button" className={!value ? "active" : ""} onClick={() => onChange(null)}>
                Live
              </button>
              {STATUSES.map((s) => (
                <button key={s} type="button" className={value === s ? "active" : ""} onClick={() => onChange(s)}>
                  {s}
                </button>
              ))}
            </div>
            <div>
              <button type="button" onClick={onWave}>
                Wave
              </button>
              <button type="button" onClick={onDance}>
                Dance
              </button>
              <button type="button" onClick={onJump}>
                Jump
              </button>
              <button type="button" onClick={onAngry}>
                Angry
              </button>
              <button type="button" onClick={onShocked}>
                Shocked
              </button>
            </div>
            <p style={{ marginTop: 4 }}>Sit/read/relax cycle randomly while working — click the dino 3x fast for Angry.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
