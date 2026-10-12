# Lecture notes: notes for students, beside the speaker notes

Status: plan, 12 October 2026. Nothing built yet.

## The idea

A slide has two kinds of notes, written for different people:

| | Speaker notes (exist today) | Lecture notes (new) |
|---|---|---|
| For | The presenter | The students |
| What they say | "ASK…", answers, timings, what to do next | What the slide means, written to be read later |
| Who sees them | Only the presenter: Teacher Presenter, and Notes on another device | Everyone the slides go to |
| Where | Notes on another device (`prompter.html`) | The read link, the follow-along screen, the student PDF, the student copy |

Speaker notes never leave the presenter. Since 12 October, Share strips them from every audience link (`js/share.js` `withoutNotes`). Lecture notes are the opposite: they travel wherever the slides go.

## 1. The field

- **`lectureNotes`** on a slide: plain text, with blank lines as paragraphs and `**bold**` allowed. It stays empty unless someone writes it.
  - SlideForge's slide model: kept by `normalizeSlide` (`src/model.js`) and typed in `src/types.d.ts`.
  - The Lesson studio's slide (`lab/src/model/types.ts`), carried across by the converter (`lab/src/model/fromSlideForge.ts`).
- **The show deck carries it.** When a Lesson-studio slide becomes a picture for SlideForge's player (`js/lab-engine.js` `pictureSlide`), the picture carries `lectureNotes` the way it already carries `notes`.
- **Nothing is filled in automatically.** Speaker notes are never copied across, because they hold the answers and the teacher prompts.

## 2. Writing them

- **Lesson studio, Slide panel:** a **Lecture notes, for students** box under *Speaker notes*, with one line saying who reads it.
- **Classic editor:** the same box, under its speaker notes.
- **Lesson builders** (`tools/build-ipdv-week*.js` and others): a slide may set `lectureNotes`. The student copy (`studentCopy`) keeps them.

## 3. Where students see them

| Place | How it looks |
|---|---|
| **Read at your own pace** (`view.html?s=`) | The slide, with its lecture notes in a panel under it on a phone and beside it on a wide screen. A **Notes** toggle hides them. |
| **Follow live** (`view.html?…&follow=1`) | The same panel, updated as the presenter moves. Hidden by default on a big screen in the room, and shown on a student's own device. |
| **Practice** | Under the slide, as in Read. |
| **Student PDF** (`js/print.js`, `tools/export-teaching-pdf.mjs`) | Under each slide on the page. The PDF for the presenter keeps its speaker notes as it does now. |
| **Live room on phones** (`join.html`) | Not in the first round. Phones show the activity, not the lecture. Open question 3. |

`withoutNotes` keeps `lectureNotes`. A Share copy then has lecture notes and no speaker notes.

## 4. Build order

1. **The field:** model, types, converter, the show deck's pictures, and `normalizeSlide`. Test that a lesson with both kinds of notes round-trips, and that Share's upload keeps lecture notes and drops speaker notes.
2. **Writing them:** the Lesson studio's Slide panel, then the classic editor.
3. **Read and Follow:** the panel in `view.html`, and a test that the follow screen shows the slide on the wall.
4. **The student PDF:** lecture notes under each slide. Check the student copy of Week 5.
5. **A pilot:** Week 5's 78 slides. Draft lecture notes from the slide content and the guides, **not** from the speaker notes. You review and edit the drafts before they go into the student copy.

Each step is a commit of its own, and the built files are rebuilt from a clean checkout (AGENTS.md, "One trunk").

## 5. Open questions

1. **Formatting:** plain text with paragraphs and bold, or links and lists too? Plain is the proposal.
2. **The big screen in the room:** should a follow-along projector show lecture notes, or only students' own devices? The proposal is off on the projector, on for personal devices.
3. **Phones in a live room:** should `join.html` offer lecture notes between activities? The proposal is not yet.
4. **The Week 5 pilot:** should I draft them for you to edit, or will you write them?
