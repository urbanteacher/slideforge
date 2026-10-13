# Nodes challenges: a studio for bespoke student challenges

Status: plan, 13 October 2026. Nothing is built yet.

## 1. What a Nodes deck is today

Each Nodes deck teaches one stage of one framework, for example GCSE Computer Science stage 2, "Describe the main components of the CPU". The decks are already made from data:

- **The data** is one JSON file per stage in `tools/nodes-lab/` (`gcse-cs-2.json`, `critical-text-3.json`, `describe-3.json`). It comes from the-teaching-model.vercel.app and has the same sections every time:

  | Section | What it holds | Slides it makes now |
  |---|---|---|
  | `stage` | Command word, the question, the outcome | Cover, Question |
  | `recall` | Terms to retrieve, with meanings and checks | Knowledge to recall first, Check recall first |
  | `routine` | The mental operations (Decode, Retrieve, Reason, Express, Check) and the share of wrong answers at each | How to answer, Operations |
  | `join` | The link the answer must make, what is refused, an examiner quote | Join it up, Refused without it |
  | `worked` | A worked answer split into units, each with a label | Breakdown, 5 useful elements |
  | `students` | Three answers, A, B and C (weak, stable, excellent), with feedback | Answers: weak, stable, excellent |
  | `ladder` | The missing-link ladder: probe, hint, model, transfer task, repair | The missing-link ladder, Next check |
  | `marks` | How the marks fall, with real mark-scheme examples | Mark scheme |
  | `readings`, `sources` | SOLO readings and the papers cited | Analysis, Sources |

- **The builder** (`tools/nodes-lab/build.mjs` with `kit.js` and a deck file per stage) turns the JSON into Lesson-studio slides offline, in a headless browser. The result is a static deck in `lessons/nodes/`.

So the content is already structured, but only in tool files: a teacher can't make a new stage in the app. In the room, students only watch.

## 2. The idea

A **Nodes challenge** is one stage's data, held in the lesson. Three things are made from it:

1. **The slides,** designed as the Nodes decks are, but generated in the app, not offline.
2. **The live moments,** where students do each part on their phones, not just watch it.
3. **An editor,** to fill in by hand, or to have AI draft a stage from a topic.

It is like an activity (stages, a brief, an idea box) and like a game (answers checked and scored), but its shape comes from the Nodes method, not from a catalogue row.

## 3. How each section plays in the room

Every phone screen below already exists (the seven input kinds and the activity stages), so the relay and the phone page need no new inputs.

| Section | On the wall | On the phone | Reuses |
|---|---|---|---|
| Recall | The terms; then a quick check | Answer each check (multiple choice or typed) | Quiz styles (`choice`, `text`) |
| Question | The question and the command word | Nothing, or "how many marks?" | Quick poll |
| Routine | The operations as timed stages: Decode, Retrieve, Reason, Express, Check | The stage's task, a private note, "I'm lost" | Activity stages (`PRESENTATIONS.stages`), the help signal |
| Join it up | The empty chain: point → because → so → in this case | Put the parts in order, or fill the gaps | `order`, `fill` |
| Breakdown | The worked answer, unlabelled | Label each unit (Point, Explained, So, Because) | `sort` |
| Students' answers | A, B and C side by side | Which is strongest? Then "why?" | `choice`, then `text`; held results |
| Missing-link ladder | One rung at a time: probe, hint, model | A student taps "I need the next rung"; the teacher reveals it | Activity help signal; Next reveals |
| Next check (transfer) | The fresh task | Write the answer | `text`, the idea box, spotlight |
| Mark scheme | How the marks fall | Self-mark their own answer, 1 to 3 | Scale feedback |

The teacher sees who is stuck at which operation in the Teacher Presenter. That gives the same "share of wrong answers at each operation" as the `routine` data, but for this class.

## 4. Where it lives in the code

Following the existing patterns:

