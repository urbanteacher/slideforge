# Story designs: editorial slides anyone can build

**Status:** SD-01 started 10 October 2026. **Worked example:** Mark Martin's Air Pollution Project deck, "From a school street to the world stage". It is 27 slides in the lab's own format. The deck is in `assets/air-pollution/` and opens with `?lesson=air-pollution-story`.

## Why

The Air Pollution Project deck was built for the Frontiers Series. It is a story told in the lab, not a lesson in the classroom formats:

- full-bleed photos with a fade behind the words
- big numbers that count up and arrive on a click
- comparison bars
- photo mosaics
- a wall of phrases
- app showcases with a "Built with" strip
- a closing call to action

**Every slide is made of ordinary lab layers.** Nothing was added to the engine, and every layer opens and edits in the Lesson studio.

**But it was not made in the studio.** A script (`airDeck.builder.ts`, kept with the deck's sources) placed every layer by its pixel position, at 15 to 40 layers a slide. Someone in the studio would have to place them all by hand. The **Slide designs** panel offers classroom shapes: points, cards, key fact, table, timeline and the activity formats. It offers nothing editorial.

So SlideForge can **show** this kind of slide but cannot yet help anyone **make** one. This plan closes that gap.

## What the deck found

| Finding | What it means |
|---|---|
| The palette was hard-coded: every layer carries its hex colours | Restyling the deck means editing every layer. Designs must take their colours and faces from the style guide. |
| A shape's gradient angle counts from the left (0° runs left to right, 90° top to bottom, `engine/raster.ts` `rasterShape`). A text gradient follows CSS (90° runs left to right). | The first fades came out as solid boxes. Two conventions in one inspector trip people up. |
| Every photo slide needed a hand-made fade so the words read | This wants to be one click on the picture. |
| Footers and page numbers were added as layers on every slide | The deck's header and footer (`headerFooter`, `syncHeaderFooter`) already does this, and keeps the numbering right when slides move. Designs should rely on it. |
| The deck's photos ship with the app (`assets/air-pollution/`) | A user's own photos live only in their browser's IndexedDB. A share is capped at 8 MB (`MAX_DOC`, `server/server.js`). Render's free plan drops anything written at run time. Photo-heavy decks need somewhere to live. |
| Publishing it needed code: `js/lab-decks.js` maps a lesson key to a shipped lab-deck file, and `lab-engine.js` opens it as written | Featured decks and a Publish step would make this a user action rather than a commit. |

## The plan

### SD-01 · Quick wins (S)

- [x] **Frontiers Series palette** in Colours & grounds, under Campaigns (`lab/src/model/palettes.ts`). It is UKBT Black with Bright Blue leading and Green for Our Environment, with the UKBT Institute and Black in Academia logos as marks.
- [x] **Fade for text** on a picture. Design tab → Picture → Fade for text: Left, Right, Bottom or All over (`lab/src/ui/picture.ts` `addFade`). It lays an ordinary gradient shape just above the picture. The shape uses the slide's own ground where that is dark, and near-black where it is light, so it can be moved or recoloured afterwards.
- [x] **Say which way a shape gradient runs.** The Angle control's help now gives the convention and points to Fade for text.
- [ ] **One gradient convention.** Move shapes to the CSS convention that text uses. This needs a migration for saved decks, and an update to every built-in design that sets a shape angle (`layouts.ts`, `designs/`, `ukbtDeck.ts`). It is held back on purpose: it changes how existing decks draw.
- [ ] **The worked example uses the deck's header and footer** instead of its own footer layers.
- [ ] **A see-through shape gradient draws lighter than its stops.** A fade from 94% to 0% reads at roughly a third of that over a photo, in the editor and in Present. Until the engine is fixed (`engine/raster.ts` `rasterShape` and how the stage composites it), the photo hero and Fade for text lay a side fade twice.

### SD-02 · The Story design set (M–L)

Story designs in the Slide designs panel, each built from the style guide, each a `slide.recipe` so the Slide panel can rebuild it when the words, numbers or picture change:

| Design | Worked example (Air Pollution deck) |
|---|---|
| Cover: portrait on a coloured disc, an outlined word, logos | 1 |
| Photo hero: full-bleed picture, fade, a huge line | 12 "So we built it." |
| Big-number row: two to four numbers that count up and arrive on clicks | 5, 7 |
| Headline number and a "why" card | 6 |
| Comparison bars beside a stat card | 8 |
| Photo mosaic with an overlaid headline | 15 |
| Numbered steps beside a picture | 13, 22 |
| Logo wall of cards | 14 |
| App showcase: framed screenshot, stat column, "Built with" strip | 18, 23–25 |
| Two routes: an illustrative comparison diagram | 21 |
| Wall of phrases with highlights | 11 |
| Closing question with call-to-action pills | 27 |

**Start with the big-number row.** It is the most reused, and it proves the recipe round trip.

- [x] **Big-number row** (`lab/src/model/storyDesigns.ts` `numbersSlide`, recipe `story-numbers`): in Slide designs → Story designs. It takes two to four numbers, each with its label, plus kicker, title, intro, takeaway and source. Numbers arrive one per click or with the slide. Edit everything in the Slide panel and press Update the slide.
- [x] **Photo hero** (`heroSlide`, recipe `story-hero`): picture, fade on the left or along the bottom, a two-part line, a line under it, and a credit.
- [x] **Comparison bars** (`barsSlide`, recipe `story-bars`): up to six bars beside a card with one or two numbers, plus a takeaway and source.
- [x] **Closing question** (`closingSlide`, recipe `story-closing`): two lines, a tag, the when-and-where, a button, a contact and an outlined word.
- [x] **Steps and a picture** (`stepsSlide`, `story-steps`) · **Logo wall** (`logosSlide`, `story-logos`) · **App showcase** (`showcaseSlide`, `story-showcase`).
- [x] **Cover with portrait** (`coverSlide`, `story-cover`) · **Number and why** (`whySlide`, `story-why`) · **Photo mosaic** (`mosaicSlide`, `story-mosaic`) · **Two routes** (`routesSlide`, `story-routes`) · **Wall of phrases** (`wallSlide`, `story-wall`).

**SD-02 is complete:** all twelve designs are built, theme-aware and editable.

### SD-03 · Media, featured decks and Publish (L)

- **A media library:** pictures stored once on the server, behind a persistent disk or object storage, and referenced by URL. That keeps decks small and shareable.
- **Featured decks in the Library:** shipped lab decks, the generalised form of `js/lab-decks.js`.
- **A Publish action** that makes a deck available at a stable link.

### SD-04 · An AI story builder (M)

Fill the Story designs from a brief and a set of photos, through the existing AI route (`js/ai.js`), with sources kept in the speaker notes. The Air Pollution deck's research rule should carry over: every figure is checked against its source before it reaches a slide, and anything that cannot be sourced is left out.

## Change log

- **10 October 2026:** SD-02 complete: steps and a picture, logo wall, app showcase, cover with portrait, number and why, photo mosaic, two routes and wall of phrases, each checked in the Frontiers theme. The worked example deck now carries the Frontiers Series style guide, and its photo fades are laid twice.
- **10 October 2026:** SD-02: photo hero, comparison bars and closing question built and checked in the Frontiers theme, and the closing question edited through the Slide panel. Found that see-through shape gradients draw light (noted under SD-01).
- **10 October 2026:** SD-02's first design, the big-number row, is built and checked in the theme and through the Slide panel.
- **10 October 2026:** Plan written from the Air Pollution Project deck. SD-01's first three items done: the Frontiers palette, Fade for text, and the Angle help.
