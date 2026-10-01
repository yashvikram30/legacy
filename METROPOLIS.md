# Legacy → Monad Metropolis

Working brief. Research as of **2026-10-02**, with a primary-source verification pass the same day (see §7 — it overturned four claims below). Submission deadline **2026-10-13, 11:59 PM ET** — ~11 days.

---

## 1. The competition

**Metropolis** — Monad's six-week global hackathon.

| | |
|---|---|
| Build window | Sep 1 – Oct 13, 2026 |
| Submission deadline | Oct 13, 2026, 11:59 PM ET (rolling submission open; edits allowed until deadline, the version at the deadline is judged) |
| Judging | Oct 14 – 27 |
| Winners | Nov 3, 2026 |
| Prizes | $250K+ total · $30K per track · $25K grand champion |
| Tracks | 4 — one submission competes in exactly one track |
| Team size | 1–5 |
| Extra | Top teams get ecosystem support + invite to a Monad residency program |
| Sponsor bounties | Agora, Nansen, Chainlink, Privy, Alibaba Cloud, Kimi, others |

### Tracks
1. Onchain Finance & Trading
2. **Consumer Products & Payments**
3. Social/Attention & Culture
4. **Trust/Identity & AI Infrastructure**

### Mandatory submission contents
- [ ] Open source under an **OSI-approved license**, public on GitHub during and after the hackathon
- [ ] Public repo with **commit history inside Sep 1 – Oct 13, 2026**
- [ ] **Monad mainnet or testnet deployment, evidenced by transaction hashes**
- [ ] **Demo video ≤ 3 minutes**, public, showing the product in actual operation **including a real Monad transaction**

### Eligibility of an existing project
Allowed — *"you can submit an existing project if the work you submit is new. Bring an existing team and existing context, but what you show on October 13 should have been built during the six weeks."*

**Our status: clean.** All 28 commits in this repo land **Sep 25 – Sep 28, 2026**, inside the window. The Monad port is net-new work and will carry its own commits. No eligibility problem.

---

## 2. What we inherited

Monorepo, two deployable halves. Honest assessment: the contracts are in good shape, the chain wiring is entirely wrong for Monad.

```
legacy/
├── legacy-contract/   Foundry · solc 0.8.36 · 933 lines of src
└── legacy-frontend/   Next.js 16 · React 19 · wagmi 3 / viem 2
```

**Verified locally (2026-10-02):** `forge build` clean, **`forge test` → 144 passed / 0 failed** across 9 suites
(LegacyVault 60, Adversarial 22, GuardianAttestation 19, ERC20 11, ERC721 10, Factory 10, ENS 9, DeployLegacy 1, ByteHasher 2).
Fork suite (`test/fork/ENSFork.t.sol`) excluded — needs a live RPC.

### The product, as built
A per-owner vault clone with a three-state liveness machine driven by owner check-ins:

| State | Meaning |
|---|---|
| Green | Checked in recently. Locked. Owner-only. |
| Amber | Interval lapsed. Grace period running. |
| Red | Grace expired. Heirs may initiate a claim. |

Claim lifecycle is `initiateClaim` → contestable window → `finalizeClaim` → `executeClaim(assetId)` per allocation. An owner check-in during the contestable window invalidates a wrongful claim. Guardians can unanimously attest death, which collapses every timelock to **1%** of nominal (`DEATH_ACCEL_NUMERATOR/DENOMINATOR = 1/100`).

Assets move through an `IVaultExecutor` adapter per asset — ERC20, ERC721, ENS. That indirection is the best structural decision in the codebase and it is what makes the asset side portable.

### Deployed today
`legacy-contract/deployments/worldchain-sepolia.json` — **World Chain Sepolia, chain 4801**. Zero Monad transactions exist.

---

## 3. The porting problem, stated precisely

Not "change the chain ID." Two of the three external primitives this product leans on **do not exist on Monad**.

### 3.1 World ID — the hard one

World ID is the entire liveness mechanism, and it is World Chain / Ethereum only. The router at `0x57f928158C3EE7CDad1e4D8642503c4D0201f611` has no Monad counterpart.

