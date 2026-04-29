> **Legacy note:** This file predates the ARCHON-006 operating discipline.
> If this file conflicts with `.agents/rules/10-operating-discipline.md`,
> `.agents/rules/11-test-discipline.md`,
> `.agents/rules/12-contract-protection.md`, or
> `.agents/rules/13-closeout-discipline.md`, the newer rules control.
> This is a stub-format workflow. Use it only if explicitly named in your task prompt.

Verify the Workshop export gate.

Check all of the following:
- approved assets point to real files
- approved files are non-zero
- thumbnails exist for approved images
- preferred playback files exist for approved audio
- approved_version and current_display_version are coherent
- export bundle contains real generated assets
- manifest is populated and current

Return:
- pass/fail table
- counts checked
- blocking defects
- exact repair path
