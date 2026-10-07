import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type { DemoGame } from '../api/fixtures'

const symbols: Record<string, string> = { coinflip: '◉', roulette: '✳', lottery: '№', crash: '⌁', chicken: '↟' }

export default function Games() {
  const [games, setGames] = useState<DemoGame[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    api.games.listGames().then(setGames).catch(() => setError('Could not load games. Start the local API and refresh.'))
  }, [])

  return (
    <section>
      <div className="page-heading"><div><p className="eyebrow">THE FLOOR / 05 TABLES</p><h1>Game hall</h1><p>Five server-settled game modes in this local demo.</p></div><span className="status-pill live">05 DEMO MODES</span></div>
      {error && <p role="alert" className="error-message">{error}</p>}
      <div className="games-grid">
        {games.map((g, index) => <article className={`game-card${g.id === 'coinflip' && g.status === 'playable' ? ' featured' : ''}`} key={g.id}>
          <span className="game-number">0{index + 1}</span>
          <div className="game-icon" aria-hidden="true">{symbols[g.id] ?? g.emoji}</div>
          <div>
            <h2>{g.name}</h2>
            <p>{g.blurb}</p>
            <div className="game-meta">
              {g.status === 'playable'
                ? <><span className="status-pill live">LOCAL DEMO</span><Link className="button primary" to={`/games/${g.id}`}>Take a seat ↗</Link></>
                : <span className="status-pill">IN THE WORKSHOP</span>}
            </div>
          </div>
        </article>)}
      </div>
      <p className="small games-note">All wagers, outcomes, and payouts are handled by the local server. The seed balance has no Minecraft backing.</p>
    </section>
  )
}
