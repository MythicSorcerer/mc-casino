import { useState } from 'react'
import { api, type RouletteResult } from '../api/client'
import { useWallet } from '../hooks/useWallet'

type BetType = RouletteResult['betType']
const numberColor = (n: number) => n === 0 ? 'green' : [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36].includes(n) ? 'red' : 'black'

export default function Roulette() {
  const wallet = useWallet()
  const [wager, setWager] = useState('100')
  const [betType, setBetType] = useState<BetType>('color')
  const [betValue, setBetValue] = useState<string | number>('red')
  const [result, setResult] = useState<RouletteResult | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function changeType(type: BetType) {
    setBetType(type)
    setBetValue(type === 'color' ? 'red' : type === 'range' ? 'low' : 17)
  }

  async function spin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true); setError(''); setResult(null)
    try {
      const settled = await api.games.roulette(Number(wager), betType, betValue, `roulette_${crypto.randomUUID().replaceAll('-', '')}`)
      setResult(settled)
      await wallet.refresh()
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not settle this spin') }
    finally { setBusy(false) }
  }

  const landedColor = result?.outcome ?? null
  return (
    <section className="play-page roulette-page">
      <header className="play-heading"><p className="eyebrow">01 / EUROPEAN WHEEL</p><h1>Roulette</h1><p>37 pockets. Every spin is resolved by the server.</p></header>
      <div className="game-columns">
        <div className="card wheel-card">
          <div className="wheel-orbit"><div className="wheel-core"><span>MYTHIC'S</span><b>{result ? result.outcomeNumber : '00'}</b><small>{landedColor ?? 'READY'}</small></div></div>
          <div className="number-strip" aria-label="European roulette wheel numbers">
            {Array.from({ length: 37 }, (_, i) => <span key={i} className={`pocket ${numberColor(i)} ${result?.outcomeNumber === i ? 'landed' : ''}`}>{i}</span>)}
          </div>
          {result && <div className="settlement-note" role="status"><strong>{result.payout ? `+${result.payout.toLocaleString()}` : 'No payout'}</strong><span>Ball landed on {result.outcomeNumber} · {result.outcome}</span></div>}
        </div>
        <form className="card bet-card" onSubmit={spin}>
          <div className="balance-row"><span>DEMO BALANCE</span><strong>◈ {wallet.balance?.toLocaleString() ?? '—'}</strong></div>
          <label>Stake<input type="number" min="1" max="10000" step="1" value={wager} onChange={(e) => setWager(e.target.value)} required /></label>
          <fieldset className="bet-type-select"><legend>Bet type</legend>
            {(['color', 'number', 'range'] as const).map((type) => <button key={type} type="button" aria-pressed={betType === type} className={betType === type ? 'selected' : ''} onClick={() => changeType(type)}>{type}</button>)}
          </fieldset>
          <label>Selection
            {betType === 'color' ? <select value={betValue} onChange={(e) => setBetValue(e.target.value)}><option value="red">Red</option><option value="black">Black</option><option value="green">Green / 0</option></select>
              : betType === 'range' ? <select value={betValue} onChange={(e) => setBetValue(e.target.value)}><option value="low">1–18</option><option value="high">19–36</option></select>
                : <select value={betValue} onChange={(e) => setBetValue(Number(e.target.value))}>{Array.from({ length: 37 }, (_, n) => <option key={n} value={n}>{n} · {numberColor(n)}</option>)}</select>}
          </label>
          <p className="payout-hint">{betType === 'number' ? '36× total return on a hit' : betType === 'color' && betValue === 'green' ? '36× total return on zero' : '2× total return on a hit'}</p>
          {error && <p className="error-message" role="alert">{error}</p>}
          {wallet.error && <p className="error-message" role="alert">{wallet.error}</p>}
          <button className="button primary play-button" disabled={busy || !wallet.balance}>{busy ? 'Spinning…' : 'Place bet'}</button>
        </form>
      </div>
    </section>
  )
}
