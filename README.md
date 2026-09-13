# SlideForge

## Developing the model

The model source lives in `src/`: game definitions and scoring in `src/games/`,
starter content in `src/samples/`, and persistence in `src/storage.js`.
`js/model.js` is the generated compatibility bundle used by existing pages.
Edit the source, then run `npm run build`; include both source and bundle changes.

Use Node 22.12 or newer and `npm ci` to install development tools. `npm test`
checks that the bundle matches its source and runs the full test suite.
`npm run dev:build` rebuilds when source files change. `npm start` runs the relay.
The committed bundle still runs without installing tools or building first.
For browser smoke checks, run `npx playwright install chromium`, start the relay,
then run a `tools/smoke-*.mjs` script (set `SF_URL` to use a different port).

See [the modernization notes](docs/codebase-modernization.md) for the engine
contract, compatibility constraints, and remaining migration work.

## Customise and teach

**Logo & theme** at the top of the slide inspector opens presentation settings.
Upload a logo or load an http(s) image URL, choose Small/Medium/Large, and show it
on every slide, the first slide, or hide it. **Customise this slide → Text colour**
sets the default for that slide; selected-word colours remain available below.

The presentation HUD keeps Previous/Next, Draw, Blank, More and Exit on the main
bar. **More** contains labelled room, QR, response, teacher-entry, presenter,
fullscreen and keyboard actions. Unavailable live-only actions are disabled.
The HUD stays visible while hovered, keyboard-focused, or while More is open;
Escape closes More before exiting the show. Named answers are a projected view;
Teacher entry and Presenter view open separate instructor windows.

Select words in a slide title, subtitle, quotation or bullet field to reveal the
formatting toolbar: bold, italic, underline, highlight, colour and an http(s)
link. Cmd/Ctrl+B, I and U also work in those fields. Clear removes formatting
from the selection. Lesson text stays plain in learner views and exports;
formatting is saved separately in the deck. Table cells and paired glossary
fields retain their structured styling.

**Customise this slide** adds alignment, three text sizes, a background colour,
and previews of Bullets, Cards and Dual layouts using the current content.
Dual slides support **Swap sides**, image above/below text, 35/50/65 percent
image proportions, and horizontal/vertical crop focus. **Reset to theme** clears
custom colours, sizing and inline emphasis. Lesson studio **Undo / Redo** keeps
up to 60 edits for the open deck during this visit; it is not a disk version
history. Switching documents resets this history.

Enable **Reveal one point or row at a time** on supported layouts. During the
show, Next reveals a point before moving on; Previous hides the most recent
point. Learner excerpts follow the visible points. Presenter view keeps the
full slide available and reports how many points have been revealed.
**Draw and spotlight** in the HUD adds temporary drawing, a spotlight marker, ink undo/clear
and Show all points. Ink is cleared when the slide changes and is not exported.

### A classroom without phones

Start **Host live**, then **Teacher entry · no phones**. The private teacher
window accepts names, one per line, and a team assignment when the game uses
teams. A fallback link opens the controls in a separate tab. Keep this window
on the instructor display. The local relay is required, but learner devices and
internet accounts are not. Phone learners can participate in the same room.

Add participants between questions. For each choice, typed or slider question,
record their answer in the private window; change it or Clear answer before
**Reveal and score**. A room with teacher-entered participants has no automatic
countdown/reveal and awards equal points for correct answers, so typing speed
does not influence marks. After reveal, entries are locked. For shared team
responses use one representative entry per team; do not treat that response as
an individual assessment of every member.

Reports and CSV exports distinguish teacher entry from device participation;
teacher-entered rows have no device connection duration. Anonymous aggregate
entry, partial-credit marking and editing answers after reveal are not included.
Restart an already-running relay to load the teacher-entry protocol changes.


## Learner lesson companion

The QR opens `join.html?pin=…` with the PIN filled in. After joining, the
phone follows the instructor’s current slide automatically:

- **Content:** a readable title and excerpt, one optional **Got it** acknowledgment,
  **Need help**, and **Save for later**. Listening requires no tapping.
- **Knowledge check:** the question and answer labels, or the existing typed-answer
  / slider control, followed by confidence and the revealed explanation.
- **Audience feedback:** the poll, scale, word-cloud or brainstorm control takes
  over. The content reaction controls are hidden.
- **Q&A, pace and saved items:** utility panels preserve a draft while the lesson
  advances. Returning opens the latest activity, with a notice when it changes.
- **After the lesson:** **My saved slides** on the join page opens the learner’s
  private review list, even without an active room. These are title/excerpt
  snapshots stored in this browser, not full slide files or instructor reports.

The relay sends bounded, plain-text context to newly joined and reconnecting
learners without speaker notes or correct answers. Late arrivals held during a
quiz are admitted when the instructor returns to content or feedback. Reactions
are limited to one per person per content slide and respect the host toggle;
repeating a help toggle does not inflate a slide’s report count. Help indicators
reset when the slide changes. Existing moderation, confidence, session reporting
and Adapt analysis remain in place.

Run `node --test tests/*.test.js` for the full suite, including learner activity
transitions, context delivery, reconnection, admission and spam limits.


The lesson studio now includes a light editor, a sage-and-lilac **Studio** theme, a **Cards** layout, and an **Add activity** library. Open **Example lesson** to explore a six-slide teach → check → discuss → adapt sequence; your existing document stays available through **File → Open**.

The **Engagement** tab adds Bloom’s thinking levels, reusable discussion prompts and a private next-step planning note. Feedback can be previewed beside the slide or full screen using clearly labelled sample responses, without connecting students or a server. Knowledge checks created from the library default to no countdown or leaderboard.

Available activities include multiple choice, true/false, type answer, slider, poll, word cloud, brainstorm and scale. Low-stakes quiz, Beat the Clock, True/False Showdown and Horse Race are playable presets of existing engines. Other catalogue formats are explicitly labelled Planned. Feedback can appear beside the slide or full screen.

**+ Slide** (left rail) opens slide starters — opening title, title + content, keywords, italics, hyperlinks, dual coding, section break, full-bleed image, three cards, quote, and steps. After insert, the **Layout** picker stays in the right panel so you can change the shape. **Lesson logo** (Design & content) adds a corner mark on every slide or the title slide only. **File → Export → Practice notes (.md)** downloads a one-way Markdown handout for Canvas or Colab; live polls and games stay in the `.sfdeck.json` room.


Two engines in one browser app:

- **Presentation** — slides and content, run as a full-screen 16:9 slideshow.
- **Game** — teams, scoring and questions, run as a live quiz.

They are separate documents with separate editors. A presentation can **insert a
game** at any point; when the show reaches it, the game's questions play inline
and then the deck carries on.

