import { useState } from "react"
import { Link } from "react-router-dom"
import { Menu, X } from "lucide-react"
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion"

const links = [
  { label: "Home", href: "#home" },
  { label: "Products", href: "#products" },
  { label: "Resources", href: "#resources" },
  { label: "Support", href: "#support" },
  { label: "Contacts", href: "#contacts" },
]

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const reducedMotion = useReducedMotion()
  const { scrollYProgress } = useScroll()
  const videoY = useTransform(scrollYProgress, [0, 0.24], [0, reducedMotion ? 0 : 110])
  const videoScale = useTransform(scrollYProgress, [0, 0.24], [1, reducedMotion ? 1 : 1.08])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.18], [1, reducedMotion ? 1 : 0.12])
  const reveal = { initial: { opacity: 0, y: reducedMotion ? 0 : 54 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.22 }, transition: { duration: reducedMotion ? 0 : 0.75, ease: [0.22, 1, 0.36, 1] as const } }

  function goTo(href: string) {
    setMenuOpen(false)
    document.querySelector(href)?.scrollIntoView({ behavior: "auto", block: href === "#contacts" ? "end" : "start" })
  }

  return (
    <main className="landing-page">
      <section id="home" className="landing-hero">
        <motion.video className="landing-video" style={{ y: videoY, scale: videoScale }} autoPlay loop muted playsInline preload="auto" aria-label="Dayflow cinematic workplace animation">
          <source src="/dayflow-hr-futuristic.mp4" type="video/mp4" />
        </motion.video>
        <div className="landing-shade" />

        <div className="landing-header-mask" aria-hidden="true" />
        <header className="landing-header">
          <Link className="landing-logo" to="/" aria-label="Dayflow HR home">
            <span className="landing-logo-mark"><i /><i /></span>
            <strong>Dayflow HR</strong>
          </Link>

          <nav className={menuOpen ? "landing-nav is-open" : "landing-nav"} aria-label="Main navigation">
            {links.map((item) => <button key={item.href} className={item.href === "#home" ? "is-active" : ""} onClick={() => goTo(item.href)}>{item.label}</button>)}
          </nav>

          <div className="landing-actions">
            <Link className="landing-login" to="/sign-in">Log In</Link>
            <Link className="landing-app-cta" to="/sign-in">Sign in App</Link>
          </div>
          <button className="landing-menu-button" type="button" onClick={() => setMenuOpen((value) => !value)} aria-label={menuOpen ? "Close menu" : "Open menu"}>{menuOpen ? <X /> : <Menu />}</button>
        </header>

        <motion.div className="landing-hero-copy" style={{ opacity: heroOpacity }}>
          <p>Human resources, beautifully aligned.</p>
          <h1>Every workday,<br />perfectly aligned.</h1>
          <div><Link to="/sign-in">Enter your workspace</Link><button onClick={() => goTo("#products")}>Explore Dayflow</button></div>
        </motion.div>

      </section>

      <motion.section id="products" className="landing-section landing-products" {...reveal}>
        <div className="landing-ambient landing-ambient-one" aria-hidden="true" />
        <p className="landing-kicker">One connected platform</p>
        <h2>Everything your people need to move work forward.</h2>
        <div className="landing-card-grid">
          {[{n:"01",title:"Time & attendance",copy:"Accurate check-ins, live attendance, and clear correction workflows.",cta:"Open attendance →"},{n:"02",title:"Leave management",copy:"Thoughtful requests, faster approvals, and team coverage at a glance.",cta:"Manage leave →"},{n:"03",title:"Payroll clarity",copy:"Protected payslips and explanations employees can actually understand.",cta:"View payroll →"}].map((card,index)=><motion.article key={card.n} initial={{opacity:0,y:reducedMotion?0:38}} whileInView={{opacity:1,y:0}} viewport={{once:true,amount:.3}} transition={{duration:reducedMotion?0:.65,delay:reducedMotion?0:index*.12}} whileHover={reducedMotion?undefined:{y:-8,borderColor:"#b37a3c"}}><span>{card.n}</span><h3>{card.title}</h3><p>{card.copy}</p><Link to="/sign-in">{card.cta}</Link></motion.article>)}
        </div>
      </motion.section>

      <motion.section id="resources" className="landing-split landing-section" {...reveal}>
        <div><p className="landing-kicker">Built for trust</p><h2>Enterprise security without enterprise friction.</h2></div>
        <motion.div initial={{opacity:0,x:reducedMotion?0:45}} whileInView={{opacity:1,x:0}} viewport={{once:true,amount:.45}} transition={{duration:reducedMotion?0:.75,delay:.12}}><p>Role-based access, passkeys, device biometrics, rotating sessions, and complete security visibility are built into every Dayflow experience.</p><Link to="/activate">Activate employee account</Link></motion.div>
      </motion.section>

      <motion.section id="support" className="landing-support landing-section" {...reveal}>
        <div className="landing-ambient landing-ambient-two" aria-hidden="true" />
        <p className="landing-kicker">We’re here when work gets complicated</p><h2>Get help from the Dayflow team.</h2><Link to="/support">Visit help and support</Link>
      </motion.section>

      <motion.footer id="contacts" className="landing-footer" initial={{opacity:0}} whileInView={{opacity:1}} viewport={{once:true,amount:.5}} transition={{duration:reducedMotion?0:.65}}>
        <div className="landing-logo"><span className="landing-logo-mark"><i /><i /></span><strong>Dayflow HR</strong></div>
        <div className="landing-team" aria-label="Dayflow team">
          <span>Amrutha Ramisetty</span>
          <span>Dheeraj Rangu</span>
          <span>Savya Reddy</span>
          <span>Likith Sankarnarayana</span>
        </div>
        <p>© {new Date().getFullYear()} Dayflow HR</p>
      </motion.footer>
    </main>
  )
}
