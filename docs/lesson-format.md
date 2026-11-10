# The lesson file

A lesson written as text, by you, a script or an AI, that SlideForge builds in the Lesson studio. It is BACKLOG item CS-01. The idea came from Claude Slides ([claude-slides-lessons.md](claude-slides-lessons.md)).

A slide **names one of the studio's layouts and fills in its words**. The studio does the placing, in the lesson's theme, exactly as the Gallery would. So a file can't put a box in the wrong place, and every slide comes out at the studio's standard.

**To import one:** in SlideForge, File → Import → *From a SlideForge file*, and pick the `.json` file. In the studio on its own, File → Open deck file. If the file has problems, nothing is imported. A dialog lists every problem with its slide number, and **Copy the problems** puts the list on the clipboard so you can give it back to whoever wrote the file.

The reader and builder are `lab/src/decks/lessonFormat.ts` and `lab/src/decks/fromLesson.ts`. A complete example that uses every layout is [examples/lesson-example.json](examples/lesson-example.json), and `lab/tests/lesson-format.test.ts` checks it always reads clean.

## The file

One JSON object:

```json
{
  "format": "slideforge-lesson/1",
  "title": "Reading a chart before believing it",
  "theme": "paper",
  "slides": [
    { "layout": "title", "title": "Reading a chart before believing it", "subtitle": "Data literacy · 40 minutes" },
    { "layout": "bullets", "title": "Ask these first", "points": ["What does the title claim?", "Where does the axis start?"] }
  ]
}
```

| Field | Needed | What it is |
|---|---|---|
| `format` | yes | Always `"slideforge-lesson/1"`. |
| `title` | yes | The lesson's name. |
| `theme` | no | One of the studio's themes by id, such as `paper`, `navy`, `midnight`, `cinematic` or `mono`. An unknown id gets the default theme. |
| `slides` | yes | The slides, in order. |

Any other field is reported as a problem, so a misspelt field never fails silently.

## Every slide

Any slide may also carry these:

| Field | What it is |
|---|---|
| `id` | The slide's own id: letters, digits, `-` and `_`. Made up when not given. Each id is used once. |
| `notes` | Speaker notes. The teacher's only: never shown to the class or put in a share. |
| `hidden` | `true` keeps the slide in the deck but out of the show and the student copy. |
| `factCheck` | A fact on this slide still needs a source: what to check. The studio marks the slide and says so when a show opens. |

**Never invent a fact.** Where a figure, name, date or source wasn't given, write a placeholder: square brackets round two or more underscores, as `[__%]`, `[year __]` or `[source __]`. The studio marks these too (CS-03).

## The layouts

| `layout` | Needs | May have | Notes |
|---|---|---|---|
| `title` | `title` | `subtitle` | The lesson's opening. |
| `section` | `title` | `subtitle` | A pause between parts. |
| `statement` | `text` | `credit` | One line, as big as it fits. |
| `bullets` | `title`, `points` | | `points` is a list of lines. They shrink to fit. |
| `cards` | `title`, `cards` | | Two to four `[heading, words]` pairs. |
| `keyfact` | `title`, `fact` | `caption`, `details` | One number or rule, set large. `details` is a list of lines. |
| `keywords` | `title`, `terms` | | A list of `[term, meaning]` pairs. |
| `stats` | `title`, `stats` | `takeaway` | One to four `[number, what it counts]` pairs. |
| `compare` | `title`, `heads`, `rows` | | `heads` is `["A", "B"]`; each row is `[label, A, B]`. |
| `table` | `title`, `rows` | | The first row is the header. Every row is as long as the first. |
| `quote` | `quote` | `who` | Someone else's words. |
| `split` | `title`, `points` | `picture`, `side` | Text beside a picture. `picture` is a picture's address; `side` is `"left"` or `"right"` (where the picture goes). |
| `timeline` | `title`, `events` | `subtitle` | One to six `[when, who or what, detail]`. |
| `quiz` | `questions` | `title` | A multiple-choice game the room plays, made from the studio's own. |
| `widget` | `html` | `title` | A small live web page, up to 16 KB, that runs in the show. Sandboxed: no internet, no way into the lesson. Its page is laid out at the slide's size, with text from 36px. |

A `quiz` question is:

```json
{ "question": "Where should a bar chart's axis start?", "options": ["At zero", "At the smallest bar"], "answer": 1, "explanation": "A bar's length is its value." }
```

It has two to four `options`. `answer` is the right option's number counting from 1, or its exact words. `explanation` is optional and shows at the reveal. One quiz slide becomes the game's cover and one slide per question, each followed by its answer, as Browse makes it.

## Writing one with an AI

Give the AI this page and the example, and ask for one JSON file. Then import it, and paste any problems the dialog lists back to the AI. Things that help:

- One idea per slide. Use `statement`, `keyfact` or `cards` before reaching for `bullets`.
- Put the teacher's script in `notes`, not on the slide.
- Every figure the AI wasn't given is a placeholder, or the slide carries `factCheck`.

## Not in this version

- Only the layouts above. The studio has more (charts, diagrams, the Story designs, activities and the other games); each can be added as a layout here when it's needed.
- Import only. A deck can't yet be written back out as a lesson file; that comes with CS-08, asking for a change in words.
- One file. Agents that keep one file per slide put the slides into the list before importing.

## Change log

- **10 November 2026:** the `widget` layout (CS-15).
- **10 November 2026:** version 1. Fourteen layouts, the quiz as a multiple-choice game, the common fields, and import in SlideForge and in the studio on its own.
