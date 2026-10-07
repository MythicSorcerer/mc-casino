# Project plan

This is a compact companion to [ROADMAP.md](ROADMAP.md), not a replacement for its milestone breakdown. The roadmap is aspirational and must be updated as implementation reveals constraints.

## Product objective

Build a web experience where authenticated Minecraft players can use a server-currency wallet to play games, with a small Fabric client connecting the web service to the Minecraft server's payment mechanism.

## MVP boundaries

Intended: login, wallet and transaction history, deposits and withdrawals, and the games listed in the roadmap. The first release should favor a reliable ledger and payment flow over additional games or elaborate administration.

Out of scope until explicitly decided: real-money wagering, public launch, a general-purpose bot/control platform, sophisticated scheduling, and any additional game mechanics not needed for the MVP.

## Delivery principles

1. Reconnaissance and decisions precede implementation.
2. Establish the web/backend stack and a runnable skeleton before game work.
3. Implement identity and the transactional wallet before wagers.
4. Prove the payment bridge in a controlled environment before enabling deposits or withdrawals for users.
5. Build one complete game as the reference pattern, then add games.
6. Exercise concurrency, retries, disconnects, and duplicate events before calling the end-to-end milestone complete.

## Completion expectations

Each roadmap milestone should have observable acceptance evidence: commands run, paths/flows demonstrated, and known limitations recorded in `STATUS.md`. Never infer completion from a plan or a successful build alone.

## Open dependencies

- Identify the existing temporary-token auth and `isekai-utils` references mentioned in the roadmap, and verify their current availability and ownership.
- Inspect the actual `/pay` behavior and the Minecraft server's exact payment message/event format.
- Choose the web stack, database, hosting model, domain, and deployment owner.
- Decide how wallet credits are backed by server currency, who may operate the connected Minecraft account, and how failed or ambiguous transfers are reconciled.
- Replace or adapt the starter archive only after confirming its compatibility and distribution/license requirements.
