import { motion } from 'framer-motion'
import { Gauge, Layers, ShieldCheck, Zap } from 'lucide-react'
import Reveal from './Reveal'
import { viewportOnce } from '../animations/variants'

const LAYERS = [
  {
    id: '01',
    icon: Layers,
    title: 'Deep Foundations',
    description: 'Every system starts from bedrock — architecture chosen for decades, not sprints.',
  },
  {
    id: '02',
    icon: ShieldCheck,
    title: 'Adaptive Resilience',
    description: 'Built to flex under pressure and recover from anything short of a full extinction event.',
  },
  {
    id: '03',
    icon: Zap,
    title: 'Precision Engineering',
    description: 'No wasted motion. Every line of code, every query, pulls its own weight.',
  },
  {
    id: '04',
    icon: Gauge,
    title: 'Proven at Scale',
    description: 'From startup fossils to enterprise strata, R-REX scales cleanly with you.',
  },
]

const JAG = 'polygon(0% 12px, 4% 0%, 9% 10px, 15% 2px, 22% 9px, 30% 0%, 38% 8px, 47% 1px, 55% 10px, 63% 3px, 71% 9px, 80% 0%, 88% 8px, 95% 2px, 100% 10px, 100% 100%, 0% 100%)'

export default function WhyRRex() {
  return (
    <section id="why-rrex" className="relative overflow-hidden bg-obsidian-950 py-24 sm:py-28">
      <div className="container-shell relative">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-[13px] font-bold tracking-[0.14em] text-amber-400">WHY R-REX</span>
          <h2 className="mt-3 font-display text-[2.1rem] font-bold tracking-tight text-bone-500 sm:text-4xl">
            Dig through the strata. Find engineering that lasts.
          </h2>
        </Reveal>

        <div className="mx-auto mt-16 max-w-3xl">
          {LAYERS.map((layer, i) => (
            <motion.div
              key={layer.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewportOnce}
              transition={{ duration: 0.6, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
              style={i > 0 ? { clipPath: JAG, marginTop: -1 } : undefined}
              className="relative border border-amber-500/10 bg-obsidian-800/70 px-6 py-7 sm:px-9 sm:py-8"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-7">
                <div className="flex items-center gap-4 sm:w-64 sm:shrink-0">
                  <span className="font-display text-[13px] font-bold text-amber-500/50">
                    LAYER {layer.id}
                  </span>
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-amber-500/40 bg-obsidian-900 text-amber-400">
                    <layer.icon size={18} />
                  </div>
                  <h3 className="font-display text-[16.5px] font-bold text-bone-500">{layer.title}</h3>
                </div>
                <p className="text-[14.5px] leading-relaxed text-bone-500/60">{layer.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
