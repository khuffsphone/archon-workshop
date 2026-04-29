> **Legacy note:** This file predates the ARCHON-006 operating discipline.
> If this file conflicts with rules/10–13, rules/10–13 control.
> Rule `13-closeout-discipline.md` is the authoritative replacement for this file. It includes the Show Receipts requirement (exact commands + exit codes + raw output) which this file does not specify.

# Proof and signoff rules

Every completed task must leave:
- changed files
- exact behavior changed
- tests or verification run
- screenshots or browser proof when UI changed
- rollback note
- known risks

No task is complete if it only says "built successfully".

Required proof examples:
- Scene Lab patch: screenshot or browser recording of the mode working
- export patch: artifact showing exported files exist and are non-zero
- manifest patch: verification output before and after
- generation patch: prompt-routing evidence and created manifest entries
