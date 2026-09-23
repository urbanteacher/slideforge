# Improvements backlog

Consolidated from a review session on 13 September 2026: a code review of
`84d7527`, a measured mobile audit at 375×812, and a live learner walkthrough
of the LDSCI6253 deck joined from a phone.

Every "verified" note below means it was measured or read in the code, not
inferred. Where a claim was later corrected, the correction is recorded rather
than the original quietly edited — the wrong version is usually the more
instructive one.

**Working order:** the P0 rows from the 22 Sep review first (CA-01–04, CA-10, CA-30, UX-01–03), then 1 → 6 → 12, then the rest. Items 8, 10 and 11 touch the
learner and live files another agent has been working in, so they want
coordinating rather than starting cold.

---

## Status

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
| 13 | No git remote — commits are local only | S | Blocked · needs the repo URL |
| 18 | ~~"Add image detail" does nothing~~ | — | **Retracted** · it works; my probe clicked the wrong button |
| 19 | **A host refresh destroyed the live room** | M | **Done** — 90s grace + reconnect |
| 20 | Refresh loses the presentation, the student's seat, the selected slide | M | To do — B, C, D |
| | **From the 22 Sep UX review and code audit** — detail in [ux-backlog.md](ux-backlog.md); IDs kept so the two files match | | |
| CA-01 | ~~Storage quota errors swallowed; the header still says "Saved"~~ [→](ux-backlog.md) | S | **Done** 23 Sep |
| CA-02 | ~~Two tabs on one deck overwrite each other~~ [→](ux-backlog.md) | M | **Done** 23 Sep · one unexplained failure |
| CA-03 | ~~Drag-selecting text in an added block moves the block~~ [→](ux-backlog.md) | S | **Done** 23 Sep · not browser-tested |
| CA-04 | ~~Text typed on the slide isn't saved until the edit ends~~ [→](ux-backlog.md) | S | **Done** 23 Sep |
| CA-10 | ~~Present starts on the wrong slide when a hidden slide is above the selection~~ [→](ux-backlog.md) | S | **Done** 23 Sep |
| CA-30 | ~~Editor prompts reach the projector~~ [→](ux-backlog.md) | S | **Done** 23 Sep |
| UX-01 | ~~Escape discards text typed on the slide~~ [→](ux-backlog.md) | S | **Done** 23 Sep |
| UX-02 | ~~Modals ignore Escape, no focus trap, no dialog role~~ [→](ux-backlog.md) | S–M | **Done** 23 Sep · also fixed: Delete reached the deck through Settings |
| UX-03 | ~~Editor hint on the projector (bullets)~~ [→](ux-backlog.md) | S | **Done** 23 Sep · with CA-30 |
| CA-05 | First click after typing on the slide is swallowed [→](ux-backlog.md) | S–M | Not reproduced |
| CA-55 | ~~One keystroke on the canvas flattened a multi-line heading~~ [→](ux-backlog.md) | S | **Done** 23 Sep · new |
| CA-06 | ~~Deleting the open deck in File → Open: the next keystroke writes it back~~ [→](ux-backlog.md) | S | **Done** 23 Sep |
| CA-07 | ~~A copied slide stays in localStorage for good, images included~~ [→](ux-backlog.md) | S | **Done** 23 Sep |
| CA-08 | ~~Undo keeps a whole-deck copy per keystroke (60 max)~~ [→](ux-backlog.md) | M | **Done** 23 Sep |
| CA-11 | Same game embedded twice arrives answered and revealed [→](ux-backlog.md) | S–M | To do · P1 · shared files |
| CA-20 | ~~Regions never bounds-checked~~ [→](ux-backlog.md) | S | **Done** 23 Sep · invalid values only |
| CA-21 | Composition and regions measure in different frames; blocks jump [→](ux-backlog.md) | M–L | To confirm · P1 |
| CA-22 | ~~`layout-slots.js` resolves the composition differently from the renderer~~ [→](ux-backlog.md) | S | **Done** 23 Sep |
| CA-25 | ~~Artwork drags at the wrong speed on 4:3 and 16:10 decks~~ [→](ux-backlog.md) | S | **Done** 23 Sep |
| CA-40 | ~~⌘B/I/U do nothing when typing on the slide~~ [→](ux-backlog.md) | S | **Done** 23 Sep |
| CA-41 | ~~Enter that confirms an IME candidate ends the edit~~ [→](ux-backlog.md) | S | **Done** 23 Sep |
| UX-04 | Rail and show number slides differently (98 vs 110) [→](ux-backlog.md) | S–M | To do · P1 · needs a decision |
| UX-05 | ~~Empty edit + Escape adds an Undo step that does nothing~~ [→](ux-backlog.md) | S | **Done** 23 Sep |
| UX-06 | ~~Clicking the fading HUD advances the slide~~ [→](ux-backlog.md) | S | **Done** 23 Sep |
| UX-10 | Command palette (⌘K) [→](ux-backlog.md) | M | To do · P1 |
| UX-11 | ~~`?` should open the shortcut sheet in the editor~~ [→](ux-backlog.md) | S | **Done** 23 Sep |
| UX-20 | Move the panel's 6 slide actions into a right-click menu [→](ux-backlog.md) | M | To do · P1 · after UX-10 |
| UX-21 | One Present ▾ split button instead of four [→](ux-backlog.md) | S | To do · P1 |
| UX-24 | Say "Saved in this browser" in words, not a dot [→](ux-backlog.md) | S | Partly done · a dot below 1500px |
| UX-60 | Hide the answer bars until the reveal [→](ux-backlog.md) | M | To do · P1 · shared files |
| UX-70 | `aria-label` on icon-only controls [→](ux-backlog.md) | S–M | To do · P1 |
| CA-23 | Composition slot keys never match a block [→](ux-backlog.md) | S | To do · P2 |
| CA-24 | Regions bring back the accent bar that compositions hide [→](ux-backlog.md) | S | To do · P2 |
| CA-26 | Undo or redo closes Layout and Artwork [→](ux-backlog.md) | S | To do · P2 |
| CA-27 | A resize drag can be left running [→](ux-backlog.md) | S | To confirm · P2 |
| CA-28 | Fit badges measure before web fonts load [→](ux-backlog.md) | S | To confirm · P2 |
| CA-42 | In the sorter, Alt+→ moves a group only once [→](ux-backlog.md) | S | To do · P2 |
| CA-50 | ~~Opening a deck deleted in another tab crashes~~ [→](ux-backlog.md) | S | **Done** 23 Sep |
| CA-51 | Window resize (Android keyboard) redraws mid-edit [→](ux-backlog.md) | S | To confirm · P2 |
| CA-52 | Fallback edit panel writes with no history and survives undo [→](ux-backlog.md) | M | To do · P2 |
| UX-12 | One word for the right panel ("inspector" vs "Design & content") [→](ux-backlog.md) | S | To do · P2 |
| UX-22 | One route to deck settings, not three [→](ux-backlog.md) | S | To do · P2 |
| UX-23 | One insert route, not four [→](ux-backlog.md) | M | To do · P2 |
| UX-30 | Outline editable blocks on hover [→](ux-backlog.md) | S | To do · P2 |
| UX-40 | Sections in the rail and the sorter [→](ux-backlog.md) | M–L | To do · P2 |
| UX-50 | Number + Enter to jump while presenting [→](ux-backlog.md) | S | To do · P2 · after UX-04 |
| UX-51 | `O` overview grid while presenting [→](ux-backlog.md) | M | To do · P2 |
| UX-52 | Pacing timer in the presenter view [→](ux-backlog.md) | S–M | To do · P2 |
| UX-61 | Lock all phones, now or on a countdown [→](ux-backlog.md) | M | To do · P2 · shared files |
| UX-62 | Show the teacher who has left the tab [→](ux-backlog.md) | M | To do · P2 · shared files |
| UX-64 | Student-paced mode with its own code [→](ux-backlog.md) | L | Needs a decision · P2 |
| UX-71 | Raise editor type under 12px [→](ux-backlog.md) | S–M | To do · P2 |
| UX-72 | Keyboard-only pass (after UX-02) [→](ux-backlog.md) | M | To do · P2 |
| CA-43 | Undo button works while a slide is being carried [→](ux-backlog.md) | S | To confirm · P3 |
| CA-53 | `wordSpeed: "constructor"` writes `undefinedms` into CSS [→](ux-backlog.md) | S | To do · P3 |
| CA-54 | `pic.src`, `deck.logo` and CSS `url()` skip `safeMedia` [→](ux-backlog.md) | S | To do · P3 |
| UX-31 | Show that the panel field and the slide are one text [→](ux-backlog.md) | S | To do · P3 |
| UX-53 | White screen — not `W`, which is "Who answered what" [→](ux-backlog.md) | S | To do · P3 |
| UX-63 | Lobby with optional generated nicknames [→](ux-backlog.md) | M | Needs a decision · P3 |
| UX-65 | Per-student takeaway [→](ux-backlog.md) | M–L | Needs a decision · P3 |