Worse, it is not cleanly abstracted. `LegacyVault` holds a **concrete type**, not an interface:

```solidity
// src/LegacyVault.sol:31
WorldIDVerifierAdapter public verifier;
```

and the Semaphore-shaped proof triple leaks all the way through the public ABI, into the factory:

```solidity
function checkIn(uint256 root, uint256 nullifierHash, uint256[8] calldata proof)
function registerLiveness(uint256 root, uint256 nullifierHash, uint256[8] calldata proof)
function createVault(WorldIDVerifierAdapter verifier, ...)   // LegacyVaultFactory
```

So the port requires a real refactor: an `ILivenessVerifier` interface taking opaque `bytes calldata proof`, with `WorldIDVerifierAdapter` becoming one implementation among several. That is the right change regardless of Monad — it is what lets the liveness primitive be swapped without touching the vault.

**What World ID actually bought us**, worth being precise about because it determines what can replace it: `registerNullifier` binds a vault to exactly one World ID nullifier at creation, and `verifyCheckIn` demands that *same* nullifier forever. The property is **"the same unique human who opened this vault is the one checking in"** — continuity of person, not merely control of a key. Any replacement should preserve continuity-of-credential; proof-of-personhood is the part we may have to trade away.

### 3.2 ENS → NNS

`ENSResolverAdapter` transfers an unwrapped ENS node via `registry.setOwner`. No ENS registry on Monad. The Monad naming layer is **Nad Name Service (NNS)**, `.nad` domains — NFT-based, permanent, one-time fee, with avatar/social/text records. Snowball's Modular Naming Service (MNS) also launched on Monad as a cross-chain alternative.

Since `.nad` names are NFTs, the existing `ERC721Adapter` may cover inheritance of a `.nad` name with no new contract at all — needs verification against the NNS registry. If so, delete `ENSResolverAdapter` from the Monad build rather than porting it.

> **Verified 2026-10-02 — the ERC-721 assumption is NOT yet supported.** See §7.4. The only live NNS contract found (mainnet `0xE18a7550…93Fb`) reverts on `name()`, `symbol()` and `supportsInterface()`, so it is a resolver/registrar, not the token. Every NNS address in the NNS docs' contract table is **empty on both Monad mainnet and testnet** — the Dec 16 2025 testnet reset wiped them and the docs were never updated. The `.nad` token contract address is currently **unknown to us**. Do not plan around `ERC721Adapter` covering `.nad` until that contract is located and `supportsInterface(0x80ac58cd)` returns true.

### 3.3 Off-chain keeper — ~~a credibility problem~~ **not a problem at all**

> **Corrected 2026-10-02.** The original claim here was wrong. There is **no keeper in the liveness path**, so there is nothing to port and nothing to defend.

Read the contract: `getStatus()` is `public view` (`LegacyVault.sol:198`) and derives Green/Amber/Red **lazily from block timestamps**. `initiateClaim()` (`LegacyVault.sol:539`) is `external` with **no access modifier** — any heir can call it themselves. No transaction has to be sent by anyone to advance the state machine.

The Vercel cron (`src/app/api/cron/check-heartbeats/route.ts`) only *reads* state and dispatches **email notifications**. If it stops running forever, every liveness, claim, contest and execution path still works exactly as specified; owners and heirs simply stop getting courtesy emails. That is a convenience layer, not a trust dependency — and it is worth saying so explicitly in the pitch, because it is a genuine strength that the original brief mistook for a weakness.

---

## 4. Monad facts we need

### Networks
| | Mainnet | Testnet |
|---|---|---|
| Chain ID | **143** | **10143** |
| Native token | MON (18 dp) | MON (18 dp) |
| RPC | — | `https://testnet-rpc.monad.xyz` (also QuickNode 50 rps w/ archive, Ankr 300 req/10s, Foundation 20 rps) |
| Explorers | MonadVision, Monadscan, Socialscan | testnet variants of the same |
| Faucet | — | `https://faucet.monad.xyz` |
| Live since | Nov 24, 2025 | reset from genesis Dec 16, 2025 |

Canonical infra already on testnet: wrapped MON, CreateX, EntryPoint v0.6–0.9, Safe v1.4.1.

