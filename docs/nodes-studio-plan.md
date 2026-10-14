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
| **Label the parts** | A worked answer's parts mixed up; sort each into Point, Explained, So or Because; then the breakdown in order | `sort` | What a complete answer is made of |
| **Same word, different links** | One command word in three questions, each needing a different relationship; match each to its link | `sort` | Linkage matched to the task |
| **Before, during, after** | The three questions of an attempt: what to bring together, how it forms an answer, what is missing | private note per point | Answer construction, made visible |
| **Model marks** | Rank model answers and mark each against the scheme table; then mark their own | `order`, scale | How the marks fall |
| **Framework** (built) | The map of every stage, recall, then each stage with a scaffold for its backbone, then the map again: Technical Analysis (16) or the GCSE CS ladder (13) | per stage | The framework: Technical Analysis (16 nodes) and the GCSE CS ladder (13) |

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

### Against the Nodes evidence (checked 13 October)

The Nodes app (`~/Desktop/Nodes`: the deck's seven findings, `src/data/research/research.json`, `answers-review.ts`, `answer-routine.ts`, `stage-ladders.ts`, `distinctions.ts`, `relationships.ts`, `research-roadmap.ts`) makes 46 findings and recommendations. The formats cover most; these are not covered yet, most central first:

1. **Done (14 October)** · **Support is not understanding** (Study 2; the taught-linkage checklist's two "Not found" items: progressively less support, and checking independent use). Build the **Missing-link ladder**: attempt, neutral prompt, partial hint, model, then an independent reattempt with the support hidden, and a delayed "come back later" check.
2. **Done (14 October)** · **Transfer:** 0 of 495 exam parts ask for strict transfer. A **Same link, new case** format: the stage's join, then a near item and a far item, unsupported.
3. **Done (14 October)** · **Two ideas treated as one:** 300 of 662 named wrong ideas. Build **Keep them apart** from `distinctions.ts`: the pair, the one test that tells them apart, then sort. It covers name vs value and agency words ("a register only holds").
4. **Done (14 October)** · **Read the marks, not the word:** Identify asked for more than a bare term in 35 of 54 parts, Explain in 0 of 16. Build **Size the answer**: command word plus marks gives the join's size.
5. **Understanding, not memory:** comprehension 305 against recall 71. A "say it, then break it" probe (own words, then a case where it fails) in the Framework's Understand stages or Keep them apart.
6. **Skill or knowledge:** paired A/B items (research.json `levers`). A "Two versions" format.
7. **Lever 2 (between, inclusive, or)** and **lever 3 (endpoints and zero, fenceposts, traces run to the end):** variants of Keep them apart and Which step broke?.
8. **The why from students** (examiners give it in 95 of 2,163): a **Choose and justify** format (choose, weigh the closest wrong option, justify, repair with no options).
9. **Confidence** before and after (Before, during, after), and **Watch out for** recurring wrong ideas in Three answers' feedback.
10. **More relationships** in Same word, different links: sequence, context, comparison and judgement as well (`relationships.ts`).

Built on 14 October: Missing-link ladder (attempt, rungs, a reattempt with the support hidden, and a come-back-later check), Same link new case (near and far, unsupported), Keep them apart (from `distinctions.ts`), and Size the answer (command word and marks). Each has Write it with AI.

Fixed on 13 October: Which step broke? now uses the Nodes answer routine's own steps (Decode, Retrieve, Reason, Refine, Review) and shows each step's share of the 2,191 mistakes (24, 46, 7, 8, 14%).

Most counts are model-coded; none of the 2,191 findings has been checked by a teacher yet, and the ladders, distinctions and relationship tags are drafts untested with students.

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

0. **Done (13 October):** the Nodes tab, after Activities. It first copied in the shipped Nodes decks; step 1 replaced that with the formats.
1. **Done (13 October): the format system and the first three formats,** in our style: Join it up, Three answers, Which step broke? (`lab/src/designs/nodes/`). Each is drawn in the Nodes decks' own illustrated language (`designs/nodes/look.ts`: rounded cards, pills, chains of boxes joined by arrows, badges, element dots, answer tabs, cards with an accent bar) in the lesson's theme, the links in Nodes' colours; each has an ask slide and its reveal slides, and marks them `slide.nodes = { id, format, role, content }`. The Nodes tab's left pane is Browse for the formats (cards drawn in the lesson's theme), its empty screen offers the three, and a format added after another goes after the whole of it.
2. **Their side panel:** content and settings, with editing redrawing the slides. (Part done 13 October: the Nodes · <format> section on the Design tab.)
3. **Done (13 October): Write it with AI.** A topic, year group, what they get wrong and the class's constraints; one request per challenge (`lab/src/designs/nodesAI.ts`, through `SF.AI.generateJson`), checked against the format's shape, then its slides drawn again in place. A Framework sends only its stages' names and questions and gets the recall and a task per stage back; the stages' own questions, outcomes and backbones stay Nodes'. Tested on the CPU key: Join it up in 3.4 s, a 16-stage Framework (19 slides) in 5.4 s.
4. **Done (14 October): their room.** Each format's ask slide is a room question and its reveal the answer (`marked()` in `designs/nodes/types.ts`, each challenge with its own question key):
   - **Ranking:** Join it up, Model marks, and Label the parts when it has more than three roles (put the worked answer back in order). A Nodes Ranking is worth its points (share in place × 1000), not classic's 10.
   - **Sort into three columns:** Keep them apart (its two ideas with a middle "Both"), Same word, Size the answer, Label the parts with up to three roles.
   - **Choice:** Three answers (the strongest), Which step broke?
   - **One written answer:** the ladder's attempt and reattempt, a new case's near and far, Before during after's routine, each Framework stage. A challenge whose content falls outside what the relay carries (3–8 to rank, 2–10 to sort) takes a written answer instead.
   - The phones are told right or wrong and then the right answer itself (a Ranking's order, a line per place; a sort's columns with their statements; a choice's answer and why). The reveal slide is the Nodes reveal, and the scores add up across challenges.
   - **The teacher's copy:** every question slide's speaker notes carry its answer under THE ANSWER, taken from the slides that reveal it, so Teacher Presenter and notes on another device show it before the class sees it. Tests: `lab/tests/nodes-room.test.ts`, `node tools/smoke/run.mjs nodes-room` (two phones through the relay).
   - **Without phones** the slides work as they are: the ask slide is the question, the reveal slide the answer, built click by click. A show opened with no room changes each Nodes slide's "On phones" cue into its own cue for a class without phones: "Hands up · A, B or C" or "Hands up · which step?", otherwise "On paper" and the same task (`withoutPhones` in `show/steps.ts`, from `slide.nodes.paper`). Same link, new case ends on both cases worked through, and every Framework stage writes its model answer into its own scaffold, a part per slot and a click each: under each box of a chain, beside each step of working, in each side of a comparison, under each challenge (`slotsOf` in `designs/nodes/framework.ts`). The AI writes these too, a part per slot. Every other format shows its answers in its question's own layout too: Size the answer and Same word fill their reveal's boxes, the ladder answers its question and its later task as rows of its relation, Same link new case writes each case's working into the link's chain, and Before during after ends on its three cards answered. Join it up, Keep them apart, Label the parts, Which step broke?, Three answers and Model marks already did.
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

- 14 October 2026: answers in the teacher's notes on every question slide, and the right answer on each phone after a reveal.
- 14 October 2026: answers for every format in its question's layout (Size the answer, Same word, ladder, new case, before during after), in the starters and from the AI.
- 14 October 2026: Framework model answers moved into each stage's scaffold, a part per slot.
- 14 October 2026: without phones: worked answers for Same link, new case, a model answer per Framework stage (both starters, and AI-written), and a hands-up or on-paper cue in a show with no room.
- 14 October 2026: step 4 built: every format plays in the room, marked and scored. Model marks' AI writes what earns each mark, never a weak answer.
- 13 October 2026: plan written. Later the same day: the Framework, Label the parts, Same word different links, Before during after, and Model marks formats built; the Nodes tab (step 0); redirected to Nodes formats custom built like games and activities, in our own styles, rather than copying the Nodes decks; step 1 built (the first three formats); the extra activities and the scaffolding challenge added; decided on its own studio, and on real stage data from Nodes (the exporter, served as a JSON route), with AI writing only what has no source.
