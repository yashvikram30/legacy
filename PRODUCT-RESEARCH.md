# Legacy — product research

What the project is, what it already does, and where the highest-value additions are.
Research as of **2026-10-02**, derived from the code at `upstream/main` (identical to local `main`).
Chain-agnostic on purpose — none of this assumes Monad.

---

## 1. What the project is

**A non-custodial inheritance protocol for onchain assets.**

A crypto holder's assets die with their private key. Legacy solves that without a custodian, a lawyer, or trust between the owner and their heirs. The owner proves they are alive on a schedule; if they stop, named heirs can claim the assets allocated to them — enforced entirely by contract.

The product framing in the README is unusually disciplined and worth preserving: **"a bank vault, not a dashboard."** Every action is treated as weighty rather than as a casual form submission. That is a real design position, and it is the right one for software that moves irreversible inheritances.

### The one architectural decision that defines everything

**The vault never holds assets.** This is the thing to understand before proposing any feature.

From `IVaultExecutor.sol`:

> *"A LegacyVault never holds assets directly (strict non-custodial trust model, decided 2026-09-11). Instead, each supported asset type implements this interface so the vault's state machine can gate control transfer without knowing the underlying asset mechanics."*

So the vault is a **permission gate over standing approvals**, not a safe. The owner keeps full custody and grants an allowance to a per-asset adapter contract; at succession, the vault authorises that adapter to pull the asset from the owner's wallet directly to the heir.

This is a genuinely excellent decision. It means:
- The owner never gives up control, and keeps using their assets normally.
- There is no honeypot — no pooled TVL to attack, and a bug cannot drain a treasury that does not exist.
- The protocol stays asset-agnostic: new asset types are new adapters, not new vault logic.

It also creates the specific set of consequences that §4 is mostly about, because an *allocation is a promise backed by an approval*, not an escrowed balance.

---

## 2. What already works

Verified by reading the code, not the README. `forge test` → **144 passing across 9 suites**, including a dedicated adversarial suite.

### Contracts (`legacy-contract/`, ~933 lines)

| Capability | Detail |
|---|---|
| **Vault factory** | Per-owner minimal-clone deployment (`LegacyVaultFactory`) |
| **Liveness state machine** | Green → Amber → Red, computed **lazily** from block timestamps in a `view` function. No keeper, no cron, no upkeep transaction. |
| **Identity-bound check-in** | World ID proof bound to **one nullifier at vault creation**; every later check-in must present that same nullifier. Proves *continuity of person*, not just key control. |
| **Configurable timelocks** | `checkInInterval`, `gracePeriod`, `contestableWindow` — mutable only while Green, which is the correct safety property |
| **Heir registry** | Add/remove, locked once the vault leaves Green |
| **Guardian death attestation** | Owner nominates guardians; **unanimous** attestation collapses every timelock to **1%**. An owner check-in **resets all attestations** — a well-chosen defence. |
| **Per-asset allocation** | `assetId → (heir, executor adapter)` |
| **Claim lifecycle** | `initiateClaim` (permissionless) → contestable window → `finalizeClaim` → `executeClaim(assetId)` per asset |
| **Wrongful-claim defence** | An owner check-in during the contestable window **invalidates the claim** |
| **Adapters** | ERC-20 (fixed amount), ERC-721 (specific tokenId), ENS (name transfer) |
| **Safety** | `nonReentrant` on execution, rich custom errors (33 of them), full event coverage |

### Frontend (`legacy-frontend/`, Next.js 16 / React 19)

Four surfaces: **landing**, **`/vault`** (owner), **`/claim`** (heir), **`/lookup`** (public transparency).

- **Vault lifecycle UI** — creation and deployment modals, parameter rails, heir/guardian/asset management
- **Liveness UI** — `RadialChronometer`, `StatusLamp`, `LivenessPanel`, `PipelineVisualizer`, `ActivityLog`, `WatchdogAlertPanel`
- **Sealed inheritance messages** — text *and video* for heirs, **genuinely end-to-end encrypted**: the heir derives an X25519 keypair from a deterministic `personal_sign`, the owner seals to that public key with an ephemeral key + XChaCha20-Poly1305. The owner **cannot read the message back**, and no key material ever reaches the server. This is the most underrated thing in the codebase.
- **Notifications** — email + web push, per-vault subscriptions with configurable alert thresholds, claim alerts, heartbeat monitoring
- **Public transparency lookup** — anyone can inspect a vault's status by address

