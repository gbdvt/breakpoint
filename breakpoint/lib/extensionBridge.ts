import type { BreakpointEvent } from "@/types/event";
import type { FocusSession } from "@/types/session";

export function getExtensionId(): string | null {
  const id = process.env.NEXT_PUBLIC_BREAKPOINT_EXTENSION_ID?.trim();
  return id && id.length > 0 ? id : null;
}

type RuntimePort = {
  onMessage: {
    addListener: (cb: (msg: unknown) => void) => void;
    removeListener: (cb: (msg: unknown) => void) => void;
  };
  disconnect: () => void;
};

type ChromeRuntime = {
  sendMessage: (
    extensionId: string,
    message: unknown,
    responseCallback?: (response: unknown) => void,
  ) => void;
  connect: (extensionId: string, connectInfo?: { name?: string }) => RuntimePort;
  lastError?: { message: string };
};

type ChromeGlobal = { runtime?: ChromeRuntime };

function chromeGlobal(): ChromeGlobal | undefined {
  if (typeof globalThis === "undefined") return undefined;
  return (globalThis as unknown as { chrome?: ChromeGlobal }).chrome;
}

function runtime(): ChromeRuntime | undefined {
  return chromeGlobal()?.runtime;
}

export function extensionRuntimeAvailable(): boolean {
  return !!runtime()?.sendMessage;
}

export function canUseExtension(): boolean {
  return !!getExtensionId() && extensionRuntimeAvailable();
}

type ExternalResponse =
  | { ok: true; session?: FocusSession | null; events?: BreakpointEvent[] }
  | { ok: false; error?: string };

export function sendExtensionMessage(
  payload: Record<string, unknown>,
): Promise<ExternalResponse | null> {
  const id = getExtensionId();
  const rt = runtime();
  if (!id || !rt?.sendMessage) return Promise.resolve(null);

  return new Promise((resolve) => {
    rt.sendMessage(id, payload, (response: unknown) => {
      const lastError = runtime()?.lastError;
      if (lastError?.message) {
        console.warn("[Breakpoint extension]", lastError.message);
        resolve(null);
        return;
      }
      resolve((response as ExternalResponse) ?? null);
    });
  });
}

export function connectExtensionPort(
  onState: (session: FocusSession | null, events: BreakpointEvent[]) => void,
): (() => void) | null {
  const id = getExtensionId();
  const rt = runtime();
  if (!id || !rt?.connect) return null;

  try {
    const port = rt.connect(id, { name: "breakpoint-dashboard" });
    const handler = (msg: unknown) => {
      if (!msg || typeof msg !== "object") return;
      const m = msg as {
        type?: string;
        session?: FocusSession | null;
        events?: BreakpointEvent[];
      };
      if (m.type !== "STATE") return;
      onState(
        (m.session as FocusSession | null) ?? null,
        Array.isArray(m.events) ? m.events : [],
      );
    };
    port.onMessage.addListener(handler);
    return () => {
      port.onMessage.removeListener(handler);
      port.disconnect();
    };
  } catch {
    return null;
  }
}
