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
| `theme` | no | One of the studio's themes by id: `paper`, `navy`, `midnight`, `cinematic` or `mono`. Or a palette from the Style guide by its id, such as `nul` or `ukbt`, which the deck then wears with its grounds. An unknown id gets the default theme, and the import says so. |
| `slides` | yes | The slides, in order. |

Any other field is reported as a problem, so a misspelt field never fails silently.

## Every slide

Any slide may also carry these:

| Field | What it is |
|---|---|
| `id` | The slide's own id: letters, digits, `-` and `_`. Made up when not given. Each id is used once. |
| `notes` | Speaker notes. The teacher's only: never shown to the class or put in a share. |
| `hidden` | `true` keeps the slide in the deck but out of the show and the student copy. |
| `audience` | `"teacher"` keeps the slide in the show and the teacher's copy, and leaves it out of the student copy. Use it instead of a second deck for students. |
| `factCheck` | A fact on this slide still needs a source: what to check. The studio marks the slide and says so when a show opens. |
| `build` | Reveal the slide's items a click at a time. `"click"` shows each in turn, `"dim"` fades the earlier ones and `"spot"` lights only the newest. Use it on `bullets`, `cards`, `keywords`, `stats`, `timeline`, `icons`, `journey`, `funnel`, `mindmap`, `columns` and `rail`, rather than repeating a slide with one more item. |

**Never invent a fact.** Where a figure, name, date or source wasn't given, write a placeholder: square brackets round a blank of two or more underscores that doesn't touch a letter or digit, as `[__%]`, `[year __]` or `[source __]`. Underscores inside code (`[__init__]`, `"__x"`) are not placeholders. The studio marks these too (CS-03).

## The layouts

| `layout` | Needs | May have | Notes |
|---|---|---|---|
| `title` | `title` | `subtitle` | The lesson's opening. |
| `section` | `title` | `subtitle` | A pause between parts. |
| `statement` | `text` | `credit` | One line, as big as it fits. |
| `bullets` | `title`, `points` | | `points` is a list of lines. They shrink to fit. |
| `cards` | `title`, `cards` | | Two or more `[heading, words]` pairs. Four fit a slide. |
| `keyfact` | `title`, `fact` | `caption`, `details` | One number or rule, set large. `details` is a list of lines. |
| `keywords` | `title`, `terms` | | `[term, meaning]` pairs. Six fit a slide. |
| `stats` | `title`, `stats` | `takeaway` | `[number, what it counts]` pairs. Four fit a slide. |
| `compare` | `title`, `heads`, `rows` | | `heads` is `["A", "B"]`; each row is `[label, A, B]`. |
| `table` | `title`, `rows` | | The first row is the header. Every row is as long as the first. |
| `quote` | `quote` | `who` | Someone else's words. |
| `split` | `title`, `points` | `picture`, `side` | Text beside a picture. `picture` is a picture's address; `side` is `"left"` or `"right"` (where the picture goes). |
| `timeline` | `title`, `events` | `subtitle` | `[when, who or what, detail]`. Six fit a slide. |
| `quiz` | `questions` | `title` | A multiple-choice game the room plays, made from the studio's own. |
| `widget` | `html` | `title` | A small live web page, up to 16 KB, that runs in the show. It is walled off from the lesson and the teacher's sign-in, and it can't fetch anything, but it can open a web page in its own frame. So a widget from a lesson file asks the teacher before it first runs. Its page is laid out at the slide's size, with text from 36px. |
| `icons` | `title`, `items` | | Two or more `[icon, label, what it means]` rows, each with its icon in the theme's accent. Six fit a slide. The icon is a name from the list below. |
| `picture` | `picture` | `title`, `credit` | One picture across the slide, with its title above it when it has one. |
| `pictures` | `title`, `pictures` | | `[picture address, caption]` pairs shown in turn in one frame, each click swapping in the next. For a figure built up step by step. Eight fit a slide. |
| `video` | `title`, `url` | `subtitle` | A YouTube or Vimeo video that plays in the show. |
| `chart` | `title`, `data` | `chart`, `source` | `data` is `[label, number]` pairs. `chart` is `column` (the default), `bar`, `line`, `pie` or `donut`. |
| `diagram` | `title`, `steps` | `diagram` | `steps` is a list of short names. `diagram` is `loop` (the default: a cycle) or `flowchart` (one after another). |
| `journey` | `title`, `steps` | `subtitle` | `[step, what happens]` pairs along a path. Six fit a slide. |
| `funnel` | `title`, `stages` | `subtitle` | `[stage, number, what it counts]` stages that narrow. Six fit a slide. |
| `mindmap` | `title`, `ideas` | | `[idea, a line on it]` pairs round the title. Eight fit a slide. |
| `orgchart` | `title`, `people` | | `[name, role, who they report to]` rows. Leave the third `""` for the person at the top. |
| `columns` | `title`, `points` | | Points side by side in columns. Four fit a slide. |
| `rail` | `title`, `points` | | The title on a side panel, the points numbered beside it. Six fit a slide. |
| `introduction` | `name` | `role`, `bio` | Who is speaking. |
| `code` | `title`, `code` | `language` | Code on a dark panel in a monospaced face. |

