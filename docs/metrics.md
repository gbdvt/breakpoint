# Metrics

Naming aligns with the product: the main composite is **Drift Load** (not a medical score).

## Drift Load (main composite)

A session-level signal that unstable, off-goal behavior is accumulating. MVP implementation is **rule-based** over recent events; it is explainable, not ML.

### Components (conceptual)

1. **Reactive drift** — switches to known distractor domains, rapid tab churn, feed-style revisits.
2. **Research inflation** — many new tabs or navigations in a short window before execution signals; estimated “content queue” time (stretch).
3. **Task-start latency** — time from session start to first on-task signal (stretch: needs clearer “meaningful action” proxy).
4. **Looping** — repeated open or focus on the same distractor domain in a short interval (`REPEAT_CHECK`-style events).
5. **Attention stamina** — average length of uninterrupted stretches on non-distractor activity; for **trends only**, not a clinical “attention span.”

---

## Sub-metrics (user-facing language)

| Name | Meaning (user) | MVP approximation |
|------|----------------|-------------------|
| Reactive drift | Compulsive off-goal switching | Distractor domains + rapid `TAB_SWITCH` / `TAB_CREATE` in rolling window |
| Research inflation | Prep replacing execution | Burst of new tabs / docs / video hosts shortly after session start |
| Task-start latency | Delay before real work | Time until first non-trivial navigation or user-marked “started” (stretch) |
| Looping | Checking the same escapes | Same domain repeats tagged as `REPEAT_CHECK` |
| Attention stamina | How long you stay on track | Rolling mean of focus segments from tab timing (extension phase) |

---

## Example outputs (copy-safe)

- “You drifted after about 9 minutes.”
- “Six new tabs in under a minute — possible research spiral.”
- “You added a large content queue before starting.” (when queue estimation exists)
- “You often drift after 8–12 minutes.” (trends / history)
