import { useEffect, useState } from 'react'
import { api, type CrashCashoutResult, type CrashState } from '../api/client'
import { useWallet } from '../hooks/useWallet'

export default function Crash() {
  const wallet = useWallet()
  const [wager, setWager] = useState('100')
  const [round, setRound] = useState<CrashState | null>(null)
  const [settled, setSettled] = useState<CrashCashoutResult | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let mounted = true
    api.games.crash.current().then((state) => { if (mounted) setRound(state) }).catch(() => { if (mounted) setError('Could not reach the local game server.') })
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (!round || round.status !== 'running') return
    let active = true
    const timer = window.setInterval(() => {
      api.games.crash.current().then((state) => {
        if (active && state?.gameId === round.gameId) setRound(state)
      }).catch(() => { if (active) setError('Connection paused. The server still decides whether the round has crashed.') })
    }, 220)
    return () => { active = false; window.clearInterval(timer) }
  }, [round?.gameId, round?.status])

  async function start(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setSettled(null)
    try {
      const state = await api.games.crash.start(Number(wager), `crash_${crypto.randomUUID().replaceAll('-', '')}`)
      setRound(state); await wallet.refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not start round') }
    finally { setBusy(false) }
  }

  async function cashout() {
    if (!round?.gameId) return
    setBusy(true); setError('')
    try {
      const result = await api.games.crash.cashout(round.gameId, `cashout_${crypto.randomUUID().replaceAll('-', '')}`)
      setSettled(result)
      setRound((current) => current ? { ...current, status: result.status, multiplier: result.multiplier, balance: result.balance, payout: result.payout } : current)
      await wallet.refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Cashout failed') }
    finally { setBusy(false) }
  }

  const live = round?.status === 'running'
  const progress = round?.status === 'running' && round.startedAt && round.crashAt ? Math.min(100, Math.max(0, ((Date.now() - Date.parse(round.startedAt)) / (Date.parse(round.crashAt) - Date.parse(round.startedAt))) * 100)) : 0
  return (
    <section className="play-page">
      <header className="play-heading"><p className="eyebrow">03 / CASHOUT BEFORE THE BREAK</p><h1>Crash</h1><p>The server keeps the clock. Your browser only watches the line.</p></header>
      <div className={`card crash-stage ${live ? 'is-live' : ''}`}>
        <div className="crash-topline"><span>{live ? 'ROUND LIVE' : round?.status === 'crashed' ? 'ROUND CRASHED' : round?.status === 'cashed_out' ? 'ROUND BANKED' : 'READY WHEN YOU ARE'}</span><span>DEMO BALANCE ◈ {wallet.balance?.toLocaleString() ?? '—'}</span></div>
        <div className="crash-display"><span className="crash-multiplier">{round?.multiplier.toFixed(2) ?? '1.00'}<small>×</small></span><div className="chart-wrap"><svg className="crash-chart" viewBox="0 0 700 230" preserveAspectRatio="none" aria-label="Server-reported crash multiplier visualization"><path className="chart-fill" d={`M0 220 C120 215 160 200 230 180 S360 ${Math.max(20, 180 - progress * 1.35)} 430 ${Math.max(5, 155 - progress * 1.3)} S560 ${Math.max(0, 100 - progress * 1.4)} ${Math.max(430, progress * 6.3)} ${Math.max(0, 60 - progress * 1.45)} L700 230 Z`} /><path className="chart-line" d={`M0 220 C120 215 160 200 230 180 S360 ${Math.max(20, 180 - progress * 1.35)} 430 ${Math.max(5, 155 - progress * 1.3)} S560 ${Math.max(0, 100 - progress * 1.4)} ${Math.max(430, progress * 6.3)} ${Math.max(0, 60 - progress * 1.45)}`} /></svg></div></div>
        {!live && <form className="crash-controls" onSubmit={start}><label>Stake<input type="number" min="1" max="10000" step="1" value={wager} onChange={(event) => setWager(event.target.value)} required disabled={Boolean(round?.status === 'running')} /></label><button className="button primary" disabled={busy || !wallet.balance || live}>{busy ? 'Working…' : round?.status === 'running' ? 'Round in progress' : 'Start round'}</button></form>}
        {live && <button className="button primary cashout-button" onClick={() => void cashout()} disabled={busy}>{busy ? 'Checking server…' : `Cash out · ${(round.multiplier).toFixed(2)}×`}</button>}
        {round?.status === 'crashed' && <p className="round-result" role="status">The round crashed at {round.multiplier.toFixed(2)}×. Your stake was lost.</p>}
        {(settled || (round?.status === 'cashed_out' && round.payout !== undefined)) && <p className="round-result" role="status">Banked {(settled?.payout ?? round?.payout ?? 0).toLocaleString()} coins at {(settled?.multiplier ?? round?.multiplier ?? 1).toFixed(2)}×.</p>}
        {error && <p className="error-message" role="alert">{error}</p>}{wallet.error && <p className="error-message" role="alert">{wallet.error}</p>}
      </div>
      <p className="game-footnote">Cashout is accepted only if it reaches the server before its stored crash time. A browser animation cannot secure a late cashout.</p>
    </section>
  )
}
