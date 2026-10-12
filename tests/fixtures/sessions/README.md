# Recorded live sessions (M0.2)

Real message logs from the classic live host, one JSON file per scenario.
They are the replay fixtures for M7 onward (docs/lab-engine-plan.md, M0.2):
the replay test feeds a recording into the lab host and compares what it sends
with `host` below, normalising ids and timestamps itself. **Nothing in these
files is normalised.**

## How they are recorded

From the host side only (hard rule 5). `tools/record-sessions/record.mjs`
starts the unmodified relay (`server/server.js`, through `tests/harness.js`)
on a free port with a throwaway session directory, opens the classic host
(`index.html`) in Playwright, and loads `tools/record-sessions/tap.js` into the
page with `addInitScript`. The tap wraps `WebSocket` and `BroadcastChannel`
and reports every frame; it changes nothing on the wire.

The host is driven through the app's own API: `SF.Live.host` with a deck built
by the app's factories, `SF.Live.begin`, `SF.Player.next` (so the live gate
decides reveal, lock, split or advance exactly as a Next press would),
`SF.Live.stop`. Teacher entry goes through a real `manual.html#<key>` page
on the `sf-manual-<key>` channel, using manual.html's own command shape.
Phones are raw sockets speaking join.html's side (`tools/record-sessions/phone.mjs`).
At the end the session journal is read through the relay's existing
`GET /api/sessions/<id>` with the token the host was handed in `hosted`.

## Re-recording

```
node tools/record-sessions/record.mjs                 # every scenario (about 20 minutes)
node tools/record-sessions/record.mjs game-choice     # one, by name
node tools/record-sessions/record.mjs --list          # names and descriptions
```

Never port 8787: the recorder takes a free port and its own relay, so it does
not disturb a running local server. The README table is rewritten after every
run. Re-record after any change to `js/live.js`, `server/server.js`,
`join.html`, `manual.html` or a style's compiled slide fields, and review the
diff: a changed frame is a protocol change.

## File shape

| Field | What it holds |
| --- | --- |
| `scenario`, `kind`, `covers`, `description` | What was recorded |
| `deck` | What `build` hosted (format, style, mode, slide list) |
| `coverage` | Counts taken from the logs below (the table) |
| `steps` | What the recorder did, and when (`next`, `question up`, `manual:answer`, …) |
| `host` | **Every host WebSocket frame**: `{ms, seq, conn, dir: connect/open/send/recv/close, data}` |
| `window` | Every `sf-*` BroadcastChannel message, once as posted (`dir: post`, `page` says who) and once as heard by the host (`dir: recv` on index.html). A post identical to the previous post on the same page and channel is stored as `{"$repeat": true}`: the host re-posts its unchanged `sf-manual-state` after every relay frame |
| `otherPages` | Frames from any other page the app opened (Teacher Presenter) |
| `phones` | Each phone's frames, by name: `{ms, conn, dir, data}`. `locked`, `result`, `sprintMark` live here |
| `journal` | `{status, body}` of `GET /api/sessions/<id>` after `end` |
| `notes`, `pageErrors` | Anything the recorder could not do, and page errors |

`ms` is milliseconds since the scenario started, on one clock for page and
phones. `seq` orders host frames within the page.

## What each recording holds

