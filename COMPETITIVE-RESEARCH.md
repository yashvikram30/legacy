# Competitive research — onchain inheritance

Who else has built this, what they got right, and where Legacy is genuinely differentiated.
Research as of **2026-10-02**. Written to inform the Metropolis submission (deadline **2026-10-13**).

---

## 1. The headline: Monad asked for exactly what we planned to build

**Track 4 — Trust, Identity & AI Infrastructure** ($30K, split among 3 teams) lists three example projects. The first, quoted verbatim from `monad.xyz/metropolis`:

> **"Passkey-native accounts using P256 and WebAuthn, with no seed phrase"**

The other two are ERC-8004 agent identity/reputation, and provenance for AI-generated media.

This is as close to a direct solicitation as a hackathon gives you. The plan in `METROPOLIS.md` §8 — bind a passkey's P-256 public key at vault creation and verify a WebAuthn assertion on-chain through Monad's `0x0100` precompile (EIP-7951) — is *the first example idea in the track we were already going to enter*.

That changes the pitch from "we ported our World ID app to Monad because World ID isn't available" into "we built a passkey-native succession primitive on Monad, using a precompile Ethereum mainnet doesn't have." Same code, a far better story — and an honest one, because the passkey design genuinely removes trusted parties rather than merely replacing one.

**Judging criteria are not published.** Not on the Metropolis page, not in the FAQ. Plan against the stated submission requirements (OSI licence, public repo with in-window commits, Monad tx hashes, ≤3-min demo showing a real transaction) and treat track fit as the main controllable signal.

---

## 2. Prior art — the uncomfortable part first

Onchain inheritance is one of the **most repeatedly built hackathon ideas in crypto**. Confirmed projects: *Dead Man's Switch* (HackFS 2021), *Afterwise* (ETHGlobal), *Ethernal* (3rd Web Hack), *Cadence Protocol*, *Noah*, *DeadSwitch* (ETHGlobal Cannes 2026), *DeadMan* (HackQuest), *EstateVault*, *Dead Man's Block* (Distributed: Markets, 1st place), plus production products Sarcophagus, Casa, Inheriti, Unchained, Chronolox and Deadhand.

Two honest conclusions:

1. **The category is saturated.** I could not find evidence that any inheritance project has won a *major* ETHGlobal track prize — they appear in showcases, not winners' lists. ("Dead Man's Block" won first at Distributed: Markets, a much smaller event.) A judge in Track 4 has very likely seen this idea before.
2. **Therefore novelty must come from the mechanism, not the premise.** "Crypto inheritance" is not a differentiator in 2026. *How* liveness is proven and *who* has custody are.

The good news: on both of those axes Legacy is already unusual, and §4 shows it is the only project in this set with no custody at all.

### The closest competitor is uncomfortably close

**DeadSwitch** (ETHGlobal Cannes 2026) is, feature for feature, Legacy's *original* design:

| DeadSwitch | Legacy (as inherited) |
|---|---|
| Per-user `InheritanceVault` contract | Per-owner vault clone ✓ |
| Monthly heartbeat, 30-day recovery delay | `checkInInterval` + `gracePeriod` ✓ |
| **Chainlink Automation** as recovery trigger | Vercel cron (and no keeper actually needed) |
| **World ID** sybil-resistance on claims | **World ID** nullifier-bound check-ins |
| **ENS** beneficiary names (`wife.eth`) | **ENS** adapter |
| Ledger ERC-7730 clear signing | — |

**This matters strategically.** Shipping Legacy's World ID + ENS + keeper design would be re-submitting something already built at an ETHGlobal event months earlier. The Monad port forces us off all three of those primitives (World ID and ENS don't exist on Monad; Chainlink Automation isn't on Monad either — `METROPOLIS.md` §7.2), and the passkey replacement is *more* novel than what we'd have shipped otherwise. **The constraint is the differentiator.**

---

## 3. What the competition does well

Worth copying from, with attribution in our own design notes.

### Cadence Protocol — the most sophisticated design in the set
- **2-of-3 guardian attestation** ("Proof-of-Life Consensus") rather than unanimity, plus a 72-hour contestable window. Guardians have **zero fund authority** — they only attest to time.
- **Private allocations.** Heir addresses and shares are *never* stored in plaintext onchain; the contract commits to a 32-byte `allocationRoot` and heirs are ECIES-encrypted client-side, decrypted only in the inheritor's browser.
- **Gasless stealth cancellation.** The owner cancels a false claim by signing an off-chain EIP-712 digest that any relayer broadcasts — so surveillance bots can't track the owner's wallet or front-run recovery, and the owner pays no gas.
- **Streaming distribution** with an immediate emergency buffer, unvested capital earning yield on Aave.
- **Anti-drainer circuit breakers** — if an heir's wallet is compromised mid-stream, unvested funds can be paused and redirected.

