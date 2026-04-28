/**
 * workshopPersistence.ts
 *
 * Pure, browser-safe helpers for saving and restoring workshop UI state.
 * No I/O is performed here — all fetch calls are in App.tsx so this module
 * can be unit-tested without a running server.
 *
 * Protected contracts NOT touched by this module:
 *   - CombatPackManifest / COMBAT_PACK_SCHEMA_VERSION
 *   - asset-manifest.json
 *   - ZIP export/import pipeline
 */

// ─── Schema ───────────────────────────────────────────────────────────────────

export const WORKSHOP_STATE_SCHEMA_VERSION = 1 as const;

/** All valid tab ids (must stay in sync with TABS in App.tsx) */
export const VALID_TABS = ['dashboard', 'generation', 'vfx', 'scenelab', 'export'] as const;
export type ValidTab = typeof VALID_TABS[number];

/** Valid generation presets */
export const VALID_PRESETS = ['draft', 'production', 'premium'] as const;
export type GenerationPreset = typeof VALID_PRESETS[number];

/** Valid Scene Lab preset keys (must stay in sync with SCENE_PRESETS in SceneLabPanel.tsx) */
export const VALID_SCENE_PRESETS = [
  'combat_knight_vs_sorceress',
  'board_overview',
] as const;
export type ScenePresetKey = typeof VALID_SCENE_PRESETS[number];

export interface WorkshopUIState {
  schema_version: typeof WORKSHOP_STATE_SCHEMA_VERSION;
  saved_at: string;
  active_tab: ValidTab;
  style_lock: {
    light: string;
    dark: string;
    ui: string;
    vfx: string;
  };
  generation_preset: GenerationPreset;
  scene_lab: {
    preset: ScenePresetKey;
    review_notes: Record<string, string>;
  };
}

// ─── Validation ───────────────────────────────────────────────────────────────

export interface ValidationError {
  field: string;
  message: string;
}

export type ValidationResult =
  | { ok: true; valid: true; state: WorkshopUIState }
  | { ok: false; valid: false; errors: ValidationError[] };

/**
 * Validates an unknown value as a WorkshopUIState.
 * Returns a typed result — never throws.
 * Use `result.ok` (or `result.valid`) as the discriminant before accessing
 * `result.state` (ok branch) or `result.errors` (not-ok branch).
 */
export function validateWorkshopState(raw: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, valid: false, errors: [{ field: 'root', message: 'State must be a JSON object.' }] };
  }

  const obj = raw as Record<string, unknown>;

  // schema_version
  if (obj['schema_version'] !== WORKSHOP_STATE_SCHEMA_VERSION) {
    errors.push({
      field: 'schema_version',
      message: `Expected schema_version ${WORKSHOP_STATE_SCHEMA_VERSION}, got ${String(obj['schema_version'])}.`,
    });
  }

  // active_tab
  if (!VALID_TABS.includes(obj['active_tab'] as ValidTab)) {
    errors.push({
      field: 'active_tab',
      message: `Invalid active_tab "${String(obj['active_tab'])}". Must be one of: ${VALID_TABS.join(', ')}.`,
    });
  }

  // generation_preset
  if (!VALID_PRESETS.includes(obj['generation_preset'] as GenerationPreset)) {
    errors.push({
      field: 'generation_preset',
      message: `Invalid generation_preset "${String(obj['generation_preset'])}". Must be one of: ${VALID_PRESETS.join(', ')}.`,
    });
  }

  // style_lock
  const sl = obj['style_lock'];
  if (typeof sl !== 'object' || sl === null || Array.isArray(sl)) {
    errors.push({ field: 'style_lock', message: 'style_lock must be an object.' });
  } else {
    const slObj = sl as Record<string, unknown>;
    for (const key of ['light', 'dark', 'ui', 'vfx'] as const) {
      if (typeof slObj[key] !== 'string') {
        errors.push({ field: `style_lock.${key}`, message: `style_lock.${key} must be a string.` });
      }
    }
  }

  // scene_lab
  const slab = obj['scene_lab'];
  if (typeof slab !== 'object' || slab === null || Array.isArray(slab)) {
    errors.push({ field: 'scene_lab', message: 'scene_lab must be an object.' });
  } else {
    const slabObj = slab as Record<string, unknown>;

    if (!VALID_SCENE_PRESETS.includes(slabObj['preset'] as ScenePresetKey)) {
      errors.push({
        field: 'scene_lab.preset',
        message: `Invalid scene_lab.preset "${String(slabObj['preset'])}". Must be one of: ${VALID_SCENE_PRESETS.join(', ')}.`,
      });
    }

    const notes = slabObj['review_notes'];
    if (typeof notes !== 'object' || notes === null || Array.isArray(notes)) {
      errors.push({ field: 'scene_lab.review_notes', message: 'scene_lab.review_notes must be a flat object.' });
    } else {
      const notesObj = notes as Record<string, unknown>;
      for (const [k, v] of Object.entries(notesObj)) {
        if (typeof v !== 'string') {
          errors.push({
            field: `scene_lab.review_notes.${k}`,
            message: `review_notes value for "${k}" must be a string.`,
          });
        }
      }
    }
  }

  if (errors.length > 0) {
    return { ok: false, valid: false, errors };
  }

  return { ok: true, valid: true, state: raw as WorkshopUIState };
}

// ─── Serialization helpers ────────────────────────────────────────────────────

/**
 * Builds a WorkshopUIState snapshot from current app state.
 * Pure — no side effects.
 */
export function buildWorkshopState(params: {
  activeTab: ValidTab;
  styleLock: { light: string; dark: string; ui: string; vfx: string };
  generationPreset: GenerationPreset;
  sceneLabPreset: ScenePresetKey;
  sceneLabReviewNotes: Record<string, string>;
}): WorkshopUIState {
  return {
    schema_version: WORKSHOP_STATE_SCHEMA_VERSION,
    saved_at: new Date().toISOString(),
    active_tab: params.activeTab,
    style_lock: { ...params.styleLock },
    generation_preset: params.generationPreset,
    scene_lab: {
      preset: params.sceneLabPreset,
      review_notes: { ...params.sceneLabReviewNotes },
    },
  };
}

/**
 * Triggers a browser download of the workspace state as a JSON file.
 * Pure side-effect limited to browser download API — no server calls.
 */
export function downloadWorkshopState(state: WorkshopUIState): void {
  const json = JSON.stringify(state, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `archon-workshop-state-${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Reads a File object as text and parses it as JSON.
 * Returns the raw parsed value — caller must validate with validateWorkshopState().
 * Throws if the file cannot be read or is not valid JSON.
 */
export async function parseWorkshopStateFile(file: File): Promise<unknown> {
  const text = await file.text();
  return JSON.parse(text);
}
