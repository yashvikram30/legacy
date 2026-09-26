# Legacy Protocol — Feature Proposals, UI/UX Revamp & Hackathon Roadmap

This document outlines feature ideas, architectural designs, and UI/UX enhancements for **Legacy Protocol** (World Chain Sepolia · World ID 3.0 · Next.js · MongoDB Atlas). Each item is categorized by problem solved, implementation blueprint, effort, and hackathon impact.

---

## 📋 Quick Evaluation Matrix

| ID | Feature / Initiative | Category | Effort | Hackathon Wow Factor | Status |
|:---|:---|:---|:---:|:---:|:---:|
| **E1** | **Vault & Heir Identity (Names, Aliases & Notes)** | User Idea / Identity | 1–1.5 hrs | Medium-High | 💡 Proposed |
| **E2** | **Watchdog Email Studio & Live Interactive Tester** | User Idea / Backend & Testing | 1.5–2 hrs | High | 💡 Proposed |
| **E3** | **Heir Claim Emergency Email Channel** | User Idea / Notifications | 1 hr | High | 💡 Proposed |
| **U1** | **Radial Chronograph & Dead Man's Gauge** | UI/UX Revamp | 2–3 hrs | 🔥 Very High | 💡 Proposed |
| **U2** | **Interactive Succession Pipeline Graph** | UI/UX Revamp | 1.5 hrs | High | 💡 Proposed |
| **U3** | **Tactile Mechanical Soundscape (Web Audio API)** | UI/UX Revamp | 1 hr | 🔥 Very High | 💡 Proposed |
| **U4** | **Vault Command Palette (`Cmd + K`)** | UI/UX Revamp | 1.5 hrs | Medium-High | 💡 Proposed |
| **H1** | **"Time-Machine" Fast-Forward Demo Sandbox** | Problem Solver / Demo | 1.5–2 hrs | 🔥 Critical / Judge Favorite | 💡 Proposed |
| **H2** | **Encrypted Digital Testament & Secret Safe (AES-GCM)** | Major Problem Solver | 2.5–3 hrs | 🔥 Game Changer | 💡 Proposed |
| **H3** | **World App Native MiniKit Integration** | Hackathon Track Match | 2 hrs | 🔥 World Chain Core | 💡 Proposed |
| **H4** | **Guardian Emergency Delay / Medical Freeze** | Security & Resilience | 2–3 hrs | High | 💡 Proposed |

---

## 1. User-Proposed Initiatives: Identity & Email Suite

### E1. Vault & Heir Identity (Names, Aliases & Roles)

#### 🎯 Problem Solved
Vaults and heirs are currently identified strictly by raw hexadecimal addresses (`0x7F0a094E820ec5D1C733EcD96d7022D5AAecD9b9`). In multi-vault or multi-heir setups, hex strings are opaque, error-prone, and visually cold.

#### 🛠️ Architecture & Blueprint
* **Database Model Update:** Add metadata fields to MongoDB `VaultSubscriptionModel` (with `localStorage` fallback for offline/disconnected states):
  * `vaultName: string` (e.g. *"Family Living Trust"*, *"Founding Treasury"*, *"Personal Cold Vault"*)
  * `description?: string`
  * `heirAliases: Record<string, { name: string; role: string; email?: string }>` (e.g. `0x3b...`: `{ name: "Alice", role: "Spouse", email: "alice@..." }`)
* **UI Integration:**
  * **Header & Cards:** Show the Vault Nickname prominently in Fraunces font with the truncated address as an understated badge.
  * **Inline Edit:** Clickable pencil icon on the Vault page allowing the owner to update the vault name in real time without a blockchain transaction.
  * **Heir List:** Display names and avatar badges alongside heir addresses.
* **Notification Integration:** All email alerts immediately reference the vault by name:
  > `[URGENT] Heartbeat Expiring for "Family Living Trust" (0x7F0a...)`

---

### E2. Watchdog Email Studio & Live Interactive Tester

#### 🎯 Problem Solved
Currently, the email system runs primarily in background cron routines or via minimal test endpoints. The owner cannot visually preview what recipients see, easily test emails on custom target inboxes, or verify delivery status.

