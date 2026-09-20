# The engines, and where they leak

The app is usually described as one thing with faces on it. Measured, it is
closer to four engines, two of which already hold a boundary, one of which
holds one and has never been named, and one of which is not an engine at all
but is nearer to being one than it looks.

This is that measurement, the method for redoing it, and the conclusion it
points at — which is the same one `docs/render-split.md` and
`docs/block-capabilities.md` arrive at from different directions.

## 0. The app already declares its engines — read this first

This document originally grouped files by what they seemed to be about and
called the groups engines. That was working from the outside in, and it missed
that **the app states its own decomposition in two places**, neither of which
is a file listing.

`index.html` carries a workspace switch and a row of run modes:

```html
<button data-go="deck">▤ Lesson studio</button>
<button data-go="game">◈ Quiz studio</button>
<button data-go="plan">◇ Activities</button>

<button data-ws="deck"      id="btnPresenter">Teacher Presenter</button>
<button data-ws="deck"      id="btnRehearse">▷ Rehearse</button>
<button data-ws="deck game" id="btnLive">◉ Host live</button>
<button data-ws="deck"      id="btnPresent">▶ Present</button>
<button data-ws="game"      id="btnPlay">▶ Present</button>
<button data-ws="plan"      id="btnPresentPlan">▶ Present</button>
```

And `js/shell.js:8` states the contract in its own words:

> An engine registers itself with `SF.Shell.register(ws)` and implements:
> `key`, `railLabel`, `notesLabel`, `doc()`, `setDoc(d)`, `blank()`,
> `newDoc()` *(optional)*, `store`, `draw()`, `onTitle(v)`, `onTheme(v)`,
> `play()`, `settings()`, `fileSuffix`

So the engine layer is not hypothetical and does not need designing. It exists,
it is documented, and **three engines implement it**: `js/editor.js` (deck),
`js/games.js` (game), `js/activities.js` (plan). Checked against the
fourteen members: game implements all fourteen, deck and plan implement
thirteen and skip `newDoc`, which the contract marks optional and only a game
needs. **All three honour it.**

The shell honours its half too: 43 calls into engines go through `active.*`,
the contract, against 11 that reach around it.

### What is missing is a contract for the run modes

| Button | Wired in | Should be |
| --- | --- | --- |
| `btnPresent` (deck) | `js/editor.js:4258` | `active.play()` |
| `btnPlay` (game) | `js/games.js:2144` | `active.play()` |
| `btnPresentPlan` (plan) | `js/activities.js:1118` | `active.play()` |
| `btnPresenter` | `js/editor.js` | a contract member |
| `btnRehearse` | `js/editor.js` | a contract member |
| `btnLive` | `js/shell.js` | already in the right place |

**The seam already exists and the buttons bypass it.** `js/shell.js:1667`
routes ⌘↵ through `active.play()` — the contract — while the three buttons
labelled ▶ Present are wired three separate times inside three engines. One
act, two routes, and the documented one is used only by the keyboard.

Teacher Presenter and Rehearse are deck-only today, which is why they sit in
`js/editor.js`; that is defensible and still leaves them as run modes living
inside an authoring engine. Host live is the only one already in the shell,
and the only one scoped to two studios.

### And one engine reaches into another

`js/shell.js` opens by saying the engines do not know about each other.
Measured:

| Engine | → shell | → other engines |
| --- | ---: | --- |
| deck | 44 | `Arrange` 13, `Player` 12, `Games` 3, `Live` 3, `Activities` 2 |
| game | 21 | `Player` 7, `Editor` 2, `Live` 1 |
| **plan** | 31 | **`Editor` 35**, `Player` 5, `Games` 1 |

`js/activities.js` calls into `SF.Editor` thirty-five times. Its own header
explains why — *"There is one lesson, and this studio writes into it"* — and
that is the right intention with no contract to carry it. Writing into the
lesson is a thing the shell could expose; reaching into another engine's
internals is not.

