# Game UX setup review — 12 September 2026

Scope: all 27 catalogue formats. This is an authoring and interaction-structure pass, not a full gameplay certification. No automated test suite or extended code review was run, following the requested credit limit. JavaScript syntax and whitespace checks passed.

## Changes applied

- Format-specific setup guidance and participation descriptions in the editor and activity library.
- Authoring units now use Statement, Pair, Term, Cell, Scenario, Event or another appropriate name.
- Full how-to instructions collapse by default; essential setup guidance remains visible.
- Removed duplicate generic question fields for spoken formats.
- Removed configurable points where the mechanic already determines scoring, and phone-confidence controls from spoken formats.
- Teacher-led formats no longer offer a misleading individual/team scoring selector.
- Word edits keep the matching primary accepted answer in sync while retaining other accepted variants.
- Playbook copy now distinguishes existing SlideForge behaviour from mechanics that still need implementation.

## Per-format setup

| Format | Authored unit | Participation | Setup guidance |
| --- | --- | --- | --- |
| True/False Showdown | Statement | Learners vote true or false | Write one unambiguous claim and explain the misconception in the reveal. |
| Low-Stakes Quiz | Question | Class writes on paper | Prepare 3–10 short question-and-answer pairs for one readable worksheet. |
| Quiz Bowl | Cell | Teacher awards spoken answers | Group questions into up to six categories. Set a value and a private answer for each cell. |
| Beat the Clock | Question | Learners choose an answer | Keep prompts and choices short enough to read under pressure. Add a varied question pool. |
| Boss Battle | Challenge | Class works towards a shared win | Mix easy, medium and hard questions. Difficulty sets damage, so check the total boss health. |
| Horse Race | Leg | Teams or individuals race | Add enough legs for the finish distance. Use plausible distractors so team agreement matters. |
| Memory Flip | Pair | Teacher checks a class collection | Use distinct terms and concise definitions. Up to eight pairs fit on each study board. |
| Memory Match | Pair | Teacher checks rotating turns | Prepare a memorable set of terms and definitions, then choose team names and study time. |
| Memory Maze | Route | Not yet available | This spatial game is not yet available. Use Memory Match for a playable recall activity. |
| Bingo | Term | Teacher calls and verifies | Write a spoken definition for every term. Include more terms than squares for varied cards. |
| Knowledge Flip | Keyword | Explain aloud, then collect | Use keywords with meanings worth explaining. Definitions stay private until checking. |
| Definition Challenge | Passage | Read first, then type from memory | Keep the passage short. Ask something that requires remembering it after it disappears. |
| Emoji Guess | Puzzle | Learners type the concept | Make each symbol contribute to the answer. Add accepted spellings and a useful optional hint. |
| Word Reveal | Word | Learners guess as letters appear | Use a recognisable term, a meaningful hint and accepted spellings. Set letter pace per word. |
| Fill in the Blanks | Sentence | Typed cloze activity | Use one gap per sentence in this typed-answer version. Add the missing word and accepted variants. |
| Heads Up | Term | Class gives spoken clues | Use describable terms. Position the guesser facing away from the projected term. |
| Spin & Explain | Concept | Teacher judges explanations | Choose concepts that invite explanation, with a hint that supports rather than gives the answer. |
| Spot the Error | Sentence | Learners select a candidate phrase | Include the full sentence. Use exact phrases as answer choices and explain the correction. |
| Ranking Challenge | Set | Learners reorder and submit | State the ordering criterion. Enter 3–8 distinct items in the correct order; play shuffles them. |
| Odd One Out | Set | Class discusses; no score | Prepare four comparable items and a defensible reason. Welcome alternative rules in discussion. |
| Compare & Contrast | Comparison | Class discusses; no score | Choose two comparable ideas. Prepare similarities and differences separately for the reveal. |
| Predict the Outcome | Scenario | Learners choose an outcome | Give enough context to reason from. Offer three plausible outcomes and explain the cause. |
| Time Traveler | Event | Learners type an event name | Include the year and a revealing clue without naming the event. List accepted event names. |
| Connection Maker | Connection | Teacher judges a spoken connection | Choose two ideas with a meaningful bridge. Put acceptable reasoning in the explanation. |
| Question Cube · discussion prompt | Prompt | Open written discussion | This version adds an open discussion prompt beside a slide; it does not roll a cube. |
| Random Challenge | Challenge | Teacher records completion | Give a clear task and a visible success criterion. Keep preparation practical for the room. |
| Concept Chain | Starting concept | Class proposes; teacher accepts | Pick a concept with several possible links. Give the class a clear connection rule. |

## Gameplay work still required

- Beat the Clock and Heads Up currently restart time per item; continuous round timing remains incomplete.
- Spin & Explain and Random Challenge currently follow authored order; real random selection remains incomplete.
- Question Cube is currently a feedback prompt, without a cube or prompt pool.
- Time Traveler currently uses typed event recall without a growing interactive timeline.
- Fill in the Blanks is currently a typed single-gap activity, rather than a multi-gap discussion board.
- Memory Maze remains unavailable.
- Spoken verdicts lack a recipient selector; they should not be presented as individual/team competition.

These gaps need runtime work. The setup copy now exposes the distinction; this pass does not claim to have implemented those mechanics.
