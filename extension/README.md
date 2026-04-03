# Breakpoint Chrome extension

Captures **real** tab activity while a dashboard session is active and keeps it in `chrome.storage.local`. The Next.js app connects with your extension ID via Chrome’s **externally connectable** APIs.

## What you need to do (once)

1. **Load unpacked**
   - Open Google Chrome → `chrome://extensions`
   - Turn on **Developer mode**
   - **Load unpacked** → select this folder: `extension/` (the one that contains `manifest.json`)

2. **Copy the extension ID**
   - On the Breakpoint card, click **Details** or copy the ID string under the name.

3. **Wire the dashboard**
   - In `breakpoint/` (the Next app), create `.env.local`:
     ```bash
     NEXT_PUBLIC_BREAKPOINT_EXTENSION_ID=paste_the_id_here
     ```
   - Restart `npm run dev`.

4. **Origin must match**
   - The manifest allows `http://localhost:3000` and `:3001` (and `127.0.0.1`). If you use another port, add a line under `externally_connectable.matches` in `manifest.json`, then **Reload** the extension in `chrome://extensions`.

5. **Use Chrome for the app**
   - Open the dashboard at `http://localhost:3000` in **Chrome** (not Firefox/Edge unless you also load the extension there and adjust IDs).

## Permissions (why they exist)

- **tabs** — read active tab URL/title for events.
- **webNavigation** — main-frame navigations as `NAVIGATION` events.
- **storage** — persist session + event log locally.
- **scripting** — inject `overlay.js` into the best `http(s)` tab when drift crosses the same threshold as the dashboard (rule-based, not clinical).
- **host_permissions `<all_urls>`** — required so tab URLs on regular sites are visible to the service worker.

### When you drift (badge + in-page card)

When drift **first** crosses the threshold, the service worker:

1. Sets the toolbar **badge** to `!` (amber).
2. Injects a **floating card** (bottom-right, Shadow DOM) into the best tab: **focused tab if it’s a distractor**, else the **last known distractor tab** (e.g. YouTube in the background while you’re on localhost).

When your **rolling drift score drops** below the threshold again, the **badge clears automatically**.

Click the **extension icon** anytime for the **toolbar popup**: goal, drift load, event count, latest tab hint.

Dismiss or “I’m staying” on the in-page card clears the badge. There is **no** separate Chrome popup window — only the slick on-page card plus the optional dashboard modal.

While **drift load stays in the intervention band**, the card appears again **each time you land on a distractor tab** (e.g. switch back to YouTube), not only the first time the score crossed the threshold.

Some strict pages may block injection; the **badge** and **toolbar popup** still help.

**First switch after “Start session”** is tracked correctly: on start we record the **currently focused tab** as the baseline, so the next switch (e.g. to YouTube) produces `TAB_SWITCH` / `DISTRACTOR_OPEN` instead of being swallowed as “first activation.”

### Tab titles (for YouTube, ChatGPT, Stack Overflow, …)

Events include `title` and `tabId`. Many SPAs set `document.title` after load; the extension **patches the latest event for that tab** when `tabs.onUpdated` reports a new title or URL. That gives you conversation/video titles for a future LLM pass without extra content scripts.

After changing `manifest.json`, click **Reload** on the extension.

## What I need from you (maintainer / teammate)

- **Nothing secret** for the MVP: no API keys, no store listing, no Google Cloud project.
- **Optional later:** Chrome Web Store developer account (~$5 one-time) if you publish instead of “Load unpacked.”
- **If you use Claude:** an Anthropic API key only in the **Next** app (server route), not in the extension.

## Versioning

The **source of truth** is `extension/package.json` → field `version`. `manifest.json` must match (Chrome reads the manifest).

- **After changing `package.json` version by hand**, run:
  ```bash
  cd extension
  npm run sync-version
  ```
- **To bump automatically** (semver), from `extension/`:
  - `npm run bump` — patch (0.2.0 → 0.2.1)
  - `npm run bump:minor` — 0.2.0 → 0.3.0
  - `npm run bump:major` — 0.2.0 → 1.0.0  

  Each command updates `package.json` and rewrites `manifest.json`.

Then **Reload** the extension in `chrome://extensions`. The toolbar popup shows **v…** from the manifest.

## Troubleshooting

- **“Extension did not respond”** — wrong ID in `.env.local`, extension not loaded, or origin/port not in `externally_connectable`.
- **No events** — start a session from the dashboard first; tracking is off until `SESSION_START` succeeds.
- **Still nothing** — reload the extension after editing `manifest.json`; confirm you’re not in Incognito unless the extension is allowed there.
