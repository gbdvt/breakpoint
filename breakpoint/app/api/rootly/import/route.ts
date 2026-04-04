import {
  buildRootlyEstimateContext,
  listActionItemsForImportOrMock,
} from "@/lib/rootlyClient";

export const runtime = "nodejs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

/**
 * Returns actionable incident tasks: for each incident, GET …/incidents/{id}/action_items
 * (same as Rootly dashboard Tasks). Optional ROOTLY_IMPORT_INCIDENT_IDS to limit scope.
 */
export async function POST() {
  try {
    const { items, mock, incidentFallback } =
      await listActionItemsForImportOrMock();
    return Response.json(
      {
        mock,
        incidentFallback: incidentFallback === true,
        items: items.map((it) => ({
          ...it,
          estimateContext: buildRootlyEstimateContext(it),
        })),
      },
      { headers: corsHeaders },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json(
      { error: msg, mock: false, incidentFallback: false, items: [] },
      { status: 502, headers: corsHeaders },
    );
  }
}
