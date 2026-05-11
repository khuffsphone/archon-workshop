# ARCHON-010A — VFX Quality Curation Plan

**Milestone:** ARCHON-010A — Controlled VFX Quality / Curation Pass
**Status:** Inspection complete. Findings accepted. No review status changes made.
**Updated:** 2026-05-11

---

## 1. Purpose

This document defines the curation rubric, sample selection, and outcome decisions for the ARCHON-010A visual quality inspection of the Combat VFX asset set.

ARCHON-010A is a **read-only inspection pass**. It does not:
- Change review status on any asset
- Write review notes
- Generate new assets
- Modify source code, manifests, or the game

Actual status changes and regeneration are deferred to **ARCHON-010B**.

---

## 2. Manifest State at Inspection Time

| Metric | Value |
|---|---|
| Total assets in manifest | 244 |
| Status: `approved` | 244 |
| Status: `rejected` | 0 |
| Status: `pending` | 0 |
| Status: `failed` | 0 |
| `asset_protected: true` | 244 |
| Latest commit | `33db712` — ARCHON-009C |

---

## 3. Pre-Inspection Anomalies

Two anomalies were identified before visual inspection began.

### Anomaly A — Conflicting metadata: `combat-hit-flash-dark`

| Field | Value |
|---|---|
| `status` | `approved` |
| `asset_protected` | `true` |
| `notes` | `"Rejected during curation pass"` |
| `path` | `/generated/images/combat-hit-flash-dark-v1.png` |

**Classification:** Metadata inconsistency. The note text contradicts the status. The image was visually inspected and passes all rubric criteria. The note was almost certainly written against a prior candidate version or applied in error without changing the status field. The asset is NOT a quality failure — it is a data hygiene issue.

**Resolution:** Deferred to a dedicated cleanup milestone. No action in ARCHON-010A.

### Anomaly B — Missing manifest entries: `combat-projectile-light`, `combat-projectile-dark`

Both IDs exist in `COMBAT_SLICE_VFX_IDS` (vfxCatalog.ts) and in `INITIAL_ASSETS` (assetManifest.ts) but are absent from the generated manifest — they have never been generated.

**Impact:** They are NOT in `COMBAT_SLICE_REQUIRED_IDS`, so the Export Eligibility Preview reports "Combat Ready" regardless. No export blocking.

**Resolution:** Deferred to ARCHON-010C (Projectile VFX Generation). Out of scope for ARCHON-010A and 010B.

---

## 4. Curation Sample — 6 Assets

Selected to cover game-critical families (hit, death, heal, ambient), both factions, and the P0 conflict case.

| # | Asset ID | Family | Faction | Priority | Reason for inclusion |
|---|---|---|---|---|---|
| 1 | `combat-hit-flash-dark` | hit | dark | P0 | Conflicting metadata — must inspect |
| 2 | `combat-hit-flash-light` | hit | light | P1 | Mirror/control; has "Approved" note |
| 3 | `combat-death-burst-dark` | death | dark | P1 | Game-critical; no prior note |
| 4 | `combat-death-burst-light` | death | light | P1 | Game-critical; no prior note |
| 5 | `combat-heal-pulse` | nova | neutral | P2 | Neutral readability must be clear |
| 6 | `combat-ambient-arena` | nova | neutral | P2 | Background loop; intensity 1 |

---

## 5. Quality Rubric

Each asset evaluated on 7 axes. Each criterion: **Pass / Fail / Flag**.

| Criterion | Pass definition | Fail / Flag condition |
|---|---|---|
| **White background** | Pure or near-white background — no colored texture | Colored, gradient, or textured background |
| **No character forms** | Pure particle or energy effect only | Any humanoid shape, face, silhouette, wing, weapon |
| **Faction color accuracy** | Light: gold/ivory/azure; Dark: obsidian/violet/crimson; Neutral: silver/white/soft green | Wrong palette for the faction |
| **Effect readability** | Immediately reads as the intended VFX type | Ambiguous, abstract, or wrong type |
| **Intensity calibration** | Matches catalog `intensity` field (1=subtle → 5=extreme) | Over- or under-powered relative to use case |
| **Overlay safety** | Works as overlay on board tiles without bleeding to edges | Effect extends to canvas edge; would clip at game render size |
| **No artifacts** | No watermarks, JPEG noise, text, or cropping | Any artifact present |

