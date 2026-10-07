# MVP roadmap

## Chunk 0 — Project reconnaissance + architecture

**Agent:** Codex  
**Session:** 1  
**Goal:** Establish what is verifiably available and record the missing inputs before implementation.

Have Codex:

- inspect the repo
- find/reuse the existing temporary-token auth
- find `isekai-utils`
- determine how `/pay` works
- determine exact Minecraft chat payment message format
- inspect existing package/tooling conventions
- decide final repo structure
- create/update `AGENTS.md`
- create `PLAN.md`
- create `.env.example`
- document the temporary payment bridge

**Verified from this project folder (2026-10-06):** There is no Git repository, app, backend, auth implementation, `isekai-utils` source, or payment bridge. The ZIP is a generic Fabric sample with empty/hello-world entrypoints. See `STATUS.md` and `DECISIONS.md` for evidence. Worktree setup is unavailable until this folder is made a Git repository.

Until the referenced source repositories and project owner decisions are available, this chunk is limited to reconnaissance and documenting blockers. Do not invent a payment format or claim the original acceptance criteria are met.

**Progress note (2026-10-06):** The OpenCode-owned Chunk 1 shell is present, and a local Node/SQLite API plus demo coinflip has since been added (D-007). Chunk 0 still is not complete: referenced auth/payment sources and production stack choices are unavailable, and the original acceptance criteria have not all been verified.

**Do not build the games yet.**

### Done when

```text
pnpm/bun/npm install works
dev server can start
existing auth strategy is documented
payment bridge strategy is documented
architecture is documented
AGENTS.md exists
PLAN.md exists
```

This is a particularly good Codex session because it can investigate rather than prematurely implementing things.

---

# Chunk 1 — Web skeleton

**Agent:** OpenCode  
**Session:** 1  
**Goal:** Get a polished website shell running.

Build:

```text
/
├── landing page
├── login/auth
├── dashboard
├── games
├── wallet
└── history
```

Don't implement actual game mechanics yet.

### UI

You want something that already looks like an actual product:

```text
┌─────────────────────────────────────────┐
│ Mythic's Casino             🪙 12,450      │
├─────────────────────────────────────────┤
│                                         │
│  Games                                   │
│                                         │
│  🪙 Coinflip     🎰 Roulette             │
│  🎟 Lottery      📈 Crash                 │
│  🐔 Chicken                              │
│                                         │
└─────────────────────────────────────────┘
```

### Done when

- website loads
- auth works
- navigation works
- responsive UI
- fake balance can be displayed
- no actual gambling logic yet

---

# Chunk 2 — Database + economy

**Agent:** Codex  
**Session:** 2  
**Goal:** Build the authoritative economy.

**Progress note (2026-10-06):** A local-only SQLite demo ledger and single-user coinflip settlement now exist in `web/server/`. This is implementation groundwork, not completion of this chunk: it has no real identity, production database/migrations, operational controls, or verified concurrent HTTP behavior.

Tables roughly:

```text
users
game_sessions
wallets
transactions
bets
```

I'd make **transactions append-only**.

For example:

```text
+1000 deposit
-100 bet
+195 payout
```

rather than simply mutating:

```text
balance = 1095
```

The balance can be derived/cached, but the transaction ledger is your audit trail.

Implement:

```text
getBalance()
credit()
debit()
createTransaction()
getTransactionHistory()
```

And most importantly:

### Atomic bets

```text
BEGIN

verify balance
debit wager
create game
resolve game
credit payout

COMMIT
```

### Done when

You can run something like:

```text
User has 1000
↓
debit 100
↓
payout 195
↓
balance = 1095
```

and concurrent requests cannot spend the same coins twice.

---

# Chunk 3 — Payment bridge

**Agent:** Codex  
**Session:** 3  
**Goal:** Make Minecraft ↔ website economy work.

This is where your existing auth gets reused.

Build an isolated interface:

```ts
interface PaymentProvider {
    requestWithdrawal(...)
    handleIncomingPayment(...)
}
```

Then:

```text
PaymentProvider
      │
      ▼
MythicMinecraftPaymentProvider
```

It does the ugly stuff:

```text
website
  │
  │ withdrawal
  ▼
Command
  │
  └── /pay Ximo 500
```

and:

```text
Minecraft chat
      │
      ▼
"Uriah has paid you 500"
      │
      ▼
payment parser
      │
      ▼
deposit
```

### Extremely important

Make the chat parser **idempotent**.