### Foundry setup — **verified, and both original caveats were wrong**

The right configuration is not an `evm_version` at all. Monad ships first-class Foundry support as a named *network*:

```toml
[profile.default]
network = "monad"      # Monad gas model, opcode pricing, tx rules,
                       # 128 KB contract limit, 256 KB initcode limit
```

1. ~~`evm_version = "prague"`~~ → **superseded.** Use `network = "monad"` with **Foundry ≥ 1.8.0**. Hardfork defaults to the latest (`MonadTen`); pin with `hardfork = "monad:MonadNine"` if ever needed. When forking a live Monad network, Foundry picks the hardfork from the chain ID automatically. Also: do **not** use the old `category-labs/foundry` fork — it tops out at `MonadNine`.
2. ~~"no EIP-1559, use `--legacy`"~~ → **false.** Monad supports tx types **0, 1, 2 and 4**; type 2 (EIP-1559) is fine, base fee and priority fee behave as on Ethereum. Only **type 3 (EIP-4844) is unsupported**. No `--legacy` flag needed.
3. solc ≥ 0.8.27 recommended. We pin 0.8.36 → fine.
4. `optimizer = false` in our `foundry.toml`. Turn it on for a real deployment. **(Confirmed present, §7.1.)**
5. New: watch the **128 KB contract / 256 KB initcode** limits. Not a risk at 933 lines, but the factory's clone pattern should be re-checked after the `ILivenessVerifier` refactor.

### Sponsor leverage
- **Privy** — embedded wallets with passkey / social / email / SMS auth, TEE + Shamir key sharding, server wallets, server-delegated actions. Monad docs ship a Privy template. **Verified (§7.3): listed for both Monad mainnet and testnet, passkeys supported, and Privy is "subsidizing all Monad Testnet usage."** (Para and Turnkey are also free on testnet and support passkeys, if we want a fallback.) Directly relevant: it is both a sponsor bounty *and* the most plausible World ID replacement (§3.1), *and* it fixes the real UX problem that an heir inheriting a vault is probably not a crypto native.
- **Chainlink** — Price Feeds (push) and Data Streams (pull) on **both** Monad mainnet and testnet. **Automation is NOT available on Monad — verified against Chainlink's own supported-networks page (§7.2); Monad appears nowhere on it, mainnet or testnet.** This no longer matters: per the §3.3 correction there is no keeper to replace. Chainlink is therefore *not* a dependency for us, and the plausible sponsor angle via Chainlink is weak unless we invent a price-feed use (e.g. USD-denominated allocations) — which would be scope we don't need.
- **Other oracle/automation options on Monad**, for the record: Chronicle, Pyth (incl. VRF), Redstone, Stork, Supra (incl. dVRF), Gelato VRF (testnet only). **No general-purpose onchain automation/keeper service is documented for Monad by anyone.** Any design that needs a cron must not be chosen.
- Monad docs also carry an **ERC-8004 (Trustless Agents)** guide, which is a Track 4 hook if we want an agent angle.

---

## 5. Gaps a judge will find

Listing these now so they are choices rather than discoveries.