**Outcome tiers:**
- ✅ **Pass** — All criteria met
- 📝 **Pass with note** — Minor issue, acceptable for shipping; note the concern
- 🔄 **Reject + Queue for Regen** — Fails one or more hard criteria; requires ARCHON-010B action
- ⚠️ **Metadata conflict** — Image passes quality; data field requires cleanup

---

## 6. Inspection Results

### 6.1 `combat-hit-flash-dark`

**Image (512×512):** Radial starburst with dark obsidian spikes, crimson-red glowing core, deep violet/purple energy shards, scattered fragments on near-white background.

| Criterion | Result |
|---|---|
| White background | ✅ Pass |
| No character forms | ✅ Pass |
| Faction color accuracy | ✅ Pass — obsidian, crimson, violet |
| Effect readability | ✅ Pass — sharp impact burst |
| Intensity calibration | ✅ Pass — intensity 3, well-balanced |
| Overlay safety | ✅ Pass — centered, contained |
| No artifacts | ✅ Pass |

**Verdict: ⚠️ PASS — metadata conflict only**
The image itself is good quality. The `notes: "Rejected during curation pass"` does not reflect the visual state of this asset. Cleanup deferred to a dedicated milestone.

---

### 6.2 `combat-hit-flash-light`

**Image (512×512):** Clean 8-pointed starburst, gold and azure geometric facets, brilliant white hot centre, scattered azure crystal fragments on near-white background.

| Criterion | Result |
|---|---|
| White background | ✅ Pass |
| No character forms | ✅ Pass |
| Faction color accuracy | ✅ Pass — gold, ivory, azure |
| Effect readability | ✅ Pass — sacred impact burst |
| Intensity calibration | ✅ Pass — intensity 3 |
| Overlay safety | ✅ Pass |
| No artifacts | ✅ Pass |

**Verdict: ✅ PASS**
Reference-quality asset. The prior "Approved during curation pass" note is consistent with this quality level. Establishes the visual language standard for the Light hit family.

---

### 6.3 `combat-death-burst-dark`

**Image (512×512):** Large circular implosion — deep violet/crimson crystalline shards collapsing inward, white lightning cracks forming a rim at the perimeter, scattered void fragments, near-white background.

| Criterion | Result |
|---|---|
| White background | ✅ Pass |
| No character forms | ✅ Pass |
| Faction color accuracy | ✅ Pass — obsidian, violet, crimson |
| Effect readability | ✅ Pass — death implosion |
| Intensity calibration | ✅ Pass — intensity 5, appropriately extreme |
| Overlay safety | 📝 Flag — outer lightning rim reaches canvas edge |
| No artifacts | ✅ Pass |

**Verdict: 📝 PASS WITH NOTE**
Visually excellent and game-ready. Minor compositing concern: the white lightning perimeter ring extends near the image boundary. At small game overlay sizes this may clip slightly. Not a rejection reason — monitor at actual game render size during integration.

---

### 6.4 `combat-death-burst-light`

**Image (512×512):** Radiating starburst of pale gold and azure shards, brilliant white-hot core, glittering gold dust particle scatter and trailing streaks on near-white background.

| Criterion | Result |
|---|---|
| White background | ✅ Pass |
| No character forms | ✅ Pass |
| Faction color accuracy | ✅ Pass — gold, white, azure |
| Effect readability | ✅ Pass — holy death explosion |
| Intensity calibration | ✅ Pass — intensity 5 |
| Overlay safety | ✅ Pass — natural particle fade |
| No artifacts | ✅ Pass |

**Verdict: ✅ PASS**
Strong quality. Visually cohesive with hit-flash-light as a consistent Light faction VFX family. Game-ready.

---

### 6.5 `combat-heal-pulse`

**Image (512×512):** Large greyscale wing-spread mandala. Two prominent feathered wing structures flare symmetrically left and right. Central swirling white/grey energy vortex. Entirely desaturated monochrome — no green, no warmth.

| Criterion | Result |
|---|---|
| White background | ✅ Pass |
| No character forms | ❌ **Fail** — prominent wing silhouettes; resembles a spread-winged entity. Negative prompt explicitly excluded wings |
| Faction color accuracy | ❌ **Fail** — prompt specified soft green/white/silver; rendered entirely greyscale |
| Effect readability | ❌ **Fail** — does not read as healing; reads as dark or abstract |
| Intensity calibration | ⚠️ Flag — intensity 2 required (subtle, benevolent); this is heavy and complex |
| Overlay safety | ⚠️ Flag — wing structures extend near canvas edges |
| No artifacts | ✅ Pass |

