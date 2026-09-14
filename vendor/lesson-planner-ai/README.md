# Lesson-planner AI service (reference source)

Copied from `activity-catalog-app copy/lib/ai-service/` so SlideForge can keep
porting pedagogy without depending on that app’s build.

**Runtime path:** SlideForge does **not** import these TypeScript files in the
browser. Live behaviour lives in `js/ai.js` (server-held Gemini key via
`/api/ai/*`).

| Planner module | SlideForge home |
|---|---|
| `classification/activity-classifier.ts` | `classifyActivity` + `ACTIVITY_GUARDRAILS` in `js/ai.js` |
| `prompts/activity-guidance.ts` | Guardrail `rules` strings (worked example, error analysis, sorting, comparison, question cube, practice stations, …) |
| `generators/game-generators.ts` | Per-format `AI_SPECS` in `js/ai.js` |
| `core/json-parser.ts` | `parseModelJson` / `usableRows` |
| `core/gemini-client.ts` | `server/server.js` `/api/ai/generate` (key never in the browser) |

When improving pedagogy, prefer editing `js/ai.js` against this tree as the
spec, then add a regression in `tests/quick-poll.test.js`.

## History

This tree first appeared in git inside a chart-motion commit (accidental
`git add -A`). Treat it as reference source for the pedagogy port; runtime
changes belong in `js/ai.js` with a commit message that says so.
