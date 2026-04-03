# Combat VFX Production

Use this skill for combat blueprints, subcategories, combat family generation actions, prompt templates, and scene-driven VFX backfill.

## Required combat families
- hit / impact
- projectile / trail
- beam / line / channel
- area / burst / nova
- barrier / shield / dodge / parry
- status / control / revive / heal / poison / burn / imprison
- spawn / teleport / death
- targeting / badge / QA overlay

## Required behavior
- seed missing entries only
- do not duplicate existing manifest ids
- do not dump all combat effects into one vague bucket
- keep subcategories explicit
- support scene-driven backfill from Combat FX Test mode

## Prompt rules
Every prompt must respect:
- faction if applicable
- light / dark / neutral / element palette
- style lock references when available
- readability at gameplay speed
- transparent-ready output when needed
- preset routing

## Output contract
Return:
- blueprint names added
- number of new manifest entries seeded
- generation actions added
- combat prompt templates added or updated
- gaps still unresolved
