# What a block can have done to it

A block's capabilities are decided in four places by three different
mechanisms, and none of them is the block's own declaration. This is a scope
for collapsing them into one, and an argument for why that is the next
structural move rather than the `js/render.js` split.

## The argument

Three of this week's canvas bugs were the same bug wearing different clothes.

Corner handles never appeared on an item with words in it, because
`editCanvasBlock` returned into the inline editor before it reached the
selection — so the only items you could resize were the empty ones. Deleting
had four implementations that disagreed about what an item leaves behind, and
the Delete key deleted the whole slide out from under a selected picture.
Duplicate and Remove were gated by two separate copies of the same
`key.indexOf('blocks.') === 0` test.

Each was fixed where it was found. None of them had to exist. They exist
because "can this be edited", "can this be resized", "can this be deleted"
are questions the code answers by inference at four different call sites,
rather than questions a block answers about itself.

## Current state

### Where capability is decided

| Site | Question | Mechanism |
| --- | --- | --- |
| `inlineEditable()` — js/customize.js:328 | can these words be typed into on the canvas | **inference**: renders, then compares `node.textContent` to `storedText()` and calls it editable if they round-trip |
| `SF.canRemoveBlock` / `SF.canDeleteBlock` — js/render.js | can this come off the slide | key prefix `blocks.` |
| `isFree` / `immovable()` — js/arrange.js | can this be duplicated, can it be pushed aside | key prefix `blocks.` again |
| `spec.draw` presence — js/render.js:813, js/editor.js:1279,1286 | is this a drawing rather than prose | **property presence**: having a `draw` function means no Size field and a taller rail box |

Three mechanisms: a heuristic, a string prefix, and the presence of an
unrelated property. The only one that reads as a declaration is the last, and
it declares something else.

The `data-block-kind` attribute looks like the missing declaration and is not.
Its comment says a drawing kind "takes itself out of the text-editing path by
saying so", but nothing reads it for that — the only consumer is
css/lattice.css:244, which uses it to make the block fill its cell. What
actually keeps a chart out of the text editor is `inlineEditable`'s
comparison failing, because a chart's rendered text is not its TSV. The
intent is real and the implementation is accidental.

### What each kind actually does, measured

Driven through the canvas, one block per kind, clicked once:

| kind | has `draw` | typed inline | hands to a rail field |
| --- | --- | --- | --- |
| heading | no | yes | — |
| text | no | yes | — |
| note | no | yes | — |
| quote | **yes** | **yes** | — |
| bullets | yes | no | yes |
| pairs | yes | no | yes |
| chart | yes | no | yes |
| image | yes | no | — (picture picker) |

`quote` is the counterexample that matters: it has a `draw` function and is
still typed into on the canvas. So `spec.draw` was never a proxy for
editability, and the two places that use it as one — js/editor.js:1279 and
1286, for the Size field and the rail box — are gating on the wrong property
and getting the right answer for seven kinds out of eight by luck.

All eight get corner handles, which is correct and already uniform.

### What FREE_KINDS declares now

```js
heading: { tag, cls, label, rows, cols, size }
bullets: { tag, cls, label, rows, cols, hint, draw }
```

Eight kinds. `rows`/`cols` are the corpus-measured default footprint, `draw`
is how it renders, `tag`/`cls` how it is marked up. Nothing about what can be
done to it.

### The matrix, as it actually behaves

| | free item | layout block | picture |
| --- | --- | --- | --- |
| type into on canvas | if the text round-trips | if the text round-trips | no |
| resize | corner handles, and the Layout sizers | Layout sizers only | artwork face |
| move | drag anywhere, or Layout | Layout only | artwork face |
| duplicate | yes | no | no |
| delete | removed outright | hidden, words kept | artwork face |

Worth noting because it is easy to assume otherwise: `resize()` in
js/arrange.js:510 takes any selected key with a region, so a **layout block
can be resized** in the Layout face. Only Duplicate is gated.

## The shape the answer takes

tldraw's `ShapeUtil` is the same idea already half-built here. Each shape type
owns `getGeometry()`, `component()` and `getDefaultProps()` as abstract — every
shape must answer — plus optional `canResize()`, `canEdit()`, `canBind()`,
`hideResizeHandles()`. Excalidraw splits the same way at package level:
`element`, `math`, `common`.

`FREE_KINDS` is already that table. `draw` is `component`, `rows`/`cols` are
`getDefaultProps`. The capability half is the part that was never filled in.

## What moves

Add to each entry in `FREE_KINDS`:

```js
edits: 'inline' | 'rail' | false   // where its words are typed
resizes: true | false              // corner handles
duplicates: true | false
```

From the measurement, that reads:

| | `edits` |
| --- | --- |
| heading, text, note, quote | `'inline'` |
| bullets, pairs, chart | `'rail'` |
| image | `false` — its words are a path, and the picker owns it |

