import Navbar from '../components/Navbar'
import SolutionsHero from '../components/SolutionsHero'
import SolutionsGrid from '../components/SolutionsGrid'
import CapabilitiesSection from '../components/CapabilitiesSection'
import ContactSection from '../components/ContactSection'
import Footer from '../components/Footer'

const LINKS = [
  { label: 'Solutions', href: '#solutions' },
  { label: 'Capabilities', href: '#capabilities' },
  { label: 'Contact', href: '#contact' },
]

export default function Solutions() {
  return (
    <div className="overflow-x-hidden">
      <Navbar links={LINKS} />
      <main>
        <SolutionsHero />
        <SolutionsGrid />
        <CapabilitiesSection />
        <ContactSection />
      </main>
      <Footer />
    </div>
  )
}
