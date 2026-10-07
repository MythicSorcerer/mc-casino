# Operations

## Current state

There is no runnable application, deployment configuration, or configured environment in this directory. The commands in the roadmap are examples, not confirmed commands for this project.

## Before local development

1. Confirm this directory is the intended project root and locate the referenced web/auth/payment code.
2. Choose and record the web stack, database, Java/Fabric compatibility, and supported local services.
3. Add a dependency manifest and lockfile, `.env.example` containing names and safe placeholders only, and a documented setup command.
4. Keep real secrets out of the repository. Use a disposable development Minecraft server/account and test currency.

## Deployment requirements (planned)

- Separate development, staging, and production credentials/data.
- Back up the database and test restoration before launch.
- Apply schema migrations in a controlled, observable release process.
- Monitor service health, bridge connectivity, pending transfers, ledger reconciliation, and error rates.
- Alert on stuck withdrawals/deposits and ledger invariant violations.
- Keep an operator runbook for bridge credential revocation, disconnects, ambiguous payouts, refunds, and restoration.

## Incident handling

For any suspected duplicate/incorrect transfer or ledger mismatch: stop new withdrawals, preserve logs and event IDs, avoid manual balance edits, compare the web ledger with authoritative Minecraft records, document the reconciliation, and resume only after the cause and recovery are verified. Record manual adjustments as audited compensating ledger entries.

## Build and release

No commands have been verified. Once the web stack and template use are decided, document exact install, development, format/lint, typecheck, test, build, migration, and rollback commands here. A green compile alone is not evidence that economy flows are safe.