```bash
node server/server.js
```

Then open **http://localhost:8787/**.

You can also double-click `index.html` — both editors and the slideshow work
straight off the filesystem. The only feature that needs the server is live
audience play, because the phones have to reach something.

---

## Live session reports (local / LAN)

Hosting now creates an append-only, synchronously flushed journal in
`.slideforge/sessions/` on the relay computer. It records joins, admission,
disconnect/rejoin intervals, quiz attempts, accepted answers, reveals and
feedback. This private folder is ignored by Git and blocked from static HTTP
access. `SLIDEFORGE_SESSION_DIR` can override its location.

Use **Reports** in the host toolbar to view session history and download:

- **Adapt notes (.md)** — the Adapt report as markdown, for pasting into next
  week's plan. See [The Adapt report](#the-adapt-report).
- **Attendance CSV** — names, teams, admission, connection time and participation.
- **Answers CSV** — eligible learners, responses, confidence, outcomes, timings and Bloom levels.
- **Full session JSON** — the complete structured report, including feedback and connection intervals.

Reports use a per-session access key kept in the originating host browser; there
are no internet accounts. Keep that browser's site data to reopen reports, and
export JSON for a portable copy. CSV cells are quoted and potential spreadsheet
formulas are neutralized. Names are self-reported, and connection duration is
not evidence of engagement or verified attendance.

Reports survive relay restarts. After an unexpected stop, a session is marked
**interrupted**, with durations bounded by the last journaled event. Live room
play itself does not resume after a relay restart; start a new session. A
student whose connection drops can use **Rejoin this lesson** in the same tab
without losing their identity or score while the room remains open. Their
resume key survives page reloads in that tab. Late arrivals cannot submit an
answer to a question they were not admitted to.

No record is marked correct until its question is revealed. Duplicate reveal
messages cannot score twice, and revisiting feedback does not erase earlier
attempts. A recording failure is surfaced to the host; the in-memory snapshot
can still be exported while available. The journal retries unsaved events on
the next write.

Run `node --test tests/*.test.js` for relay integration, crash recovery,
reconnection, persistence-failure, export, Q&A moderation, marking, slider,
scale, pace-signal, confidence, Adapt-report, QR and reaction checks. Each test
spawns a real relay with real WebSocket clients, on isolated temporary data and
an ephemeral loopback port. Pass a directory rather than the glob and Node tries
to load `tests` as a module instead of discovering the files.

`node tools/audience.js <pin>` joins a simulated class to a running session, so
the live path can be exercised — and demonstrated — without a room full of
phones. See "Rehearsing without a room" below.

Catalogue entries marked Planned require additional interaction mechanics.
Beat the Clock currently uses synchronised timed questions. A future self-paced
version would require per-learner question queues instead of the relay's current
shared question.

---

## The two engines

Switch with the toggle in the top-left, or `⌘E` / `Ctrl-E`.

| | Presentation | Game |
| --- | --- | --- |
| Holds | slides | settings + questions |
| Rail shows | slides | questions |
| Run button | ▶ Present | ▶ Play game |
| Saved as | `.sfdeck.json` | `.sfgame.json` |

Neither knows about the other's internals. Questions exist **only** in games —
there is no quiz slide type to author in a presentation, which is what keeps the
two jobs from tangling.

### Presentation

Layouts: Title, Section, Bullets, Keywords, Italics, Links, Dual, Cards, Table, Image, Video and the Game embed. Drag slides in the rail to reorder — the caret sits in the gap the slide will land in, and the rail scrolls itself when you drag towards an edge. Dragging is for a slide that has drifted a place or two; for anything further, pick the slide up with the ⠿ grip or `⌘X` and carry it while you scroll. `Home`, `End` and the arrows aim it, `Enter` drops it, `Esc` puts it back. `⌥↑`/`⌥↓` shuffle a slide along one place at a time, `⌥Home`/`⌥End` send it to the front or the end. For anything bigger than a nudge there is the **slide sorter** (`⌘G`, or the ▦ beside the slide count): the whole deck as a grid, so every move is a short drag with both ends in view. Slides can be picked in a group there — click, shift-click a run, ⌘-click to add or drop one — and dragged together, landing as a block in the order they had. `⌥` with the arrows moves the selection instead of changing it. Six themes provide deck defaults, with optional per-slide customisation.

Bullets are one per line; start a line with `- ` or indent it for a sub-bullet.
Images take a URL or embed a local file (keep those under a few MB — browser
storage is about 5 MB per site in total).

### Game

**Every game has a style, chosen when you create it**, and every question in
that game is that style. Press **New** in the game workspace and you pick:

| Style | What it is |
| --- | --- |
| **Multiple choice** | Two to six answers, one of them correct |
| **True or false** | A statement the room marks true or false |
| **Type answer** | No options at all — the room types the answer from memory |
| **Slider** | An estimate placed on a line. Near enough counts. |
| **Horse race** | Multiple choice where every right answer moves your team a step along a track. First past the post wins. |

**Type answer** is recall rather than recognition, which is the whole reason to
use it: with four options on the phone, a student who half-remembers can often
recognize their way to the right one.

The author lists **every spelling they will accept**. The first one is the
answer put on the screen, so the room reads one answer rather than a list of
tolerances. Before the wording is even considered, case, accents, punctuation,
surrounding space and a leading *the* are ignored, and figures are compared as
figures — `1,000` matches `1000`, `.5` matches `0.50`.

**Allow small spelling slips** (on by default) forgives one wrong letter in a
word of five or more and two in a word of eight or more. It is never applied to
a number, because 1500 is not a typo for 1600. The inspector states these rules
next to the toggle: a marking rule the teacher cannot predict is worse than no
rule at all.

On screen the answer is **held back while the room is typing** — a dashed
placeholder and a live *"6 of 8 answered"* count, the same height as the
revealed box so nothing jumps. On reveal the answer fills the box, the
explanation expands inside it as usual, and the room's answers appear beneath
grouped and counted, right ones outlined. A group is labelled with the spelling
the question accepts, not with whichever variant happened to arrive first, so
six students typing `paris`, `PARIS` and `the Paris` read as one **Paris ×6**.

