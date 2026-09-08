# APX-Gold token design

**This is a design document. Nothing in it has been deployed, audited, or is claimed to compile-and-pass without further work beyond what's stated below.** The Solidity in this file is unaudited stubs - interfaces, signatures, and NatSpec to communicate intent, not production code.

## What's already in the repo

`smart-contracts/contracts/APAXToken.sol` exists and is real, working code (it has a passing test suite in `smart-contracts/test/APAXToken.test.ts` and a Sepolia deployment address in `shared/constants.ts`). It's worth being precise about what it actually is, because it's a meaningfully different thing from what this document recommends:

- Plain OpenZeppelin `ERC20` + `Ownable`, fixed supply of 1,000,000 tokens minted entirely to the deployer at construction. No further minting, no burning.
- A single boolean whitelist (`approvedHolders`), enforced in `_update`: both sender and recipient must be approved for any transfer (mint and burn are exempted at the zero-address ends).
- One owner (a single EOA or multisig, whichever key holds it) controls the entire whitelist. No role separation, no pause switch, no gram-to-token relationship - it's a fixed-supply membership-gated ERC-20, not yet a redeemable, deposit-backed metal token.

Everything below is the gap between that and APX-Gold as the brief describes it: mint tied to attested vault deposit, burn tied to redemption, and the compliance/pause/role machinery a regulated bearer instrument needs. None of it should be read as a criticism of the existing contract - it's a reasonable starting skeleton for exactly the parts it covers (whitelisted transfer, owner-gated approval); it just doesn't yet cover the parts that make this a *reserve-backed* token.

## Approach: ERC-20 + compliance module vs ERC-3643 vs hybrid

| | ERC-20 + compliance module (extend what exists) | ERC-3643 (T-REX) | Hybrid (ERC-20 interface, ERC-3643-style identity registry underneath) |
|---|---|---|---|
| **Liquidity & tooling** | Best. Every wallet, DEX, block explorer, and indexer already understands ERC-20. Uniswap-style pools, Etherscan reads, wagmi hooks all work with zero custom integration. | Worst today. Wallets show it as an unrecognized token type unless they special-case T-REX; most DEX routers can't route it without an adapter. Institutional custody/compliance tooling that already speaks T-REX is the exception. | Good. Presents a standard ERC-20 ABI to everything external; the identity/compliance layer is an implementation detail behind `transfer`/`_update`, same trick the current `APAXToken.sol` already uses at a smaller scale. |
| **Identity-native compliance** | Bolted on. A boolean whitelist (what exists today) or a claims mapping you maintain yourself - workable, but you're re-inventing an identity registry one requirement at a time. | Native. Built-in on-chain identity registry, claim topics (KYC, accreditation, jurisdiction), and modular compliance rules (max holders, country restrictions, lockups) designed exactly for this. | Same identity registry as ERC-3643, but you own the shape of it - can start as a whitelist and grow into full claims without a token migration. |
| **Gas & complexity** | Lowest. One inheritance chain (`ERC20`, `AccessControl`, `Pausable`), the pattern this repo already has. | Highest. T-REX pulls in an identity registry contract, a trusted issuers registry, claim topics registry, and a compliance contract - four to six additional deployed contracts and their wiring, for a fixed-supply-of-one-asset use case that may not need all of it yet. | Medium. One extra contract (a minimal identity/whitelist registry) instead of T-REX's full suite, but more than the plain-ERC-20 column. |

**Recommendation: the hybrid.** Ship an ERC-20 (keeps every existing tool - wagmi, MetaMask, Etherscan, the eventual DEX listing - working with zero custom integration) with the whitelist logic already in `APAXToken.sol` promoted from a single mapping into its own `ComplianceRegistry` contract, referenced by address so it can be swapped or extended (add claim topics, country codes, accreditation tiers) without redeploying the token. That's the incremental path from what exists today to something ERC-3643-capable later, without paying T-REX's full deployment and gas cost now for compliance requirements this assessment hasn't specified yet. Full ERC-3643 is the right call the day APAX needs multi-jurisdiction claim-based compliance (different rules for accredited US investors vs. retail EU holders, say) - not before.

## Roles

`AccessControl`, not `Ownable` - `Ownable`'s single key is exactly the centralization risk flagged below, and `APAXToken.sol`'s current single-owner model is the first thing this design changes.

