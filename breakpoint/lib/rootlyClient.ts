/**
 * Rootly JSON:API client (server-side only). See https://api.rootly.com/v1
 */

const JSON_API_HEADERS = {
  Accept: "application/vnd.api+json",
  "Content-Type": "application/vnd.api+json",
} as const;

export function rootlyBaseUrl(): string {
  const b = process.env.ROOTLY_API_BASE?.trim();
  return b && b.length > 0 ? b.replace(/\/$/, "") : "https://api.rootly.com";
}

export async function rootlyFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const key = process.env.ROOTLY_API_KEY?.trim();
  if (!key) {
    throw new Error("ROOTLY_API_KEY is not set on the server.");
  }
  const url = path.startsWith("http")
    ? path
    : `${rootlyBaseUrl()}${path.startsWith("/") ? "" : "/"}${path}`;
  return fetch(url, {
    ...init,
    headers: {
      ...JSON_API_HEADERS,
      Authorization: `Bearer ${key}`,
      ...(init.headers || {}),
    },
  });
}

type JsonApiResource = {
  id?: string;
  type?: string;
  attributes?: Record<string, unknown>;
  relationships?: {
    incident?: { data?: { id?: string; type?: string } };
  };
};

type JsonApiDoc = {
  data?: JsonApiResource | JsonApiResource[];
  included?: JsonApiResource[];
};

type JsonApiDocWithLinks = JsonApiDoc & {
  links?: { next?: string | null };
};

function docDataArray(doc: JsonApiDoc): JsonApiResource[] {
  const d = doc.data;
  if (Array.isArray(d)) return d;
  if (d && typeof d === "object") return [d];
  return [];
}

function parsePositiveIntEnv(name: string, fallback: number, cap: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, cap);
}

