# UX backlog — everything we need

This backlog comes from the [UX deep dive](ux-deep-dive.md) of 22 September 2026,
which compared SlideForge against Google Slides, Figma Slides, Pitch, Gamma,
Slidev, reveal.js and the classroom tools. It is kept apart from
[improvements-backlog.md](improvements-backlog.md), which covers the learner
and live-room audit of 13 September. Where an item here overlaps that file, it
links to it.

**Effort:** S = under half a day · M = one or two days · L = most of a week or more
**Priority:** P0 fix now · P1 next · P2 worth doing · P3 when there is room

**Working order:** start with the **code-audit P0 items** (CA-01 to CA-05, at
the end of this file), because they lose work without saying so. Then do all of
Phase 1, then UX-10 and UX-11 (the command palette and the shortcut sheet). Removing duplicate buttons (UX-20 to UX-23) is safe
only once the palette exists, because the palette is how people still reach
what was removed.

---

## Status

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
| UX-12 | Use one word for the right-hand panel everywhere | P2 | S | Partly done · render hints now say "Design & content" |
| **Phase 3 — fewer controls** |||||
| UX-20 | Move the panel's 6 slide actions into a right-click menu | P1 | M | **Done** 23 Sep · 4 moved; Undo/Redo stay |
| UX-21 | One **Present ▾** split button instead of four | P1 | S | **Done** 23 Sep · Host live stays separate |
| UX-22 | One route to deck settings, not three | P2 | S | To do |
| UX-23 | One route to insert things, not four | P2 | M | To do |
| UX-24 | Say where the work is saved in words, not with a dot | P1 | S | **Done** 23 Sep · words down to 1080px (measured), a labelled dot below |
| **Phase 4 — editing on the slide** |||||
| UX-30 | Outline editable blocks on hover | P2 | S | To do |
| UX-31 | Make it clear the panel field and the slide are one text | P3 | S | To do |
| **Phase 5 — deck structure** |||||
| UX-40 | Sections in the rail and the sorter | P2 | M–L | To do |
| **Phase 6 — presenting** |||||
| UX-50 | Type a number and press Enter to jump | P2 | S | To do |
| UX-51 | `O` overview grid while presenting | P2 | M | To do |
| UX-52 | Pacing timer in the presenter view | P2 | S–M | To do |
| UX-53 | `W` for a white screen | P3 | S | **Clash** · `W` is already "Who answered what"; pick another key |
| **Phase 7 — the room** |||||
| UX-60 | Hide the answer bars until the reveal | P1 | M | **Done** 23 Sep · a game setting; one line in live.js |
| UX-61 | Lock all phones, now or on a countdown | P2 | M | To do · shared files |
| UX-62 | Show the teacher who has left the tab | P2 | M | To do · shared files |
| UX-63 | Lobby before the start, with optional generated nicknames | P3 | M | Needs a decision |
| UX-64 | Student-paced mode with its own code | P2 | L | Needs a decision |
| UX-65 | Per-student takeaway: the slides plus that student's answers | P3 | M–L | Needs a decision |
| **Phase 8 — accessibility** |||||
| UX-70 | Give icon-only controls an `aria-label`, not just a `title` | P1 | S–M | **Done** 23 Sep |
| UX-71 | Raise type under 12px in the editor | P2 | S–M | To do |
| UX-72 | Keyboard-only pass through every modal and panel | P2 | M | To do |

### Open decisions — not mine to make

1. **UX-64 student-paced mode.** Does SlideForge support homework or
   self-study at all? The README says "the room is the point", and a
   student-paced mode takes that further than a teacher-run room. Before
   building it we need to know whether sessions persist. The README warns
   that hosted sessions do not survive a deploy.
