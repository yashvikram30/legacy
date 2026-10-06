# Legacy — Design System & UI Reference

*A digital succession vault. ENS-anchored, World ID-verified, strictly non-custodial. This doc is the visual and interaction reference for building the frontend — keep it open while you work.*

---

## 1. Concept in one line

**A bank vault, not a dashboard.** The product's job is to hold a weighty, permanent state (are you alive and checked-in, or not) and gate an irreversible transfer behind it. Every visual choice below serves that: the UI should feel like an instrument panel bolted to something solid, not another SaaS card grid.

---

## 2. What we're deliberately avoiding, and why

Naming these up front so choices stay intentional as the build grows:

- **No neon-synthwave web3 cliché.** Overused in crypto specifically; reads as decoration, not meaning.
- **No identical rounded-card grid with soft grey shadows.** The default SaaS pattern. Fine for a CRM, wrong for a vault — nothing here should look interchangeable with a metrics dashboard.
- **No ALL-CAPS tracked-out eyebrow labels, no middle-dot metadata strings, no monospace-for-everything.** Monospace is used *only* where it's functionally correct (addresses, hashes, countdowns) — never as a generic "tech" flourish.
- **Brand accent and status colors are never the same hue.** If your brand color and your "vault is fine" color are both green, the two signals collapse into one and status stops being legible as status.

---

## 3. Color system

| Token | Hex | Usage |
|---|---|---|
| `bg-base` | `#10151A` | App background. Cold gunmetal, not flat black. |
| `bg-surface` | `#1C2226` | Cards, panels, one step lighter than base. |
| `bg-elevated` | `#252C31` | Modals, the check-in ritual overlay, anything "lifted." |
| `text-primary` | `#EDEAE3` | Body copy, headings. Warm off-white, not stark white. |
| `text-secondary` | `#9A9E98` | Captions, metadata, timestamps. |
| `border-hairline` | `#2E353A` | 1px dividers, card outlines. Never a drop shadow — use borders for structure. |
| `accent-brass` | `#B8894A` | **Brand accent only.** Primary buttons, links, the vault's "identity." Never used for status. |
| `status-green` | `#4CAF6D` | Vault status: Green (checked in, healthy). |
| `status-amber` | `#D99A3D` | Vault status: Amber (grace period). Deliberately close to brass — feels like the same machine, different reading. |
| `status-red` | `#C1503F` | Vault status: Red (claimable). Muted brick, not alarm-red — this is a state, not an error. |

**Rule:** status colors appear *only* on the status lamp, status badges, and countdown text tied to vault state. They never appear on buttons, links, or decorative elements — if red shows up anywhere else in the UI, an heir or owner should be able to trust it always means "the vault is Red."

---

## 4. Typography

| Role | Typeface | Notes |
|---|---|---|
| Display / headings | **Fraunces** | Ink-trap serif, engraved-plaque quality at large sizes. Use for page titles, the vault status headline, and the check-in confirmation moment. Not for body copy. |
| UI / body | **Inter** or **IBM Plex Sans** | Everything else: nav, buttons, form labels, paragraph text. |
| Data | **IBM Plex Mono** | Wallet addresses, tx hashes, ENS nodes, countdown timers, block numbers. Functional, not decorative — used because fixed-width digits don't jitter as a countdown ticks and hex is easier to scan monospaced. |

**Type scale** (rem, 16px base):

| Level | Size | Weight | Font | Use |
|---|---|---|---|---|
| Display | 3.5rem | 500 | Fraunces | Status headline ("Green — 24d 06h left") |
| H1 | 2.25rem | 500 | Fraunces | Page titles |
| H2 | 1.5rem | 500 | Inter | Section headers |
| Body | 1rem | 400 | Inter | Paragraphs, labels |
| Small | 0.875rem | 400 | Inter | Captions, secondary metadata |
| Data | 0.9375rem | 400 | IBM Plex Mono | Addresses, hashes, timers |

Line length: keep body copy under 80 characters per line. Give Fraunces slightly tighter line-height at display sizes (1.05–1.1) since it's not running text.

---

## 5. Spacing & layout

- 8px base unit. Spacing scale: 4, 8, 16, 24, 32, 48, 64, 96.
- Border radius: **small and consistent** — 6px on interactive elements (buttons, inputs), 0px on structural panels (the instrument-panel edge should feel machined, not soft). Don't apply the same radius to everything regardless of hierarchy.
- Layout is centered and singular on primary screens, not a dashboard grid. One instrument, not five cards competing for attention. Secondary information (heirs, assets, history) sits below, quieter, in a simple list — not its own card grid.

---

## 6. Core components

### 6.1 Status lamp (the hero element)

The single most important visual in the product. A circular lamp/dial, not a pill or badge.

```
        ⬤          <- 120–160px circle, filled with status color,
                       soft inner glow only (no drop shadow outside it)
    GREEN            <- Fraunces, sits directly below
  24d 06h left        <- IBM Plex Mono, secondary text color
```

- Color transitions (Green→Amber→Red) should be an actual transition, not a hard cut — 400–600ms color-interpolation, since this is the one moment worth animating.
- Never combine with a spinning/pulsing animation on Green (calm state should look calm). A slow, subtle pulse is appropriate on Red only, to signal "action needed" without being alarmist.

