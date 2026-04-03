# Manifest Export Integrity

Use this skill whenever a task touches approved versions, display versions, export bundles, materialization, or verification.

## Non-negotiables
- approved assets visible in the app must exist as real files on disk
- manifest entries must point to those real files
- thumbnails and preferred playback paths must exist
- zero-byte files are invalid
- project export must contain real generated assets, not placeholders

## Required checks
- real file exists
- size > 0
- hash exists
- mime type exists
- timestamps exist
- approved_version aligns with current_display_version when required
- candidate history remains intact

## Output contract
Return:
- asset counts checked
- missing files found
- zero-byte files blocked
- manifest rewrite status
- export readiness state
