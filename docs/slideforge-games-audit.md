# SlideForge games audit — status so far

**Date:** 11 Sep 2026  
**Compared to:** Desktop `Games-Fullscreen-Mechanics-Audit.md` (27 fullscreen formats)  
**Runtime how-to copy:** [`js/playbook.js`](../js/playbook.js) · [`game-playbook.md`](game-playbook.md)  
**Build formula:** [`game-adaptation.md`](game-adaptation.md)

This is an audit of **what SlideForge actually ships**, not what the library labels promise.

---

## Snapshot (of the 27 catalogue formats)

| Bucket | Count | Meaning |
|--------|------:|---------|
| **Full board engines** | 6 | Own module + `compileGame` early-exit board |
| **Distinctive quiz / oracy mechanics** | 14 | Real scoring or host-mark flow beyond a settings-only MCQ |
| **Thin presets / feedback stand-ins** | 6 | Maps to `choice` / `type` / brainstorm; aim not fully rebuilt |
| **Out of scope** | 1 | Memory Maze — disabled in studio |

**Also shipped (not in the 27):** core engines `choice`, `type`, `slider`, `order`, `truefalse`; feedback `poll`, `wordcloud`, `brainstorm`, `scale`.

**Product glue shipped:** playbook (aim + how to play + engine summary), Try demo (board / paper / class / judge / discuss), private presenter for boards, oral report hooks for memory/bingo/bowl.

---

## Full board engines (6)

| Format | Style | Module | Play loop in SlideForge |
|--------|-------|--------|-------------------------|
| Memory Flip | `memoryflip` | `js/memory.js` | Study → hide → explain → claim; one class collection |
| Memory Match | `memorymatch` | `js/memory.js` | Same board; teams rotate after claim/pass |
| Knowledge Flip | `knowledgeflip` | `js/memory.js` | Keywords always visible; no study timer; explain → claim |
| Bingo | `bingo` | `js/bingo.js` | Deal cards; call definition; teacher claim/miss; line wins |
| Quiz Bowl | `bowl` | `js/bowl.js` | Category/value board; teacher awards cell value |
| Low-Stakes Quiz | `lowstakes` | `js/lowstakes.js` | Paper worksheet; whole-quiz clock; reveal answers; no score |

These compile to `content` slides with `memoryBoard` / `bingoBoard` / `bowlBoard` / `lowstakesBoard` — **not** a run of phone quiz slides. Editor preview = compiled board. Try demo mounts the real engine in the canvas.

**Tests:** `memory.test.js`, `bingo.test.js`, `bowl.test.js`, `lowstakes.test.js`, plus fixtures and oral coverage where applicable.

---

## Distinctive quiz / oracy (14)

| Format | Style | What it does now | Gap vs fullscreen audit |
|--------|-------|------------------|-------------------------|
| Beat the Clock | `speed` | MCQ + speed points (10 + remaining÷10, wrong −5) | Still per-question slides; one round clock is settings, not a separate board |
| Boss Battle | `boss` | MCQ + difficulty damage + shared HP bar | Quiz slides + overlay, not a dedicated battle module |
| Horse Race | `race` | MCQ + lane/track progress | Track overlay; not a compile-time board |
| Word Reveal | `wordreveal` | Letter drip + score by fraction revealed | Matches core drip idea |
| Emoji Guess | `emoji` | Typed puzzle; clues / hint / difficulty | Closer to typed puzzle than full teacher-theatre UX |
| Definition Challenge | `definition` | Passage study → hide → typed recall; phones idle while reading | Matches read→ask essential interaction |
| Odd One Out | `oddone` | Four equal tiles; discuss → reveal prepared odd one; phones idle | Matches discuss essential interaction |
| Compare & Contrast | `compare` | Two equal tiles; discuss → reveal alike/differ; phones idle | Matches discuss essential interaction |
| Ranking | `order` | Reorder + positional part marks | Matches order mechanic |
| Heads Up | `headsup` | Term + host Correct/Pass | No full round-clock heads-up theatre |
| Spin & Explain | `spinexplain` | Clear +2 / hint +1 / reject 0 | No real “spin unused deck” UI |
| Connection Maker | `connection` | Two ideas + Accept | No growing link map |
| Concept Chain | `conceptchain` | Growing chain on Accept; host link capture; phones idle; 30–90s | Matches propose → Accept → grow |
| Random Challenge | `randomchallenge` | Complete/Skip count only | Sequential questions, not a shuffle-deck UI |

