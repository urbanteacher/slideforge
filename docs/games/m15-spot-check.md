# M15 spot check: Present in the studio's own slideshow (trial)

For the owner to run by hand. The trial is **off by default**. Nothing below changes anything for you until you turn it on.
Background: [m15-discovery.md](m15-discovery.md), section 6 (steps 3 to 6) and [lab-engine-plan.md](../lab-engine-plan.md), change log, 13 Oct 2026.

## Turn it on or off

- **File → Use the studio's slideshow (trial).** A tick shows when it is on. It is kept in this browser (`localStorage`, `slideforge.studioPresent`).
- Or open the app with `?studioPresent=1` to turn it on, `?studioPresent=0` to turn it off.

## Two lessons to try

- **One that qualifies:** a lesson with only slides, Multiple choice, True or false, Type answer or Slider games, and no activity, live figure or SlideForge check. "Lab 1" (`ipdv-lab1`) is one.
- **One that does not:** the Layout bank (Boss battle, Ranking), or any lesson with an activity slide. It **must** still open SlideForge's classic show, with its own bar.

## On the lesson that qualifies (trial on)

1. **Present.** The page goes full screen and the studio's show opens on the slide you were editing. Arrow keys, click and Space move on. Esc (or the close button) leaves; the editor is on the slide the show ended on, and Present again goes on from there.
2. **Teacher Presenter** (Present menu). The desk window opens as the show opens, and follows the slide. Its buttons move the show. If the browser blocks the pop-up, the show says so: allow it and use the monitor button.
3. **Notes on another device.** The show opens with the notes card (a link and QR) up. A phone or prompt screen opened from it follows your slides, and its next and back work.
4. **Rehearse** is still SlideForge's own (a sample class in the classic show). It should look as it always did.
5. **Draw** (pen button, or **D**): pen, highlighter, eraser, colours. Marks clear when you change slide.
6. **Black and white screen** (**B** and **W**; press again to come back).
7. **Jump:** type a slide number, then Enter. **Overview** (grid button, or **O**): pick a slide.
8. **Hidden slides** are skipped, as in classic.
9. **Esc** (once to leave full screen, again if the show is still up), or the close button: the page leaves full screen and the editor works again (keys, menus).

## On the lesson that does not qualify (trial on)

- Present, Teacher Presenter and Notes on another device must all open **SlideForge's classic show**, exactly as with the trial off. Nothing of the studio's show appears. (The browser console says "Present: the classic show, because ..." with the reason.)

## What to look at

- Does the studio's show look right to you: type size, backgrounds, motion and transitions on each slide?
- Is anything you use in a lecture missing? Known gaps: a question slide in this show has no tap-to-answer-and-reveal for the teacher alone (it shows the question, then the answer slide); Rehearse; a show does not come back after a reload.
- After the show: is the editor on the slide you stopped at?
- Keys after leaving: if the keyboard seems dead in the editor, click on the page once, and tell me. The shell stands down for its own show but not yet for the studio's (blocker 9).

If something is wrong, turn the trial off (File menu, or `?studioPresent=0`). Nothing else needs undoing.
