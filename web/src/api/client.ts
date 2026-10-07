/** Browser API boundary. All balances and game outcomes come from the local server. */
import type { DemoGame, DemoTransaction, DemoUser } from './fixtures'

export interface WalletSummary {
  balance: number
  currency: 'server-coins'
  demo: boolean
}

export interface CoinflipResult {
  gameId: string
  game: 'coinflip'
  wager: number
  choice: 'heads' | 'tails'
  outcome: 'heads' | 'tails'
  payout: number
  balance: number
  demo: true
  replay?: boolean
}

export interface RouletteResult {
  gameId: string
  game: 'roulette'
  wager: number
  betType: 'color' | 'number' | 'range'
  betValue: string | number
  outcome: 'red' | 'black' | 'green'
  outcomeNumber: number
  payout: number
  balance: number
  demo: true
}

export interface CrashState {
  gameId: string | null
  wager: number | null
  startedAt: string | null
  crashAt: string | null
  multiplier: number
  status: 'idle' | 'running' | 'crashed' | 'cashed_out'
  balance: number
  demo: true
  payout?: number
}

export interface CrashCashoutResult {
  gameId: string
  status: 'cashed_out' | 'crashed'
  payout: number
  balance: number
  multiplier: number
  demo: true
}

export interface ChickenState {
  gameId: string | null
  wager: number | null
  step: number
  multiplier: number
  status: 'idle' | 'active' | 'lost' | 'cashed_out'
  payout: number
  balance: number
  demo: true
}

export interface LotteryState {
  lotteryId: string
  ticketPrice: number
  entries: { ticketId: string | number; displayName: string }[]
  entryCount: number
  pool: number
  status: 'open' | 'drawn'
  winningTicket?: string | number
}

export interface LotteryDraw {
  lotteryId: string
  status: 'drawn'
  winner: { displayName: string } | null
  winningTicket: string | number | null
  payout: number
  balance: number
  demo: true
}

export interface LotteryPurchase extends LotteryState {
  ticketsOwned: number
  balance: number
}

export interface AppApi {
  games: {
    listGames(): Promise<DemoGame[]>
    coinflip(wager: number, choice: CoinflipResult['choice'], operationId: string): Promise<CoinflipResult>
    roulette(wager: number, betType: RouletteResult['betType'], betValue: RouletteResult['betValue'], operationId: string): Promise<RouletteResult>
    crash: {
      current(): Promise<CrashState | null>
      start(wager: number, operationId: string): Promise<CrashState>
      cashout(gameId: string, operationId: string): Promise<CrashCashoutResult>
    }
    chicken: {
      current(): Promise<ChickenState | null>
      start(wager: number, operationId: string): Promise<ChickenState>
      step(gameId: string, operationId: string): Promise<ChickenState>
      cashout(gameId: string, operationId: string): Promise<ChickenState>
    }
    lottery: {
      current(): Promise<LotteryState>
      buyTickets(count: number, operationId: string): Promise<LotteryPurchase>
      draw(): Promise<LotteryDraw>
    }
  }
  wallet: { getSummary(): Promise<WalletSummary>; listTransactions(): Promise<DemoTransaction[]> }
  auth: { currentSession(): Promise<(DemoUser & { demo: boolean }) | null> }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } })
  const body = await response.json()
  if (!response.ok) throw new Error(body.error ?? 'Request failed')
  return body as T
}

export const api: AppApi = {
  games: {
    listGames: () => request('/api/games'),
    coinflip: (wager, choice, operationId) => request('/api/games/coinflip', {
      method: 'POST', body: JSON.stringify({ wager, choice, operationId }),
    }),
    roulette: (wager, betType, betValue, operationId) => request('/api/games/roulette', {
      method: 'POST', body: JSON.stringify({ wager, betType, betValue, operationId }),
    }),
    crash: {
      current: () => request('/api/games/crash'),
      start: (wager, operationId) => request('/api/games/crash/start', { method: 'POST', body: JSON.stringify({ wager, operationId }) }),
      cashout: (gameId, operationId) => request('/api/games/crash/cashout', { method: 'POST', body: JSON.stringify({ gameId, operationId }) }),
    },
    chicken: {
      current: () => request('/api/games/chicken'),
      start: (wager, operationId) => request('/api/games/chicken/start', { method: 'POST', body: JSON.stringify({ wager, operationId }) }),
      step: (gameId, operationId) => request('/api/games/chicken/step', { method: 'POST', body: JSON.stringify({ gameId, operationId }) }),
      cashout: (gameId, operationId) => request('/api/games/chicken/cashout', { method: 'POST', body: JSON.stringify({ gameId, operationId }) }),
    },
    lottery: {
      current: () => request('/api/games/lottery'),
      buyTickets: (count, operationId) => request('/api/games/lottery/tickets', { method: 'POST', body: JSON.stringify({ count, operationId }) }),
      draw: () => request('/api/games/lottery/draw', { method: 'POST', body: JSON.stringify({}) }),
    },
  },
  wallet: {
    getSummary: () => request('/api/wallet'),
    listTransactions: () => request('/api/transactions'),
  },
  auth: { currentSession: () => request('/api/session') },
}
