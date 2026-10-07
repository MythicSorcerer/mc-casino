# OpenCode handoff — Mythic's Casino

> **Status (2026-10-07):** This handoff is historical. Its Chunk 1 scope shipped, and the web app now has all five server-settled games, an `npm test` HTTP smoke suite, a lottery-draw `ADMIN_TOKEN` guard, and a lock-contention retry. Current state, validation record, and next-session instructions live in `STATUS.md` and `CODEX.md`. The sections below document the original Chunk 1 assignment.

## Start here

Read `AGENTS.md`, `README.md`, `STATUS.md`, `PLAN.md`, `ROADMAP.md` (Chunks 0–2), `ARCHITECTURE.md`, `DECISIONS.md`, and `docs/payment-bridge.md` before implementation. The folder currently has no `.git` repository, no application source, and no confirmed upstream web/auth/payment repositories. The only source artifact is `flipcontroller-template-26.3.zip`, a generic Fabric example mod; it is not an existing application or payment bridge.

## Your assigned half: web product shell (Roadmap Chunk 1)

Own the web app skeleton only: landing page, login/auth screen or integration boundary, dashboard, games listing, wallet/history views, navigation, and responsive styling. Make the app runnable and document the exact start/build commands. Use mock/sample data only for visual presentation, clearly labeled as demo data. Do not represent a mock login as real authentication or a displayed mock balance as a real wallet.

The stack is not selected (DECISIONS.md Q-003). Inspect available project context and choose the smallest conventional stack that can run locally; record the choice and rationale in `DECISIONS.md` before depending on it. Keep backend-facing calls behind a small typed/API boundary so an authoritative service can replace fixtures later. Do not invent routes, identity claims, or existing service behavior as facts.

### Out of scope

- Ledger/database, deposits/withdrawals, payment bridge, and Minecraft integration.
- Game mechanics, wagers, outcomes, payout logic, and real wallet balances.
- Real-money support or credentials/secrets.
- Changing unresolved product questions into requirements.

### Acceptance

- A clean install and documented local start command work.
- Landing and app shell navigation work; login is explicitly a placeholder unless a real provider is confirmed.
- Dashboard, games, wallet, and history screens render responsive demo fixtures with an unmistakable demo state.
- No browser-controlled balance/outcome is sent to or treated as authoritative by a backend.
- Update `STATUS.md` with files, commands actually run, results, and limitations. Do not claim checks passed unless run.

## Coordination and repository state

This checkout has no `.git`, so a git worktree is unavailable and changes cannot be isolated with Git at this stage. Work in this shared folder only after coordinating file ownership. The web app files and its frontend-specific docs are your ownership; avoid editing the project-level roadmap/architecture/decisions except to record a necessary, clearly scoped stack decision. Codex owns the reconciliation/reconnaissance track and will handle project-wide docs and upstream/template findings. Do not overwrite unrelated edits.

When a Git repository is initialized, keep your work on a separate branch/worktree and provide the branch name and changed-file list. Do not commit or publish unless asked.

## Project invariants

- Server is authoritative for identity, balances, wagers, outcomes, and payouts.
- Economy changes must use an auditable append-only ledger and atomic operations.
- Payment ingestion and withdrawals must be idempotent.
- Treat Minecraft chat as untrusted; parsed chat alone is not payment evidence.
- Keep credentials/tokens out of source, logs, browser storage, and user-facing errors.
- Do not add real-money support.

## Handoff back

Report the chosen stack, install/start/build commands and actual results, implemented screens, changed files, unresolved assumptions, and any integration contract the future backend needs. Leave this file in place until the project owner incorporates both halves.

## Completion report (OpenCode, 2026-10-06)

**Stack:** Vite + React + TypeScript SPA in `web/`, `react-router-dom` for routing. Rationale and scoping recorded as D-006 in `DECISIONS.md`.

**Commands (actual results):**
- `cd web && npm install` — OK, 0 vulnerabilities.
- `npm run build` (`tsc --noEmit && vite build`) — passed; one TS error initially (missing CSS module declaration), fixed via `src/vite-env.d.ts`, rebuild passed.
- `npm run preview` + `curl /` and `/games` — HTTP 200, built assets served. Preview server stopped afterwards.
- `npm run dev` — expected standard Vite dev on :5173; same codebase as preview, not separately left running.

**Screens implemented:** `/` landing, `/login` (explicit non-auth placeholder), `/dashboard`, `/games`, `/wallet`, `/history`. Responsive CSS in `web/src/styles.css`. Persistent demo banner and DEMO tags on the balance chip.

**Data/API boundary:** All pages read via `web/src/api/client.ts` (`AppApi`: `games.listGames`, `wallet.getSummary`, `wallet.listTransactions`, `auth.currentSession`), currently backed by `web/src/api/fixtures.ts`. Future backend contract: same interface returns real, server-authoritative data; browser never sends authoritative balance/outcome/payout.

**Changed/added files:** `web/` (package.json, tsconfig.json, vite.config.ts, index.html, .gitignore, README.md, src/*), `DECISIONS.md` (D-006 appended), `STATUS.md` (OpenCode section appended). No project roadmap/architecture/payment docs edited; CODEX.md untouched.

**Unresolved assumptions:** No git repo (no branch/worktree/diff); stack limited to Chunk 1 demo; auth provider, database, and payment bridge still open (Q-001…Q-008). Login form alerts rather than authenticates.

**Next-session instructions:** Chunk 1 is complete at demo-shell level. A later OpenCode session should (a) replace fixtures with real calls once Codex delivers the API, (b) keep all backend access behind `web/src/api/client.ts`, (c) add game UI only after the server-authoritative game endpoints exist, and (d) re-run `npm run build` before declaring progress. Do not present demo fixtures as real data.

## Codex continuation (2026-10-06)

Codex continued after OpenCode capacity was exhausted. The frontend API boundary now calls the local Node/SQLite demo API; `/games/coinflip` is a server-settled local demo game. It is still not real auth or an external wallet. The header updates after play, pages show API load errors, history formats timestamps, and unknown paths have a fallback. See D-007, `STATUS.md`, and `CODEX.md` for current implementation and validation limits.