Marking happens on the host — see [Who decides an answer is
right](#who-decides-an-answer-is-right).

**Slider** asks for an estimate rather than a fact. The author sets what the
line covers, where the answer sits on it, and how close counts — *near enough*
is a number they choose, not something inferred, because being close is the
skill being tested. Nonsense is corrected as it is typed: an inverted range is
opened out, an answer dragged past the end is pulled back, and a tolerance
wider than the line is flagged, since it would mark every possible answer
right.

An inverted or absurd tolerance aside, the interesting design constraint is the
same as type answer's: **the target never leaves the host.** The phones are
sent the line — its ends, its step and its unit — and nothing else, so there is
nothing on a phone to read the answer off. On the wall the answer box is held
back, and so is the band, because a shaded band gives the answer away as surely
as the number would.

At the reveal the room's estimates appear as a **dot plot above the line**, with
the band and the target inside it. Two students who guessed the same number
stack rather than overlap — one dot drawn over another says four people
answered when twelve did. Green inside the band, grey outside.

**Horse race** asks exactly what multiple choice asks — it reuses that question
shape and inspector wholesale — but the answer does something different, and it
looks different throughout:

- **Every question leads with the field** — a compact standings strip above the
  question showing each team's lane, progress and position. Without this a race
  is just a quiz with a track bolted onto the reveal.
- Questions are numbered **LEG 1, LEG 2** rather than Q1, Q2.
- **After each reveal the full track appears** — lanes, runners galloping
  forward, a hatched finish line, a trophy for anyone past the post.
- The scoreboard rail shows **position** (`3 / 5`) rather than points, and the
  closing slide shows the finish instead of a points table.

Set **Steps to the finish line** in ⚙ Settings (3–12, default 5). With fewer
than about eight questions, a shorter track keeps it live to the end.

*A team advances when the answer most of its members picked was the correct
one.* Not "any member right", which rewards big teams; not "all right", which
lets one confused member block a whole table. A tie inside a team doesn't
advance — the team has to actually agree, which is what makes the discussion
matter. In individual mode each player runs their own lane and position is
simply how many they've got right; the track shows the leading eight.

Styles live in one registry (`SF.GAME_STYLES` in `js/model.js` for the data
side, `STYLE_EDITORS` in `js/games.js` for the inspector). Adding a style means
one entry in each — the compiler, the validation, the rail summary and the
question editor all route through the table rather than knowing about multiple
choice specifically.

You can switch an existing game's style in **⚙ Settings**. Your question wording
survives; the answers are rebuilt by the new style, so anything you typed into
them is replaced. It asks first.

A game is settings plus a flat list of questions. A question carries whatever
its style needs — 2–6 answers with one marked correct, or a list of accepted
spellings — and optionally its own countdown and points; leave those blank to
inherit the game's defaults.

Switching a multiple-choice game to **Type answer** keeps the answer you had
marked correct as the answer you accept, rather than dropping the work.

**⚙ Settings** covers:

- **Individual or teams.** In team mode players pick a team as they join.
- **Team names**, up to six, colour-matched to the answer pads on the phones.
- **Default countdown and points**, inherited by every question.
- **Scoreboard** — keep the running score on screen throughout.
- **Which slides the game adds** — an opening title and a closing score slide,
  both generated, never edited as slides.

The rail flags questions that aren't ready (no text, fewer than two answers, no
correct answer marked, no accepted answer typed) so you don't find out
mid-quiz, and marks the ones that carry an explanation with 💡. What it says
about a question comes from the style, so a typed one summarises as its answer
rather than as a count of options it does not have.

### Images

Each question takes an optional image. Paste a URL or embed a local file;
embedded files are stored in the game itself, so keep them under a couple of MB
each.

**Image layout** — three choices per question, because a diagram and a
photograph want different treatment:

| Layout | What it does | Suits |
| --- | --- | --- |
| **Below question** | Question reads first, then the image, then the answers | diagrams, charts, anything with detail |
| **Above question** | Image leads, question sits in its own space beneath it | when the picture *is* the prompt |
| **On the image** | Image leads and the question sits on it behind a gradient | photographs |

*On the image* crops the picture to fill the width (`cover` rather than
`contain`) — the image has to reach the edges for the gradient to read as part
of it. That is fine for a photo and wrong for a diagram, which is why it's a
per-question setting rather than a global one. The countdown gets a dark disc in
this layout so it stays visible against a pale sky.

When the explanation opens on an overlaid question, the question is lifted out
of the image and placed above it, and the image shrinks to a strip. Hiding it
would take away what was actually asked at the moment the reasoning appears.

There's an **image description** field used as the alt text. It costs nothing to
fill in and matters if anyone reads the quiz with a screen reader.

The band is a fixed height rather than a flexible one, so the answer grid stays
measurable and the type fitting still works — with an image present the question
gets a tighter height budget and the answers step down to suit. A URL that fails
to load collapses the band and the slide re-fits as though there were no image,
rather than leaving a hole.

When the explanation opens on a picture question, the image shrinks but survives:
the escalation order is *shrink the type → drop the wrong answers → drop the
image last*, because losing the picture costs more than losing the options when
the question is about the picture.

### Explanations

A multiple-choice answer is usually one or two words, which teaches very little
on its own. Each question takes an optional **explanation**, plus an optional
**source** line. Leave a blank line between paragraphs.

It shows in three places:

- **In the answer box.** On reveal, the correct answer's box grows and the
  reasoning appears inside it. The wrong answers compact to single lines and
  stay on screen, so the room can see what they got wrong while they read why.
  This is the default.
- **On the players' phones**, attached to their result — the reasoning reaches
  them at the moment they find out whether they were right.
- **In presenter view**, alongside the correct answer, so you can elaborate
  beyond what's projected.

**⚙ Settings → Show explanations** switches between *In the answer box*, its
*Own slide* (a full-screen slide after the question, generated only for
questions that have an explanation), or *Both*.

The inline version measures itself against the real slide and picks the largest
type that fits — a character count can't predict this, because the theme font,
the scoreboard rail and the number of answers all change the answer. If nothing
fits alongside the wrong answers it drops them to reclaim the space and then
retries at the largest size, so long text still reads from a distance rather
than shrinking to nothing. Pick *Own slide* if you'd rather always keep the
other answers on screen.

### Audience feedback on a slide

Any content slide can collect from the room. Pick a kind in the inspector's
**Audience feedback** row and the slide keeps its title, bullets or image while
responses gather in the side rail beside it — the same slot the scoreboard uses.

| Kind | Room does | Rail shows |
| --- | --- | --- |
| **Poll** | taps one of your options | bars with counts and percentages |
| **Scale** | picks a point between your two ends | the spread, the average, and whether the room is split |
| **Word cloud** | types a word or short phrase | words sized by how often they came up |
| **Brainstorm** | types a longer contribution | cards, newest first, with names |

It's unscored — a game is for scoring, this is for hearing the room. Word cloud
and brainstorm let you allow up to five responses each; a poll and a scale are
always one response, changeable.