/** Walks JSON:API `links.next` until exhausted or maxPages (full URLs OK). */
async function fetchJsonApiCollectionPages(
  firstPathOrUrl: string,
  maxPages: number,
): Promise<JsonApiResource[]> {
  const rows: JsonApiResource[] = [];
  let url: string | null = firstPathOrUrl;
  for (let i = 0; i < maxPages && url; i++) {
    const res = await rootlyFetch(url);
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Rootly ${res.status}: ${t.slice(0, 400)}`);
    }
    const doc = (await res.json()) as JsonApiDocWithLinks;
    rows.push(...docDataArray(doc));
    const next = doc.links?.next;
    url = typeof next === "string" && next.trim() ? next.trim() : null;
  }
  return rows;
}

function incidentMapFromIncluded(
  included: JsonApiResource[] | undefined,
): Map<string, { title?: string; severity?: string }> {
  const m = new Map<string, { title?: string; severity?: string }>();
  if (!Array.isArray(included)) return m;
  for (const r of included) {
    if (r.type !== "incidents" || !r.id) continue;
    const a = r.attributes ?? {};
    m.set(String(r.id), {
      title: typeof a.title === "string" ? a.title : undefined,
      severity: typeof a.severity === "string" ? a.severity : undefined,
    });
  }
  return m;
}

function incidentMetaFromResource(
  row: JsonApiResource | undefined,
): { title: string | null; severity: string | null } {
  if (!row?.id || row.type !== "incidents") {
    return { title: null, severity: null };
  }
  const a = row.attributes ?? {};
  return {
    title: typeof a.title === "string" ? a.title : null,
    severity: typeof a.severity === "string" ? a.severity : null,
  };
}

const ROOTLY_ACTION_ITEM_TERMINAL_STATUSES = new Set([
  "done",
  "completed",
  "closed",
  "resolved",
  "cancelled",
  "canceled",
]);

function isImportableActionItemStatus(statusRaw: unknown): statusRaw is string {
  const status =
    typeof statusRaw === "string" ? statusRaw.trim().toLowerCase() : "";
  if (!status) return true;
  return !ROOTLY_ACTION_ITEM_TERMINAL_STATUSES.has(status);
}

/**
 * Maps one JSON:API action item resource → import row (skips done/resolved-like statuses).
 */
function actionItemResourceToImport(
  row: JsonApiResource,
  incidentId: string | null,
  incidentTitle: string | null,
  incidentSeverity: string | null,
): RootlyActionItemImport | null {
  if (!row?.id) return null;
  if (row.type !== "incident_action_items") return null;
  const a = row.attributes ?? {};
  if (!isImportableActionItemStatus(a.status)) return null;
  const status =
    typeof a.status === "string" && a.status.trim()
      ? a.status.trim()
      : "open";

  return {
    actionItemId: String(row.id),
    incidentId,
    title:
      typeof a.summary === "string" && a.summary.trim()
        ? a.summary.trim()
        : "Rootly action item",
    description: typeof a.description === "string" ? a.description.trim() : "",
    priority: typeof a.priority === "string" ? a.priority : null,
    status,
    incidentTitle,
    incidentSeverity,
  };
}

async function listIncidentIdsAndMetaForImport(): Promise<
  Map<string, { title: string | null; severity: string | null }>
> {
  const raw = process.env.ROOTLY_IMPORT_INCIDENT_IDS?.trim();
  if (raw) {
    const ids = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const m = new Map<string, { title: string | null; severity: string | null }>();
    for (const id of ids) {
      const res = await rootlyFetch(`/v1/incidents/${encodeURIComponent(id)}`);
      if (!res.ok) continue;
      const doc = (await res.json()) as JsonApiDoc;
      const row = Array.isArray(doc.data) ? doc.data[0] : doc.data;
      const meta = incidentMetaFromResource(row);
      m.set(id, meta);
    }
    return m;
  }

  const pageSize = 100;
  const maxPages = parsePositiveIntEnv(
    "ROOTLY_IMPORT_MAX_INCIDENT_PAGES",
    20,
    100,
  );
  const params = new URLSearchParams();
  params.set("page[size]", String(pageSize));
  const statusFilter = process.env.ROOTLY_IMPORT_INCIDENT_STATUS?.trim();
  if (statusFilter) {
    params.set("filter[status]", statusFilter);
  }
  const first = `/v1/incidents?${params.toString()}`;
  const incidentRows = await fetchJsonApiCollectionPages(first, maxPages);
  const m = new Map<string, { title: string | null; severity: string | null }>();
  for (const row of incidentRows) {
    if (!row.id || row.type !== "incidents") continue;
    const meta = incidentMetaFromResource(row);
    m.set(String(row.id), meta);
  }
  return m;
}

async function listActionItemsForIncident(
  incidentId: string,
  incidentTitle: string | null,
  incidentSeverity: string | null,
): Promise<RootlyActionItemImport[]> {
  const pageSize = 100;
  const maxPages = parsePositiveIntEnv(
    "ROOTLY_IMPORT_MAX_ACTION_ITEM_PAGES",
    10,
    50,
  );
  const params = new URLSearchParams();
  params.set("page[size]", String(pageSize));
  const first = `/v1/incidents/${encodeURIComponent(incidentId)}/action_items?${params.toString()}`;
  const rows = await fetchJsonApiCollectionPages(first, maxPages);
  const out: RootlyActionItemImport[] = [];
  for (const row of rows) {
    const mapped = actionItemResourceToImport(
      row,
      incidentId,
      incidentTitle,
      incidentSeverity,
    );
    if (mapped) out.push(mapped);
  }
  return out;
}

/**
 * Org-wide action items (Rootly GET /v1/action_items). Often populated when
 * per-incident …/action_items is empty for UI-created tasks.
 */
async function listOrgWideActionItemsForImport(): Promise<
  RootlyActionItemImport[]
> {
  const pageSize = 100;
  const maxPages = parsePositiveIntEnv(
    "ROOTLY_IMPORT_MAX_GLOBAL_ACTION_ITEM_PAGES",
    25,
    100,
  );
  const params = new URLSearchParams();
  params.set("page[size]", String(pageSize));
  params.set("include", "incident");
  const incidentStatus = process.env.ROOTLY_IMPORT_ACTION_ITEM_INCIDENT_STATUS?.trim();
  if (incidentStatus) {
    params.set("filter[incident_status]", incidentStatus);
  }
  let url: string | null = `/v1/action_items?${params.toString()}`;
  const seen = new Set<string>();
  const out: RootlyActionItemImport[] = [];

  for (let i = 0; i < maxPages && url; i++) {
    const res = await rootlyFetch(url);
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Rootly ${res.status} action_items: ${t.slice(0, 400)}`);
    }
    const doc = (await res.json()) as JsonApiDocWithLinks;
    const incMap = incidentMapFromIncluded(doc.included);
    for (const row of docDataArray(doc)) {
      const relId = row.relationships?.incident?.data?.id;
      const incidentId =
        relId !== undefined && relId !== null ? String(relId) : null;
      const inc = incidentId ? incMap.get(incidentId) : undefined;
      const mapped = actionItemResourceToImport(
        row,
        incidentId,
        inc?.title ?? null,
        inc?.severity ?? null,
      );
      if (!mapped || seen.has(mapped.actionItemId)) continue;
      seen.add(mapped.actionItemId);
      out.push(mapped);
    }
    const next = doc.links?.next;
    url = typeof next === "string" && next.trim() ? next.trim() : null;
  }

  return out;
}

