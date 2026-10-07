import { useEffect, useState } from 'react'
import { api, type CoinflipResult, type WalletSummary } from '../api/client'

export default function Coinflip() {
  const [wallet, setWallet] = useState<WalletSummary | null>(null)
  const [wager, setWager] = useState('100')
  const [choice, setChoice] = useState<'heads' | 'tails'>('heads')
  const [result, setResult] = useState<CoinflipResult | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [walletError, setWalletError] = useState('')

  const refresh = () => api.wallet.getSummary().then((summary) => {
    setWallet(summary)
    setWalletError('')
    window.dispatchEvent(new Event('wallet-updated'))
  }).catch((e: unknown) => {
    setWalletError(e instanceof Error ? e.message : 'Could not load local wallet')
  })
  useEffect(() => { void refresh() }, [])

  async function play(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setResult(null)
    try {
      const opId = `coinflip_${crypto.randomUUID().replaceAll('-', '')}`
      const settled = await api.games.coinflip(Number(wager), choice, opId)
      setResult(settled)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not settle this round')
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="game-page">
      <p className="eyebrow">SERVER SETTLED · LOCAL DEMO</p>
      <h1>Coinflip</h1>
      <p className="lede">Choose a side. The local server selects the result and settles the wager in its SQLite ledger.</p>
      <div className="card game-panel">
        <div className="coin-stage" aria-live="polite">
          <div className={`coin ${result ? 'landed' : ''}`}>{result ? (result.outcome === 'heads' ? 'H' : 'T') : '✦'}</div>
          <div>
            <span className="small">LOCAL DEMO BALANCE</span>
            <p className="big">🪙 {wallet ? wallet.balance.toLocaleString() : '…'}</p>
          </div>
        </div>
        <form onSubmit={play}>
          <label>Wager (1–10,000 server coins)
            <input aria-label="Wager" type="number" min="1" max="10000" step="1" required value={wager} onChange={(e) => setWager(e.target.value)} />
          </label>
          <fieldset className="choice-group">
            <legend>Choose a side</legend>
            {(['heads', 'tails'] as const).map((side) => (
              <button type="button" key={side} className={`button choice ${choice === side ? 'selected' : ''}`} aria-pressed={choice === side} onClick={() => setChoice(side)}>
                {side === 'heads' ? '🪙' : '🌙'} {side.toUpperCase()}
              </button>
            ))}
          </fieldset>
          <p className="small">Win payout: 1.95× wager, rounded down. Loss: wager is debited. Result and payout are server controlled.</p>
          <button className="button primary play-button" disabled={busy || !wallet}>{busy ? 'Settling…' : 'Flip coin'}</button>
        </form>
        {walletError && <p role="alert" className="error-message">Could not load wallet: {walletError}. Start the local API and retry.</p>}
        {error && <p role="alert" className="error-message">{error}</p>}
        {result && <div className={`result-box ${result.outcome === choice ? 'win' : 'loss'}`} role="status">
          <strong>{result.outcome.toUpperCase()} — {result.outcome === choice ? `You won ${result.payout.toLocaleString()} coins` : 'No payout this round'}</strong>
          <span>Wager {result.wager.toLocaleString()} · New balance {result.balance.toLocaleString()}</span>
          <small>Round {result.gameId.slice(0, 8)}{result.replay ? ' · repeated request' : ''}</small>
        </div>}
      </div>
    </section>
  )
}
