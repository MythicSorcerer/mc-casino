# Working instructions

## Before changing code or plans

- Read `README.md`, `STATUS.md`, and the relevant section of `ROADMAP.md`.
- Check the actual repository and upstream template; do not treat roadmap examples as implemented behavior.
- Preserve open questions in `DECISIONS.md`. Do not silently turn an assumption into a requirement.

## Product and security invariants

- The server is authoritative for identity, balances, wagers, game outcomes, and payouts. Never trust browser-provided balances, outcomes, or payout amounts.
- Record economy changes in an auditable append-only ledger. Make balance checks, debits, game creation/resolution, and payouts atomic where applicable.
- Make payment ingestion and withdrawal processing idempotent. Retries and duplicate events must not issue duplicate credits or payments.
- Keep credentials and temporary tokens out of source control, logs, browser storage, and user-facing errors. Use least-privilege, revocable credentials and transport security.
- Treat Minecraft chat as untrusted input. A parsed chat line alone is not sufficient evidence of a payment until its provenance and format have been validated against the server integration.
- Keep game randomness and time-sensitive decisions server-side; document the chosen design before implementation.
- Do not add real-money support. The roadmap describes Minecraft server currency; any change to that scope requires an explicit product decision and appropriate review.

## Changes and validation

- Keep documentation aligned with the code and record material architecture or product decisions in `DECISIONS.md`.
- Do not claim a milestone is done until its acceptance criteria are met and the relevant build/checks have actually run.
- Prefer small, reviewable changes. Do not commit or publish unless asked.
