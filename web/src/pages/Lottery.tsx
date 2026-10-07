import { useEffect, useState } from 'react'
import { api, type LotteryDraw, type LotteryState } from '../api/client'
import { useWallet } from '../hooks/useWallet'

export default function Lottery() {
  const wallet = useWallet()
  const [round, setRound] = useState<LotteryState | null>(null)
  const [draw, setDraw] = useState<LotteryDraw | null>(null)
  const [count, setCount] = useState(1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const refreshRound = () => api.games.lottery.current().then(setRound).catch((cause) => setError(cause instanceof Error ? cause.message : 'Could not load the draw'))
  useEffect(() => { void refreshRound() }, [])

  async function buy(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setDraw(null)
    try {
      const updated = await api.games.lottery.buyTickets(count, `lottery_${crypto.randomUUID().replaceAll('-', '')}`)
      setRound(updated); await wallet.refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not buy tickets') }
    finally { setBusy(false) }
  }

  async function drawNow() {
    setBusy(true); setError('')
    try {
      const result = await api.games.lottery.draw()
      setDraw(result); await refreshRound(); await wallet.refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not draw this round') }
    finally { setBusy(false) }
  }

  const myTickets = round?.entries.filter((ticket) => ticket.displayName === 'DemoPlayer').length ?? 0
  return (
    <section className="play-page lottery-page">
      <header className="play-heading"><p className="eyebrow">04 / COMMUNITY POOL</p><h1>Lottery</h1><p>One draw, one winning ticket. Tickets are charged to the local demo ledger.</p></header>
      <div className="lottery-layout">
        <div className="card jackpot-card">
          <div className="jackpot-label">CURRENT POOL <span>ROUND {round?.lotteryId.slice(-4) ?? '…'}</span></div>
          <p className="jackpot-total">◈ {round?.pool.toLocaleString() ?? '—'}</p>
          <div className="jackpot-stats"><div><span>ENTRIES</span><b>{round?.entryCount ?? '—'}</b></div><div><span>YOUR TICKETS</span><b>{myTickets}</b></div><div><span>PRICE / TICKET</span><b>{round?.ticketPrice ?? '—'}</b></div></div>
          <div className="ticket-cloud" aria-label="Entries in the current draw">{round?.entries.slice(-48).map((ticket) => <span key={ticket.ticketId} className="ticket-mark" title={`${ticket.displayName}: ${ticket.ticketId}`}>✳</span>)}</div>
          <form className="ticket-form" onSubmit={buy}><label>Tickets<input type="number" min="1" max="10" step="1" value={count} onChange={(event) => setCount(Number(event.target.value))} required /></label><button className="button primary" disabled={busy || !round || round.status !== 'open' || !wallet.balance}>{busy ? 'Adding…' : `Buy for ◈ ${((round?.ticketPrice ?? 0) * count).toLocaleString()}`}</button></form>
          <p className="small">Your selection is the count only. Ticket IDs and the draw are assigned by the server.</p>
        </div>
        <aside className="card draw-card"><p className="eyebrow">ROUND CONTROL</p><h2>Close the draw</h2><p>Manual draw is enabled for this local single-account demonstration. It is not protected by admin authentication.</p><button className="button" disabled={busy || !round?.entryCount || round.status !== 'open'} onClick={() => void drawNow()}>{busy ? 'Drawing…' : 'Draw winner'}</button>
          {draw && <div className="draw-result" role="status"><span>WINNING TICKET</span><strong>{draw.winningTicket ?? 'No winner'}</strong><p>{draw.winner ? `${draw.winner.displayName} receives ◈ ${draw.payout.toLocaleString()}` : 'No entries this round.'}</p></div>}
          {round?.status === 'drawn' && round.winningTicket && !draw && <div className="draw-result"><span>LAST WINNING TICKET</span><strong>{round.winningTicket}</strong></div>}
          {error && <p className="error-message" role="alert">{error}</p>}{wallet.error && <p className="error-message" role="alert">{wallet.error}</p>}
        </aside>
      </div>
    </section>
  )
}