**Verdict: 🔄 REJECT + QUEUE FOR REGEN**
Three hard criteria fail. The negative prompt constraint on wings was not respected. The color palette (green/silver) was ignored entirely in favour of monochrome. The effect does not communicate healing in any visual register. Deferred to **ARCHON-010B** for operator-directed rejection and controlled regeneration.

---

### 6.6 `combat-ambient-arena`

**Image (512×512):** A fully-realised stained-glass heraldic badge. Armored helmet/visor at centre, two large ornate feathered wings, multicolour gemstones (blue, green, red, teal, gold), runic symbols on wing panels, central sword form. A bold foreground hero emblem.

| Criterion | Result |
|---|---|
| White background | ✅ Pass |
| No character forms | ❌ **Fail** — armored helmet/visor, wings, sword — all explicitly excluded |
| Faction color accuracy | ❌ **Fail** — prompt specified "soft gold, neutral silver"; rendered as vibrant multicolour heraldic icon |
| Effect readability | ❌ **Fail** — reads as a game badge/logo, not an ambient particle layer |
| Intensity calibration | ❌ **Fail** — intensity 1 required (subtle, non-distracting); this is a bold foreground hero element |
| Overlay safety | ❌ **Fail** — would fully obscure gameplay as a background layer |
| No artifacts | ✅ Pass |

**Verdict: 🔄 REJECT + QUEUE FOR REGEN**
Five of seven criteria fail. The generation produced a game icon/heraldic badge with full character-adjacent forms instead of a subtle particle ambient layer. This is a near-total prompt misfire. Deferred to **ARCHON-010B** for operator-directed rejection and controlled regeneration.

---

## 7. Summary Scorecard

| # | Asset ID | Verdict | Action |
|---|---|---|---|
| 1 | `combat-hit-flash-dark` | ⚠️ Pass — metadata conflict | Cleanup note/status in future milestone |
| 2 | `combat-hit-flash-light` | ✅ Pass | No action required |
| 3 | `combat-death-burst-dark` | 📝 Pass with note | Monitor edge-clip at game render size |
| 4 | `combat-death-burst-light` | ✅ Pass | No action required |
| 5 | `combat-heal-pulse` | 🔄 Reject + Regen | ARCHON-010B: reject, regen with tightened prompt |
| 6 | `combat-ambient-arena` | 🔄 Reject + Regen | ARCHON-010B: reject, regen with tightened prompt |

**3 pass cleanly. 1 passes with compositing note. 1 has metadata inconsistency. 2 require regeneration.**

---

## 8. Prompt Hardening Recommendations (for ARCHON-010B)

### `combat-heal-pulse` — regeneration notes
- Add to negative prompt: `wings, feathers, bird forms, mandala, symmetric wing shape, greyscale, monochrome`
- Strengthen positive prompt: explicitly specify `green and white concentric rings`, `glowing green sparkles`, `soft healing ripple`
- Consider adding: `COLOR: bright leaf green and white ONLY`

### `combat-ambient-arena` — regeneration notes
- Add to negative prompt: `helmet, visor, armor, sword, weapon, badge, crest, heraldry, emblem, wings, runes, gemstones, icons, foreground elements, shield`
- Strengthen positive prompt: `barely visible`, `scattered luminous dust motes`, `faint wisps only`, `almost transparent particle field`
- Reduce model intensity — this preset may need a lower-capability model to avoid over-generation

---

## 9. Deferred Items

| Item | Deferred to |
|---|---|
| Reject + regen `combat-heal-pulse` | ARCHON-010B |
| Reject + regen `combat-ambient-arena` | ARCHON-010B |
| Cleanup `combat-hit-flash-dark` metadata conflict | ARCHON-010B or dedicated cleanup pass |
| Generate `combat-projectile-light` | ARCHON-010C |
| Generate `combat-projectile-dark` | ARCHON-010C |

---

## 10. Tooling Gaps Noted

| Gap | Severity |
|---|---|
| No in-app image zoom / lightbox in Scene Lab | Low — workaround via direct URL |
| No "queued for regen" status field in review system | Medium — currently only approved/rejected; a future milestone could add `pending_regen` |
| Scene Lab review list does not visually distinguish conflict-note state | Low — detectable only by reading note text |
| `combat-projectile-*` cannot be curated until generated | Blocking for those assets only |
