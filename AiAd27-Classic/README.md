# AiAd27-Classic — the 2026 lessons in the 2027 campaign

The six lessons with slides on aiawarenessday.co.uk — five 5-minute starters and
the Smart assembly — restyled in the AiAd27 strand themes, exported as PDFs, and
kept in step with the teacher instructions on the website.

The new 2027 starters are in `../AiAd27/` and are not published yet.

## Build

```sh
node AiAd27-Classic/build.js        # bundles, and run.json
node AiAd27-Classic/export.mjs      # PDFs, previews and wp-instructions.json
```

`export.mjs` needs the server (`npm start`); from a worktree, run that worktree's
server on another port and pass `SLIDEFORGE_URL=http://localhost:<port>`.

| Deck | Website lesson | Shown | Time | Debate (optional) |
|---|---|---|---|---|
| Safe | whos-really-behind-the-screen | 13 | 5 min | 6 min |
| Smart | how-does-ai-actually-think | 13 | 5 min | 6 min |
| Creative | ai-as-your-creative-partner | 12 | 4 min 20 sec | 6 min |
| Responsible | the-hidden-costs-of-ai | 13 | 5 min | 6 min |
| Future | your-ai-ready-future | 12 | 4 min 20 sec | 6 min |
| Assembly | ai-is-already-here | 13 | 20 min | 6 min |

Import any deck from `bundles/` with **File → Import → From a file**.

## One source for the slides and the steps

Every slide the room sees carries a `run` step in `starters.js`: what the teacher
does, how long, what pupils do and a tip. From that one entry:

- `build.js` writes it at the top of the slide's presenter notes;
- `export.mjs` writes `bundles/wp-instructions.json`, the lesson's Instructions
  and Preparation for the website, with each step's "Slide n" numbered against
  the PDF's pages. A poll adds a hands-up page after its slide, so PDF pages run
  ahead of deck slides from the first question on.

The steps are worded for the PDF ("go through the four cards") because a PDF
cannot reveal one card at a time; the presenter notes keep the reveal advice
for anyone presenting from SlideForge.

## Publishing to the website

Copy the PDFs and the JSON into the theme:

```sh
cp AiAd27-Classic/pdf/*.pdf <theme>/assets/lessons/2027/
cp AiAd27-Classic/bundles/wp-instructions.json <theme>/assets/lessons/2027/lessons.json
```

The theme applies `lessons.json` to the six lessons whenever the file changes
(`aiad_sync_lesson_decks()` in `plugins/aiad-core/modules/post-types/resource-seeds.php`):
it replaces their Instructions and Preparation and points the download at the
PDF. Edit the steps here, not in WordPress — the next export replaces them.

## What changed from 2026

- **Themes.** `aiad27-<strand>`, the campaign lockup, and the strand poster on
  each cover.
- **Lists fitted to the 2027 layouts.** Answer cards are an A–D ballot, so six
  became four; takeaways are numbered rules, so five became three. Nothing
  removed was lost: it is folded into a neighbouring card or written into the
  presenter notes.
- **Dated figures.** The campaign's 2025 projections are worded as projections
  ("projected for 2025", "estimated 2025 footprint") rather than forecasts. No
  new figures were added. Worth refreshing before the day: Safe's deepfake
  numbers (European Parliament, Thorn), Responsible's iceberg (IEA, Nature
  Sustainability), Smart's HEPI 2025 survey.
- **Safe.** "Look for the tells" is off the slide: current fakes rarely blink
  oddly, and the notes say to check the source instead.
- **Assembly, new.** The 2026 deck had seven slides for twenty minutes and none
  for three of its steps. This one has a slide per step, in the steps' order.
- **Debate.** Three slides in every deck, after the key takeaway: the
  Secondary motion with a first vote, its points for and against with the
  challenge card, and the motion for every age. They come from `debates.js`,
  which also writes each lesson's debate pack into `wp-instructions.json`, so
  the slides and the lesson page's "Set up the debate" match. Their steps are
  marked `optional`: the website shows them but leaves them off the lesson
  clock, so a starter stays five minutes.
- **Hidden extensions** keep the 2026 sub-questions for longer lessons.

Slide numbers are off, as in 2026: the count includes held-back slides.

## Styling fixes in `css/aiad27.css`

- Keyword definitions are no longer lowercased (`app.css` lowercases them;
  `aiad26.css` already undid it for 2026).
- Plain layouts (stat tiles, vocabulary, links) keep their headline clear of the
  corner lockup, as the campaign layouts already did.
