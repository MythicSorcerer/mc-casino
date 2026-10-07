# Intended architecture

This document describes the target shape from the roadmap. It is not a record of implemented components.

## Components

```text
Player browser ──HTTPS──> Web app / API ──> Database and append-only wallet ledger
                                  │
                                  │ authenticated commands and payment events
                                  ▼
                           Fabric client (planned)
                                  │
                                  ▼
                         Minecraft server / economy
```

The web service owns user sessions, wallet accounting, game rules, and durable records. The browser renders state and submits player choices; it does not decide results or payout values. The Fabric client is a narrow bridge: authenticate, report connection health, execute approved payment commands, and forward verified payment events. It should not become a general remote command executor.

## Trust boundaries

- Browser requests are untrusted, including wager sizes and game actions.
- The web API and database are trusted to enforce authorization, constraints, and atomic ledger updates.
- The Fabric client has access to a privileged Minecraft account and must be treated as a sensitive service credential holder.
- Minecraft chat/events are untrusted until matched to a documented, server-generated payment signal. Message text can be forged or duplicated depending on server permissions and integrations.
- Network links between the service and client require authenticated, encrypted transport, replay protection, and credential rotation/revocation.

## Wallet model

Use an append-only transaction ledger as the source of truth, with an optional cached balance only if updated transactionally. Each financial operation needs a stable idempotency key, actor, amount, currency/unit, reason, related game/payment identifier, and timestamp. Amounts must use integer units. Prevent negative balances and duplicate settlement with database constraints and transactions.

Deposits and withdrawals should be explicit state machines with durable intent and reconciliation. A withdrawal should reserve/debit funds exactly once, issue one payment command, and reach a terminal success/failure state; failures must have a defined refund path. A deposit should be credited only once after validated evidence. Define timeout and manual reconciliation procedures before enabling real transfers.

## Game model

Each game operation is server authoritative. Persist the wager, rules/version, outcome or sufficient audit data, payout, and ledger references. Instant games should settle atomically with the wager. Multi-action games (Crash, Chicken) need durable round/session state and server-time decisions so reconnects or multiple browser tabs cannot alter outcomes.

## Decisions still needed

The web framework, service boundaries, database, transport protocol, auth provider, deployment topology, random-number generation approach, retention policy, and operational ownership are not selected. Record choices and trade-offs in `DECISIONS.md` before implementation depends on them.
