# Blockchain integration design

**Design document, not implemented.** No indexer, reconciliation job, or on-chain read path exists in this repo yet - `server/src/services/blockchain.ts` instantiates an `ethers.Contract` at import time and is never called from anywhere else in the codebase. This document is what would replace and extend it.

## Reading balance and allowance in Next.js: wagmi vs plain ethers

The frontend's role here is narrower than it sounds, because of the source-of-truth decision below: it should be reading balances from the **Mongo projection via the Express API**, the same pattern `/api/holdings` already establishes, not from the chain directly for routine page loads. Direct chain reads are for the specific moments a user needs *current, unprojected* truth - primarily the redemption flow, where showing a stale balance while someone's confirming they have enough to redeem is a real (if small) UX and trust risk.

For those moments:

- **wagmi** is the right default. It gives connect-wallet UI, chain-switching, and `useReadContract`/`useBalance` hooks with caching and refetch-on-block built in - all things a hand-rolled `ethers.Provider` setup has to reimplement. Use it wherever a component needs to read live, or a user is about to sign a transaction (redemption confirmation, wallet connect).
- **Plain ethers** is right for anything server-side - the indexer, the reconciliation job, `scripts/seed.ts`-style one-off scripts - where there's no wallet, no React tree, and no caching semantics to benefit from. `server/src/services/blockchain.ts`'s existing `ethers.Contract` instantiation is the right tool for that context; it's just not wired to anything yet.

Neither is a new dependency concern worth raising here since this doc doesn't recommend adding wagmi to `web/` in this pass - it's the recommendation for whenever the redemption flow is actually built, flagged now so that decision doesn't get re-litigated later without this context.

## Source of truth: chain is authoritative, Mongo is a projection

This repo's own README already states the intended architecture - "the smart contract is the source of truth," frontend never talks to the blockchain directly - and this document keeps that rule. Concretely:

- **The chain is authoritative** for `totalSupply()`, any individual holder's on-chain balance, and every mint/burn event ever emitted. If Mongo and the chain ever disagree, the chain wins, full stop - Mongo is never the tiebreaker.
- **Mongo is a projection**, built by an event indexer, that exists purely so the UI (`/api/holdings`, `/api/activity`) can answer "what does this user hold" in single-digit milliseconds instead of an RPC round-trip per page load. It's a cache with a well-defined rebuild procedure (replay events from genesis, or from the last trusted checkpoint), not a second database of record.

### Event listener / indexer

A long-running service (could live in `server/` as a separate process from the Express API, or as its own small service - separate is cleaner given the two have very different failure modes and restart semantics) that:

1. Subscribes to `MintedAgainstDeposit`, `BurnedForRedemption`, and `Transfer` on the token contract via `ethers`'s event filters (polling `getLogs` over a block range, not raw WebSocket subscriptions - see reorg handling below for why polling-with-a-buffer is preferable to a live subscription for anything that has to be correct, not just fast).
2. Writes each event into an `events` collection first (append-only, keyed by `(txHash, logIndex)`), then updates the derived `holdings` projection from that event. Two steps, not one - the append-only log is what makes reprocessing and reconciliation possible; the projection is disposable and can always be rebuilt from it.
3. Tracks the last processed block number in a `syncState` document, so a restart resumes from there instead of from genesis.

### Confirmation depth

Don't index a block until it has enough confirmations that a reorg reverting it is vanishingly unlikely - for Ethereum L1 (this project targets Sepolia today per `hardhat.config.ts` and `shared/constants.ts`'s chain ID `11155111`), 12-15 confirmations is the standard heuristic; mainnet with real value at stake would want to consider finality (post-Merge Ethereum has actual finalized checkpoints roughly every 2 epochs, ~12-15 minutes, which is a stronger guarantee than a confirmation count and worth using once mainnet is in scope). The indexer should track "latest confirmed block" (`chainHead - confirmationDepth`) separately from "latest chain head," and only process up to the confirmed line.

### Reorg handling

