# Part 1 scope rules

Part 1 is not "build everything".

Part 1 is done only when:
1. Archon Workshop can generate, verify, approve, materialize, and export approved assets durably
2. Scene Lab can test and approve core combat VFX in context
3. the Archon game slice can load exported approved assets and run one real combat slice

Do not expand broad content libraries unless the work directly supports that flow.

Prioritize:
- manifest trust
- export trust
- queue persistence
- combat VFX families
- Scene Lab contextual QA
- first combat slice


Do not re-platform Part 1 to mobile/native. Keep the proof path aligned to the current web stack.
