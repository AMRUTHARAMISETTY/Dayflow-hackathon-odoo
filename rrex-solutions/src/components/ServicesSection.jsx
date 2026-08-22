import { motion } from 'framer-motion'
import { Cloud, Cpu, Database, GitBranch, ShieldCheck, Workflow } from 'lucide-react'
import GlassCard from './GlassCard'
import Reveal from './Reveal'
import { staggerContainer, viewportOnce } from '../animations/variants'

const SERVICES = [
  {
    icon: Cpu,
    title: 'Platform Engineering',
    description: 'Core systems built for load, longevity, and change — bedrock, not bandaids.',
  },
  {
    icon: ShieldCheck,
    title: 'Security Hardening',
    description: 'Defense-in-depth architecture that survives what modern threats throw at it.',
  },
  {
    icon: Database,
    title: 'Data & Analytics',
    description: 'Pipelines that turn raw signal into decisions leadership can stand on.',
  },
  {
    icon: Workflow,
    title: 'Automation & DevOps',
    description: 'CI/CD and infra-as-code that ships fast without fossilizing your process.',
  },
  {
    icon: Cloud,
    title: 'Cloud Infrastructure',
    description: 'Elastic, resilient environments engineered to scale across eras of growth.',
  },
  {
    icon: GitBranch,
    title: 'Systems Integration',
    description: 'Connect legacy and modern stacks without losing a single fossil record.',
  },
]

export default function ServicesSection() {
  return (
    <section id="services" className="relative bg-obsidian-900 py-24 sm:py-28">
      <div className="container-shell">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-[13px] font-bold tracking-[0.14em] text-amber-400">PRODUCT &amp; SERVICES</span>
          <h2 className="mt-3 font-display text-[2.1rem] font-bold tracking-tight text-bone-500 sm:text-4xl">
            Engineering with fossil-deep discipline.
          </h2>
          <p className="mt-4 text-[15.5px] leading-relaxed text-bone-500/60">
            From core platform to the last integration, R-REX builds every layer to outlast the
            next extinction-level shift in your stack.
          </p>
        </Reveal>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          variants={staggerContainer(0.1)}
          className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {SERVICES.map((service) => (
            <GlassCard key={service.title}>
              <motion.div
                whileHover={{ scale: 1.08, rotate: -3 }}
                className="flex h-12 w-12 items-center justify-center rounded-xl border border-amber-500/40 bg-obsidian-900 text-amber-400 shadow-amberGlow"
              >
                <service.icon size={20} />
              </motion.div>
              <h3 className="mt-5 font-display text-[17px] font-bold text-bone-500">{service.title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-bone-500/60">{service.description}</p>
            </GlassCard>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
