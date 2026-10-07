# Minecraft payment bridge

## Status

Planned only. The roadmap refers to temporary-token authentication, `isekai-utils`, `/pay`, and a specific chat payment format, but none of those integrations or source repositories are present in this folder. Do not implement by guessing at the message format.

## Intended responsibilities

The bridge is a narrow adapter between the web service and the Minecraft economy. It should:

- authenticate with a revocable, scoped credential;
- report online/connected/ready state and protocol version;
- receive an allowlisted withdrawal instruction and execute the intended `/pay` action;
- forward payment events with their strongest available server-issued unique identifier and provenance;
- reconnect safely and tolerate retries without repeating economic effects.

It must not accept arbitrary Minecraft commands from web clients or decide wallet balances/game outcomes.

## Deposit flow (target)

1. Observe a payment event from the authoritative server integration.
2. Validate sender, recipient, positive integer amount, currency, and event provenance.
3. Persist the raw event reference and normalized event under a unique idempotency key.
4. Apply a single ledger credit transactionally; duplicate deliveries return the existing result.
5. Expose a clear pending/posted/rejected state and retain enough data to reconcile failures.

Prefer a server-issued transaction/event ID. A hash of player, amount, and a time window is only a fallback: two legitimate identical payments can collide, while altered formatting can evade deduplication. Do not use a heuristic as proof of payment.

## Withdrawal flow (target)

1. Authenticate the player and create a durable withdrawal request with an idempotency key.
2. Atomically reserve/debit the requested wallet amount and persist `pending` state.
3. Send a uniquely identified command to the bridge. The bridge acknowledges receipt and reports execution outcome.
4. Persist the final state. On a definite failure, release/refund once; on an ambiguous timeout, reconcile before retrying to avoid paying twice.

The exact reservation model and available `/pay` acknowledgment must be confirmed. Never treat command delivery as proof that the player received the funds.

## Protocol requirements

Before selecting HTTP polling, WebSocket, or another transport, specify message schemas and lifecycle. Every message should carry a protocol version, unique ID, creation time, and correlation ID. Define authentication, replay window, ordering, retries/backoff, duplicate behavior, timeout, and compatibility policy. Keep secrets out of logs and rotate them without requiring source changes.

## Required investigation before coding

- Where is the existing temporary-token auth implemented, and what are its scope, lifetime, revocation, and replay protections?
- What is `isekai-utils`, and does it expose a stable server-side payment event or only chat text?
- Who emits `/pay`, which account executes it, and what does success/failure look like?
- Can the server provide an immutable transaction ID and recipient identity?
- How are Minecraft UUIDs linked to website accounts, and how is account ownership verified?
- What happens during client disconnect, server restart, command timeout, partial execution, or duplicate event delivery?

Document answers and evidence in `DECISIONS.md` before enabling transfers.