### Ethernal
- **Basis-point heir shares** (60/40 splits) with **pull-based payouts**, so an early claimer can't shrink later heirs' shares.
- **"Every owner action is proof of life"** — any transaction resets the timer, not just a dedicated ritual. Elegant, and it removes the main way these systems fail.
- Separate **NFT bequests** from fungible shares; **AES-256-GCM sealed letters** per heir; **guardian veto** with no fund access.

### Sarcophagus / Casa / Inheriti (production)
- Sarcophagus: Arweave permanence + "Archaeologist" node operators. **Its own fatal flaw is instructive** — the incentive model depends on the SARCO token price, and users need two tokens to operate. An independent audit rated it C for "complexity hell."
- Casa: 3-of-5 multisig, rated B+ — best-in-class UX, but **$250+/year and identity verification**, and it depends on the company existing.
- Inheriti: closed-source, so its cryptography can't be independently verified.

**The gap that same audit identifies as still unsolved:** no protocol is simultaneously **trustless, automated, auditable, zero-ongoing-cost and non-custodial**. That is a precise description of the hole Legacy sits in.

---

## 4. Where Legacy is actually differentiated

Only the claims that survive comparison.

| | Legacy | Ethernal | Cadence | DeadSwitch | Sarcophagus | Casa |
|---|---|---|---|---|---|---|
| **Zero custody — vault never holds assets** | **✅ unique** | ❌ deposits | ❌ funds in vault | ❌ deposits | ❌ | ❌ |
| Non-custodial *claim* | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ |
| Owner check-in invalidates a live claim | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| Guardians with zero fund authority | ✅ | ✅ | ✅ | — | — | — |
| E2E sealed messages the **owner can't read back** | **✅ strongest** | ⚠️ AES, off-chain key handoff | ⚠️ allocations only | — | ✅ | — |
| Asset-type extensibility via adapters | ✅ | ⚠️ | ⚠️ | ⚠️ | — | — |
| Zero ongoing cost | ✅ | ✅ | ✅ | ✅ | ❌ token | ❌ $250+/yr |
| Onchain passkey liveness (P-256) | **🎯 planned — nobody has this** | — | — | — | — | — |
| Proportional shares | ❌ | ✅ | ✅ | ⚠️ | — | — |
| Private heir identities | ❌ plaintext | ⚠️ optional | ✅ merkle | ❌ | — | — |
| M-of-N guardians | ❌ unanimous | ✅ veto | ✅ 2-of-3 | — | — | ✅ |
| Native asset (ETH/MON) | ❌ | ✅ | ✅ | ✅ | — | ✅ |
| Gasless claim cancellation | ❌ | — | ✅ | — | — | — |

### The two claims to lead with

**1. Nobody else gives up custody.** Ethernal, Cadence and DeadSwitch all require the owner to *deposit assets into a vault contract*. Legacy's approval-gate model (`IVaultExecutor` — "a LegacyVault never holds assets directly") means the owner keeps using their portfolio normally and there is no pooled honeypot. Among every project surveyed, **this is unique to Legacy**, and it directly answers the one gap the independent audit says is unsolved.

**2. Passkey liveness with no trusted third party.** World ID needs Worldcoin's router *and* our own `RP_SIGNING_KEY`. Chainlink Automation needs a keeper network (and isn't on Monad). Sarcophagus needs token-incentivised nodes. Casa needs Casa. A passkey verified by a precompile needs **nothing and nobody** — and it's Track 4's first example idea.

---

## 5. Features worth adding, re-prioritised against the field

`PRODUCT-RESEARCH.md` ranked features on internal value. This re-ranks them on *competitive and Metropolis* value.

### Tier 1 — do before the deadline

1. **Passkey liveness via the P-256 precompile** (`METROPOLIS.md` §8) — the submission's spine and Track 4's stated ask. Everything else is secondary.
2. **Allocation health / solvency surfacing** (`PRODUCT-RESEARCH.md` §4.1) — *especially* important now. Zero-custody is our headline claim, and its one honest weakness is that an allocation is an approval, not an escrow. `checkOwnership()` already exists in every adapter and is **never called in the UI**. Wiring it turns the weakness into a visible guarantee: *"we don't take custody, and we prove continuously that your inheritance is still funded."* Cheap, and it pre-empts the sharpest question a judge can ask.
3. **Proportional (basis-point) shares** — Ethernal and Cadence both have this; fixed amounts are a visible deficiency, and "split everything 50/50 between my kids" is how wills are actually written.