1. ~~**Custodial off-chain tier.**~~ **Mostly a non-issue — verified 2026-10-02.** `src/lib/inheritance/crypto.ts` is genuine end-to-end encryption and **no key material ever reaches the server**: the heir derives an X25519 keypair from a deterministic `personal_sign` signature (so only the heir can re-derive it), and the owner seals to that public key with an ephemeral X25519 key + XChaCha20-Poly1305 — an anonymous sealed box the owner cannot read back. Mongo and Vercel Blob hold **ciphertext only**. The residual, much smaller, honest caveats: (a) the server could withhold or delete ciphertext (availability, not confidentiality) — content-addressed storage would fix that and is a nice-to-have, not a correctness fix; (b) the gate in `api/inheritance/route.ts` that releases ciphertext only after succession is defence-in-depth, not the security boundary. **Say this confidently in the pitch** — it is a differentiator, not a gap.
2. ~~**Trusted keeper in the liveness path.**~~ **Withdrawn — the premise was false.** State is lazily computed `view` and `initiateClaim()` is permissionless; the cron sends emails only. See §3.3. Nothing to fix. (Fortunate, since Chainlink Automation does not exist on Monad.)
3. **Demo-hack floors shipped as protocol constants.** `MIN_CHECK_IN_INTERVAL = 5` and `MIN_CONTESTABLE_WINDOW = 5` — *five seconds*. Great for a 3-minute video, indefensible as a mainnet parameter. Keep them behind a testnet flag, or ship real floors and drive the demo with a dedicated rapid-demo deployment (`script/DeployRapidDemo.s.sol` already exists for this).
4. **No LICENSE file.** Hard submission requirement. Add one (MIT matches the SPDX headers already in the contracts). **Confirmed absent at repo root and in both packages (§7.1) — this is the cheapest blocking fix on the list. Do it first.**
5. **`optimizer = false`.** **Confirmed in `legacy-contract/foundry.toml` (§7.1).**
6. **x402 dependencies with no visible usage.** **Confirmed (§7.1): `@x402/core`, `@x402/evm`, `@x402/svm` appear in `legacy-frontend/package.json` and in zero source files.** Drop them — there is no upside to carrying three unused payment SDKs into a judged submission.
7. **Guardian collusion.** Unanimous guardians cut every timelock by 99%. The owner's own check-in does reset attestations, which is the right defence, but the threat model deserves an explicit paragraph rather than leaving a judge to find it.

---

## 6. Open decisions

Blocking the build. Recommendations given.

**D1 — Track.** → *Trust/Identity & AI Infrastructure.* The product's core claim is a trust-minimized identity-and-succession primitive, and the liveness/personhood work is exactly this track's subject. Consumer Products & Payments is the fallback if we lean on heir UX over the identity mechanism.

**D2 — Mainnet or testnet.** → *Both: testnet for iteration, one real mainnet deployment for the video.* Rules accept either, but a mainnet tx hash in a 3-minute demo is strictly more convincing and chain 143 has been live since November.

**D3 — What replaces World ID.** The pivotal call.

| Option | Keeps personhood | Sponsor bounty | Risk at 11 days |
|---|---|---|---|
| **a. Privy passkey, bound at vault creation** | No — proves credential continuity, not uniqueness | **Yes** | Low |
| b. Self Protocol ZK passport | Yes | No | Monad deployment unverified |
| c. World ID verified off-chain, attested on Monad by a signer | Nominally | No | Reintroduces a trusted signer — contradicts the pitch |
| d. Drop it; check-in is a plain owner signature | No | No | Lowest effort, loses the differentiator |

→ *Recommend (a), behind the new `ILivenessVerifier` interface so (b) can slot in later without touching the vault.* It preserves the property that actually matters (§3.1 — continuity of a credential bound at creation), it is defensible to state honestly that device-held biometric-gated passkeys prove liveness rather than personhood, it wins a sponsor bounty, and the interface refactor is work we owe the codebase anyway.

**D4 — ENS adapter.** → **Verification attempted and inconclusive; see §3.2 and §7.4.** The `.nad` token contract could not be located: the NNS docs' published addresses are dead on both networks post-reset, and the one live contract is a resolver, not an NFT. Two ways forward, and I'd take the second:
- *Chase it:* find a real `.nad` registration tx on MonadVision/Monadscan, read the token contract from its Transfer log, confirm `supportsInterface(0x80ac58cd)`, then reuse `ERC721Adapter` for free.
- *Recommended — cut it.* **Drop name inheritance from the Monad scope entirely** and delete `ENSResolverAdapter` from the build. It is the least load-bearing of the three adapters, it is the only one whose target primitive we cannot even locate, and with ~11 days left it is the obvious thing to trade away. ERC-20 and ERC-721 inheritance already demonstrate the adapter pattern completely, which is the architectural point the adapter was there to make. Revisit only if §3.1 and the deployment land early.

---

## 7. Verification log — 2026-10-02

Every claim in §§1–6 that was marked unverified, plus the ones that turned out to be wrong. Method recorded so any of this can be re-checked cheaply.