If the same chat message is seen twice:

```text
Uriah has paid you 500
```

you must **not credit 1000**.

Give every detected payment an internal ID/hash:

```text
hash(
    player
    amount
    timestamp/window
    raw message
)
```

or, preferably, whatever unique identifier your existing Minecraft/payment system gives you.

For the MVP, even a reasonable deduplication mechanism is vastly better than blindly parsing chat.

### Done when

You can demonstrate:

```text
Minecraft
   ↓ /pay
website wallet increases
```

and:

```text
website withdrawal
   ↓
Minecraft /pay
   ↓
player receives coins
```

---

# Chunk 4 — Coinflip

**Agent:** OpenCode  
**Session:** 2

Implement the first real game.

Something simple:

```text
Coinflip

Bet: [100]

[ HEADS ] [ TAILS ]

Potential payout: 195
```

Backend owns:

```text
randomness
wager
payout
result
transaction
```

Frontend only displays it.

### Done when

Complete flow:

```text
login
→ balance
→ bet 100
→ animation
→ result
→ balance updated
→ transaction recorded
```

This becomes your **reference game architecture**.

---

# Chunk 5 — Roulette

**Agent:** OpenCode  
**Session:** 3

**Local demo progress (2026-10-06):** Implemented as a server-settled European 0–36 wheel in `/games/roulette`, including red/black/green, straight numbers, and low/high bets. This does not complete production auth, RNG audit, or deployment requirements.

Implement:

- red
- black
- green/0
- number bets
- appropriate payouts

Don't go insane with every roulette betting type yet.

MVP:

```text
Red
Black
0–36
```

Potentially:

```text
1–18
19–36
```

### Done when

All wagers resolve server-side and produce proper transaction records.

---

# Chunk 6 — Crash

**Agent:** Codex  
**Session:** 4

**Local demo progress (2026-10-06):** Implemented with persisted server-picked crash time and server-side cashout cutoff in `/games/crash`. Browser chart is visualization only. Multi-tab/browser verification remains unverified because the current sandbox blocks localhost listening.

Crash is more architecturally interesting.

Implement:

```text
Start round
     ↓
multiplier rises
     ↓
player cashes out
     ↓
or crash happens
```

You need server-authoritative timing.

Don't let:

```js
setTimeout(...)
```

in the browser determine whether somebody successfully cashed out.

The server determines:

```text
round start
crash point
cashout timestamp
```

Browser is just visualization.

### Done when

You can have several browser tabs connected to the same round and they all see the same multiplier/crash.

---

# Chunk 7 — Lottery

**Agent:** OpenCode  
**Session:** 4

**Local demo progress (2026-10-06):** Implemented in `/games/lottery` with 25-coin demo tickets, an atomic pool payout, and a manually triggered draw for this single-account demo. The draw is not admin-protected; production scheduling, access control, and browser verification remain open.

Lottery is simpler but introduces scheduled state.

Build:

```text
Current lottery
├── ticket price
├── entries
├── countdown
└── jackpot
```

Then:

```text
draw
 ↓
winner
 ↓
payout
 ↓
new lottery
```

For MVP I'd make the drawing manually triggerable from an admin page.

**Do not build a sophisticated scheduler yet.**

### Done when

You can:

```text
buy tickets
→ see entries
→ admin draws
→ winner receives payout
→ new lottery opens
```

---

# Chunk 8 — Chicken

**Agent:** OpenCode  
**Session:** 5

This can be your second "instant gameplay" game.

Something like:

```text
🐔 Chicken

Cashout multiplier: 1.00x

[ CROSS ] [ CASH OUT ]
```

Each successful step:

```text
1.0x
1.2x
1.5x
2.0x
3.0x
...
```

with server-side outcome.

The exact game design can change; the important thing is establishing the framework for a game with **multiple decisions during one wager**.

### Done when

A player can start → progress → cash out or lose.

---

# Chunk 9 — Game framework cleanup

**Agent:** Codex  
**Session:** 5

**Local demo progress (2026-10-06):** Implemented in `/games/chicken` with server-side 80% crossing checks and a capped gross-return ladder: 1.00×, 1.15×, 1.43×, 1.79×, 2.24×, 2.80×. These are demo rules only; production payout/RNG policy remains open.

At this point, don't add another game.

Refactor.

You should have something approaching:

```ts
interface Game {
    id: string
    name: string

    start(...)
    resolve(...)
}
```

and common infrastructure:

