'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: '◈' },
  { href: '/positions', label: 'Pozycje', icon: '◎' },
  { href: '/dividends', label: 'Dywidendy', icon: '◇' },
  { href: '/transactions', label: 'Transakcje', icon: '⇅' },
  { href: '/import', label: 'Import XTB', icon: '↑' },
]

export function Sidebar() {
  const path = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 flex flex-col"
      style={{ background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)' }}>

      {/* Logo */}
      <div className="px-6 py-6 mb-2">
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--accent)', letterSpacing: '-0.02em' }}>
          PORTFOLIO
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.15em', marginTop: 2 }}>
          TRACKER
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3">
        {nav.map(item => {
          const active = path.startsWith(item.href)
          return (
            <Link key={item.href} href={item.href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-all duration-150',
                active
                  ? 'text-[var(--accent)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
              )}
              style={active ? { background: 'var(--accent-muted)' } : {}}
            >
              <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{item.icon}</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 500, letterSpacing: '0.01em' }}>
                {item.label}
              </span>
              {active && (
                <span className="ml-auto w-1 h-1 rounded-full" style={{ background: 'var(--accent)' }} />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4" style={{ borderTop: '1px solid var(--border)' }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          XTB · NBP · yfinance
        </div>
      </div>
    </aside>
  )
}