#### 🛠️ Architecture & Blueprint
* **Interactive Live Preview Modal:**
  * A *"Preview Email"* button inside `WatchdogAlertPanel.tsx`.
  * Opens a modal showing the exact dark-mode responsive HTML email layout with live preview toggles for:
    1. *7-Day Reminder*
    2. *24-Hour Critical Warning*
    3. *Amber State Breach (Grace Period Active)*
    4. *Heir Claim Notification*
* **On-Demand Dispatch Tester:**
  * Quick-test form: Input any test email address $\rightarrow$ select alert type $\rightarrow$ Click *"Dispatch Test Alert"*.
  * Displays real-time API response: Resend Message ID, delivery timestamp, or Simulated Mode log.
* **Deep-Link Direct Check-In:**
  * Embed a single-click action button in every alert email linking directly to:
    `https://app.legacyprotocol.xyz/vault?action=check-in&address=0x...`
  * Automatically opens the World ID check-in modal when clicked by the authenticated owner.

---

### E3. Heir Claim Emergency Email Channel

#### 🎯 Problem Solved
Currently, alerts are only sent to the vault owner. When succession actually triggers (vault turns Red, or an heir initiates a claim), heirs are not notified proactively.

#### 🛠️ Architecture & Blueprint
* Allow the owner to register an optional notification email for each heir in the database.
* **Automatic Dispatches:**
  * **To Heirs when Vault turns RED:** *"Succession Window Open: You are designated heir to [Vault Name]. Initiate claim at [Portal URL]."*
  * **To Owner when Heir initiates claim:** *"URGENT: Heir [Name/Address] has initiated a claim against your vault. 48h contestable window is counting down. Check in now to cancel."*

---

## 2. UI / UX Revamp: "Machined Bank Vault 2.0"

### U1. Radial Chronograph & Dead Man's Gauge

#### 🎯 Problem Solved
The current Status Lamp is a simple solid circle. A high-stakes digital vault should feel like a physical, heavy instrument panel with visual tension and precision mechanics.

#### 🛠️ Architecture & Blueprint
* **Precision SVG Chronometer:**
  * Outer graduated tick ring (60 minute / 30 day marks).
  * Color-coded concentric arcs:
    * **Safe Zone (Green):** Normal operational duration.
    * **Grace Zone (Amber):** Warning sector displaying grace period.
    * **Breached Zone (Red):** Claimable zone.
  * Moving needle / sweep indicator that updates in real time against the blockchain timestamp.
  * Smooth CSS transitions (400–600ms) on status changes.

---

### U2. Interactive Succession Lifecycle Pipeline

#### 🎯 Problem Solved
Users and judges need to understand the sequential security model at a glance without reading whitepapers.

#### 🛠️ Architecture & Blueprint
* Visual horizontal node graph placed above the vault parameters:
  $$\boxed{\text{1. Active Liveness}} \longrightarrow \boxed{\text{2. Grace Period}} \longrightarrow \boxed{\text{3. Heir Contestation}} \longrightarrow \boxed{\text{4. Asset Transfer}}$$
* Each node lights up with its corresponding status glow (Green/Amber/Red/Brass).
* Clicking a node reveals a sleek popover explaining the exact on-chain rules governing that stage.

---

### U3. Tactile Mechanical Soundscape (Web Audio API)

#### 🎯 Problem Solved
Sound design dramatically elevates web applications, turning digital actions into tangible physical interactions.

#### 🛠️ Architecture & Blueprint
* **Zero External Dependencies:** Implemented using pure native browser `AudioContext` with synthesized waveforms (zero large audio file downloads):
  * **Check-In Success:** Heavy metallic tumbler click and satisfying mechanical lock engagement.
  * **Vault Created:** Hydraulic latch slide sound.
  * **Amber/Red Warning:** Low-frequency radar hum.
* **User Control:** Discreet toggle icon in the top header (`[🔊 SFX: ON/OFF]`), persistent in `localStorage`.

---

### U4. Vault Command Palette (`Cmd + K`) & Quick Switcher

#### 🎯 Problem Solved
Power users, testers, and multi-vault owners need to switch contexts, look up addresses, and trigger actions rapidly.

#### 🛠️ Architecture & Blueprint
* Pressing `Cmd + K` (or `Ctrl + K`) opens an engraved search overlay:
  * Quickly switch between all owned vaults and heir vaults.
  * Search heirs by name, tag, or address.
  * Jump directly to *"Check In"*, *"Add Heir"*, *"View Watchdog Settings"*, or *"Claim Portal"*.

