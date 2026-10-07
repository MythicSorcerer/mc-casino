# Current status

Updated: 2026-10-07

## Verified contents

- `ROADMAP.md`: a 13-chunk product roadmap for a Minecraft-connected games website.
- `flipcontroller-template-26.3.zip`: an unextracted Fabric example-mod template. It contains sample Java entrypoints and mixins, Gradle build files, and GitHub Actions build workflow. It is not the payment client described in the roadmap.
- ZIP metadata identifies the template as `FlipController`, targeting Minecraft 26.3, Java 25, Fabric Loader 0.19.5, Fabric API 0.162.0+26.3, and Loom 1.18-SNAPSHOT. Its README and embedded license state CC0-1.0 for the template. Entrypoints only log “Hello Fabric world!” / are empty; there is no payment or auth code.
- The project directory has no `.git` repository, so Git branches/worktrees are not available in this checkout.
- The `web/` app now includes a redesigned React interface, local Node HTTP API, and SQLite demo ledger. A fixed local demo identity has a labeled seed balance; coinflip, roulette, crash, chicken, and lottery are playable against server-owned demo balance and outcomes. See D-007/D-008 and `web/README.md`.
- A scoped search of nearby likely code trees did not locate the referenced `isekai-utils`, `/pay` payment event, or temporary-token auth source. This does not rule out private/remote repositories or differently named code.
- Follow-up reconnaissance on 2026-10-06 rechecked the archive's README, metadata, entrypoints, and build configuration. It remains a split-source Fabric example with hello-world server/common initialization, empty client initialization, placeholder identity/description, and Minecraft 26.3 / Java 25 requirements. A directory-name search under `/Users/ximotu/projects` (depth 3) found no matching auth/payment source; it found only this checkout and an unrelated `cpp/codeforces/breedflip` project. This is not an exhaustive repository search.
- `OPENCODE.md` assigns the web product shell to OpenCode; Codex owns reconnaissance and project-wide architecture/decision documentation.

## Note to owner: incomplete work (2026-10-07)

Rebrand to **Mythic's Casino** is applied across docs, UI, demo server, and package names; a legal warning (no purchasable/exchangeable real-money currency) is now in `README.md`, `web/README.md`, and `SECURITY.md`. Still incomplete / not done by me:

- No git repo existed here; I ran `git init` and pushed to `mythicsorcerer/mc-casino`. If the push failed or you prefer a different remote URL, redo with `git remote set-url origin <url> && git push -u origin main`.
- The upstream `isekai-utils` / `/pay` / temporary-token auth sources are still unidentified and unimplemented — see immediate next steps.
- Real authN/authZ, Minecraft payment bridge, production database, deployment, production randomness/payout audit, and browser click-through testing remain unimplemented/unverified.
- `flipcontroller-template-26.3.zip` is still an untouched upstream template; its sample metadata/license should be replaced before distribution.
- `.env.example` placeholder bridge values still need real ones when integration sources are found. The local demo API has no access control — keep loopback only.
- External references left as `isekai-utils` intentionally (name of the referenced, not-yet-located integration). The Fabric template archive still brands itself `FlipController`.

## Not implemented or verified

Real authentication, `/pay` behavior, `isekai-utils` integration, payment parsing, production wallet/economy, deployment, and full external end-to-end flows remain unimplemented or unverified. The local demo backend has no access control and is not production safe. The lottery draw is admin-guarded only when `ADMIN_TOKEN` is set. Browser click-through remains unverified. HTTP concurrency, idempotency, and restart persistence of the demo API are now verified by `npm test` (2026-10-07).

## Current phase

**All five local demo games and the UI overhaul are implemented; production prerequisites remain unresolved.** The roadmap's original Chunk 0 and integration/economy milestones remain incomplete because auth, payment, deployment, and production controls are missing.

## Immediate next steps

1. Identify and inspect the real auth, `isekai-utils`, and `/pay` sources; resolve payment evidence and identity linking before enabling transfers.
2. Select production database, authentication provider, currency policy, deployment, and operational ownership.
3. Replace local-only account and lottery controls; define production randomness, payout rules, audit/reconciliation, and verified concurrency/duplicate handling before any backed currency is used.

## Loopback verification and HTTP hardening (2026-10-07)

