# Week one (optional)

Ruthlessly prioritized - what ships first and why, if I joined this project for real next week.

1. **Fix the auth cookie/CORS mismatch and ship real JWT login** - done in this submission, but it's the literal headline bug: nothing authenticated works without it, so it blocks every other feature.
2. **`GET /api/holdings` + one real dashboard view** - done here too. Highest-visibility proof the split backend actually works end to end, and the template for every other view that's still mocked.
3. **A decimal type for `Holding.amount`, before real money touches it** - floats are fine for this assessment's demo data; they are not fine the first time a partial gram transfer produces `0.1 + 0.2` in production. One-line schema change now is cheap; a migration after real balances exist is not.
4. **The vault-deposit attestation process, even manual** - `mintAgainstDeposit`'s replay-guard design (`docs/03-token-design.md`) is worthless without *something* producing `attestationId`. Start manual (compliance officer verifies a custodian report, hashes it, calls mint) - the contract doesn't care that the oracle is a person yet.
5. **The redemption ordering as actual code, not just the design doc** - `docs/04-integration.md`'s escrow-then-burn flow is the highest-consequence piece of logic in the whole system (it's the one place a bug destroys real backing with no undo). Build and test it before building anything downstream of it.
6. **wagmi + a live balance check at redemption time** - the one place a stale Mongo projection is a real risk (docs/04-integration.md), not just a UX nicety.

**Not doing yet, and why:**
- **The event indexer / reconciliation job** - real engineering effort (reorg handling, idempotency, a scheduled job) that only pays off once there's on-chain activity worth indexing. Building it against an empty contract is building against a guess.
- **ERC-3643 migration** - the hybrid design in `docs/03-token-design.md` is deliberately the cheaper path until APAX actually needs claim-based, multi-jurisdiction compliance rules. Don't pay T-REX's deployment cost for a requirement that doesn't exist yet.
- **The remaining mocked views (Zakat, vault totals, live price feed)** - real, but strictly lower-stakes than money movement. They come after redemption, not before.
