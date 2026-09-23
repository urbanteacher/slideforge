# Games that do what they say, and activities that look like what they are — 23 September 2026

A proposal. The picture is in [mockups/game-activity-redesign.html](mockups/game-activity-redesign.html):
open it from the running app at `/docs/mockups/game-activity-redesign.html`.

## What is wrong now, measured

**Games.** The 11 September audit ([slideforge-games-audit.md](slideforge-games-audit.md))
already says it: six of the 27 formats are *thin presets*, where the name
promises one mechanic and the engine is a plain quiz. The 12 September review
([game-ux-review.md](game-ux-review.md)) ends with a list of gameplay "still
required". The clearest case, checked on the wall today:

- **Spot the Error** is multiple choice. The sentence sits in the question and
  the four answer buttons are its three suspect phrases plus "nothing is wrong".
  The buttons do the spotting, so nobody has to read the sentence looking for
  an error; they pick a letter.

**Activities.** Of the 54 in the catalogue, **42 render with the same
`keywords` layout**: a list of step names with a line of text beside each.
Think-Pair-Share, a jigsaw and Do Now look alike on the wall: four rows of
small print and one clock for the whole activity. Nothing shows which stage
the room is in, no stage has its own time, and the phones are idle.

## The principles

### For games

1. **The name is the mechanic.** If it is called Spot the Error, the only way
   to answer is to spot it. If a format cannot do what its name says, rename it
   until it can.
2. **The wall is a stage, not a form.** One big thing at a time: the passage,
   the track, the board. Options, letters and small print are phone furniture.
3. **Three beats per round: tension, reveal, reason.** The reveal is a
   *moment*: where the room was against where the answer is. Then the reason,
   in one sentence.
4. **Show the room to itself, never a person to the room.** Heat maps,
   distributions, pair counts, all anonymous. A tall wrong bar is a
   misconception with a name, and nobody was singled out to find it.
5. **The phone does the verb.** Tap the word, drag the order, place the
   number. It mirrors the shape on the wall, so looking up and looking down
   show the same thing.

### For activities

1. **An activity is a sequence of stages, and the wall says which one.** A
   stage track across the top, the current stage lit, and each stage with its
   own clock.
2. **The prompt is the biggest thing on the screen.** The steps are for the
   teacher, and they live in the presenter view.
3. **Phones have a job at each stage, or they are told to go down.** Think →
   a private note. Share → send one idea. Talk → "phones down, turn to your
   partner".
4. **The teacher moves the stages; the room sees them move.** Advance, add a
   minute, spotlight an idea: all from the presenter view.
5. **Each routine is recognisable.** A class should know it is Think-Pair-Share
   the moment it appears, the way they know a Kahoot lobby.

## The two picks

### Game: Spot the Error, "tap the error"

Chosen because it has the widest gap between name and mechanic, because error
analysis is one of the strongest things a class can do with a misconception,
and because its reveal is naturally the most gripping moment in any game here.

| | Now | Redesigned |
|---|---|---|
| **Wall, while answering** | Question text + four lettered options | The passage alone, large. "There is one error". "19 of 26 have tapped". Where they tapped stays hidden. |
| **Phone** | Four lettered buttons | The passage, split into tappable words. Tap one to mark it, change your mind, lock it in. |
| **Reveal** | Correct option turns green | A heat bar under every word: how many tapped it. The error is struck through, and the correction slides in beside it. One sentence on the likeliest wrong pick. |
| **Scoring** | Correct option | A tap inside the error's words scores. Optional speed bonus, as Beat the Clock has. |
| **Authoring** | Question + options + correct index | Type the sentence, *select the wrong words*, type the correction and a one-line reason. Two errors per passage allowed ("find both"). |

**How it fits the engine.** It's a new game style in `src/games/` (one file per
style, per the README), with its own phone input (`input: 'tap'`), a wall
layout drawn from the style, and the existing reveal path. The relay already
carries answers by slide id; a tap answer is a word index, which the host
marks against the error span. The heat map is the per-word count, drawn on the
reveal the way the tally bars are drawn now.

### Activity: Think-Pair-Share, staged and room-connected

Chosen because it runs in nearly every lesson, because today it is
indistinguishable from a glossary slide, and because most of the pieces it
needs already exist: moments have a clock, the room can answer a prompt, and
the presenter view can steer.

