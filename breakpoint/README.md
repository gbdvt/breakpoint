# Breakpoint — web app (`breakpoint/`)

This directory is the **Next.js** dashboard and API routes for Breakpoint (session UI, debrief, AI helpers). It is not the Chrome extension or the Tauri desktop shell—see the **[repo root README](../README.md)** for how those pieces connect.

## Run locally

```bash
npm install
npm run dev
```

Use **Chrome** with the Breakpoint extension installed so `externally_connectable` messaging works.

## Environment

Copy **`.env.example`** to **`.env.local`** and fill in only what you need. Names are documented there; **never commit** `.env.local` or real API keys.

Common values:

- **`NEXT_PUBLIC_BREAKPOINT_EXTENSION_ID`** — from `chrome://extensions` after loading `extension/` unpacked (required for live extension bridge from the browser).

## Learn more

- [Next.js documentation](https://nextjs.org/docs)
- Extension setup: [`../extension/README.md`](../extension/README.md)
