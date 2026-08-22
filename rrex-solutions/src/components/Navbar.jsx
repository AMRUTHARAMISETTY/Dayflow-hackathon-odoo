import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link, NavLink } from 'react-router-dom'
import { Menu, X } from 'lucide-react'

export default function Navbar({ links = [] }) {
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
          ? 'border-b border-amber-500/15 bg-obsidian-900/80 shadow-[0_4px_30px_-10px_rgba(0,0,0,0.6)] backdrop-blur-xl'
          : 'border-b border-transparent bg-transparent'
      }`}
    >
      <nav className="container-shell flex h-[72px] items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-amber-500/40 bg-obsidian-800 font-display text-sm font-bold text-amber-400 shadow-amberGlow">
            R
          </span>
          <span className="font-display text-[18px] font-bold tracking-tight text-bone-500">
            R-REX <span className="text-amber-400">Solutions</span>
          </span>
        </Link>

        <ul className="hidden items-center gap-1 md:flex">
          {links.map((link, i) => (
            <motion.li
              key={link.href}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 + i * 0.06 }}
            >
              <a
                href={link.href}
                className="group relative px-4 py-2 text-[14px] font-medium text-bone-500/70 transition-colors hover:text-bone-500"
              >
                {link.label}
                <span className="absolute inset-x-4 -bottom-0.5 h-px origin-left scale-x-0 bg-amber-500 transition-transform duration-300 group-hover:scale-x-100" />
              </a>
            </motion.li>
          ))}
          <li>
            <NavLink
              to="/solutions"
              className={({ isActive }) =>
                `px-4 py-2 text-[14px] font-medium transition-colors ${
                  isActive ? 'text-amber-400' : 'text-bone-500/70 hover:text-bone-500'
                }`
              }
            >
              Portfolio
            </NavLink>
          </li>
        </ul>

        <motion.a
          href="#contact"
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, delay: 0.35 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="claw-btn hidden items-center justify-center rounded-lg border border-amber-500/50 bg-amber-500/10 px-5 py-2.5 text-[14px] font-semibold text-amber-300 transition-colors hover:bg-amber-500/20 md:inline-flex"
        >
          <span>Talk to Us</span>
        </motion.a>

        <button
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-bone-500 md:hidden"
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
            className="overflow-hidden border-t border-amber-500/10 bg-obsidian-900/95 backdrop-blur-xl md:hidden"
          >
            <motion.ul
              className="container-shell flex flex-col gap-1 py-4"
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.06 } } }}
            >
              {links.map((link) => (
                <motion.li key={link.href} variants={{ hidden: { opacity: 0, x: -12 }, show: { opacity: 1, x: 0 } }}>
                  <a
                    href={link.href}
                    onClick={closeMobile}
                    className="block rounded-lg px-3 py-3 text-[15px] font-medium text-bone-500/80 hover:bg-obsidian-800 hover:text-bone-500"
                  >
                    {link.label}
                  </a>
                </motion.li>
              ))}
              <motion.li variants={{ hidden: { opacity: 0, x: -12 }, show: { opacity: 1, x: 0 } }}>
                <Link
                  to="/solutions"
                  onClick={closeMobile}
                  className="block rounded-lg px-3 py-3 text-[15px] font-medium text-bone-500/80 hover:bg-obsidian-800 hover:text-bone-500"
                >
                  Portfolio
                </Link>
              </motion.li>
              <motion.li
                variants={{ hidden: { opacity: 0, x: -12 }, show: { opacity: 1, x: 0 } }}
                className="mt-2 border-t border-obsidian-700 pt-4"
              >
                <a
                  href="#contact"
                  onClick={closeMobile}
                  className="block rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-3 text-center text-[15px] font-semibold text-amber-300"
                >
                  Talk to Us
                </a>
              </motion.li>
            </motion.ul>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