**Scale** is for confidence and agreement. You name the two ends and choose how
many points sit between them (3–7, five by default: an odd count leaves a real
middle to sit in, and more than seven is a distinction nobody makes honestly on
a phone). Both ends are required — without them the room cannot tell which way
the scale runs, and a bare 1-to-5 means nothing on the wall either, so the slide
collects nothing until you name them.

The results are drawn as **columns from one end to the other**, not as a row of
independent bars: the order is the meaning. Underneath is the average, and a
**ROOM IS SPLIT** flag when the two ends together outweigh the middle. That flag
is the point of showing a distribution at all — 1,1,5,5 and 3,3,3,3 both average
3, and for whoever is teaching they are the opposite situation. The phones show
the points in a single column, highest at the top, so the buttons run the way
the labels read.

On the wire a scale *is* a poll — one pick among ordered options — so the relay
counts it with the same code and knows nothing about scales.

The prompt opens when its slide appears and closes when you leave, so responses
belong to the slide that asked rather than to the session. Returning to a slide
re-opens its prompt with a clean slate. Word cloud entries are folded on case
and punctuation, so "Nile", "nile" and "Nile!" count as one word.

A presentation can be hosted for feedback alone — it doesn't need a game in it.
The rail switches between the scoreboard and the feedback feed automatically as
you move between game slides and feedback slides.

**Previewing while you author.** A feedback slide previews with **sample
responses**, because you can't judge a layout against no data. The inspector's
*Preview as* toggle shows it either beside the slide (as the room sees it) or
full screen. Sample data is tagged `SAMPLE` wherever it appears, so it can't be
mistaken for what the room actually said.

### Moderated Q&A

Open for the whole live session, not tied to a slide — a question occurs to
someone when it occurs to them. The **?** button in the phone's header is
reachable from any screen.

**Nothing reaches the room until you approve it.** That constraint decides where
moderation lives: the host's main window is normally the projected one, so the
queue is rendered **in presenter view only**, on your laptop. The projected
screen gets a count and nothing else.

| Where | Sees |
| --- | --- |
| Phone | approved questions, with upvotes; your own marked |
| Presenter view | everything, including pending, with Approve / Dismiss / Show on screen / Mark answered |
| Projected screen | a count — *"1 question waiting"* — and any question you explicitly put up |

Approving makes a question visible to the class and votable. **Showing it on
screen is a separate action**, so approval isn't a second route past your
judgement. Only approved questions can be shown; dismissing or answering one
takes it off the wall automatically.

The queue sorts approved-first and most-voted-first, so it's ordered by what the
room actually wants answered. Five open questions per person, so one enthusiast
can't flood it — dismissed ones don't count against them, since you judged those
rather than they did. You can't upvote your own.

Everything is recorded to the session journal (`qaAsk`, `qaModerate`, `qaVote`,
`qaPin`) and projected into the report: each question with its author, votes,
final state and whether it was put on screen, a per-person `questionsAsked`
count, and totals for asked / shown / still unanswered. The report JSON export
carries all of it; the Reports screen does not yet render a Q&A view, so for now
it is read from the export.

### How the room is doing

Two ambient signals, both open for the whole session rather than tied to a
slide, and both existing to tell you something a tally cannot.

**The pace signal.** The **✋** button in the phone's header sends one of three
things: *I'm lost*, *too fast*, *too slow*. Pressing the same one again takes it
back, and pressing a different one replaces it, so one person always counts
once and can always say "actually, I follow now".

Two properties make it work, and both are constraints rather than features:

- **It is anonymous, everywhere.** The projected screen gets a count, presenter
  view gets a count, and the session journal records the signal *without a
  player id at all*. A signal you can be identified by is a signal nobody
  sends, and then it is worse than not having it. What the report keeps instead
  is the slide it came from, which answers *where did I lose them* — the
  question actually worth asking afterwards.
- **It decays.** A signal is live for 90 seconds and then it is gone. "I'm
  lost" is a statement about now, and a hand raised on slide 3 must not still
  be up on slide 20. The relay expires them on its own clock and the phones
  follow, so nobody has to remember to take theirs down.

On the wall the cue appears **only on a spike** — a quarter of the room, and
never fewer than two people. One person who is lost is a conversation to have
with them, not a fact about the lesson. It appears at all because the room
asked for it to: a signal that visibly changes nothing gets sent once.

**Confidence on answers.** With *Ask how sure they were* on (⚙ Settings, on by
default), the phone asks **I'm sure / Just a guess** after an answer is locked
in — after, so it costs no time against the speed bonus, and so it cannot be
revised once they see whether they were right.

It is **never scored**. Scoring it would teach the room to claim they were
guessing, and the number that matters would stop being true. That number is
**sure and wrong**: a wrong answer given with conviction is a misconception and
needs re-teaching, while a wrong guess is a gap and needs practice. They are
identical in a tally and they need different lessons. *Right but guessing* is
the same fact from the other side.

Auto-reveal waits for the confidence step — everyone having answered is not the
end of the question while the phones are still asking — and stops waiting after
five seconds, so one person ignoring it cannot hold the room. Anyone who never
answers it is counted as *did not say* rather than assumed either way.

### Reactions

Four glyphs in the phone's footer — 👏 👍 😮 💡 — that rise once across the foot
of the slide and are gone. They reach the projected screen and nowhere else.

**Nothing accumulates.** No list, no counter, no history, and nothing in the
session journal. That is the design rather than an omission: the moment a
gesture is collected into something it becomes a feed, and a feed is the thing
this app is deliberately not. It is the one channel here with no purpose beyond
the room feeling present, and metering it would change what it is.

Four refusals keep it from becoming a chat, and they are what
`tests/reactions.test.js` is mostly about:

| Refusal | Why |
| --- | --- |
| A fixed set of four, and no text field, ever | The moment there is somewhere to type, this is a chat |
| One reaction each per 2.5 seconds | What makes a gesture a gesture is that it cannot be sustained |
| Twelve per two seconds for the whole room | Thirty phones at once is a moment; thirty phones for a minute is a screen nobody can read a slide through |
| Nothing while a question is up | Reactions belong to the explaining, not the answering — and the foot of a question slide is carrying the answer tally |

**None of them is negative.** Dissent has two better homes already — the pace
signal and a feedback prompt — and an anonymous channel for piling disapproval
onto a projected screen, in front of a class, is a different product and a
worse one.

Press **T** to turn them off. It is a live control rather than an authored
setting, because what host-togglable has to mean for something social is that
it can be switched off in the moment it is being abused, not before the lesson
in a settings panel. Anything still in the air goes with it, and the phones are
told so the control disappears rather than sending into a void.

### Presenter cues

Presenter view carries a **How the room is doing** strip, because it is the only
private surface the host has:

