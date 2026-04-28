/**
 * vfxCatalog.ts
 *
 * Typed VFX preset catalog for the Archon Workshop Combat VFX pipeline.
 *
 * This module is the single source of truth for:
 *   - VFX type definitions (VFXFamily, VFXFaction, VFXPreset)
 *   - The 10-entry combat slice preset catalog
 *   - The COMBAT_SLICE_VFX_IDS list (moved here from VFXWorkflowPanel.tsx)
 *   - Pure helper functions: buildGenerationBrief(), exportCatalogAsJSON()
 *
 * This module is:
 *   - Pure — no I/O, no React, no server calls
 *   - Safe to import in Node.js smoke tests without a browser/DOM
 *
 * Protected contracts NOT touched by this module:
 *   - CombatPackManifest / COMBAT_PACK_SCHEMA_VERSION
 *   - asset-manifest.json
 *   - ZIP export/import pipeline
 *   - archon-game consumer expectations
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type VFXFamily =
  | 'hit'
  | 'projectile'
  | 'beam'
  | 'barrier'
  | 'nova'
  | 'status'
  | 'spawn'
  | 'death';

export type VFXFaction = 'light' | 'dark' | 'neutral';

export type VFXLayering = 'front' | 'mid' | 'back' | 'overlay';

export type VFXIntensity = 1 | 2 | 3 | 4 | 5;

export interface VFXPreset {
  /** Unique preset identifier — matches the asset_slot id in the manifest */
  id: string;
  /** Human-readable display name */
  name: string;
  /** VFX animation family / type */
  family: VFXFamily;
  /** Faction palette alignment */
  faction: VFXFaction;
  /** One-line description of the VFX effect */
  description: string;
  /** When and where this VFX is used in the game */
  use_case: string;
  /** Asset manifest slot ID this preset targets */
  asset_slot: string;
  /** Full image generation prompt brief (style-bible aligned) */
  prompt_brief: string;
  /** Optional negative prompt guidance */
  negative_prompt?: string;
  /** Searchable visual descriptor tags */
  visual_tags: string[];
  /** Approximate display duration in milliseconds */
  timing_ms: number;
  /** Visual intensity scale 1 (subtle) → 5 (extreme) */
  intensity: VFXIntensity;
  /** Compositing layer in the scene */
  layering: VFXLayering;
  /** Whether this preset is approved to be sent to generation */
  approved_for_generation: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const VFX_FAMILIES: VFXFamily[] = [
  'hit', 'projectile', 'beam', 'barrier', 'nova', 'status', 'spawn', 'death',
];

export const VFX_FACTIONS: VFXFaction[] = ['light', 'dark', 'neutral'];

/** Ordered list of asset slot IDs required for the Knight vs Sorceress combat slice.
 *  Moved from VFXWorkflowPanel.tsx — re-exported from there for backward compatibility. */
export const COMBAT_SLICE_VFX_IDS = [
  'combat-hit-flash-light',
  'combat-hit-flash-dark',
  'combat-death-burst-light',
  'combat-death-burst-dark',
  'combat-spawn-light',
  'combat-spawn-dark',
  'combat-heal-pulse',
  'combat-status-poison',
  'combat-status-stun',
  'combat-ambient-arena',
] as const;

// ─── Style Bible (inline summary for prompt construction) ─────────────────────

const STYLE_BASE =
  'Luminous Stained-Glass Fantasy style, high contrast, elegant, mythic warfare aesthetic, ' +
  'premium game art, detailed. Centered subject on a PURE SOLID WHITE background. ' +
  'High edge contrast. No background texture. No cast shadow extending into the background.';

const FACTION_COLORS: Record<VFXFaction, string> = {
  light: 'ivory, pale gold, and azure',
  dark:  'obsidian, deep violet, and crimson',
  neutral: 'neutral silver, grey, and soft white',
};

const NEGATIVE_BASE =
  'humanoid figures, character silhouettes, anatomy, faces, body parts, wings, ' +
  'armor, weapons, text, watermark, low quality, blurry, flat';

// ─── Catalog ─────────────────────────────────────────────────────────────────

