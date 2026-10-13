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

**Nodes formats, custom built like the games and activities.** We take the Nodes engine and method, not the Nodes decks' look:
- **The engine:** the command word, the relationship the answer must make, the answer routine, the three answers, the missing-link ladder, the SOLO levels and the framework of nodes.
- **The look:** each format is a design in our own style system, as every game and activity is. It is drawn in the lesson's own theme by the shared kit (`lab/src/designs/engage/kit.ts`), with its parts ordinary layers that are edited on the slide.

Each format has what a game or an activity has:
- **A design** for the wall: `(style, content) => slides`, in the lesson's theme.
- **A card in the Nodes tab's Browse,** pictured in the lesson's style, with how it runs and Add.
- **Settings and content** in the side panel: the question, the links, the answers, the hints, and the timing.
- **Write it with AI,** from a topic, with the guardrails in section 4.
- **A room:** what the phones do and what the wall shows back, on the existing phone screens (section 3).

The Nodes decks themselves (the CPU lesson, Critical Text 3, Describe) stay in the Library as finished lessons, and as the examples the formats are modelled on. They are not copied in by the Nodes tab.

### The formats

| Format | What students do | Phone | Engine part it teaches |
|---|---|---|---|
| **Join it up** | Build the chain the question needs (point → because → so → in this case) | `order` or `fill` | The relationship required |
| **Breakdown** | Label each unit of a worked answer | `sort` | What a complete answer is made of |
| **Three answers** | Pick the strongest of A, B and C, then say why | `choice`, then `text` | Weak, stable and excellent |
| **Which step broke?** | Tap the operation where a wrong answer failed | `choice` | The answer routine (Decode, Retrieve, Reason, Express, Check) |
| **Missing-link ladder** | Attempt, then take the next rung only if needed: probe, hint, model, new task | `text`, the help signal | Support is not understanding |
| **Keep them apart** | Sort statements between two confusable terms | `sort` | Two ideas treated as one |
| **Level it** | Rate an answer's SOLO level | `choice` | The gap is a jump |
| **Size the answer** | From the command word and marks: how many points, of what kind | `number`, `choice` | Command words |
| **Mark it** | Peer-mark A, B and C with the mark scheme | scale | How the marks fall |
| **Scaffold** | Work through every node of a framework on one topic, node by node, the wall showing the class on the map | per node | The framework: Technical Analysis (16 nodes) and the GCSE CS ladder (13) |

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

### More things students can do, from the Nodes talk and decks

Section 3 covers each stage section. The talk's findings suggest more, all on existing phone screens:

| Activity | From | On the phone | Reuses |
|---|---|---|---|
| **Which step broke?** A wrong answer on the wall; students tap the operation that failed (Decode, Retrieve, Reason, Express, Check) | The answer routine; Finding 1 (most mistakes are not wrong ideas) | Tap one of five | `choice`, held results |
| **Keep them apart:** two confusable terms (registers and the control unit, RAM and main memory); sort statements to the right one | Finding 3 (two ideas treated as one) | Sort into two columns | `sort` |
| **Level it:** rate an answer's SOLO level (one point, several points, linked) | Finding 4 (the gap is a jump); the Analysis tab | Pick a level | `choice` or scale |
| **Refused or credited?** Short answers that an examiner refuses or credits, and why | Refused without it | True or false, then why | `truefalse`, `text` |
| **Write the examiner's why:** students write the feedback examiners rarely give, for answer B | Finding 7 (examiners almost never say why) | Typed feedback; the best ones spotlighted | `text`, spotlight |
| **Size the answer:** from the command word and the marks, how many points, and what kind | Finding 5 (command words promise less) | A number, then a choice | `number`, `choice` |
| **How sure are you?** Confidence before the reveal, compared with the result after | How sure can we be? | Sure or not sure | the phone's sure row |
| **Mark it:** peer-mark answers A, B and C with the mark scheme | Mark scheme | 0 to 3 for each | scale |
| **One topic, three systems:** the same question as the UK, Singapore and China ask it; spot what each wants | One topic, three systems | Match the question to the system | `sort` |
| **Repair later:** the same relationship, asked again lessons later without the ladder | The ladder's repair | Typed answer | `text`, Reports |