- **The data type:** `src/nodes/stage.js`, the JSON shape above, typed in `types.d.ts`. One object per challenge, stored on the challenge's slides (as an activity stores its rows).
- **The slides:** `lab/src/nodes/`, porting `kit.js` and the deck files (ct3, cpu, describe) from the offline tool. Editing a field redraws the slides. The offline tool then calls the same code, so there is one builder.
- **The room:** a challenge is a routine of steps. Each step names an existing game style or activity stage. It is hosted by `lab/src/live/` like any lesson, with a new `plays` entry in `rooms.js`.
- **The editor:** a "Challenge" panel in the studio's Inspector. It has one card per section, and each card can be switched off, for example to skip the mark scheme for Year 9.
- **AI:** an `AI_SPECS` entry in `js/ai.js`, like Quiz studio's, which writes the whole JSON from: subject, exam board, command word, topic, year group and common mistakes. Its guardrails:
  - **Never invent sources.** Examiner quotes, mark-scheme examples and the "wrong ideas" percentages must be real, so AI leaves those fields empty and marked "add a source". It can fill the other fields.
  - **A worked answer must actually answer the question,** the same rule as the activities' "a worked example must hold the example".
  - **A, B and C must differ the way the method says:** A misses the point, B has points without links, C has the links.

## 5. How a teacher would use it

1. The **Challenges** studio → New, or "Make a challenge" on any slide.
2. Type keywords, a topic or a course overview. The studio finds the matching Nodes stage, for example GCSE CS, Describe.
3. Press **Write it with AI**, or fill the cards. The slides appear as the cards fill.
4. Present. Host live turns every section into a phone moment, and a section with nothing to do on phones stays a slide.

## 6. Build order

Each step works on its own and can be pushed on its own.

1. **The data type and the slide builder in the app.** Port the offline builder into `lab/src/nodes/`, and check that the four shipped Nodes decks rebuild identically. This is the riskiest step, so it goes first.
2. **The editor:** the Challenge panel, one card per section, editing redraws.
3. **AI drafting,** with the source guardrail.
4. **Live moments,** a few at a time: Join it up (order), Breakdown (sort) and Students' answers (choice then text) first, as they are the heart of the method; then the routine stages and the ladder.
5. **The Teacher Presenter view:** stuck-by-operation, for this class.
6. **Challenges in Browse,** next to games and activities, starting with the existing Nodes stages.

## 7. Decisions

1. **Its own studio,** a fourth tab beside Lesson studio, Quiz studio and Activities (decided 13 October). That gives it creative freedom in presentation and UX: its own panels and its own wall and phone designs. It still reuses the room, the phone inputs and the activity stages underneath (section 3).
2. **Real stage data from Nodes, AI for the rest** (decided 13 October). The teacher types keywords, a topic or a course overview of what students should learn:
   - **Match:** the studio matches it to a Nodes framework stage (the six on the-teaching-model site: gcse-cs, critical-text, china-it, sg-computing, technical-analysis, growth-model).
   - **Real data:** it takes that stage's data as Nodes holds it, including recall, routine, join, Students A, B and C, ladder, marks, readings and sources.
   - **AI:** only adapts it to the topic and writes what has no source, never the cited fields.
   - **The way in already exists:** the Nodes app's `tools/export-stage-lesson.ts` exports one stage as exactly this JSON.
   - **What's needed:** to serve that export from the site, a small JSON route in the Nodes app such as `/api/stage/<framework>/<n>`. The site has no API route for it today. That change is in the Nodes repository, not SlideForge.

## 8. Open questions

1. **When nothing matches:** when the keywords match no Nodes stage, does AI draft the whole stage, with the cited fields left as "add a source", or does the studio say there's no stage yet?
2. **Which frameworks first?** GCSE Computer Science and Critical Text have decks already.
3. **Student copies:** keep the teacher and student versions (like the CPU lesson's two copies) as one challenge with a switch?

## Change log

- 13 October 2026: plan written. Later the same day: decided on its own studio, and on real stage data from Nodes (the exporter, served as a JSON route), with AI writing only what has no source.
