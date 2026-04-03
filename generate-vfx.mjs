/**
 * generate-vfx.mjs — patched model to gemini-2.0-flash-exp
 */
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) { console.error('❌ GEMINI_API_KEY not set'); process.exit(1); }

// Images go into workshop's own public/generated/images dir
const IMAGES_DIR = path.join(__dirname, 'public/generated/images');
const WORKSHOP_URL = 'http://localhost:3000';

const ai = new GoogleGenAI({ apiKey: API_KEY });
fs.mkdirSync(IMAGES_DIR, { recursive: true });

// Style preamble — consistent with approved pack art (stained-glass fantasy)
const STYLE = 'Fantasy game combat VFX sprite. Style: stained-glass digital painting, hand-painted fantasy aesthetic, rich jewel-tone colors, bold black outlines. Transparent/black background. Square 1:1 aspect ratio. No text, no UI, no units — only the visual effect. High contrast, readable at speed.';

const VFX = [
  {
    id: 'combat-hit-flash-light',
    prompt: `${STYLE} Sacred radiant impact flash. Golden-white starburst explosion, rays of holy light radiating outward from center. Bright white core transitioning to gold at edges, fading to transparent. Sun-flare feeling. Epic but readable at gameplay speed.`,
  },
  {
    id: 'combat-hit-flash-dark',
    prompt: `${STYLE} Abyssal dark impact burst. Purple-black explosion with crackling violet lightning tendrils. Shadow smoke wisps at edges. Dark core with purple glow rim. Reads clearly against light backgrounds.`,
  },
  {
    id: 'combat-death-burst-light',
    prompt: `${STYLE} Radiant holy death explosion. Large sacred nova burst — white-gold circular shockwave expanding outward. Trailing light particles and wing-like fragments dissolving into divine radiance. Final blow energy. Epic scale.`,
  },
  {
    id: 'combat-death-burst-dark',
    prompt: `${STYLE} Void implosion death effect. Purple-black energy collapsing inward with crackling dark lightning at the rim. Shadow fragments flying outward. Swirling void center. Dark faction finale. Epic and readable.`,
  },
  {
    id: 'combat-spawn-light',
    prompt: `${STYLE} Holy unit entrance beam. Column of golden divine light descending from top, circular ring of light particles expanding at base. Heavenly arrival from above. Vertical composition.`,
  },
  {
    id: 'combat-spawn-dark',
    prompt: `${STYLE} Shadow portal emergence effect. Swirling dark vortex with crackling purple energy at the rim. Void tendrils curling outward from center. Dark faction arrival portal.`,
  },
  {
    id: 'combat-heal-pulse',
    prompt: `${STYLE} Gentle healing energy ripple. Concentric green-white glowing rings expanding outward from center. Soft luminosity, motes of healing light floating upward. Nurturing. Low aggression.`,
  },
  {
    id: 'combat-status-poison',
    prompt: `${STYLE} Toxic poison status icon-sized effect. Swirling toxic green bubble cloud with acid drip particles. Venomous green glow. Compact design for portrait overlay. Clearly reads as poison.`,
  },
  {
    id: 'combat-status-stun',
    prompt: `${STYLE} Electric stun status effect. Yellow lightning crackle spiral with orbiting cartoon stars circling a central point. Bright yellow-white sparks. Classic stun visual. Clear at small sizes.`,
  },
  {
    id: 'combat-ambient-arena',
    prompt: `${STYLE} Arena atmosphere particle layer. Very sparse golden dust motes and tiny light particles drifting. Low opacity. More dark space than light. Subtle — must not compete with units or UI. Decorative only.`,
  },
];

// Try multiple available models in order
const MODELS_TO_TRY = [
  'gemini-2.0-flash-exp',
  'gemini-2.5-flash-preview-04-17',
  'gemini-2.0-flash-preview-image-generation',
  'imagen-3.0-generate-001',
];

async function generateImage(prompt, assetId) {
  for (const model of MODELS_TO_TRY) {
    try {
      console.log(`  Trying model: ${model}`);
      const response = await ai.models.generateContent({
        model,
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseModalities: ['IMAGE', 'TEXT'] },
      });
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData?.data) {
          console.log(`  ✅ Success with ${model}`);
          return { data: part.inlineData.data, model };
        }
      }
      console.log(`  ⚠️ ${model}: no image data in response`);
    } catch (err) {
      const msg = err.message || JSON.stringify(err);
      if (msg.includes('404') || msg.includes('NOT_FOUND')) {
        console.log(`  ⚠️ ${model}: not available, trying next...`);
        continue;
      }
      throw err; // re-throw non-404 errors
    }
  }
  throw new Error(`All models exhausted for ${assetId}`);
}

async function generateVFX(vfx) {
  console.log(`\n[${vfx.id}] Generating...`);
  const outPath = path.join(IMAGES_DIR, `${vfx.id}.png`);

  if (fs.existsSync(outPath) && fs.statSync(outPath).size > 0) {
    console.log(`  ⏭ Pre-existing (${Math.round(fs.statSync(outPath).size/1024)}KB), skipping.`);
    return { id: vfx.id, result: 'skipped', size: fs.statSync(outPath).size };
  }

  try {
    const { data, model } = await generateImage(vfx.prompt, vfx.id);
    const buffer = Buffer.from(data, 'base64');
    if (buffer.length === 0) throw new Error('Zero-byte image returned');
    fs.writeFileSync(outPath, buffer);
    console.log(`  ✅ Written (${Math.round(buffer.length/1024)}KB) via ${model}`);
    return { id: vfx.id, result: 'generated', size: buffer.length, model };
  } catch (err) {
    console.error(`  ❌ Failed: ${err.message}`);
    return { id: vfx.id, result: 'failed', error: err.message };
  }
}

// ── Single test first ─────────────────────────────────────────────────────────
console.log('=== Phase 2: VFX Generation ===');
console.log(`Output dir: ${IMAGES_DIR}\n`);

const results = [];
for (const vfx of VFX) {
  const result = await generateVFX(vfx);
  results.push(result);
  await new Promise(r => setTimeout(r, 1000));
}

const generated = results.filter(r => r.result === 'generated').length;
const skipped = results.filter(r => r.result === 'skipped').length;
const failed = results.filter(r => r.result === 'failed').length;

console.log(`\n=== Summary: generated=${generated} skipped=${skipped} failed=${failed} ===`);
results.forEach(r => {
  if (r.result === 'failed') console.log(`  ❌ ${r.id}: ${r.error}`);
});

if (failed === 10) {
  console.error('\n🛑 All generations failed — model access issue. Stopping before rehydrate.');
  process.exit(1);
}

// Rehydrate manifest with newly generated files
console.log('\n=== Calling /api/rehydrate-manifest ===');
const r = await fetch(`${WORKSHOP_URL}/api/rehydrate-manifest`);
const d = await r.json();
const vfxIds = VFX.map(v => v.id);
const vfxAssets = d.assets.filter(a => vfxIds.includes(a.id));
console.log('VFX post-rehydrate status:');
vfxAssets.forEach(a => {
  console.log(`  ${a.id}: ${a.status} ${a.path || '(no path)'}`);
});