### 6.2 Check-in (the ritual action)

This is the emotional core of the product — treat it like a deliberate act, not a form submit.

- One primary button, brass accent, large touch target, standing alone — not next to five other actions.
- On success: **one orchestrated moment**, not a toast. Suggest a mechanical-feeling transition — the lamp shifting to Green with the color-interpolation above, plus a single subtle "settle" motion (e.g. a brief scale-up-then-settle on the lamp), and a short confirmation line in Fraunces ("Checked in. Next check-in due in 30 days."). No confetti, no bounce, no repeated animation.
- Button copy is literal and active: "Check In," not "Verify" or "Submit."

### 6.3 Countdown / timer readout

- Always IBM Plex Mono, always shows the unit explicitly (`24d 06h`, not ambiguous numbers).
- Amber and Red states show the countdown to the *next* transition (Amber → time until Red; Red → nothing counts down further, it shows elapsed time in Red instead, since Red is terminal until check-in).

### 6.4 Heir claim view (contestable window)

This is the one screen without a close analogue in existing products — build it as a variant of the status lamp/countdown pattern, but make the two-party tension visible:

```
   Claim initiated — Contestable
   ⬤ (amber-tinted, distinct from vault status lamp so the
      two "clocks" in the product are never visually confused)
   Window closes in: 2d 14h
   [ The owner can invalidate this by checking in ]
```

- Explicitly show *what would stop this* ("the owner can invalidate this by checking in") — don't leave the heir guessing what the countdown means.
- Once `finalizeClaim` succeeds, switch to a settled, non-urgent state — the anxious countdown styling should not persist once the claim is actually finalized.

### 6.5 Asset allocation list

Simple list, not cards: asset name/type, assigned heir, status (Assigned / Claimed). Table-like, left-aligned, hairline dividers between rows — this is administrative content, treat it plainly.

### 6.6 Transparency lookup (public, read-only)

A single input (ENS name) → status badge + minimal info. This is the "anyone can check" moment — keep it extremely minimal, almost like a whois lookup. One input, one result, no dashboard chrome.

---

## 7. Motion principles

- One orchestrated moment per meaningful action (check-in success, claim finalized, asset transferred). Not hover transitions on every card.
- Motion answers a person's action — it shows what changed, not decoration.
- Respect `prefers-reduced-motion`: color transitions can stay, but remove scale/settle motion for users who've opted out.

---

## 8. Copy & voice

- Active voice, literal button labels: "Check In," "Initiate Claim," "Finalize Claim" — the button label and the resulting state should always match (a button that says "Finalize Claim" produces a status that says "Claimed," not "Finalized").
- No apologetic or vague error copy. State what happened and what to do: "Contestable window hasn't elapsed yet — 1d 4h remaining," not "Something went wrong."
- Avoid selling language ("seamlessly," "effortlessly"). Describe what the vault does in plain terms: "Your vault checks that you're still active every 30 days," not "Never worry about your legacy again."
- Empty states are invitations to act: an owner with no heirs sees "No heirs added yet — add one to assign assets," not a blank list.

---

## 9. Accessibility floor

- All status information conveyed by color also has a text label (never color alone — colorblind users must be able to read "Green"/"Amber"/"Red" as text, not infer it from hue).
- Visible keyboard focus states on all interactive elements, styled with the brass accent, not a default blue outline.
- Contrast: `text-primary` on `bg-base` and `bg-surface` both need to clear WCAG AA (verify — off-white `#EDEAE3` on `#10151A` is comfortably above 4.5:1; check `text-secondary` on `bg-elevated` specifically since that pairing is closer).

---

## 10. Implementation notes

**Fonts (Google Fonts):**
```html
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
```

**CSS variables:**
```css
:root {
  --bg-base: #10151A;
  --bg-surface: #1C2226;
  --bg-elevated: #252C31;
  --text-primary: #EDEAE3;
  --text-secondary: #9A9E98;
  --border-hairline: #2E353A;
  --accent-brass: #B8894A;
  --status-green: #4CAF6D;
  --status-amber: #D99A3D;
  --status-red: #C1503F;

  --font-display: 'Fraunces', serif;
  --font-ui: 'Inter', sans-serif;
  --font-data: 'IBM Plex Mono', monospace;
}
```

---

## 11. Screens to build, in order

1. **Owner dashboard** — status lamp, countdown, Check In button, quiet secondary nav to heirs/assets/history.
2. **Check-in flow** — World ID (IDKit) verification screen, minimal and single-focus, then the ritual success moment on return to dashboard.
3. **Heir claim portal** — status of the heir's own claim(s), initiate/finalize actions, the two-party-tension countdown from §6.4.
4. **Asset allocation setup** (owner-only, Green-state gated) — add heir, assign asset, plain list view.
5. **Transparency lookup** (public) — ENS name → status, minimal.

Build in this order — the demo loop (green→amber→red→claim→reclaim) only needs 1–3 to be real; 4–5 can be simplified or stubbed if time runs short before the pitch.