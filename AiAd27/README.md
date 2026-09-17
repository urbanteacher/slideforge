# AI Awareness Day 2027

**Your AI. Your choices.** Five short classroom decks about keeping humans in the loop.

## Review the redesign

With the local server running (`npm start`), open:

http://localhost:8787/AiAd27/preview.html

The review page displays all 35 student slides. Click any slide to enlarge it,
use the arrow keys to move, and press Escape to close it. It renders the actual
SlideForge slides rather than a separate approximation.

The five decks also appear in SlideForge's AI Awareness Day 2027 Library folder.
The bundle at `bundles/AiAd27-All-Five.sfbundle.json` can be imported through
**File → Import → From a file**. Existing saved decks using the five 2027 themes
receive the new visual treatment; import the rebuilt bundle to get revised copy.

## Visual direction

The design borrows the scale and contrast of the NUL and UKBlacktech themes,
with a separate identity for this campaign:

- Bright poster covers with oversized questions and a distinct graphic for each strand.
- Dark scenario slides that put one human voice at the centre.
- Large A–D ballots, with matching on-screen and live poll choices.
- Full-colour discussion slides with a single question.
- Content-specific reveals: a risk map, comparisons, authorship credits and decision lanes.
- Dark numbered takeaways and a bright personal commitment slide.

Safe uses cyan, Smart orange, Creative lavender, Responsible mint and Future pink.
Every slide also names the strand. The local Uncut Sans font keeps rendering
consistent without a network font service. Text and diagrams remain browser
content and the deck fields remain editable in SlideForge.

The supplied files in `assets/` remain original. The undated black props appear
on the covers. The supplied logo and badges say 2026, so they are reference
material rather than projected 2027 branding. Cover illustrations are authored SVG assets referenced by each title slide: a
shield, lightbulb, spark, scales and path. They can be replaced in Look → Poster artwork.

## Teaching structure

| Slide | Role | Timing |
|---|---|---|
| 1 | Opening question | While the room settles |
| 2 | Scenario | 30 seconds |
| 3 | Vote before the explanation | 45 seconds |
| 4 | Discuss with a partner | 75 seconds |
| 5 | Reveal and question | 75 seconds |
| 6 | Three practical rules | 30 seconds |
| 7 | Make one personal choice | 45 seconds |

Five minutes of activity, plus the opening slide. Each deck also retains its
hidden teacher preparation and vocabulary pages. Notes, live polls and
progressive reveals use the normal SlideForge model.

## Files and rebuilding

- `starters27.js`: authored copy, polls and presenter notes.
- `../src/model.js`: shared composition registry and campaign defaults.
- `../js/render.js`: theme-independent structured compositions.
- `../css/customize.css`: reusable composition geometry.
- `../css/aiad27.css`: campaign styling, scoped to the five 2027 themes.
- `assets/`: supplied logos, badges and props. The flat PNGs are committed; the
  layered `.psd` posters are not, because they are 176MB of files nothing here
  loads and they are kept with the campaign working files outside the repository.
- `preview.html`: interactive design review.

```sh
node AiAd27/build.js
node tools/build-aiad-lessons.mjs
node AiAd27/contact-sheet.mjs
node AiAd27/check-fit.mjs
```

The last two commands need the server. The contact sheets render all 45 slides,
including hidden pages. Check the PNGs as well as the overflow report: an element
can overlap another without leaving the slide boundary.

The teaching source references remain in the starter notes. This redesign does
not constitute a fresh subject-matter review. Decision lanes preserve and display the authored numeric positions, grouped below
50 and at least 50. They are discussion positions, not empirical measurements.
The unsupported universal claim about student exclusion has been removed.

## Reusable arrangements

Look → Composition offers the same choices under every theme. Theme default
uses the manifest preference; Original layout opts out. The starter slides store
explicit choices so changing their theme preserves their arrangement. Subtitles,
formatting, ballot reveals, logos and normal page chrome use the shared engine.

Run `node tools/smoke-design-foundations.mjs` with the server running to check
the refreshed demos and every composition against every theme. This is a render
and contract check, not a pixel baseline update.

The campaign fit command now delegates to the platform checker. For any deck,
use **Look → Review slides & check fit**, or
`node tools/check-fit.mjs path/to/deck.json`. See [slide review](../docs/slide-review.md)
for supported inputs and the limits of boundary checks.
