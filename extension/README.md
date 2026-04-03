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
- **host_permissions `<all_urls>`** — required so tab URLs on regular sites are visible to the service worker.

## What I need from you (maintainer / teammate)

- **Nothing secret** for the MVP: no API keys, no store listing, no Google Cloud project.
- **Optional later:** Chrome Web Store developer account (~$5 one-time) if you publish instead of “Load unpacked.”
- **If you use Claude:** an Anthropic API key only in the **Next** app (server route), not in the extension.

## Troubleshooting

- **“Extension did not respond”** — wrong ID in `.env.local`, extension not loaded, or origin/port not in `externally_connectable`.
- **No events** — start a session from the dashboard first; tracking is off until `SESSION_START` succeeds.
- **Still nothing** — reload the extension after editing `manifest.json`; confirm you’re not in Incognito unless the extension is allowed there.