### Open decisions — not mine to make

| # | Question |
|---|----------|
| 14 | Click-to-go-back? Right-click or shift-click for `prev` |
| 15 | Quiz timer: 20s runs on the learner's device; a slow look-up loses the question |
| 16 | Keywords dim fades term and definition together; term-stays-bright is a different rule |
| 17 | Anscombe plot styling — plain, or matched to a textbook's rendering |
| UX-04 | Slide numbering: the authored slide (game steps as `78.3`) or the show step? Recommend the authored slide |
| UX-64 | Student-paced (homework) mode at all? Depends on sessions surviving a deploy |
| UX-63 | Real names in the room — is that ever a problem? Same question as #11 |
| UX-65 | Takeaways store one student's answers — where, and for how long? |
| CA-21 | One owner per slide for placement: do regions turn off the composition body, or do compositions declare lattice slots? Decide before adding compositions |

---

## The items

### 1. Present button clipped — **done, `18899f7`**

`.topbar` already wrapped; `.header-actions` in `studio.css` did not. At 375px
that row wanted 383px in 357px of space and ran off the edge, taking Present
with it. Now wraps rather than shrinks, because the labels are translatable.

Verifying it turned up the same defect one element over: the File menu is 205px
anchored left of a button two thirds across, so it ran to 400px and clipped
every item. Anchored right below 800px.