| Cue | Means |
| --- | --- |
| *n* still answering | whether to wait or move on |
| *n* waiting to join | someone arrived after the window shut |
| *n* lost / say too fast | the pace signal, broken out by kind |
| *n* sure and wrong | re-teach this, do not just re-practise it |
| *n* right but guessing | they got there without knowing why |
| *n* did not say | nobody was assumed either way |

The loaded ones are coloured; the rest are quiet. **Reports → Pace &
confidence** is the same information after the fact, with the signals grouped
by the slide they came from.

### What the rail shows, and when

The rail is the one thing on screen for the whole lesson, so it carries
whatever is most useful at the time rather than one fixed panel:

| While | The rail shows |
| --- | --- |
| Nobody has arrived | the join code as a QR, large, with the PIN and address under it |
| People are arriving | a line each — *"Dara joined"* — for a few seconds |
| The room is in | names and scores, with the code shrunk to a corner strip |
| Joining has shut | the code stays, relabelled *scan to join the next round*, with the size of the queue |

An empty rail saying *"waiting for players"* is the one moment the screen has
nothing better to do than show people how to arrive, so that space becomes the
QR code. Once anyone is in, the standings take it back and the code drops to a
96px strip labelled *still joining?* — still scannable, no longer the point.

**The code does not disappear when the join window shuts**, and the first
version of this got that wrong. Joining a closed room is not refused: it puts
you in the waiting room and admits you at the next round. So the PIN still
works, and a rail reading *"waiting for players"* with no code on it is a room
nobody can become a player in. What changes when the window shuts is the
label — *scan to join the next round* — plus a line saying how many are already
in the queue, because somebody who has scanned is looking at a waiting screen
and wants to know it worked.

The panel appears in both rails — the scoreboard and the feedback feed — since
which of them is on screen has nothing to do with whether somebody still needs
to get in. It sits below the rows on the scoreboard and above the body on the
feedback feed, which is not an oversight: a scoreboard pushed down by a code
strip is a worse trade than a results panel is.

Arrivals are announced, briefly. Two or fewer get a name each; more than that
gets *"4 more joined"*, because a class arriving at once should be one movement
in the corner of the eye rather than a column of announcements. The notices are
held on the player rather than written into the rail, because the rail element
is replaced whenever the feed switches — a note appended a moment before that
would land in a detached node and never be seen.

### Colour rules for anything the room sees

Every theme defines the same small set of tokens, and slide-space components
read only those — never a literal colour. Two rules keep it working on a theme
nobody has written yet:

**Text is `--s-fg` or `--s-dim`. Accents are for borders, fills and dots.**
Only the fg/bg pair is guaranteed to contrast, because that is what the pair is
for. An accent used as text has to be checked against every background, and the
check gets forgotten: the *room is split* flag read at 1.97:1 on studio because
its second accent is a pale lilac on a sage slide, and the same flag filled with
that accent and given dark text read as dark-on-dark on paper, whose second
accent is a deep green.

**Anything floating over a slide takes its wash from `--s-scrim`**, with
`--s-card` as the fallback since that token's polarity is already per-theme — a
light wash on dark themes, a dark one on light. A hardcoded `rgba(0,0,0,.42)`
pill read at 17:1 on midnight and **1.16:1 on paper**: the same control, present
and invisible.

Contrast of every text element over its own background, measured per theme:

| | midnight | paper | ocean | ember | mono | studio |
| --- | --- | --- | --- | --- | --- | --- |
| Q&A / pace cue | 17.4 | 15.5 | 17.2 | 16.9 | 18.1 | 11.3 |
| arrival notice | 14.0 | 13.1 | 11.4 | 12.6 | 15.4 | 11.3 |
| room-is-split flag | 16.3 | 14.4 | 14.4 | 15.2 | 17.5 | 10.4 |

Worst case 10.4:1, against 4.5 for AA and 7 for AAA. Before this pass the worst
case was 1.16.

### One surface, across themes

The rail takes its background from the slide on screen rather than from the
theme's `--s-bg` token, and that distinction is the whole point.

Every theme in `css/app.css` sets `--s-bg` once, so the slide and the rail
agree automatically — that is why the rail looks continuous on midnight. The
studio theme also paints some *layouts* directly: its section slides are
lilac, its content and keyword slides cream, while its token stays sage. The
rail is a sibling of the slide and cannot see a layout class, so on those
slides the panel and the slide it is butted against came out different
colours.

So `SF.railSurface(rail, slideEl)` copies the slide's resolved background onto
the rail on every slide change, in the live show and in the editor's preview
alike. Read off the slide rather than told separately, which means a new theme
or a new layout cannot drift out of step — there is nothing to keep in sync. A
`url()` background is the exception: that is the slide's own artwork and has no
business being tiled into a panel beside it, so the rail falls back to the flat
colour.

### How much room the room gets — `S`

**S** (or the ◧ button) cycles the room panel through its three sizes:

```
hidden  →  beside the slide  →  over the slide  →  hidden
```

It cycles rather than toggles because the question mid-lesson is not "sidebar
or no sidebar" but how much of the screen the room should have right now — and
one key with three stops is less to remember than a key per state. The button
shows which stop it is on and its tooltip says what the next press does, since
the current state is already visible on screen.

A stop with nothing in it is skipped rather than landed on. With nobody joined
and no prompt open there is nothing to put on the whole screen, so the cycle
goes straight back to hidden instead of stopping on a "nothing to expand"
message.

### Expanding the rail — `E`

Press **E** (or the ⛶ button) to jump straight to the whole screen, and **E**,
**S** or **Esc** to collapse it — for when full screen is the only thing
wanted rather than a stop on the way. One key, three feeds:

| Rail is showing | E gives you |
| --- | --- |
| Audience responses | big poll bars, a real word cloud, or a card grid |
| Scoreboard | full-screen standings |
| Race | the full track |

The focused view keeps updating as answers land — that's the point of putting it
up. The rail hides while it's open, since it would be showing the same data
twice, and the overlay reclaims the width the rail was using.

### Putting a game in a presentation

Press **+ Game** in the presentation rail and pick one. You get a marker slide
showing what will play there. At showtime it expands into the game's intro,
questions and score slide.

Two quiz breaks in one talk = **two games** ("Round 1", "Round 2"), inserted
where you want them. Editing a game changes it everywhere it plays; the game
editor tells you which presentations embed it.

A presentation holding several games uses the **first one's** teams and
scoreboard setting for the whole session — teams belong to the room, not to a
question.

---

## Scoring

**Individual** — every player ranked on their own.

