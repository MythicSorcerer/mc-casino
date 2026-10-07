import { NavLink, Link, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { api } from '../api/client'

const navigation = [
  { to: '/dashboard', label: 'Overview', icon: '01' },
  { to: '/games', label: 'Game hall', icon: '02' },
  { to: '/wallet', label: 'Wallet', icon: '03' },
  { to: '/history', label: 'Ledger', icon: '04' },
]

export default function Layout() {
  const [balance, setBalance] = useState<number | null>(null)
  const location = useLocation()

  useEffect(() => {
    let cancelled = false
    const refresh = () => api.wallet.getSummary().then((s) => {
      if (!cancelled) setBalance(s.balance)
    }).catch(() => { if (!cancelled) setBalance(null) })
    const onUpdated = () => { void refresh() }
    void refresh()
    window.addEventListener('wallet-updated', onUpdated)
    return () => {
      cancelled = true
      window.removeEventListener('wallet-updated', onUpdated)
    }
  }, [])

  return (
    <div className="app-shell">
      <aside className="rail">
        <Link to="/" className="brand-lockup" aria-label="Mythic's Casino home">
          <span className="brand-mark">M</span>
          <span className="brand-name">MYTHIC'S<span>CASINO</span></span>
        </Link>
        <div className="rail-rule" />
        <p className="rail-label">YOUR ROOM</p>
        <nav className="side-nav" aria-label="Main navigation">
          {navigation.map((item) => <NavLink key={item.to} to={item.to} className={({ isActive }) => `side-link${isActive ? ' active' : ''}`}>
            <span className="nav-index">{item.icon}</span><span>{item.label}</span><span className="nav-arrow">↗</span>
          </NavLink>)}
        </nav>
        <div className="rail-bottom">
          <span className="online-dot" /> <span>LOCAL TABLE OPEN</span>
          <small>Demo environment · build 0.1</small>
        </div>
      </aside>
      <div className="main-column">
        <div className="demo-banner"><span>DEMO ENVIRONMENT</span><span>Single local account · Seed balance only · No deposits or withdrawals</span></div>
        <header className="topbar">
          <div className="breadcrumb"><span>MYTHIC'S CASINO</span><b>/</b><strong>{location.pathname === '/' ? 'WELCOME' : location.pathname.split('/').filter(Boolean).join(' / ').toUpperCase()}</strong></div>
          <div className="topbar-actions">
            <Link to="/login" className="profile-link"><span className="avatar">D</span><span>DemoPlayer<small>LOCAL PLAYER</small></span></Link>
            <div className="balance-chip"><span className="coin-glyph">◉</span><span>{balance === null ? '—' : balance.toLocaleString()}</span><small>COINS</small></div>
          </div>
        </header>
        <main className="content"><Outlet /></main>
        <footer className="footer"><span>MYTHIC'S CASINO</span><span>Local demo ledger · External account and payment links are not configured.</span></footer>
      </div>
    </div>
  )
}