| Role | Grants | Held by (recommended) |
|---|---|---|
| `DEFAULT_ADMIN_ROLE` | Grant/revoke every other role | A Gnosis Safe multisig behind a timelock (see Security below) - never an EOA |
| `MINTER_ROLE` | Call `mintAgainstDeposit` | The vault-attestation service's signing key(s), or the multisig if attestation is manual early on |
| `COMPLIANCE_ROLE` | Approve/revoke holders in the registry, freeze/unfreeze a specific account | Compliance officer's operational key, separate from the minter |
| `PAUSER_ROLE` | `pause()` / `unpause()` | The multisig, or an operational security key with a short response SLA |

Separating `MINTER_ROLE` from `COMPLIANCE_ROLE` matters operationally: the person attesting "gold arrived at the vault" and the person deciding "this wallet passed KYC" are different responsibilities, and a compromised minter key shouldn't also be able to freeze accounts (or vice versa).

## Where the transfer restriction is enforced

In `_update` (same hook `APAXToken.sol` already overrides), before calling `super._update`: check `complianceRegistry.isApproved(from)` and `complianceRegistry.isApproved(to)`, skipping the `from` check on mint (`from == address(0)`) and the `to` check on burn (`to == address(0)`) - identical structure to what exists today, just delegating the lookup to the registry contract instead of a local mapping.

## Pausable

`Pausable` from OpenZeppelin, with `_update` also checking `whenNotPaused`. A paused token blocks transfers, mints, and burns - a full stop, not a partial one - because a partial pause (e.g., allow burns during redemption but block transfers) creates exactly the kind of "which invariant still holds" ambiguity that's dangerous to reason about during an incident.

## Mint tied to attested vault deposit

Mint is not "the owner calls `mint()`" (which is all `Ownable` + a hypothetical mint function would give you) - it's a specific function that records what it's minting against:

```solidity
/// @notice Mints tokens against an attested physical deposit.
/// @dev Reverts if `attestationId` has already been used - each physical
///      deposit backs exactly one mint, never more.
/// @param to Recipient of the newly minted tokens (must be an approved holder).
/// @param grams Amount of metal, in grams, this mint represents.
/// @param attestationId Unique identifier from the vault attestation system
///        (an oracle, a signed custodian report, whatever the vault
///        integration provides - see docs/04-integration.md).
function mintAgainstDeposit(
    address to,
    uint256 grams,
    bytes32 attestationId
) external onlyRole(MINTER_ROLE) whenNotPaused {
    if (usedAttestations[attestationId]) revert AttestationAlreadyUsed(attestationId);
    usedAttestations[attestationId] = true;

    uint256 tokenAmount = grams * (10 ** decimals()) / GRAMS_PER_WHOLE_TOKEN;
    _mint(to, tokenAmount);

    emit MintedAgainstDeposit(to, grams, attestationId, tokenAmount);
}
```

The `usedAttestations` replay guard is the important part: it's what stops the same vault deposit from backing two mints, which is the actual failure mode "mint tied to a deposit" is meant to prevent, not just an access-control check.

## Burn tied to redemption

Symmetric to mint, and it's the one that carries the real risk this document ranks first below: burning must never happen before physical fulfillment is guaranteed, only after.

```solidity
/// @notice Burns tokens as the final step of a completed redemption.
/// @dev Must only be called after off-chain fulfillment (KYC/AML re-check,
///      vault allocation, physical dispatch) is confirmed - see the
///      redemption flow in docs/04-integration.md. This function only
///      handles the on-chain half.
/// @param holder Address whose tokens are being burned.
/// @param grams Amount of metal, in grams, this redemption represents.
/// @param redemptionId Unique identifier tying this burn to the
///        off-chain redemption record.
function burnForRedemption(
    address holder,
    uint256 grams,
    bytes32 redemptionId
) external onlyRole(COMPLIANCE_ROLE) whenNotPaused {
    if (usedRedemptions[redemptionId]) revert RedemptionAlreadyUsed(redemptionId);
    usedRedemptions[redemptionId] = true;

    uint256 tokenAmount = grams * (10 ** decimals()) / GRAMS_PER_WHOLE_TOKEN;
    _burn(holder, tokenAmount);

    emit BurnedForRedemption(holder, grams, redemptionId, tokenAmount);
}
```

Note this takes `holder`, not `msg.sender` - a self-service `redeem()` that burns the caller's own tokens is tempting, but it collapses the redemption ordering docs/04-integration.md specifies (escrow first, burn only after fulfillment) into a single transaction with no room for the off-chain steps in between. `COMPLIANCE_ROLE` (or a dedicated `REDEMPTION_ROLE`, if that operational separation turns out to matter) calls this once fulfillment is actually confirmed, not the holder unilaterally.

