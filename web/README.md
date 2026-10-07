# Mythic's Casino — Local Demo

Vite + React + TypeScript front end with a local Node HTTP API. The local API
uses SQLite for a persistent append-only demo ledger and five server-settled
local game modes. It has one shared local demo account and no authentication or Minecraft
integration. Do not expose it to a network or use it for real balances/payments.

> **Legal warning:** This software MUST NOT be used with currency that can be purchased with real money or exchanged for real money. Use only non-transferable, server-side Minecraft currency with no real-money value.

## Commands

```bash
cd web
npm install        # install dependencies
npm run dev        # starts API, waits for readiness, then starts Vite
npm run build      # typecheck + production build to web/dist
npm run preview    # serve the production build locally
npm run typecheck  # tsc --noEmit
npm test           # boots the API on a throwaway db and runs HTTP smoke checks
```

For API-only work, `npm run server` starts the API without the UI. The
development command shuts down both processes when stopped and does not start
Vite if the API fails to start.

The API requires Node.js and the `sqlite3` command-line program. The default
database is `web/data/demo.sqlite`; set `DATABASE_PATH` to choose a different
file, and `PORT` to change the API port. The opening balance is local demo seed
data. It is not backed by Minecraft currency.

## Routes

- `/` — landing page
- `/login` — explicit placeholder login form (not real auth)
- `/dashboard` — demo balance/currency/status cards
- `/games` — game hall
- `/games/coinflip` — server-settled local demo game (1–10,000 coin wager)
- `/games/roulette` — European wheel (0–36), color/number/range bets
- `/games/crash` — server-timed rising multiplier with server-checked cashout
- `/games/chicken` — five server-resolved crossings and a capped payout ladder
- `/games/lottery` — 25-coin tickets, shared demo pool, manual local draw
- `/wallet` — demo wallet view
- `/history` — demo transaction table

## Invariants

- Authentication is a fixed local demo identity; there is no access control.
- The local server owns demo balance, game result, and payout. Browsers send
  only game choices, wagers, counts, and operation IDs.
- The append-only ledger stores seed, wager, and payout entries. Game settlement
  uses SQLite transactions and unique operation IDs.
- Roulette uses a European 0–36 wheel; even-money bets return 2× including the
  stake, and a straight number returns 36× including the stake.
- Crash rounds use a stored server-side crash time. Cashout must reach the API
  before that time; the chart is only a display.
- Chicken gives each crossing an 80% server-side success chance, with capped
  total-return multipliers `1.00×`, `1.15×`, `1.43×`, `1.79×`, `2.24×`, `2.80×`.
- Lottery tickets cost 25 coins. The local draw is manually triggered, awards
  the ticket pool to one uniformly selected ticket. Set `ADMIN_TOKEN` in `.env`
  to require the `x-admin-token` header for draws; unset it stays open for the
  single-account demo.
- SQLite writes retry briefly on `database is locked`, and replayed request
  operation IDs return the prior committed result instead of double-settling.
- Deposits, withdrawals, Minecraft integration, real identity, production
  security, and production-grade randomness/audit remain unimplemented.
- Backend-facing calls live only in `src/api/client.ts`.