| Stage | Wall | Phone | Teacher (presenter view) |
|---|---|---|---|
| **Think** · 1:00 | Stage track, Think lit. The question, large. "Silent thinking". "19 of 26 have written something". | A private note: "Only you can see this". | Advance, or +30s |
| **Pair** · 2:00 | Pair lit. "Turn to your partner: compare, then agree your best example." | Their own note back, plus "What's different about your partner's?" | Advance |
| **Share** · 3:00 | Share lit. Pairs' ideas arrive as anonymous cards; one is spotlighted. | "Send your pair's strongest example". Goes to the teacher without a name. | Spotlight a card, hide one |
| **Connect** · 1:00 | Connect lit. The teacher's synthesis line, and the spotlighted idea beside it. | "Phones down". | Type or pick the synthesis |

**How it fits the engine.** It's a new `moment` presentation (`activityPresentation:
'stages'`) that reads the steps the catalogue already stores (label, minutes,
text), so every staged routine can use it later. Nothing new is needed in the
deck format beyond the stage index, which lives in the room state like the
floor does. The note and the pair's idea reuse the existing typed-prompt path;
the idea cards reuse the feedback digest, drawn as cards instead of a list.

**Once it exists, it spreads for free.** Think-Pair-Square-Share, Jigsaw, the
Carousel and the Socratic Seminar are the same shape with different stages.
That is roughly ten of the 42 activities that currently look like glossaries.

## What this does not decide

- **Scoring for Spot the Error.** Points, speed bonus, or no score at all:
  error analysis can be as good without a leaderboard. Default proposed: points
  on, speed off.
- **Whether Think-Pair-Share's Think note is ever seen by the teacher.** The
  mockup says it is private ("only you can see this"); only the Share idea
  reaches the teacher. Students write more honestly when that is true.
- **Anonymity of Share.** Proposed anonymous on the wall, and anonymous to the
  teacher too; the teacher sees *how many* pairs sent something.

## Build order and size

1. **Spot the Error, tap style** (M): the style file, phone tap input, wall
   passage layout, heat-map reveal, authoring (select the wrong words), a
   playbook entry, tests through the relay harness, a smoke scenario.
2. **Stages presentation for moments** (M): the stage track, per-stage clocks,
   teacher advance and +time, and phone states per stage.
3. **Think-Pair-Share on the stages presentation** (S–M): the private note,
   pair ideas as cards, spotlight.

The live-room parts (phone inputs, relay messages) touch `join.html`,
`js/live.js` and `server/server.js`, which the other agent also works in, so
each step lands as its own small commit.

## Built — 23 September 2026

**Spot the Error** shipped as designed, except for two errors per passage
(one error per sentence for now). Scoring is points without a speed bonus.

**Think-Pair-Share** runs on a new `activityPresentation: 'stages'`:

- **The stages are the rows the activity already stores.** "Think · 1 min"
  gives a name, a length and a phone job, all read from the label
  (`src/activities/stages.js`). Think → a private note; Pair or partner →
  talk; Share → send; anything else → phones down. Any staged routine can
  switch to it under the slide's *Visual structure* ("Timed stages, with
  phones"). Only Think-Pair-Share defaults to it.
- **Wall** (`layoutStages` in `js/render.js`, `js/stages.js`). A track across
  the top: the current stage lit in the theme's ink, past stages ticked. The
  live stage's prompt is the largest thing on the slide, and its clock runs
  for that stage alone. Before the first press, the wall shows the routine's
  name and length. Time up says "Time. Next: Pair" and never advances by
  itself. The whole-activity clock and the moments banner stand aside, so
  there is one clock, not two.
- **Stages are build steps.** Next, the presenter view and the phones follow
  one press. **+30s**: the `+` key on the wall, or the desk button "+30s
  Think".
- **Phones** (`join.html`): the stage, its own clock (sent as seconds left,
  since phone clocks differ), and the job.
  - **Think** is a private note saved on the phone only; it is never sent or
    counted.
  - **Pair** shows the note back to compare with a partner.
  - **Share** opens an anonymous one-idea brainstorm beside the slide. It
    closes when the stage ends.
  - **Connect** is "phones down".
- **Relay.** `stage` is a new field in the room's `at` context, cleaned field
  by field (`cleanStage`). A build step no longer sends a phone back to the
  wait screen while it is answering a prompt on the same slide.
- **Fixed on the way:** a timed slide's clock no longer sits under the room
  pane.
- **Tests:** `tests/stages.test.js` covers the parser, the jobs, the preset,
  and the relay's cleaning.
- **Not run:** the smoke suite, and not seen in the browser (low credits, by
  request). Still to do: spotlighting one idea, and a count of how many have
  written something during Think.