export const VFX_CATALOG: VFXPreset[] = [
  {
    id: 'preset-combat-hit-flash-light',
    name: 'Hit Flash — Light',
    family: 'hit',
    faction: 'light',
    description: 'Sacred golden impact burst triggered when a Light unit lands a hit.',
    use_case: 'Plays on the defender\'s position when a Light unit attack resolves.',
    asset_slot: 'combat-hit-flash-light',
    prompt_brief:
      `${STYLE_BASE} A high-speed, explosive hit flash VFX effect for a Light faction attack. ` +
      `Radiating sacred energy, sharp golden spikes, blazing azure central core glow. ` +
      `Colors: ${FACTION_COLORS.light}. Optimized for 0.1s gameplay readability. ` +
      `PURE PARTICLE AND ENERGY EFFECT ONLY — no character forms.`,
    negative_prompt: NEGATIVE_BASE,
    visual_tags: ['flash', 'impact', 'burst', 'gold', 'azure', 'radial', 'fast', 'sacred'],
    timing_ms: 150,
    intensity: 3,
    layering: 'overlay',
    approved_for_generation: true,
  },
  {
    id: 'preset-combat-hit-flash-dark',
    name: 'Hit Flash — Dark',
    family: 'hit',
    faction: 'dark',
    description: 'Abyssal void impact burst triggered when a Dark unit lands a hit.',
    use_case: 'Plays on the defender\'s position when a Dark unit attack resolves.',
    asset_slot: 'combat-hit-flash-dark',
    prompt_brief:
      `${STYLE_BASE} A high-speed, explosive hit flash VFX effect for a Dark faction attack. ` +
      `Void energy implosion, jagged crimson shards, deep violet shock ring. ` +
      `Colors: ${FACTION_COLORS.dark}. Optimized for 0.1s gameplay readability. ` +
      `PURE PARTICLE AND ENERGY EFFECT ONLY — no character forms.`,
    negative_prompt: NEGATIVE_BASE,
    visual_tags: ['flash', 'impact', 'void', 'crimson', 'violet', 'radial', 'fast', 'abyssal'],
    timing_ms: 150,
    intensity: 3,
    layering: 'overlay',
    approved_for_generation: true,
  },
  {
    id: 'preset-combat-death-burst-light',
    name: 'Death Burst — Light',
    family: 'death',
    faction: 'light',
    description: 'Holy radiant death explosion when a Light unit is defeated.',
    use_case: 'Plays at the Light unit\'s position on death; replaces the unit sprite.',
    asset_slot: 'combat-death-burst-light',
    prompt_brief:
      `${STYLE_BASE} A powerful death explosion VFX for a Light faction unit. ` +
      `Holy light eruption, ascending golden particles, radiant shockwave expanding outward. ` +
      `Colors: ${FACTION_COLORS.light}. Dramatic but reads clearly against dark arena. ` +
      `PURE PARTICLE AND ENERGY EFFECT ONLY — NO body, NO wings, NO character silhouette.`,
    negative_prompt: NEGATIVE_BASE + ', skull, bones, blood',
    visual_tags: ['death', 'burst', 'holy', 'explosion', 'gold', 'ascending', 'radiant'],
    timing_ms: 600,
    intensity: 5,
    layering: 'overlay',
    approved_for_generation: true,
  },
  {
    id: 'preset-combat-death-burst-dark',
    name: 'Death Burst — Dark',
    family: 'death',
    faction: 'dark',
    description: 'Void implosion death effect when a Dark unit is defeated.',
    use_case: 'Plays at the Dark unit\'s position on death; replaces the unit sprite.',
    asset_slot: 'combat-death-burst-dark',
    prompt_brief:
      `${STYLE_BASE} A powerful death implosion VFX for a Dark faction unit. ` +
      `Shadow vortex collapsing inward, crimson energy tendrils, void particles dissolving. ` +
      `Colors: ${FACTION_COLORS.dark}. Reads as dark energy being consumed by nothingness. ` +
      `PURE PARTICLE AND ENERGY EFFECT ONLY — NO body, NO wings, NO character silhouette.`,
    negative_prompt: NEGATIVE_BASE + ', skull, bones, blood',
    visual_tags: ['death', 'implosion', 'void', 'dark', 'vortex', 'crimson', 'dissolve'],
    timing_ms: 600,
    intensity: 5,
    layering: 'overlay',
    approved_for_generation: true,
  },
  {
    id: 'preset-combat-spawn-light',
    name: 'Spawn Effect — Light',
    family: 'spawn',
    faction: 'light',
    description: 'Holy arrival aura beam when a Light unit enters the board.',
    use_case: 'Plays at the destination tile when a Light unit is placed or teleports in.',
    asset_slot: 'combat-spawn-light',
    prompt_brief:
      `${STYLE_BASE} A spawn/arrival VFX for a Light faction unit. ` +
      `Descending column of sacred light, golden ring impact on ground, celestial particles rising. ` +
      `Colors: ${FACTION_COLORS.light}. Overlay-safe — must work on top of board tiles. ` +
      `PURE PARTICLE AND ENERGY EFFECT ONLY — NO body, NO wings, NO character forms.`,
    negative_prompt: NEGATIVE_BASE,
    visual_tags: ['spawn', 'arrival', 'beam', 'light', 'gold', 'celestial', 'column', 'overlay'],
    timing_ms: 400,
    intensity: 3,
    layering: 'front',
    approved_for_generation: true,
  },
  {
    id: 'preset-combat-spawn-dark',
    name: 'Spawn Effect — Dark',
    family: 'spawn',
    faction: 'dark',
    description: 'Shadow portal emergence when a Dark unit enters the board.',
    use_case: 'Plays at the destination tile when a Dark unit is placed or teleports in.',
    asset_slot: 'combat-spawn-dark',
    prompt_brief:
      `${STYLE_BASE} A spawn/arrival VFX for a Dark faction unit. ` +
      `Rising shadow portal ring, void tendrils curling upward, deep violet mist dispersing. ` +
      `Colors: ${FACTION_COLORS.dark}. Overlay-safe — must work on top of board tiles. ` +
      `PURE PARTICLE AND ENERGY EFFECT ONLY — NO body, NO wings, NO character forms.`,
    negative_prompt: NEGATIVE_BASE,
    visual_tags: ['spawn', 'portal', 'dark', 'void', 'mist', 'violet', 'tendrils', 'overlay'],
    timing_ms: 400,
    intensity: 3,
    layering: 'front',
    approved_for_generation: true,
  },
  {
    id: 'preset-combat-heal-pulse',
    name: 'Heal Pulse',
    family: 'nova',
    faction: 'neutral',
    description: 'Green-white healing ripple applied when a unit is healed.',
    use_case: 'Plays on the target unit when heal resolves; must read positively.',
    asset_slot: 'combat-heal-pulse',
    prompt_brief:
      `${STYLE_BASE} A healing pulse VFX. ` +
      `Expanding concentric rings of soft green-white light, rising sparkle particles, organic flowing shapes. ` +
      `Colors: soft green, white, silver. Benevolent, warm, clearly positive in tone. ` +
      `PURE PARTICLE AND ENERGY EFFECT ONLY — no character forms.`,
    negative_prompt: NEGATIVE_BASE + ', red, crimson, fire, skull',
    visual_tags: ['heal', 'pulse', 'green', 'white', 'ripple', 'rising', 'benevolent', 'nova'],
    timing_ms: 500,
    intensity: 2,
    layering: 'overlay',
    approved_for_generation: true,
  },
  {
    id: 'preset-combat-status-poison',
    name: 'Status — Poison',
    family: 'status',
    faction: 'dark',
    description: 'Toxic poison status cloud that lingers on an afflicted unit.',
    use_case: 'Looping overlay on a unit that has the Poison status applied.',
    asset_slot: 'combat-status-poison',
    prompt_brief:
      `${STYLE_BASE} A poison status VFX effect. ` +
      `Toxic green-purple cloud, dripping acidic particles, slow bubbling mist. ` +
      `Colors: sickly green, dark purple. Must read as persistent and negative. ` +
      `PURE PARTICLE AND ENERGY EFFECT ONLY — no character forms.`,
    negative_prompt: NEGATIVE_BASE + ', skull, bones',
    visual_tags: ['status', 'poison', 'toxic', 'green', 'purple', 'mist', 'drip', 'loop'],
    timing_ms: 1200,
    intensity: 2,
    layering: 'overlay',
    approved_for_generation: true,
  },
  {
    id: 'preset-combat-status-stun',
    name: 'Status — Stun',
    family: 'status',
    faction: 'neutral',
    description: 'Yellow lightning stun spiral on a stunned unit.',
    use_case: 'Looping overlay on a unit that has the Stun status applied.',
    asset_slot: 'combat-status-stun',
    prompt_brief:
      `${STYLE_BASE} A stun status VFX effect. ` +
      `Crackling yellow-white lightning spiral, spinning electric rings, cartoon-readable daze effect. ` +
      `Colors: bright yellow, white. Must read as temporary incapacitation. ` +
      `PURE PARTICLE AND ENERGY EFFECT ONLY — no character forms.`,
    negative_prompt: NEGATIVE_BASE,
    visual_tags: ['status', 'stun', 'lightning', 'yellow', 'electric', 'spiral', 'loop', 'daze'],
    timing_ms: 1200,
    intensity: 2,
    layering: 'overlay',
    approved_for_generation: true,
  },
  {
    id: 'preset-combat-ambient-arena',
    name: 'Ambient Arena Effect',
    family: 'nova',
    faction: 'neutral',
    description: 'Subtle floating dust and energy particle layer over the arena.',
    use_case: 'Continuous background ambient layer that plays during all combat.',
    asset_slot: 'combat-ambient-arena',
    prompt_brief:
      `${STYLE_BASE} A subtle ambient VFX layer for a fantasy combat arena. ` +
      `Slowly drifting luminous dust motes, faint magical energy wisps, barely perceptible particle haze. ` +
      `Colors: soft gold, neutral silver. Must be non-distracting — ambiance only. ` +
      `PURE PARTICLE AND ENERGY EFFECT ONLY — no character forms, no foreground elements.`,
    negative_prompt: NEGATIVE_BASE + ', bright, intense, fast',
    visual_tags: ['ambient', 'dust', 'motes', 'background', 'subtle', 'loop', 'gold', 'silver'],
    timing_ms: 0, // looping
    intensity: 1,
    layering: 'back',
    approved_for_generation: true,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Builds a copyable, human-readable generation brief for an operator or AI agent.
 * Does NOT send any network request — pure string output.
 */
export function buildGenerationBrief(preset: VFXPreset): string {
  const lines: string[] = [
    `=== VFX Generation Brief ===`,
    `ID:          ${preset.id}`,
    `Asset Slot:  ${preset.asset_slot}`,
    `Name:        ${preset.name}`,
    `Family:      ${preset.family}`,
    `Faction:     ${preset.faction}`,
    `Intensity:   ${preset.intensity}/5`,
    `Timing:      ${preset.timing_ms === 0 ? 'looping' : `${preset.timing_ms}ms`}`,
    `Layering:    ${preset.layering}`,
    ``,
    `Description: ${preset.description}`,
    `Use Case:    ${preset.use_case}`,
    ``,
    `--- Prompt Brief ---`,
    preset.prompt_brief,
    ``,
    `--- Negative Prompt ---`,
    preset.negative_prompt ?? '(none)',
    ``,
    `--- Visual Tags ---`,
    preset.visual_tags.join(', '),
    ``,
    `Approved for Generation: ${preset.approved_for_generation ? 'YES' : 'NO'}`,
    `============================`,
  ];
  return lines.join('\n');
}

/**
 * Serialises the full VFX catalog to a formatted JSON string.
 * Caller is responsible for triggering browser download if needed.
 */
export function exportCatalogAsJSON(): string {
  return JSON.stringify(
    {
      exported_at: new Date().toISOString(),
      catalog_version: 1,
      entry_count: VFX_CATALOG.length,
      entries: VFX_CATALOG,
    },
    null,
    2,
  );
}

/**
 * Filters the catalog by family and/or faction.
 * Pass null to skip that filter axis.
 */
export function filterCatalog(opts: {
  family: VFXFamily | null;
  faction: VFXFaction | null;
}): VFXPreset[] {
  return VFX_CATALOG.filter(p => {
    if (opts.family !== null && p.family !== opts.family) return false;
    if (opts.faction !== null && p.faction !== opts.faction) return false;
    return true;
  });
}