### 7.1 Local repo facts — all confirmed
| Claim | Method | Result |
|---|---|---|
| No LICENSE file | `ls LICENSE*` at root + both packages | **Confirmed absent.** Blocking. |
| `optimizer = false`, `evm_version = "cancun"` | read `legacy-contract/foundry.toml` | **Confirmed.** Also: `rpc_endpoints`/`etherscan` sections list only sepolia + worldchain_sepolia. |
| x402 unused | `grep -rn x402 src/ package.json` | **Confirmed** — 3 hits, all in `package.json`, none in source. |
| Only World Chain Sepolia deployed | read `deployments/worldchain-sepolia.json` | **Confirmed.** Chain 4801, factory `0x403985aA…f4c9`. Zero Monad txs. |
| Sealed messages are client-side E2E | read `src/lib/inheritance/crypto.ts` | **Confirmed, and stronger than the brief assumed.** X25519 key derived from deterministic `personal_sign`; XChaCha20-Poly1305 sealed box; no key material server-side. |
| Liveness needs no keeper | read `LegacyVault.sol:198,539` | **Confirmed.** `getStatus()` is `public view`; `initiateClaim()` is `external` with no modifier. Overturns §3.3/§5.2. |

### 7.2 Chainlink Automation — **not on Monad**
Fetched Chainlink's supported-networks page directly. Automation lists 10 mainnets (Arbitrum One, Avalanche, Base, BNB, Ethereum, Gnosis, OP, Polygon, Scroll, ZkSync) and their testnets. **Monad is absent from both lists.** Cross-checked against Monad's own oracles page: it documents Chainlink as Price Feeds + Data Streams only, with no mention of Automation. Two independent sources agree.

### 7.3 Monad network + tooling — confirmed, with corrections
Chain IDs confirmed **by live RPC**, not docs:
- `eth_chainId` on `https://rpc.monad.xyz` → `0x8f` = **143** (mainnet) ✓
- `eth_chainId` on `https://testnet-rpc.monad.xyz` → `0x279f` = **10143** (testnet) ✓

Corrections to §4: Foundry config is `network = "monad"` on **Foundry ≥ 1.8.0**, not `evm_version = "prague"`; and **EIP-1559 type-2 txs are supported** (types 0/1/2/4 yes, type 3 no), so the `--legacy` advice was wrong. Mainnet public RPCs: `rpc.monad.xyz` (QuickNode 25 rps), `rpc1` (Alchemy 15 rps, no debug/trace), `rpc2` (Goldsky 300/10s, historical state), `rpc3` (Ankr 300/10s, no debug). Canonical contracts present: Multicall3 `0xcA11bde0…76CA11`, Permit2 `0x0000…78ba3`, WMON `0x3bd359C1…433A`, EntryPoint v0.6–v0.9, Safe/SafeL2. Privy confirmed on mainnet **and** testnet with passkeys, and subsidized on testnet.

### 7.4 NNS / `.nad` — **unresolved, and the brief's assumption is unsupported**
Probed on-chain via `eth_call`/`eth_getCode`:

| Address | Source | Mainnet | Testnet |
|---|---|---|---|
| `0xE18a7550…93Fb` | search result, "the NNS contract" | **14,761 bytes, live.** Reverts on `name()`, `symbol()`, `supportsInterface()`. Responds to `owner()` → `0xddaa8a9e…52e0`. ⇒ an Ownable **resolver/registrar, not an ERC-721**. | — |
| `0x3019BF1d…1308` | NNS docs, "NadNameService" | **no code** | **no code** |
| `0x6A1c3156…EcC7` | NNS docs, "NNSRegistryAdapter" | **no code** | **no code** |

The documented addresses are dead on both networks — consistent with the testnet reset from genesis on Dec 16 2025, with docs left stale. `docs.nad.domains` could not be fetched (self-signed certificate), which is itself a small signal about how much weight to put on NNS as a dependency. **Conclusion: we cannot currently verify that `.nad` names are ERC-721, because we cannot find the token contract.** Drives the revised D4 → cut name inheritance.