function mergeActionImports(
  primary: RootlyActionItemImport[],
  secondary: RootlyActionItemImport[],
): RootlyActionItemImport[] {
  const m = new Map<string, RootlyActionItemImport>();
  for (const item of secondary) m.set(item.actionItemId, item);
  for (const item of primary) m.set(item.actionItemId, item);
  return [...m.values()];
}

async function listNestedActionItemsFromIncidents(): Promise<
  RootlyActionItemImport[]
> {
  const incidents = await listIncidentIdsAndMetaForImport();
  const seen = new Set<string>();
  const out: RootlyActionItemImport[] = [];

  for (const [incidentId, meta] of incidents) {
    const batch = await listActionItemsForIncident(
      incidentId,
      meta.title,
      meta.severity,
    );
    for (const item of batch) {
      if (seen.has(item.actionItemId)) continue;
      seen.add(item.actionItemId);
      out.push(item);
    }
  }

  return out;
}

export type RootlyActionItemImport = {
  actionItemId: string;
  incidentId: string | null;
  title: string;
  description: string;
  priority: string | null;
  status: string;
  incidentTitle: string | null;
  incidentSeverity: string | null;
};

/** Synthetic IDs — complete API no-ops for these (no Rootly call). */
const DEMO_ACTION_PREFIX = "demo-action-" as const;
/** One row per incident when the API returns zero action items (local check-off only). */
const INCIDENT_PLACEHOLDER_PREFIX = "bp-incident-" as const;

export function isDemoRootlyActionItemId(id: string): boolean {
  return (
    id.startsWith(DEMO_ACTION_PREFIX) ||
    id.startsWith(INCIDENT_PLACEHOLDER_PREFIX)
  );
}

function incidentPlaceholderImport(
  incidentId: string,
  meta: { title: string | null; severity: string | null },
): RootlyActionItemImport {
  const display =
    meta.title?.trim() ||
    `Active incident (${incidentId.slice(0, 8)}…)`;
  return {
    actionItemId: `${INCIDENT_PLACEHOLDER_PREFIX}${incidentId}`,
    incidentId,
    title: display,
    description:
      "No Rootly Tasks on this incident — focus block only; add Tasks in Rootly to sync completion back.",
    priority: null,
    status: "open",
    incidentTitle: meta.title,
    incidentSeverity: meta.severity,
  };
}

/**
 * Demo payload for hackathon / local dev when Rootly is unavailable or mock mode is on.
 */