### Honest summary

The protocol core is **solid and well-tested**, the trust model is **better than the pitch claims**, and the design language is **distinctive**. What is thin is the layer between "the contract is correct" and "a family can actually rely on this" — which is exactly where the best contribution opportunities are.

---

## 3. The gap worth understanding first

Because the vault holds nothing, an allocation only pays out if, at claim time:

1. the asset is **still in the owner's wallet**, and
2. the **approval to the adapter is still in place**.

Neither is guaranteed. The owner may spend the tokens, sell the NFT, or revoke the approval — all normal, legitimate actions, none of which notify anyone or change how healthy the vault looks.

**Every adapter already implements the check for this.** From `ERC20Adapter.sol`:

```solidity
function checkOwnership(address expectedOwner) external view returns (bool) {
    return token.balanceOf(expectedOwner) >= amount
        && token.allowance(expectedOwner, address(this)) >= amount;
}
```

`checkOwnership` is in all three adapters and present in the frontend ABIs — **and is never called anywhere in the UI** (it appears only in `abis.ts` and `adapters.ts` as a definition, in no component).

So today a vault can display as perfectly healthy, green lamp and all, while being **guaranteed to deliver nothing**. The owner has no way to find out, and the heir discovers it at the worst possible moment. This is not a flaw in the architecture — the architecture is right, and it even built the sensor. The sensor just isn't wired to a dial.

That is the single best first contribution, and it's §4.1.

---

## 4. Features worth adding

Ordered by value ÷ effort. The first three are the ones I'd argue for.

### 4.1 Allocation health — "will this actually pay out?" ⭐ *start here*

Call `checkOwnership()` for every allocation and surface the result as first-class UI: per-asset **Funded / Underfunded / Approval revoked**, and a single vault-level readiness indicator.

- **Effort:** low — the contract work is done, it's a `useReadContract` per allocation plus design
- **Value:** very high — it closes the loop on the product's core promise
- Pairs naturally with the existing notification system: *"Your allocation to Priya is no longer funded."* The dispatcher, thresholds and subscription model already exist.
- Also gives `/lookup` real substance: an heir could verify their inheritance is genuinely backed **before** anyone dies.

### 4.2 Native asset (ETH / MON) inheritance

Currently impossible — you cannot `approve` a native balance. `AssetList.tsx:395` tells users outright to *"wrap your ETH into WETH."*

For most people the native token **is** the holding. This is the largest functional gap in the product.

Three routes, in increasing ambition:
- **Auto-wrap at assign time** — assign native, UI wraps to WETH/WMON, reuse `ERC20Adapter` unchanged. Pragmatic, ships fast, and honest about what happened.
- **Opt-in custodial native sub-vault** — only native funds, clearly labelled as the one custodial component. Needs careful framing against the non-custodial pitch.
- **EIP-7702 delegation** — the owner's EOA delegates to a contract that can move native on succession. Most elegant, most research.

I'd ship auto-wrap and write up the others.

### 4.3 Proportional allocations

Adapters hard-code `uint256 public immutable amount` at deploy time. So *"split everything 50/50 between my children"* — how real wills are actually written — **cannot be expressed**. Worse, a fixed amount silently misallocates as a portfolio grows or shrinks.

A `PercentageERC20Adapter` reading `balanceOf(owner)` at claim time and transferring a basis-point share fixes it. Needs care on ordering (claims executing at different times see different balances) — a snapshot taken at `finalizeClaim` resolves it cleanly.

### 4.4 Collapse the per-asset deployment cost

Every allocation deploys **its own adapter contract** (immutable token + amount + vault). Three assets across two heirs = **six contract deployments**, each a transaction the owner personally signs and pays for.

