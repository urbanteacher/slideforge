# Review slides and check fit

Open a deck and press **◱ Review** on the presentation row, beside Theme. The
review opens a snapshot of the current deck. (It was in the Look pane until
that row existed; Look customises one slide, and this reviews every slide in
the deck — and can review a file that is not the open deck at all.) Select a thumbnail for a larger view, use the
arrow buttons or keys to move, and return with **Back to grid**. Escape closes
the review. The enlarged slide fits the window in 16:9, 16:10 and 4:3.

**Include hidden slides** adds presenter-only pages. **Check slide fit** measures
every shown slide at its original dimensions with progressive builds revealed.
Two problems are reported: content past the slide boundary, named by the words
that escaped; and on a slide arranged on the lattice, a block wanting more
lines than its region gave it, named by its block key and its shortfall. The
second is `SF.latticeFit`, the same arithmetic the **Layout** face runs — asked
here so a deck audit cannot call a slide sound that Layout has outlined in red.
Problems appear beside their thumbnails. A deck or bundle JSON file can be
loaded into the review without replacing or saving over the open deck.

## Command line

Start the application with `npm start`, then run from the project directory:

```sh
node tools/check-fit.mjs path/to/deck.json
node tools/check-fit.mjs path/to/bundle.json another-deck.json --json
node tools/check-fit.mjs --lesson motion-lab --lesson pace-nul
node tools/check-fit.mjs path/to/deck.json --visible-only
```

Files may contain a single deck, an array of decks, or a bundle with a `decks`
array. Hidden slides are included unless `--visible-only` is supplied.
`SLIDEFORGE_URL` selects another running SlideForge server. The files are read
locally and passed into that page's browser context; they are not imported into
its library.

The command exits non-zero for overflow, unavailable image elements, invalid
input, missing files, unknown lessons or an empty set of slides. `--json` emits
per-slide results with the source, slide number, dimensions and offending text.
The old `node AiAd27/check-fit.mjs` command is a wrapper over this same checker.

## What it checks

The UI and CLI both call `SF.Review.check`. It waits for fonts and image elements
(up to five seconds per resource), lets text fitting settle, and measures text
ranges against the slide edges with three pixels of rounding tolerance. It also
checks the content area's scroll dimensions. Intentional, explicitly hidden
artwork is excluded. Failed or unsettled image elements are reported separately.

A passing result is a boundary check, not design approval. It does not establish
that text boxes do not overlap each other, that colours have sufficient contrast,
that all CSS background images loaded, or that motion reads well. Inspect the
review and run Present for those judgments. Embedded games are reviewed as
authored slides, not expanded into every possible live state.

`npm test` exercises all three shapes, known overflow, hidden-slide selection,
file imports, original-deck preservation, and the five campaign starter decks.
`node tools/smoke/slide-review.mjs` runs just that browser check on a temporary
local server.