## 1. The argument

An engine is not a folder. It is a body of code with a boundary you can state:
what it owns, and what it reaches outside itself for. Size does not establish
one and a shared prefix does not either.

So the test used throughout this document is **calls out** — how many times a
group of files reaches into another part of the app through the flat `SF`
namespace. A low number against a large body of code is a boundary. A high
number is a body of code that happens to sit in adjacent files.

## 2. The four, measured

| Engine | Lines | Calls out | Reaches |
| --- | ---: | ---: | --- |
| Motion | 518 | **0** | — |
| Layout (geometry) | 1,615 | **2** | `SF.Custom` |
| Teacher presenter | 6,429 | **12** | `SF.Shell` 6, `SF.Explore` 6 |
| Activities | 2,735 | 90 | `SF.Editor` 35, `SF.Shell` 31, and four more |

### Motion — already an engine

`src/render/words.js` and `src/render/motion-lab.js`. 518 lines that reach
nothing at all. It is the cleanest boundary in the codebase and worth keeping
as the reference for what one looks like.

### Layout — an engine and a face, sharing a name

Two different things:

| | Lines | Calls out |
| --- | ---: | --- |
| geometry — `src/render/lattice.js`, `layout-slots.js`, `fit-check.js`, `regions.js`, `body-region.js`, `canvas-regions.js` | 1,615 | 2 |
| face — `js/arrange.js` | 1,333 | **32 into `SF.Editor`** |

The geometry is an engine. The Layout face is editor UI that operates it, and
its 32 calls into `SF.Editor` say so plainly. Filing them together because
both are "layout" is the same mistake `docs/render-split.md` §3.2 warns about
with the two unrelated things called "regions".

### Teacher presenter — an engine nobody named

| File | Lines | Reaches |
| --- | ---: | --- |
| `js/player.js` | 3,128 | `Live` 87, `Teaching` 18, `Explore` 5, `Shell` 4 |
| `js/live.js` | 2,424 | `Player` 198, `Shell` 2 |
| `js/manual.js` | 556 | nothing |
| `js/teaching.js` | 255 | `Explore` 1 |
| `js/lesson-moments.js` | 66 | nothing |

6,429 lines. The `Player`↔`Live` traffic — 285 calls — is *internal*: those two
files are the engine talking to itself, which is cohesion rather than coupling.
Everything genuinely outside it comes to **twelve calls**, six into `SF.Shell`
and six into `SF.Explore`.

**It never calls `SF.Editor` once.** That is the boundary, and it already
holds. The engine exists; it is spread across five files and four HTML
documents with no name on it.

### Activities — not an engine, and one file is why

| File | Lines | Reaches |
| --- | ---: | --- |
| `src/activities/catalogue.js` | 806 | nothing |
| `src/activities/presets.js` | 271 | nothing |
| `js/presenter-activities.js` | 245 | nothing |
| `js/live-activities.js` | 222 | `Live` 4, `Player` 3, `Activities` 3 |
| `js/activities.js` | 1,191 | **`Editor` 35, `Shell` 31**, `Player` 5, `Custom` 2 |

1,077 lines of pure data that reach nothing, two thin adapters, and one file
carrying every bit of the coupling. `js/activities.js` is the **authoring UI**
for activities — it belongs to the editor, not to an activities engine.

Read that way, activities is already the right shape: a catalogue, plus one
adapter per engine that uses it. One of those adapters is filed under the
wrong roof.

## 3. Presentation mode, in detail

Presentation is not one surface. It is four documents sharing `js/player.js`:

| Document | Lines | Carries |
| --- | ---: | --- |
| `index.html` | 548 | `#player`, `#hud`, `#cheats`, `#lobby`, `#joincard` — the show inside the app |
| `presenter.html` | 1,485 | the separate teacher window: current slide, next, notes, desk |
| `view.html` | 220 | `#player`, `#hud` — a second, read-only surface |
| `join.html` | 1,928 | what a phone in the room loads |

