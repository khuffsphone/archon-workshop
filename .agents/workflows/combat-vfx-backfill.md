Backfill missing combat VFX for the current scene context.

Steps:
1. Inspect the current combat scene or Combat FX Test preset.
2. List missing required combat families.
3. Create missing manifest entries only.
4. Queue only the missing combat assets for the active scene.
5. Show which blueprint, template, and preset routing were used.

Return:
- missing slots found
- manifest entries created
- jobs queued
- assets still blocked
