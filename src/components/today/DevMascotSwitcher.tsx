import type { MascotStatus } from "./TodayMascot"

const STATUSES: MascotStatus[] = ["not-checked-in", "checking-in", "working", "working-late", "overtime", "day-complete"]

export default function DevMascotSwitcher({
  value,
  onChange,
  onWave,
  onDance,
  onJump,
}: {
  value: MascotStatus | null
  onChange: (value: MascotStatus | null) => void
  onWave: () => void
  onDance: () => void
  onJump: () => void
}) {
  return (
    <div className="dev-mascot-switcher">
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
      </div>
    </div>
  )
}
