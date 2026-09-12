# Activity starter-content audit

Completed 52 additional activities; the existing Hook & Predict and Connection Slide copy is retained. All 54 are now available.

## Method and provenance

`catalogue.js` retains the original titles, descriptions, duration estimates and steps. `source-meta.json` records the source template files and materials, with a verbatim snapshot used by the fidelity tests. `presets.js` and `game-presets.js` contain authored, editable starter examples; these are not research claims or source-authored subject content. Most examples use measurement and geometry so they can be reviewed as a coherent bank. Reflection and discussion stems use source wording wherever provided.

## Behaviour

- Flipped Instruction inserts three slides; Guided Inquiry inserts four. Each sequence occupies one activity row and duplicates/removes as a group.
- Feedback activities insert their own prepared slide, preserving other activities and existing feedback.
- Classroom materials and answer guidance are in the inspector and speaker notes.
- Timers display minutes in the activity inspector and store seconds for the player. Source duration discrepancies are explained in teacher guidance rather than silently rewriting the source.
- Three activities use classroom materials because the mapped engine cannot perform the source task: Error Analysis, Concept Card Sort and Connect Four. The latter supplies the 16-cell matching grid for physical play.
- Where engines implement only part of a protocol (Venn diagrams, Heads Up voting, Unsure responses), the required paper/room steps are explicit in teacher guidance.

## Layout and tool decisions

| Activity | Final tool / layout | Reason for change |
| --- | --- | --- |
| Hook + Objectives | slide: keywords | Four explicitly presented boxes need labels; split reserves half the slide for an image. |
| Daily Review Routine | slide: keywords | Four stages overflow the three-card row; labelled rows preserve the sequence. |
| I Do, We Do, You Do | slide: keywords | The source has four phases, including both You Do stages; three cards obscure that distinction. |
| Worked Example Analysis | slide: keywords | A text worked example plus analysis, recipe and transfer task needs four labelled rows; an empty image slot adds no teaching material. |
| Error Analysis | slide: keywords | Odd One Out reveals one odd item; the source requires sample work with several errors and a correction. Use a labelled analysis slide with the answer in teacher notes. |
| Concept Card Sort | slide: keywords | Ranking enforces one linear order and at most eight items. The source requires 12–15 cards in student-chosen categories; use physical cards with the full bank on screen. |
| Problem-Based Learning | slide: keywords | Six named stages cannot be expressed by one column plus an image; labelled rows retain every stage. |
| Differentiated Practice Menu | slide: keywords | The compulsory task plus three choices needs four named boxes, beyond the three-card row. |
| Design & Create Task | slide: keywords | Five source stages need five labels; cards wraps and hides the distinction between brief and success criteria. |
| Dialogue Chain Discussion | slide: keywords | A question and distinct sentence stems need labels; the source includes more than three contributions. |
| Benefits vs Limitations Battle | slide: keywords | Split is a text/image layout, not two equal text teams; labelled rows make both roles and scoring visible. |
| Scenario Analysis Discussion | slide: keywords | The source explicitly asks for three scenarios and four guiding questions; a split image slot cannot hold them. |
| Connect Four - Concept Edition | slide: table | Concept Chain grows spoken links and has no 4×4 matching grid. This activity supplies the source’s Mode A grid for classroom play; cover claimed pairs physically and score on the board. |
| Learning Log Entry | slide: keywords | Five named reflection prompts need visible labels; a generic content list loses those response categories. |
| Exit Ticket (Plenary) | feedback: keywords | Choose the source’s What–So What–Now What format. Written reflections need free text; a poll cannot collect them. |
| Preview Next Lesson | slide: keywords | Section only renders a title and subtitle. Four explicit source boxes require labelled rows. |
| Exit Ticket | feedback: keywords | Choose the source’s 3–2–1 format; one written submission preserves all three responses, unlike a fixed poll. |

## Coverage

| Activity | Prepared content |
| --- | --- |
| Clear Objectives Slide | 3 labelled content fields |
| Hook + Objectives | 4 labelled content fields |
| Connection Slide | 5 labelled content fields |
| Quick Retrieval Quiz | 5 questions / rounds with answer guidance |
| Think-Pair-Share | 4 labelled content fields |
| Hook & Predict | 2 labelled content fields |
| Word Splash | 4 labelled content fields |
| Daily Review Routine | 4 labelled content fields |
| Establish Talk Ground Rules | 5 labelled content fields |
| Do Now / Bell Ringer | 3 labelled content fields |
| Knowledge Activation Web | 4 labelled content fields |
| Pre-Assessment Quickfire | 8 questions / rounds with answer guidance |
| I Do, We Do, You Do | 4 labelled content fields |
| Concept Development | 5 labelled content fields |
| Flipped Instruction | 3 slides |
| Question Cube - Six Question Types | 6 labelled content fields |
| Worked Example Analysis | 4 labelled content fields |
| Error Analysis | 4 labelled content fields |
| Quick Practice Stations | 3 labelled content fields |
| Concept Card Sort | 5 labelled content fields |
| Interleaving Mixed Practice | 10 questions / rounds with answer guidance |
| Strategic Wait Time Questioning | 4 labelled content fields |
| Guided Inquiry Investigation | 4 slides |
| Jigsaw Expert Groups | 3 labelled content fields |
| Problem-Based Learning | 6 labelled content fields |
| Differentiated Practice Menu | 4 labelled content fields |
| Design & Create Task | 5 labelled content fields |
| Think-Pair-Square-Share | 4 labelled content fields |
| Jigsaw Collaboration | 3 labelled content fields |
| Peer Teaching Carousel | 4 labelled content fields |
| Socratic Seminar (Simple) | 4 labelled content fields |
| Dialogue Chain Discussion | 5 labelled content fields |
| Real-World Connection Hunt | 5 labelled content fields |
| Explanation Champion Challenge | 4 questions / rounds with answer guidance |
| Compare & Contrast Venn Activity | 3 questions / rounds with answer guidance |
| Benefits vs Limitations Battle | 5 labelled content fields |
| Scenario Analysis Discussion | 5 labelled content fields |
| Whiteboards on Walls | 5 labelled content fields |
| Connect Four - Concept Edition | 1 labelled content fields |
| Multiple Choice Quiz | 6 questions / rounds with answer guidance |
| True/False Rapid Fire | 10 questions / rounds with answer guidance |
| Short Answer Check | 5 questions / rounds with answer guidance |
| Diagnostic Question | 2 questions / rounds with answer guidance |
| Structured Reflection Protocol (Four-Corner) | 4 labelled content fields |
| Learning Log Entry | 5 labelled content fields |
| Muddiest Point | 3 labelled content fields |
| Plus-Minus-Interesting (PMI) | 3 labelled content fields |
| Exit Ticket (Plenary) | 3 labelled content fields |
| Preview Next Lesson | 4 labelled content fields |
| Exit Ticket | 3 labelled content fields |
| Recap Quiz Game | 6 questions / rounds with answer guidance |
| Teach Someone | 4 labelled content fields |
| Visual Summary | 3 labelled content fields |
| Reflection Ladder | 4 labelled content fields |

## Verification

`npm test` checks the build, TypeScript, source fidelity, default completeness, field persistence, timer units, feedback validity and game compilation. `SF_URL=http://localhost:8799 node tools/smoke-activities.mjs` checks all 54 insertions, sequence edits/duplication/removal, timer editing and 294 slide renders across all six themes in an isolated browser. Run a local server first.