```text
Game
 ├── Coinflip
 ├── Roulette
 ├── Crash
 ├── Lottery
 └── Chicken
```

Extract:

- wager handling
- transaction creation
- game sessions
- result recording
- errors
- authentication
- balance updates

### Done when

Adding game #6 doesn't require copying 500 lines of code from game #5.

---

# Chunk 10 — Command client

**Agent:** Codex  
**Session:** 6

Now build the actual Minecraft-side Command integration.

Keep it **tiny**.

Responsibilities:

```text
authenticate
connect
receive commands
execute Minecraft commands
read relevant chat
send events
```

Something like:

```text
Website/API
     │
     ▼
Command client
     │
     ├── /pay
     ├── chat listener
     └── auth
```

Don't build the giant bot-control architecture yet.

You only need:

```text
/pay
chat payment detection
temporary-token authentication
connection/status
```

### Done when

You can launch the client and see:

```text
✓ authenticated
✓ connected
✓ payment listener active
```

and the website can trigger a real payment.

---

# Chunk 11 — End-to-end demo

**Agent:** Codex  
**Session:** 7

This is the **"holy crap, this actually works" session.**

Don't add features.

Test:

```text
Minecraft player
      ↓
/pay
      ↓
website balance
      ↓
Coinflip
      ↓
win
      ↓
withdraw
      ↓
Command
      ↓
Minecraft player
```

Then:

```text
website
 ↓
roulette
 ↓
crash
 ↓
lottery
 ↓
chicken
```

Test:

- refreshing during games
- double-clicking bet
- two tabs
- insufficient balance
- duplicate chat messages
- disconnecting Command
- reconnecting Command
- withdrawing entire balance
- malicious client requests

### Done when

You can literally sit down with a friend and demonstrate the product without manually fixing the database.

---

# Chunk 12 — Polish for the demo

**Agent:** OpenCode  
**Session:** 6

This is where I'd spend the remaining OpenCode session.

Focus entirely on:

### UX

- animations
- loading states
- errors
- sounds if useful
- responsive layout
- nice game cards
- wallet history
- transaction status

### Presentation

Make it feel like:

> **Mythic's Casino**

rather than:

> `localhost:3000 with five buttons`

This is the session that turns the technical MVP into something you can actually show people.

---

# The resulting split

I'd roughly allocate it:

| Session | Agent | Milestone |
|---|---|---|
| 0 | **Codex** | Recon + architecture |
| 1 | **OpenCode** | Website shell |
| 2 | **Codex** | DB + economy |
| 3 | **Codex** | Minecraft payment bridge |
| 4 | **OpenCode** | Coinflip |
| 5 | **OpenCode** | Roulette |
| 6 | **Codex** | Crash |
| 7 | **OpenCode** | Lottery |
| 8 | **OpenCode** | Chicken |
| 9 | **Codex** | Game framework refactor |
| 10 | **Codex** | Command client |
| 11 | **Codex** | Full E2E testing |
| 12 | **OpenCode** | Demo polish |

So **13 sessions total**.

And importantly, every session should end with:

```text
1. Code works
2. Tests/typecheck/build pass
3. Git diff is sane
4. README/status updated
5. Commit
```

That last part is worth enforcing. Codex's own long-horizon guidance specifically recommends a milestone plan with validation at every milestone and a living documentation/decision record. :chatgpt-content-reference{index="2"}

## I would also put this in the repo

```text
AGENTS.md
PLAN.md
STATUS.md
```

### `AGENTS.md`

Permanent rules:

```text
- Read PLAN.md before substantial work.
- Do not skip existing architecture.
- Never trust the browser with balances, outcomes, or payouts.
- All economy mutations must be transactional.
- Payment ingestion must be idempotent.
- Run typecheck/tests/build before declaring a milestone complete.
- Do not expand MVP scope without explicit approval.
```

Both agents will pick this up automatically. :chatgpt-content-reference{index="3"}

### `PLAN.md`

The roadmap above, with:

```text
[ ] Chunk 0
[ ] Chunk 1
[ ] Chunk 2
...
```

plus acceptance criteria.

### `STATUS.md`

Something like:

```text
# Current Status

Milestone: 4 — Coinflip

Completed:
- Auth
- Database
- Wallet
- Payment bridge

Current:
- Coinflip

Next:
- Roulette

Known issues:
- Payment bridge relies on Minecraft chat parsing
- Command client must remain online for withdrawals
```
