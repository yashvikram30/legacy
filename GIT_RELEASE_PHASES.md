# Legacy Protocol — 3-Phase UI & System Release Guide

This document defines the 3-phase staging, commit, and push sequence for the Legacy succession application and contracts.

---

## 📌 Deployed Contract Registry (World Chain Sepolia — Chain ID: 4801)

| Contract | Address | Explorer |
|---|---|---|
| **LegacyVault Implementation** | `0x7F0a094E820ec5D1C733EcD96d7022D5AAecD9b9` | [Worldscan](https://sepolia.worldscan.org/address/0x7F0a094E820ec5D1C733EcD96d7022D5AAecD9b9) |
| **LegacyVaultFactory** | `0x403985aA74A2501F1a99A858dD36f22F8bfff4c9` | [Worldscan](https://sepolia.worldscan.org/address/0x403985aA74A2501F1a99A858dD36f22F8bfff4c9) |
| **Rapid Demo Smoke Vault** | `0x7916F4cc4C8d8D410642B3643B9fa5341622d73a` | [Worldscan](https://sepolia.worldscan.org/address/0x7916F4cc4C8d8D410642B3643B9fa5341622d73a) |
| **WorldIDVerifierAdapter** | `0xbc53b9fa28bbda198aaa93f8a7cc3ef949a5a4d5` | [Worldscan](https://sepolia.worldscan.org/address/0xbc53b9fa28bbda198aaa93f8a7cc3ef949a5a4d5) |

---

## 🚀 Phase 1: Foundation, Design System & App Shell

> **Scope**: Next.js 16 tooling, Tailwind CSS v4, cold-gunmetal design system tokens, typography (Fraunces & IBM Plex Mono), Web3 Reown/Wagmi connection layer, and the public landing page.

### Files to Stage:
* `legacy-frontend/package.json`
* `legacy-frontend/bun.lock`
* `legacy-frontend/tsconfig.json`
* `legacy-frontend/next.config.ts`
* `legacy-frontend/postcss.config.mjs`
* `legacy-frontend/eslint.config.mjs`
* `legacy-frontend/.gitignore`
* `legacy-frontend/design.md`
* `legacy-frontend/src/app/globals.css`
* `legacy-frontend/src/app/layout.tsx`
* `legacy-frontend/src/app/loading.tsx`
* `legacy-frontend/src/app/page.tsx`
* `legacy-frontend/src/components/Header.tsx`
* `legacy-frontend/src/components/Footer.tsx`
* `legacy-frontend/src/components/LandingHero.tsx`
* `legacy-frontend/src/components/Providers.tsx`
* `legacy-frontend/src/components/WalletModal.tsx`
* `legacy-frontend/src/components/AddressChip.tsx`
* `legacy-frontend/src/lib/constants.ts`
* `legacy-frontend/src/lib/fonts.ts`
* `legacy-frontend/src/lib/reown.ts`
* `legacy-frontend/src/lib/wagmi.ts`
* `legacy-frontend/src/lib/signal.ts`

### Execute Phase 1:
```bash
git add legacy-frontend/package.json \
        legacy-frontend/bun.lock \
        legacy-frontend/tsconfig.json \
        legacy-frontend/next.config.ts \
        legacy-frontend/postcss.config.mjs \
        legacy-frontend/eslint.config.mjs \
        legacy-frontend/.gitignore \
        legacy-frontend/design.md \
        legacy-frontend/src/app/globals.css \
        legacy-frontend/src/app/layout.tsx \
        legacy-frontend/src/app/loading.tsx \
        legacy-frontend/src/app/page.tsx \
        legacy-frontend/src/components/Header.tsx \
        legacy-frontend/src/components/Footer.tsx \
        legacy-frontend/src/components/LandingHero.tsx \
        legacy-frontend/src/components/Providers.tsx \
        legacy-frontend/src/components/WalletModal.tsx \
        legacy-frontend/src/components/AddressChip.tsx \
        legacy-frontend/src/lib/constants.ts \
        legacy-frontend/src/lib/fonts.ts \
        legacy-frontend/src/lib/reown.ts \
        legacy-frontend/src/lib/wagmi.ts \
        legacy-frontend/src/lib/signal.ts

git commit -m "feat(ui): initialize frontend foundation, design tokens, and web3 shell (Phase 1)"
git push origin main
```

---

## 🏛 Phase 2: Core Succession Engine, World ID Ritual & Heir Claims

> **Scope**: Primary succession dApp: Owner Vault Dashboard, Status Lamp (Green/Amber/Red), World ID zero-knowledge heartbeat ritual, Heir & Asset management, and Heir Claim portal.

### Files to Stage:
* `legacy-frontend/src/lib/contracts/`
* `legacy-frontend/src/components/StatusLamp.tsx`
* `legacy-frontend/src/components/CheckInModal.tsx`
* `legacy-frontend/src/components/LivenessPanel.tsx`
* `legacy-frontend/src/components/HeirList.tsx`
* `legacy-frontend/src/components/AssetList.tsx`
* `legacy-frontend/src/components/VaultParameters.tsx`
* `legacy-frontend/src/components/ActivityLog.tsx`
* `legacy-frontend/src/components/VaultDashboardHub.tsx`
* `legacy-frontend/src/components/VaultDeploymentModal.tsx`
* `legacy-frontend/src/components/Skeleton.tsx`
* `legacy-frontend/src/components/StatsBar.tsx`
* `legacy-frontend/src/hooks/useMounted.ts`
* `legacy-frontend/src/app/vault/`
* `legacy-frontend/src/app/claim/`
* `legacy-frontend/src/app/lookup/`
* `legacy-frontend/src/app/api/rp-signature/`
* `legacy-frontend/src/app/api/verify-proof/`
* `legacy-contract/deployments/worldchain-sepolia.json`

### Execute Phase 2:
```bash
git add legacy-frontend/src/lib/contracts/ \
        legacy-frontend/src/components/StatusLamp.tsx \
        legacy-frontend/src/components/CheckInModal.tsx \
        legacy-frontend/src/components/LivenessPanel.tsx \
        legacy-frontend/src/components/HeirList.tsx \
        legacy-frontend/src/components/AssetList.tsx \
        legacy-frontend/src/components/VaultParameters.tsx \
        legacy-frontend/src/components/ActivityLog.tsx \
        legacy-frontend/src/components/VaultDashboardHub.tsx \
        legacy-frontend/src/components/VaultDeploymentModal.tsx \
        legacy-frontend/src/components/Skeleton.tsx \
        legacy-frontend/src/components/StatsBar.tsx \
        legacy-frontend/src/hooks/useMounted.ts \
        legacy-frontend/src/app/vault/ \
        legacy-frontend/src/app/claim/ \
        legacy-frontend/src/app/lookup/ \
        legacy-frontend/src/app/api/rp-signature/ \
        legacy-frontend/src/app/api/verify-proof/ \
        legacy-contract/deployments/worldchain-sepolia.json

git commit -m "feat(vault): implement owner dashboard, World ID check-in ritual, and heir claim portal (Phase 2)"
git push origin main
```

---

## ⚡ Phase 3: Automated Watchdog Network, MongoDB Atlas & Email Dispatch (All Remaining)

> **Scope**: All remaining backend, database, and alerting features: Mongoose connection, MongoDB Atlas models, Pre-Amber heartbeat cron worker, transactional HTML email dispatch, and the Watchdog UI panel.

### Files to Stage:
* `legacy-frontend/src/lib/db/`
* `legacy-frontend/src/types/notifications.ts`
* `legacy-frontend/src/lib/notifications/`
* `legacy-frontend/src/app/api/notifications/`
* `legacy-frontend/src/app/api/cron/`
* `legacy-frontend/src/components/WatchdogAlertPanel.tsx`
* `legacy-frontend/src/components/VaultConfigRail.tsx`
* `legacy-frontend/.env.local.example`
* Any remaining files or documentation

### Execute Phase 3:
```bash
git add legacy-frontend/src/lib/db/ \
        legacy-frontend/src/types/notifications.ts \
        legacy-frontend/src/lib/notifications/ \
        legacy-frontend/src/app/api/notifications/ \
        legacy-frontend/src/app/api/cron/ \
        legacy-frontend/src/components/WatchdogAlertPanel.tsx \
        legacy-frontend/src/components/VaultConfigRail.tsx \
        legacy-frontend/.env.local.example \
        GIT_RELEASE_PHASES.md

git commit -m "feat(watchdog): integrate automated email alerts, heartbeat cron, and MongoDB Atlas (Phase 3)"
git push origin main
```

---

## 🔍 Post-Release Health Check
To verify all phases run cleanly without type errors:
```bash
cd legacy-frontend && bun x tsc --noEmit
```
