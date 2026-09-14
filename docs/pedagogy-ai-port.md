# Pedagogy AI port (lesson planner → SlideForge)

SlideForge’s classroom AI is a **selective port** of the lesson planner’s
`lib/ai-service`, not a wholesale TypeScript import.

## What “world-beater” means here

1. **Format-specific briefs** — a bingo square never gets four MC options; a
   ranking game gets an ordered list; low-stakes stays recall-sized.
2. **Activity guardrails** — you cannot ask students to analyse / sort /
   discuss material the slide does not provide; material slots are checked
   after generation.
3. **Title-based classification** — steps text does not hijack the type
   (Think-Pair-Share stays discussion even if a step says “compare”).
4. **Server-held keys** — Gemini stays on `/api/ai/*`; offline falls back to
   poll heuristics and curated starter banks.

## Source of truth

- Reference copy: [`vendor/lesson-planner-ai/`](../vendor/lesson-planner-ai/)
- Live module: [`js/ai.js`](../js/ai.js)
- Catalogue that names the boxes: Activities studio + `src/activities/`

## Already wired in the UI

- Quiz studio → **Write questions**
- Activities → **Write content** (rail + inspector)
- Live → slide poll generation (with offline heuristics)

## Still optional (not blocking teaching)

- Slide-deck enricher / step enricher from the planner (whole-lesson generation)
- Quiz Bowl category board as a structured object (board engine owns layout)
- “Select element → generate pedagogical moment” (see pedagogy architecture doc)

## History note

The `vendor/lesson-planner-ai/` tree first landed in a chart-motion commit
(`cae2ee1` / `87b5a4f`) via an accidental `git add -A`. The files were wanted;
the commit message was not about them. Live pedagogy behaviour and tests live
in later commits that name AI/pedagogy in the message. Prefer path-scoped
`git add` over `git add -A` when more than one session is working in the tree.
