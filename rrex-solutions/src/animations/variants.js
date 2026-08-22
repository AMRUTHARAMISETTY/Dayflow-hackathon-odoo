export const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] } },
}

export const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.7, ease: 'easeOut' } },
}

export const slideLeft = {
  hidden: { opacity: 0, x: -44 },
  show: { opacity: 1, x: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
}

export const slideRight = {
  hidden: { opacity: 0, x: 44 },
  show: { opacity: 1, x: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
}

/** Two strata "plates" sliding apart to reveal the next section, then settling. */
export const plateLeft = {
  hidden: { opacity: 0, x: -60, skewX: -2 },
  show: { opacity: 1, x: 0, skewX: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
}

export const plateRight = {
  hidden: { opacity: 0, x: 60, skewX: 2 },
  show: { opacity: 1, x: 0, skewX: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
}

export const staggerContainer = (staggerChildren = 0.12, delayChildren = 0) => ({
  hidden: {},
  show: {
    transition: { staggerChildren, delayChildren },
  },
})

export const viewportOnce = { once: true, margin: '-80px 0px' }
