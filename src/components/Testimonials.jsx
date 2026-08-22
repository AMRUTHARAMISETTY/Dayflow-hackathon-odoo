import { motion } from 'framer-motion'
import { Quote } from 'lucide-react'
import Reveal from './Reveal'
import { staggerContainer, fadeUp, viewportOnce } from '../animations/variants'

const TESTIMONIALS = [
  {
    quote: 'Dayflow transformed the way we manage our people. Everything is finally organized in one place.',
    name: 'Priya Nair',
    role: 'Head of People, Vertex Labs',
    initials: 'PN',
  },
  {
    quote: 'Payroll used to take our team two full days every month. With Dayflow it takes an afternoon.',
    name: 'Daniel Osei',
    role: 'Finance Director, Nexa Group',
    initials: 'DO',
  },
  {
    quote: 'Our managers finally have visibility into attendance and performance without chasing spreadsheets.',
    name: 'Laura Chen',
    role: 'VP of Operations, Orbit Systems',
    initials: 'LC',
  },
]

export default function Testimonials() {
  return (
    <section id="testimonials" className="bg-white py-24 sm:py-28">
      <div className="container-shell">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-[13px] font-bold tracking-wide text-accent-600">TESTIMONIALS</span>
          <h2 className="mt-3 text-[2.1rem] font-extrabold tracking-tight text-navy-900 sm:text-4xl">
            Loved by HR teams everywhere.
          </h2>
        </Reveal>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          variants={staggerContainer(0.12)}
          className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3"
        >
          {TESTIMONIALS.map((t) => (
            <motion.div
              key={t.name}
              variants={fadeUp}
              whileHover={{ y: -6 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
              className="rounded-2xl border border-slate-200 bg-white p-7 hover:shadow-premium"
            >
              <Quote size={22} className="text-accent-300" />
              <p className="mt-4 text-[14.5px] leading-relaxed text-slate-600">&ldquo;{t.quote}&rdquo;</p>
              <div className="mt-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-accent-500 to-violet-500 text-[13px] font-bold text-white">
                  {t.initials}
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-navy-900">{t.name}</p>
                  <p className="text-[12.5px] text-slate-500">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
