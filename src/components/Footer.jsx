const COLUMNS = [
  {
    title: 'Product',
    links: ['Features', 'How It Works', 'Employee Experience', 'Analytics'],
  },
  {
    title: 'Company',
    links: ['About', 'Careers', 'Contact', 'Blog'],
  },
  {
    title: 'Resources',
    links: ['Help Center', 'Documentation', 'Security', 'Privacy'],
  },
]

export default function Footer() {
  return (
    <footer className="bg-navy-950 pt-16 text-slate-400">
      <div className="container-shell grid grid-cols-2 gap-10 pb-14 sm:grid-cols-4">
        <div className="col-span-2 sm:col-span-1">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-gradient-to-br from-accent-500 to-violet-500 text-sm font-bold text-white">
              D
            </span>
            <span className="text-[18px] font-bold text-white">Dayflow</span>
          </div>
          <p className="mt-4 max-w-[220px] text-[13.5px] leading-relaxed">
            Simplify HR. Empower people. Grow together.
          </p>
        </div>

        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h4 className="text-[13px] font-semibold text-white">{col.title}</h4>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((link) => (
                <li key={link}>
                  <a href="#" className="text-[13.5px] transition-colors hover:text-white">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-white/10">
        <div className="container-shell flex flex-col items-center justify-between gap-3 py-6 text-[12.5px] sm:flex-row">
          <p>© 2026 Dayflow. All rights reserved.</p>
          <div className="flex gap-5">
            {['LinkedIn', 'Twitter/X', 'Instagram'].map((s) => (
              <a key={s} href="#" className="transition-colors hover:text-white">
                {s}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