### 7.5 Still open
- **World ID on Monad** — no evidence of any Monad deployment found, consistent with the §3.1 assumption. Treated as settled enough: the port needs `ILivenessVerifier` regardless, so no decision hangs on it.
- **`.nad` token contract address** — only if we reverse the D4 recommendation.
- **Monad mainnet gas cost of a vault clone deploy** — unmeasured. Cheap to find out once `network = "monad"` is set; worth knowing before committing to the mainnet demo deployment (D2).

### 7.6 What the verification changed
Net effect: **the codebase is in better shape than the brief thought, and the Monad port is simpler than it thought.**
- Two of §5's seven judge-facing gaps are **withdrawn** (custodial tier, trusted keeper) — and the first is now a talking point in our favour.
- Chainlink drops out of the plan entirely, which removes a sponsor-bounty option but costs us nothing architecturally.
- The Foundry work is a two-line config change, not a hardfork investigation.
- One new scope cut is justified (D4 / `.nad`).
- **The critical path is unchanged and is entirely §3.1: the `ILivenessVerifier` refactor plus a Privy-backed implementation.** That, a LICENSE file, and a mainnet deployment with tx hashes are the submission. Everything else on this page is secondary.

Sources: [Chainlink Automation supported networks](https://docs.chain.link/chainlink-automation/overview/supported-networks) · [Monad oracles](https://docs.monad.xyz/tooling-and-infra/oracles) · [Monad transactions](https://docs.monad.xyz/developer-essentials/transactions) · [Monad Foundry](https://docs.monad.xyz/tooling-and-infra/toolkits/foundry) · [Monad network info](https://docs.monad.xyz/getting-started/network-information) · [Monad embedded wallets](https://docs.monad.xyz/tooling-and-infra/wallet-infra/embedded-wallets) · [NNS docs](https://docs.nad.domains/developers/contracts/contract-addresses) · [NNS SDK](https://github.com/nadnameservice/nns-ethers-sdk)

---

## 8. Build plan — scoped 2026-10-02, ~11 days

Derived from §7. Sequenced so that a submittable artifact exists from Day 4 onward and everything after is improvement, not completion.

### 8.0 The headline finding — P-256 is a precompile on Monad

**Monad ships P256 signature verification at `0x0100` (EIP-7951, supersedes RIP-7212 — identical address and interface), 6900 gas, fixed 160-byte input.** All Ethereum precompiles `0x01`–`0x11` are present, plus staking (`0x1000`) and reserve-balance (`0x1001`).

This materially upgrades **D3(a)**. The brief assumed Privy would mean binding an *embedded wallet address* and verifying an ordinary `ecrecover` secp256k1 signature — which works, but quietly surrenders the whole liveness story: a wallet signature proves key control, exactly what the vault's `onlyOwner` modifier already proves. It would have been a check-in that proves nothing new.

Instead we can bind **the passkey's raw P-256 public key** at vault creation and verify a **WebAuthn assertion on-chain** at every check-in. That restores the property §3.1 identified as the one that matters — *continuity of a credential bound at creation* — with a stronger claim than World ID gave us on one axis: **no trusted server anywhere in the path.** World ID required Worldcoin's router and our own `RP_SIGNING_KEY`; this requires neither.

Honest framing for the pitch, and worth rehearsing because a judge will ask: this proves **"the same device-held, biometric-gated credential that opened this vault is checking in"** — continuity and liveness, *not* proof-of-uniqueness. A user can enroll two passkeys; World ID's orb could not be duplicated. We trade sybil-resistance (which inheritance does not actually need — one human, one vault, no airdrop to farm) for the removal of every trusted third party (which inheritance needs enormously). That is a defensible, deliberate trade, and stating it plainly is stronger than hoping nobody notices.

> Verification note: precompiles have no bytecode, so `eth_getCode` at `0x0100` returns `0x` — as it does for `ecrecover` at `0x01`. Presence is taken from Monad's precompiles doc, not the RPC probe. **Confirm with a one-line Foundry test against a known EIP-7951 vector before building on it** (§8.1, task 0). This is the single assumption the plan rests on.

### 8.1 Contracts — the critical path

Coupling is smaller than the brief implied. World ID touches **6 lines in `LegacyVault.sol`** (imports/field/initialize/2 call sites) and **2 in `LegacyVaultFactory.sol`**. Everything else is already abstracted.

**Task 0 — de-risk first (≤1h).** Foundry test calling `0x0100` with a known-good and a known-bad EIP-7951 vector, run with `network = "monad"` against a forked mainnet. If this fails, fall back to D3(a)-as-originally-written (Privy wallet + `ecrecover`) and lose only the narrative, not the submission. **Do this before writing anything else.**

**Task 1 — the interface.** New `src/interfaces/ILivenessVerifier.sol`:

```solidity
interface ILivenessVerifier {
    /// @notice Bind `vault` to a credential, once and permanently.
    function registerCredential(address vault, address owner, bytes calldata proof) external;

    /// @notice Revert unless `proof` proves the SAME credential bound at registration.
    function verifyLiveness(address vault, address owner, bytes calldata proof) external view;
}
```

`bytes calldata proof` is the whole point: it makes the Semaphore triple an implementation detail. Preserve the existing non-`view`/`view` split (register writes, verify does not) — it is already correct.

**Task 2 — decouple the vault.** `LegacyVault.sol`: `WorldIDVerifierAdapter public verifier` → `ILivenessVerifier public verifier`; `initialize` takes the interface; `checkIn`/`registerLiveness` take `bytes calldata proof`. Same in `LegacyVaultFactory.createVault`. **This change is correct independent of Monad** and is the one piece of work that improves the codebase whatever happens to the submission.

**Task 3 — `WorldIDVerifierAdapter` implements the interface.** Keep it. It decodes `abi.decode(proof, (uint256, uint256, uint256[8]))` internally and is otherwise untouched. Keeping it compiling and green is what demonstrates the abstraction is real rather than a rename — and it keeps the World Chain deployment alive.

**Task 4 — `PasskeyVerifierAdapter`.** The new work. `registerCredential` stores `(x, y)` of the P-256 public key for the vault, once. `verifyLiveness` decodes a WebAuthn assertion, rebuilds the signed digest as `sha256(authenticatorData ‖ sha256(clientDataJSON))` via the `0x02` precompile, and calls `0x0100`.

Three details that are easy to get wrong and are where the real engineering sits:
- **Replay protection.** The WebAuthn `challenge` inside `clientDataJSON` must bind to a per-vault nonce, or a captured assertion is replayable forever and the check-in is worthless. Use `challenge == keccak256(vault, owner, nonce)` with the nonce incremented on each successful check-in. This makes `verifyLiveness` logically state-changing, so **either** drop `view` for this path **or** keep verification pure and increment the nonce in `LegacyVault.checkIn`. Prefer the latter — it keeps the interface honest and the state in the vault where it belongs.
- **`s`-value malleability.** Reject `s > n/2`. EIP-7951 does not do this for you.
- **clientDataJSON parsing.** Do not write a JSON parser in Solidity. Pass the challenge's byte offset in calldata and assert the bytes at that offset match the expected challenge. Lean on the audited prior art (`webauthn-sol`, Daimo's `P256Verifier`) rather than inventing this.

