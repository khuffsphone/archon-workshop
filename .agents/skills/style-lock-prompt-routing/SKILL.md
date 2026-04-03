# Style Lock Prompt Routing

Use this skill for making style locks real instead of cosmetic.

## Lock families
- Light reference set
- Dark reference set
- UI reference set
- Spell / VFX reference set

## Required behavior
- selected approved locks must feed prompt generation
- lock selection must persist
- prompts must name which lock family and references were applied
- new generations in the same family must use the relevant references consistently

## Preset behavior
- Draft: fastest route, smaller outputs, lower prompt detail
- Production: balanced route, normal detail
- Premium: larger or higher quality route, stronger prompt detail, more conservative retries

## Output contract
Return:
- lock families wired
- prompt fields affected
- preset routing differences
- proof from generated request payloads or logged generation metadata
