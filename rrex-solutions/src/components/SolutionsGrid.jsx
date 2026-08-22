import { motion } from 'framer-motion'
import { Cloud, Cpu, Database, ShieldCheck, Workflow, Zap } from 'lucide-react'
import SolutionCard from './SolutionCard'
import Reveal from './Reveal'
import { staggerContainer, viewportOnce } from '../animations/variants'

const SOLUTIONS = [
  {
    icon: Cpu,
    title: 'Core Platform',
    description: 'The load-bearing system beneath your product — stable under real-world pressure.',
    points: ['Modular architecture', 'Zero-downtime deploys', 'Battle-tested at scale'],
  },
  {
    icon: ShieldCheck,
    title: 'Security Layer',
    description: 'Defense woven into every layer, not bolted on as an afterthought.',
    points: ['Threat modeling', 'Zero-trust access', 'Continuous auditing'],
  },
  {
    icon: Database,
    title: 'Data Intelligence',
    description: 'Structured, queryable, and fast — data that earns its keep.',
    points: ['Real-time pipelines', 'Warehouse design', 'Predictive insight'],
  },
  {
    icon: Workflow,
    title: 'Automation Suite',
    description: 'Workflows that remove the manual toil between idea and shipped feature.',
    points: ['CI/CD orchestration', 'Infra as code', 'Self-healing jobs'],
  },
  {
    icon: Cloud,
    title: 'Cloud Backbone',
    description: 'Elastic infrastructure engineered to flex from seed round to scale-up.',
    points: ['Multi-region', 'Auto-scaling', 'Cost-aware routing'],
  },
  {
    icon: Zap,
    title: 'Integration Engine',
    description: 'One connective layer for every legacy system and modern API you own.',
    points: ['Prebuilt connectors', 'Event streaming', 'Schema versioning'],
  },
]

export default function SolutionsGrid() {
  return (
    <section id="solutions" className="relative bg-obsidian-900 py-24 sm:py-28">
      <div className="container-shell">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-[13px] font-bold tracking-[0.14em] text-amber-400">SOLUTIONS</span>
          <h2 className="mt-3 font-display text-[2.1rem] font-bold tracking-tight text-bone-500 sm:text-4xl">
            Every product, engineered to endure.
          </h2>
          <p className="mt-4 text-[15.5px] leading-relaxed text-bone-500/60">
            Hover a solution to see it break down into its engineering fragments.
          </p>
        </Reveal>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          variants={staggerContainer(0.1)}
          className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {SOLUTIONS.map((s) => (
            <SolutionCard key={s.title} {...s} />
          ))}
        </motion.div>
      </div>
    </section>
  )
}
