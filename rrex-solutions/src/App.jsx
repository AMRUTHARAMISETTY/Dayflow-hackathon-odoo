import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import Home from './pages/Home'
import Solutions from './pages/Solutions'
import ScrollToTop from './components/ScrollToTop'

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/solutions" element={<Solutions />} />
        </Routes>
      </BrowserRouter>
    </MotionConfig>
  )
}
