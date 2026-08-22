import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Rocket, TrendingUp, UserCog, Users2 } from 'lucide-react'
import Reveal from './Reveal'

const STEPS = [
  { icon: Users2, title: 'Hire', description: 'Find and onboard the right people, faster.' },
  { icon: UserCog, title: 'Manage', description: 'Keep employee information organized and accessible.' },
  { icon: TrendingUp, title: 'Track', description: 'Monitor attendance, leave, payroll, and performance.' },
  { icon: Rocket, title: 'Grow', description: 'Use insights to improve productivity and engagement.' },
]

export default function HowItWorks() {
  const containerRef = useRef(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start 70%', 'end 60%'],
  })
  const lineScale = useTransform(scrollYProgress, [0, 1], [0, 1])

  return (
    <section id="how-it-works" className="bg-slate-50 py-24 sm:py-28">
      <div className="container-shell">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-[13px] font-bold tracking-wide text-accent-600">HOW IT WORKS</span>
          <h2 className="mt-3 text-[2.1rem] font-extrabold tracking-tight text-navy-900 sm:text-4xl">
            HR doesn&apos;t have to be complicated.
          </h2>
        </Reveal>

        <div ref={containerRef} className="relative mt-16">
          <div className="absolute left-6 top-0 hidden h-full w-px bg-slate-200 sm:block lg:left-0 lg:top-7 lg:h-px lg:w-full">
            <motion.div
              style={{ scaleY: lineScale, scaleX: lineScale }}
              className="h-full w-full origin-top bg-gradient-to-b from-accent-500 to-violet-500 lg:origin-left lg:bg-gradient-to-r"
            />
          </div>

          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-100px 0px' }}
                transition={{ duration: 0.55, delay: i * 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="relative flex gap-4 pl-16 sm:flex-col sm:gap-0 sm:pl-0 sm:text-center"
              >
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.15 + 0.15, ease: 'backOut' }}
                  className="absolute left-0 top-0 flex h-12 w-12 items-center justify-center rounded-full bg-white text-navy-900 shadow-premium ring-4 ring-slate-50 sm:static sm:mx-auto sm:mb-5"
                >
                  <step.icon size={20} className="text-accent-600" />
                </motion.div>
                <div>
                  <span className="text-[12.5px] font-bold text-slate-300">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="mt-1 text-[17px] font-bold text-navy-900">{step.title}</h3>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-slate-500">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
