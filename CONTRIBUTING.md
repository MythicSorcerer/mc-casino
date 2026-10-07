# Contributing

The project is currently in planning; this guide sets expectations for future changes.

## Workflow

- Read `AGENTS.md`, `STATUS.md`, and the relevant roadmap section before starting.
- Make changes within an agreed milestone and keep scope tied to an acceptance criterion.
- Update documentation when behavior, setup, architecture, security assumptions, or decisions change.
- Keep credentials, local databases, build outputs, and personal data out of version control.
- Include the checks actually run in the change summary. Do not describe unrun checks as passing.

## Economy and bridge changes

Changes to balances, payments, game settlement, identity linking, or admin controls require explicit reasoning about atomicity, idempotency, authorization, failure recovery, and auditability. Add coverage for retries and concurrent operations when implementation and test infrastructure exist.

## Pull request checklist

- [ ] Scope matches a roadmap item or recorded decision.
- [ ] Acceptance criteria and relevant validation are described.
- [ ] Ledger and payment behavior is safe under retry and failure.
- [ ] User-facing behavior and operational impact are documented.
- [ ] `STATUS.md` and decision records reflect material changes.
