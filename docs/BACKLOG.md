# Backlog

The one list of what is open, what is done and why, for people and for AI
agents. It merges the two backlogs that used to sit side by side: the 13
September learner and live-room review (items #1–20) and the 22 September UX
review and code audit (UX-, CA-). It also carries the 23 September games build
list (GA-, RP-, TPS-) and the activities build list (AC-).

**For agents:**
- Read **Open now** first. It is the whole of the remaining work.
- When you finish an item, change its row in **Open now** *and* in its
  series table below, then add a dated entry to the change log.
- Open a new item with the next free ID in its series.
- The *why* behind an item lives in its analysis doc, linked from the row:
  - [games-premium-audit.md](games-premium-audit.md)
  - [activities-premium-audit.md](activities-premium-audit.md)
  - [room-pane-redesign.md](room-pane-redesign.md)
  - [game-activity-redesign.md](game-activity-redesign.md)
  - [ux-deep-dive.md](ux-deep-dive.md)

**Effort:** S = under half a day · M = one or two days · L = most of a week or more
**Priority:** P0 fix now · P1 next · P2 worth doing · P3 when there is room
**Series:**
- **#1–20** · the 13 Sep review
- **UX-** · the UX review
- **CA-** · the code audit
- **GA-** · games to a premium standard
- **AC-** · activities to a premium standard
- **RP-** · the room pane
- **TPS-** · Think-Pair-Share

---

## Open now

Everything not done, across every series. Games first, in the audit's build
order.

| ID | Item | Size | Status |
|---|---|---|---|
| GA-15 – GA-28 | **Games to a premium standard**: waves 0–3 and 5 are done; 4, 6 and 7 mostly (GA-01–14, 18, 20, 21, 23, 25, 26, 29, 30). **Next, as planned:** GA-15–17, the no-device work skipped alongside wave 3 (tally entry, team rows, saved class lists). Then GA-28 solo practice. **Open:** GA-19 branching map, GA-22 hint cost and Definition on stages, GA-27 self-pacing, GA-24 Race/Boss crowd layout. None of the waves since GA-29 has been viewed on screen except Fill, Beat the Clock and Compare. Full table under [the games build list](#23-september-2026-games-to-a-premium-standard-the-build-list). | S–L | In progress |
| AC-13 – AC-17 | **Activities to a premium standard**: waves 0–3 (AC-01–12, AC-16) are done. Sixteen routines run on stages; the room's output lands; every activity declares its rooms. Next: tally entry for rooms without phones (AC-13, with GA-15), then the contests (AC-14). Full table under [the activities build list](#23-september-2026-activities-to-a-premium-standard-the-build-list). | S–L | To do |
| RP-01 | Rehearse with a class of 30 (and 120) | S | To do |
| RP-02 | Lecture-scale defaults (100+): standings off, distribution on | S | To do |
| RP-03 | A packed, centred word cloud with stable positions | M | To do |
| RP-04 | The desk's "need a hand" chip, seen drawn | S | To check |
| TPS-03 | Smoke-test and view Think-Pair-Share on the wall and a phone | S | To check · not seen drawn |
| TPS-04 | Offer the stages view to existing lessons' staged routines (all ten since AC-05; only new inserts get it now) | S | To do |
| #7 | Gate ✋ and ? to junction points | S | To do |
| #8 | Learner theming: the deck theme has no route to the phone | M | Deferred · shared files |
| #10 | Lesson-level standings, teacher-controlled | M | Deferred · shared files |
| #11 | Coda: exit ticket penultimate, wrap last | M–L | Deferred · needs a privacy decision |
| UX-31 | Show that the panel field and the slide are one text | S | To do · P3 |
| UX-53 | A white-screen key (not `W`, which is "Who answered what") | S | To do · P3 |
| UX-63 | Lobby with optional generated nicknames | M | Needs a decision · P3 |
| UX-64 | Student-paced mode with its own code (see also GA-28, solo practice) | L | Needs a decision · P2 |
| UX-65 | Per-student takeaway | M–L | Needs a decision · P3 |
| UX-72 | Keyboard-only pass through every modal and panel | M | Partly done · a hands-on pass needs a person |
| CA-05 | First click after typing on the slide is swallowed | S–M | Not reproduced |
| CA-21 | Composition and regions measure in different frames | M–L | Not reproduced · measured |
| CA-43 | The Undo button works while a slide is being carried | S | To confirm · P3 |
| CA-53 | `wordSpeed: "constructor"` writes `undefinedms` into CSS | S | To do · P3 |
| CA-54 | `pic.src`, `deck.logo` and CSS `url()` skip `safeMedia` | S | To do · P3 |

## Open decisions

| # | Question |
|---|----------|
| #11, UX-63 | Real names in the room: is that ever a problem? The Coda and nicknames hang on the same answer. |
| #14 | Click-to-go-back? Right-click or shift-click for `prev`. |
| #15 | Quiz timer: 20s runs on the learner's device; a slow look-up loses the question. |
| #16 | Keywords dim fades term and definition together; term-stays-bright is a different rule. |
| #17 | Anscombe plot styling: plain, or matched to a textbook's rendering? |
| UX-64 | Student-paced (homework) mode at all? It depends on sessions surviving a deploy. GA-28 (solo practice on the share link) is the smaller version that needs no sessions. |
| UX-65 | Takeaways store one student's answers: where, and for how long? |
| CA-21 | One owner per slide for placement. It was not reproduced in measurement; revisit only if a composition is seen to jump. |

Decided (kept for the record):
- **UX-04** · slide numbering is the room's count (`js/render.js`).
- **Games** · spoken formats score by team and count in individual play; the
  wall names a student only for a success they stepped forward for
  ([games audit §6](games-premium-audit.md)).

---

## Status by series

### UX-01 – UX-72 · the UX review

| ID | Item | Pri | Effort | Status |
|----|------|-----|--------|--------|
| **Phase 1 — bugs** |||||
| UX-01 | Escape discards text typed on the slide | P0 | S | **Done** 23 Sep |
| UX-02 | Modals ignore Escape, have no focus trap and no dialog role | P0 | S–M | **Done** 23 Sep · `.modal` sheets only; the `<dialog>` half was a false positive |
| UX-03 | Editor hint "Add points in the inspector" reaches the projector | P0 | S | **Done** 23 Sep · with CA-30 |
| UX-04 | Rail and show number slides differently (98 vs 110) | P1 | S–M | **Done** 23 Sep · the room's number, per the existing rule in render.js |
| UX-05 | Empty edit + Escape adds an Undo step that does nothing | P1 | S | **Done** 23 Sep · cause found: cancel created an empty `formatting` table |
| UX-06 | Clicking the fading HUD advances the slide | P1 | S | **Done** 23 Sep · a 250ms race, see notes |
| **Phase 2 — finding commands** |||||
| UX-10 | Command palette (⌘K) | P1 | M | **Done** 23 Sep |
| UX-11 | `?` shortcut sheet in the editor and the show | P1 | S | **Done** 23 Sep · `?` already worked in the show; the editor now has it, with its own keys |
| UX-12 | Use one word for the right-hand panel everywhere | P2 | S | **Done** 23 Sep · interface text; lesson notes in `lessons.js` still say inspector |
| **Phase 3 — fewer controls** |||||
| UX-20 | Move the panel's 6 slide actions into a right-click menu | P1 | M | **Done** 23 Sep · 4 moved; Undo/Redo stay |
| UX-21 | One **Present ▾** split button instead of four | P1 | S | **Done** 23 Sep · Host live stays separate |
| UX-22 | One route to deck settings, not three | P2 | S | **Done** 23 Sep · rail ⚙ removed; header Settings and panel Theme stay |
| UX-23 | One route to insert things, not four | P2 | M | **Done** 23 Sep · the rail has one + Slide; activities are its first card |
| UX-24 | Say where the work is saved in words, not with a dot | P1 | S | **Done** 23 Sep · words down to 1080px (measured), a labelled dot below |
| **Phase 4 — editing on the slide** |||||
| UX-30 | Outline editable blocks on hover | P2 | S | **Withdrawn** · it exists: `.canvas-editable:hover` draws a dashed outline |
| UX-31 | Make it clear the panel field and the slide are one text | P3 | S | To do |
| **Phase 5 — deck structure** |||||
| UX-40 | Sections in the rail and the sorter | P2 | M–L | **Done** 23 Sep · from section slides, no new field |
| **Phase 6 — presenting** |||||
| UX-50 | Type a number and press Enter to jump | P2 | S | **Done** 23 Sep |
| UX-51 | `O` overview grid while presenting | P2 | M | **Done** 23 Sep |
| UX-52 | Pacing timer in the presenter view | P2 | S–M | **Done** 23 Sep · planned length + pace colour on the existing clock |
| UX-53 | `W` for a white screen | P3 | S | **Clash** · `W` is already "Who answered what"; pick another key |
| **Phase 7 — the room** |||||
| UX-60 | Hide the answer bars until the reveal | P1 | M | **Done** 23 Sep · a game setting; one line in live.js |
| UX-61 | Lock all phones, now or on a countdown | P2 | M | **Done** 23 Sep · now already existed (Blank phones); the countdown is new |
| UX-62 | Show the teacher who has left the tab | P2 | M | **Done** 23 Sep · presenter view only, never the wall |
| UX-63 | Lobby before the start, with optional generated nicknames | P3 | M | Needs a decision |
| UX-64 | Student-paced mode with its own code | P2 | L | Needs a decision |
| UX-65 | Per-student takeaway: the slides plus that student's answers | P3 | M–L | Needs a decision |
| **Phase 8 — accessibility** |||||
| UX-70 | Give icon-only controls an `aria-label`, not just a `title` | P1 | S–M | **Done** 23 Sep |
| UX-71 | Raise type under 12px in the editor | P2 | S–M | **Done** 23 Sep · reading text to 12px, labels to a 10px floor |
| UX-72 | Keyboard-only pass through every modal and panel | P2 | M | Partly done · scripted audit clean; a hands-on pass still needs a person |

### #1–20 · the 13 September review

| # | Item | Effort | Status |
|---|------|--------|--------|
| 1 | Present button clipped 17px at 375px | S | **Done** — `18899f7` |
| 2 | HUD tap targets | S | **Done** — but the finding was mostly wrong |
| 3 | Before/after drag posts full presenter state per pointermove | S | **Done** — 60 commands → 1 sync |
| 4 | Inspector mutates the slide mid-render | M | **Done** — smaller than graded |
| 5 | `explorationValue` re-normalises per call, 101× per graph | S | **Done** — 1.8× on the curve |
| 6 | Blank the phones from the HUD | S–M | **Done** — `Shift+B` / room menu |
| 7 | Gate ✋ and ? to junction points | S | To do |
| 8 | Learner theming — deck theme has no route to the phone | M | Deferred · shared files |
| 9 | Progress + tally on the phone | S | **Done** — "Question 3 of 4", "2 / 3" |
| 10 | Lesson-level standings, teacher-controlled | M | Deferred · shared files |
| 11 | Coda — exit ticket penultimate, wrap last | M–L | Deferred · needs a privacy decision |
| 12 | Visual baselines for slide layouts | M | **Done** — 45 added, 213 total |
| 13 | No git remote — commits are local only | S | **Done** — `origin` exists; deploy-render is pushed |
| 18 | ~~"Add image detail" does nothing~~ | — | **Retracted** · it works; my probe clicked the wrong button |
| 19 | **A host refresh destroyed the live room** | M | **Done** — 90s grace + reconnect |
| 20 | Refresh loses the presentation, the student's seat, the selected slide | M | **Done** — B, C and D fixed (see note 20) |

### Code audit — 22 September 2026

Three read-only reviews, running in parallel, covered:
- the canvas editing layer (arrange, artwork, inline edit)
- the canvas rendering core (lattice, regions, compositions, render.js)
- the rail, storage and undo

`npm test` passed: 457 of 457. **None of the findings below is covered by a test.**

- **Confirmed:** traced through the code end to end.
- **Plausible:** likely, but depends on how a browser behaves at runtime.
- ✓ marks the items I re-read in the code myself after the reviews.

#### Status

| ID | Item | Area | Pri | Effort | Confidence |
|----|------|------|-----|--------|-----------|
| **Losing work** ||||||
| CA-01 | Storage quota errors are swallowed while the header says "Saved" | storage | P0 | S | **Done** 23 Sep |
| CA-02 | Two tabs on one deck overwrite each other; nothing listens for `storage` events | storage | P0 | M | **Done** 23 Sep · one unexplained failure, see notes |
| CA-03 | Drag-selecting text in an added block moves the block, and the edit is lost | canvas edit | P0 | S | **Done** 23 Sep · not browser-tested |
| CA-04 | Text typed on the slide is not saved until the edit ends; closing the tab loses it | canvas edit | P0 | S | **Done** 23 Sep |
| CA-05 | The first click after typing on the slide is swallowed by the redraw | canvas edit | P1 | S–M | **Not reproduced** in Chrome, left alone |
| CA-06 | Deleting the open deck in File → Open: the next keystroke writes it back | storage | P1 | S | **Done** 23 Sep |
| CA-07 | Copying a slide leaves the whole slide, images included, in localStorage for good, which feeds CA-01 | storage | P1 | S | **Done** 23 Sep |
| CA-08 | Undo stores a full copy of the deck for every keystroke (60 max): one sentence pushes a deletion out of reach, and a 5 MB deck uses about 300 MB | history | P1 | M | **Done** 23 Sep |
| **Wrong slide or answer** ||||||
| CA-10 | Present, Rehearse and Presenter start on the wrong slide when a hidden slide is above the selection | run index | P0 | S | **Done** 23 Sep · `tests/run-index.test.js` |
| CA-11 | The same game embedded twice (⌘D or re-insert) arrives already answered and revealed, and the reports merge the two runs | live | P1 | S–M | **Done** 23 Sep · slide ids; reports still group by game |
| **The canvas core** ||||||
| CA-20 | Regions are never bounds-checked; blocks past row 16 or col 12 go off the slide or collapse to one cell | lattice | P1 | S | **Done** 23 Sep · invalid values only; past row 16 is by design |
| CA-21 | Composition and regions measure in different frames, so blocks jump when Layout opens on a composed slide | lattice × compositions | P1 | M–L | **Not reproduced** · measured on six composed slides, see notes |
| CA-22 | `layout-slots.js` resolves the composition differently from the renderer, which leaves slots that are never drawn but still block placement | lattice × compositions | P1 | S | **Done** 23 Sep |
| CA-23 | The composition slot tables use keys that never match a block (`cp-heading`, `cp-prompt` and others) | lattice × compositions | P2 | S | **Done** 23 Sep · phantom slots dropped at seed |
| CA-24 | Regions bring back the accent bar that compositions hide (`.pad >` selector) | lattice × CSS | P2 | S | **Done** 23 Sep |
| CA-25 | Artwork drags at the wrong speed on 4:3 and 16:10 decks (scale is taken from the box, not `.slide`) | artwork | P1 | S | **Done** 23 Sep · measured: 0.75× on 4:3 |
| CA-26 | Undo or redo closes Layout and Artwork (slides are compared by object, not by id) | arrange | P2 | S | **Done** 23 Sep |
| CA-27 | A resize drag can be left running (no blur or cancel handling, unlike move) | arrange | P2 | S | **Done** 23 Sep |
| CA-28 | Fit badges and the text-size fitter measure before web fonts load | fit-check | P2 | S | **Done** 23 Sep · picker badges; the size fitter not yet |
| **Editor text on the projector** (widens UX-03) ||||||
| CA-30 | `infoEmpty` shows "Add … in the inspector" on 8 layouts; there are also image, video and URL prompts, the "needs http(s)" warning, and empty free-block labels | render | P0 | S | **Done** 23 Sep |
| **Keyboard** ||||||
| CA-40 | ⌘B, ⌘I and ⌘U do nothing when typing on the slide (the key is blocked and nothing is applied) | inline edit | P1 | S | **Done** 23 Sep |
| CA-41 | Enter that confirms an IME candidate ends the edit (no `isComposing` check) | inline edit | P1 | S | **Done** 23 Sep · not browser-tested |
| CA-42 | In the sorter, Alt+→ moves a multi-slide group only once | rail | P2 | S | **Done** 23 Sep |
| CA-43 | The Undo button still works while a slide is being carried; placing then uses an out-of-date index | rail | P3 | S | Plausible |
| CA-55 | **New:** one keystroke on the canvas flattened a multi-line heading to one line | inline edit | P1 | S | **Done** 23 Sep |
| **Smaller** ||||||
| CA-50 | Opening a deck that another tab has just deleted crashes (`setDoc(null)`) | shell | P2 | S | **Done** 23 Sep · with CA-06 |
| CA-51 | Resizing the window (including the Android keyboard opening) redraws mid-edit and loses panel fields that save on `onchange` | shell | P2 | S | **Done** 23 Sep |
| CA-52 | The fallback edit panel writes into the slide with no history and survives slide changes and undo | inline edit | P2 | M | **Done** 23 Sep |
| CA-53 | `wordSpeed: "constructor"` writes `undefinedms` into CSS (the lookup doesn't use `hasOwnProperty`) | words | P3 | S | Confirmed |
| CA-54 | `pic.src`, `deck.logo` and CSS `url()` values skip `safeMedia` (hygiene, not an exploit) | render | P3 | S | Confirmed |

**Checked and clean:**
- No XSS: `safeHref` blocks `javascript:`, text goes in through `textContent`, and `innerHTML` only ever writes static strings.
- No listener or `ResizeObserver` leaks from rendering.
- Malformed clipboard pastes are guarded.
- A deck can never become empty.
- Undo clamps the selection.
- `SF.jumpToSlide` finds slides by id, so the numbering mismatch in UX-04 does not affect it.

---

## Item notes

### UX-01 – UX-72

#### Phase 1 — bugs

##### UX-01. Escape discards text typed on the slide — P0 · S

Click a heading on the canvas, type, press Escape: the heading reverts.
Reproduced in the browser. In `src/editor/customize.js:578`, Escape calls
`endInlineEdit('cancel')`, and `cancel` writes back `open.was`.

Google Slides, Figma, Keynote and PowerPoint all keep the edit and leave the
box selected, so anyone coming from those tools loses their work.

- **Change:** Escape ends the edit with `'save'`. Cmd+Z undoes it, like any
  other edit. If a real cancel is still wanted, it gets its own control, not
  Escape.
- **Done when:** you type, press Escape, and the text stays; Cmd+Z then
  restores the original text; a unit test covers both.

##### UX-02. Modals ignore Escape, have no focus trap and no dialog role — P0 · S–M

`openModal` in `js/shell.js:342` only adds `.on` to a `<div class="modal">`,
wires the close button and handles clicks on the backdrop. Nothing listens
for Escape. Reproduced with the Slide starters modal: after Escape the modal
was still open, and the next click inserted a slide. Same with the Library
(`lessonModal`).

Other parts of the app already close on Escape: the sorter
(`src/editor/rail.js:708`), header and footer
(`src/editor/header-footer.js:226`), artwork (`src/editor/artwork.js:527`)
and arrange mode.

- **Change:** add to `openModal` in one place:
  - Escape closes the modal.
  - The modal gets `role="dialog"`, `aria-modal="true"`, and `aria-labelledby`
    pointing at its heading.
  - Focus moves into the modal when it opens and goes back to the button that
    opened it when it closes.
  - Tab stays inside the modal.

  Everything opened through `openModal` gets this at once: settings, quiz
  generation, quick poll, the picker, starters and the Library. Also check
  modals that toggle `.on` themselves; there are 17 `classList.add('on')`
  call sites outside `model.js`.
- **Done when:** every `.modal` closes on Escape and gives focus back to the
  button that opened it, and a Playwright smoke test covers it.

##### UX-03. The editor hint reaches the projector — P0 · S

An empty bullets slide shows *"Add points in the inspector"* full-screen when
presenting. The hint is added in `js/render.js:527` and `js/render.js:1393`. The
comment at `:524` fixed this for slides that carry blocks, but not for a slide
that is simply empty.

- **Change:** render the hint only in the editor. Use whatever marks editor
  rendering today (the preview box or the thumbnails), or hide `li.dim` under
  `#player`. Rendering it only in the editor is better, because then the hint
  never reaches the HTML sent to phones.
  Also change the word "inspector"; the panel is called *Design & content*
  (see UX-12).
- **Also check:** the other layouts that show a faded prompt when empty:
  keywords, italics, links and statement (`css/app.css:1290–6567`).
- **Done when:** a new, empty bullets slide presents blank, and a visual
  baseline captures that.

##### UX-04. Rail and show number slides differently — P1 · S–M

In the demo deck, the rail says `2 / 98`, but the show and the slide footer say
`2 / 110`. The four games (slides 78, 88, 89, 90) expand into extra steps in the
show, so from slide 79 on the two numbers disagree. "Go to slide 85" then means
different slides in the editor and on the wall.

- **Options** (see Open decisions):
  - **A.** The show numbers authored slides, and game steps show as `78.3`
    or as a sub-counter.
  - **B.** The rail shows the show's number next to its own.
  - **C.** The footer number follows the authored slide; only the HUD shows the
    step count.

  Recommendation: **A**. People talk about slides, not steps.
- **Done when:** the rail, the footer, the HUD and the "go to slide" box agree
  for every slide in the demo deck.

##### UX-05. Empty edit + Escape adds an Undo step that does nothing — P1 · S · to confirm

After clicking into a heading and pressing Escape without changing anything,
Undo lit up. Suspected cause: `onCancel: function () { touched(); repaint(); }`
in `js/editor.js:439`. Not traced yet.

- **Change:** `touched()` runs only when the text actually changed. With UX-01
  this becomes: save only if the text is different.
- **Done when:** clicking into a block and out again with no change leaves the
  Undo stack as it was.

##### UX-06. Clicking the fading HUD advances the slide — P1 · S · to confirm

I clicked **⋯** on the HUD as it faded; the slide advanced instead of the menu
opening. Probably the HUD became `pointer-events: none` before its opacity
reached zero, so the click went to the slide.

- **Change:** the HUD keeps taking clicks until it has fully faded, or clicks
  on the HUD's area never count as "next".
- **Done when:** a Playwright test clicks ⋯ at several points in the fade and
  never advances the slide.

#### Phase 2 — finding commands

##### UX-10. Command palette (⌘K) — P1 · M

The app has more shortcuts than Figma Slides (⌘G, ⌘F, ⌘E, ⌘\\, ⌘⌥=, J/K, H,
Alt+↑↓, ⌘X cut-and-place), but new users have no way to find them. Google has
`⌥/` Tool finder and Figma has `⌘/` quick actions.

- **Change:** ⌘K (and ⌘/) opens a search box that lists every action, with its
  shortcut next to it. The actions are:
  - insert a starter or an activity
  - change layout or theme
  - present, rehearse or host live
  - go to a slide by number or title (reuse the ⌘F search)
  - export, history, share
  - toggle the panel

  Each action comes from one registry that the buttons also use, so the
  palette cannot drift from them.
- **Done when:** every visible toolbar action can be reached from the palette,
  and a test checks that the registry and the buttons match.

##### UX-11. `?` shortcut sheet — P1 · S

Pressing `?` in the show does nothing; shortcuts appear only in tooltips
(S, V, Z, I, B, D, Esc, Shift+B).

- **Change:** `?` opens a sheet with every shortcut, in the editor and in the
  show, built from the same registry as UX-10.
- **Done when:** the sheet lists every shortcut the key handlers actually bind.
  A test compares the sheet against the handlers.

##### UX-12. Use one word for the right-hand panel — P2 · S

The UI calls it *Design & content*; the render hint and some tooltips call it
*the inspector*. Pick one word and use it everywhere.

#### Phase 3 — fewer controls

About 30 controls sit around the slide before you touch it. Google and Figma
show a third as many. Start this phase only after UX-10.

##### UX-20. Move the panel's 6 slide actions into a right-click menu — P1 · M

Undo, Redo, Copy, Paste, Duplicate and Delete sit at the top of the right
panel. They already have shortcuts, and they act on the whole slide, not on
the content being edited.

- **Change:** a right-click menu on rail thumbnails and on the canvas, plus the
  palette. The panel keeps Theme, Review, Artwork, Arrange and Header & footer,
  or moves those into the Look sub-tab.
- **Done when:** the panel's top row is gone, and every one of its actions can
  still be reached by right-click, by shortcut and from the palette.

##### UX-21. One Present ▾ split button — P1 · S

The header has four ways to start a show: Teacher Presenter, Rehearse, Host live
and Present.

- **Change:** Present is the main button; the arrow opens Presenter view,
  Rehearse with a sample class and Host live. Host live may deserve to stay
  its own button, because the room is the product. Decide when building it.

##### UX-22. One route to deck settings — P2 · S

The header's Settings, the rail's ⚙ and the panel's Theme all open the same
settings. Keep one button (the header) and one palette entry.

##### UX-23. One route to insert things — P2 · M

There are four insert buttons in two places, and each opens a modal:
`+ Slide`, `+ Activity`, `+ Add activity` and `+ Item`.

- **Change:** one **Insert** control per place, following Google's March 2025
  insert sidebar and Figma's bottom toolbar. It could be a panel that stays
  open, with tabs for Slides, Activities and Items.

##### UX-24. Say where the work is saved — P1 · S

The README says the header should read **Saved in this browser**. On screen it
is a small dot next to the Library chip. Show the words, and link them to
Export as the README describes.

#### Phase 4 — editing on the slide

##### UX-30. Outline editable blocks on hover — P2 · S

`.canvas-editable` has a `title` tooltip but nothing visible, so you can't see
that a block can be edited until you click it. Draw a thin outline on hover, as
Google and Figma do.

##### UX-31. One text, two places to edit it — P3 · S

The words can be edited on the slide or in the panel field. Keep both, but make
it clear they are the same text, for example by highlighting the panel field
while the slide is being edited.

#### Phase 5 — deck structure

##### UX-40. Sections in the rail and the sorter — P2 · M–L

The demo deck has 97 slides, and lectures run to 70. Figma's grid rows,
Keynote and PowerPoint all offer sections. Section-break slides already exist;
the rail could group and fold slides under them.

- **Needs:** a model field (possibly none: sections could be derived from
  section-break slides), folding in the rail, section headers in the sorter,
  and moving a whole section at once.

#### Phase 6 — presenting

- **UX-50. Number + Enter to jump — P2 · S.** Google and reveal.js both do
  this. Depends on UX-04.
- **UX-51. `O` overview grid while presenting — P2 · M.** reveal.js and Slidev.
  Reuse the sorter's grid, read-only, and click a slide to jump to it.
- **UX-52. Pacing timer — P2 · S–M.** In the presenter pop-out: time elapsed
  and time left, and optionally a colour for whether you are ahead or behind
  (reveal.js).
- **UX-53. `W` for a white screen — P3 · S.** Google has it. `B` already blanks
  the screen to black.

#### Phase 7 — the room

Items UX-60 to UX-62 touch `js/live.js` and `server/server.js`. Coordinate them
with whoever is working there, as
[improvements-backlog](#status-by-series) items 8, 10 and 11 already do.

- **UX-60. Hide the answer bars until the reveal — P1 · M.** `Live.revealed`
  already controls whether the correct answer is marked. Add a setting for each
  question, *results: live / on reveal*, so the room doesn't just follow the
  majority. Figma's alignment scale and Mentimeter's "responses on click" do
  this.
- **UX-61. Lock all phones — P2 · M.** Lock now, or lock on a countdown (Pear
  Deck). Builds on Shift+B blank phones
  ([improvements-backlog #6](#status-by-series)).
- **UX-62. Show who has left the tab — P2 · M.** Nearpod's red dot. Phones
  report a `visibilitychange` event, and the teacher's room view shows it.
- **UX-63. Lobby and nicknames — P3 · M.** Needs a decision.
- **UX-64. Student-paced mode — P2 · L.** Needs a decision.
- **UX-65. Per-student takeaway — P3 · M–L.** Needs a decision. "My saved
  slides" on the join page is halfway there.

#### Phase 8 — accessibility

- **UX-70. Labels for icon-only controls — P1 · S–M.** `index.html` has 92
  buttons and only 35 `aria-label`s, and 80 elements rely on `title` alone.
  The show's icon-only HUD matters most here.
- **UX-71. Type under 12px — P2 · S–M.** 56 CSS rules set type at 9–11px, or
  around 0.6–0.72rem. Rail labels and panel captions are hard to read at 100%
  zoom. Raise the minimum to 12px, and check the result against the visual
  baselines.
- **UX-72. Keyboard-only pass — P2 · M.** Go through every modal, the panel
  tabs and the slide editor without a mouse. Do it after UX-02.

---

### Not doing

These conflict with the README's rule, "typed layouts, not a freeform canvas",
or are a product in their own right:

- A Figma-style freeform design mode
- `.pptx` import and export in both directions
- Gamma-style cards whose layout reflows to fit the screen
- Several people editing the same deck at once

### Code audit (CA-)

- **CA-01.** `Store.save()` returns `false` (`src/storage.js:182-185`), but
  `touched()` and `flush()` (`js/editor.js:98-114`) call `SF.Shell.stored()`
  whatever the result. When a save fails, the header should say so loudly and
  offer Export. CA-07 and CA-08 make a full storage much more likely.
- **CA-02.** At minimum, listen for `storage` events, and when the deck you
  have open is changed in another tab, show "This deck changed in another
  tab — reload?". Also stop `openDeck` from saving a deck that has no edits
  pending.
- **CA-03.** `src/editor/arrange.js:428-472`: `beginDrag` must bail out when
  `e.target.isContentEditable`, or when an inline edit is open on that block.
- **CA-04.** Call a debounced `touched()` on `input` during an inline edit, or
  have the `beforeunload` flush end any open inline edit first.
- **CA-10.** `runIndexFor` in `js/editor.js:2189` must skip `s.hidden`, just
  as `buildRunDeck` does (`src/model.js:1222`). This is a one-line fix plus a
  test.
- **CA-11.** Duplicating or re-inserting a game should clone it (the way paste
  already does), or compiled ids should include the embedding slide's id.
- **CA-20.** Clamp to `LATTICE.rows` and `LATTICE.cols` in `applyRegions`
  (`src/render/lattice.js:311`), and check `design.regions` in
  `normalizeSlide`. The `cards-rows` template already declares rows 5–19.
- **CA-21 to CA-24 are the three-arrangement-systems problem from
  [canvas-as-nucleus.md](canvas-as-nucleus.md), now visible as bugs.** The lab
  lattice now lives only in `modular-canvas/preview.html`. The two systems that
  still run on slides are compositions and regions, and they act on the same
  slide one after the other. No slide gets exactly one owner for where its
  blocks go. The fix is structural: either a region map turns off the
  composition's body CSS, or compositions declare their slots in lattice
  coordinates using the real block keys. Decide this before adding any more
  compositions.
- **CA-25.** `src/editor/artwork.js:190`, `:328`: measure scale from `.slide`,
  as Arrange does at `arrange.js:452`.
- **CA-30.** Fix this with UX-03 in one place: an editor-mode flag on render,
  and every "Add …" prompt checks it. Add a visual baseline of an empty slide
  under `#player`.
- **CA-40, CA-41.** `src/editor/customize.js:577-579`: actually apply the
  format (reuse `bind`'s handler, line 157), and add `if (e.isComposing) return;`
  before the Enter check.

### The 13 September review (#1–20)

#### 1. Present button clipped — **done, `18899f7`**

`.topbar` already wrapped; `.header-actions` in `studio.css` did not. At 375px
that row wanted 383px in 357px of space and ran off the edge, taking Present
with it. Now wraps rather than shrinks, because the labels are translatable.

Verifying it turned up the same defect one element over: the File menu is 205px
anchored left of a button two thirds across, so it ran to 400px and clipped
every item. Anchored right below 800px.

Costs 375px a taller topbar — five rows, 218px, Present alone on the last. Not
clipped, but tall. Tightening it means shrinking buttons, which trades against
item 2, so it waits on that decision.

#### 2. HUD tap targets — **the finding was mostly wrong**

Reported as "27 buttons at 36×36 against a 44px floor". Two errors in that.

`customize.css` already sizes them **42×42**; the `.hud button` rule in
`app.css` is overridden. The 36×36 I measured only applies below 380px, where
`@media(max-width:380px)` shrinks them on purpose — and it has to, because nine
buttons at 44px need 444px of pill and a 375px phone has nowhere to put it.
Someone had already worked that out. I measured at 375px and read a deliberate
trade-off as neglect.

It also does not interact with item 1: the HUD is the presentation pill, not the
studio topbar. Two different elements.

What was actually left: 42px is two short of the floor on a touchscreen. Fixed
for coarse pointers above 380px only. A cursor keeps the tighter bar, and the
narrow-screen shrink is untouched.

#### 3–5. Exploration code, from the review of `84d7527`

- **3** `js/explore.js` — the drag handler calls `command()` per pointermove,
  which calls `syncPresenter()`. That builds a full state payload and posts it.
  A drag fires at display rate. It early-returns with no presenter window open,
  so it is invisible in testing and bites in the one configuration a lecturer
  actually uses.
- **4** `js/explore.js` — `slide.exploration = config(slide)` runs as a side
  effect of drawing the inspector, replacing the object every repaint without
  calling `changed()`. Line 125 at `84d7527`; line 134 in the working tree after
  the `onerror` fix shifted it. Pin by commit, not by line.
- **5** `src/deck/exploration.js` — `explorationValue()` normalises its config on
  entry, so plotting a 101-point curve normalises 101 times.

#### 6. Blank the phones

`toggleBlank` only toggles a class on the projector root. `join.html` has no
concept of blank or frozen — the only "blank" in it is the *Fill the blanks*
game label. Freeze is the same story: it stops wall navigation, not phones.

Under-scoped at first as "a broadcast flag and an overlay". A phone rejoining
mid-blank has to arrive blanked, so it is **room state on the server**, the same
shape as `room.reactions`. Name it **Blank phones** in the HUD: `B` already
means blank and teachers will assume it covers both.

#### 7. Gate ✋ and ?

Corrected during the discussion: these are **not** ungated. `server.js` caps
each player at five open questions, and dismissed ones are not counted against
them. Pace signals have their own handling. What is missing is *junction*
gating — open the channel when the deck is at a check-in, not continuously
through explanation. Reactions already have both a host toggle (`room.reactions`)
and a per-slide `acknowledged` guard; that is the pattern to copy.

If the rule is "only when invited", **Got it** should be gated the same way.
The ♡ bookmark can stay always-on unless it turns into fidget chrome.

#### 9. Progress and score on the phone

Corrected during the discussion. The header score is **already hidden** outside
question and result screens, by `css/learner.css:29`:

```css
body:not([data-screen=scQuestion]):not([data-screen=scResult]) #hdrScore{display:none}
```

An earlier claim that students stare at a phantom "0" through the word cloud was
wrong — it came from misreading `join.html:29` as `learner.css:29`. Two files,
same line number.

So there are two separate asks, and only the first is small:
- **progress** `3 / 4` during a check, where scoring is already the subject
- **persistent current + total** while listening, which is the bigger change and
  the one that needs a teacher control

#### 11. Coda

Not a missing feature — a **wrong sequence**. `finalScores` appends a results
slide *after* the last authored slide. The intended shape is exit ticket
penultimate, personal wrap last.

Open design question, unresolved: the wrap on the final slide competes with the
teacher's closing words, and twenty-four phones lighting up at once is a social
event whether or not that was intended. The alternative is to let the wall carry
the ending and have the personal wrap waiting in **My saved slides**, which
already persists under `slideforge.saved.*`. Blocked on a privacy decision:
names, anonymised, or place-only.

#### 12. Visual baselines for slide layouts

All 168 baselines are game boards — 24 styles × 7 themes. **No slide layout is
covered**: not chart, gallery, before/after, explore, simulation, cards,
keywords or split.

Precision, corrected during the discussion: the layouts are not untested. There
are logic tests in `charts.test.js` and `exploration.test.js`. What is missing is
**pixel and layout** coverage. Every layout bug found this session — the clipped
fourth card, the clipped caption, the clipped line label, the clipped gallery
credit — was caught by eye, and none would be caught if reintroduced.

The runner's header comment said 144 while it ran 168; corrected.

---

#### 18. "Add image detail" — **retracted, there was no bug**

Reported as: clicking **Add image detail** on an Explore slide adds nothing.
That was wrong. It works — add, edit, add again, remove, all persist, and an
earlier detail survives removing a later one.

The cause was my probe, not the app. I selected the button with
`find(b => /Add image detail/.test(b.textContent))`, and **two** buttons match
that text: the real one in the inspector, and a card in the "Try another
layout" grid whose handler is `SF.prepareLayout(s, type)`. `find` returned the
layout card every time, so I was clicking "switch this slide to the Explore
layout" and then asking why no hotspot appeared.

What makes this worth writing down is that every check I ran **corroborated**
the wrong conclusion:

- the handler ran and did not throw — true, it was the layout-switcher's
- the model preserved a pushed spot — true and irrelevant
- the slide object was stable across redraws — true and irrelevant
- reverting to `HEAD:js/explore.js` reproduced it — of course; the same probe
  clicked the same wrong button

Four pieces of consistent evidence and a reproduction against a known-good
build, all of it downstream of a premise nobody checked. The check that would
have caught it in the first minute was counting the matches:
`document.querySelectorAll` for that label returns two.

- **13 Sep** — Item 9 done, with one substitution worth flagging.

  **Progress** was the straightforward half: the phone said "Question 3" with no
  denominator because only the host has the deck and nobody was sending the
  count. It now travels with the question, and the phone says "Question 3 of 4"
  — or falls back to "Question 3" when the host did not send one, rather than
  inventing a total.

  **The score chip shows a tally, not points.** The ask was "current score and
  total score"; points have no honest denominator to a learner mid-lesson, and a
  raw points figure only means something held against somebody else's. The
  server already keeps `correctCount` and `askedCount` per player for the
  report, so the chip is now **"1 / 2"** — their own, readable about themselves,
  and the denominator grows as questions are asked whether or not they answered.
  Points are still on the result screen, where the standing lives.

  Checked first that a denominator would even be honest: a correct answer gains
  at most `question.points` (the speed multiplier tops out at 1.0), so nothing
  can exceed its own total.

  Verified live: "Question 1 of 4" with an empty chip before anything is asked,
  "1 / 1" after a correct answer, "1 / 2" after a missed one.

#### 19. A host refresh destroyed the live room — **done**

Reproduced before touching anything: the teacher refreshes mid-lesson and every
phone in the room gets *"The host disconnected"* and a **"You won!"** screen,
because closing the room runs the end-of-game path. The PIN dies with it.

The asymmetry is what showed it was never a decision. A **player** who drops
keeps their seat — socket set to null, `resumeToken` lets them back in, the room
carries on. A **host** who dropped hit `closeRoom` on the next line. The
machinery to survive a disconnect already existed; the teacher just never got
it.

Now: the server holds the room for 90 seconds, issues the host a token like it
already issues players one, and accepts a `rehost` that proves it. The host
client keeps `{pin, token}` in sessionStorage — per tab, so a reload walks back
in and a fresh tab cannot quietly take over someone's room — and tries to
resume at boot. Phones say nothing for the first six seconds, because a banner
that flashes up and vanishes is worse than the pause it describes.

Three of my own bugs on the way, all found by testing rather than reading:

1. **The deck-id guard.** I stored the deck id and refused to resume unless it
   matched the deck open at boot. `Live.host` is handed a *compiled run deck*,
   whose id is not the authored deck's, so it never matched — and the guard
   deleted the very token it was meant to protect. Removed: the server's token
   check is the real gate.
2. **`forgetRoom()` in a shared case body.** `case 'sessionReport':` and
   `case 'sessionClosed':` fall through to one body. Dropping the call in
   unguarded meant every routine session report wiped the token, so the room
   was held open and the only key to it was thrown away a second after the
   lesson started.
3. **Coming back dead.** `rehosted` restored the pin but not the running state,
   because `Live.active` is set by `begin()`, which also tells the server to
   start. Split the local half out so returning can use it without starting the
   lesson twice.

Server log from the passing run: `host away — holding for 90s` then `host back`
in the same second; a separate abandoned room closed when its 90s expired.

#### 20. Refresh recovery — B, C and D fixed

- **Presenting** — the tab keeps the compiled run and current slide in
  `sessionStorage`, so a refresh reopens the presentation at the same position,
  including inside an embedded game. Explicit exit clears it. Rehearsals are
  not restored. Browser fullscreen still needs a user gesture after reload.
- **A student's phone** — a saved identity now rejoins automatically on load.
  Typed-PIN joins also remember the PIN; an explicit URL PIN takes precedence.
  Ended and removed seats lose their token as before, and a fresh tab has no
  identity to reuse.
- **The editor** — selection is stored per deck by slide id, so reorder does
  not change the selected slide. A deleted selection falls back to slide 1.

The restored presentation renders before host recovery wires slide events, so
reloading does not resend the current question or start a new round. Rehosting
restores the live controls and quiz navigation gate.

Verified with `node tools/smoke/refresh.mjs`: editor reload/reorder; compiled
presentation position and explicit exit; typed-PIN and QR learner rejoin; host
reload with the same PIN and slide; reload during a question with an answer
already submitted, followed by teacher reveal; fresh tabs and ended rooms.
All 311 unit tests pass. `npm test` remains blocked by the two existing nullable
`pill` errors in the separate spontaneous-activity work in `js/player.js`.

---

## Change log

### 23 September 2026: the P0 pass

**What changed, and how it was checked:**

- **CA-10.** New `SF.runIndexOf(deck, run, i)` in `src/model.js`. It finds the
  selected slide by id in the deck the show actually plays, so it can no longer
  disagree with `buildRunDeck`. A hidden selection starts at the next slide the
  room sees. Four tests in `tests/run-index.test.js`.
- **UX-01, UX-05, CA-04, CA-40, CA-41** (inline edit, `src/editor/customize.js`):
  - Escape saves. Typing is stored as you go, through a new `storeSoon()` that
    adds no Undo step and doesn't redraw. The whole edit is still one Undo step.
  - ⌘B/I/U format through the same path as the format bar's buttons.
  - An IME composition's Enter and Escape are ignored.
  - Cancelling no longer creates an empty `formatting` table.
  - Checked in the browser: Escape kept the text; one ⌘Z restored it; the
    stored copy had the text while the edit was still open; ⌘B bolded exactly
    the selected characters.
  - The `canvas-edit` smoke asserted the old Escape-cancels rule. It came from
    the same commit (`ce7b25a`) as the Done tooltip promising the opposite, so
    it was never a deliberate choice. The smoke now asserts that Escape keeps
    the text and one Undo takes the edit back.
- **CA-03** (`src/editor/arrange.js`). A press inside text being edited is never
  treated as a drag. This is traced in the code only; I haven't browser-tested it.
- **UX-02** (`js/shell.js` `openModal`). The `.modal` sheets (Settings, Write
  questions, Ask the room, Open) now:
  - have `role="dialog"`, `aria-modal` and `aria-labelledby`
  - move focus in when they open and back to the opener when they close
  - keep Tab inside
  - close on Escape

  The deck's own shortcuts and paste now stand aside while one is open.
  **That was a worse bug than B2.** With Settings open, Delete on its focused ✕
  deleted the selected slide behind it. Reproduced (97 → 96), then fixed.
  - **Retraction.** The Starters and Library windows are native `<dialog>`s and
    close on Escape normally. The browser tool's simulated Escape (and its
    clicks) never reach native modal dialogs; a bare test `<dialog>` failed the
    same way. B2 was right about the `.modal` sheets and wrong about those two.
- **UX-03 and CA-30.**
  - `renderSlide(…, { authoring: true })` stamps `data-authoring`. Every
    author prompt carries `.authoring-hint`, which is `visibility: hidden` on any
    slide not drawn for authoring.
  - The editor canvas, rail, fit trials and review tool pass `authoring`. The
    projector, share view, presenter desk and handouts pass nothing, so they
    show a clean slide.
  - Checked in the browser on empty content, image, video, table and chart
    slides: each prompt is visible in the editor and hidden in the show.
  - `visual:check`: 642/642, pixel-exact, so hiding the prompts moved nothing.
- **CA-01.** Every save now passes the store's result to `SF.Shell.stored(ok)`.
  A refused write sets the header to **Not saved** in red, shows a one-time
  toast pointing to File → Export, and stays until a write succeeds.
  - Found on the way: below 1500px the header status is a dot with
    `font-size: 0` (`css/studio.css:121`), so "Saved" has never been readable
    on a laptop. The failed state overrides that, but the saved state does not
    (that is UX-24).
  - Checked in the browser by making writes to `slideforge.decks.v1` throw.
- **CA-02** (`js/editor.js` `onOtherTab`):
  - A tab with no unsaved work quietly takes the other tab's newer copy, keeping
    its own as one Undo step.
  - A tab with unsaved work is asked **Load the other version / Keep this tab's
    version**, with its own pending save held while the question is open.
  - `SF.ask` gained an optional decline callback and a `cancel` label.
  - Checked with two real tabs.
  - **One unexplained failure.** In the first two-tab run, "keep" left the other
    tab's copy in storage. It did not happen again in three runs, including one
    that recreated the earlier conditions. The second tab in that first run had
    been through several simulated writes, so I don't know what it did. Watch
    for this, and treat it as not proven fixed.

**Suites:** `npm test` 461/461 (457 + 4 new). `visual:check` 642/642.

### 23 September 2026: the P1 pass, part one

- **CA-06 and CA-50.** File → Open deletes through `removeDocs()`: it cancels the
  pending save and moves to another document if the open one was deleted,
  matching what the Library already did. Both workspaces gained
  `cancelPendingSave`. Picking a record another tab has deleted now shows a
  toast instead of crashing.
- **CA-07.** A copied slide over 100 KB stays in this tab (in memory and
  `sessionStorage`); smaller ones still go to `localStorage`, so another tab
  can paste them. An oversized copy left by the old code is removed on load.
  Two tests.
- **CA-08.**
  - A burst of text edits less than a second apart is one Undo step. A change
    to the slide list is always its own step, and never opens a burst for what
    follows.
  - The history is capped at 40M characters as well as 60 steps.
  - Checked in the browser: five keystrokes, one Undo. A duplicate plus typing
    100ms later is two steps. My first version merged them; the check caught it.
- **CA-20.** `anchorRegion` makes spans whole cells, at least one, and no wider
  than 12 columns. The bottom edge is deliberately left alone: past row 16 is
  allowed and reported by `restackRegions`, and clamping it would hide that.
- **CA-22.** The slot functions take the resolved composition, and Arrange
  passes `SF.slideComposition(deck, slide)`. One test covers a composition set
  only by the theme and a stale key.
- **CA-25.** `scaleOf` measures `.slide`. On a 4:3 deck the box scale was 0.669
  against a real 0.5, so shapes moved at 0.748× the pointer.
- **CA-55 (new).** The inline editor replaced every newline with a space, so one
  keystroke in a two-line heading flattened it for good. Headings now keep
  their line breaks (Shift+Enter adds one); bullets stay one line. Checked in
  the browser.
- **CA-05: not reproduced.** One click on another slide while editing both
  saved the edit and selected the slide. Code left alone.
- **UX-06.** The HUD dropped `pointer-events` the moment it began a 250ms fade,
  so a click on a still-visible button fell through and advanced the slide.
  It now hides with `visibility`, which flips only once the fade is over.
  `customize.css` redefined the transition and had to carry the delay too.
  Every key in the show calls `showHud()`, so Tab still reaches the bar.
- **UX-11.**
  - `?` in the show already opened the sheet; my first test used a key
    combination the tool didn't deliver.
  - The editor now opens the same sheet with `?`, with an **Editing keys**
    section listing only keys read from the handlers. Escape or `?` closes it,
    and nothing else reaches the deck while it's open.
  - Settings' "? Shortcuts" now closes Settings through its real close button.
  - The card fits narrow windows (at 436px it had run off the right edge).
- **UX-24, partly.** The status is a button reading **Saved in this browser**,
  and clicking it exports, as the README always said it did. Below 1500px it is
  still a dot, now clickable and labelled. Words at every width need the header
  space UX-20 and UX-21 would free.

### 23 September 2026: the P1 pass, part two

- **CA-08, corrected.** The first version joined any change that kept the slide
  list into a burst, and the `chrome-regions` smoke caught it: moving the logo
  between header slots right after another edit made one Undo take back both.
  Only typing joins a burst now, meaning a change recorded while a text field's
  `input` event is being handled (noted by a capture listener). Anything else,
  and any handler that runs later than its event, is its own step, as before.
  Typing still coalesces: re-checked in the browser.
- **CA-11.** `buildRunDeck` qualifies the compiled ids of a game's second and
  later appearances with the embedding slide (`…@<slideId>`); the first keeps
  its stable ids. The only code that reads compiled ids (`demo.js`, `:howto`)
  still matches. Reports that group by `gameId` still put the two rounds
  together; that is a reporting decision, not an id collision. One test.
- **UX-70, part one.** All 13 icon-only buttons in `index.html` have an
  `aria-label`: the nine with a `title` use it, and the four ✕ on the sheets say
  "Close — Settings" and so on. Buttons built in JavaScript are not audited yet.

**Suites:** `npm test` 465/465, `visual:check` 642/642, smoke 50/50.

### 23 September 2026: P1 completed

- **UX-10: command palette, ⌘K.** `js/palette.js` owns no actions. The editor
  lists its own through `commands()`, each calling the function its button or
  shortcut calls. The shell adds header and File-menu actions by clicking the
  real button, and offers one only if that button exists, is enabled and
  belongs to the current studio. Ranked by subsequence with word starts
  weighted; a bare number offers "Go to slide N"; slides are searchable by
  title. It's a native `<dialog>`, so Escape and focus come free. Four tests on
  the ranking; checked in the browser: open, type "block", Enter opens the block
  view.
- **UX-21: Present ▾.** Present is the main button; Teacher Presenter and
  Rehearse moved into its menu with their ids kept. Host live stays its own
  button, because the room is the product. The menu closes on a choice, an
  outside click or Escape. The `rehearse` smoke now opens the menu first, as a
  person would.
- **UX-20: slide menu.** Right-click a slide in the rail or the canvas, or press
  Shift+F10 or the menu key on a focused row. Copy, Paste, Duplicate and Delete
  left the panel for it, replaced by one **⋯ Slide** button that opens the same
  menu, because a tablet has no right-click. **Undo and Redo stay** in the
  panel: Google keeps them on its toolbar, and the smokes drive them. Text being
  typed into keeps the browser's own menu.
- **UX-24.** Measured the header at 1024, 1100, 1180, 1200, 1280 and 1440px with
  a long folder chip: the words fit down to 1100 and wrap at 1024. The dot-only
  breakpoint moved from 1500px to 1080px.
- **UX-70.** The one JavaScript-built icon button without a label (a poll
  option's ×) has one; the rest already had them.
- **UX-04, decided.** `js/render.js` already said, about hidden slides, "the
  room's count is the true one, so the editor is made to agree with it". I had
  recommended the opposite without having read that. New `SF.showNumber` counts
  a game as the steps it plays as, with step counts cached per game version, so
  the editor footer and the wall agree. Checked: 82 / 109 on the editor, the wall
  and the HUD for the same slide. Rail row numbers are unchanged; `slide:12`
  links use them.
- **UX-60.** New game setting, **Hide the room's answers until the reveal**,
  stamped on each compiled question as `holdResults`. The wall keeps "N of M
  answered" and holds the bars; `Player.releaseTally()` draws them at the
  reveal. One line in `js/live.js`. Off by default, so existing games play as
  before. Checked in the browser with an in-memory game: held bars stayed off
  and appeared at the reveal, live bars behaved as before.
- **CA-21, not reproduced.** Tested on six composed slides, including the
  `ballot` the review named: on each, recorded every block's position, turned
  Arrange on, and measured the jump. The old code and a body-frame version gave
  identical numbers: 0px sideways and 0px in width on `ballot`, 18px vertically,
  which is snapping to half a row; 36–55px on the others, which is snapping to
  98px columns. The frame mismatch is real in the code but moves nothing
  measurable, so the change was reverted rather than shipped. Related and still
  open: the fit check counts 36px rows even where a composition's body has
  shorter ones.

**Suites:** `npm test` 471/471.

### 23 September 2026: P2, first batch

- **CA-26.** Arrange and Artwork compare slides by id, and refresh their
  reference after an undo, which rebuilds every slide as a new object. Checked:
  Layout stays open through Cmd+Z.
- **CA-42.** A group moves from its edge: right lands one past the slide after
  it, left one before the slide ahead. Checked in the sorter: 1,2,3 → 2,3,4 →
  3,4,5 → 4,5,6, and back. Single slides move exactly as before.
- **CA-27.** A resize registers a cancel and a window-blur handler, as a move
  does; cancelling redraws, so a half-resized slot is not left on screen.
- **CA-24.** Once the lattice re-parents the accent bar into a slot, the hide
  rule's child selector stopped matching. The slot holding it is now hidden
  (`:has()`, with a bare-selector fallback).
- **CA-23.** The slot tables name some bands by class (`cp-heading`,
  `cp-prompt`) that the renderer stamps with a content key, and only rendering
  says which. So Arrange's seed, which renders, drops any `cp-` name that no
  rendered block answers to. Those were occupied cells nobody could see or clear.
- **CA-51.** A window resize while someone is typing sizes the canvas at once
  and holds the redraw until focus leaves. On a phone the keyboard opening is a
  resize.
- **CA-52.** The fallback edit form registers itself, and the editor's `draw()`
  closes it first, keeping the words and recording the edit, as Escape and Done
  now do. Before, a redraw removed it with neither Save nor Cancel.
- **CA-28.** The layout picker's fit badges measure again once
  `document.fonts.ready` resolves, if the fonts had not loaded. The text-size
  fitter has the same timing and is not done yet.
- **UX-30, withdrawn.** The hover outline exists: `.canvas-editable:hover` in
  `css/app.css`. The deep dive's claim was wrong.

### 23 September 2026: P2, second batch

- **UX-50.** In the show, digits build a slide number ("Go to slide 12 — press
  Enter"), and Enter goes there. Escape or a 2.5-second pause clears it, and
  Backspace edits it. The number is the wall's. On an unanswered question in
  solo mode a digit still answers, unless a number is already being typed.
  The first version failed in the browser: after clicking Present the focus
  stays on that button, and Enter on a focused button is left to the button.
  A typed number now takes Enter first. Checked: 12, Enter lands on 12 / 109.
- **UX-51.** `O` opens every slide of the show as a grid, numbered as the wall
  numbers them. Arrows move, Enter or a click goes, and `O` or Escape closes.
  It closes whenever the show closes. Checked: 109 tiles, focus on the current
  slide, a pick jumps.
- **UX-52.** The presenter view's elapsed clock gains a planned length (15 min
  to 2 hours, kept per lesson). With one set it reads "12:30 / 50:00" and is
  green on pace, red when more than 8% behind and blue when more than 8% ahead,
  measured as progress through the slides against progress through the time.
- **UX-22.** The rail's bare ⚙ is gone. The header's Settings and the panel's
  Theme, beside the design tools, remain; ⌘K also finds it.
- **UX-12.** Interface text says *Design & content*. The demo lessons' own
  notes in `js/lessons.js` still say "inspector"; that is lesson content, and
  saved copies would not change anyway.
- **UX-71.** Editor chrome only, nothing inside `.slide`: reading text (field
  labels, hints, panel tabs, library rows) to 12px, and badges and tags from
  7–9px to a floor of 10px. Checked at 1440 × 900: no clipped text, nothing
  visible under 10px.
- **UX-72, scripted half.** On the editor screen all 355 visible controls have
  an accessible name, none rely on `title` alone, and no clickable element is
  out of Tab's reach. Working every sheet with only a keyboard still needs a
  person.

### 23 September 2026: UX-23 and UX-40

- **UX-23.** Of the four insert buttons, only one duplicated another: the
  rail's "+ Activity" opened the same catalogue as the canvas bar's green
  **＋ Add activity**. An existing test (`tests/add-activity.test.js`) had made
  several doors to *one* catalogue a deliberate choice, so the fix removes the
  least prominent door, not the idea. The rail now has one **+ Slide**, whose
  starters open with a **A game or activity** card leading to the same
  catalogue. The rail adds slides; the canvas bar adds activities and **＋ Item**
  to this slide; Engagement keeps its own. The test and the `add-activity`
  smoke follow the new route.
- **UX-40.** A section is a section slide and everything up to the next one,
  so no field was added to the deck. In the rail each section slide gets a
  fold toggle naming how many slides it holds, and a folded row says "N slides
  folded". Fold state is this tab's view, not part of the lesson, so it lives in
  `sessionStorage`. A selection inside a folded section opens it, so the
  arrows, find and ⌘K never land on an invisible row. The slide menu on a
  section slide offers **Fold / Show this section** and **Move this section
  up / down**, which carries the whole block past the neighbouring section.
  In the sorter a section tile carries a "Section · N slides" tag and an accent
  edge; a header row across the grid would have shifted every tile after it,
  and the sorter's arrow keys count by column.
  - Caught in the browser: the first version set `hidden` on folded rows and
    they stayed drawn, because `.thumb` has its own `display` and an author
    rule beats the `[hidden]` style. It now uses `.rail .thumb[hidden]
    { display: none }`. Checked by measuring drawn rows, not the attribute.
  - Checked: fold hides exactly its rows; ⌘K to a slide inside unfolds it; a
    three-slide section moved past a 21-slide one intact; undo restores.

### 23 September 2026: UX-61 and UX-62, the live room

- **UX-61.** Locking every phone *now* already existed as **Blank phones**
  (Shift+B, the show's ⋯ menu, the presenter view), kept as room state so a
  phone that rejoins arrives dark. What was missing was the countdown:
  - **Blank in 10s** in the presenter view and the show's ⋯ menu. The host
    sends `blankSoon` and every phone shows "Phones down in 10 — finish your
    thought", counting; when it ends the host blanks the phones.
  - Pressing it again cancels (`blankSoon` 0 clears the banner). Blanking by
    hand overtakes a running countdown.
  - The relay accepts `blankSoon` only from the host, clamped to 60 seconds.
- **UX-62.** The phone reports `away` when the page is hidden (another app,
  another tab, the screen off) and when it comes back, only on a change, and
  again on rejoin. The relay records it and puts it in the roster, which only
  the host receives. The presenter view shows "2 away", with the names on
  hover. **The wall's lobby does not show it**: naming who has looked away in
  front of the class is a different thing from telling the teacher.
- **Tests.** `tests/away-and-countdown.test.js` runs the real relay with a host
  and two phones: away reaches the host and no other phone; the countdown
  reaches every phone, 0 cancels, 600 is clamped to 60, and a phone cannot
  start one.
- **Not checked in the browser.** Starting the room from the lobby opens the
  presenter view, which the browser tool used here can only do by replacing the
  host's tab, which ends the room. The protocol is proven by the relay test; the
  banner and the "away" chip were not seen drawn.
- **Shared files.** `js/live.js`, `join.html` and `server/server.js` are also
  worked on by the other agent. The changes are additive: new message types
  and one new roster field.

### 23 September 2026: the room pane, for a real class

Drawn with 32 students, the pane beside the slide judged people on the
projector ("needs support" under their names), cut rows and poll options in
half, signed brainstorm ideas, printed the PIN twice, and took a third of the
wall beside slides that asked nothing. The findings and the rules it follows
now are in [room-pane-redesign.md](room-pane-redesign.md). In short:

- **Accuracy and "needs a hand" move to the desk** ("3 need a hand" beside the
  away chip). Ideas are anonymous on the wall.
- **Above 8, the top five and the pack**: "+ 27 more · Your place is on your
  phone", and the pack's biggest climb named after a reveal. The full-screen
  standings use the whole width and carry the same line.
- **Fitted by measurement**, so nothing is drawn cut in half. One PIN. Long
  full names become "Tom O.".
- **A 232px strip beside slides that ask nothing.** The pane is full width
  beside questions, results and prompts.
- **The answered count leads** the feedback pane.
- **Open:** rehearsing a class of 30, lecture-scale defaults, and a packed word
  cloud.

### 23 September 2026: Think-Pair-Share as timed stages

A new `stages` presentation for activity slides. Think-Pair-Share now has a
stage track, a clock per stage and a job for the phones: a private note for
Think, the note back for Pair, an anonymous idea for Share and "phones down"
for Connect. It also has +30s on the wall and the desk. The details are in
[game-activity-redesign.md](game-activity-redesign.md#built--23-september-2026).
It is covered by unit and relay tests. It was **not** smoke-tested or viewed
in the browser.

### 23 September 2026: games to a premium standard, the build list

From [games-premium-audit.md](games-premium-audit.md): all 27 formats graded
against a nine-point bar (P1–P9). Today there is 1 premium, 10 solid, 9 thin,
6 broken and 1 disabled. The audit also lists the shared kit to rebuild
from (K1–K17). Items are in build order; the wave is the audit's.

| ID | Wave | Item | Size | Status |
|---|---|---|---|---|
| GA-01 | 0 | Word Reveal scores each answer by the letters showing when *it* arrived, not at the reveal | S | **Done** 23 Sep · relay timestamp |
| GA-02 | 0 | Quiz Bowl stores the target in game settings, while each cell keeps its own point value | S | **Done** 23 Sep · old saves migrate |
| GA-03 | 0 | Delete the second copy of the game presets in `js/studio.js` | S | **Done** 23 Sep |
| GA-04 | 0 | Teacher entry records a Ranking order (key sequence) and a Spot the Error tap (click the word) (E1) | S | **Done** 23 Sep · relay tested |
| GA-05 | 0 | A refused teacher entry says so (`manualError`), instead of being dropped (E2) | S | **Done** 23 Sep · row-level error |
| GA-06 | 1 | **Verdict recipient (N1)** in teacher entry, fed by the name picker (E4). Spoken formats score the speaker's team, and count in individual play (audit §6) | M | **Done** 23 Sep · selected speaker/team and relay tested |
| GA-07 | 1 | Spoken-format phones get a "Listen and watch" job card, not verdict pads | S | **Done** 23 Sep |
| GA-08 | 1 | Each style declares its rooms, `plays: {phones, teams, entry, solo}`; library badges; the contract test enforces it (E7) | S | **Done** 23 Sep · 25 styles covered |
| GA-09 | 2 | **The draw (N2)**: a random unused pick from a pool, animated, "N left" | M | **Done** 23 Sep · `DRAW_STYLES`, `drawNo`/`drawTotal` |
| GA-10 | 2 | **Round clock (N4)**: one clock for a run of items, on the stages clock | S | **Done** 23 Sep for Heads Up (`js/rounds.js`); Beat the Clock's use is GA-27 |
| GA-11 | 3 | Fill in the Blanks → *Fill the gaps*: a word bank tapped into slots, heat per gap | M | **Done** 23 Sep · new `fill` style and input, relay tested, not viewed |
| GA-12 | 3 | Odd One Out → *Vote, then defend*: tap the odd one, write the rule, vote heat on the reveal | M | **Done** 23 Sep · vote, held heat, defend line, unmarked; the written rule is open |
| GA-13 | 3 | Predict the Outcome → *Commit, then watch*: on stages, private prediction, confidence-weighted | M | **Done** 23 Sep · lock, watch, confidence-weighted; the written prediction is open |
| GA-14 | 3 | True/False → *Hold or fold*: split shown half-way, one switch | S–M | **Done** 23 Sep · relay tested, not viewed |
| GA-15 | 3 | **Tally entry** for paper and hands up: counts per option feed the heat reveal; nobody scored (E3) | M | To do |
| GA-16 | 3 | One-click team rows for teams without devices (E5) | S | To do |
| GA-17 | 3 | Saved class lists for teacher entry, kept on this computer only (E6) | S | To do |
| GA-18 | 4 | **Proposal queue (N3)**, generalised from Q&A moderation | M | **Done** 23 Sep · brainstorm prompt + desk list + Use this; relay tested |
| GA-19 | 4 | Concept Chain as a branching map of phone proposals; Connection Maker as its two-ended preset | M | Partly done · phone proposals for both; the branching map and drawn bridges are open |
| GA-20 | 5 | **Line reveal (N5)**; Time Traveler → *Place it in time* on a growing timeline | M | **Done** 23 Sep · on the slider engine, growing timeline, legacy heal |
| GA-21 | 6 | Desk parity: Horse Race lanes, Boss Hit/Miss, Definition Ask, every board control on the desk | S each | **Done** 23 Sep · generic `data-desk` mirror |
| GA-22 | 6 | Emoji hint released as a step, costing points; Definition rebuilt on stages | S | Partly done · Emoji hint is a released step; its point cost and Definition on stages are open |
| GA-23 | 6 | Ranking reveal as a heat per slot | S | **Done** 23 Sep · with the live reveal-order bug fixed |
| GA-24 | 6 | Horse Race and Boss use the room pane's top-five layout; Boss gets a reveal per hit | S | To do |
| GA-29 | 1 | UX pass on spoken verdicts: one path from wall and desk, a held verdict until the speaker is chosen, the speaker cleared per item, a speaker picker (teams, recent, type-ahead, Pick for me), the credit shown on the wall and phones; one shared passage for Spot entry | M | **Done** 23 Sep · relay tested, not viewed |
| GA-30 | 1 | Spoken team credit on the game's points scale, so it registers in a lesson that mixes quiz and spoken games | S | **Done** 23 Sep · 1,000 per accept, half with a hint |
| GA-25 | 2–6 | On the draw and round clock: Spin & Explain spinner, Random Challenge deck, Question Cube roll plus stages, Heads Up 60-second round | S–M each | **Done** 23 Sep · Heads Up round, deck, cube roll, the wheel lands |
| GA-26 | 7 | **Sort input (N6)**; Compare & Contrast → *Sort it* | L | **Done** 23 Sep · `sort` input, relay tested, seen on screen |
| GA-27 | 7 | Beat the Clock → self-paced *Against the clock* (relay self-paced mode) | L | Mostly done · one round clock, flowing questions, round scoring; per-phone self-pacing open |
| GA-28 | after 7 | **Solo practice** on the share link (E8) | M | To do |

**Carried from today's other work:**

| ID | Item | From | Size | Status |
|---|---|---|---|---|
| RP-01 | Rehearse with a class of 30 (and 120): a class-size choice on the rehearsal | [room-pane-redesign.md](room-pane-redesign.md) | S | To do |
| RP-02 | Lecture-scale defaults (100+): standings off, distribution on | room pane | S | To do |
| RP-03 | A packed, centred word cloud with stable positions | room pane | M | To do |
| RP-04 | The desk's "need a hand" chip, seen drawn | room pane | S | To check |
| TPS-01 | Spotlight one idea during Share | [game-activity-redesign.md](game-activity-redesign.md) | S | **Done** 23 Sep as AC-06, for every idea box |
| TPS-02 | "19 of 26 have written something" during Think (a count only; the note stays private) | TPS | S | **Done** 23 Sep as AC-07 |
| TPS-03 | Smoke-test and view Think-Pair-Share on the wall and a phone | TPS | S | To check · not seen drawn |
| TPS-04 | Existing lessons' staged routines offered the stages view (ten routines since AC-05) | TPS | S | To do |

### 23 September 2026: activities to a premium standard, the build list

From [activities-premium-audit.md](activities-premium-audit.md): the 44
activities that are not games, graded against a nine-point bar (A1–A9). At
the audit there were 0 premium (Think-Pair-Share near), 17 solid, 17 thin and
9 broken: every timed moment not on stages drew two clocks. After waves 0 and
1, 0 are broken and 25 solid. The kit continues the games' numbering (N7–N14).

| ID | Wave | Item | Size | Status |
|---|---|---|---|---|
| AC-01 | 0 | **One clock (N7)**: a timed moment's ring follows the desk's Pause, +1 min and Clear; the banner stands aside | S | **Done** 23 Sep · smoke-tested |
| AC-02 | 0 | **The desk shows the live stage (N8)**, not the full list | S | **Done** 23 Sep · `SF.lightStages`; the desk not opened |
| AC-03 | 1 | **Pinned brief (N9)**: a leading untimed row stays up on wall and phone through every stage | S | **Done** 23 Sep · seen on the wall |
| AC-04 | 1 | **Work job (N10)** with Need help on the phone; **group talk (N11)**; "every 4 min" parses | S | **Done** 23 Sep · relay tested |
| AC-05 | 1 | Stages by default for Square, both Jigsaws, Carousel, Socratic, Teach Someone, Whiteboards, I Do/We Do/You Do, Design and Create | S | **Done** 23 Sep · fit measured in 23 themes |
| AC-06 | 2 | **Spotlight and hide on any idea box (N12)**, from the desk; absorbs TPS-01 | S–M | **Done** 23 Sep · browser smoke with two phones |
| AC-07 | 2 | **The written count (N13)** during a note stage, never the text; absorbs TPS-02 | S | **Done** 23 Sep · relay tested; the host never holds the words |
| AC-08 | 2 | **Prompt controls on the desk (N14)**: close an authored prompt; self-assessment held, then revealed (audit §6) | M | **Done** 23 Sep · `feedback.hold`; the rehearsal still shows sample bars |
| AC-09 | 3 | Hook and Predict on stages: a private prediction, the image pinned | S | **Done** 23 Sep, differently · keeps its split slide (the picture is the hook) and collects "What do you wonder?" to spotlight |
| AC-10 | 3 | Real-World Connection Hunt as three send stages (room, home, community) | S | **Done** 23 Sep · now a moment; a box and a spotlight per place |
| AC-11 | 3 | Plus / Minus / Interesting as three send stages filling its columns | S | **Done** 23 Sep · three spotlights side by side at the look back; browser smoke |
| AC-12 | 3 | Learning Log as private note stages; Visual Summary, Ground Rules, Preview and Scenario Analysis on the kit | S each | **Done** 23 Sep · a note per note stage on the phone; declared jobs (`[send]`) in labels |
| AC-13 | with GA-15 | Tally entry for polls and scales, and a typed idea from teacher entry (A9) | M | To do |
| AC-14 | 4 | Benefits vs Limitations with team credit (games N1); Stations on a round clock; the Question Cube activity points to the game | S–M | To do |
| AC-15 | after GA-26 | Concept Card Sort and Word Splash confidence on the sort input | L | To do |
| AC-16 | 3 | Each activity declares its rooms (`plays`), shown in the library, with a catalogue test | S | **Done** 23 Sep · derived from shape (`activities/rooms.js`); one `SF.roomBadges` for both libraries |
| AC-17 | later | Connect Four as a board | L | To do |

## Log

### 13–22 September · the learner and live-room review

**22 Sep 2026.** Added 59 rows from the UX review against Google Slides, Figma and the GitHub tools, and from a three-part read-only code audit (canvas editing, canvas rendering, rail/storage/undo). The detail lives in [BACKLOG.md](#open-now). `npm test` passes 457/457, and none of the new items is under test.

- **13 Sep** — Item 1 done, `18899f7`. Fixed `.header-actions` wrapping and the
  File menu anchor. 310 tests, 168 baselines, desktop unchanged.
- **13 Sep** — Item 6 done. `room.phonesBlank` on the server, mirrored into all
  three ways a phone becomes a player; `#blankVeil` over the learner app;
  `blankPhones` control on `Shift+B` and in the room menu. Verified live against
  the LDSCI6253 deck with a real phone-sized client:
  - veil covers 375×812 fully, `body.phones-blank` applied
  - **a phone joining an already-blanked room arrives blank** — the case that
    made this room state rather than a broadcast
  - a half-typed word-cloud answer survives blank → unblank, so the veil's
    promise that nothing is lost is true rather than aspirational
  First reload test was inconclusive: the phone dropped to the PIN screen
  instead of resuming, so the late-joiner path had to be tested by blanking
  first and joining second.

- **13 Sep** — Item 12 done. 15 layout fixtures × 3 themes = 45 new baselines,
  213 total. Fixtures are written out in the runner rather than borrowed from a
  lesson, so a baseline never moves because somebody edited the lecture, and
  each is sized to the failure it holds open — four cards, a chart with long
  series names, a gallery layer with a source line.

  Layouts run against northeastern, studio and midnight rather than all seven:
  the first two carry the per-layout overrides, the third is the plain case, and
  every layout bug found this session would have been caught by any one of them.
  The full matrix would have added ~22MB to a directory already at 40MB. Widen
  `LAYOUT_THEMES` if that trade stops holding.

  **The new baselines immediately caught a bug.** A gallery rendered without a
  running build stacked every figure's caption on top of the others — the only
  rule hiding them was `.fig.step-past .fig-cap`, and `step-past` is applied by
  the reveal driver, so it never fires in a static render. That covers a gallery
  with Build on Next switched off, the editor preview, rail thumbnails and the
  presenter's next-slide pane. Now stated as "a figure is covered when a later
  one is not still hidden", which holds in both cases; re-verified that a live
  build still shows exactly one caption per press.

- **13 Sep** — Items 3 and 5 done.

  **3** The presenter sync is coalesced to one an animation frame. Measured in
  the browser: 60 `position` commands now produce **1** sync instead of 60, with
  the final state intact. The local view still updates synchronously, which is
  what makes a drag feel attached to the finger. Where there are no animation
  frames — a test vm, a headless render — it syncs straight away rather than
  inventing a timer; the first attempt used a `setTimeout` fallback and broke
  three exploration tests, because that vm has no timers either.

  **5** Added `explorationCurve(config, steps)`, which normalises once and
  samples the curve, and pointed the what-if graph at it. `explorationValue`
  stays defensive for callers handing it whatever is on a slide.

  Worth recording honestly: the payoff is **1.8×** (5.6ms vs 9.8ms for 200
  curves), not the order of magnitude "101 normalisations" implied. The finding
  was real; the cost of it was modest.

  Two measurements had to be thrown away before these. A spy on
  `SF.normalizeExploration` reported zero calls because `explorationCurve` calls
  the module-local binding, not the one hung off `SF`; and a sync count of zero
  turned out to be an instrumentation artefact rather than perfect coalescing.
  Timing the two paths, and checking `document.visibilityState` first, gave
  numbers worth quoting.

- **13 Sep** — Item 7 done, as a **floor** the room either has or has not.

  The deck already knows where its junctions are: `room.at.activity` is
  `content` while the host explains and `question` / `feedback` / `moment` at a
  check. So `room.floor` defaults to `auto` and follows it, with `open` and
  `shut` for when the teacher disagrees. `Shift+H` cycles; the room menu says
  which it is on.

  The buttons **leave** rather than grey out. A hand that is only there when
  the floor is open means something; one that is always there is wallpaper.
  Enforced on the server too, not only hidden: a hand-crafted client that
  joined and sent an `ask` on a content slide came back with *"Questions open
  at the next check-in."*

  **Corrected mid-build: pace signals are outside the floor.** Gating them
  broke two tests, and the tests were right — `kind: 'lost'` means "I am lost",
  which is only any use while somebody is explaining, i.e. exactly when the
  floor is shut. A pace signal is also anonymous, aggregated and expires on its
  own, so it is not the channel anyone can flood. Questions are. This differs
  from the original instruction, which included the hand; worth revisiting if
  the room turns out to abuse it.

  Verified live across all three modes: auto on content (ask and Got it gone,
  hand stays), auto at a junction (all three), host-forced open on content, and
  host-forced shut at a junction.

- **13 Sep** — Item 2 done, and mostly retracted. The buttons were 42×42, not
  36×36; the 36px only happens below 380px and is load-bearing — 9 × 44px + gaps
  is 444px against a 375px screen. The real gap was two pixels on touch, now
  closed with `@media(pointer:coarse) and (min-width:381px)`. Verified 44×44 at
  500px coarse with the pill still fitting (480 of 500), 42×42 unchanged on a
  fine pointer, 36×36 unchanged below 380px.

  My first attempt put the rule in `app.css`, where it never applied at all:
  `customize.css` loads later and sets the same selector. It looked right in the
  file and did nothing in the browser.

- **13 Sep** — Item 4 done, and graded too high. The inspector no longer writes
  to the slide while drawing it: `config(slide)` goes into a local and reaches
  `slide.exploration` only through `commit()`, from an actual edit.

  Half the original finding does not survive. It claimed edits went unmarked,
  but `editor.js` passes `touched()` in **both** callbacks, so every edit path
  already marked the document dirty. And after item 1 gated `exploration` to
  the types that read it, the render-time write was writing what `normalizeSlide`
  would write on save anyway. What was left is a render function mutating the
  document, which is worth not doing, but it was not the data-loss risk I wrote
  up. Verified: selecting a slide no longer changes it; a text edit still
  persists.

### 22 September onwards · the UX review, code audit and games

- **23 Sep 2026.** Activities wave 3 (AC-09–12, AC-16).
  - A stage label may declare its job (`[send]`). Each send stage has its
    own idea box, and up to three spotlights stand on a slide, each named
    for its stage.
  - A phone keeps a private note per note stage.
  - Seven activities moved onto the kit: Ground Rules, the Connection Hunt,
    Scenario Analysis, the Learning Log, PMI, Visual Summary, and Preview
    (a prediction box). Hook & Predict keeps its picture and collects
    wonders.
  - Every activity declares its rooms, shown as badges.
  - 519/519; `room-output` smoke adds PMI.
- **23 Sep 2026.** Six square pegs fixed, where games were fitted into
  generic pieces:
  - Question Cube's verdict words;
  - Heads Up clue-givers see the term (the guesser never does);
  - Predict's bet is placed with the pick, plus a private why;
  - Odd One Out's phones defend a pick;
  - Chain and Connection proposals are shaped like links and grow on the
    slide;
  - Time Traveler's phone draws the timeline.

  518/518. Not viewed.
- **23 Sep 2026.** Activities wave 2 (AC-06–08, closing TPS-01 and TPS-02).
  A desk block beside the notes spotlights or hides any idea. The
  spotlight goes on the wall without a name and stays for the slide. A
  note stage's phones report only that they have written ("1 of 2 have
  written something"). The desk closes an authored prompt, and the two
  self-assessments are held until Show results. 513/513; a new
  `room-output` smoke drives a host and two phones.
- **23 Sep 2026.** GA-26: Compare & Contrast is a sort (a new `sort` input).
  Statements go into A only, Both or B only; the reveal names the one most
  misfiled. Seen on screen. 513/513.
- **23 Sep 2026.** The activities audit is written
  ([activities-premium-audit.md](activities-premium-audit.md)) and waves 0–1
  are done (AC-01–05). Timed moments keep one clock that the desk drives.
  The desk shows the live stage. Ten routines run as stages, with a pinned
  brief, a work job and group talk. 508/508; activity smoke passes.
- **23 Sep 2026.** GA-27 (most of it): Beat the Clock is one round. The
  questions flow as the room answers, speed is scored per question, and
  "Time!" shows the room's total. Stale playbook overrides removed. 503/503.
- **23 Sep 2026.** GA-25 is done: Spin & Explain's wheel spins and lands
  before the concept. Compare & Contrast phones send points through the idea
  box (an interim for GA-26). Entrance animations run in the show only.
  501/501.
- **23 Sep 2026.** Question Cube is a real roll: six faces on the Random
  Challenge engine, with face colours and "N faces left". Nine stale setup
  lines are refreshed. 501/501.
- **23 Sep 2026.** GA-21: every wall game control is on the desk through
  `data-desk` (Boss, race lanes, Definition Ask). GA-22 in part: Emoji's
  hint is the last released step, not the heading. 500/500.
- **23 Sep 2026.** GA-23: Ranking's reveal orders the rows (they used to
  stay shuffled and muted), shows the slot heat and names the commonest
  swap. 500/500.
- **23 Sep 2026.** GA-20: Time Traveler places events on one growing
  timeline (the slider engine on a year scale). Old typed games heal.
  500/500.
- **23 Sep 2026.** GA-18: the proposal queue. Concept Chain and Connection
  Maker take proposals from phones (anonymous on the wall, named on the
  desk). Use this credits the author. GA-19 is partly done. 499/499.
- **23 Sep 2026.** GA-11: Fill the gaps. There is a new `fill` style and
  input: passage [gaps], a word bank with lures, a per-gap reveal and
  partial marks. Teacher entry works by key. A rejoining Ranking answer is
  echoed correctly now. 498/498.
- **23 Sep 2026.** GA-13: Predict the Outcome commits, locks (with the
  room's split showing), watches, then reveals; confidence weighs the score.
  493/493.
- **23 Sep 2026.** GA-14: True/False Showdown is hold-or-fold. The room's
  split shows on Next (or half-time); each phone may switch once; the reveal
  shows before against after and the switch count. 492/492.
- **23 Sep 2026.** GA-12: Odd One Out is a vote. Phones tap their pick; the
  split is held, then drawn as heat on the tiles with a line inviting the
  next pick to defend its rule. Votes are `unmarked`, so they never touch
  accuracy. 490/490.
- **23 Sep 2026.** Wave 2: GA-09 (the draw) and GA-10 (the round clock) are
  done, and GA-25 in part. Random Challenge is a deck; Heads Up is a timed
  round that auto-advances and ends on "Time!". The audit's claim that Spin &
  Explain played in authored order is corrected. 489/489.
- **23 Sep 2026.** GA-30: an accepted spoken answer is worth one quiz
  question to the speaker's team (`SPOKEN_POINTS` 1,000; with a hint, 500),
  so it registers beside quiz averages in one lesson's standings. The +1/+2
  copy is updated in the catalogue, the editor and the playbook. 488/488.
- **23 Sep 2026.** GA-29: a UX pass on wave 1. There is one verdict path
  (wall pads included). A scoring verdict is held until the speaker is
  chosen. The speaker is cleared per item, except in Heads Up. The dropdown
  is replaced by team buttons, recent-speaker chips, type-ahead and Pick for
  me. The credit shows on the wall and phones without naming other students.
  Spot entry uses one shared passage. `npm test` 488/488. GA-30 opened (spoken
  points scale).
- **23 Sep 2026.** GA-06–08 (wave 1) completed. Spoken verdicts now
  credit a selected team only; individual play counts accepted explanations
  unless the teacher explicitly enables scoring. Spoken phones receive a
  listen/watch card, and every game style declares phone, team, teacher-entry
  and solo support shown in the format library. The room contract has a test.
  `npm test`: 487/487 passing; the live server was restarted.
- **23 Sep 2026.** GA-01–05 (wave 0) completed. Word Reveal scores each
  answer at its relay timestamp; Bowl's target is a game setting with legacy
  saves migrated; Studio reads the model's single preset bank. Teacher entry
  now records Ranking permutations and Spot word taps, and rejected entries
  show a row-level reason. `npm test`: 484/484 passing. The local server was
  restarted after its relay changed.
- **22 Sep 2026.** Backlog created from the [UX deep dive](ux-deep-dive.md).
  UX-01 to UX-04 were reproduced in the browser. UX-05 and UX-06 were seen
  once and not traced.
- **22 Sep 2026.** Code audit added (CA-01 to CA-54): three parallel read-only
  reviews. I re-checked CA-01, CA-10, CA-20, CA-30, CA-40 and CA-41 in the
  code myself. `npm test` 457/457 passes; none of these is under test.
