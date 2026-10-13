# Legacy

**Passkey-native, zero-custody crypto inheritance on Monad.**

A bank vault, not a dashboard.

Your assets never leave your wallet. You prove you're alive with your fingerprint or face: a passkey, verified fully on-chain through Monad's P-256 precompile. If you stop checking in, the heirs you named can claim exactly what you left them. No seed phrase, no custodian, no lawyer, no oracle, and no server anywhere in the path.

🔗 Live app: [legacy-drab-two.vercel.app](https://legacy-drab-two.vercel.app)

---

## Why it's different

Crypto inheritance has been tried many times. Almost every attempt asks you to **deposit your assets into a vault contract**. Legacy doesn't.

- **Zero custody.** A vault never holds assets. Each allocation is a standing permission: at claim time an adapter moves the asset straight from the owner's wallet to the heir. You keep using your assets normally, and there's no pooled honeypot to attack.
- **Proof that it will pay out.** That model has one honest weakness: if you spend the tokens or revoke an approval, an allocation silently stops being funded. Legacy checks every allocation live and shows owners, heirs and the public whether it would transfer in full **today**, with a one-click fix when an approval lapses.
- **Liveness with no third party.** Check-ins are WebAuthn passkey assertions, verified on-chain by OpenZeppelin's audited WebAuthn library and Monad's P-256 precompile (`0x0100`, EIP-7951). No identity provider, no keeper network, no signing server.

---

## How it works

Every vault moves through three states, computed on-chain from the time of the owner's last check-in. No transaction is needed to advance it.

| State | Meaning |
| :--- | :--- |
| 🟢 **Green** | Owner has checked in recently. Only the owner can act. |
| 🟡 **Amber** | Check-in interval lapsed. Grace period before heirs can act. |
| 🔴 **Red** | Grace period expired. Heirs may open a claim. |

**Owner**
1. Create a vault and set up a passkey on your device (fingerprint, face or device PIN).
2. Add heirs and assign assets: MON or any ERC-20 directly, or NFTs and other assets through an executor adapter. MON is wrapped 1:1 into WMON in your own wallet, because native balances can't be approved.
3. Check in with your passkey on your own schedule. Each check-in restarts the timer.
4. If a claim is ever opened while you're alive, one check-in during the contestable window cancels it.

**Heir**
1. See what you're set to receive, and whether it's still backed, at any time.
2. Once the vault is Red, open a claim, wait out the contestable window, then finalize and transfer.

**Guardians.** Owners can name guardians who can jointly attest to the owner's death. Unanimous attestation shortens every timelock to 1% of normal. Guardians can never move funds, and any owner check-in clears their attestations.

**Inheritance policies.** Owners can describe their wishes in plain language ("split my USDC 60/40, the second share a year later"). The AI will compiler, or a built-in deterministic compiler when no AI key is configured, turns that into a structured policy: beneficiaries, percentage splits, release delays and fallback heirs. The policy is committed on-chain with a verifiable hash, and heirs can see the rules and when each one releases.

**Sealed messages.** Owners can leave text or video for each heir, end-to-end encrypted to a key only that heir can derive from their wallet. The owner can't read a message back once sealed, and the server stores ciphertext only.

---

## Why Monad

- **P-256 is a precompile.** Verifying a passkey signature costs 6,900 gas instead of the 200k+ a Solidity implementation needs, which is what makes on-chain biometric liveness practical.
- **Fast, cheap blocks.** Check-ins, claims and per-asset transfers stay cheap enough for ordinary families.

---

## Security notes

- **What a passkey proves.** A check-in proves the device-held, user-verified credential bound when the vault was set up is still being used. It does not prove the holder is a unique human. That's a deliberate trade-off: inheritance doesn't need sybil resistance (one owner, one vault, nothing to farm), but it benefits greatly from having no third party in the liveness path.
- **Replay protection.** Each check-in signs a single-use challenge bound to the chain, the vault and a nonce. Assertions without user verification, with high-s (malleable) signatures, or for another vault or chain are rejected; there are tests for each.
- **A fixed hijack bug.** An earlier World ID adapter let anyone bind their own credential to someone else's vault before the owner registered, locking them out and letting heirs inherit while the owner was alive. Verifiers now key all state by the calling vault.
- **Lost passkey.** Today the defences are guardians and the contestable window. A dedicated recovery path is the most important item on the roadmap.
- **Not audited.** See the disclaimer below.

---

## Architecture

```
legacy/
├── legacy-contract/   # Solidity + Foundry
└── legacy-frontend/   # Next.js 16 + React 19
```

### `legacy-contract/`
- `LegacyVault.sol`: per-owner vault (minimal clone). Liveness state machine, heirs, guardians, allocations and the claim / contest / finalize / execute lifecycle.
- `LegacyVaultFactory.sol`: creates vaults.
- `interfaces/ILivenessVerifier.sol`: pluggable liveness. Proofs are opaque `bytes`.
- `adapters/PasskeyVerifierAdapter.sol`: WebAuthn passkey liveness, verified on-chain.
- `adapters/ERC20Adapter.sol`, `ERC721Adapter.sol`, `ENSResolverAdapter.sol`: zero-custody asset executors.
- `LegacyPolicyEngine.sol`, `adapters/PolicyERC20Adapter.sol`: committed inheritance policies, with release delays enforced at transfer.
- `adapters/WorldIDVerifierAdapter.sol`: the original World ID liveness verifier, kept for the World Chain deployment.
- Foundry targets Monad (`network = "monad"`, Foundry ≥ 1.8). solc 0.8.36. OpenZeppelin 5.7 vendored.

### `legacy-frontend/`
- Next.js 16, React 19, TypeScript, wagmi / viem, Reown AppKit.
- `lib/passkey.ts`: WebAuthn ceremonies and the exact encoding the contract verifies.
- `lib/allocations.ts`: live "would this pay out today?" checks per allocation.
- MongoDB and Vercel Blob for sealed-message ciphertext; email and push reminders.

---

## Getting started

### Prerequisites
- Node.js 18+ or Bun
- [Foundry](https://book.getfoundry.sh/getting-started/installation) **1.8 or newer**
- A browser and device with passkey support (any current Chrome, Safari, Firefox or Edge)

### Contracts
```bash
cd legacy-contract
forge build
forge test
```

### Deploy to Monad
```bash
cd legacy-contract
cp .env.example .env            # set PRIVATE_KEY (fund it at https://faucet.monad.xyz for testnet)
source .env
forge script script/DeployMonad.s.sol --rpc-url monad_testnet --broadcast
# mainnet: --rpc-url monad
```

The script ends by printing the exact `NEXT_PUBLIC_*` lines for the frontend. Transaction hashes are saved in `broadcast/DeployMonad.s.sol/<chainId>/run-latest.json`.

### Frontend
```bash
cd legacy-frontend
cp .env.example .env.local      # paste the addresses printed by the deploy script
bun install                     # or npm install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000). Passkeys work on `localhost` and over https. On testnet, new vaults use short demo timings (2 min check-in, 30s grace, 60s veto window), so a whole inheritance plays out in a few minutes; mainnet defaults to 30d / 7d / 3d.

---

## Deployments

| Network | Factory | Passkey verifier | Policy engine | Deploy tx |
| :--- | :--- | :--- | :--- | :--- |
| Monad testnet (10143) | [`0xee99…eacf`](https://testnet.monadscan.com/address/0xee99be33c48c1362e66fb3db773018db1cc1eacf) | [`0xe72d…2314`](https://testnet.monadscan.com/address/0xe72de0e5279429b097d2ca03ab95ec315d022314) | [`0xc94e…ed06`](https://testnet.monadscan.com/address/0xc94efc123dde0e590882f261996b65c5f018ed06) | [`0xaa922f49…`](https://testnet.monadscan.com/tx/0xaa922f4994e19fcf368212feba80e6bf0cab38df1bbfe2f7973014af5e9b4c9e) |
| Monad mainnet (143) | _to fill after deploy_ | | | |

---

## Design philosophy

The UI deliberately avoids typical SaaS/dashboard conventions. Every action, from a check-in to a claim finalization, is treated as a deliberate, weighty moment rather than a casual form submission, in keeping with what the vault actually represents.

---

## License

[MIT](LICENSE)

## Disclaimer

Legacy is experimental software handling real, irreversible transfers of digital assets. It has not been audited. Do not use it to secure funds you cannot afford to lose.
