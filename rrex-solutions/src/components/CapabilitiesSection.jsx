import { Gauge, Plug, ShieldCheck, TrendingUp } from 'lucide-react'
import CapabilityBar from './CapabilityBar'
import Reveal from './Reveal'
import GlassCard from './GlassCard'
import { fadeIn } from '../animations/variants'

const CAPABILITIES = [
  { icon: TrendingUp, label: 'Scalability', value: 96 },
  { icon: ShieldCheck, label: 'Security', value: 92 },
  { icon: Gauge, label: 'Speed', value: 89 },
  { icon: Plug, label: 'Integration', value: 94 },
]

export default function CapabilitiesSection() {
  return (
    <section id="capabilities" className="relative bg-obsidian-950 py-24 sm:py-28">
      <div className="container-shell">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-[13px] font-bold tracking-[0.14em] text-amber-400">CAPABILITIES</span>
          <h2 className="mt-3 font-display text-[2.1rem] font-bold tracking-tight text-bone-500 sm:text-4xl">
            Strength measured in strata.
          </h2>
          <p className="mt-4 text-[15.5px] leading-relaxed text-bone-500/60">
            Each capability fills like sediment settling into bedrock — proof, not promises.
          </p>
        </Reveal>

        <Reveal variants={fadeIn} className="mx-auto mt-14 max-w-2xl">
          <GlassCard hover={false}>
            <div className="space-y-8">
              {CAPABILITIES.map((cap, i) => (
                <CapabilityBar key={cap.label} {...cap} delay={i * 0.1} />
              ))}
            </div>
          </GlassCard>
        </Reveal>
      </div>
    </section>
  )
}