2. **UX-63 nicknames.** Is showing real names ever a problem for the classes
   this is used with? This is the same privacy question as
   [improvements-backlog #11](improvements-backlog.md).
3. **UX-65 takeaways.** A takeaway stores one student's answers alongside the
   deck. Where does it live, and for how long?
4. ~~**UX-04 numbering.**~~ Settled by a rule already in `js/render.js`: "the
   room's count is the true one". Revisit only if you want rail numbers and
   slide numbers to be the same thing.

---

## The items

### Phase 1 — bugs

#### UX-01. Escape discards text typed on the slide — P0 · S

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

#### UX-02. Modals ignore Escape, have no focus trap and no dialog role — P0 · S–M

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

#### UX-03. The editor hint reaches the projector — P0 · S

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

#### UX-04. Rail and show number slides differently — P1 · S–M

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

#### UX-05. Empty edit + Escape adds an Undo step that does nothing — P1 · S · to confirm

After clicking into a heading and pressing Escape without changing anything,
Undo lit up. Suspected cause: `onCancel: function () { touched(); repaint(); }`
in `js/editor.js:439`. Not traced yet.

- **Change:** `touched()` runs only when the text actually changed. With UX-01
  this becomes: save only if the text is different.
- **Done when:** clicking into a block and out again with no change leaves the
  Undo stack as it was.

#### UX-06. Clicking the fading HUD advances the slide — P1 · S · to confirm

I clicked **⋯** on the HUD as it faded; the slide advanced instead of the menu
opening. Probably the HUD became `pointer-events: none` before its opacity
reached zero, so the click went to the slide.

- **Change:** the HUD keeps taking clicks until it has fully faded, or clicks
  on the HUD's area never count as "next".
- **Done when:** a Playwright test clicks ⋯ at several points in the fade and
  never advances the slide.

### Phase 2 — finding commands

#### UX-10. Command palette (⌘K) — P1 · M

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

#### UX-11. `?` shortcut sheet — P1 · S

Pressing `?` in the show does nothing; shortcuts appear only in tooltips
(S, V, Z, I, B, D, Esc, Shift+B).

- **Change:** `?` opens a sheet with every shortcut, in the editor and in the
  show, built from the same registry as UX-10.
- **Done when:** the sheet lists every shortcut the key handlers actually bind.
  A test compares the sheet against the handlers.

#### UX-12. Use one word for the right-hand panel — P2 · S

The UI calls it *Design & content*; the render hint and some tooltips call it
*the inspector*. Pick one word and use it everywhere.

### Phase 3 — fewer controls

About 30 controls sit around the slide before you touch it. Google and Figma
show a third as many. Start this phase only after UX-10.

#### UX-20. Move the panel's 6 slide actions into a right-click menu — P1 · M

Undo, Redo, Copy, Paste, Duplicate and Delete sit at the top of the right
panel. They already have shortcuts, and they act on the whole slide, not on
the content being edited.

- **Change:** a right-click menu on rail thumbnails and on the canvas, plus the
  palette. The panel keeps Theme, Review, Artwork, Arrange and Header & footer,
  or moves those into the Look sub-tab.
- **Done when:** the panel's top row is gone, and every one of its actions can
  still be reached by right-click, by shortcut and from the palette.

#### UX-21. One Present ▾ split button — P1 · S

The header has four ways to start a show: Teacher Presenter, Rehearse, Host live
and Present.

- **Change:** Present is the main button; the arrow opens Presenter view,
  Rehearse with a sample class and Host live. Host live may deserve to stay
  its own button, because the room is the product. Decide when building it.

#### UX-22. One route to deck settings — P2 · S

The header's Settings, the rail's ⚙ and the panel's Theme all open the same
settings. Keep one button (the header) and one palette entry.

#### UX-23. One route to insert things — P2 · M

There are four insert buttons in two places, and each opens a modal:
`+ Slide`, `+ Activity`, `+ Add activity` and `+ Item`.

- **Change:** one **Insert** control per place, following Google's March 2025
  insert sidebar and Figma's bottom toolbar. It could be a panel that stays
  open, with tabs for Slides, Activities and Items.

#### UX-24. Say where the work is saved — P1 · S

The README says the header should read **Saved in this browser**. On screen it
is a small dot next to the Library chip. Show the words, and link them to
Export as the README describes.

### Phase 4 — editing on the slide

#### UX-30. Outline editable blocks on hover — P2 · S

`.canvas-editable` has a `title` tooltip but nothing visible, so you can't see
that a block can be edited until you click it. Draw a thin outline on hover, as
Google and Figma do.

#### UX-31. One text, two places to edit it — P3 · S

The words can be edited on the slide or in the panel field. Keep both, but make
it clear they are the same text, for example by highlighting the panel field
while the slide is being edited.

### Phase 5 — deck structure

#### UX-40. Sections in the rail and the sorter — P2 · M–L

The demo deck has 97 slides, and lectures run to 70. Figma's grid rows,
Keynote and PowerPoint all offer sections. Section-break slides already exist;
the rail could group and fold slides under them.

- **Needs:** a model field (possibly none: sections could be derived from
  section-break slides), folding in the rail, section headers in the sorter,
  and moving a whole section at once.

### Phase 6 — presenting

- **UX-50. Number + Enter to jump — P2 · S.** Google and reveal.js both do
  this. Depends on UX-04.
- **UX-51. `O` overview grid while presenting — P2 · M.** reveal.js and Slidev.
  Reuse the sorter's grid, read-only, and click a slide to jump to it.
- **UX-52. Pacing timer — P2 · S–M.** In the presenter pop-out: time elapsed
  and time left, and optionally a colour for whether you are ahead or behind
  (reveal.js).
- **UX-53. `W` for a white screen — P3 · S.** Google has it. `B` already blanks
  the screen to black.

### Phase 7 — the room

Items UX-60 to UX-62 touch `js/live.js` and `server/server.js`. Coordinate them
with whoever is working there, as
[improvements-backlog](improvements-backlog.md) items 8, 10 and 11 already do.

- **UX-60. Hide the answer bars until the reveal — P1 · M.** `Live.revealed`
  already controls whether the correct answer is marked. Add a setting for each
  question, *results: live / on reveal*, so the room doesn't just follow the
  majority. Figma's alignment scale and Mentimeter's "responses on click" do
  this.
- **UX-61. Lock all phones — P2 · M.** Lock now, or lock on a countdown (Pear
  Deck). Builds on Shift+B blank phones
  ([improvements-backlog #6](improvements-backlog.md)).
- **UX-62. Show who has left the tab — P2 · M.** Nearpod's red dot. Phones
  report a `visibilitychange` event, and the teacher's room view shows it.
- **UX-63. Lobby and nicknames — P3 · M.** Needs a decision.
- **UX-64. Student-paced mode — P2 · L.** Needs a decision.
- **UX-65. Per-student takeaway — P3 · M–L.** Needs a decision. "My saved
  slides" on the join page is halfway there.

### Phase 8 — accessibility

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

## Not doing

These conflict with the README's rule, "typed layouts, not a freeform canvas",
or are a product in their own right:

- A Figma-style freeform design mode
- `.pptx` import and export in both directions
- Gamma-style cards whose layout reflows to fit the screen
- Several people editing the same deck at once

## Code audit — 22 September 2026

Three read-only reviews, running in parallel, covered:
- the canvas editing layer (arrange, artwork, inline edit)
- the canvas rendering core (lattice, regions, compositions, render.js)
- the rail, storage and undo

`npm test` passed: 457 of 457. **None of the findings below is covered by a test.**

- **Confirmed:** traced through the code end to end.
- **Plausible:** likely, but depends on how a browser behaves at runtime.
- ✓ marks the items I re-read in the code myself after the reviews.

### Status

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
| CA-23 | The composition slot tables use keys that never match a block (`cp-heading`, `cp-prompt` and others) | lattice × compositions | P2 | S | Confirmed |
| CA-24 | Regions bring back the accent bar that compositions hide (`.pad >` selector) | lattice × CSS | P2 | S | Confirmed |
| CA-25 | Artwork drags at the wrong speed on 4:3 and 16:10 decks (scale is taken from the box, not `.slide`) | artwork | P1 | S | **Done** 23 Sep · measured: 0.75× on 4:3 |
| CA-26 | Undo or redo closes Layout and Artwork (slides are compared by object, not by id) | arrange | P2 | S | Confirmed |
| CA-27 | A resize drag can be left running (no blur or cancel handling, unlike move) | arrange | P2 | S | Plausible |
| CA-28 | Fit badges and the text-size fitter measure before web fonts load | fit-check | P2 | S | Plausible |
| **Editor text on the projector** (widens UX-03) ||||||
| CA-30 | `infoEmpty` shows "Add … in the inspector" on 8 layouts; there are also image, video and URL prompts, the "needs http(s)" warning, and empty free-block labels | render | P0 | S | **Done** 23 Sep |
| **Keyboard** ||||||
| CA-40 | ⌘B, ⌘I and ⌘U do nothing when typing on the slide (the key is blocked and nothing is applied) | inline edit | P1 | S | **Done** 23 Sep |
| CA-41 | Enter that confirms an IME candidate ends the edit (no `isComposing` check) | inline edit | P1 | S | **Done** 23 Sep · not browser-tested |
| CA-42 | In the sorter, Alt+→ moves a multi-slide group only once | rail | P2 | S | Confirmed |
| CA-43 | The Undo button still works while a slide is being carried; placing then uses an out-of-date index | rail | P3 | S | Plausible |
| CA-55 | **New:** one keystroke on the canvas flattened a multi-line heading to one line | inline edit | P1 | S | "+D+" |
| **Smaller** ||||||
| CA-50 | Opening a deck that another tab has just deleted crashes (`setDoc(null)`) | shell | P2 | S | **Done** 23 Sep · with CA-06 |
| CA-51 | Resizing the window (including the Android keyboard opening) redraws mid-edit and loses panel fields that save on `onchange` | shell | P2 | S | Plausible |
| CA-52 | The fallback edit panel writes into the slide with no history and survives slide changes and undo | inline edit | P2 | M | Confirmed |
| CA-53 | `wordSpeed: "constructor"` writes `undefinedms` into CSS (the lookup doesn't use `hasOwnProperty`) | words | P3 | S | Confirmed |
| CA-54 | `pic.src`, `deck.logo` and CSS `url()` values skip `safeMedia` (hygiene, not an exploit) | render | P3 | S | Confirmed |

**Checked and clean:**
- No XSS: `safeHref` blocks `javascript:`, text goes in through `textContent`, and `innerHTML` only ever writes static strings.
- No listener or `ResizeObserver` leaks from rendering.
- Malformed clipboard pastes are guarded.
- A deck can never become empty.
- Undo clamps the selection.
- `SF.jumpToSlide` finds slides by id, so the numbering mismatch in UX-04 does not affect it.

### Notes on the items

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

## 23 September 2026: the P0 pass

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

## 23 September 2026: the P1 pass, part one

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

## 23 September 2026: the P1 pass, part two

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

## 23 September 2026: P1 completed

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

## Log

- **22 Sep 2026.** Backlog created from the [UX deep dive](ux-deep-dive.md).
  UX-01 to UX-04 were reproduced in the browser. UX-05 and UX-06 were seen
  once and not traced.
- **22 Sep 2026.** Code audit added (CA-01 to CA-54): three parallel read-only
  reviews. I re-checked CA-01, CA-10, CA-20, CA-30, CA-40 and CA-41 in the
  code myself. `npm test` 457/457 passes; none of these is under test.