| Scenario | Phones | Questions | Answers | Locked | Reconnect | manualAnswer | manualError | Prompts/replies | Sprint/marks (K29) | Teams | Rounds | Journal (attendance / checks / feedback) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `game-choice` | 4 | 3 | 9 | 9 | yes | 2 | 1 | —/— | —/— | — | 1 | 4 / 3 / 0 |
| `game-truefalse` | 4 | 3 | 9 | 9 | yes | 2 | 1 | —/— | —/— | — | 1 | 4 / 3 / 0 |
| `game-type` | 4 | 3 | 9 | 9 | yes | 2 | 1 | —/— | —/— | — | 1 | 4 / 3 / 0 |
| `game-slider` | 4 | 2 | 6 | 6 | yes | 2 | 1 | —/— | —/— | — | 1 | 4 / 2 / 0 |
| `game-true-false` | 4 | 3 | 12 | 9 | yes | 2 | 1 | —/— | —/— | — | 1 | 4 / 3 / 0 |
| `game-low-stakes-quiz` | 3 | — | — | — | — | — | — | —/— | —/— | — | 1 | 4 / 0 / 0 |
| `game-quiz-bowl` | 3 | — | — | — | — | — | — | —/— | —/— | yes | 1 | 4 / 0 / 0 |
| `game-beat-the-clock` | 4 | — | — | — | yes | — | — | —/— | 1/7 | — | 1 | 3 / 0 / 0 |
| `game-boss-battle` | 4 | 4 | 12 | 12 | yes | 2 | 1 | —/— | —/— | yes | 1 | 4 / 4 / 0 |
| `game-horse-race` | 4 | 5 | 15 | 15 | yes | 2 | 1 | —/— | —/— | yes | 1 | 4 / 5 / 0 |
| `game-memory-flip` | 3 | — | — | — | — | — | — | —/— | —/— | — | 1 | 4 / 0 / 0 |
| `game-memory-match` | 3 | — | — | — | — | — | — | —/— | —/— | yes | 1 | 4 / 0 / 0 |
| `game-knowledge-flip` | 3 | — | — | — | — | — | — | —/— | —/— | — | 1 | 4 / 0 / 0 |
| `game-definition-challenge` | 4 | 6 | 9 | 9 | yes | 2 | 2 | —/— | —/— | — | 1 | 4 / 3 / 0 |
| `game-emoji-guess` | 4 | 3 | 9 | 9 | yes | 2 | 1 | —/— | —/— | — | 1 | 4 / 3 / 0 |
| `game-word-reveal` | 4 | 2 | 6 | 6 | yes | 2 | 1 | —/— | —/— | — | 1 | 4 / 2 / 0 |
| `game-fill-in-the-blanks` | 4 | 3 | 9 | 9 | yes | 2 | 1 | —/— | —/— | — | 1 | 4 / 3 / 0 |
| `game-heads-up` | 4 | 3 | — | — | yes | — | — | —/— | —/— | — | 1 | 4 / 3 / 0 |
| `game-spin-explain` | 4 | 3 | — | — | yes | — | — | —/— | —/— | — | 1 | 4 / 3 / 0 |
| `game-spot-the-error` | 4 | 4 | 12 | 12 | yes | 2 | 1 | —/— | —/— | — | 1 | 4 / 4 / 0 |
| `game-ranking` | 4 | 2 | 6 | 6 | yes | 2 | 1 | —/— | —/— | — | 1 | 4 / 2 / 0 |
| `game-odd-one-out` | 4 | 4 | 12 | 12 | yes | 2 | 1 | 4/12 | —/— | — | 1 | 4 / 4 / 4 |
| `game-predict-outcome` | 4 | 2 | 6 | 6 | yes | 2 | 1 | —/— | —/— | — | 1 | 4 / 2 / 0 |
| `game-time-traveler` | 4 | 3 | 9 | 9 | yes | 2 | 1 | —/— | —/— | — | 1 | 4 / 3 / 0 |
| `game-connection-maker` | 4 | 2 | — | — | yes | — | — | 2/5 | —/— | — | 1 | 4 / 2 / 2 |
| `game-random-challenge` | 4 | 2 | — | — | yes | — | — | —/— | —/— | — | 1 | 4 / 2 / 0 |
| `game-concept-chain` | 3 | — | — | — | — | — | — | 4/12 | —/— | — | 1 | 4 / 0 / 4 |
| `game-bingo` | 3 | — | — | — | — | — | — | —/— | —/— | yes | 1 | 4 / 0 / 0 |
| `game-compare-contrast` | 4 | 4 | 12 | 11 | yes | 2 | 1 | —/— | —/— | — | 1 | 4 / 4 / 0 |
| `game-question-cube` | 4 | 6 | — | — | yes | — | — | —/— | —/— | — | 1 | 4 / 6 / 0 |
| `game-choice-teams` | 4 | 3 | 9 | 9 | yes | 2 | 1 | —/— | —/— | yes | 1 | 4 / 3 / 0 |
| `game-beat-the-clock-wall-paced` | 4 | 3 | 9 | 9 | yes | 2 | 1 | —/— | —/— | — | 1 | 4 / 3 / 0 |
| `rounds-two-games` | 5 | 4 | 14 | 14 | yes | 2 | 1 | —/— | —/— | — | 2 | 5 / 4 / 0 |
| `feedback-poll` | 4 | — | — | — | yes | — | — | 1/3 | —/— | — | — | 4 / 0 / 1 |
| `feedback-wordcloud` | 4 | — | — | — | yes | — | — | 1/3 | —/— | — | — | 4 / 0 / 1 |
| `feedback-brainstorm` | 4 | — | — | — | yes | — | — | 1/3 | —/— | — | — | 4 / 0 / 1 |
| `feedback-scale` | 4 | — | — | — | yes | — | — | 1/3 | —/— | — | — | 4 / 0 / 1 |
| `feedback-quick-poll` | 4 | — | — | — | yes | — | — | 2/6 | —/— | — | — | 4 / 0 / 2 |
| `activity-think-pair-share` | 4 | — | — | — | yes | — | — | 1/3 | —/— | — | — | 4 / 0 / 1 |
| `activity-structured-reflection-protocol` | 4 | — | — | — | yes | — | — | 1/3 | —/— | — | — | 4 / 0 / 1 |
| `activity-word-splash` | 4 | — | — | — | yes | — | — | 1/3 | —/— | — | — | 4 / 0 / 1 |
| `activity-reflection-ladder` | 4 | — | — | — | yes | — | — | 1/3 | —/— | — | — | 4 / 0 / 1 |
| `activity-exit-ticket` | 4 | — | — | — | yes | — | — | 1/3 | —/— | — | — | 4 / 0 / 1 |
| `activity-hook-and-predict` | 4 | — | — | — | yes | — | — | 1/3 | —/— | — | — | 4 / 0 / 1 |
| `activity-muddiest-point` | 4 | — | — | — | yes | — | — | 1/3 | —/— | — | — | 4 / 0 / 1 |
| `activity-do-now-bell-ringer` | 3 | — | — | — | — | — | — | —/— | —/— | — | — | 4 / 0 / 0 |
| `activity-jigsaw-expert-groups` | 3 | — | — | — | — | — | — | —/— | —/— | — | — | 4 / 0 / 0 |
| `activity-socratic-seminar` | 3 | — | — | — | — | — | — | —/— | —/— | — | — | 4 / 0 / 0 |
| `activity-flipped-instruction` | 3 | — | — | — | — | — | — | —/— | —/— | — | — | 4 / 0 / 0 |
| `activity-think-pair-square-share` | 4 | — | — | — | yes | — | — | 1/3 | —/— | — | — | 4 / 0 / 1 |

