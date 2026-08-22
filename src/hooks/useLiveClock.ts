import { useEffect, useState } from "react"

function currentMinutes() {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60
}

/** Ticks every second — the Day Rail's live fill reads from this rather than a CSS transition. */
export function useLiveClock() {
  const [minutes, setMinutes] = useState(currentMinutes)

  useEffect(() => {
    let raf: number
    let lastSecond = -1
    function loop() {
      const now = new Date()
      const second = now.getSeconds()
      if (second !== lastSecond) {
        lastSecond = second
        setMinutes(now.getHours() * 60 + now.getMinutes() + second / 60)
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  return minutes
}
