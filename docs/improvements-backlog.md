# Improvements backlog

Consolidated from a review session on 13 September 2026: a code review of
`84d7527`, a measured mobile audit at 375×812, and a live learner walkthrough
of the LDSCI6253 deck joined from a phone.

Every "verified" note below means it was measured or read in the code, not
inferred. Where a claim was later corrected, the correction is recorded rather
than the original quietly edited — the wrong version is usually the more
instructive one.

**Working order:** 1 → 6 → 12, then the rest. Items 8, 10 and 11 touch the
learner and live files another agent has been working in, so they want
coordinating rather than starting cold.

---

## Status

| # | Item | Effort | Status |
|---|------|--------|--------|
| 1 | Present button clipped 17px at 375px | S | **Done** — `18899f7` |
| 2 | 27 HUD buttons at 36×36, under the 44px touch floor | S | To do |
| 3 | Before/after drag posts full presenter state per pointermove | S | **Done** — 60 commands → 1 sync |
| 4 | Inspector mutates the slide mid-render without marking dirty | M | To do |
| 5 | `explorationValue` re-normalises per call, 101× per graph | S | **Done** — 1.8× on the curve |
| 6 | Blank the phones from the HUD | S–M | **Done** — `Shift+B` / room menu |
| 7 | Gate ✋ and ? to junction points | S | To do |
| 8 | Learner theming — deck theme has no route to the phone | M | Deferred · shared files |
| 9 | Progress + persistent score on the phone | S | To do |
| 10 | Lesson-level standings, teacher-controlled | M | Deferred · shared files |
| 11 | Coda — exit ticket penultimate, wrap last | M–L | Deferred · needs a privacy decision |
| 12 | Visual baselines for slide layouts | M | **Done** — 45 added, 213 total |
| 13 | No git remote — commits are local only | S | Blocked · needs the repo URL |

### Open decisions — not mine to make

| # | Question |
|---|----------|
| 14 | Click-to-go-back? Right-click or shift-click for `prev` |
| 15 | Quiz timer: 20s runs on the learner's device; a slow look-up loses the question |
| 16 | Keywords dim fades term and definition together; term-stays-bright is a different rule |
| 17 | Anscombe plot styling — plain, or matched to a textbook's rendering |

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

### 2. HUD tap targets

27 buttons at 36×36 against a 44px floor. This is the bar you thumb mid-lecture.
Interacts with item 1: making these bigger makes the narrow topbar taller still.

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