**Teams** — each question contributes its own per-team average, and those
averages add up. So a team of six never beats a team of three on headcount, and
— importantly — a player joining in round 2 cannot dilute the points their team
earned in round 1.

The naive version (team total ÷ current member count) is wrong in a way that
bites in practice: a team on 3000 with three players averages 1000, and gaining
a fourth player on zero would drop it to 750. The team would lose 250 points for
gaining a member. Averaging per question instead means past questions are scored
against the roster that actually played them.

Live answers are speed-weighted: a correct answer is worth the question's full
points if it lands immediately, falling to half as the countdown runs out. With
no countdown, correct answers are worth full points.

### Who decides an answer is right

**The host marks; the relay does the arithmetic.** The split matters, so it is
worth stating plainly.

The relay used to compare option indices — an answer was right if its number
equalled the question's `correct` number. That made every question type without
option numbers impossible: a typed answer has no index to compare, and neither
would a slider, an ordering or a dropped pin. So marking moved to the host,
which is the side that already knows what the question means.

| | Holds |
| --- | --- |
| Host | the accepted answers, the marking rules, the verdict per player |
| Relay | the clock, the roster, the points arithmetic, the running totals |

On reveal the host sends a verdict per player rather than an answer key. The
relay applies the speed weighting, the team averaging and the totals to those
verdicts. Adding a question type is now a change to `js/model.js` and nothing
else — the relay never needs to learn what the new answers mean.

One consequence needs handling rather than hoping. The host marks the answers
it has been sent, and an answer can land in the gap between that snapshot and
the reveal. So each answer bumps a revision counter, the host quotes the
revision it marked at, and a mismatch is refused: the relay hands the final
answers back and the host re-marks. The first reveal attempt also closes
answering, so the re-mark works on a set that cannot grow again and the retry
always succeeds. Nobody is scored wrong for a coincidence of timing.

### Type sizing on question slides

Nothing on a question slide has a fixed type size. When a question is shown,
the player measures the real layout and works outwards from the question:

1. **The question** is sized first, capped by how tall its header may get
   rather than by a line count — so a wordy question shrinks instead of eating
   the slide. 56px unrailed, less when the scoreboard is up.
2. **The answers** are then capped at **0.82 of the question size**. That ratio
   is what keeps the hierarchy readable: the question is what is being asked,
   the answers are the options. It holds at every size — short question and
   short answers land on 56/46, a long question with sentence-length answers on
   44/36.
3. **The column count** is chosen by measurement: two columns suit short
   answers, one column gives long wording more line width. Both are tried and
   the better fit wins.

An open-response question — typed or slider — is the exception to step 2. It has
one box and that box holds the answer itself rather than a candidate for it, so
it is allowed to *lead* the question at **1.15×** instead of sitting below it,
and it always takes the full width. Ranking a single short answer below the
question leaves it adrift in an empty slide.

Answer text is **centred while every answer fits on one line** and switches to
left-aligned the moment any of them wraps — centred multi-line text gives every
line a different left edge and is slower to read from a distance. The letter
badge always stays left, so the A/B/C/D column lines up either way. The revealed
layout is always left-aligned, to match the explanation prose beneath it.

Answer boxes hug their content and the block centres in the space below the
question, so a two-character answer never sits in a box that is mostly padding.
Padding, the letter badge and the gaps are all derived from the fitted size, so
the proportions hold whatever the wording does. The scoreboard rail taking a
third of the width is part of the measurement, so the same question re-fits
when you host it live.

### The scoreboard

With the scoreboard on, a rail runs down the right of **every** slide — content
slides included — listing each team or player with their score, reordering as
answers land and flashing the rows that just moved. Slide content narrows to make
room; the countdown, page number and answer grid all shift with it.

With it off, standings appear on a full-screen leaderboard between questions
instead.

Presenting without hosting shows a small **Score 3 / 5** pill on question and
score slides instead of the rail — there is no room to tally.

---

## Running a live quiz

1. `node server/server.js` on the machine driving the projector.
2. Open the *Present from* URL it prints — **not** `file://`, and not
   `localhost` if you want phones to connect.
3. Press **◉ Host live** from either engine and read out the PIN and address.
4. Players enter the PIN and a name, then pick a team if it's a team game.
5. Press **Start**, then advance with `→`. On a question the first `→` reveals
   the answer; the second moves on. Timed questions reveal themselves when the
   clock runs out, or as soon as everyone has answered.

### The join QR

The lobby shows the join address as a QR code with the PIN already in it, so a
phone camera skips both places a room reliably goes wrong: mistyping an IP
address, and joining with the wrong PIN. Press **J** mid-show and the join card
carries the same code. The typed address and the PIN stay on screen beside it —
a camera is no use to an older phone, a locked-down device or someone already
looking at the page, and a QR code that is the only way in excludes them.

The encoder is [js/qr.js](js/qr.js), written from the spec because SlideForge
has no dependencies and this has to work from `file://`. It is deliberately
narrow: byte mode only (a URL has lowercase letters and `?`, which the other
modes cannot hold), versions 1–6, levels L and M. Version 7 introduces a second
information block, and stopping below it removes a mechanism rather than
shipping an untested one. Anything longer than 136 bytes throws instead of
producing a code scanners quietly reject.

**On testing something a test runner cannot see.** `tests/qr.test.js` proves a
lot without a camera: a code round-trips through an independently written
decoder, the error-correction bytes are verified as genuine Reed-Solomon
codewords by polynomial division rather than by comparison, the capacity table
is cross-checked against module counts derived from the geometry, and the
generator polynomials match the published tables.

All of that passed on a version of the encoder **no scanner on earth could
read.** The format information was bit-reversed, and the test's decoder was
reversed in exactly the same way, so the round trip was two mirrors agreeing.
It was caught by rendering a code to a PNG and handing it to Apple's Vision
framework — a decoder with no interest in what this repo believes — which is
now [tools/qr-verify.sh](tools/qr-verify.sh):

```bash
tools/qr-verify.sh
```

The tests gained two things from that: the format bit positions written out
from the spec as explicit coordinates rather than as a loop, and a full
module-for-module matrix that Vision has read, kept as a regression vector so
any change anywhere in the pipeline has to reproduce it exactly.

### The join window

Joining is open in the lobby and stays open while you're still on title and
content slides. It **closes the moment the first question of a round appears**,
and **reopens when the next round starts** — where a round is each game embedded
in the deck.

| Phase | Joining |
| --- | --- |
| Lobby, before Start | open |
| Started, still on intro/content slides | open |
| First question of a round issued | **closed** |
| Rest of that round | closed |
| Next game begins in the deck | **reopens** |

That keeps every score within a round comparable — nobody is ranked on two
questions against everyone else's ten — while still giving stragglers a real
window during your introduction.