## Scenarios

- **`game-choice`** (game). Game format "choice" (engine choice) from its showcase starter: 3 phones, Bo reconnects on Q1, teacher-entered learner answered by key, journal.
- **`game-truefalse`** (game). Game format "truefalse" (engine truefalse) from its showcase starter: 3 phones, Bo reconnects on Q1, teacher-entered learner answered by key, journal.
- **`game-type`** (game). Game format "type" (engine type) from its showcase starter: 3 phones, Bo reconnects on Q1, teacher-entered learner answered by key, journal.
- **`game-slider`** (game). Game format "slider" (engine slider) from its showcase starter: 3 phones, Bo reconnects on Q1, teacher-entered learner answered by key, journal.
- **`game-true-false`** (game). Game format "true-false" (engine truefalse) from its showcase starter: 3 phones, Bo reconnects on Q1, teacher-entered learner answered by key, journal.
- **`game-low-stakes-quiz`** (game). Game format "low-stakes-quiz" (engine lowstakes) from its showcase starter: 3 phones, Bo reconnects on Q1, teacher-entered learner answered by key, journal.
- **`game-quiz-bowl`** (game). Game format "quiz-bowl" (engine bowl) from its showcase starter: 3 phones, Bo reconnects on Q1, teacher-entered learner answered by key, journal.
- **`game-beat-the-clock`** (game). Beat the Clock, self-paced sprint (K29): the relay marks each phone's taps from the key the host hands it in `sprint`. No teacher-entered learner, because one turns the sprint off (js/live.js sprintSlide). Bo drops on sprint question 2 and rejoins.
- **`game-boss-battle`** (game). Game format "boss-battle" (engine boss) from its showcase starter: 3 phones, Bo reconnects on Q1, teacher-entered learner answered by key, journal.
- **`game-horse-race`** (game). Game format "horse-race" (engine race) from its showcase starter: 3 phones, Bo reconnects on Q1, teacher-entered learner answered by key, journal.
- **`game-memory-flip`** (game). Game format "memory-flip" (engine memoryflip) from its showcase starter: 3 phones, Bo reconnects on Q1, teacher-entered learner answered by key, journal.
- **`game-memory-match`** (game). Game format "memory-match" (engine memorymatch) from its showcase starter: 3 phones, Bo reconnects on Q1, teacher-entered learner answered by key, journal.
- **`game-knowledge-flip`** (game). Game format "knowledge-flip" (engine knowledgeflip) from its showcase starter: 3 phones, Bo reconnects on Q1, teacher-entered learner answered by key, journal.
- **`game-definition-challenge`** (game). Game format "definition-challenge" (engine definition) from its showcase starter: 3 phones, Bo reconnects on Q1, teacher-entered learner answered by key, journal.
- **`game-emoji-guess`** (game). Game format "emoji-guess" (engine emoji) from its showcase starter: 3 phones, Bo reconnects on Q1, teacher-entered learner answered by key, journal.
- **`game-word-reveal`** (game). Game format "word-reveal" (engine wordreveal) from its showcase starter: 3 phones, Bo reconnects on Q1, teacher-entered learner answered by key, journal.
- **`game-fill-in-the-blanks`** (game). Game format "fill-in-the-blanks" (engine fill) from its showcase starter: 3 phones, Bo reconnects on Q1, teacher-entered learner answered by key, journal.
- **`game-heads-up`** (game). Game format "heads-up" (engine headsup) from its showcase starter: 3 phones, Bo reconnects on Q1, teacher-entered learner answered by key, journal.
- **`game-spin-explain`** (game). Game format "spin-explain" (engine spinexplain) from its showcase starter: 3 phones, Bo reconnects on Q1, teacher-entered learner answered by key, journal.
- **`game-spot-the-error`** (game). Game format "spot-the-error" (engine spot) from its showcase starter: 3 phones, Bo reconnects on Q1, teacher-entered learner answered by key, journal.
- **`game-ranking`** (game). Game format "ranking" (engine order) from its showcase starter: 3 phones, Bo reconnects on Q1, teacher-entered learner answered by key, journal.
- **`game-odd-one-out`** (game). Game format "odd-one-out" (engine oddone) from its showcase starter: 3 phones, Bo reconnects on Q1, teacher-entered learner answered by key, journal.
- **`game-predict-outcome`** (game). Game format "predict-outcome" (engine choice) from its showcase starter: 3 phones, Bo reconnects on Q1, teacher-entered learner answered by key, journal.
- **`game-time-traveler`** (game). Game format "time-traveler" (engine slider) from its showcase starter: 3 phones, Bo reconnects on Q1, teacher-entered learner answered by key, journal.
- **`game-connection-maker`** (game). Game format "connection-maker" (engine connection) from its showcase starter: 3 phones, Bo reconnects on Q1, teacher-entered learner answered by key, journal.
- **`game-random-challenge`** (game). Game format "random-challenge" (engine randomchallenge) from its showcase starter: 3 phones, Bo reconnects on Q1, teacher-entered learner answered by key, journal.
- **`game-concept-chain`** (game). Game format "concept-chain" (engine conceptchain) from its showcase starter: 3 phones, Bo reconnects on Q1, teacher-entered learner answered by key, journal.
- **`game-bingo`** (game). Game format "bingo" (engine bingo) from its showcase starter: 3 phones, Bo reconnects on Q1, teacher-entered learner answered by key, journal.
- **`game-compare-contrast`** (game). Game format "compare-contrast" (engine compare) from its showcase starter: 3 phones, Bo reconnects on Q1, teacher-entered learner answered by key, journal.
- **`game-question-cube`** (game). Game format "question-cube" (engine randomchallenge) from its showcase starter: 3 phones, Bo reconnects on Q1, teacher-entered learner answered by key, journal.
- **`game-choice-teams`** (game). Multiple choice in a two-team room: phones are refused an untagged join and rejoin with a team; the teacher-entered learner is added to team 0.
- **`game-beat-the-clock-wall-paced`** (game). Beat the Clock with a teacher-entered learner in the room, which keeps it wall-paced (no sprint): questions, manualAnswer and reconnect as for the other styles.
- **`rounds-two-games`** (rounds). A deck holding two games (choice, then true/false): `round` per game. Eve joins after the first question has opened, is held (`waiting`), and is admitted when round 2 opens.
- **`feedback-poll`** (feedback). An authored poll on a content slide: the prompt opens as the slide comes up, three phones reply, Bo drops while it is open and rejoins (the prompt and his reply are handed back), the teacher-entered learner is in the room, journal.
- **`feedback-wordcloud`** (feedback). An authored wordcloud on a content slide: the prompt opens as the slide comes up, three phones reply, Bo drops while it is open and rejoins (the prompt and his reply are handed back), the teacher-entered learner is in the room, journal.
- **`feedback-brainstorm`** (feedback). An authored brainstorm on a content slide: the prompt opens as the slide comes up, three phones reply, Bo drops while it is open and rejoins (the prompt and his reply are handed back), the teacher-entered learner is in the room, journal.
- **`feedback-scale`** (feedback). An authored scale on a content slide: the prompt opens as the slide comes up, three phones reply, Bo drops while it is open and rejoins (the prompt and his reply are handed back), the teacher-entered learner is in the room, journal.
- **`feedback-quick-poll`** (feedback). Impromptu quick poll and quick word cloud (SF.Player.quickPoll), asked over a plain deck mid-lesson and ended by the teacher.
- **`activity-think-pair-share`** (activity). Activity "think-pair-share" from SF.Activities.makeSlides, stepped through stage by stage with three phones answering whatever it asks (notes, replies), Bo dropping on its first prompt, the teacher-entered learner in the room, journal.
- **`activity-structured-reflection-protocol`** (activity). Activity "structured-reflection-protocol" from SF.Activities.makeSlides, stepped through stage by stage with three phones answering whatever it asks (notes, replies), Bo dropping on its first prompt, the teacher-entered learner in the room, journal.
- **`activity-word-splash`** (activity). Activity "word-splash" from SF.Activities.makeSlides, stepped through stage by stage with three phones answering whatever it asks (notes, replies), Bo dropping on its first prompt, the teacher-entered learner in the room, journal.
- **`activity-reflection-ladder`** (activity). Activity "reflection-ladder" from SF.Activities.makeSlides, stepped through stage by stage with three phones answering whatever it asks (notes, replies), Bo dropping on its first prompt, the teacher-entered learner in the room, journal.
- **`activity-exit-ticket`** (activity). Activity "exit-ticket" from SF.Activities.makeSlides, stepped through stage by stage with three phones answering whatever it asks (notes, replies), Bo dropping on its first prompt, the teacher-entered learner in the room, journal.
- **`activity-hook-and-predict`** (activity). Activity "hook-and-predict" from SF.Activities.makeSlides, stepped through stage by stage with three phones answering whatever it asks (notes, replies), Bo dropping on its first prompt, the teacher-entered learner in the room, journal.
- **`activity-muddiest-point`** (activity). Activity "muddiest-point" from SF.Activities.makeSlides, stepped through stage by stage with three phones answering whatever it asks (notes, replies), Bo dropping on its first prompt, the teacher-entered learner in the room, journal.
- **`activity-do-now-bell-ringer`** (activity). Activity "do-now-bell-ringer" from SF.Activities.makeSlides, stepped through stage by stage with three phones answering whatever it asks (notes, replies), Bo dropping on its first prompt, the teacher-entered learner in the room, journal.
- **`activity-jigsaw-expert-groups`** (activity). Activity "jigsaw-expert-groups" from SF.Activities.makeSlides, stepped through stage by stage with three phones answering whatever it asks (notes, replies), Bo dropping on its first prompt, the teacher-entered learner in the room, journal.
- **`activity-socratic-seminar`** (activity). Activity "socratic-seminar" from SF.Activities.makeSlides, stepped through stage by stage with three phones answering whatever it asks (notes, replies), Bo dropping on its first prompt, the teacher-entered learner in the room, journal.
- **`activity-flipped-instruction`** (activity). Activity "flipped-instruction" from SF.Activities.makeSlides, stepped through stage by stage with three phones answering whatever it asks (notes, replies), Bo dropping on its first prompt, the teacher-entered learner in the room, journal.
- **`activity-think-pair-square-share`** (activity). Activity "think-pair-square-share" from SF.Activities.makeSlides, stepped through stage by stage with three phones answering whatever it asks (notes, replies), Bo dropping on its first prompt, the teacher-entered learner in the room, journal.

## Not recorded yet


