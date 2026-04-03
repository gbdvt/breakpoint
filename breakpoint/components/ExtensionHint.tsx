"use client";

import {
  extensionRuntimeAvailable,
  getExtensionId,
} from "@/lib/extensionBridge";

export default function ExtensionHint() {
  const id = getExtensionId();
  const runtimeOk = extensionRuntimeAvailable();

  if (id && runtimeOk) {
    return (
      <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        Extension ID is set and Chrome APIs are visible on this page. Start a
        session to begin live tab capture.
      </p>
    );
  }

  if (id && !runtimeOk) {
    return (
      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <p className="font-medium">Chrome extension not reachable</p>
        <p className="mt-1 text-amber-900/90">
          Open this app in <strong>Google Chrome</strong>, load the unpacked
          Breakpoint extension, and use{" "}
          <code className="rounded bg-white/60 px-1">http://localhost:3000</code>{" "}
          (add your port to{" "}
          <code className="rounded bg-white/60 px-1">
            extension/manifest.json → externally_connectable
          </code>{" "}
          if needed).
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <p className="font-medium">Set your extension ID</p>
      <p className="mt-1 text-amber-900/90">
        Create{" "}
        <code className="rounded bg-white/60 px-1">breakpoint/.env.local</code>{" "}
        with{" "}
        <code className="rounded bg-white/60 px-1">
          NEXT_PUBLIC_BREAKPOINT_EXTENSION_ID=&lt;id from chrome://extensions&gt;
        </code>
        , restart{" "}
        <code className="rounded bg-white/60 px-1">npm run dev</code>.
      </p>
    </div>
  );
}
