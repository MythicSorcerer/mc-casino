import { useEffect, useState } from 'react'
import { api, type ChickenState } from '../api/client'
import { useWallet } from '../hooks/useWallet'

const ladder = [1, 1.15, 1.43, 1.79, 2.24, 2.8]

export default function Chicken() {
  const wallet = useWallet()
  const [wager, setWager] = useState('100')
  const [run, setRun] = useState<ChickenState | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let mounted = true
    api.games.chicken.current().then((state) => { if (mounted) setRun(state) }).catch(() => { if (mounted) setError('Could not load the local game server.') })
    return () => { mounted = false }
  }, [])

  async function act(action: 'start' | 'step' | 'cashout', event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    setBusy(true); setError('')
    try {
      const next = action === 'start'
        ? await api.games.chicken.start(Number(wager), `chicken_${crypto.randomUUID().replaceAll('-', '')}`)
        : action === 'step' && run?.gameId
          ? await api.games.chicken.step(run.gameId, `cross_${crypto.randomUUID().replaceAll('-', '')}`)
          : run?.gameId ? await api.games.chicken.cashout(run.gameId, `bank_${crypto.randomUUID().replaceAll('-', '')}`) : null
      if (next) setRun(next)
      if (action !== 'step' || next?.status === 'lost' || next?.status === 'cashed_out') await wallet.refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The server could not complete that move') }
    finally { setBusy(false) }
  }

  const active = run?.status === 'active'
  const nextStep = run ? Math.min(run.step + 1, ladder.length - 1) : 1
  return (
    <section className="play-page chicken-page">
      <header className="play-heading"><p className="eyebrow">05 / ONE STEP AT A TIME</p><h1>Crossing</h1><p>Take another step to raise the return. Bank whenever you like.</p></header>
      <div className="card crossing-board">
        <div className="crossing-meta"><span>LOCAL DEMO</span><span>AVAILABLE ◈ {wallet.balance?.toLocaleString() ?? '—'}</span></div>
        <div className="crossing-track" aria-label={`Crossing progress, step ${run?.step ?? 0}`}>
          {ladder.slice(1).map((multiplier, index) => <div key={index} className={`crossing-tile ${run && index + 1 < run.step ? 'passed' : ''} ${run?.step === index + 1 && active ? 'current' : ''}`}><span>STEP {index + 1}</span><b>{multiplier.toFixed(2)}×</b>{run?.step === index + 1 && active && <i aria-label="You are here" />}</div>)}
          <div className="crossing-player" aria-hidden="true">✳</div>
        </div>
        {!active && <form className="chicken-start" onSubmit={(event) => void act('start', event)}><label>Stake<input type="number" min="1" max="10000" step="1" value={wager} onChange={(event) => setWager(event.target.value)} required /></label><button className="button primary" disabled={busy || !wallet.balance}>{busy ? 'Starting…' : run?.status === 'lost' || run?.status === 'cashed_out' ? 'Start new crossing' : 'Start crossing'}</button></form>}
        {active && <div className="chicken-actions"><div><span className="small">BANK NOW</span><strong>◈ {Math.floor((run.wager ?? 0) * run.multiplier).toLocaleString()}</strong></div><button className="button" disabled={busy} onClick={() => void act('cashout')}>Bank this run</button>{run.step < ladder.length - 1 && <button className="button primary" disabled={busy} onClick={() => void act('step')}>{busy ? 'Checking…' : `Cross next · ${ladder[nextStep].toFixed(2)}×`}</button>}</div>}
        {run?.status === 'lost' && <p className="round-result" role="status">A step gave way. The stake was lost.</p>}
        {run?.status === 'cashed_out' && <p className="round-result" role="status">You banked {run.payout.toLocaleString()} coins at {run.multiplier.toFixed(2)}×.</p>}
        {error && <p className="error-message" role="alert">{error}</p>}{wallet.error && <p className="error-message" role="alert">{wallet.error}</p>}
      </div>
      <p className="game-footnote">Each crossing is resolved once on the server. Your browser cannot choose whether a step succeeds.</p>
    </section>
  )
}
