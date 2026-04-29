export interface AssetVersion {
  version: number;
  path: string;
  thumbnail_64?: string;
  thumbnail_256?: string;
  cutout_path?: string;
  prompt?: string;
  model_id?: string;
  created_at: string;
  hash?: string;
  width?: number;
  height?: number;
  duration?: number;
  mime_type?: string;
  codec?: string;
  container?: string;
}

export interface Asset {
  id: string;
  category: 'brand' | 'board' | 'unit' | 'spell' | 'ui' | 'music' | 'sfx' | 'voice';
  subcategory?: string;
  name: string;
  description: string;
  status: 'pending' | 'generating' | 'approved' | 'rejected' | 'failed' | 'recoverable_failed';
  type: 'image' | 'audio';
  faction?: 'light' | 'dark' | 'neutral';
  stage: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H';
  requiresCutout?: boolean;

  // Versioning & Approval
  version: number;
  approved_version?: number;
  current_display_version?: number;
  candidate_versions: AssetVersion[];
  asset_protected: boolean;

  // Active File Pointers
  path?: string;
  thumbnail_64?: string;
  thumbnail_256?: string;
  cutout_path?: string;

  // Technical Metadata
  source_prompt?: string;
  model_id?: string;
  width?: number;
  height?: number;
  duration?: number;
  mime_type?: string;
  codec?: string;
  container?: string;
  preferred_playback_file?: string;

  // Lifecycle
  created_at?: string;
  updated_at?: string;
  retry_count: number;
  hash?: string;
  notes?: string;
  error_log?: {
    stage: string;
    model: string;
    type: string;
    retries: number;
    file_result: string;
    cutout_result?: string;
    thumbnail_result?: string;
    timestamp: string;
  };
}

// ─── Combat Pack Export Contract ─────────────────────────────────────────────
// The game (archon-game) consumes ONLY this shape.
// Workshop never exposes internal Asset fields to the game.

export const COMBAT_PACK_SCHEMA_VERSION = '1.0' as const;

export interface CombatPackAsset {
  id: string;
  category: Asset['category'];
  subcategory?: string;
  faction?: Asset['faction'];
  type: Asset['type'];
  path: string;
  hash: string;
  mime_type: string;
}

export interface CombatPackManifest {
  schema_version: typeof COMBAT_PACK_SCHEMA_VERSION;
  generated_at: string;
  tags: string[];
  assets: CombatPackAsset[];
}

// ─── Initial Asset Roster ────────────────────────────────────────────────────

