# Decisions and open questions

Use this file for durable choices. Each decision should include date, status, context, choice, and consequences. No product or infrastructure choices below should be treated as final unless marked **Accepted**.

## Accepted

### D-001: The wallet ledger is append-only

- **Status:** Accepted by the existing roadmap.
- **Choice:** Record credits, debits, payouts, and corrections as auditable transactions; balance may be derived or cached.
- **Consequence:** Economic mutations require atomicity, unique operation IDs, and controlled compensating entries rather than silent balance edits.

### D-002: The browser is not authoritative

- **Status:** Accepted by the existing roadmap.
- **Choice:** The backend determines wagers, outcomes, payouts, and balances.
- **Consequence:** Game state and settlement must be persisted server-side.

## Open

### Q-001: Which repositories and systems are in scope?

The roadmap references existing auth, `isekai-utils`, and `/pay` behavior, but none is present here. Identify source locations and owners.

### Q-002: Is the Fabric archive the intended Command client?

The ZIP is a generic Fabric example mod with placeholder metadata. Confirm its role, target environment, license, compatibility, and whether the bridge is actually expected to be a client mod.

### Q-003: What are the web stack and persistence choices?

Select framework/runtime, database, migration approach, deployment target, and operational owner.

### Q-004: What is authoritative payment evidence?

Determine whether `/pay` exposes immutable transaction IDs and success acknowledgments, or whether the integration depends on chat parsing. Define duplicate and ambiguous outcome handling.

### Q-005: How is player identity linked?

Define proof of Minecraft account ownership, stable UUID mapping, unlink/relink behavior, and account recovery.

### Q-006: What currency rules and limits apply?

Define amount precision, minimum/maximum transfers and wagers, rate limits, wallet liability/backing, and who can issue compensating entries.

### Q-007: What game rules and randomness model are required?

Confirm payout tables, house edge, lottery timing, crash/chicken resolution model, audit needs, and rules versioning.

### Q-008: What is the launch context?

Confirm intended audience, access restrictions, hosting, uptime expectations, privacy/retention, and whether only test/server currency is in scope.

### D-003: Divide initial parallel work by product boundary

- **Date:** 2026-10-06
- **Status:** Accepted for task coordination only.
- **Choice:** OpenCode owns a demo-only responsive web shell (Roadmap Chunk 1); Codex owns reconnaissance, template assessment, and project-level architecture/decision documentation. OpenCode's exact scope and handoff are in `OPENCODE.md`.
- **Context:** The existing roadmap assigns most backend, payment, and Minecraft work to Codex and mostly UI/games to OpenCode. This split gives each agent a manageable, distinct deliverable while avoiding concurrent work on payment/economy invariants.
- **Consequence:** Web screens may use clearly labeled fixtures only. They do not establish real auth, balances, or game behavior. This folder currently lacks `.git`, so worktrees cannot be used until a repository is initialized.

### D-004: Fabric archive is an unmodified example template, not the bridge

- **Date:** 2026-10-06
- **Status:** Verified archive contents; intended future use remains open.
- **Choice:** Do not treat or implement the ZIP as an existing payment client. Its entrypoints are example stubs, and no bridge/auth/payment behavior exists in it.
- **Evidence:** `flipcontroller-template-26.3.zip` README says it is a Fabric starter template; `fabric.mod.json` identifies example description/author and CC0-1.0; entrypoint source only logs a hello message or is empty. Build metadata targets Minecraft 26.3 / Java 25.
- **Consequence:** Q-002 remains open. Confirm ownership, target runtime, and whether to adapt this archive before any client work. Template license does not determine this project's license.

### D-005: Existing integration source was not found in nearby trees

- **Date:** 2026-10-06
- **Status:** Search result, not a global absence claim.
- **Choice:** Treat the referenced temporary-token auth, `isekai-utils`, and `/pay` integration as unavailable to this project until source locations are provided.
- **Evidence:** Scoped search across likely neighboring project trees did not locate a matching integration.
- **Consequence:** Do not infer identity or payment formats or build a guessed bridge. Q-001 and Q-004 remain open.

### D-006: Web shell stack (scoped to Chunk 1 demo)

- **Date:** 2026-10-06
- **Status:** Accepted for the Chunk 1 demo shell only; full Q-003 stack/persistence remains open.
- **Choice:** Vite + React + TypeScript SPA in `web/`, using `react-router-dom` for navigation and a small typed API boundary (`web/src/api/client.ts`) backed by labeled demo fixtures.
- **Context:** Stack/database/hosting were undecided (Q-003). A minimal conventional local stack was needed to satisfy Chunk 1 without inventing backend behavior.
- **Consequence:** The shell runs locally with `npm install && npm run dev`; fixtures are replaceable by a real service later. This decision does not settle database, deployment, or auth provider.

### D-007: Local server-authoritative demo economy

- **Date:** 2026-10-06
- **Status:** Accepted for local demo only; not a production architecture decision.
- **Choice:** Add a Node HTTP API and SQLite ledger to the existing web shell. Use one fixed local demo account with a labeled seed balance. Coinflip result selection, balance checks, wager debit, and payout credit happen on the server in one SQLite transaction. Requests carry an idempotency key; unique constraints prevent a repeated operation from settling twice. The browser submits only an integer wager, side choice, and operation ID.
- **Context:** OpenCode’s visual shell existed without a backend, and the owner authorized Codex to finish the project autonomously. This is a runnable, reviewable step toward the server-authoritative economy without inventing the absent auth or Minecraft payment integrations.
- **Consequences/limits:** Local demo only, no authentication/access control, deposits, withdrawals, Minecraft evidence, or real currency. Do not expose the API to a network or treat the seed as backed funds. The service requires the `sqlite3` CLI. This decision does not select production database, hosting, account linking, real RNG/audit policy, or payment protocol; Q-001, Q-004–Q-008 remain open.

### D-008: Five server-settled games for the local demo

- **Date:** 2026-10-06
- **Status:** Accepted for local demonstration only; production rules remain open.
- **Choice:** Implement roulette, crash, chicken, and lottery alongside coinflip, using the local SQLite demo wallet and server-controlled game state. Roulette uses a European 0–36 wheel and gross returns of 2× on even-money bets and 36× on a straight number. Crash uses a stored crash time, accepting cashout only before it. Chicken uses an 80% per-crossing success probability and a capped gross-return ladder of 1.00×, 1.15×, 1.43×, 1.79×, 2.24×, and 2.80×. Lottery tickets cost 25 demo coins; one uniformly selected ticket wins the pool and the demo draw is manually triggered.
- **Context:** The owner asked to finish the games and replace the generated-looking UI after the local API groundwork. Missing production identity, payment integration, hosting, audit/RNG policy, and real currency evidence still block a production implementation.
- **Consequences/limits:** These rules only define a single-account, local demo and can change before production. The lottery draw has no authorization. Local crash/chicken randomness is not certified for production. Keep all balances explicitly labeled as demo and retain Q-001, Q-004–Q-008 for production decisions.