### The HUD

```html
index.html:322  <div class="hud" id="hud" role="toolbar" aria-label="Presentation controls">
view.html:58    <div class="hud" id="hud" role="toolbar" aria-label="Browse slides">
```

Two HUDs. Same id, same class, different documents, **different jobs** — one
drives a live show, one browses slides — and they share every rule in
`css/app.css` (18 `.hud` rules) and `css/customize.css`. Nothing is wrong with
that today, and it is the kind of arrangement that goes wrong quietly: a rule
added for the presentation toolbar lands on the browse toolbar as well, and
the only thing that would notice is somebody looking.

Driven by `js/player.js` and `js/teaching.js` (255 lines). `js/teaching.js` is
the HUD's own behaviour and reaches outside itself exactly once.

## 4. What this points at

Both leaks land in the same place:

```
layout face     → SF.Editor  32
activities UI   → SF.Editor  35
```

And `js/editor.js` is 4,417 lines, of which the `inspector` band alone is
**2,352** — larger than `js/render.js` is now after six extractions, and
internally six clusters (block inspector, deck settings, layout picker,
content pits, media fields, engagement).

So the engine picture and the file-size picture agree. The renderer was the
visible problem and has been dealt with; **the editor is the actual one**, and
splitting it by its existing bands would also give the Layout face and the
activities authoring UI somewhere correct to live, which nothing else on the
list does.

The order that follows from the measurements:

1. `js/editor.js` by band, `inspector` first — it is the largest thing in the
   app that a person still has to read whole.
2. The Layout face and the activities UI move into whatever `inspector`
   becomes, which removes 67 of the cross-engine calls by relocation rather
   than by rewriting anything.
3. Name the presenter engine. It needs no untangling — it needs a folder and
   a note saying the boundary is real, before someone adds the call into
   `SF.Editor` that breaks it.

Nothing here argues for moving motion or the layout geometry. They are done.

## 5. Method

Reproducible; do not trust the figures after the code moves.

**Calls out.** For a set of files, count `SF.<Facade>.` occurrences for each
facade, then subtract the ones the set owns — `js/arrange.js` counting
`SF.Arrange` is not reaching outside itself, and `player.js` counting
`SF.Live` is the engine talking to itself.

```bash
grep -o 'SF\.Editor\.' js/arrange.js | wc -l
```

**Whether a group is one engine or two.** Split it along the seam you suspect
and measure each half. Layout geometry against the Layout face is 2 versus 32;
that is the answer, and it took one run to get.

**Bands inside a file.** The banner comments are load-bearing:

```bash
grep -nE '^  /\* -+' js/editor.js
```

**Caveat that cost a run.** Counting `SF.x =` assignments to work out which
engine owns a name undercounts badly — names exported through a closing
`Object.assign` or returned from a factory do not match. Count traffic into
named facades instead; it needs no ownership map.

## 6. Change log

- **2026-09-21** — §0 added, and it corrects the framing of everything below
  it. The first version of this document grouped files by subject and called
  the groups engines, without noticing that `index.html` declares three
  studios and six run modes, and that `js/shell.js:8` documents a fourteen-
  member engine contract which all three studios honour. The measurements in
  §2 onwards stand and are useful, but they describe bodies of code rather
  than the engine layer the app already has. Read §0 first.
- **2026-09-21** — Every figure re-derived with `wc -l` and `grep -o | wc -l`,
  the method §5 documents. The first pass counted `split('\n').length`, which
  is one greater per file than `wc -l` and made four totals disagree with the
  commands given for reproducing them. The cross-engine counts — 32, 35, 31,
  0 — were right and are unchanged.
- **2026-09-21** — Written. Measurement only; nothing moved. Established that
  motion and the layout geometry are already engines, that the teacher
  presenter is one in all but name and never touches the editor, and that
  activities is a catalogue plus adapters with one misfiled authoring file.
  Recorded the two HUDs sharing an id across `index.html` and `view.html`.
