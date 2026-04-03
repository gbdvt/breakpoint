# Ethics and safety

## Scope

Breakpoint offers **behavioral awareness** and **optional light nudges**. It does **not** provide therapy, diagnosis, or treatment.

## Transparency

Users should understand:

- **What is processed:** tab-related signals the extension or app records (domains, titles, timestamps, event types). Exact fields are documented in code and UI copy.
- **What is not required:** keystrokes, full page content, or cloud storage (unless the user opts in later).
- **How decisions work:** MVP uses **rules and thresholds** users can reason about; any Claude use is **assistive** (summaries, ambiguity), not the sole detector.

## Privacy

- **Local-first** for MVP (`localStorage` / extension `storage.local`).
- User can **clear** session and event data.
- No hidden analytics in the hackathon baseline.

## Avoiding harm

- Non-judgmental language; no shame or streak punishment.
- Avoid addictive gamification (no punitive loss states).
- Interventions stay **rare and high-signal**.

## Mental health boundary

- Do not diagnose ADHD, burnout, depression, or any disorder.
- If copy references overwhelm, frame **rest**, **boundaries**, and **professional support** as generic wellness, not assessment.

## Limitations

- Browser signals approximate behavior; they do not prove intent or character.
- “Relevance” from AI is **probabilistic**; present it as a suggestion.

## When to suggest professional help

Only as **generic** guidance if the product ever surfaces persistent distress patterns (stretch), e.g. “If stress feels unmanageable, a licensed professional can help.” Never tie to a label inferred by the app.