export function mockActionItemsForImport(): RootlyActionItemImport[] {
  return [
    {
      actionItemId: `${DEMO_ACTION_PREFIX}verify-metrics`,
      incidentId: "demo-inc-checkout",
      title: "Verify error rate after checkout hotfix",
      description:
        "Compare 5xx and p99 in prod to pre-deploy baseline; confirm rollback is not needed. Watch payments shard dashboards.",
      priority: "P1",
      status: "open",
      incidentTitle: "Checkout API elevated 5xx",
      incidentSeverity: "sev2",
    },
    {
      actionItemId: `${DEMO_ACTION_PREFIX}stakeholder-comms`,
      incidentId: "demo-inc-checkout",
      title: "Post status update to #incidents",
      description:
        "Short summary: current impact, mitigation in progress, ETA for next update. Tag incident commander.",
      priority: "P2",
      status: "in_progress",
      incidentTitle: "Checkout API elevated 5xx",
      incidentSeverity: "sev2",
    },
    {
      actionItemId: `${DEMO_ACTION_PREFIX}handoff-prep`,
      incidentId: "demo-inc-db",
      title: "Prepare handoff notes for on-call rotation",
      description:
        "Open threads, unresolved risks, recent timeline events, and suggested next actions for the incoming responder.",
      priority: "P3",
      status: "open",
      incidentTitle: "Replica lag on auth read pool",
      incidentSeverity: "sev3",
    },
  ];
}

function rootlyImportUsesMock(): boolean {
  const mockFlag = process.env.ROOTLY_IMPORT_MOCK?.trim().toLowerCase();
  if (mockFlag === "1" || mockFlag === "true" || mockFlag === "yes") {
    return true;
  }
  const key = process.env.ROOTLY_API_KEY?.trim();
  return !key;
}

/**
 * Lists action items for import: real API unless mock mode or missing API key.
 */
export async function listActionItemsForImportOrMock(): Promise<{
  items: RootlyActionItemImport[];
  mock: boolean;
  incidentFallback?: boolean;
}> {
  if (rootlyImportUsesMock()) {
    return { items: mockActionItemsForImport(), mock: true };
  }
  const { items, incidentFallback } = await listActionItemsForImport();
  return { items, mock: false, incidentFallback };
}

/**
 * Merges (1) per-incident Tasks API and (2) org-wide GET /v1/action_items?include=incident.
 * Dashboard “active incidents” are not tasks: you need incident action items; Rootly sometimes
 * lists those on the org index when nested …/action_items is empty.
 */
export async function listActionItemsForImport(): Promise<{
  items: RootlyActionItemImport[];
  incidentFallback: boolean;
}> {
  const skipOrg = process.env.ROOTLY_IMPORT_SKIP_ORG_ACTION_ITEMS?.trim() === "1";
  const [nested, orgWide] = await Promise.all([
    listNestedActionItemsFromIncidents(),
    skipOrg ? Promise.resolve([] as RootlyActionItemImport[]) : listOrgWideActionItemsForImport(),
  ]);
  const merged = mergeActionImports(nested, orgWide);
  if (merged.length > 0) {
    return { items: merged, incidentFallback: false };
  }

  const placeholdersOff =
    process.env.ROOTLY_IMPORT_INCIDENT_PLACEHOLDERS?.trim() === "0";
  if (placeholdersOff) {
    return { items: [], incidentFallback: false };
  }

  const incidents = await listIncidentIdsAndMetaForImport();
  if (incidents.size === 0) {
    return { items: [], incidentFallback: false };
  }

  const items = [...incidents.entries()].map(([id, meta]) =>
    incidentPlaceholderImport(id, meta),
  );
  return { items, incidentFallback: true };
}

export async function markActionItemDone(actionItemId: string): Promise<void> {
  const res = await rootlyFetch(`/v1/action_items/${encodeURIComponent(actionItemId)}`, {
    method: "PUT",
    body: JSON.stringify({
      data: {
        type: "incident_action_items",
        id: actionItemId,
        attributes: {
          status: "done",
        },
      },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Rootly update ${res.status}: ${t.slice(0, 400)}`);
  }
}

export function buildRootlyEstimateContext(item: RootlyActionItemImport): string {
  const lines = [
    `Action item: ${item.title}`,
    item.priority ? `Priority: ${item.priority}` : null,
    item.incidentTitle ? `Incident: ${item.incidentTitle}` : null,
    item.incidentSeverity ? `Severity: ${item.incidentSeverity}` : null,
    item.incidentId ? `Incident ID: ${item.incidentId}` : null,
    `Rootly status: ${item.status}`,
    item.description
      ? `Details: ${item.description.slice(0, 1200)}`
      : null,
  ].filter(Boolean);
  return lines.join("\n");
}