export const INITIAL_ASSETS: Asset[] = [
  // Stage A: Brand (Premium)
  { id: 'brand-logo-trans', stage: 'A', category: 'brand', name: 'Title Logo (Transparent)', description: 'Main game logo with transparency', status: 'pending', type: 'image', requiresCutout: true, model_id: 'gemini-3-pro-image-preview', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },
  { id: 'brand-logo-dark', stage: 'A', category: 'brand', name: 'Title Logo (Dark)', description: 'Main game logo on dark background', status: 'pending', type: 'image', model_id: 'gemini-3-pro-image-preview', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },
  { id: 'brand-key-art', stage: 'A', category: 'brand', name: 'Title Screen Key Art', description: 'Hero illustration for main menu', status: 'pending', type: 'image', model_id: 'gemini-3-pro-image-preview', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },
  { id: 'brand-banner', stage: 'A', category: 'brand', name: 'Faction Select Banner', description: 'Banner for choosing sides', status: 'pending', type: 'image', model_id: 'gemini-3-pro-image-preview', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },
  { id: 'brand-crest-light', stage: 'A', category: 'brand', name: 'Light Crest', description: 'Heraldry for the Light faction', status: 'pending', type: 'image', faction: 'light', model_id: 'gemini-3-pro-image-preview', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },
  { id: 'brand-crest-dark', stage: 'A', category: 'brand', name: 'Dark Crest', description: 'Heraldry for the Dark faction', status: 'pending', type: 'image', faction: 'dark', model_id: 'gemini-3-pro-image-preview', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },

  // Stage B: Board / Environment (Premium)
  { id: 'board-master', stage: 'B', category: 'board', name: 'Master Board', description: '16:9 board background', status: 'pending', type: 'image', model_id: 'gemini-3-pro-image-preview', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },
  { id: 'board-base', stage: 'B', category: 'board', name: 'Board Base', description: 'Square board background', status: 'pending', type: 'image', model_id: 'gemini-3-pro-image-preview', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },
  { id: 'tile-light', stage: 'B', category: 'board', name: 'Light Tile', description: 'Basic light square tile', status: 'pending', type: 'image', model_id: 'gemini-3.1-flash-image-preview', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },
  { id: 'tile-dark', stage: 'B', category: 'board', name: 'Dark Tile', description: 'Basic dark square tile', status: 'pending', type: 'image', model_id: 'gemini-3.1-flash-image-preview', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },
  { id: 'arena-light', stage: 'B', category: 'board', name: 'Light Arena', description: 'Combat arena background: light-dominant', status: 'pending', type: 'image', faction: 'light', model_id: 'gemini-3-pro-image-preview', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },
  { id: 'arena-dark', stage: 'B', category: 'board', name: 'Dark Arena', description: 'Combat arena background: dark-dominant', status: 'pending', type: 'image', faction: 'dark', model_id: 'gemini-3-pro-image-preview', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },

  // Stage C: Unit Sets – Light
  { id: 'unit-light-valkyrie-token', stage: 'C', category: 'unit', subcategory: 'token', name: 'Valkyrie Token', description: 'Light faction flying unit board token', status: 'pending', type: 'image', faction: 'light', requiresCutout: true, model_id: 'gemini-3.1-flash-image-preview', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },
  { id: 'unit-light-valkyrie-portrait', stage: 'C', category: 'unit', subcategory: 'portrait', name: 'Valkyrie Portrait', description: 'Light faction flying unit portrait', status: 'pending', type: 'image', faction: 'light', requiresCutout: true, model_id: 'gemini-3.1-flash-image-preview', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },
  { id: 'unit-light-archer-token', stage: 'C', category: 'unit', subcategory: 'token', name: 'Archer Token', description: 'Light faction ranged unit board token', status: 'pending', type: 'image', faction: 'light', requiresCutout: true, model_id: 'gemini-3.1-flash-image-preview', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },
  { id: 'unit-light-archer-portrait', stage: 'C', category: 'unit', subcategory: 'portrait', name: 'Archer Portrait', description: 'Light faction ranged unit portrait', status: 'pending', type: 'image', faction: 'light', requiresCutout: true, model_id: 'gemini-3.1-flash-image-preview', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },
  { id: 'unit-light-golem-token', stage: 'C', category: 'unit', subcategory: 'token', name: 'Golem Token', description: 'Light faction tank unit board token', status: 'pending', type: 'image', faction: 'light', requiresCutout: true, model_id: 'gemini-3.1-flash-image-preview', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },
  { id: 'unit-light-golem-portrait', stage: 'C', category: 'unit', subcategory: 'portrait', name: 'Golem Portrait', description: 'Light faction tank unit portrait', status: 'pending', type: 'image', faction: 'light', requiresCutout: true, model_id: 'gemini-3.1-flash-image-preview', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },
  { id: 'unit-light-knight-token', stage: 'C', category: 'unit', subcategory: 'token', name: 'Knight Token', description: 'Light faction melee unit board token', status: 'pending', type: 'image', faction: 'light', requiresCutout: true, model_id: 'gemini-3.1-flash-image-preview', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },
  { id: 'unit-light-knight-portrait', stage: 'C', category: 'unit', subcategory: 'portrait', name: 'Knight Portrait', description: 'Light faction melee unit portrait', status: 'pending', type: 'image', faction: 'light', requiresCutout: true, model_id: 'gemini-3.1-flash-image-preview', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },
  { id: 'unit-light-knight-defeated', stage: 'C', category: 'unit', subcategory: 'defeated', name: 'Knight Defeated', description: 'Light faction knight defeated state', status: 'pending', type: 'image', faction: 'light', requiresCutout: true, model_id: 'gemini-3.1-flash-image-preview', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },
  { id: 'unit-light-unicorn-token', stage: 'C', category: 'unit', subcategory: 'token', name: 'Unicorn Token', description: 'Light faction fast unit board token', status: 'pending', type: 'image', faction: 'light', requiresCutout: true, model_id: 'gemini-3.1-flash-image-preview', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },
  { id: 'unit-light-djinni-token', stage: 'C', category: 'unit', subcategory: 'token', name: 'Djinni Token', description: 'Light faction magic unit board token', status: 'pending', type: 'image', faction: 'light', requiresCutout: true, model_id: 'gemini-3.1-flash-image-preview', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },
  { id: 'unit-light-wizard-token', stage: 'C', category: 'unit', subcategory: 'token', name: 'Wizard Token', description: 'Light faction hero unit board token', status: 'pending', type: 'image', faction: 'light', requiresCutout: true, model_id: 'gemini-3.1-flash-image-preview', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },
  { id: 'unit-light-phoenix-token', stage: 'C', category: 'unit', subcategory: 'token', name: 'Phoenix Token', description: 'Light faction ultimate unit board token', status: 'pending', type: 'image', faction: 'light', requiresCutout: true, model_id: 'gemini-3.1-flash-image-preview', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },

  // Stage C: Unit Sets – Dark
  { id: 'unit-dark-manticore-token', stage: 'C', category: 'unit', subcategory: 'token', name: 'Manticore Token', description: 'Dark faction flying unit board token', status: 'pending', type: 'image', faction: 'dark', requiresCutout: true, model_id: 'gemini-3.1-flash-image-preview', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },
  { id: 'unit-dark-banshee-token', stage: 'C', category: 'unit', subcategory: 'token', name: 'Banshee Token', description: 'Dark faction ranged unit board token', status: 'pending', type: 'image', faction: 'dark', requiresCutout: true, model_id: 'gemini-3.1-flash-image-preview', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },
  { id: 'unit-dark-troll-token', stage: 'C', category: 'unit', subcategory: 'token', name: 'Troll Token', description: 'Dark faction tank unit board token', status: 'pending', type: 'image', faction: 'dark', requiresCutout: true, model_id: 'gemini-3.1-flash-image-preview', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },
  { id: 'unit-dark-goblin-token', stage: 'C', category: 'unit', subcategory: 'token', name: 'Goblin Token', description: 'Dark faction melee unit board token', status: 'pending', type: 'image', faction: 'dark', requiresCutout: true, model_id: 'gemini-3.1-flash-image-preview', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },
  { id: 'unit-dark-shapeshifter-token', stage: 'C', category: 'unit', subcategory: 'token', name: 'Shapeshifter Token', description: 'Dark faction magic unit board token', status: 'pending', type: 'image', faction: 'dark', requiresCutout: true, model_id: 'gemini-3.1-flash-image-preview', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },
  { id: 'unit-dark-sorceress-token', stage: 'C', category: 'unit', subcategory: 'token', name: 'Sorceress Token', description: 'Dark faction hero unit board token', status: 'pending', type: 'image', faction: 'dark', requiresCutout: true, model_id: 'gemini-3.1-flash-image-preview', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },
  { id: 'unit-dark-sorceress-portrait', stage: 'C', category: 'unit', subcategory: 'portrait', name: 'Sorceress Portrait', description: 'Dark faction hero unit portrait', status: 'pending', type: 'image', faction: 'dark', requiresCutout: true, model_id: 'gemini-3.1-flash-image-preview', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },
  { id: 'unit-dark-sorceress-defeated', stage: 'C', category: 'unit', subcategory: 'defeated', name: 'Sorceress Defeated', description: 'Dark faction sorceress defeated state', status: 'pending', type: 'image', faction: 'dark', requiresCutout: true, model_id: 'gemini-3.1-flash-image-preview', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },
  { id: 'unit-dark-dragon-token', stage: 'C', category: 'unit', subcategory: 'token', name: 'Dragon Token', description: 'Dark faction ultimate unit board token', status: 'pending', type: 'image', faction: 'dark', requiresCutout: true, model_id: 'gemini-3.1-flash-image-preview', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },

  // Stage D: Spells / Status / FX
  { id: 'spell-teleport', stage: 'D', category: 'spell', name: 'Teleport Icon', description: 'Spell icon for teleportation', status: 'pending', type: 'image', requiresCutout: true, model_id: 'gemini-3.1-flash-image-preview', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },
  { id: 'spell-heal', stage: 'D', category: 'spell', name: 'Heal Icon', description: 'Spell icon for healing', status: 'pending', type: 'image', requiresCutout: true, model_id: 'gemini-3.1-flash-image-preview', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },
  { id: 'status-wounded', stage: 'D', category: 'spell', name: 'Wounded Status', description: 'Status icon for wounded units', status: 'pending', type: 'image', requiresCutout: true, model_id: 'gemini-3.1-flash-image-preview', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },
  // Combat VFX – Knight vs Sorceress slice subset
  { id: 'combat-hit-flash-light-medium', stage: 'D', category: 'spell', subcategory: 'hit_flash', name: 'Hit Flash Light (M)', description: 'Medium sacred impact flash', status: 'pending', type: 'image', faction: 'light', requiresCutout: true, model_id: 'gemini-3.1-flash-image-preview', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },
  { id: 'combat-hit-flash-dark-medium', stage: 'D', category: 'spell', subcategory: 'hit_flash', name: 'Hit Flash Dark (M)', description: 'Medium abyssal impact flash', status: 'pending', type: 'image', faction: 'dark', requiresCutout: true, model_id: 'gemini-3.1-flash-image-preview', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },
  { id: 'combat-impact-spark-medium', stage: 'D', category: 'spell', subcategory: 'impact', name: 'Impact Spark (M)', description: 'Medium metallic impact sparks', status: 'pending', type: 'image', faction: 'neutral', requiresCutout: true, model_id: 'gemini-3.1-flash-image-preview', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },
  { id: 'combat-death-light', stage: 'D', category: 'spell', subcategory: 'death', name: 'Death Light', description: 'Light-based death effect', status: 'pending', type: 'image', faction: 'light', requiresCutout: true, model_id: 'gemini-3.1-flash-image-preview', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },
  { id: 'combat-death-dark', stage: 'D', category: 'spell', subcategory: 'death', name: 'Death Dark', description: 'Dark-based death effect', status: 'pending', type: 'image', faction: 'dark', requiresCutout: true, model_id: 'gemini-3.1-flash-image-preview', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },
  { id: 'combat-nova-light', stage: 'D', category: 'spell', subcategory: 'nova', name: 'Nova Light', description: 'Expanding ring of holy light', status: 'pending', type: 'image', faction: 'light', requiresCutout: true, model_id: 'gemini-3.1-flash-image-preview', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },
  { id: 'combat-nova-dark', stage: 'D', category: 'spell', subcategory: 'nova', name: 'Nova Dark', description: 'Expanding ring of shadow', status: 'pending', type: 'image', faction: 'dark', requiresCutout: true, model_id: 'gemini-3.1-flash-image-preview', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },
  { id: 'combat-spawn-light', stage: 'D', category: 'spell', subcategory: 'spawn', name: 'Spawn Light', description: 'Light-based spawn effect', status: 'pending', type: 'image', faction: 'light', requiresCutout: true, model_id: 'gemini-3.1-flash-image-preview', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },
  { id: 'combat-spawn-dark', stage: 'D', category: 'spell', subcategory: 'spawn', name: 'Spawn Dark', description: 'Dark-based spawn effect', status: 'pending', type: 'image', faction: 'dark', requiresCutout: true, model_id: 'gemini-3.1-flash-image-preview', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },
  
  // VFX Catalog additions (ARCHON-006D)
  { id: 'combat-hit-flash-light', stage: 'D', category: 'spell', subcategory: 'hit_flash', name: 'Hit Flash Light', description: 'Sacred golden impact burst', status: 'pending', type: 'image', faction: 'light', requiresCutout: true, model_id: 'gemini-3.1-flash-image-preview', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },
  { id: 'combat-hit-flash-dark', stage: 'D', category: 'spell', subcategory: 'hit_flash', name: 'Hit Flash Dark', description: 'Abyssal void impact burst', status: 'pending', type: 'image', faction: 'dark', requiresCutout: true, model_id: 'gemini-3.1-flash-image-preview', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },
  { id: 'combat-death-burst-light', stage: 'D', category: 'spell', subcategory: 'death', name: 'Death Burst Light', description: 'Holy radiant death explosion', status: 'pending', type: 'image', faction: 'light', requiresCutout: true, model_id: 'gemini-3.1-flash-image-preview', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },
  { id: 'combat-death-burst-dark', stage: 'D', category: 'spell', subcategory: 'death', name: 'Death Burst Dark', description: 'Void implosion death effect', status: 'pending', type: 'image', faction: 'dark', requiresCutout: true, model_id: 'gemini-3.1-flash-image-preview', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },
  { id: 'combat-heal-pulse', stage: 'D', category: 'spell', subcategory: 'nova', name: 'Heal Pulse', description: 'Green-white healing ripple', status: 'pending', type: 'image', faction: 'neutral', requiresCutout: true, model_id: 'gemini-3.1-flash-image-preview', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },
  { id: 'combat-status-poison', stage: 'D', category: 'spell', subcategory: 'status', name: 'Status Poison', description: 'Toxic poison status cloud', status: 'pending', type: 'image', faction: 'dark', requiresCutout: true, model_id: 'gemini-3.1-flash-image-preview', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },
  { id: 'combat-status-stun', stage: 'D', category: 'spell', subcategory: 'status', name: 'Status Stun', description: 'Yellow lightning stun spiral', status: 'pending', type: 'image', faction: 'neutral', requiresCutout: true, model_id: 'gemini-3.1-flash-image-preview', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },
  { id: 'combat-ambient-arena', stage: 'D', category: 'spell', subcategory: 'nova', name: 'Ambient Arena', description: 'Floating dust and energy particle layer', status: 'pending', type: 'image', faction: 'neutral', requiresCutout: true, model_id: 'gemini-3.1-flash-image-preview', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },
  { id: 'combat-projectile-light', stage: 'D', category: 'spell', subcategory: 'projectile', name: 'Projectile Light', description: 'Sacred golden bolt', status: 'pending', type: 'image', faction: 'light', requiresCutout: true, model_id: 'gemini-3.1-flash-image-preview', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },
  { id: 'combat-projectile-dark', stage: 'D', category: 'spell', subcategory: 'projectile', name: 'Projectile Dark', description: 'Shadow void bolt', status: 'pending', type: 'image', faction: 'dark', requiresCutout: true, model_id: 'gemini-3.1-flash-image-preview', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },

  // Stage E: UI Kit
  { id: 'ui-button-idle', stage: 'E', category: 'ui', name: 'Button Idle', description: 'Standard UI button idle state', status: 'pending', type: 'image', requiresCutout: true, model_id: 'gemini-3.1-flash-image-preview', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },
  { id: 'ui-panel-frame', stage: 'E', category: 'ui', name: 'Panel Frame', description: 'Main UI panel frame', status: 'pending', type: 'image', requiresCutout: true, model_id: 'gemini-3.1-flash-image-preview', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },

  // Stage F: Music
  { id: 'music-title-loop', stage: 'F', category: 'music', name: 'Title Loop', description: '30s loopable title theme', status: 'pending', type: 'audio', model_id: 'lyria-3-pro-preview', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },
  { id: 'music-board-loop', stage: 'F', category: 'music', name: 'Board Loop', description: '30s loopable strategy theme', status: 'pending', type: 'audio', model_id: 'lyria-3-pro-preview', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },
  { id: 'music-battle-loop', stage: 'F', category: 'music', name: 'Battle Loop', description: '30s loopable combat theme', status: 'pending', type: 'audio', model_id: 'lyria-3-pro-preview', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },
  { id: 'music-victory-cue', stage: 'F', category: 'music', name: 'Victory Cue', description: 'Short victory stinger', status: 'pending', type: 'audio', model_id: 'lyria-3-clip-preview', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },

  // Stage G: SFX
  { id: 'sfx-click', stage: 'G', category: 'sfx', name: 'UI Click', description: 'Standard button click', status: 'pending', type: 'audio', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },
  { id: 'sfx-confirm', stage: 'G', category: 'sfx', name: 'UI Confirm', description: 'Action confirmation sound', status: 'pending', type: 'audio', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },
  { id: 'sfx-move-ground', stage: 'G', category: 'sfx', name: 'Move Ground', description: 'Unit moving on ground', status: 'pending', type: 'audio', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },
  { id: 'sfx-melee-hit', stage: 'G', category: 'sfx', name: 'Melee Hit', description: 'Physical strike impact', status: 'pending', type: 'audio', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },
  { id: 'sfx-death-light', stage: 'G', category: 'sfx', name: 'Death Light', description: 'Light faction unit death sound', status: 'pending', type: 'audio', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },
  { id: 'sfx-death-dark', stage: 'G', category: 'sfx', name: 'Death Dark', description: 'Dark faction unit death sound', status: 'pending', type: 'audio', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },

  // Stage H: Voice
  { id: 'voice-light-turn', stage: 'H', category: 'voice', name: 'Light Turn Announcer', description: 'Announcer line: "Light Turn"', status: 'pending', type: 'audio', model_id: 'gemini-2.5-flash-preview-tts', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },
  { id: 'voice-dark-turn', stage: 'H', category: 'voice', name: 'Dark Turn Announcer', description: 'Announcer line: "Dark Turn"', status: 'pending', type: 'audio', model_id: 'gemini-2.5-flash-preview-tts', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },
  { id: 'voice-battle', stage: 'H', category: 'voice', name: 'Voice Battle', description: 'Announcer: "Battle Begins!"', status: 'pending', type: 'audio', model_id: 'gemini-2.5-flash-preview-tts', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },
  { id: 'voice-victory', stage: 'H', category: 'voice', name: 'Voice Victory', description: 'Announcer: "Victory!"', status: 'pending', type: 'audio', model_id: 'gemini-2.5-flash-preview-tts', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },
  { id: 'voice-defeat', stage: 'H', category: 'voice', name: 'Voice Defeat', description: 'Announcer: "Defeat!"', status: 'pending', type: 'audio', model_id: 'gemini-2.5-flash-preview-tts', version: 0, candidate_versions: [], asset_protected: false, retry_count: 0 },
];

// IDs needed for the Knight vs Sorceress combat slice
export const COMBAT_SLICE_REQUIRED_IDS = [
  'unit-light-knight-token',
  'unit-light-knight-portrait',
  'unit-light-knight-defeated',
  'unit-dark-sorceress-token',
  'unit-dark-sorceress-portrait',
  'unit-dark-sorceress-defeated',
  'arena-light',
  'arena-dark',
  'music-battle-loop',
  'sfx-melee-hit',
  'sfx-death-light',
  'sfx-death-dark',
  'voice-light-turn',
  'voice-dark-turn',
  'voice-battle',
  'combat-hit-flash-light-medium',
  'combat-hit-flash-dark-medium',
  'combat-death-light',
  'combat-death-dark',
];
