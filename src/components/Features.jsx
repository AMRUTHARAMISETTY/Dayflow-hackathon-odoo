import { motion } from 'framer-motion'
import { BarChart3, CalendarClock, DollarSign, Target, UserSearch, Users } from 'lucide-react'
import FeatureCard from './FeatureCard'
import Reveal from './Reveal'
import { staggerContainer, viewportOnce } from '../animations/variants'

const FEATURES = [
  {
    icon: UserSearch,
    title: 'Recruitment & Hiring',
    description: 'Run your entire hiring pipeline without switching tools.',
    points: ['Job openings', 'Resume review', 'Interviews & offers'],
  },
  {
    icon: Users,
    title: 'Employee Management',
    description: 'A single source of truth for every employee record.',
    points: ['Profiles & IDs', 'Departments & managers', 'Documents'],
  },
  {
    icon: CalendarClock,
    title: 'Attendance & Leave',
    description: 'Effortless check-ins and leave approvals in real time.',
    points: ['Check-in / check-out', 'Overtime tracking', 'Leave approvals'],
  },
  {
    icon: DollarSign,
    title: 'Payroll',
    description: 'Accurate, on-time payroll without the spreadsheets.',
    points: ['Salary management', 'Payslips', 'Deductions'],
  },
  {
    icon: Target,
    title: 'Performance',
    description: 'Keep goals, reviews, and feedback in one thread.',
    points: ['Goal tracking', 'Reviews', 'Continuous feedback'],
  },
  {
    icon: BarChart3,
    title: 'HR Analytics',
    description: 'Turn workforce data into decisions leadership trusts.',
    points: ['Workforce insights', 'Hiring metrics', 'Payroll reports'],
  },
]

export default function Features() {
  return (
    <section id="features" className="bg-white py-24 sm:py-28">
      <div className="container-shell">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-[13px] font-bold tracking-wide text-accent-600">FEATURES</span>
          <h2 className="mt-3 text-[2.1rem] font-extrabold tracking-tight text-navy-900 sm:text-4xl">
            Everything HR needs. In one place.
          </h2>
          <p className="mt-4 text-[15.5px] leading-relaxed text-slate-500">
            From the first interview to the last payslip, Dayflow keeps every HR workflow
            connected, transparent, and easy to manage.
          </p>
        </Reveal>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          variants={staggerContainer(0.1)}
          className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {FEATURES.map((feature, i) => (
            <FeatureCard key={feature.title} index={i} {...feature} />
          ))}
        </motion.div>
      </div>
    </section>
  )
}