## Full interface stub

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title APX-Gold token interface
/// @notice UNAUDITED DESIGN STUB - signatures and events only, not an implementation.
interface IAPAXGoldToken {
    event MintedAgainstDeposit(address indexed to, uint256 grams, bytes32 indexed attestationId, uint256 tokenAmount);
    event BurnedForRedemption(address indexed holder, uint256 grams, bytes32 indexed redemptionId, uint256 tokenAmount);
    event ComplianceRegistryUpdated(address indexed oldRegistry, address indexed newRegistry);

    error AttestationAlreadyUsed(bytes32 attestationId);
    error RedemptionAlreadyUsed(bytes32 redemptionId);
    error HolderNotApproved(address holder);

    function mintAgainstDeposit(address to, uint256 grams, bytes32 attestationId) external;
    function burnForRedemption(address holder, uint256 grams, bytes32 redemptionId) external;
    function pause() external;
    function unpause() external;
    function setComplianceRegistry(address registry) external;
}

/// @title Compliance registry interface
/// @notice UNAUDITED DESIGN STUB.
interface IComplianceRegistry {
    event HolderApproved(address indexed holder);
    event HolderRevoked(address indexed holder);
    event HolderFrozen(address indexed holder);

    function isApproved(address holder) external view returns (bool);
    function isFrozen(address holder) external view returns (bool);
    function approveHolder(address holder) external;
    function revokeHolder(address holder) external;
    function freezeHolder(address holder) external;
    function unfreezeHolder(address holder) external;
}
```

## Test plan

A plan, not executed tests - nothing in this table has been run. `smart-contracts/test/APAXToken.test.ts` already establishes the pattern (Hardhat + `ethers` + a deploy fixture) this plan assumes; a Foundry suite would restate the same cases as `test_` functions with `vm.expectRevert`.

| Test | Setup | Expectation |
|---|---|---|
| Mint by non-minter reverts | Deploy, grant `MINTER_ROLE` to nobody but the default admin | `mintAgainstDeposit` from a random address reverts with `AccessControlUnauthorizedAccount` |
| Mint updates supply and emits | Grant `MINTER_ROLE` to `minter`; call `mintAgainstDeposit(holder, 100g, attestationId)` | `totalSupply()` and `balanceOf(holder)` increase by the correct token amount; `MintedAgainstDeposit` emitted with matching args |
| Duplicate attestation reverts | Mint once with `attestationId`; call again with the same id | Reverts with `AttestationAlreadyUsed` |
| Burn on redemption | Holder has a balance; `COMPLIANCE_ROLE` calls `burnForRedemption(holder, grams, redemptionId)` | Balance and supply decrease correctly; `BurnedForRedemption` emitted |
| Duplicate redemption reverts | Burn once with `redemptionId`; call again with same id | Reverts with `RedemptionAlreadyUsed` |
| Transfer to a non-whitelisted address reverts | Holder approved, recipient not | `transfer` reverts with `HolderNotApproved(recipient)` |
| Transfer from a frozen address reverts | Holder approved then frozen via `freezeHolder` | `transfer` reverts even though `isApproved` is still true - freeze is a separate check from approval |
| Transfer while paused reverts | Contract paused via `PAUSER_ROLE` | Any `transfer`, `mintAgainstDeposit`, or `burnForRedemption` call reverts with `EnforcedPause` |
| Role rotation | Admin revokes `MINTER_ROLE` from `minterA`, grants to `minterB` | `minterA` calls now revert; `minterB` calls now succeed |
| Reentrancy on redemption | `burnForRedemption` called on a holder contract with a malicious `tokensToSend`/receive hook (if a hook-based token standard is layered on later) | Call completes without re-entering; state (`usedRedemptions`) is updated before any external interaction, per checks-effects-interactions |

## Security risks, ranked

1. **Never burn before redemption is guaranteed - and know what happens if fulfillment fails after escrow.** This is the highest-ranked risk because it's the one with no clean recovery: if tokens are burned and then the physical redemption can't actually be fulfilled (vault discrepancy, logistics failure, holder's KYC re-check fails after the fact), there's no way to "un-burn" without a governance mint that itself needs its own attestation trail and looks, to an outside observer, exactly like inflating supply without backing. The mitigation is entirely in the ordering, detailed in `docs/04-integration.md`'s redemption flow: escrow or freeze the tokens the moment redemption is requested, run every off-chain check *before* burning, and burn only once physical fulfillment is confirmed - never speculatively. If fulfillment fails after escrow, the tokens are simply unfrozen and returned to the holder's free balance; nothing was destroyed, so there's nothing to reverse.
2. **Centralization and key management for `MINTER_ROLE` and `PAUSER_ROLE`.** A single EOA holding either role is a single point of failure - one leaked key can mint unbacked supply or freeze the entire token. Mitigation: both behind a Gnosis Safe multisig (3-of-5 or similar, tuned to APAX's actual operational headcount) with a timelock on `DEFAULT_ADMIN_ROLE` actions (role grants/revokes) specifically, so a compromised admin key can't silently add a new minter and drain the vault's backing before anyone notices - the timelock's delay is the detection window.
3. **Oracle and attestation trust for vault deposits.** `mintAgainstDeposit`'s `attestationId` is only as trustworthy as whatever produces it. If that's a single custodian's signed report today, that custodian is a trust bottleneck exactly like a centralized price oracle is. Mitigation, roughly in order of maturity: start with a documented manual attestation process (compliance officer verifies the custodian's report, then calls mint) with the report itself hashed into `attestationId` for auditability; move to multiple independent attestors with a threshold (2-of-3 custodians/auditors) once volume justifies the added process; a fully automated on-chain oracle is the long-term goal but shouldn't be the first version - it just relocates the trust problem into "who runs the oracle."
4. **Upgradeability - or the deliberate lack of it.** A proxy pattern (UUPS or Transparent) lets you fix bugs without migrating holders, but introduces storage-collision risk on every upgrade and is one more thing an attacker (or a rushed deploy) can get wrong. Recommendation: **non-upgradeable** for the token contract itself, at least initially - a fixed-supply-tracking, compliance-gated ERC-20 is simple enough that "redeploy and migrate" is a realistic fallback for a genuine bug, and it removes an entire class of proxy-storage vulnerabilities from the audit surface. Put upgradeability in the `ComplianceRegistry` instead, if anywhere - its rules (claim topics, jurisdictions) are the part actually expected to evolve, and its state (the approval mapping) is cheap to re-attach to a new implementation via a proxy specifically scoped to that contract.
5. **The freeze and forced-transfer powers compliance demands, and their governance.** `freezeHolder` (and a forced-transfer function, if a court order or sanctions action requires moving tokens out of a frozen account - not stubbed above, but a realistic addition) are powerful and can look, from a holder's perspective, indistinguishable from theft if used without process. Mitigation: every freeze/forced-transfer emits an event with a reason-code, is logged in an off-chain audit trail with the compliance justification, and (per the multisig point above) is either multisig-gated or has a public, pre-published policy for when compliance can act unilaterally vs. needs sign-off.
6. **Reentrancy on redemption.** `burnForRedemption` only touches this contract's own state and OpenZeppelin's `_burn` (no external calls), so it's low-risk as designed - flagged here because if a future version adds a hook (an ERC-777-style `tokensToSend`, or a callback to notify an external redemption-tracking contract), that's exactly where reentrancy would enter. Mitigation: checks-effects-interactions religiously (mark `usedRedemptions[redemptionId] = true` before any external call, not after), and `ReentrancyGuard` on any function that gains an external call in the future.
7. **Decimals vs. real-world gram precision.** ERC-20's `decimals()` is a display convention, not a currency type - `uint256` arithmetic is exact, but the *conversion* between grams (an off-chain, real-world unit) and token units (`grams * 10**decimals / GRAMS_PER_WHOLE_TOKEN`) is where rounding can silently drift, especially over many small partial mints/burns. This is the same float-precision risk flagged in `docs/00-overview.md`'s backend note about `Holding.amount` - the fix there (store grams as an integer or fixed-point decimal, never a float) matters doubly here because on-chain values are immutable once minted. Recommendation: pick a fixed conversion rate and precision up front (e.g., 1 token = 1 gram exactly, 18 decimals, no separate "GRAMS_PER_WHOLE_TOKEN" scaling at all) rather than a configurable ratio that invites drift.
8. **The supply-vs-vault reconciliation gap.** Even with attested mints and redemption-gated burns, `totalSupply()` on-chain and "grams actually in the vault" off-chain are two separate numbers that can drift apart - a custodian error, a delayed attestation, a bug in the projection Mongo keeps (see `docs/04-integration.md`). Mitigation: a scheduled reconciliation job comparing `totalSupply()` against the latest custodian audit figure, alerting on any discrepancy past a small tolerance, independent of and in addition to the Proof-of-Reserve figures the frontend already displays.