### The scaffolding challenge: every node, on one topic

A challenge that runs the **whole framework** on one topic, not one stage, for example all 16 nodes of Technical Analysis on "the CPU":

> Term → Features → Process → Context → Data → Trace → Design → Represent → Build → Test → Pros and cons → Compare → Impacts → Judge → Transfer → Review

(or the GCSE CS ladder's 13, Define to Refine).

- **On the wall:** the framework's own map (the serpentine 4×4, or the SOLO ladder) with the class's progress on each node: how many have passed it, and where they are stuck. Seeing the bottleneck node is the point.
- **On the phone:** one node at a time, with that node's task. A node unlocks when the one before is done (self-paced, like Beat the Clock's sprint), or when the teacher moves the class on. Each node offers its ladder's hint after a wrong try.
- **AI generates it:** the teacher types a topic, a keyword or a course overview. The node definitions, their command words and what each asks for come from Nodes (real data). AI writes the 16 topic-specific tasks, model answers and hints, which the teacher checks before presenting.
- **In the Teacher Presenter and Reports:** each student's furthest node and the node where most of the class stopped, which is the next lesson's starting point.

## 4. Where it lives in the code

Following the games and activities exactly:

- **The formats:** `lab/src/designs/nodes/`, one file per format. Each exports its design `(st: LayoutStyle, content) => Slide[]`, built with the engage kit, and a starter `content`. They are listed in a `NODES` table, as `GAMES` lists the games (`designs/engage/formats.ts`).
- **On the slide:** `slide.nodes = { format, role, settings, content }`, as a game carries `slide.game`. The Nodes tab shows the slides that have it.
- **Browse:** the Nodes tab's left pane becomes Browse for the formats. It has cards drawn in the lesson's style, filters (by engine part, by phase), and Add, using `Browse.tsx`'s own machinery.
- **The side panel:** each format's content and settings, like a game's (`designs/gameSettings.ts`).
- **The room:** each format plays through `lab/src/live/`, with a `plays` declaration, using the existing phone inputs (no relay or phone-page change).
- **AI:** `AI_SPECS` entries in `js/ai.js`, one per format, written from a topic. Where a Nodes stage matches, its real data comes from the Nodes export (section 7). Guardrails:
  - **Never invent sources:** examiner quotes, mark-scheme examples and the "wrong ideas" percentages stay "add a source".
  - **A worked answer must actually answer the question.**
  - **A, B and C must differ as the method says:** A misses the point, B has points without links, C has the links.

## 5. How a teacher would use it

1. The **Challenges** studio → New, or "Make a challenge" on any slide.
2. Type keywords, a topic or a course overview. The studio finds the matching Nodes stage, for example GCSE CS, Describe.
3. Press **Write it with AI**, or fill the cards. The slides appear as the cards fill.
4. Present. Host live turns every section into a phone moment, and a section with nothing to do on phones stays a slide.

## 6. Build order

Each step works on its own and can be pushed on its own.

0. **Done (13 October):** the Nodes tab, after Activities. For now it copies in the shipped Nodes decks; step 1 replaces that with the formats.
1. **The format system and the first three formats,** in our style: Join it up, Three answers, Which step broke? This covers `slide.nodes`, the `NODES` table, Browse in the Nodes tab (cards drawn in the lesson's theme), and Add.
2. **Their side panel:** content and settings, with editing redrawing the slides.
3. **Write it with AI** for them.
4. **Their room:** the phones and the wall's results.
5. **The rest of the formats:** Breakdown, Missing-link ladder, Keep them apart, Level it, Size the answer, Mark it.
6. **Scaffold:** every node of Technical Analysis (16) or the GCSE CS ladder (13) on one topic, AI-written from the real node definitions, with the class on the framework map.
7. **The Teacher Presenter and Reports:** stuck-by-operation and the bottleneck node, for this class.

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

- 13 October 2026: plan written. Later the same day: the Nodes tab (step 0); redirected to Nodes formats custom built like games and activities, in our own styles, rather than copying the Nodes decks; the extra activities and the scaffolding challenge added; decided on its own studio, and on real stage data from Nodes (the exporter, served as a JSON route), with AI writing only what has no source.
