import { motion } from 'framer-motion'
import { ArrowRight, Award, CalendarDays } from 'lucide-react'
import Reveal from './Reveal'
import CountUp from './CountUp'
import { slideLeft, slideRight } from '../animations/variants'

export default function EmployeeExperience() {
  return (
    <section className="bg-white py-24 sm:py-28">
      <div className="container-shell grid items-center gap-16 lg:grid-cols-2">
        <motion.div
          variants={slideLeft}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px 0px' }}
          className="relative mx-auto w-full max-w-sm"
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-premium"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-accent-500 to-violet-500 text-lg font-bold text-white">
                MP
              </div>
              <div>
                <h3 className="text-[16px] font-bold text-navy-900">Maya Patel</h3>
                <p className="text-[13px] text-slate-500">Product Designer · Design</p>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-[12.5px] text-slate-500">
              <CalendarDays size={14} />
              Joined March 2023
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-slate-500">Attendance</span>
                  <span className="font-semibold text-navy-900">
                    <CountUp value={98} suffix="%" />
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: '98%' }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: 0.2 }}
                    className="h-full rounded-full bg-accent-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-slate-500">Leave balance</span>
                  <span className="font-semibold text-navy-900">
                    <CountUp value={14} /> days
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: '58%' }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: 0.35 }}
                    className="h-full rounded-full bg-violet-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-gradient-to-r from-accent-50 to-violet-50 px-3 py-2.5">
                <span className="flex items-center gap-1.5 text-[13px] font-medium text-slate-600">
                  <Award size={14} className="text-accent-600" />
                  Performance score
                </span>
                <span className="text-[15px] font-bold text-navy-900">
                  <CountUp value={92} suffix="/100" />
                </span>
              </div>
            </div>
          </motion.div>
        </motion.div>

        <motion.div variants={slideRight} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px 0px' }}>
          <span className="text-[13px] font-bold tracking-wide text-accent-600">EMPLOYEE EXPERIENCE</span>
          <h2 className="mt-3 text-[2.1rem] font-extrabold leading-tight tracking-tight text-navy-900 sm:text-4xl">
            Put employees at the center of HR.
          </h2>
          <p className="mt-5 text-[15.5px] leading-relaxed text-slate-500">
            Give employees a simple, transparent way to access their information,
            attendance, leave, payroll, and performance data — without filing a request
            or waiting on HR.
          </p>
          <motion.a
            href="#product"
            whileHover={{ x: 4 }}
            className="mt-7 inline-flex items-center gap-2 text-[15px] font-semibold text-accent-600"
          >
            Explore Employee Experience
            <ArrowRight size={16} />
          </motion.a>
        </motion.div>
      </div>
    </section>
  )
}
