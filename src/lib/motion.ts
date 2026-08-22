export const EASE = {
  standard: [0.22, 1, 0.36, 1] as const,
  linear: "linear" as const,
}

export const DURATION = {
  instant: 0.12,
  feedback: 0.2,
  transition: 0.35,
  sequenceMs: 700,
  showpieceMs: 1400,
}

export const SPRING = {
  sequence: { type: "spring" as const, stiffness: 260, damping: 26 },
  snappy: { type: "spring" as const, stiffness: 420, damping: 30 },
}

export function prefersReducedMotion() {
  if (typeof window === "undefined") return false
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}
