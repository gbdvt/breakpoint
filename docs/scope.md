# Scope

## MVP (ship first)

- Next.js dashboard: start session, session view, debrief.
- Local persistence for session + events.
- Rule-based **Drift Load** and threshold-based **intervention modal** (reactive + research-style copy driven by the same score for v1).
- **Simulated events** to demo flows without the extension.
- Six docs in `/docs` as the product contract.

## Stretch

- Chrome extension: real `TAB_SWITCH`, `TAB_CREATE`, `NAVIGATION`, distractor / repeat-check tagging.
- Browser notifications or in-page chip; badge state.
- Research queue time estimation (video length / reading-time heuristics).
- Park-for-later list.
- Trends / attention stamina from timestamps.
- **Claude API:** debrief copy, tab-stack summary, ambiguous relevance — **on demand**, not on every event.
- Thin **Rootly** tie-in: import on-call load or manual “heavy shift” flag to adjust sensitivity (demo).

## Explicitly not in baseline

- Full OS instrumentation.
- Deep semantic understanding of every page without user consent and clear limits.
- Auth / multi-tenant production backend.
- Medical claims or diagnosis.

## Principles

Clarity over cleverness. Working demo over feature sprawl. Explainable rules over opaque “AI knows you.”
