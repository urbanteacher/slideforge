# The room pane: what it is for, and a class of thirty — 23 September 2026

The room pane is the panel beside the slide during a live lesson. It shows
standings, polls, word clouds, brainstorms and the way in. It is 384px of a
1280px wall, which is 30% of the screen, and it was designed for a class of
six. This note records what it did with a real class, the rules it follows
now, and what is still open.

## What it did, measured

Drawn with 32 students and the join panel showing, at 1440×900:

| Finding | What happened |
|---|---|
| **The wall judged people.** | Every row carried "38% · 3/8 · needs support" under the student's name, on the projector. The desk (presenter view) had no copy of it at all. |
| **Rows were cut in half.** | Ten rows were allowed but seven and a half fit. The eighth was sliced, and "+22 more" never appeared because it was below the clip. |
| **Polls lost their leading option.** | The poll body was centred and clipped, so the first option, usually the leading one, went under the join panel. |
| **Brainstorms lost their newest card.** | Same clip: the top card showed only its author's name. |
| **Ideas were signed.** | Brainstorm cards showed the author's name on the wall, in the rail and in full screen. |
| **The PIN appeared twice.** | The QR panel showed it at 30px, and the footer line repeated it at 25px underneath. |
| **Long names shrank.** | "Tom Okonkwo-Bright" was drawn at 62% of the row size, about 13px on a projector. |
| **A third of the wall went to the standings.** | The standings stayed at full width beside an objectives slide, a section slide or a video. None of these asks the room anything. |
| **Full-screen standings used two thirds.** | With the pane hidden, its padding still applied, so the right third of the wall was empty. |
| **The answered count was small print.** | "27 of 32 responded" sat at the foot of the pane in 15px grey. That is the number a teacher waits on. |

(A capture of the pane that looked cut off at the right edge was the element
screenshot being cropped to the browser pane. The pane was laid out
correctly.)

## The rules now

1. **Show the room to itself, and a person only to the teacher.** Accuracy and
   "needs a hand" are gone from the wall. The desk shows **"3 need a hand"**
   beside the away chip, with names and accuracy on hover (`Live.needsHand`,
   `needsHand` in the desk state). The rule is unchanged: at least three
   questions asked, and either under half right or silent through most of
   them. It applies to individual play only. Brainstorm ideas are anonymous on
   the wall, in the pane and in full screen. The teacher still sees authors
   under Live answers.
2. **Size by the room.** Up to 8 entries, everyone is named. Above 8, the
   pane shows the **top five and the pack**: "+ 27 more · Your place is on
   your phone". Phones already say "Place 12 of 32". After a reveal, the
   pack's **biggest climb** is named ("▲ 7 Zainab · biggest climb"). It is the
   one piece of news a board of thirty has for the people not on it. The
   full-screen standings keep the top six and add the same line.
3. **Nothing is drawn cut in half.** Every body is fitted by measurement, not
   by a count (`fitByDropping`). Rows, cards and rare words come off the end
   until the rest fits, and the "+N more" count follows. A poll tightens
   before it loses anything. The measurement holds animations still: a row
   mid-pop or the climb chip sliding in used to read as overflow.
4. **One way in.** When the QR panel is showing, the footer PIN line is
   hidden.
5. **The pane earns its width.** Beside a slide that asks nothing (content,
   section, image, video), the pane becomes a **232px strip**: the top three,
   the count, and the QR code and PIN. The slide gets 152px back. Beside a
   question, its results or a feedback prompt, the pane is full width. The
   pane is also full width while nobody has joined, because the QR code needs
   the room. `--rail-w` is a registered property, so the slide eases across
   instead of jumping.
6. **The count leads.** A feedback pane opens with "**27** of 32 answered"
   and a bar, under the question, and a pill reading "Everyone" when all have
   answered. Before the first answer, a room of more than twelve is a single
   large number, not a column of names.
7. **Names fit.** A person's full name that would have to shrink is shown as
   "Tom O.", with the full name on hover. Team names are never shortened.

## Where it lives

| Piece | File |
|---|---|
| Top five and the pack, climb, fit, legend, name shortening | `src/render/live.js` `paintScoreRail`, `biggestClimb`, `wallName`, `fitByDropping`, `overflowing` |
| Answered meter, fitted poll, cloud and brainstorm, anonymous cards, large count | `src/render/live.js` `paintFbMeter`, `fitFeedback`, `paintBrainstorm`, `paintFbRoster` |
| Strip or full width | `js/player.js` `railSize`, called on every slide and every standings push |
| Pack line in full screen | `js/player.js` `leaderboardSlide` |
| Needs a hand, on the desk | `js/live.js` `Live.needsHand`, `src/presenter/window.js`, `presenter.html` `#roomNeeds` |
| Styles | `css/app.css`: rail legend, `.has-join`, `.crowd`, `.climb`, `[data-size="slim"]`, `.fb-meter`, `.fb-body.tight` |

## Still open

- **Built 23 September, not yet seen in a browser:**
  - **Rehearsing a big room (RP-01).** Present ▾ offers a sample class of
    8, 30 or 120, remembered on this computer.
  - **Lecture scale (RP-02).** Above 60 people, and not in teams, the
    standings stay off the wall until the teacher brings the room view in
    with S. The slide's answer bars are the room's picture of itself. A
    rehearsed lecture follows the same rule.
  - **Word cloud (RP-03).** The most common words are laid out in the order
    each was first seen, centred, so nothing already up moves when a new
    word lands. Each word's colour comes from the word, not its place.
    It is not a spiral packing; that is still open if the centred wrap
    looks too even.
- **Not seen drawn:** the desk's "need a hand" chip. Its rule was checked
  against sample rows in the page. The chip follows the away chip's markup,
  which was not drawn either (see UX-62).