### Tier 2 — strong differentiators, scope-permitting

4. **M-of-N guardian attestation** instead of unanimity (Cadence's 2-of-3). Unanimity is brittle *and* collusion-prone at small N. Cheap contract change, closes a comparison gap.
5. **Native MON inheritance** — every competitor supports native; we tell users to wrap into WETH (`AssetList.tsx:395`). Auto-wrap at assign time is the pragmatic fix.
6. **Private heir identities** — Cadence's merkle-root commitment. Legacy stores heirs in plaintext *and* exposes them on a public `/lookup` page. Decide whether that's a transparency feature or a privacy bug; it's currently undecided rather than chosen.

### Tier 3 — post-hackathon

7. **Gasless stealth cancellation** (Cadence) — EIP-712 + relayer, so contesting a false claim costs nothing and leaks nothing.
8. **Staged / streaming distribution** and **age gates** — real-will semantics.
9. **"Every owner action is proof of life"** (Ethernal) — any owner transaction resets the timer. Reduces the dominant failure mode (forgetting to check in). Interacts with passkey design; needs thought.
10. **Heir onboarding with embedded wallets**, **indexing/subgraph**, **recovery paths**, **multi-owner vaults** — see `PRODUCT-RESEARCH.md` §4.5–4.10.

---

## 6. Recommended positioning

> **Legacy is a passkey-native, zero-custody succession primitive.**
>
> Your assets never leave your wallet. Your heirs can verify, continuously and publicly, that their inheritance is still funded. You prove you're alive with your fingerprint — no seed phrase, no orb, no keeper network, no subscription, and no third party anywhere in the path. Monad's P-256 precompile makes the proof cheap enough to do onchain.

Three reasons this holds up where "crypto inheritance" alone would not: it names the thing no competitor does (zero custody), it leads with the mechanism rather than the premise (passkeys, not dead-man's-switches), and it maps onto Track 4's first example project without stretching.

**Track: Trust, Identity & AI Infrastructure.** Confirms `METROPOLIS.md` **D1**, now on much firmer evidence than before.

### The three questions a judge will ask, and our answers

1. *"Hasn't this been built before?"* — Yes, repeatedly, and every one of them takes custody of your assets. We don't. Here's the approval-gate architecture and here's the live solvency check that keeps it honest.
2. *"Passkeys don't prove personhood like World ID does."* — Correct, and we're explicit about it. They prove *continuity of a device-held, biometric-gated credential bound at vault creation*. Inheritance doesn't need sybil-resistance — one human, one vault, nothing to farm — it needs no trusted third party, and World ID couldn't give us that.
3. *"What if the owner loses the passkey?"* — The honest current answer is guardians plus the contestable window. A real recovery path (`PRODUCT-RESEARCH.md` §4.7) is the most important thing on the post-hackathon roadmap, and we should say so rather than pretend otherwise.

---

## 7. Sources

[Metropolis](https://monad.xyz/metropolis) · [Ethernal](https://github.com/Georgefifth/ethernal) · [Cadence Protocol](https://github.com/Bobo2005/cadence) · [DeadSwitch (ETHGlobal Cannes 2026)](https://ethglobal.com/showcase/deadswitch-gcu1m) · [Dead Man's Switch (HackFS 2021)](https://showcase.ethglobal.com/hackfs2021/dead-man-s-switch) · [Afterwise](https://ethglobal.com/showcase/afterwise-dez80) · [EstateVault](https://github.com/MaxLaumeister/EstateVault) · [Sarcophagus analysis](https://medium.com/greenfield-one/sarcophagus-decentralized-dead-man-switch-a-self-sovereign-inheritance-protocol-for-the-30108e3d87ff) · [Independent audit of inheritance protocols](https://dev.to/duzf8mjxkvea/i-audited-every-crypto-inheritance-protocol-so-you-dont-have-to-58c8) · [Unchained Inheritance Protocol](https://www.unchained.com/inheritance) · [Dead Man's Block (1st place, Distributed: Markets)](https://bitcoinmagazine.com/culture/hackathon-winner-can-help-pass-your-bitcoins-after-you-die)
