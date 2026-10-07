import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type WalletSummary } from '../api/client'

export default function Wallet() {
  const [wallet, setWallet] = useState<WalletSummary | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.wallet.getSummary().then(setWallet).catch(() => setError('Could not load wallet. Start the local API and refresh.'))
  }, [])

  return (
    <section>
      <div className="page-heading"><div><p className="eyebrow">ACCOUNT / FUNDS</p><h1>Wallet</h1><p>A read-only view of the local demo ledger.</p></div></div>
      <div className="card warning"><strong>DEMO BALANCE ONLY.</strong> This seeded amount is local test data, not real funds or Minecraft currency. Deposits and withdrawals are disabled.</div>
      {error && <p role="alert" className="error-message">{error}</p>}
      <div className="wallet-layout">
        <div className="wallet-balance"><p className="section-kicker">CURRENT BALANCE</p><p className="big">{wallet ? wallet.balance.toLocaleString() : '—'}</p><span className="unit">{wallet?.currency ?? 'SERVER-COINS'} · LOCAL SEED</span></div>
        <div className="wallet-side"><div className="wallet-symbol">↔</div><p className="section-kicker">MOVEMENT IS OFFLINE</p><h2>Transfers are not connected.</h2><p>The demo server can record game wagers and payouts. It cannot deposit or withdraw Minecraft currency.</p><Link className="button" to="/history">Review ledger entries ↗</Link></div>
      </div>
    </section>
  )
}