Anyone arriving after it closes is **held in a queue**, not refused. They enter
the PIN, pick a name and team, and see "You're in the queue"; when the next round
opens they're pulled in automatically with a buzz, no action needed. The rail
shows how many are waiting.

Two rounds means two games ("Round 1", "Round 2") inserted where you want them.
A single game is a single round, so with one game the window closes at question
one and stays closed — which is the strict, Kahoot-like behaviour by default.

The PIN stays in the scoreboard rail footer the whole time, switching to
`CLOSED — joining reopens next round` when the window shuts. `J`, or the ◉
button in the on-screen controls, throws the join details up full screen with
the address, the team list and whether joining is currently open.

Everyone needs to be on the same Wi-Fi. If phones can't load the page it's
usually the laptop firewall blocking port 8787, or client isolation ("guest
mode") on the network.

Use another port with `PORT=8080 node server/server.js`. The live room is held
in memory, but the session is journalled to `.slideforge/sessions/` as it runs,
so stopping the server ends the game without losing the record — see
[Live session reports](#live-session-reports-local--lan).

### The Adapt report

Reports opens on **Adapt**, which is a short list of things to do next lesson
rather than a table of what happened. It is derived entirely from what was
already recorded — no extra data is collected to produce it — so a session from
last term reads the same way as the one that just ended.

Findings land under one of three headings: **change this before next lesson**,
**keep an eye on**, **notes on the lesson itself**. Each states its own numbers
and pairs them with something to do.

Two rules run through the whole thing, and they are what make it worth reading:

**It never claims more than the evidence carries.** The report opens by saying
what it is standing on — *"Based on 20 marked answers from 14 people across 2
revealed checks"* — and below five marked answers it says so in as many words
and marks every finding `THIN EVIDENCE`. A check that was opened but never
revealed is reported as an unfinished loop and contributes nothing to any
conclusion: six wrong-looking answers with no answer key are not six wrong
answers. A single pace signal is one person, and one person is not a finding.

**It says what to do, not what happened.** "62% correct" is the report you
already have. This one distinguishes cases that look identical in a tally and
need different lessons:

| It spots | Because | So it says |
| --- | --- | --- |
| The wrong answers agree on one option | That is a misconception with a name | Teach against *that*, don't cover the topic again |
| Wrong answers scattered across options | The question didn't land | Re-teach from a different angle |
| Wrong **and confident** | They have a working model that gives the wrong answer | Practice confirms it; the explanation has to change |
| Right but **guessing** | The score flatters them | Ask again in a form guessing can't carry |
| Strong at a low Bloom level, weak at a higher one | They can recall it but can't use it | Plan practice at the higher level, not another pass over content |
| A scale answered at both ends | The average describes nobody | Two groups, two next lessons |
| A prompt you wrote a plan for | You already decided what to do | Shows *your* note, not its advice |

That last row is the one to notice. **After the responses, I will…** in the
Engagement inspector is quoted back verbatim once the responses are in, under
*your note from the slide*. Nothing the engine could generate beats the thing
the teacher already decided.

**Bloom's is used for exactly one thing**: the gap. Succeeding at a low level
and failing at a higher one is a different problem from failing everywhere, and
it is the only claim a taxonomy can support from a set of check results. The
comparison only runs upwards — strong at Apply and weak at Remember is not a
gap — and weak at both is just weak, which the per-check findings already say.
Set the level per question in the game editor; leave it unset and the report
tells you what setting it would buy rather than guessing.

Everything about a person is handled as a question rather than a conclusion.
*"Four people answered nothing"* comes with *"could be a flat battery, could be
someone who has stopped following — the names are in Attendance, worth a quiet
word rather than a conclusion from this report"*, and pace signals stay
anonymous here as everywhere else.

`SF.adapt(report)` in [js/adapt.js](js/adapt.js) holds all of it and touches no
DOM, so the judgement is testable without a browser — which is where most of
`tests/adapt.test.js` goes.

### Rehearsing without a room

You cannot judge a live feature alone. `tools/audience.js` joins a simulated
class over the same WebSocket protocol a phone uses, so the projected screen
behaves as it will on the day:

```
node tools/audience.js 623815 --n 8
```

The PIN is the one on your screen; `--n` is the class size, `--port` matches a
non-default relay, `--quiet` silences the per-student log. For a type-answer
question add `--typed Paris`: the relay never tells a phone what the answer is,
so a simulated student cannot know it either — given it, most of the room types
it with the case and spelling variation a real room produces, which is the only
way to see whether the marking rules are usable. `--near 206` does the same for
a slider question: it is where the class's estimates gather, and without it they
gather on the middle of the line. On a scale the class leans towards the
confident end with a couple of holdouts, which is the shape a real room makes.

The class also says how sure it was — mostly honestly, with a few confidently
wrong — and the students who are struggling raise pace signals on a slow
trickle. Both are the only way to see the presenter cues do anything without a
room full of people, and the confidence timing in particular is not something
you can judge from a test: the first version revealed the answer while every
phone was still asking, and collected nothing. Students spread
round-robin across the teams, answer with a fixed ability (most get it right,
roughly one in five does not, so the tally has something to show), reply to
polls, clouds and brainstorms, ask questions on a slow trickle, and upvote each
other.

It is a rehearsal tool, not a load test — it exercises the same paths as real
phones, so anything it breaks was genuinely broken. It found the Q&A cue
overlapping the answer tally on a question slide.

---

## Keys

**During the show**

| Key | Action |
| --- | --- |
| `→` `space` `PgDn` | Next slide |
| `←` `PgUp` | Previous slide |
| `Home` `End` | First / last slide |
| `A`–`F` or `1`–`6` | Answer the question on screen |
| `R` | Clear answers and score again |
| `B` | Blank the screen |
| `F` | Full screen |
| `J` | Join code full screen (live games) |
| `D` | Presenter view |
| `?` | Shortcut list |
| `Esc` | Exit |

In solo mode, unanswered multiple-choice questions use A–F as answers. During a live lesson B, D and F retain their presenter controls; learner answers arrive through devices or teacher entry.

**In the editors**

`⌘S` save · `⌘↵` run · `⌘E` switch engine · `⌘D` duplicate · `↑`/`↓` move
selection · `Backspace` delete

Reordering slides: `⌥↑`/`⌥↓` move the selected slide one place ·
`⌥Home`/`⌥End` send it to the front or the end · `⌘X` pick it up to carry,
then `Home`, `End` or `↑`/`↓` to aim and `Enter` to drop it (`Esc` puts it back)

Slide sorter: `⌘G` opens it · arrows move the selection, `⌥`+arrows move the
slides · `⇧`+arrows extend the selection · `⌘A` selects everything · `⌘Z`
undoes without leaving · `Enter` edits the slide you are on · `Esc` closes

---

## Explore, predict and compare

In Lesson studio, choose **Before / after**, **Explore an image** or **What if?
graph** from the layout picker’s Show & explore group.

- **Before / after:** upload two images, label the states, then drag the divider
  or use the keyboard slider while presenting. Next shows the after state.
- **Explore an image:** upload an image and add up to eight numbered details,
  with positions, zoom levels and explanations. Click a marker or use Next to
  visit details; Whole image returns to the overview.
- **What if? graph:** choose a linear or quadratic relationship, label the input
  and output, and set the range and coefficients. Drag the input while
  presenting to move the point and see the calculated output. No code is run
  from a formula field.
- **Chart prediction:** on a Chart slide, enable Predict before revealing the
  chart. Optionally collect a live poll; edit its choices in Engagement. Next
  reveals the chart with the predictions still beside it. The concealed values
  are omitted from learner excerpts.

Presenter view carries the same controls. Exploration state survives leaving a
slide and returning during the same show; a new show resets it. Moving a slider
never edits the saved slide. Motion respects the system reduced-motion setting.

## Presenter view

**Presenter**, or `D` mid-show, opens a second window with notes, the next
slide, an elapsed timer and a clickable filmstrip. On a question it shows you the
correct answer. It drives the main window — projector on one screen, this on your
laptop. Allow pop-ups if nothing opens.

**Activities & mini games** brings the 54 activity templates, 25 game engines
and saved quizzes into the presenter window. Create an editable starter or draft
with AI using the current slide, lesson title or your own brief. Review the
content and answers, then choose **Check & preview**. Editing a draft requires a
new preview before **Launch now** or **Queue next** becomes available.

Launch inserts the activity immediately after the current slide; queue adds it
after other activities queued from that slide. The live room stays connected.
**Return to lesson** revisits the slide you left. **Save for reuse** saves a quiz
to the quiz library or a slide activity as a separate lesson. Drafting and
launching do not alter the saved source lesson. AI needs the configured server
key; manual editing works without it. The **Quiz on a theme** shortcut also opens
a private draft for review.


---

## Files

| File | What it does |
| --- | --- |
| `index.html` | The shared shell both engines render into |
| `js/shell.js` | Chrome, workspace switching, file I/O, shared inspector widgets |
| `js/editor.js` | Presentation engine |
| `js/games.js` | Game engine |
| `js/model.js` | Both document types, storage, and the game→slides compiler |
| `js/render.js` | Slide DOM at 1280×720, plus the score rail |
| `js/player.js` | The runtime: navigation, transitions, answers, scoring |
| `js/live.js` | Host side of live play |
| `presenter.html` | Presenter view |
| `join.html` | What the audience opens on their phones |
| `server/server.js` | Static file server + live relay |
| `server/ws.js` | Dependency-free WebSocket implementation |

`SF.compileGame` turns a game into ordinary slides, which is why a standalone
game and an embedded one play through exactly the same runtime.

### Where your work lives

Decks and games autosave to **browser local storage** — invisible, per-origin,
and easy to lose. Storage keyed to `http://localhost:8787` is *not* the same
storage as a page opened directly from the filesystem, so a document saved one
way will not appear the other.

So don't leave anything you care about only in the browser. **Export** offers:

| Choice | What it does |
| --- | --- |
| **This presentation / game** | downloads the active document as one file |
| **Everything, into the app folder** | writes each document to `data/decks/` and `data/games/` next to the app |
| **Everything, as one file** | downloads a dated `.sfbundle.json` backup |

The middle one is the useful one: it makes the folder self-contained, and the
files are plain formatted JSON, so they diff and commit like source. Re-exporting
overwrites in place rather than piling up copies — filenames are the title plus
a slice of the document id, which is stable across saves.

**Import** offers *From a file* (a single document, or a bundle) or *From the app
folder*.

> **Restoring from the folder replaces everything in the browser.** That's
> deliberate rather than friendlier merging: you restore *because* storage was
> lost, and by then the app has already re-seeded its samples — merging would
> leave you with duplicates of everything. The folder is the source of truth and
> this makes the browser match it. Use single-file Import to merge one document.

Both need the relay running, since a browser page can't write to disk on its
own. Two things worth knowing about the endpoints: the files under `data/` are
served like any other static asset, so anything that can reach the port can read
them; and there's no authentication, the same trust assumption the live relay
makes. Fine on a classroom network, not something to expose.

Old decks that had quiz slides authored directly in them are migrated on first
load.

Old decks that had quiz slides authored directly in them are migrated on first
load: the questions are lifted into a new game and a game embed is left where
they were.

## Known limits

- No `.pptx` export. Decks are JSON, the show is HTML. A real PowerPoint file
  would need a separate export layer, and interactive questions can't survive
  into one.
- Local storage is per-browser and per-origin: documents saved from
  `file://index.html` won't appear when you open the app from
  `http://localhost:8787`. Use Export/Import to move between them.
- The live relay has no authentication. Anyone who can reach the port and guess
  a PIN can join. It's built for a room on a trusted network, not the internet.
- Deleting a game that a presentation embeds leaves that slide marked MISSING —
  the show skips it with a warning rather than failing.
- The Q&A queue does not deduplicate. If two people ask the same thing you see
  both — deliberate for now, because near-duplicates are a judgement call, but
  it does mean a common question can appear twice.
- Q&A reaches the session report as data but has no view on the Reports screen
  yet; read it from the JSON export.
- A pace signal from someone still in the waiting room is ignored. They are not
  in the roster the spike threshold is measured against, and their phone has no
  header yet, so the control is not offered — but if they are watching the
  screen and lost, nothing they can do says so.

### Memory boards

Memory Match, Memory Flip and Knowledge Flip use shared interactive boards in
the ordinary presentation player. New games include four editable pairs; use
**+ Pair** to add more. Boards show up to eight pairs per set. The first pair's
study duration applies to its set; changing study time in the editor updates
all pairs.

Memory Match rotates teams after a claim or pass. Memory Flip builds one class
collection. Knowledge Flip keeps keywords visible and skips study. Explain a
chosen term aloud, reveal its definition, then let the teacher claim it or
leave it available for another attempt. Pause, replay, ties and returning to a
board are supported. The private presenter preview also operates the board.

Collection scores are local to that set and presentation run; they do not alter
live quiz scores or session reports. Learners follow the shared screen and
answer aloud. See [the adaptation design](docs/game-adaptation.md) for the
remaining catalogue's intended mechanics and implementation boundaries.
