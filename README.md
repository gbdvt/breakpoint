# Breakpoint

Breakpoint helps you stay aware of **cognitive load** during deep work: it tracks tab and navigation patterns, estimates a rough “research queue” from what you open (including YouTube length when available), and can **nudge you in-page** when drift crosses a rule-based threshold—not a clinical diagnosis.

The repo is split into three parts that work together:

| Area | Stack | Role |
|------|--------|------|
| **`breakpoint/`** | Next.js | Web dashboard, AI routes (e.g. tab relevance, estimates), debrief flows |
| **`desktop/`** | Vite + React + **Tauri 2** | Native shell: queue home, session dock, optional floating window; talks to the Chrome extension via a local command queue |
| **`extension/`** | Chrome MV3 | Records `TAB_CREATE` / `TAB_SWITCH` / `NAVIGATION` (and related signals) into `chrome.storage.local`; drift badge; in-page overlay when you’re in the intervention band |

---

## Quick start

### Chrome extension

Load **`extension/`** unpacked in `chrome://extensions`, copy the extension ID, and set it in the Next app. Full steps, permissions, and troubleshooting: **[`extension/README.md`](extension/README.md)**.

### Next.js app (`breakpoint/`)

```bash
cd breakpoint
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in **Chrome** with the extension loaded. Server-side features (Anthropic, etc.) use env vars documented in that app’s **`.env.example`**—never commit real keys.

### Desktop app (`desktop/`)

```bash
cd desktop
npm install
npm run tauri:dev
```

Main window is the dashboard; the sidebar can open a **frameless, always-on-top** floating session view. Session **start** / **end** from the desktop queues commands for the extension (see `desktop/src/lib/tauriBridge.ts`).

#### Optional: Supabase `focus_state` sync

If you use a Supabase table (e.g. `focus_state` with a row `id = 'demo-device'`) to mirror “focus on/off,” set **only** these in `desktop/.env` (see **`desktop/.env.example`** for names):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Without them, the app skips sync. **Do not** paste service-role keys into the client; use the anon key and **Row Level Security** policies that allow only what you intend.

---

## Behavior notes (high level)

- **Drift scoring** in the extension mirrors the same heuristics as the dashboard conceptually; crossing the band sets a badge and can inject a centered **Pause**-style card on distractor or high-drift contexts.
- **Continue** on that card can **snooze** further drift/distractor overlays for a cooldown; a small chip may summarize time and queue before it dismisses.
- **New tab** feedback uses your **saved** tab-create event so queue lines (`+Xm · ~Ym`) aren’t stuck on a generic “Waiting” label.

For version bumps and extension-only workflows, see **`extension/README.md`**.