`resizes: true` and `duplicates: true` for all eight today. They are worth
declaring anyway: the point is that a ninth kind has to answer, not that the
current eight disagree.

Then:

1. **`inlineEditable()` asks the kind** instead of comparing strings. It keeps
   the `isConnected` guard and the tab test for composite blocks, and loses
   the round-trip inference for anything in `FREE_KINDS`. Layout blocks —
   which are not in the table — keep the current heuristic, so this is
   additive rather than a rewrite.
2. **`paintHandles()` asks the kind** before drawing corners, rather than
   drawing them for anything selected.
3. **The Duplicate gate** reads `kind.duplicates` rather than re-deriving the
   key prefix. The `blocks.` prefix stays as the answer to "is this an item",
   which is a different question and a correct use of it.
4. **The comment on `data-block-kind`** is corrected to say what it does.

Not moved, having looked properly: **js/editor.js:1279 and 1286** gate the
rail box height and the Size field on `spec.draw`, and both are right to.
The Size field is the prose rank — display through small — which a kind that
renders its own markup has no use for, and the taller rail box is about how
much text a kind typically holds. Both are questions about rendering, not
about capability, and the scope was wrong to list them. The mistake they were
making was using `draw` to mean "not typed into", and that reading is gone.

## What this does not cover

`FREE_KINDS` describes items the author added. It says nothing about layout
blocks or pictures, which are the other two thirds of the matrix. Two honest
options:

- **Leave them.** Their capabilities are already single-sourced after this
  week: `SF.canDeleteBlock` for delete, `immovable()` for push. The scatter
  this scope removes is the item half.
- **A parallel table.** Layout blocks would need one entry per slot key, which
  is 23 types of declaration to maintain against a corpus that changes. Not
  worth it until something forces it.

Recommend the first. The scope is the item half, and it should say so.

## Risk

One real edge, found by measuring rather than reading.

**The current behaviour is conditional on content, and a static declaration
flattens it.** An empty `bullets` block *is* typed into on the canvas — the
guard at js/customize.js:336 says so explicitly, because a block is added
before it is written into and a zero-height box cannot be clicked into. The
same block with two lines in it hands to the rail instead. So `bullets`
behaves as `'inline'` when empty and `'rail'` when full, and declaring it
`'rail'` outright would take away the way you write the first line.

The answer is that the empty-block guard stays *above* the declaration rather
than being replaced by it. `edits` then answers "where do these words live
once there are some", which is the question that was being inferred.

`inlineEditable`'s round-trip test is also doing work beyond capability: it
catches a block whose rendered text has been transformed — a keywords line
split across a term and a definition, a bullet with a tab lead-in — where
typing into the rendered form would write back the wrong string. The tab test
at the top of the function stays either way.

The failure mode if this is got wrong is a block that opens the wrong editor,
which is visible immediately and covered by `canvas-edit` and `delete-truth`.

## Tests

Covered already: `delete-truth` (9 checks) holds the delete half,
`layout-face` (31) holds Duplicate being gated and Remove not being,
`canvas-edit` holds inline editing.

Needed: one check that every entry in `FREE_KINDS` declares all three
capabilities — the governance check that stops a ninth kind being added with
two thirds of an answer. Cheap, belongs in `npm test` rather than a smoke,
and is the same shape as the `ThemeKey` census in
docs/theme-contract-governance.md.

## Size

Five call sites, eight table entries, one new unit test.

It is orthogonal to the split in docs/render-split.md, not a rival to it.
That work is four of six steps done and has taken `js/render.js` from 7,215
lines to 3,488, which is a real improvement to a file nobody could read — and
it moves every one of the four capability mechanisms intact, because moving
lines is not the same as deciding who answers a question. The two are worth
doing in either order.

They do touch the same file, and that is worth saying plainly rather than
leaving for whoever hits it: `FREE_KINDS` sits inside the regions band, which
is that document's step 5. Its §5 records step 5 as blocked on this work. The
declarations here are additive — eight entries and a comment — so the band can
move with them in place; what cannot happen is both edits being in flight in
`js/render.js` at the same time without one of us knowing.

## Change log

- 2026-09-20 — built. Three of the five listed moves landed; the fourth was
  wrong and is recorded above as not-moved. All eight kinds behave exactly as
  they did, verified kind by kind through the canvas, including the empty
  `bullets` edge the risk section names. A governance test holds the table to
  being complete.
- 2026-09-20 — written, after the delete/handles/duplicate fixes made the
  pattern visible. Nothing implemented. The behaviour table is measured
  through the canvas, not read off the source: it is what turned up `quote`
  editing inline despite having a `draw` function, and `bullets` changing
  answer depending on whether it has words in it yet.
