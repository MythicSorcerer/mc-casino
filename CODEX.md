# Codex handoff — Five-game local demo checkpoint

Updated: 2026-10-07

## Current state and boundaries

- `web/` is a Vite + React + TypeScript SPA plus a local Node HTTP API backed by SQLite CLI. The persistent database defaults to `web/data/demo.sqlite`.
- Five modes are playable in the local demo: coinflip, roulette, crash, chicken, and lottery. The API controls balances, outcomes, and payouts; the append-only ledger records wagers and payouts. See D-007 and D-008 in `DECISIONS.md`.
- The interface has been redesigned around a night-market/editorial visual direction. The game hall, landing page, dashboard, wallet, history, login, and game screens share the updated design.
- Roulette is European 0–36; even-money hits return 2× gross and straight-number hits 36× gross. Crash uses a stored server crash time; cashout must reach the API before it. Chicken has an 80% success chance per crossing and a capped 1.00×/1.15×/1.43×/1.79×/2.24×/2.80× gross-return ladder. Lottery tickets cost 25 demo coins and a manual local draw pays the ticket pool to one uniformly selected ticket.
- Login is a placeholder and the app has one fixed shared demo identity. The lottery draw is open by default; set `ADMIN_TOKEN` to require `x-admin-token` for draws. These mechanics are not ready for backed currency or public hosting.
- No real auth, Minecraft payments, deposits/withdrawals, production database, deployment, or production security controls exist. Relevant production decisions remain open in `DECISIONS.md`.
- This directory has no `.git`; do not assume branch/worktree isolation. The upstream Fabric ZIP remains a generic template.

## Run locally

Requires Node.js and the `sqlite3` CLI.

```sh
cd web
npm install
npm run dev
```

Open the Vite URL (normally `http://localhost:5173`). For API-only work run `npm run server`. `npm run build` typechecks and builds the UI. `npm test` boots the API on a throwaway database and runs the HTTP smoke suite (`scripts/test.mjs` + `scripts/smoke.mjs`). Set `DATABASE_PATH` or `PORT` to override API defaults. Set `ADMIN_TOKEN` to guard lottery draws. The API binds to loopback. Do not expose this unauthenticated demo service to a network or use its seed balance as backed currency.

## Validation record

- `cd web && npm test` passed on 2026-10-07 (fresh throwaway DB): all concurrent-settlement, replay, terminal-state, ledger-consistency, and 4xx rejection checks pass.
- `cd web && npm run build` passed on 2026-10-07 (TypeScript check + Vite production bundle).
- `node --check` passed on 2026-10-07 for `server/server.js`, `scripts/dev.js`, `scripts/smoke.mjs`, and `scripts/test.mjs`.
- HTTP/API smoke testing ran on 2026-10-07; loopback listening now works (it previously failed with sandbox `EPERM`). Browser click-through remains unverified. The Vite `ECONNREFUSED` lines reported by the user were caused by the API not being available; the dev launcher now waits for API readiness and exits before Vite if API startup fails.
- A real concurrency race (SQLITE_BUSY 500s on concurrent settlements) was found via the new smoke suite and fixed with a bounded lock-contention retry; chicken/crash round-state conflicts now return 409 instead of 500.
- There is no Git repository, so `git status` and worktrees are unavailable.

## Next session instructions

1. Read `README.md`, `STATUS.md`, the relevant `ROADMAP.md` chunk, and `DECISIONS.md` before changes. The requested local games and UI overhaul are implemented; do not redo them without finding a concrete issue.
2. Run `cd web && npm run build`, `npm test`, and `node --check web/server/server.js && node --check web/scripts/dev.js`. Fix regressions and update `STATUS.md` and this file with actual results.
3. HTTP/API flows are exercised via `npm test`. What remains unverified is browser click-through of the five games, balance refresh, and retry behavior; run `npm run dev` in a real browser before claiming that milestone.
4. Idempotency/concurrency is now guarded by `npm test`: same-operation retries recover the committed action for roulette, crash, chicken, and lottery ticket purchases, chicken stale-step updates and crash cashout credits are guarded, and concurrent settlements serialize on `BEGIN IMMEDIATE` with a lock-contention retry. If you touch settlement SQL, extend the smoke suite rather than removing checks.
5. Before production work, obtain source paths/owners for temporary-token auth, `isekai-utils`, and `/pay`; verify Minecraft payment provenance and identity mapping; then resolve the open decisions in `DECISIONS.md` before enabling transfers or backed balances.
6. Preserve server authority, append-only ledger, explicit demo labeling, and the no-real-money scope. Do not expose this unauthenticated service publicly.

## Invariants

- Server controls identity, balances, wagers, outcomes, and payouts.
- Economy entries are append-only and financial actions are atomic/idempotent.
- Credentials stay out of source, logs, browser storage, and user-facing errors.
- Minecraft chat alone is not payment evidence.
- No real-money support; the local demo identity and seed balance are not backed funds.
- Do not commit or publish unless explicitly asked.
