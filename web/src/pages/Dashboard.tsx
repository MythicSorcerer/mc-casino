import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type WalletSummary } from '../api/client'

export default function Dashboard() {
  const [wallet, setWallet] = useState<WalletSummary | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.wallet.getSummary().then(setWallet).catch(() => setError('Could not load the local demo API. Start the server and refresh.'))
  }, [])

  return (
    <section>
      <div className="page-heading"><div><p className="eyebrow">PLAYER ROOM / 01</p><h1>Your room</h1><p>A quick read on the local demo ledger and the games currently on the floor.</p></div></div>
      {error && <p role="alert" className="error-message">{error}</p>}
      <div className="dashboard-hero">
        <div className="welcome-panel">
          <p className="section-kicker">WELCOME BACK, DEMOPLAYER</p>
          <h1>Five games.<br />One local ledger.</h1>
          <p className="small">Coinflip, roulette, crash, crossing, and a manual lottery draw settle against this persistent local demo balance.</p>
          <div className="dashboard-actions"><Link className="button primary" to="/games">Visit the game hall ↗</Link><Link className="button" to="/history">Open ledger</Link></div>
        </div>
        <div className="balance-panel"><p className="section-kicker">AVAILABLE DEMO BALANCE</p><p className="big">{wallet ? wallet.balance.toLocaleString() : '—'}</p><p className="small">server-coins · seeded locally<br />Not backed by Minecraft currency.</p></div>
      </div>
      <div className="stat-grid">
        <div className="card"><span className="stat-label">Environment</span><p className="stat-value">Local demo</p><p className="small">One shared account, no sign-in.</p></div>
        <div className="card"><span className="stat-label">Demo tables</span><p className="stat-value">Five available</p><p className="small">All game decisions settle on the local server.</p></div>
        <div className="card"><span className="stat-label">Transfers</span><p className="stat-value">Unavailable</p><p className="small">Deposits and withdrawals are not configured.</p></div>
      </div>
    </section>
  )
}
