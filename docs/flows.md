# User flows

## 1. Start session

**Input:** goal, mode (lecture / coding / writing / research), planned duration.

**Result:** session record stored locally; user lands on live session view; monitoring is “on” (simulated events in MVP, extension later).

---

## 2. Reactive drift intervention

**Trigger (examples):** navigates to or focuses a known distractor; rapid tab switching crosses threshold.

**Intervention:** short copy: drift detected, name the goal, name the domain if known.

**Actions:** Go back · Keep going (acknowledge) · Park for later (stretch: save tabs).

---

## 3. Research inflation intervention

**Trigger:** many `TAB_CREATE` / navigations in a short window, especially early in session.

**Intervention:** neutral framing — “Lots of new sources quickly — still preparing, or ready to execute?”

**Actions:** Continue · Start now (stretch) · Summarize stack (Claude stretch).

---

## 4. Task-start latency (light nudge)

**Trigger:** session active for N minutes with only “prep-shaped” domains and no user-confirmed start (MVP: time + heuristic; stretch: explicit “I’ve started”).

**Intervention:** “Still preparing — want to begin the first small step?”

---

## 5. Debrief

**After session end:** timeline of domains/events, first drift marker, simple sequence string, event count, optional Drift Load snapshot.

**Stretch:** Claude-generated paragraph debrief from the same event log (never required for core detection).

---

## 6. Trends (stretch)

- Typical minutes until first drift
- Top trigger domains
- Attention stamina over recent sessions
