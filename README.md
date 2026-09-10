# SlideForge

The lesson studio now includes a light editor, a sage-and-lilac **Studio** theme, a **Cards** layout, and an **Add activity** library. Open **Example lesson** to explore a six-slide teach → check → discuss → adapt sequence; your existing document stays available through **File → Open**.

The **Engagement** tab adds Bloom’s thinking levels, reusable discussion prompts and a private next-step planning note. Feedback can be previewed beside the slide or full screen using clearly labelled sample responses, without connecting students or a server. Knowledge checks created from the library default to no countdown or leaderboard.

Available library activities: multiple choice, true/false, poll, word cloud and brainstorm. Type answer, slider, puzzle, audio quiz, open-ended, scale, NPS and drop pin are visibly marked as planned and disabled; their interaction engines are not implemented. The existing horse-race style remains available in Quiz studio.


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

- **Attendance CSV** — names, teams, admission, connection time and participation.
- **Answers CSV** — eligible learners, responses, outcomes, timings and Bloom levels.
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

Run `node --test tests/sessions.test.js` for relay integration, crash recovery,
reconnection, persistence-failure and export checks. These use isolated temporary
data and an ephemeral loopback port.

Next in the product sequence: moderated Q&A, then type-answer and scale/slider,
confusion/pace plus answer confidence, and finally an evidence-based Adapt report.
Reactions and QR rendering are also still pending; join PINs and focus modes
continue to use the existing live interface.

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

Layouts: **Title**, **Section**, **Bullets**, **Image**, **Quote**, and the
**Game** embed. Drag slides in the rail to reorder. Five themes apply to the
whole deck.

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
| **Horse race** | Multiple choice where every right answer moves your team a step along a track. First past the post wins. |

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

A game is settings plus a flat list of questions. Each question has 2–6 answers,
one marked correct, and optionally its own countdown and points — leave those
blank to inherit the game's defaults.

**⚙ Settings** covers:

- **Individual or teams.** In team mode players pick a team as they join.
- **Team names**, up to six, colour-matched to the answer pads on the phones.
- **Default countdown and points**, inherited by every question.
- **Scoreboard** — keep the running score on screen throughout.
- **Which slides the game adds** — an opening title and a closing score slide,
  both generated, never edited as slides.

The rail flags questions that aren't ready (no text, fewer than two answers, no
correct answer marked) so you don't find out mid-quiz, and marks the ones that
carry an explanation with 💡.

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
| **Word cloud** | types a word or short phrase | words sized by how often they came up |
| **Brainstorm** | types a longer contribution | cards, newest first, with names |

It's unscored — a game is for scoring, this is for hearing the room. Word cloud
and brainstorm let you allow up to five responses each; a poll is always one
vote, changeable.

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

Everything is recorded to the session journal (`qaAsk`, `qaModerate`, `qaPin`),
so the questions asked are part of the session report.

### Expanding the rail — `E`

Press **E** (or the ⛶◧ button) to put whatever the rail is showing on the whole
screen, and **E** or **Esc** to collapse it. One key, three feeds:

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

Use another port with `PORT=8080 node server/server.js`. Rooms are in-memory
only — stopping the server ends the game, and nothing about the audience is
written to disk.

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

While a question is unanswered the answer letters win over the controls that
share them, so `B` answers B rather than blanking the screen.

**In the editors**

`⌘S` save · `⌘↵` run · `⌘E` switch engine · `⌘D` duplicate · `↑`/`↓` move
selection · `Backspace` delete

---

## Presenter view

**Presenter**, or `D` mid-show, opens a second window with notes, the next
slide, an elapsed timer and a clickable filmstrip. On a question it shows you the
correct answer. It drives the main window — projector on one screen, this on your
laptop. Allow pop-ups if nothing opens.

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
