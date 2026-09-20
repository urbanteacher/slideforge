# The work areas exist; the studios do not use them

Each studio is two layers: an engine layer under `src/`, and a studio UI in
`js/`. The engine layers are already the scalable thing — one module per kind,
assembled by a registry, so adding a kind is a file and a line. The studio UIs
are one large file each, and they answer questions about a kind by **listing
its name** rather than by asking it.

That is the whole finding. Nothing needs inventing; three registries already
exist and two of the three studio UIs route around them.

## The two layers, measured

| Studio | Engine layer | Kinds | A kind declares | Studio UI | Branches on kind |
| --- | --- | ---: | ---: | --- | ---: |
| Lesson | `src/render/` — 13 modules | 37 types | `TYPES`, `LAYOUTS`, `FREE_KINDS` | `js/editor.js` 4,417 | inspector band, 2,352 lines |
| Quiz | `src/games/` — 27 modules | 24 styles | 15 members | `js/games.js` 2,192 | **31** |
| Activities | `src/activities/` — 4 modules | 54 recipes | 5 targets | `js/activities.js` 1,139 | **12** |

Adding a **game** today is a new module and one line in `GAME_STYLES`. That is
a scalable work area and it is already built: 21 style modules, plus registry,
catalogue, factories, presets, marking and scoring.

Adding a **slide type** is an entry in `TYPES` and a layout function.

Adding an **activity** is an entry in a 806-line catalogue — which is
appropriate, because an activity has no behaviour. Its own header says so:
*"Data, not behaviour. Choosing an entry says which of five things to make."*
An activity is a recipe naming a `layout` the Lesson studio owns or a `style`
the Quiz studio owns. Activities is the only studio that owns no primitives.

## What a game style already declares

```
defaults, key, label, icon, blurb, mechanic, input,
minOptions, maxOptions, fixedOptions,
make, normalize, problems, compile, mark, summary
```

Sixteen members on `headsup`; twenty across all 24 styles once the optional
ones are counted — `board`, `boardEngine`, `describe` and `starters` appear
where a style needs them. So the contract already grows a member when a style
needs one to answer for itself, which is exactly the move below.

And then `js/games.js`:

```js
function showsQuestionField() {
  if (['headsup', 'spinexplain', 'connection', 'randomchallenge'].indexOf(game.style) !== -1) return false;
  if (game.style === 'definition' || game.style === 'emoji' || game.style === 'oddone' ||
      game.style === 'compare' || game.style === 'conceptchain') return false;
  return !isBoard() || SF.gameStyle(game.style).boardEngine.showsQuestion;
}
```

**The last line asks the style. The two above it name nine styles to answer
the same question.** Both forms are in one nine-line function, and the correct
one is already written.

That is the shape of all 31 branches: a question about a kind, answered by
enumerating kinds, in a file that already has a registry to ask.

## Why this is the same bug twice already fixed

This repo has met it before and the fix held both times.

**`FREE_KINDS`, this week.** Whether a block could be typed into, resized or
copied was inferred at four call sites by three mechanisms — a round-trip
string comparison, a key prefix, and the presence of a `draw` function
standing in for "not prose". Each of a week's canvas bugs was one of those
inferences being wrong. The kinds declare `edits`, `resizes` and `duplicates`
now and the call sites ask. See docs/block-capabilities.md.

**`spec.draw`.** Two places read a rendering property to mean "not editable",
and were right for seven kinds out of eight by luck — `quote` draws its own
markup and is still typed into where it sits.

`showsQuestionField` is the third instance, in a different studio.

## What to do, in order

1. **Move the question onto the kind.** `showsQuestionField` becomes
   `SF.gameStyle(style).showsQuestion`, one more optional member beside
   `board`, `boardEngine`, `describe` and `starters`. Then the nine names disappear and a twenty-fifth style answers for
   itself instead of being forgotten. Repeat for the other 30 branches; they
   will not all be one member, and the census below is how to group them.

2. **Give activities a target registry.** Five targets — `slide`, `game`,
   `feedback`, `moment`, `slide-arc` — are branched on twelve times across
   `js/activities.js`, for what to build, what tag to show, and what to filter
   by. `src/games/registry.js` is the pattern to copy: one module per target
   declaring its label, its tag and its `build(activity, ctx)`, assembled into
   a registry the UI asks. A sixth target then costs a file, not a hunt.

3. **Only then split the studio UIs.** `js/editor.js`'s inspector band is
   2,352 lines and `js/games.js` is 2,192, and both are worth splitting — but
   splitting a file that enumerates kinds just distributes the enumeration.
   Ask first, split second.

## Method

Count the branches:

```bash
grep -c "style === '" js/games.js          # 31
grep -c "\.target ===\|\.target !==" js/activities.js   # 12
```

List what a kind already declares, so a new member has somewhere obvious to go:

```bash
node -e "…load js/model.js…; console.log(Object.keys(SF.GAME_STYLES.headsup))"
```

A branch is a candidate for moving onto the kind when it asks a question the
kind could answer about itself. A branch that asks about the *document* — how
many questions this game has, whether this deck is live — is not, and should
stay in the UI.

## Change log

- **2026-09-21** — Written. Measurement only; nothing moved. Established that
  all three engine layers are already registries, that `js/games.js` branches
  on style 31 times and `js/activities.js` on target 12, and that
  `showsQuestionField` contains both the enumerating form and the asking form
  in the same function. Member count corrected from fifteen to sixteen after
  reading them off the built bundle rather than off the registry's export —
  `defaults` is declared per style and was missed.
