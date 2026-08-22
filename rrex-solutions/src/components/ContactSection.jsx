import Reveal from './Reveal'
import ContactForm from './ContactForm'
import { slideLeft, slideRight } from '../animations/variants'

export default function ContactSection() {
  return (
    <section id="contact" className="relative overflow-hidden bg-obsidian-900 py-24 sm:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-strata-grid [mask-image:radial-gradient(ellipse_60%_60%_at_50%_40%,#000_10%,transparent_75%)]"
      />
      <div className="container-shell relative grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
        <Reveal variants={slideLeft}>
          <span className="text-[13px] font-bold tracking-[0.14em] text-amber-400">CONTACT</span>
          <h2 className="mt-3 font-display text-[2.1rem] font-bold leading-tight tracking-tight text-bone-500 sm:text-4xl">
            Let's excavate your next system.
          </h2>
          <p className="mt-5 text-[15.5px] leading-relaxed text-bone-500/60">
            Tell us what you're building. We'll come back with a plan built to outlast the
            usual software lifecycle.
          </p>
        </Reveal>

        <Reveal variants={slideRight} delay={0.1}>
          <ContactForm />
        </Reveal>
      </div>
    </section>
  )
}
