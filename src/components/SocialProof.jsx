import { motion } from 'framer-motion'
import Reveal from './Reveal'

const BRANDS = [
  'Vertex Labs',
  'Nexa Group',
  'Orbit Systems',
  'Northwind',
  'Lumen Digital',
  'Atlas Robotics',
  'Solace Co',
  'Fenwick & Co',
]

export default function SocialProof() {
  const track = [...BRANDS, ...BRANDS]

  return (
    <section className="border-y border-slate-100 bg-white py-12 sm:py-14">
      <div className="container-shell">
        <Reveal className="text-center">
          <p className="text-[12.5px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Trusted by HR teams at fast-growing companies
          </p>
        </Reveal>

        <div className="relative mt-8 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
          <motion.div
            className="flex w-max items-center gap-16"
            animate={{ x: ['0%', '-50%'] }}
            transition={{ duration: 26, repeat: Infinity, ease: 'linear' }}
          >
            {track.map((name, i) => (
              <span
                key={`${name}-${i}`}
                className="whitespace-nowrap text-[19px] font-bold tracking-tight text-slate-300 transition-colors duration-300 hover:text-navy-700"
              >
                {name}
              </span>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