**Task 5 — delete, don't port.** Remove `ENSResolverAdapter.sol`, `test/ENSResolverAdapter.t.sol`, `test/fork/ENSFork.t.sol`, `test/mocks/MockENSRegistry.sol` from the Monad build, per the revised **D4**.

**Task 6 — tests.** ~37 `checkIn`/`registerLiveness` call sites across 8 files (heaviest: `LegacyVault.t.sol` 15, `security/Adversarial.t.sol` 11, `GuardianAttestation.t.sol` 5). Mechanical, but do it **once** behind a `_checkIn(vault)` helper in the base test contract instead of editing 37 sites — otherwise the next interface change costs the same again. `test/mocks/MockWorldID.sol` already establishes the mock pattern; add `MockPasskeySigner` alongside it. **New tests required: replay rejection, wrong-key rejection, malleable-`s` rejection, nonce monotonicity.** Those four are the ones worth showing a judge.

**Task 7 — config.** `foundry.toml`: add `network = "monad"`, set `optimizer = true` (`runs = 200` already set), add `monad`/`monad_testnet` to `[rpc_endpoints]`. Drop `evm_version = "cancun"` — the network setting supersedes it (§7.3).

### 8.2 Frontend — smaller than expected

World ID appears in exactly **3 files**, and the chain in **1 line**.

