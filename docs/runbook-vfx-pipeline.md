# Operator Runbook — Archon Workshop VFX Pipeline

**Repo:** `archon-workshop`
**Applies to:** ARCHON-006 VFX Pipeline (006A–006F)
**Last updated:** 2026-04-29

---

## Prerequisites

- Node.js v18+ installed
- Gemini API key set in `.env` or `.env.local` as `GEMINI_API_KEY`
- No running instance on port 3000

---

## 1. Starting the Workshop

```powershell
cmd.exe /c "npm run dev"
```

Wait for the server to log that it is listening on `http://localhost:3000`. Open that URL in a browser.

**Note:** `npm run dev` starts both the Express backend (`server.ts`) and the Vite frontend in a single process. Do not run them separately.

---

## 2. Confirming the App Is Healthy

Navigate to `http://localhost:3000/api/health`. Expect:

```json
{ "status": "ok" }
```

If you see a connection error, the server has not started or failed to bind port 3000. Check the terminal for error output.

---

## 3. Restoring Workspace State

Workspace state (active tab, panel scroll, selections) persists automatically in `localStorage` under the key `archon-workshop-state`.

On page refresh, state restores automatically — no action required.

If state is corrupt or you want a clean slate:
1. Open browser DevTools → Application → Local Storage → `http://localhost:3000`
2. Delete the `archon-workshop-state` key
3. Refresh the page

---

## 4. Exporting and Importing Workspace State

### Export (ZIP asset pack)
1. Click the **Export** tab in the Workshop.
2. Click **Export Full Pack** or **Export Combat Pack** depending on what you need.
3. The ZIP file will be saved to your browser's default downloads folder.

### Import (ZIP asset pack)
1. Click the **Export** tab.
2. Click **Import Pack**.
3. Select a previously exported `.zip` file.
4. The Workshop will validate the schema version and restore asset data.

> ⚠️ The ZIP schema is frozen. Do not manually edit ZIP contents.

---

## 5. Opening the VFX Panel

1. Click the **✨ VFX** tab in the top navigation.
2. The VFX Workflow Panel opens with the catalog on top and the generation queue below.

---

## 6. Filtering and Selecting VFX Presets

1. Use the **Filter by Family** dropdown to narrow by effect type (hit, death, spawn, heal, status, ambient, projectile, beam).
2. Use the **Filter by Faction** dropdown to narrow by faction (light, dark, neutral).
3. Presets matching both filters are displayed.
4. Click individual preset cards to select them (highlighted border).
5. Click **Select All** to select all visible presets.
6. Click **Deselect All** to clear selection.

---

## 7. Enqueueing VFX Jobs

1. Select one or more presets (see section 6).
2. Click **Enqueue Selected**.
3. Selected presets are added to the Generation Queue below with status `QUEUED`.
4. The same preset can be enqueued multiple times — each gets a distinct `queueId`.

---

## 8. Running Single VFX Generation

> Use this to generate one job at a time without starting a full batch.

1. Ensure at least one entry in the queue has status `QUEUED`.
2. Click **Start Batch** — with only one queued item, only one job will run.
3. Alternatively, the batch runner processes items one at a time; you can Abort after the first completes.

Status will transition: `QUEUED` → `GENERATING` → `COMPLETED` (or `FAILED` with error message).

---

## 9. Running Controlled Batch Generation

> **Warning:** Batch generation makes sequential API calls to the Gemini provider. Each call costs API quota. Do not leave a batch running unattended.

1. Ensure multiple entries have status `QUEUED`.
2. Click **Start Batch**.
3. The runner processes entries sequentially with a 2000ms delay between provider calls.
4. Progress is visible in the queue list and the activity log.

---

## 10. Pausing, Resuming, and Aborting Batch Execution

### Pause
- Click **Pause Batch** while a batch is running.
- The current in-flight job will complete. No new jobs will start.
- The button changes to **Resume Batch**.

### Resume
- Click **Resume Batch** while paused.
- Processing continues from the next `QUEUED` entry.

### Abort
- Click **Abort** while running or paused.
- The current in-flight job will complete. All remaining `QUEUED` entries remain queued (they are not cancelled).
- The batch state returns to `idle`.

> Abort does not cancel remaining jobs. They stay queued and can be started again with **Start Batch**.

---

## 11. Exporting Queue Briefs

1. Click **Export Queue Briefs** in the queue header.
2. A JSON file is downloaded to the browser's default downloads folder.
3. The JSON includes: all entries with their final status, retry counts, error messages, stats summary, and export timestamp.

---

## 12. Checking Generated Artifact Hygiene

After any generation session, verify that generated files are not staged in git:

```powershell
cmd.exe /c "git status -uall --short"
cmd.exe /c "git ls-files --others --exclude-standard"
```

Both commands should return empty output. Generated files live in `public/generated/` and are covered by `.gitignore`.

---

## 13. Confirming Generated Files Are Ignored

```powershell
cmd.exe /c "git check-ignore -v public/generated/"
```

Expected output:
```
.gitignore:10:public/generated/	public/generated/
```

If this command returns nothing or an error, the gitignore rule has been accidentally removed. Restore `.gitignore` line 10: `public/generated/`.

---

## 14. What to Do If Provider / API Generation Fails

When a job fails, its status shows `FAILED` with a visible error message in the queue row.

**Transient errors (rate limit, network timeout):**
1. Wait 10–30 seconds.
2. Click **Retry** on the failed entry.
3. Click **Start Batch** to process it again.

**Auth errors (invalid API key):**
1. Check `.env` or `.env.local` for `GEMINI_API_KEY`.
2. Restart the dev server after fixing the key.

**Persistent failures:**
1. Check the terminal for server-side error logs.
2. Export the queue brief to capture the failure state.
3. Do not retry indefinitely — repeated quota exhaustion may block future calls.

---

## 15. What Not to Commit

| Never commit | Reason |
|---|---|
| `public/generated/**` | AI-generated assets — gitignored, runtime only |
| `public/exports/*.zip` | Export ZIPs — gitignored |
| `dist/**` | Vite build output — gitignored |
| `.env`, `.env.local` | API keys — gitignored |
| `asset-manifest.json` (in `public/generated/`) | Runtime manifest — written by server, not source-controlled |

Always verify with `git status -uall --short` before committing. If any of the above appear, unstage them immediately.
