# M7 acceptance test: Host live in the Lesson studio's own room

For the owner to run by hand on the deployed app. It is the plan's M7 acceptance test
([lab-engine-plan.md](../lab-engine-plan.md), "M7"), adapted to what slice 3 routes. The automated version of steps 2 to 5
is `node tools/smoke/run.mjs studio-room` (a real relay, a real browser, raw-socket phones).

**What is routed.** Host live from a lesson in the Lesson studio goes to the studio's own host and show when
**every game in the lesson is plain Multiple choice** and no slide has audience feedback (poll, word cloud, brainstorm,
scale), an activity, a live figure, or a SlideForge check. Any other lesson gets SlideForge's classic room, unchanged.
Present, Teacher Presenter and Rehearse are classic in both cases.

**Cold start.** The free plan spins down when idle. The first Host live after a quiet spell waits for the server to wake.
That is not a failure; the show waits up to 10 seconds for the room before it falls back (step 8).

You need: the deployed app, a lesson that qualifies, two phones (or two browser tabs on `join.html`), and a second
screen or window for the teacher-entry window.

**A lesson that qualifies.** The IPDV "Lab 1" lesson (`ipdv-lab1`) has one Multiple choice question ("Lab 1 worksheets
are due on Canvas when?") and no feedback. Lessons that do not: "The art of paying attention" (it has a word cloud), the
other IPDV lectures (polls), and the Layout bank (Boss battle, Ranking).

## Steps

1. **Route.**
   - Open "Lab 1" in the Lesson studio. Choose **Host live** (the header button).
   - The page goes full screen and the lesson's slide fills it, with a lobby on top: a PIN, a join address, a QR code, and
     a **Start** button that is disabled until someone joins. (The classic lobby is a different, smaller card over the
     classic player. If you see that one, the lesson was routed to the classic room: note which, see "If it fell back".)
   - Open a lesson with feedback in it ("The art of paying attention") and choose Host live. It opens the classic room, as before.
2. **Join.** On two phones open the join address and enter the PIN and a name each. Both names appear in the lobby.
3. **Answer, reveal, leaderboard, advance.**
   - Press **Start**, then Next (arrow key, Space or click) until the question is on screen.
   - The strip reads "0 of 2 answered" and a clock counts down. The standings are beside the slide.
   - Answer on each phone. The count rises. A Next in the first second and a half is ignored, as in classic.
   - Press Next: the answer is revealed, with the votes on each option and "N of M got it right". The phones are told
     right or wrong. The standings show what each phone gained.
   - Press Next again to move on. Leave a second question to run out its clock without pressing anything: at zero the
     answer is revealed by itself.
   - Press **S** to see the full leaderboard. At the end of the game it reads "Final scores".
4. **Refresh a phone mid-question.** On a phone, reload the page during a question. It rejoins and shows the question
   again, still open. (This is the relay's behaviour, and the same as classic.) Do not refresh the **teacher's** page:
   see "Known gaps".
5. **Teacher entry from `manual.html`.**
   - From the show's bar (move the mouse; it appears at the bottom) choose the keyboard button, **Teacher entry**. A
     window opens at `manual.html#<32 characters>`. Allow pop-ups if the browser blocks it.
   - In the lobby: Add names, put one in, Add. The name joins the lobby. (Names cannot be added while a question is open;
     the relay refuses, and the window shows why.)
   - On a question: Live answers, then press A to D for the learner. "1 more answered" shows on the wall. With a learner
     in the room there is no clock, as in classic.
   - Choose Reveal in the window, or press Next on the wall: the entered answer counts with the phones'.
6. **Report.** Press Next past the last step, or Esc, or End. The room ends: the phones are told it is over, and the final
   standings stay on screen. Choose **Open the report**: the Session reports window opens on this session and lists the
   players and their answers. **Back to the lesson** returns to the editor, with the shell's rows and the page out of
   full screen. (On the free plan reports last until the next deploy or restart.)
7. **No lab file imports classic.** From the repository root:

   ```sh
   grep -rnE "js/live|js/player|src/render/|SF\.Player|SF\.Live" lab/src && echo FOUND || echo none
   ```

   `none` is the pass. (`npm --prefix lab test` also checks it, and the boundary rules in
   `lab/tests/boundaries.test.ts`.) Then run `npm --prefix lab test`: the replay tests against the recorded session pass.
8. **If it fell back (the safety net).** To see it, stop the relay's websocket (or open the lab with the network blocked
   after the page has loaded) and choose Host live on the qualifying lesson. After about 10 seconds the show closes,
   a toast says why and that the classic room is being used, and the classic Host live opens. It is never a dead button.

## Known gaps (what slice 3 does not carry over)

- **The teacher's page is not resumed.** Reloading the teacher's page during a studio room ends it (the relay closes the
  room after its grace). Classic resumes a held room (`slideforge.hostedRoom`); the studio's host does not write that key,
  because classic's page start would then try to resume a room it did not host.
- **Teacher Presenter, notes on another device and Rehearse** are classic. The studio's show has speaker notes (N) and
  nothing else of the presenter.
- **Revealing with a different answer** ("the answer is C", from the teacher-entry window) marks the room against that
  option; the answer slide the show moves to is still the one the lesson was keyed to.
- **A relay restart** mid-lesson opens a new room with a new PIN (the phones are told, and rejoin). Scores restart.
- **Hand tallies** from the window are sent to the relay and counted, but the wall's bars show only the phones' votes.
- **Rooms of more than 60 people** have no standings rail (as classic), only the full leaderboard (S).

## True or false (added 13 October 2026)

Repeat steps 1 to 5 with a lesson whose only game is **plain True or false** (Quiz studio, Browse, True or false, Add to the lesson; not the "True / false showdown").

1. Host live opens the studio's show and room, not SlideForge's.
2. Each statement reaches the phones as two buttons, True and False.
3. After the reveal, the wall shows two tiles with the right one marked, and the standings panel shows the gains.
4. Add a Showdown game to the same lesson: Host live now opens the classic room.

## Type answer (added 13 October 2026)

Repeat steps 1 to 5 with a lesson whose only game is **Type answer** (Quiz studio, Browse, Type answer, Add to the lesson).

1. Host live opens the studio's show and room, not SlideForge's.
2. Each question reaches the phones as a text box (no options). While it is open the wall shows only "n of m answered", not what was typed.
3. Type the answer on one phone in another case, with "the" in front, and a wrong answer on another. After the reveal the wall lists what the room typed, one row per answer (the right one marked, written as the question accepts it), says the accepted answer, and the standings panel shows the gain.
4. In manual.html, type an answer for a learner you added and press Record: it counts with the phones' after the reveal.
5. Add a Bingo game to the same lesson: Host live now opens the classic room. (Ranking challenge now runs in the studio, see below.)


## Slider (added 13 October 2026)

Repeat steps 1 to 5 with a lesson whose only game is **Slider** (Quiz studio, Browse, Slider, Add to the lesson). Time traveler is its own entry, see below.

1. Host live opens the studio's show and room, not SlideForge's.
2. Each question reaches the phones as a number slider with the question's range and unit. While it is open the wall shows only "n of m answered", not the answers or the band.
3. Place one answer inside the tolerance and one outside. After the reveal the wall draws a number line with the target and its tolerance band, a dot for each answer (the right ones green), and says the accepted answer with its unit. The standings panel shows the gains.
4. In manual.html, enter a number for a learner you added and press Record: it counts with the phones' after the reveal.
5. Add a Bingo game to the same lesson: Host live now opens the classic room. (Ranking challenge now runs in the studio, see below.)

## Audience feedback: poll, word cloud, brainstorm, scale (added 13 October 2026)

Repeat steps 1 to 4 with a lesson that has a few ordinary slides and, on them, **Engage, Feedback** set up with each kind (a poll with two or more options; a word cloud; a brainstorm; a scale with both ends named). Try one beside the slide ("rail") and one full screen ("focus"). A feedback slide with no prompt asks nothing, as in SlideForge.

1. Host live opens the studio's show and room, not SlideForge's. A lesson whose only questions are feedback slides still does.
2. On the feedback slide the phones get the prompt: poll buttons, a row of numbered points with the two ends named (scale), or a text box (word cloud, brainstorm; the "responses each" limit applies).
3. Answer from two or three phones. The wall updates as each reply lands: poll bars with counts, the scale's spread across its points with both ends and the average, repeated words growing larger in the cloud, idea cards with names newest first. The count "n of m answered" is read out by a screen reader. Rail sits beside the slide (the standings step aside), focus fills the screen.
4. Refresh a phone mid-prompt: it gets the prompt back and its reply. Press **Close** in the show bar: the phones are thanked and the wall shows the slide again. Go to the next slide and back: the prompt opens fresh.
5. With **Hold** set on a poll or scale (feedback settings), the wall shows only "n of m answered" until you press **Show** in the show bar.
6. Add a Bingo game (or an activity) to the same lesson: Host live now opens the classic room.

## Teams, class report, Rehearse and Draw (added 13 October 2026, M11b)

Use a lesson with a Multiple choice game and a feedback slide, and open it in the studio's show and room.

1. **Teams.** In the Slide panel, Game section, set **Room** to Teams and type two to six team names (Owls, Foxes, Herons). Host live: the lobby lists each team with a colour and its players. Join from two phones (each picks a team). Press **Add a class list**, paste three names, choose a team and press Add names: they appear under that team. After a question the standings panel shows **Team points** with each team's gain; Scores (S) and the final board list the teams first.
2. **Rehearse.** In the show bar press the people button, choose 8, 16 or 24. The sample learners join the room by its PIN and the lobby fills. Press Start: they answer each question over the time it allows, most right and some wrong, and reply to the feedback slide. Press the button again and **Send them home**: they leave.
3. **Class report.** End the room (End, or Esc). Press **Class report**: each question with its accuracy and who answered what, attendance and points, and a note that on the free plan the record lasts only until the next deploy or restart. Download the two CSVs and open them in a spreadsheet. A name that begins with = is written with a quote in front.
4. **Draw.** Press D (or the pen button). Draw with the pen, switch to the highlighter and a colour, erase a mark, press Z to undo and X to clear. The marks stay put when the window is resized. Go to the next slide: the marks are gone. Press D or Esc to put the pen away; a click on the slide is Next again.

## Ranking, Odd one out, Predict the outcome, True / false showdown, Time traveler (added 13 October 2026)

Repeat steps 1 to 4 of the first section (host opens the studio's show and room; phones join; Next; the report) with a lesson whose game is, in turn, each of these (Quiz studio, Browse, the format, Add to the lesson). Add a phone, plus a learner you add by name in manual.html.

1. **Ranking challenge.** The phones get the items to put in order. Send one right order, one reversed and one with two items swapped. After the reveal the wall lists the right order with a bar a place showing how many of the room had that item there, and "Most swapped: X and Y". Points: the right order scores 10, the reversed one 0, the one with two swapped part marks (round of 10 x the share in place). In manual.html, enter an order for the added learner: it counts.
2. **Odd one out.** The question is a vote. The wall shows only "n of m answered" while it is open and Next does nothing by itself, however fast the room votes. Next reveals the split of the four items with the prepared odd one and its reason, and a "Defend a pick" idea box opens beside it (send two ideas from phones: they appear). Next closes the box and moves on. Nobody scores, and the game ends on its last question without a scores slide.
3. **Predict the outcome.** The phones ask "I'm sure" or "Just a hunch" with the pick. The first Next (after a moment) locks the predictions: the phones wait, the wall shows the room's split with the answer hidden. The second Next reveals. Right and sure scores half as much again, right and unsure the points, wrong and sure loses half the points, wrong and unsure nothing; a score never goes below zero.
4. **True / false showdown.** Vote on two phones the same way and one the other way. The first Next shows the room its split: the wall draws one bar across True and False, and every phone may switch once (try it on one). The bar follows the switch with a marker where the room stood; the wall says how many switched. The second Next reveals the final answers. With a time limit the split shows itself half-way through the clock. A plain True or false game still has no split.
5. **Time traveler.** The phones place each event on one line that spans the whole game; the second question's line shows the first event already on it, the third two. After the reveal the wall draws the line, the band, the dots, and names the events already on it under the line.
6. Add a Bingo game to the same lesson: Host live opens the classic room.

What to look for that no test covers: how each wall looks at the back of a room (text size, the Ranking bars, the Showdown bar and its marker, the timeline names under the line), and that Next feels right on the held styles.

## Spot the error, Definition challenge, Emoji guess, Fill in the blanks, Compare & contrast (added 13 October 2026)

Repeat steps 1 to 4 of the first section with a lesson whose game is, in turn, each of these (Quiz studio, Browse, the format, Add to the lesson). Use two phones and a learner you add by name in manual.html.

1. **Spot the error.** The sentence is on the wall; each phone shows its words as buttons. Tap a wrong word on one phone, the error on the other. While the question is open the wall shows only "n of m answered" (where the room tapped is held). Next reveals: a bar under every word for how many tapped it, the error struck out, and "wrong words -> correction". A tap on any word of a two-word error counts. In manual.html, click a word for the added learner: it counts. The game ends on its last question, with no scores slide.
2. **Definition challenge.** The wall shows the passage and the phones say they are watching (no keyboard). Next asks the recall question (the wall moves to its "answer from memory" slide, the phones get a text box); the next Next reveals the typed answers, grouped. Leave the passage alone for its time instead (20, 30, 45 or 60 seconds, as set): the question is asked by itself. Not carried over: the "+30 s to read" button and a reading countdown on the wall.
3. **Emoji guess.** The clues are on the wall and the phones. On a medium puzzle the first Next puts up the letter pattern, the second the hint; on an easy one the pattern is up already and the first Next puts up the hint; on a hard one the first Next puts up the hint. After the hint, answer from a phone: it scores half (check the standings). Answers before the hint score in full. A Next after the last help reveals. (A lesson saved before this change keeps its old support clicks until the difficulty is set again in the Game panel.)
4. **Fill in the blanks.** Each phone gets the passage with its gaps and a word bank; fill every gap. Send one with every gap right, one with one gap right, one wrong. Points: all right scores in full, one of two right scores half. The wall holds the picks until Next, then shows the passage with the right words in the gaps and, gap by gap, what the room chose (a popular wrong word is listed first). In manual.html, choose a word for each gap in turn for the added learner.
5. **Compare & contrast.** Each phone sorts every statement into the first item only, Both, or the second item only. The wall shows only "n of m answered" while it is open. Next reveals: each statement with a count under each column, the right column marked, and "Most misfiled" naming one. A sort's points are 0 unless the Game panel sets some, so check the right and wrong verdicts instead. In manual.html, pick a column per statement. A game that uses the discussion mode (a proposal box) opens the classic room instead: say so if it does not.
6. Add a Bingo game to the same lesson: Host live opens the classic room.

What to look for that no test covers: how the heat under the words, the gap-by-gap picks and the sort counts read at the back of a room; that the Emoji hint appears on the wall at the same press the relay halves the points; that the Definition recall slide is the one the wall shows once asked.

## Horse race, Boss battle, Word reveal (added 13 October 2026)

Host each game from the shell's Host live, in a lesson with a Horse race, a Boss battle or a Word reveal first. The studio's own room opens (not the classic host). Join with two phones, and enter a third learner by key in teacher entry.

1. **Horse race.** Use a teams room (set the teams in the Game panel). After each reveal the wall shows the track: a lane a team, the leaders first, the team whose members mostly picked the right answer one step on, and a note ("1 team moves up", or "Nobody moved"). A tie inside a team does not move it. Each phone shows its own lane and place. After the last question the scores slide says who is furthest along. In an individual room each player has a lane and moves on their own right answers. A lesson with a quiz after the race takes part in the race too: its choice questions move the lanes.
2. **Boss battle.** The wall shows the boss's health bar at its full HP, which is its own game's questions only (put a quiz in the same lesson to check it adds nothing). Reveal a question the room got right: the bar drops by the question's damage (easy 1, medium 2, hard 3, boss 5), the wall says "Hit! -2 · 8 / 11 HP left" and "The attack: n of m ...". Reveal one the room got wrong: "Miss". Each right player gets +1. After the last question the scores slide says whether the room brought the boss down. In the report, each question has its hit or miss and the HP left. The desk's Hit and Miss buttons are not in the room; say so if you look for them.
3. **Word reveal.** The wall shows the word with its opening letters, and one more letter every few seconds (the drip interval), with the hint under it. Type the word on a phone early and then late: the early answer scores more (under half the word showing 100, under three quarters 75, then 50). A wrong answer scores 0. The drip stops at the reveal. The Next key reveals; the answer slide spells the word out. The lab's own tiles are still on the slide under the dripping word: check they do not make the wall hard to read.

## The spoken games (added 13 October 2026)

Host each game from the shell's Host live, in a lesson whose games are only these. The studio's own room opens (not the classic host). Join with two phones, enter a third learner by key in teacher entry, and open teacher entry. The phones show a listen-and-watch card: nothing is answered on them. Use an individual room first, then a teams room.

1. **Random challenge and Question cube.** The wall shows the verdict pads (Complete and Skip; Answered and Pass for the cube, which also names its face), a "Who spoke" picker and a count ("0 completed"). Pick Ada and press Complete (or press the option in teacher entry after choosing Ada under Speaker): the reveal says who spoke, the count goes up, and nothing is scored (these only count, in every mode). Press Next on a question with no verdict: it closes as Skip. The cube's own sentence about crediting the team is the playbook's; the relay pays 0.
2. **Spin & explain.** Verdicts Clear, With hint and Reject. In a teams room press Clear with the picker on "The room": the wall says "Clear: who spoke?" and waits. Choose a player: the verdict lands, and that player's team scores 1,000 (500 for With hint). Press "count it for the room" instead: it lands with no points. Reject never waits and names nobody. In an individual room nobody scores unless the game scores spoken.
3. **Heads up.** Choose the guesser (the picker is called Guesser): their phone says they are guessing, the others show the term. The wall shows one clock for the whole pile and the count of terms got right. A verdict moves straight to the next term after a moment, with the guesser kept. Let the clock run out: the open term closes, the wall says "Time!" with the count and the guesser's name, and Next skips the terms nobody reached, to the scores. Check the clock matches the Game panel's seconds.
4. **Connection maker.** An idea box opens beside the question on the phones. Send a bridge from each phone: the wall shows the proposals without names, and teacher entry lists them with their authors. Put one on the table (a chip on the wall, or "Use this" in teacher entry): its author becomes the speaker. Press Accept: in a teams room their team scores 1,000. The box closes with the verdict. The drawn approved-bridge lines are not here (a known open classic item).
5. **Concept chain.** The phones stay on the idea box (nothing is asked of them). Press Accept with no link typed: nothing happens, and the wall says to type one. Type a link in the wall's box, or put a proposal on the table, and press Accept: a branch grows on the map, its author's team scores 1,000, and the term stays open for another. Press Reject on a link: it is put down. Press Next: the box closes, and the term closes as Accept if the chain grew from it, as Reject if not. The map keeps every term; check three earlier terms and a "+n earlier" line still read.
6. A lesson that adds a Quiz bowl, a memory game or Bingo still opens the classic room: say so if it does not.

What to look for that no test covers: how the pads, the clock, the chain map and the proposal chips read at the back of a room and on a projector; that choosing a guesser really takes the term off that phone (the relay does it, and only a real phone shows it); that the entry window's Speaker and Use this work with the wall's own pads at the same time; and that the cold-call "Pick for me" in teacher entry still names a speaker.

## Beat the clock and Low-stakes quiz (added 13 October 2026)

Host each from the shell's Host live, in a lesson whose games are only these. The studio's own room opens (not the classic host).

1. **Beat the clock, the sprint.** Join with three phones and enter nobody by key. Land on the sprint slide: every phone gets its own first question at once, and the wall shows "Against the clock", one clock (the Game panel's seconds, 30 to 600, 90 when unset), a progress bar and "n answers in · n% right · n of n finished". No question is on the wall. Tap through on the phones at different speeds: each tap is marked on the phone at once (10 and up to 10 more for speed, -5 for a wrong one) and the wall's count moves. Press Next once: the wall says "Press Next again to stop the clock". Press it again within three seconds (or press Stop the clock): the clock stops, the wall says "Counting the answers…", then the room's right answers and the hardest question with the wrong answer most of them chose ("Nobody got one wrong" on a clean run). Press Next: the show goes past the run to the answers slide and the scores. Let a second run's clock run out instead: the wall says "Time!" and the relay closes the run by itself. Drop a phone mid-run and rejoin it: it waits for the result (a known relay gap: a rejoined phone gets no question back).
2. **Beat the clock, wall-paced.** Enter a learner by key in teacher entry, then start. The run plays as questions on the wall, one at a time, under one clock for the run (a strip at the top: time left and "n right"). The phones count down the round, not the question. Enter the keyed learner's answer and press Next to reveal: the right answers score by speed, the wrong ones lose 5, and the round's count goes up. A question left alone does not close itself while a keyed learner is in the room. Let the round's clock run out: the open question closes, and Next skips the questions nobody reached.
3. **Low-stakes quiz.** Join with phones: they show "Write on paper". The wall shows the questions (the slide) and a bar with the quiz clock (3:00 by default), what to do now and the buttons. Press Start the quiz: the clock runs down. Press Pause and Resume: the clock holds while paused. Go to another slide and come back: the board is as you left it, and the time away was not counted. Press Reveal answers: the answers slide comes up, and the class report later shows "5 questions · early reveal" by "The class". Press Finish, then Play this quiz again: it is ready again. Let the clock run out once: the answers come up by themselves, and the report says "time up". No scores slide follows.
4. (Superseded: Quiz bowl, the memory games and Bingo now run in the studio's room; see below.)

What to look for that no test covers: the sprint's board and the board's bar at the back of a room and on a projector; that the phones really get the sprint's questions (the relay sends them, and only a real phone shows them); the sprint's clock against the phones' clocks; and that the teacher-entry window stays usable through a sprint and a board (it has nothing to enter for either).

## The memory boards, Bingo and Quiz bowl; the show's overview (added 13 October 2026)

Host each from the shell's Host live, in a lesson whose games are only these. The studio's own room opens (not the classic host). Each game is two steps: its cover, then its board; no scores slide follows.

1. **Memory flip.** Join with phones: on the board they show "Watch the cards". The wall shows the whole board over the slide: four cards, a clock and Start studying. Press it: every pair is up and the study clock (10 s) runs down, then the cards hide by themselves (or press Ready to recall). Click a card: the check strip asks for it aloud; press Reveal definition, then Claim card: the card shows as collected, and the class report later lists the term. Pass this turn instead: the card stays for another try. Collect all four: "Every pair remembered." and Play this set again.
2. **Memory match.** As Memory flip, with the teams: the caption names whose turn it is ("Red — choose a keyword."), a claim puts the team's name on the card and the turn moves on. At the end the tally shows each team's cards.
3. **Knowledge flip.** No study clock: Open the board, and the keywords stay up; choose one, explain it, reveal, claim. The phones' skin is Knowledge flip's.
4. **Bingo.** In teams: every team has its own 3 × 3 card. Press Deal and start, then Call a definition: the definition is up, the term is hidden, and each card says "Waiting on an answer". Press Reveal the term: the cards that have it offer Claim and Missed, the others say why not ("Not on this card"). Claim for a team: its square fills, and the report later shows the term for that team. Make a line: the card shows LINE, and the next press is Finish — bingo; then Deal a new card gives every team a new card.
5. **Quiz bowl.** In teams: Open the board shows the categories and values. Click a value: its question replaces the grid. Press Reveal the answer: each team has a "+ value" button; press one, and the team's score goes up by the cell's value and the cell is spent (Nobody scored spends it too). Reach the target (1000 by default) or empty the board: the winner is named, and Play this board again. The report shows each award with its points.
6. **The overview.** In any show press O (or the grid button): every slide is a tile with its picture (they appear one by one within a second or two, the ones on screen first), its number and name. Game slides carry a badge naming the game ("Quiz · Multiple choice", "Horse race", "Bingo"), activity slides "Activity · <its name>", feedback slides "Poll", "Word cloud", "Brainstorm" or "Scale". Arrows, Enter and Esc still work, and the show is not held up while the pictures draw.

What to look for that no test covers: the full boards at the back of a room and on a projector (four bingo cards at once, a long Quiz bowl question, eight memory cards); that clicking a card or a cell does nothing it should not while paused; and the overview's pictures on a long lesson (a hundred slides) on a slow machine.