---

## 3. Major Problem Solvers & Hackathon Showstoppers ("Looks Fire")

### H1. "Time-Machine" Fast-Forward Demo Sandbox 🏆 *(Judge Favorite)*

#### 🎯 Problem Solved
A succession dead man's switch operates over 30 to 180 days. In a 3-minute hackathon pitch or judging round, **judges cannot wait days or minutes to see the contract transition from Green to Amber to Red**.

#### 🛠️ Architecture & Blueprint
* **Demo Simulation Mode Toggle:** A prominent "Demo Sandbox" pill in the header or floating drawer.
* **Interactive Time Slider:**
  * Slider lets the user scrub simulated time forward:
    * `t = 0`: Normal Green state.
    * `t + 25d`: Pre-Amber warning (Watchdog email triggers).
    * `t + 30d`: Vault enters Amber (Grace period countdown).
    * `t + 37d`: Vault enters Red (Heir Claim button enables).
    * `t + 39d`: Contestable window finishes (Claim finalization & asset transfer unlocked).
* Can operate via client-side simulation overlay or by interacting with a local/testnet fast-forward contract harness.

---

### H2. Encrypted "Digital Testament" & Secret Safe (AES-GCM) 🔐

#### 🎯 Problem Solved
Smart contracts can transfer on-chain tokens and ENS domains, but they **cannot store hardware wallet seed phrases, server root passwords, or personal farewell letters** because public blockchains are transparent.

#### 🛠️ Architecture & Blueprint
* **The Safe Deposit Box:**
  * Vault owner can enter confidential text, backup seed phrases, or private notes.
  * Encrypted client-side using Web Crypto API (`AES-256-GCM`).
  * The ciphertext is stored in MongoDB or IPFS.
  * The decryption key is wrapped such that it is only accessible to the designated heir once the vault status transitions to `Claimed` or `Red`.
* **Heir Experience:** After successfully executing their claim on-chain, the heir unlocks the decrypted Digital Testament right inside the UI.

---

### H3. World App Native MiniKit Integration 📱

#### 🎯 Problem Solved
Using a desktop browser to scan World ID QR codes creates device-switching friction during demos and real-world usage.

#### 🛠️ Architecture & Blueprint
* Integrate Worldcoin's official `@worldcoin/minikit-js`.
* When the user opens Legacy inside the **World App** mobile client:
  * Automatically detects `isMiniApp = true`.
  * Enables **1-Tap Biometric Check-In**: The owner presses "Check In" and confirms with FaceID / World ID directly inside World App.
  * Native World Chain gasless transactions.

---

### H4. Guardian Emergency Delay / Medical Freeze 🛡️

#### 🎯 Problem Solved
What if the owner suffers a temporary medical emergency, travel blackout, or accident? If heirs try to claim during this period, the owner could lose their life savings unjustly.

#### 🛠️ Architecture & Blueprint
* Allow the owner to designate a **Guardian address** (e.g. trusted physician, family member, or multisig).
* If the vault enters Amber or Red, the Guardian can invoke an `emergencyFreeze(uint256 extensionPeriod)` that grants a one-time 14-day extension, preventing unfair liquidation while notifying the owner.

---

## 4. Suggested Implementation Bundles

### 🚀 Package A: "Immediate Polish & Communication" (1.5 – 2 Hours)
1. **Vault & Heir Names (E1):** MongoDB schema update + UI inline editing + Hub card names.
2. **Watchdog Email Preview & Instant Tester (E2):** Live rendered email viewer + custom recipient test dispatcher.

### 🎨 Package B: "Visual WOW & Soundscape" (2 – 3 Hours)
1. **Radial Chronograph Dial (U1):** Precision SVG instrument dial replacing the static status lamp.
2. **Succession Pipeline Graph (U2):** Real-time node status progression.
3. **Tactile Mechanical Soundscape (U3):** Web Audio clicks and latch sounds.

### 🏆 Package C: "The Pitch-Winner" (2 – 3 Hours)
1. **Time-Machine Fast-Forward Sandbox (H1):** Interactive time-scrubber for effortless live presentations.
2. **Encrypted Digital Testament (H2):** Client-side secret vault for seed phrases and personal notes.

---

*File generated on 2026-09-26 for Legacy Protocol.*
