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
5. Add a Ranking challenge game to the same lesson: Host live now opens the classic room.


## Slider (added 13 October 2026)

Repeat steps 1 to 5 with a lesson whose only game is **Slider** (Quiz studio, Browse, Slider, Add to the lesson). Time traveler is a different format and still opens the classic room.

1. Host live opens the studio's show and room, not SlideForge's.
2. Each question reaches the phones as a number slider with the question's range and unit. While it is open the wall shows only "n of m answered", not the answers or the band.
3. Place one answer inside the tolerance and one outside. After the reveal the wall draws a number line with the target and its tolerance band, a dot for each answer (the right ones green), and says the accepted answer with its unit. The standings panel shows the gains.
4. In manual.html, enter a number for a learner you added and press Record: it counts with the phones' after the reveal.
5. Add a Ranking challenge game to the same lesson: Host live now opens the classic room.

## Audience feedback: poll, word cloud, brainstorm, scale (added 13 October 2026)

Repeat steps 1 to 4 with a lesson that has a few ordinary slides and, on them, **Engage, Feedback** set up with each kind (a poll with two or more options; a word cloud; a brainstorm; a scale with both ends named). Try one beside the slide ("rail") and one full screen ("focus"). A feedback slide with no prompt asks nothing, as in SlideForge.

1. Host live opens the studio's show and room, not SlideForge's. A lesson whose only questions are feedback slides still does.
2. On the feedback slide the phones get the prompt: poll buttons, a row of numbered points with the two ends named (scale), or a text box (word cloud, brainstorm; the "responses each" limit applies).
3. Answer from two or three phones. The wall updates as each reply lands: poll bars with counts, the scale's spread across its points with both ends and the average, repeated words growing larger in the cloud, idea cards with names newest first. The count "n of m answered" is read out by a screen reader. Rail sits beside the slide (the standings step aside), focus fills the screen.
4. Refresh a phone mid-prompt: it gets the prompt back and its reply. Press **Close** in the show bar: the phones are thanked and the wall shows the slide again. Go to the next slide and back: the prompt opens fresh.
5. With **Hold** set on a poll or scale (feedback settings), the wall shows only "n of m answered" until you press **Show** in the show bar.
6. Add a Ranking challenge game (or an activity) to the same lesson: Host live now opens the classic room.