| File | Change |
|---|---|
| `src/lib/constants.ts:4` | `id: 4801` → Monad (143 / 10143); update RPC + explorer |
| `src/components/CheckInModal.tsx` | Replace `IDKitRequestWidget` + `parseProof` with a passkey assertion via Privy; the `uint256[8]` plumbing and the 8-tuple types all collapse into one `bytes` |
| `src/app/api/verify-proof/route.ts` | **Delete.** On-chain verification replaces it. |
| `src/app/api/rp-signature/route.ts` | **Delete.** Removes the `RP_SIGNING_KEY` server secret — a real reduction in trusted surface, worth one sentence in the video. |
| `package.json` | Drop `@worldcoin/idkit*` and the three unused `@x402/*` (§7.1); add Privy |

Incidental win: `CheckInModal.tsx:144` currently carries a 300-character error string explaining that the vault is bound to the wrong World ID verifier and the user should go deploy another one. That entire failure mode disappears, and it was a live hazard for a single-take demo recording.

### 8.3 Ordering against Oct 13

Front-loaded so the blocking requirements are done while there is still slack, and the demo is rehearsed rather than discovered.

| Days | Work | Done when |
|---|---|---|
| **Day 1** | **LICENSE (MIT)** — 2 minutes, hard requirement, do it first. Task 0 P-256 spike. `foundry.toml`. Drop x402 + ENS adapter. | License committed; P-256 verified or fallback chosen |
| **Day 2–4** | Tasks 1–3 (interface + decouple + World ID conformance), test helper + 144 tests green again | `forge test` back to green with `bytes` proofs |
| **Day 4–6** | Task 4 `PasskeyVerifierAdapter` + the four security tests | Replay/wrong-key/malleability/nonce tests pass |
| **Day 6–7** | **Deploy to Monad testnet, record tx hashes**, `deployments/monad-testnet.json` | A Monad tx hash exists — submission floor cleared |
| **Day 7–9** | Frontend: chain, passkey check-in, delete the two API routes | End-to-end check-in works against testnet |
| **Day 9–10** | **Mainnet deployment** (D2) + smoke test; rapid-demo deployment for the video (§5.3) | Mainnet tx hashes recorded |
| **Day 10–11** | Demo video ≤3 min; README rewrite; threat-model paragraph on guardian collusion (§5.7) | Submitted |
| **Day 12–13** | Buffer. Do not plan into it. | — |

### 8.4 What we are deliberately not doing

Naming these so they read as judgement rather than omission: `.nad` name inheritance (**D4**, token contract unlocatable — §7.4); any Chainlink integration (Automation absent, and feeds solve no problem we have — §7.2); content-addressed storage for sealed messages (the encryption is already sound; this is availability-only — §7.1); Self Protocol ZK passport (**D3(b)**, slots in behind `ILivenessVerifier` post-hackathon at zero architectural cost — which is the point of Task 1).

### 8.5 The two real risks

1. **Task 4 is the only genuinely novel contract work**, and on-chain WebAuthn parsing is a classic source of subtle, security-relevant bugs. Mitigations: Task 0 spike before committing; audited prior art rather than from-scratch; the `ecrecover`/Privy-wallet fallback stays available until Day 6 and costs only the narrative.
2. **The demo-floor constants** (`MIN_CHECK_IN_INTERVAL = 5`, `MIN_CONTESTABLE_WINDOW = 5` — five seconds, §5.3). Ship real floors in the mainnet deployment and drive the video from the existing `script/DeployRapidDemo.s.sol`. Judges read constants.

**One-line summary of the whole plan:** make the liveness primitive an interface, implement it with a passkey verified by Monad's P-256 precompile so no trusted party remains anywhere in the vault, delete the two primitives that do not exist on Monad, and spend the last three days on a deployment and a video rather than on code.
