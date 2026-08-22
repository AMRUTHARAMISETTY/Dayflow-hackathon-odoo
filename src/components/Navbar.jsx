import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu, X } from 'lucide-react'

const NAV_LINKS = [
  { label: 'Home', href: '#home' },
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Product', href: '#product' },
  { label: 'Testimonials', href: '#testimonials' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  const closeMobile = () => setMobileOpen(false)

  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'border-b border-slate-200/80 bg-white/80 shadow-[0_4px_30px_-10px_rgba(15,23,42,0.15)] backdrop-blur-lg'
          : 'border-b border-transparent bg-transparent'
      }`}
    >
      <nav className="container-shell flex h-[72px] items-center justify-between">
        <motion.a
          href="#home"
          className="flex items-center gap-2.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-gradient-to-br from-accent-500 to-violet-500 text-sm font-bold text-white shadow-glow">
            D
          </span>
          <span className="text-[19px] font-bold tracking-tight text-navy-900">Dayflow</span>
        </motion.a>

        <ul className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link, i) => (
            <motion.li
              key={link.href}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 + i * 0.06 }}
            >
              <a
                href={link.href}
                className="group relative px-4 py-2 text-[14.5px] font-medium text-slate-600 transition-colors hover:text-navy-900"
              >
                {link.label}
                <span className="absolute inset-x-4 -bottom-0.5 h-px origin-left scale-x-0 bg-accent-500 transition-transform duration-300 group-hover:scale-x-100" />
              </a>
            </motion.li>
          ))}
        </ul>

        <motion.div
          className="hidden items-center gap-3 md:flex"
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, delay: 0.35 }}
        >
          <a
            href="#home"
            className="px-4 py-2 text-[14.5px] font-medium text-slate-600 transition-colors hover:text-navy-900"
          >
            Sign In
          </a>
          <motion.a
            href="#home"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="rounded-lg bg-navy-900 px-5 py-2.5 text-[14.5px] font-semibold text-white shadow-[0_10px_25px_-8px_rgba(11,17,32,0.5)] transition-shadow hover:shadow-[0_14px_30px_-8px_rgba(11,17,32,0.6)]"
          >
            Get Started
          </motion.a>
        </motion.div>

        <button
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-navy-900 md:hidden"
        >
          <AnimatePresence mode="wait" initial={false}>
            {mobileOpen ? (
              <motion.span key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                <X size={22} />
              </motion.span>
            ) : (
              <motion.span key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
                <Menu size={22} />
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-slate-200 bg-white/95 backdrop-blur-lg md:hidden"
          >
            <motion.ul
              className="container-shell flex flex-col gap-1 py-4"
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.06 } } }}
            >
              {NAV_LINKS.map((link) => (
                <motion.li key={link.href} variants={{ hidden: { opacity: 0, x: -12 }, show: { opacity: 1, x: 0 } }}>
                  <a
                    href={link.href}
                    onClick={closeMobile}
                    className="block rounded-lg px-3 py-3 text-[15px] font-medium text-slate-700 hover:bg-slate-50 hover:text-navy-900"
                  >
                    {link.label}
                  </a>
                </motion.li>
              ))}
              <motion.li
                variants={{ hidden: { opacity: 0, x: -12 }, show: { opacity: 1, x: 0 } }}
                className="mt-2 flex flex-col gap-2 border-t border-slate-100 pt-4"
              >
                <a
                  href="#home"
                  onClick={closeMobile}
                  className="rounded-lg px-3 py-3 text-center text-[15px] font-medium text-slate-700 hover:bg-slate-50"
                >
                  Sign In
                </a>
                <a
                  href="#home"
                  onClick={closeMobile}
                  className="rounded-lg bg-navy-900 px-3 py-3 text-center text-[15px] font-semibold text-white"
                >
                  Get Started
                </a>
              </motion.li>
            </motion.ul>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
