import { Link } from 'react-router-dom'

const COLUMNS = [
  {
    title: 'Company',
    links: ['Home', 'Portfolio', 'Careers', 'Contact'],
  },
  {
    title: 'Solutions',
    links: ['Core Platform', 'Security Layer', 'Integrations', 'Analytics'],
  },
]

export default function Footer() {
  return (
    <footer className="border-t border-obsidian-700 bg-obsidian-950 pt-16 text-bone-500/50">
      <div className="container-shell grid grid-cols-2 gap-10 pb-14 sm:grid-cols-4">
        <div className="col-span-2 sm:col-span-2">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-amber-500/40 bg-obsidian-800 font-display text-sm font-bold text-amber-400">
              R
            </span>
            <span className="font-display text-[17px] font-bold text-bone-500">R-REX Solutions</span>
          </Link>
          <p className="mt-4 max-w-[260px] text-[13.5px] leading-relaxed">
            Software with prehistoric power. Fossil-deep foundations, precision engineering.
          </p>
        </div>

        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h4 className="text-[13px] font-semibold text-bone-500">{col.title}</h4>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((link) => (
                <li key={link}>
                  <a href="#" className="text-[13.5px] transition-colors hover:text-amber-400">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-obsidian-700">
        <div className="container-shell flex flex-col items-center justify-between gap-3 py-6 text-[12.5px] sm:flex-row">
          <p>© 2026 R-REX Solutions. All rights reserved.</p>
          <div className="flex gap-5">
            {['LinkedIn', 'GitHub', 'X'].map((s) => (
              <a key={s} href="#" className="transition-colors hover:text-amber-400">
                {s}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
