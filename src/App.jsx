import { MotionConfig } from 'framer-motion'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import SocialProof from './components/SocialProof'
import Features from './components/Features'
import HowItWorks from './components/HowItWorks'
import ProductPreview from './components/ProductPreview'
import EmployeeExperience from './components/EmployeeExperience'
import Analytics from './components/Analytics'
import Testimonials from './components/Testimonials'
import CTA from './components/CTA'
import Footer from './components/Footer'

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="overflow-x-hidden">
        <Navbar />
        <main>
          <Hero />
          <SocialProof />
          <Features />
          <HowItWorks />
          <ProductPreview />
          <EmployeeExperience />
          <Analytics />
          <Testimonials />
          <CTA />
        </main>
        <Footer />
      </div>
    </MotionConfig>
  )
}
