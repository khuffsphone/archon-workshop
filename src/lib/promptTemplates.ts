export const STYLE_BIBLE = {
  theme: "Luminous Stained-Glass Fantasy",
  description: "A blend of retro-modern mythic warfare and premium dark-fantasy strategy UI. High contrast, elegant, readable.",
  palettes: {
    light: {
      primary: "Ivory (#FFFFF0)",
      secondary: "Moon-Silver (#E1E1E1)",
      accent: "Pale Gold (#EEE8AA)",
      highlight: "Azure (#F0FFFF)"
    },
    dark: {
      primary: "Obsidian (#0B0B0B)",
      secondary: "Deep Violet (#2E0854)",
      accent: "Crimson (#DC143C)",
      highlight: "Ember Orange (#FF4500)"
    }
  }
};

export function getPromptForAsset(asset: any, preset: 'draft' | 'production' | 'premium' = 'production') {
  const detailLevel = preset === 'draft' ? "minimal detail" : preset === 'premium' ? "hyper-detailed, intricate textures, cinematic lighting" : "detailed";
  const baseStyle = `${STYLE_BIBLE.theme} style, high contrast, elegant, mythic warfare aesthetic, premium game art, ${detailLevel}.`;
  const cutoutInstructions = asset.requiresCutout ? "Centered subject on a PURE SOLID WHITE background. High edge contrast. No background texture. No cast shadow extending into the background. No white elements touching the silhouette edge." : "";
  
  if (asset.category === 'unit') {
    const factionColor = asset.faction === 'light' ? "ivory, gold, and azure" : "obsidian, violet, and crimson";
    const type = asset.subcategory === 'token' ? "full body board token" : "detailed character portrait";
    return `${baseStyle} ${type} of a ${asset.name}, a ${asset.faction} faction unit. Colors: ${factionColor}. ${cutoutInstructions} Detailed armor and magical effects.`;
  }
  
  if (asset.category === 'brand') {
    if (asset.id.includes('logo')) {
      return `${baseStyle} A majestic game title logo for 'Archon: Asset Forge'. Mythic typography, glowing elements, centered composition. ${cutoutInstructions}`;
    }
    return `${baseStyle} ${asset.description}. Epic scale, cinematic lighting.`;
  }

  if (asset.category === 'board') {
    return `${baseStyle} ${asset.description}. Stained glass patterns, glowing ley lines, high contrast tiles.`;
  }

  if (asset.category === 'spell' || asset.category === 'ui') {
    const factionColor = asset.faction === 'light' ? "ivory, gold, and azure" : asset.faction === 'dark' ? "obsidian, violet, and crimson" : "neutral silver and grey";
    
    // Specialized Combat VFX Templates
    if (asset.subcategory === 'hit_flash') {
      return `${baseStyle} A high-speed, explosive hit flash effect. Radiating energy, sharp spikes, central core glow. Colors: ${factionColor}. ${cutoutInstructions} Optimized for 0.1s gameplay readability.`;
    }
    if (asset.subcategory === 'impact') {
      return `${baseStyle} A debris and spark impact effect. Shards flying outward, kinetic energy. Colors: ${factionColor}. ${cutoutInstructions} High contrast against dark backgrounds.`;
    }
    if (asset.subcategory === 'projectile' || asset.subcategory === 'trail') {
      return `${baseStyle} A dynamic projectile flight trail. Motion blur, energy streaks, tapered end. Colors: ${factionColor}. ${cutoutInstructions} Directional flow from left to right.`;
    }
    if (asset.subcategory === 'beam') {
      return `${baseStyle} A continuous magical beam or channel. Core energy line with outer glow and particles. Colors: ${factionColor}. ${cutoutInstructions} Horizontal orientation.`;
    }
    if (asset.subcategory === 'nova' || asset.subcategory === 'burst') {
      return `${baseStyle} A powerful area-of-effect burst or nova. Expanding shockwave, radial symmetry. Colors: ${factionColor}. ${cutoutInstructions} Top-down perspective.`;
    }
    if (asset.subcategory === 'barrier' || asset.subcategory === 'shield') {
      return `${baseStyle} A protective magical barrier or shield flicker. Hexagonal patterns, energy ripples. Colors: ${factionColor}. ${cutoutInstructions} Semi-transparent appearance.`;
    }
    if (asset.subcategory === 'dodge') {
      return `${baseStyle} A subtle after-image or flash for a dodge maneuver. Motion streaks, fading silhouette. Colors: ${factionColor}. ${cutoutInstructions}`;
    }
    if (asset.subcategory === 'heal' || asset.subcategory === 'revive') {
      return `${baseStyle} A benevolent healing aura or revival burst. Rising particles, soft glow, organic shapes. Colors: ${factionColor}. ${cutoutInstructions}`;
    }
    if (asset.subcategory === 'imprison' || asset.subcategory === 'status') {
      return `${baseStyle} A restrictive status effect or imprisonment sigil. Chains, rings, or glowing runes. Colors: ${factionColor}. ${cutoutInstructions}`;
    }
    if (asset.subcategory === 'spawn' || asset.subcategory === 'teleport' || asset.subcategory === 'death') {
      // Check if description requests a pure-VFX overlay (no character forms)
      const isPureVFX = asset.description?.includes('NO body') || asset.description?.includes('Overlay-safe');
      if (isPureVFX) {
        const noCharGuard = 'IMPORTANT: This must be a PURE PARTICLE AND ENERGY EFFECT ONLY. NO humanoid figures, NO character silhouettes, NO anatomy, NO faces, NO body parts, NO wings, NO armor, NO weapons. Only abstract energy, particles, light, and geometric shapes. The effect must work as a transparent overlay on top of a game character sprite.';
        return `${baseStyle} ${asset.description} ${noCharGuard} Colors: ${factionColor}. ${cutoutInstructions}`;
      }
      return `${baseStyle} A dramatic transition effect for spawning, teleporting, or death. Dissolving particles, energy vortex. Colors: ${factionColor}. ${cutoutInstructions}`;
    }
    if (asset.subcategory === 'reticle' || asset.subcategory === 'badge') {
      return `${baseStyle} A clean, functional combat UI element. Sharp edges, glowing runes, high legibility. Colors: ${factionColor}. ${cutoutInstructions} Flat vector-like style with glow.`;
    }

    return `${baseStyle} ${asset.description}. Glowing magical icon. ${cutoutInstructions}`;
  }

  if (asset.category === 'music') {
    return `A 30-second loopable ${asset.name} for a mythic strategy game. Orchestral, epic, ${asset.faction === 'light' ? 'heroic' : 'menacing'} tone.`;
  }

  if (asset.category === 'voice') {
    return `Announce with a deep, mythic, cinematic voice: "${asset.description.split(': "')[1].replace('"', '')}"`;
  }

  return `${baseStyle} ${asset.name} asset for a fantasy game.`;
}
