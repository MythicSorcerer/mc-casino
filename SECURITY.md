# Security requirements

This is a design baseline for a planned system. No implementation has been reviewed.

> **Legal warning:** Mythic's Casino MUST NOT operate with any currency that can be purchased with or exchanged for real money. Any future deployment using purchasable or redeemable currency is out of scope and legally risky.

## High-value assets

- Wallet balances and append-only transaction records.
- Minecraft account/session and bridge credentials capable of moving server currency.
- User sessions and Minecraft-to-web account links.
- Game state, outcomes, and settlement records.

## Required controls

- Enforce authorization and validation on the server for every wallet and game operation.
- Use atomic ledger operations, integer amounts, database uniqueness constraints, and idempotency keys for deposits, withdrawals, bets, and payouts.
- Do not expose bridge credentials to browsers. Store secrets in the deployment secret manager or protected environment, scope and rotate them, and redact them from logs.
- Authenticate and encrypt bridge traffic; reject stale/replayed commands and events. Restrict the bridge to explicit operations and command arguments.
- Use secure session handling, CSRF protection where cookie authentication requires it, rate limits, and account-linking verification.
- Generate outcomes on the server using an appropriate cryptographic random source; persist enough audit information to diagnose settlement without leaking future outcomes.
- Validate payment evidence from an authoritative source. Chat parsing requires documented anti-forgery controls and duplicate handling.
- Log security-relevant events without tokens, session cookies, or unnecessary personal data. Define retention and access controls.
- Protect administrative functions, especially manual lottery draws, refunds, and reconciliation, with authorization and audit records.

## Abuse and failure cases to cover

Duplicate/replayed payments; spoofed chat; altered amounts/players; concurrent bets against one balance; double clicks; modified browser requests; cross-account withdrawals; bridge impersonation; reconnect retries; timeout after payment execution; game refresh/reconnect; multiple tabs; database rollback; compromised bridge credential; and unauthorized manual settlement.

## Release gate

Before enabling transfers, document the threat model, validate identity linking, exercise duplicate and ambiguous outcomes, and provide an operator reconciliation procedure. See [payment bridge](docs/payment-bridge.md) and [operations](OPERATIONS.md).

## Reporting

No public security contact has been set. Add a monitored contact and private reporting process before public deployment. Do not publish credentials or exploit details in public issue trackers.
