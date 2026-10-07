/** Shared response types for the local demo API. Seed balances/ledger rows are demo data. */

export interface DemoUser {
  displayName: string
  minecraftUuid: string | null // null until identity linking exists
}

export interface DemoGame {
  id: string
  name: string
  blurb: string
  emoji: string
  status: 'playable'
}

export interface DemoTransaction {
  id: string
  at: string // ISO date for display
  kind: 'seed' | 'deposit' | 'wager' | 'payout' | 'withdrawal'
  amount: number // integer coin units, sign from kind
  note: string
}

export const DEMO_USER: DemoUser = {
  displayName: 'DemoPlayer',
  minecraftUuid: null,
}

export const DEMO_BALANCE = 12450

export const DEMO_GAMES: DemoGame[] = [
  { id: 'coinflip', name: 'Coinflip', blurb: 'Pick a side. The server handles the flip and settlement.', emoji: '◒', status: 'playable' },
  { id: 'roulette', name: 'Roulette', blurb: 'European wheel, single or outside bets.', emoji: '◎', status: 'playable' },
  { id: 'lottery', name: 'Lottery', blurb: 'Join the local draw. One ticket wins the pool.', emoji: '▤', status: 'playable' },
  { id: 'crash', name: 'Crash', blurb: 'Watch the curve. Cash out before it breaks.', emoji: '↗', status: 'playable' },
  { id: 'chicken', name: 'Chicken', blurb: 'Cross one step at a time, then bank your run.', emoji: '✳', status: 'playable' },
]

export const DEMO_TRANSACTIONS: DemoTransaction[] = [
  { id: 'demo-tx-1', at: '2026-10-05', kind: 'deposit', amount: 5000, note: 'Demo deposit (fixture)' },
  { id: 'demo-tx-2', at: '2026-10-05', kind: 'wager', amount: -100, note: 'Demo coinflip wager (fixture)' },
  { id: 'demo-tx-3', at: '2026-10-05', kind: 'payout', amount: 195, note: 'Demo payout (fixture)' },
  { id: 'demo-tx-4', at: '2026-10-04', kind: 'deposit', amount: 8355, note: 'Demo deposit (fixture)' },
  { id: 'demo-tx-5', at: '2026-10-03', kind: 'withdrawal', amount: -1000, note: 'Demo withdrawal (fixture)' },
]