**More items than fit:** a slide with more items than its layout fits carries on to a second slide, and a third if needed, in the same layout with the same title. The import says so. A slide with `"id": "ideas"` makes `ideas`, then `ideas-2`, and so on, so those ids are taken.

A `quiz` question is:

```json
{ "question": "Where should a bar chart's axis start?", "options": ["At zero", "At the smallest bar"], "answer": 1, "explanation": "A bar's length is its value." }
```

It has two to four `options`. `answer` is the right option's number counting from 1, or its exact words. `explanation` is optional and shows at the reveal. One quiz slide becomes the game's cover and one slide per question, each followed by its answer, as Browse makes it.

## The icons

The `icons` layout names icons from the studio's set: 117 from [Lucide](https://lucide.dev) (ISC licence), kept in `lab/src/assets/icons.json` and rebuilt by `node tools/lab-icons.mjs`. Some of them come from Feather (MIT licence). Both licences travel with the set, in the file and in `lab-app/icons-LICENSE.txt`.

Lucide's older names for these icons work too: `home` gives `house`, `alert-triangle` gives `triangle-alert`, and `help-circle` gives `circle-question-mark`. A name that isn't in the set still imports. The slide shows a marked empty square in its place, and the import says which ones to fill in.

- **Ideas:** `lightbulb`, `brain`, `sparkles`, `puzzle`, `target`, `compass`, `key`, `lock`, `shield`, `flag`, `rocket`, `zap`, `star`
- **People:** `user`, `users`, `user-check`, `graduation-cap`, `handshake`, `hand`, `message-circle`, `messages-square`, `megaphone`, `heart`, `face-slightly-smiling`, `face-slightly-frowning`, `face-neutral`
- **Learning:** `book-open`, `notebook-pen`, `pencil`, `clipboard-check`, `list-checks`, `check`, `x`, `circle-question-mark`, `info`, `triangle-alert`, `search`, `eye`, `ear`
- **Data:** `chart-column`, `chart-line`, `chart-pie`, `chart-scatter`, `table`, `database`, `trending-up`, `trending-down`, `percent`, `calculator`, `sigma`, `binary`, `funnel`
- **Tech:** `laptop`, `smartphone`, `monitor`, `cpu`, `bot`, `code`, `wifi`, `cloud`, `server`, `globe`, `link`, `mouse-pointer-click`, `camera`
- **Science:** `flask-conical`, `atom`, `microscope`, `dna`, `leaf`, `sprout`, `tree-pine`, `sun`, `moon`, `droplet`, `flame`, `wind`, `earth`
- **Time and place:** `clock`, `timer`, `calendar`, `hourglass`, `map`, `map-pin`, `house`, `building`, `school`, `factory`, `car`, `bus`, `plane`
- **Money:** `coins`, `banknote`, `wallet`, `shopping-cart`, `piggy-bank`, `scale`, `briefcase`, `gift`, `trophy`, `medal`, `award`, `crown`, `gem`
- **Arrows:** `arrow-right`, `arrow-left`, `arrow-up`, `arrow-down`, `move-right`, `refresh-cw`, `repeat`, `shuffle`, `git-branch`, `split`, `merge`, `circle-arrow-right`, `undo-2`

## Writing one with an AI

A new deck's starter screen has **Or have an AI write it**: type the topic and who it's for, copy the prompt into ChatGPT, Claude or another AI, and paste its reply back. The prompt is built from this page's list of layouts. The reply is cleaned of what chat tools wrap round JSON (a code fence, curly quotes, trailing commas) before it is read.

You can also give the AI this page and the example, and import its file. Paste any problems the import lists back to the AI. Things that help:

- One idea per slide. Use `statement`, `keyfact` or `cards` before reaching for `bullets`, and `build` to reveal a list a click at a time.
- Put the teacher's script in `notes`, not on the slide.
- Every figure the AI wasn't given is a placeholder, or the slide carries `factCheck`.

## Not in this version

- Only the layouts above. The studio has more (the Story designs, activities and the other games); each can be added as a layout here when it's needed.
- A quiz's answer is still its own slide, as the game builds it. Revealing it on the question's slide belongs to the games work.
- Import only. A deck can't yet be written back out as a lesson file; that comes with CS-08, asking for a change in words.
- One file. Agents that keep one file per slide put the slides into the list before importing.

## Change log

- **20 November 2026:** thirteen more layouts (picture, pictures, video, chart, diagram, journey, funnel, mind map, org chart, columns, rail, introduction, code). The `build` field. A palette's id as `theme`. A slide past its layout's cap carries on instead of being refused. The starter screen's prompt for an AI. The `audience` field (Wave 1).
- **10 November 2026:** the widget's wording corrected; a widget from a lesson file asks before it first runs. The placeholder's blank must stand on its own (CR-25, CR-37).
- **10 November 2026:** a `keywords` slide holds one to six terms (a seventh was dropped). Lucide's older icon names are read, and an unknown icon is a warning, not a problem (CR-16, CR-21).
- **10 November 2026:** the `icons` layout and the icon list (CS-17).
- **10 November 2026:** the `widget` layout (CS-15).
- **10 November 2026:** version 1. Fourteen layouts, the quiz as a multiple-choice game, the common fields, and import in SlideForge and in the studio on its own.