Costs 375px a taller topbar — five rows, 218px, Present alone on the last. Not
clipped, but tall. Tightening it means shrinking buttons, which trades against
item 2, so it waits on that decision.

### 2. HUD tap targets — **the finding was mostly wrong**

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

### 3–5. Exploration code, from the review of `84d7527`

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

### 6. Blank the phones

`toggleBlank` only toggles a class on the projector root. `join.html` has no
concept of blank or frozen — the only "blank" in it is the *Fill the blanks*
game label. Freeze is the same story: it stops wall navigation, not phones.

Under-scoped at first as "a broadcast flag and an overlay". A phone rejoining
mid-blank has to arrive blanked, so it is **room state on the server**, the same
shape as `room.reactions`. Name it **Blank phones** in the HUD: `B` already
means blank and teachers will assume it covers both.

### 7. Gate ✋ and ?

Corrected during the discussion: these are **not** ungated. `server.js` caps
each player at five open questions, and dismissed ones are not counted against
them. Pace signals have their own handling. What is missing is *junction*
gating — open the channel when the deck is at a check-in, not continuously
through explanation. Reactions already have both a host toggle (`room.reactions`)
and a per-slide `acknowledged` guard; that is the pattern to copy.

If the rule is "only when invited", **Got it** should be gated the same way.
The ♡ bookmark can stay always-on unless it turns into fidget chrome.

### 9. Progress and score on the phone

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

### 11. Coda

Not a missing feature — a **wrong sequence**. `finalScores` appends a results
slide *after* the last authored slide. The intended shape is exit ticket
penultimate, personal wrap last.

Open design question, unresolved: the wrap on the final slide competes with the
teacher's closing words, and twenty-four phones lighting up at once is a social
event whether or not that was intended. The alternative is to let the wall carry
the ending and have the personal wrap waiting in **My saved slides**, which
already persists under `slideforge.saved.*`. Blocked on a privacy decision:
names, anonymised, or place-only.

### 12. Visual baselines for slide layouts

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

## Log

**22 Sep 2026.** Added 59 rows from the UX review against Google Slides, Figma and the GitHub tools, and from a three-part read-only code audit (canvas editing, canvas rendering, rail/storage/undo). The detail lives in [ux-backlog.md](ux-backlog.md). `npm test` passes 457/457, and none of the new items is under test.

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

### 18. "Add image detail" — **retracted, there was no bug**

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

### 19. A host refresh destroyed the live room — **done**

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

### 20. Refresh recovery — B, C and D fixed

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