Even with a confirmation buffer, handle the case where a previously-processed block turns out to have been reorged out (rare past the confirmation depth, but "rare" isn't "never"):

- Before processing a block, check its parent hash against what's stored for the previous block. A mismatch means a reorg happened underneath the confirmation buffer.
- On mismatch: walk backwards from the last known-good block until parent hashes line up again, mark every event from the orphaned blocks as `reverted` in the `events` collection (don't delete - the audit trail should show what was reverted and when), and rebuild the `holdings` projection for every account touched by those events from the remaining valid event log.

### Idempotent event processing

Every event's `(txHash, logIndex)` pair is unique and is the natural idempotency key - `insertOne` with that as the primary key (or an upsert keyed on it) means reprocessing the same event twice (a restart mid-batch, a retry after a transient Mongo error) is a no-op the second time, not a double-counted balance. This is the same discipline the backend already needs for `Holding`'s compound unique index (`{userId, assetType}`) - same principle, applied to the indexer's own writes.

### Reconciliation job

Scheduled (hourly is a reasonable starting cadence), independent of the real-time indexer: for a sample of accounts (or all of them, if volume allows) plus `totalSupply()`, compare the projection's numbers against a fresh on-chain read. A mismatch beyond a small tolerance (should be exactly zero for well-formed idempotent processing - any nonzero mismatch is itself the alert) pages whoever owns this system, and logs the discrepancy for the mint/burn reconciliation `docs/03-token-design.md` also calls for at the vault-audit level. Two independent reconciliation checks (this one: projection vs. chain; that one: chain supply vs. physical vault) catch different failure classes and shouldn't be collapsed into one job.

### What the UI shows when the projection lags

The indexer processing a block is not instantaneous, so there's always some window (seconds, under normal conditions) where a just-confirmed mint or redemption hasn't reached Mongo yet. Two reasonable stances, and this project should pick one explicitly rather than leaving it ambiguous:

- **Default:** the UI shows the projection as-is, with the `lastUpdated` timestamp `useHoldingsStore`/`useActivityStore` already track (see `docs/01-frontend-dashboard-migration.md`) visible somewhere - "as of 3s ago" rather than presenting stale data as if it were live. This is consistent with how the rest of the dashboard already treats data (real, but not literally real-time down to the millisecond).
- **For the redemption flow specifically:** don't trust the projection for "does this holder have enough balance to redeem" - read it live via wagmi at the moment of the redemption request, precisely because acting on a stale balance there (letting someone request a redemption for tokens they've already spent, in the lag window) is the one place this matters more than page-load latency.

## Redemption ordering

The rule, stated plainly per the brief: **never burn before redemption is guaranteed.** The flow:

1. **Request** - holder initiates a redemption for N grams of a given metal.
2. **KYC/AML and sanctions re-check** - not a one-time check at signup; re-verified at redemption time, since a physical asset is about to leave custody and sanctions lists change over time. Fails closed: any failure here stops the flow before anything on-chain happens.
3. **Vault allocation and logistics hold** - the physical custodian confirms the specific bars/units are allocated and reserved for this redemption, and (if physical delivery, not just an internal transfer) a logistics/shipping hold is placed.
4. **Tokens escrowed or frozen** - *not burned yet.* Either transferred to an escrow contract/address the holder doesn't control, or frozen in place via `IComplianceRegistry.freezeHolder` from `docs/03-token-design.md` (freezing is simpler - no transfer, no additional approval - and is the better default unless there's a specific reason the tokens need to visibly leave the holder's address, e.g., for a public proof-of-escrow display).
5. **Burn only after off-chain fulfillment is confirmed** - the custodian confirms physical dispatch (or completion of internal transfer, for a non-physical redemption path) *before* `burnForRedemption` is called. This is the step that can't be reordered earlier no matter how much it'd simplify the code.
6. **Audit trail** - every step above writes an `Activity`-style record (same model the dashboard's "recent activity" feed already reads from) with enough detail to reconstruct the full chain of custody later: who requested, who approved KYC, which vault allocation, which txHash for the eventual burn.

**If fulfillment fails after escrow** (the custodian can't actually locate/ship the allocated metal, the logistics hold falls through, a last-second compliance flag): unfreeze the tokens (or return them from escrow) and return the holder to their normal, spendable balance. Nothing was burned, so there's nothing to reverse or make whole - this is exactly why step 4 exists before step 5, and why "burn on request" (a self-service `redeem()` that burns immediately) was explicitly rejected in `docs/03-token-design.md`'s function design. The failure is recorded in the audit trail the same as a success would be, since "redemption was requested and didn't complete" is itself a fact worth being able to reconstruct later.