A singleton adapter per asset *type*, with allocation parameters stored in a registry keyed by `(vault, assetId)`, collapses this to one deployment plus cheap registrations. Large gas and UX win; moderate contract refactor. This is the change that makes a 10-asset vault realistic.

### 4.5 The heir experience

Today an heir needs to already know the vault address. Yet an heir is the **least likely person in the system to be crypto-native** — and they arrive during bereavement.

- **Heir invitations** — notify someone they've been named, with a verification flow
- **Reverse lookup** — *"vaults where I am an heir"* (needs indexing, §4.8)
- **Embedded-wallet onboarding** — an heir may have no wallet at all; passkey/email wallets (Privy, Turnkey, Para) make inheritance reachable for a non-technical spouse. Note this interacts with the sealed-message design, which derives the heir's decryption key from a wallet signature.
- **A guided claim walkthrough** — the claim page currently assumes the heir understands contestable windows

### 4.6 Conditional and staged inheritance

The clearest differentiator versus a plain dead-man's switch, and what makes this feel like an actual will:

- **Tranches** — 25% per year over four years
- **Age gates** — a grandchild inherits at 18 (needs an attested birth date or guardian release)
- **Survivorship ordering** — if heir A doesn't claim within N days, the allocation falls to heir B

### 4.7 Recovery paths

The sharpest residual risk: **if the owner loses their key or their identity credential, the vault marches to Red and heirs inherit while the owner is alive.** The contestable window is a partial defence, but only if the owner notices.

- **Guardian-assisted recovery** — M-of-N guardians restore liveness or rotate the owner's credential
- **M-of-N guardian attestation instead of unanimity** — unanimity is brittle (one unreachable guardian disables the feature) *and* collusion-prone at small N. A threshold with a notification to the owner on each attestation is strictly better. Worth an explicit threat-model note either way.

### 4.8 Indexing / subgraph

Event coverage is already excellent — 15 events spanning every state transition — but nothing indexes them. A subgraph unlocks §4.5's reverse lookup, real activity history, portfolio-wide views, and a far richer `/lookup`. Low risk, high leverage, and it does not touch the protocol.

### 4.9 Reduce check-in friction

Missing a check-in is the main way a healthy vault fails. Today it costs an identity proof plus a transaction.

- Tie the existing reminder system to a **one-tap check-in** link
- **Session-key or delegated check-ins** for a bounded period
- **Asset discovery at setup** — auto-detect the owner's tokens and NFTs instead of asking for contract addresses by hand

### 4.10 Multi-owner vaults

`address public owner` is singular. Couples with shared assets are an obvious and large audience; joint vaults with either-survivor rules are a natural extension.

---

## 5. If I were picking

**First contribution: §4.1 allocation health.** Small, self-contained, needs no contract changes, and it fixes the one thing that can make the entire product silently fail to deliver. It is also the fastest way to learn the codebase end to end — it touches adapters, the vault ABI, the owner dashboard, `/lookup`, and the notification pipeline.

**Then §4.2 native assets** (biggest functional gap) and **§4.8 indexing** (unlocks several later features and is protocol-risk-free).

**Discuss before building:** §4.4 and §4.3 are contract refactors and should be agreed with the team first. §4.7's guardian-threshold change alters the security model and deserves a written threat model rather than a PR.

---

## 6. Open questions for your senior

1. Is the **approval-based, zero-custody** model a hard constraint, or is a clearly-labelled custodial path acceptable for native assets (§4.2)?
2. What's the intended **primary chain**? Several ideas (native wrapping, embedded wallets, indexing) have chain-specific answers.
3. Who is the **target user** — crypto-native self-custodians, or ordinary people with some crypto? §4.5 is the whole roadmap if it's the latter, and barely matters if it's the former.
4. Is `/lookup` meant as a **public good** (anyone verifies any vault) or a convenience for participants? It changes how much to invest in §4.1 and §4.8.
5. Is **guardian unanimity** deliberate, or inherited from an early draft (§4.7)?
