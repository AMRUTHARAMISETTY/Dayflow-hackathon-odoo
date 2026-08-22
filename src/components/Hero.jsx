import { motion } from 'framer-motion'
import { ArrowRight, Sparkles } from 'lucide-react'
import DashboardPreview from './DashboardPreview'
import CountUp from './CountUp'

export default function Hero() {
  return (
    <section
      id="home"
      className="relative overflow-hidden bg-gradient-to-b from-[#f4f7ff] via-white to-white pb-24 pt-40 sm:pb-28 sm:pt-44"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-grid-slate [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_10%,transparent_70%)]"
      />
      <motion.div
        aria-hidden
        animate={{ opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-gradient-to-br from-accent-400/20 via-violet-400/15 to-transparent blur-3xl"
      />

      <div className="container-shell relative grid items-center gap-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
        <div>
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-accent-200 bg-accent-50 px-3.5 py-1.5 text-[12.5px] font-semibold text-accent-700"
          >
            <Sparkles size={13} />
            Built for modern teams
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 text-[2.6rem] font-extrabold leading-[1.08] tracking-tight text-navy-900 sm:text-[3.25rem] lg:text-[3.5rem]"
          >
            Your People. Your Process.
            <br />
            <span className="bg-gradient-to-r from-accent-600 to-violet-600 bg-clip-text text-transparent">
              One Powerful HR Platform.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 max-w-xl text-[17px] leading-relaxed text-slate-600"
          >
            Dayflow brings recruitment, employee management, attendance, leave, payroll,
            and performance together in one simple platform — so HR can spend less time
            on process and more time on people.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.36 }}
            className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <motion.a
              href="#home"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="group inline-flex items-center justify-center gap-2 rounded-xl bg-navy-900 px-6 py-3.5 text-[15px] font-semibold text-white shadow-[0_16px_35px_-10px_rgba(11,17,32,0.55)] transition-shadow hover:shadow-[0_20px_40px_-8px_rgba(11,17,32,0.65)]"
            >
              Get Started Free
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </motion.a>
            <motion.a
              href="#features"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-[15px] font-semibold text-slate-700 transition-colors hover:border-slate-400"
            >
              Explore Features
            </motion.a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.5 }}
            className="mt-14 flex flex-wrap gap-x-10 gap-y-6"
          >
            {[
              { value: 1200, suffix: '+', label: 'Companies onboarded' },
              { value: 99.9, decimals: 1, suffix: '%', label: 'Platform uptime' },
              { value: 24, suffix: '/7', label: 'HR access, anywhere' },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl font-bold text-navy-900">
                  <CountUp value={stat.value} suffix={stat.suffix} decimals={stat.decimals || 0} />
                </p>
                <p className="mt-1 text-[13px] text-slate-500">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>

        <DashboardPreview />
      </div>
    </section>
  )
}