- Loopback networking now worked in this environment, so HTTP/API verification ran for the first time. A race between concurrent settlements surfaced `database is locked` 500s; `web/server/server.js` now retries brief SQLite lock contention (6 attempts, linear backoff) and maps round-state conflicts (e.g. chicken cashout on an inactive round) to 409.
- All smoke checks pass: coinflip/roulette replays are idempotent, five raced same-operation coinflip requests settle exactly once, ledger sums match the wallet, crash/chicken/lottery flows terminate correctly, bad content type is 415, and foreign origins are 403.
- The lottery draw supports an optional `ADMIN_TOKEN` env guard (`x-admin-token` header); without it the demo stays single-account/open. Verified both paths over HTTP.
- Added `web/scripts/smoke.mjs` and `web/scripts/test.mjs` (`npm test`): boots the API on a temp database, runs the suite, and tears down. `npm test` passed on 2026-10-07.
- Added missing `.env.example` (Chunk 0 deliverable) documenting `PORT`, `DATABASE_PATH`, `ADMIN_TOKEN`, and reserved Minecraft bridge placeholders.
- Chunk 9 shared infrastructure is largely present already (`validWager`, `readGameBody`, `settlementPrefix`, `getAction`, `settleActionOrReplay`, `settleLotteryOrReplay`, ledger guards); adding a game means wiring one handler module, not copying a whole game.

## Validation record

Inspected the project directory and ZIP listing/build metadata/README/license/entrypoints directly, plus a bounded search of nearby project directories. Confirmed the folder is not a Git working tree; no worktree could be created. On 2026-10-06, `cd web && npm run build` passed (TypeScript check and Vite build), and `node --check web/server/server.js && node --check web/scripts/dev.js` passed. Direct SQLite inspection confirmed schema initialization and that a failed balance guard leaves the balance, ledger, and game tables unchanged. HTTP smoke testing could not run: localhost listen failed with sandbox `EPERM`, including through the preapproved server command. HTTP concurrency, browser interaction, and persistence over restart remain unverified. The upstream archive remains untouched.

## OpenCode Chunk 1 (2026-10-06)

- Added `web/`: Vite + React + TypeScript demo shell (see `web/README.md`).
- Screens: landing (`/`), placeholder login (`/login`), dashboard, games, wallet, history — all demo-fixture data with a persistent demo banner.
- Typed API boundary at `web/src/api/client.ts`; fixtures at `web/src/api/fixtures.ts`. No real auth/balance/game logic.
- Commands run: `npm install` (react, react-dom, react-router-dom, vite, @vitejs/plugin-react, typescript), `npm run build` (tsc + vite build, passed), `npm run preview` + curl smoke test of `/` and `/games` (200, served built assets). Dev server not separately click-tested; same code path as preview.
- Stack decision recorded as D-006 in `DECISIONS.md`.
- Limitations: fixtures only; no backend, auth, ledger, or payment integration; Q-001–Q-008 largely open; no git repo so no branch/diff record.

## Local backend chunk (2026-10-06)

- Added `web/server/server.js`: local-only API on loopback, SQLite wallet/transaction/game tables, fixed seed user, session/games/wallet/transactions endpoints, and coinflip settlement.
- Added `/games/coinflip`, switched frontend reads behind `web/src/api/client.ts` to HTTP, and labeled the demo seed separately from deposits.
- Coinflip result selection, balance check, debit, and payout occur server-side within a SQLite transaction. Operation IDs are unique and replay requests recover the prior result.
- A read-only review additionally verified replay responses use the original settled balance, and the ledger has SQLite triggers rejecting updates/deletes. UI API failures now show messages, wallet header responds to a settlement event, history formats timestamps, and unknown routes have a fallback. Requests validate JSON content type, payload shape/size, and optional Origin against the local dev allowlist.
- Added start scripts, Vite `/api` proxy, local run instructions, and D-007. Other games remain planned.
- Follow-up fixes `npm run dev` to start the API first and launch Vite only once the API is ready; API startup failures now stop dev startup instead of generating repeated Vite proxy errors. `PORT` is respected by both API and proxy configuration.
- `npm run build` passed after code and documentation edits. `node --check server/server.js` passed. HTTP API behavior could not be exercised because of sandbox socket policy (`listen EPERM`). SQLite schema and insufficient-funds rollback were inspected directly.
- After the reported Vite `ECONNREFUSED` logs, `npm run dev` was changed to manage both processes. In this sandbox its API child still fails to bind with `EPERM`; the launcher reports that and exits before starting Vite, so no proxy error storm occurs. Final `npm run build` and syntax checks for both JS scripts passed.
- Limitations: shared demo account, no authentication/authorization, no external payment evidence, no transfers, no production deployment or security. Keep loopback/local only.

## Five-game completion and UI overhaul (2026-10-06)

- Added server-settled roulette, crash, chicken, and lottery on top of coinflip. Added dedicated game pages and a shared wallet refresh hook; the game hall and landing/dashboard copy now reflect the five available demo modes.
- Reworked the interface as an editorial “night market” game hall with stronger typography, restrained color, game-specific layouts, and responsive behavior across the app.
- Review fixes: capped chicken at its documented six-level total-return ladder; made chicken steps conditional on the observed prior step; protected cashout credits/ledger rows against duplicate terminal transitions; retained crash wager/payout on refresh and return the true terminal result on late cashout.
- `npm run build` passed after the review fixes, and `node --check server/server.js && node --check scripts/dev.js` passed. HTTP/browser verification remains unavailable because loopback listening is denied here (`EPERM`).