---

## Thin presets / stand-ins (6)

| Format | Maps to | Reality |
|--------|---------|---------|
| True/False Showdown | `truefalse` | Timed T/F — not a separate “showdown” engine |
| Fill in the Blanks | `type` | Cloze as typed accept — no per-gap reveal / word bank |
| Spot the Error | `choice` | MCQ over phrases — not selectable spans |
| Predict the Outcome | `choice` | Timed MCQ futures |
| Time Traveler | `type` | Typed recall — no growing timeline |
| Question Cube | brainstorm **feedback** | Beside-slide prompt — not a random cube |

---

## Out of scope (1)

| Format | Status |
|--------|--------|
| Memory Maze | Library card **disabled**; playbook notes different runtime; no style/module |

---

## Judgement model (SlideForge today)

| Type | Formats that behave this way |
|------|------------------------------|
| **Teacher-judged boards** | Memory Flip/Match, Knowledge Flip, Bingo, Quiz Bowl |
| **Discuss / no score** | Low-Stakes (paper), Odd One Out, Compare & Contrast, Fill blanks (thin), Question Cube (feedback) |
| **Auto-scored quiz** | Beat the Clock, Boss, Horse Race, Word Reveal, Ranking, T/F, typed presets, etc. |
| **Host oracy marks** | Heads Up, Spin & Explain, Connection, Concept Chain, Random Challenge |

---

## Demo readiness

| Demo kind | Formats | Behaviour |
|-----------|---------|-----------|
| **board / paper** | Memory×3, Bingo, Bowl, Low-Stakes | Real engine in Quiz studio preview |
| **class** | Auto-scored quizzes | SAMPLE fake players + tallies |
| **judge** | Oracy / teacher-mark formats | SAMPLE roster; you mark as live |
| **discuss** | Discussion-shaped | SAMPLE roster; no competitive scores |

Playbook supplies **How to play** in the library, inspector, and demo rail notes.

---

## Shared product standards (met for boards)

- House theme / 16:9 stage (no copied React / purple rooms)  
- Preview === Present payload for board engines  
- Teacher verdict on stage + presenter; not on learner phones for boards  
- Navigation freezes board state; new Present clears; Replay resets  
- Board collections are playthrough-local (oral report hooks where wired)  

---

## Priority if continuing conversion

1. **Elevate thin presets that the audit treats as distinctive** — Fill in the Blanks (gap reveal), Spot the Error (phrase select), Time Traveler (timeline), Question Cube (roll unused), Predict the Outcome (commit + speed formula).  
2. **Deepen distinctive quiz UIs** — Spin unused deck, Heads Up round clock, Horse Race / Boss as first-class boards if the track/HP need to own the stage.  
3. **Keep Memory Maze out** unless a spatial board engine is explicitly scoped.  
4. **Keep playbook ↔ audit aligned** whenever an engine graduates from thin → board.

---

## Evidence pointers

| Area | Where |
|------|--------|
| Board compile gates | `js/model.js` `compileGame` early returns |
| Board modules | `js/memory.js`, `bingo.js`, `bowl.js`, `lowstakes.js` |
| Format → style | `FORMAT_STYLE` / `SPECIAL_STYLES` in `model.js` |
| Library enablement | `js/studio.js` `activities` |
| `isBoard()` | `js/games.js` |
| Playbook | `js/playbook.js` |
| Demo | `js/demo.js` + Try demo in `games.js` |
