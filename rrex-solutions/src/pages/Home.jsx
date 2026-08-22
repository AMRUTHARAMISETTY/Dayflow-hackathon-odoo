import Navbar from '../components/Navbar'
import HomeHero from '../components/HomeHero'
import ServicesSection from '../components/ServicesSection'
import WhyRRex from '../components/WhyRRex'
import PlateDivider from '../components/PlateDivider'
import CTASection from '../components/CTASection'
import Footer from '../components/Footer'

const LINKS = [
  { label: 'Home', href: '#home' },
  { label: 'Services', href: '#services' },
  { label: 'Why R-REX', href: '#why-rrex' },
]

export default function Home() {
  return (
    <div className="overflow-x-hidden">
      <Navbar links={LINKS} />
      <main>
        <HomeHero />
        <PlateDivider />
        <ServicesSection />
        <PlateDivider />
        <WhyRRex />
        <PlateDivider />
        <CTASection />
      </main>
      <Footer />
    </div>
  )
}
