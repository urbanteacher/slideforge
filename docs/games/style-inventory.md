# Style, activity and feedback inventory (M0.3, M0.4)

## What this is

12 October 2026. Discovery for [lab-engine-plan.md](../lab-engine-plan.md), items M0.3 and M0.4. It lists every game style, feedback kind and activity the classic app plays, what each one needs from the room, and every place it is registered. It ends with the fields a classic slide and a saved game can hold (M0.4), and a porting order with a pilot for M7.

Everything here was counted from the code on `deploy-render` at `f3c5bc6`. No code was changed. Line numbers are for that commit and will drift.

Sibling discovery docs: [player-usage.md](player-usage.md) (M0.1), [protocol.md](protocol.md) (M0.2), [data-sources.md](data-sources.md) (M0.5), [in-flight.md](in-flight.md) (M0.6).

### The counts

| What | Count | Where it is counted |
|---|---|---|
| Game **formats** (what the library and the plan call "styles") | **30** | `FORMAT_STYLE`, `src/games/catalogue.js:89-124`; `lab/src/assets/games.json` holds the same 30 |
| Game **engines** (style files registered in `GAME_STYLES`) | **26** | `src/games/registry.js:61`; `GameStyleKey`, `src/types.d.ts:46-51` |
| Feedback kinds | **4** (poll, word cloud, brainstorm, scale) | `FEEDBACK_KINDS`, `src/deck/feedback.js:8-44` |
| Activities | **54**, all enabled | `ACTIVITIES`, `src/activities/catalogue.js:57` |
| Activities run as timed stages | **16** | `PRESENTATIONS.stages`, `src/activities/presets.js:258-267` |
| Phone input kinds | 7 (`choice`, `text`, `number`, `order`, `tap`, `fill`, `sort`) | `INPUTS`, `src/games/catalogue.js:149` |

The plan's "30 game styles" are the 30 formats. Four engines carry two formats each:

| Engine | Formats on it | What the second format adds |
|---|---|---|
| `choice` | Multiple choice (`choice`), Predict the outcome (`predict-outcome`) | `predict`, `holdResults`, `confidence` set in `compileGame` (`src/model.js:1249-1253`): lock, watch, confidence bet |
| `truefalse` | True or false (`truefalse`), True/false showdown (`true-false`) | `showdown`, `holdResults` (`src/model.js:1254-1257`): split, one switch |
| `slider` | Slider (`slider`), Time traveler (`time-traveler`) | one span and a growing `timeline` (`src/model.js:1261-1273`); legacy typed saves healed (`src/model.js:967-969`) |
| `randomchallenge` | Random challenge (`random-challenge`), Question cube (`question-cube`) | verdicts become Answered / Pass (`src/model.js:1237-1241`); its own AI spec (`js/ai.js:1201`) |

Memory Maze is in the playbook (`js/playbook.js:145`) but has no format or engine. It is disabled by decision (games audit §6).

---

## 1. Game styles

### 1.1 What every style shares

- **The style contract (K1).** Each engine exports `make`, `normalize`, `problems`, `compile`, `mark`, `summary`, optional `describe` and `board`, plus `input`, `mechanic`, `plays` and declarations (`src/types.d.ts:641-724`).
- **Compilation.** `compileGame` (`src/model.js:1154`) makes an intro `section` slide (marks the round boundary with `gameId`), a "How to play" `content` slide from the playbook (`src/model.js:1177-1197`), one `quiz` slide per question through `fillQuestionSlide` (`src/model.js:1035`), an optional `explain` slide per question (`explainStyle` `slide` or `both`), and a `results` slide. A board engine returns its own board slide instead of question slides (`src/model.js:1199`).
- **Marking.** The host marks with `markResponse` (`src/games/registry.js:39`); the relay records and does the arithmetic. The one exception is Beat the Clock's sprint (K29, below).
- **Default relay scoring.** A right answer with no host-supplied gain scores `points × (0.5 + 0.5 × speed)` on a timed question, or `points` untimed. The speed factor is dropped when entered rows are in the room (`server/server.js:2084-2091`). An answer after Emoji's hint scores half (`server/server.js:2093-2096`).
- **Host-supplied gains** replace the default per mechanic or input in `sendReveal` (`js/live.js:3250-3288`).
- **Rooms.** Each engine declares `plays: {phones, teams, entry, solo}` from a shared profile in `src/games/rooms.js:5-77`. The contract test enforces it (`tests/game-style-contract.test.js:69-82`).
- **Solo practice (GA-28).** `practiceDoc` keeps a game in a Share → Practice link only when `plays.solo.status === 'yes'` (`src/model.js:1408-1430`, called from `js/share.js:85-86`). Six engines qualify: `choice`, `truefalse`, `race`, `speed`, `boss`, `spot` (8 formats).
- **Teams.** All 26 engines declare teams `yes`. A team scores the sum of its members' per-question averages (`server/server.js:2102-2119`).
- **Rounds.** Every game in a deck is a round: the host sends `round` on a new `gameId` (`js/live.js:3084`), the relay reopens joining (`server/server.js:1794-1806`).
- **Class reports.** Every quiz question is journalled (`question`, `answer`, `manualAnswer`, `reveal`) and projected by `server/sessions.js:80`. Exceptions are noted per style.

### 1.2 The big table: behaviour

Columns:
- **In**: the phone input kind.
- **Mech**: `mechanic`.
- **P / T / E / S**: phones, teams, teacher entry, solo, from `plays` (y yes, p partial, n no).
- **Scoring**: what decides the points.
- **Wall**: the `quizPresent` key and branch in `src/render/quiz.js` (layout at `:385`), or the board file.
- **Entry**: teacher entry by key in `js/manual.js`.
- **K29**: whether the relay marks.
- **Demo**: the rehearsal kind from the playbook (`demoKind`, `js/playbook.js:717`), which `js/demo.js:50` follows.

| # | Format | Engine | In | Mech | P/T/E/S | Scoring | Wall | Entry | Solo | K29 | Board | Round clock | Demo |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Multiple choice | `choice` | choice | points | y/y/y/y | default | `choice`: generic options `quiz.js:1158` | key A–F / 1–6, tally | yes | no | no | no | class |
| 2 | Predict the outcome | `choice` | choice | points | y/y/y/y | `predictGains` ×1.5 sure-right, −½ sure-wrong (`live.js:2152-2166`) | `predict` `quiz.js:1164, 1226` | key, tally | yes | no | no | no | class |
| 3 | True or false | `truefalse` | choice | points | y/y/y/y | default | `truefalse` `quiz.js:723, 1159` | key, tally | yes | no | no | no | class |
| 4 | True/false showdown | `truefalse` | choice | points | y/y/y/y | default, final answer | `truefalse` + showdown bar `quiz.js:1236` | key, tally | yes | no | no | no | class |
| 5 | Horse race | `race` | choice | race | y/y/y/y | default; lanes move on team majority (`live.js:1693`) | options + track `quiz.js:206`, overlay `src/render/live.js:600` | key, tally | yes | no | no | no | class |
| 6 | Beat the clock | `speed` | choice | speed | y/y/y/y | sprint: `sprintPoints` 10 + (10 − s), wrong 0 (`server.js:1149`); wall-paced: `speedGains` (`live.js:2044`) | `speed` + round clock `quiz.js:1222`; sprint wall `paintSprint` `live.js:1980` | key (wall-paced only), tally | yes | **yes** | no | yes (`js/rounds.js:38`) | class (no sprint) |
| 7 | Boss battle | `boss` | choice | boss | y/y/y/y | `bossGains` +1 per hit (`live.js:2068`); damage 1/2/3/5 by difficulty | `boss` `quiz.js:667`, bar `src/render/live.js:690` | key, tally | yes | no | no | no | class |
| 8 | Slider | `slider` | number | points | y/y/y/p | default; inside `tolerance` | number line `quiz.js:174, 1101` | typed number per row | no | no | no | no | class |
| 9 | Time traveler | `slider` | number | points | y/y/y/p | default | `timetravel` line with `timeline` `quiz.js:174-205` | typed number | no | no | no | no | class |
| 10 | Type answer | `type` | text | points | y/y/y/p | default; `markTyped` (`src/games/marking.js`) | `typed` `quiz.js:1101` | typed text | no | no | no | no | class |
| 11 | Ranking | `order` | order | points | y/y/y/p | `orderGains` round(10 × share in place) (`live.js:2146`) | `ranking` `quiz.js:1074` | key sequence (`manual.js:242`) | no | no | no | no | class |
| 12 | Emoji guess | `emoji` | text | points | y/y/y/p | default; half after `hintOut` (`live.js:2900`, `server.js:2250`) | `emoji` `quiz.js:726, 853` | typed text (exempt from half) | no | no | no | no | class (override) |
| 13 | Definition challenge | `definition` | text | points | y/y/y/p | default | `definition` `quiz.js:788, 849, 1103` | typed text | no | no | no | no | class |
| 14 | Word reveal | `wordreveal` | text | wordreveal | y/y/y/p | `wordRevealGains` by letters shown when it arrived (`src/games/wordreveal.js:63`) | `wordreveal` `quiz.js:396`, overlay `src/render/live.js:727` | typed text | no | no | no | no | class |
| 15 | Fill in the blanks | `fill` | fill | points | y/y/y/n | `fillGains` share per gap (`live.js:2117`) | fill branch `quiz.js:1002` | key per gap (`manual.js:242`) | no | no | no | no | class |
| 16 | Spot the error | `spot` | tap | points | y/y/y/y | default (configured points, 1,000) | `spoterror` + tap passage `quiz.js:1034, 1163` | click a word (`manual.js:538`) | yes | no | no | no | class |
| 17 | Odd one out | `oddone` | choice | points | y/y/y/n | none: `unmarked`, points 0 (`src/model.js:1077-1086`) | `oddone` grid `quiz.js:1159-1210` | key, tally | no | no | no | no | class |
| 18 | Compare & contrast | `compare` | sort (choice when untagged) | points | y/y/y/n | `sortGains` share per statement (`live.js:2097`); a discussion scores nothing | sort `quiz.js:970`; discussion `quiz.js:558` | key per statement (`manual.js:674`) | no | no | no | no | discuss |
| 19 | Heads up | `headsup` | choice (verdict) | judge | p/y/y/n | count only, whatever the mode (`server.js:2051-2054`) | `headsup` `quiz.js:529`, judge strip `:308` | recipient + verdict (`manual.js:444`) | no | no | no | yes (`js/rounds.js:35`) | judge |
| 20 | Spin & explain | `spinexplain` | choice (verdict) | judge | p/y/y/n | spoken: team credit 1,000 per accept, half with hint; individual counts unless `scoreSpoken` (`server.js:2050-2108`) | `spin` `quiz.js:487` | recipient + verdict | no | no | no | no | judge |
| 21 | Connection maker | `connection` | choice (verdict) | judge | p/y/y/n | spoken, as above | `connection` `quiz.js:542` + proposal chips | recipient + verdict; proposals list | no | no | no | no | judge |
| 22 | Concept chain | `conceptchain` | choice (verdict) | judge | p/y/y/n | spoken, plus `oralCredit` per link while the term stays open (`server.js:2263`) | `chain` map `quiz.js:350, 591` | recipient + verdict; proposals list | no | no | no | no | judge |
| 23 | Random challenge | `randomchallenge` | choice (verdict) | count | p/y/y/n | spoken, count | `challenge` `quiz.js:640` | recipient + verdict | no | no | no | no | judge |
| 24 | Question cube | `randomchallenge` | choice (verdict) | count | p/y/y/n | count only (the relay pays `randomchallenge` 0, `server.js:2051-2054`), though its playbook says it credits the team | `cube` `quiz.js:619` | recipient + verdict | no | no | no | no | judge (override) |
| 25 | Memory flip | `memoryflip` | choice (claim) | claim | n/y/y/n | `claimGains` +1 (`live.js:2169`) | board `src/boards/memory.js`; `claim` `quiz.js:455` | the teacher runs the board | no | no | yes | no | board |
| 26 | Memory match | `memorymatch` | choice (claim) | claim | n/y/y/n | +1; claims rotate teams | board `src/boards/memory.js`; `quiz.js:414` | board | no | no | yes | no | board |
| 27 | Knowledge flip | `knowledgeflip` | choice (claim) | claim | n/y/y/n | +1 | board `src/boards/memory.js`; `quiz.js:476` | board | no | no | yes | no | board |
| 28 | Bingo | `bingo` | none (board) | bingo | n/y/y/n | a line wins; no points (`mark` false) | board `src/boards/bingo.js` | board | no | no | yes | no | board |
| 29 | Quiz bowl | `bowl` | none (board) | bowl | n/y/y/n | cell value to one team; `gains` empty (`live.js:3287`); target `bowlTarget` | board `src/boards/bowl.js`; `quiz.js:659` | board | no | no | yes | no | judge |
| 30 | Low-stakes quiz | `lowstakes` | none (paper) | count | n/y/y/p | none; paper | board `src/boards/lowstakes.js` | board | no | no | yes | whole-game clock (`timesWholeGame`) | paper |

Notes on the columns:
- **Boss battle as a room feature** belongs to the `boss` mechanic only. See section 4: the room takes its mechanic from the first game in the deck.
- **Class reports.** All 30 are reported, with three gaps. The sprint journals totals only (`sprintEnd`, `server/sessions.js:146-148`). Boards report each verdict as an `oral` record (`js/live.js:3455`, `server/server.js:2447`). Spoken rounds are reported as oral rounds (`js/reports.js:253`).
- **Tally entry** (a show of hands, GA-15) works only on `choice` questions (`server/server.js:1934-1945`).

### 1.3 Stages and steps per style

| Format | What happens on the wall, in order | Driven by |
|---|---|---|
| Multiple choice, True or false, Type answer, Slider | ask → answers in (live bars unless `resultsOnReveal`) → reveal → reason (K5) | Next; auto-reveal when all answered (`considerReveal`, `js/live.js:3306`) |
| Predict the outcome | commit (choice and "how sure") → lock (`closeAnswers`, `js/live.js:3028`) → split shown → teacher shows the outcome → reveal | Next, twice |
| True/false showdown | vote → split (`showdown`, `js/live.js:3036-3041`; half-way on a timed one, `:3007`) → one switch each → reveal before against after | Next; never auto-revealed (`:3318`) |
| Time traveler | place on the game's one line → reveal every pin and the true year; the line keeps earlier events | Next |
| Ranking | drag order → reveal heat per slot and the most swapped pair (`orderSlots`, `js/live.js:2078`) | Next |
| Spot the error | tap a word → held → heat across the passage → verdict line | Next |
| Fill in the blanks | tap a word into each gap → held → each gap's heat and its word | Next |
| Odd one out | vote → held → heat across four tiles → "defend your rule" line | Next only; never auto (`js/live.js:3314`) |
| Compare & contrast | sort each statement → held → each lands in its column, the most misfiled named. Untagged: a discussion with an idea box (`proposalSlide`, `js/live.js:460`) | Next only (`:3316`) |
| Emoji guess | clues → letter pattern (step) → hint (step, `hintOut`) → reveal | Next walks the steps (`js/live.js:2893`) |
| Definition challenge | Read with a clock (`phase: 'reading'`) → Ask or time → recall → reveal (`src/games/definition.js:41-50`) | Next or Ask (wall and desk), +30s |
| Word reveal | letters drip on the host's clock (`dripInterval`, `preReveal`) → reveal | host drip timer (`stopDrip`, `js/live.js:2175`) |
| Horse race | each reveal moves lanes; the wall shows five lanes and the pack; each phone its own lane (`raceLanes`, `js/live.js:1739-1770`) | reveal |
| Boss battle | each reveal is a hit or a miss with damage and the room's accuracy (`advanceBoss`, `js/live.js:1807`) | reveal; Hit/Miss on the desk |
| Beat the clock | live: one sprint, each phone at its own pace, then the hardest question (`js/live.js:1903-1990`). With entered rows or no room: wall-paced through `js/rounds.js` | the round clock |
| Heads up | one round clock for the pile; Correct or Pass moves on; "Time!" with the guesser's count | `js/rounds.js:22-171` |
| Spin & explain | the wheel lands (`spinDraw`), concept, explain, verdict | Next draws; `DRAW_STYLES` shuffle (`src/model.js:1152, 1207-1213`) |
| Random challenge, Question cube | draw a card or face ("N left"), speaker answers, verdict | Next draws |
| Connection maker | two ideas → phones propose bridges → Use this → verdict | proposal queue N3 (`openProposals`, `js/live.js:473`) |
| Concept chain | a term → proposals → Use this → Accept adds a branch and credits it → Next or clock | `chainVerdict` (`js/live.js:739`), `oralCredit` |
| Memory flip, match | study (`studySeconds`) → hide → claim per card | board runtime, study clock as `timeLimit` (`src/model.js:1043-1046`) |
| Knowledge flip | keywords visible → explain → claim | board runtime |
| Bingo | call next term → the team holding it explains → claim → line | board runtime |
| Quiz bowl | pick a cell → answer aloud → award to a team | board runtime |
| Low-stakes quiz | questions on the board, paper answers, one clock → reveal answers | board runtime, `reportEvent: 'onReveal'` |

### 1.4 Registration points

These are the eleven places in AGENTS.md "Adding a game style". Points shared by every style are listed once here, then each format's own lines are in the table.

| # | Point | Shared line |
|---|---|---|
| 1 | Style file | `src/games/<engine>.js` (lines in table) |
| 2 | `registry.js` | imports `src/games/registry.js:2-24`; `GAME_STYLES` `:61` |
| 3 | `catalogue.js` | `FORMATS` `:21`, `FORMAT_STYLE` `:89`, `CORE_STYLES` `:130`, `SPECIAL_STYLES` `:133`, `INPUTS` `:149` |
| 4 | `presets.js` | `GAME_FORMAT_PRESETS`, `src/games/presets.js:14` |
| 5 | `types.d.ts` | `GameStyleKey` `src/types.d.ts:46-51`; `Mechanic` `:41`; `InputKind` `:37` |
| 6 | `src/model.js` export | `SF.GAME_STYLES` `src/model.js:1853`, plus per-engine helpers `:1854-1917` (for example `orderScore`, `fillScore`, `sortScore`, `bossDamage`, `wordRevealGains`) |
| 7 | Lab Browse | `GAMES` `lab/src/model/designs/formats.ts:666-674` (`SHOWCASE` at `lab/src/model/designs/games.ts:638`); `GAME_GROUPS` `lab/src/ui/Browse.tsx:54-62`; `lab/src/assets/games.json` built by `tools/lab-games.mjs:59`; walls in `gameSlidesOf` `formats.ts:702-735`; live boards `LIVE_BOARD` `formats.ts:679-683`; live play `src/deck/labshow.js` |
| 8 | Contract test | `EXPECTED` `tests/game-style-contract.test.js:46-57` (all 26 engines); `plays` test `:69` |
| 9 | Playbook | `BOOK` `js/playbook.js:16`; overrides `:603-635`; `STYLE_BOOK` `:573-597`; `SETUP` `:641-668` |
| 10 | `ai.js` | `AI_SPECS` `js/ai.js:851`; aliases `:1189-1195` |
| 11 | `demo.js` | kind from the playbook (`js/demo.js:50`); spoken lines `:374-385`; discussion lines `:412-420`; answers by input `inventChoice` `:108-170`; reveals `:217-290` |

Per format. A dash means the format has no entry there. "via" means it resolves through another key.

| Format | Style file | registry | FORMATS | FORMAT_STYLE | presets.js | BOOK | Override | SETUP | AI_SPECS | Lab GAMES | GAME_GROUPS | games.json |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| choice | `choice.js:8` | 2 | — | 90 | 320 | 437 | — | — | 852 | 668 | 55 | 0 |
| predict-outcome | `choice.js:8` | 2 | 22 | 114 | 81 | 345 | 619 | 662 | via choice 852 | SHOWCASE | 61 | 22 |
| truefalse | `choice.js:103` | 2 | 36 | 91 | 48 | via `true-false` (`STYLE_BOOK` 578) | via 603 | via 641 | 868 | 668 | 55 | 1 |
| true-false | `choice.js:103` | 2 | 34 | 94 | 38 | 17 | 603 | 641 | 868 | SHOWCASE | 55 | 4 |
| horse-race | `race.js:10` | 3 | 38 | 99 | 58 | 98 | — | 646 | 1195 (= choice) | 669 | 57 | 9 |
| beat-the-clock | `speed.js:18` | 4 | 32 | 97 | 28 | 66 | — | 644 | 1195 (= choice) | SHOWCASE | 56 | 7 |
| boss-battle | `boss.js:32` | 5 | 39 | 98 | 70 | 82 | — | 645 | 1195 (= choice) | 669 | 56 | 8 |
| slider | `slider.js:10` | 6 | — | 93 | 311 | 465 | — | — | 1072 | 668 | 55 | 3 |
| time-traveler | `slider.js:10` | 6 | 47 | 116 | 162 | 361 | — | 663 | via slider 1072 | 668 | 61 | 23 |
| type | `type.js:9` | 7 | — | 92 | 330 | 451 | — | — | 904 | 668 | 55 | 2 |
| ranking | `order.js:13` | 8 | 49 | 112 | 153 | 299 | — | 659 | 966 | SHOWCASE | 60 | 20 |
| emoji-guess | `emoji.js:63` | 9 | 43 | 104 | 133 | 208 | 607 | 653 | 1034 | 671 | 58 | 14 |
| definition-challenge | `definition.js:54` | 10 | 41 | 103 | 123 | 193 | — | 652 | 1054 | 671 | 58 | 13 |
| compare-contrast | `compare.js:41` | 11 | 73 | 121 | 112 | 330 | — | 661 | 1004 | SHOWCASE | 61 | 28 |
| odd-one-out | `oddone.js:17` | 12 | 27 | 113 | 101 | 314 | — | 660 | 921 | SHOWCASE | 60 | 21 |
| word-reveal | `wordreveal.js:68` | 13 | 51 | 105 | 172 | 223 | — | 654 | 984 | 671 | 59 | 15 |
| memory-flip | `memory.js:40` | 14 | 53 | 100 | 181 | 113 | — | 647 | 1189 (= bingo) | 670 | 57 | 10 |
| memory-match | `memory.js:88` | 14 | 55 | 101 | 192 | 129 | — | 648 | 1189 (= bingo) | 670 | 57 | 11 |
| knowledge-flip | `memory.js:145` | 14 | 57 | 102 | 203 | 177 | — | 651 | 1189 (= bingo) | 670 | 58 | 12 |
| heads-up | `headsup.js:9` | 15 | 59 | 108 | 214 | 253 | — | 656 | 1131 | 672 | 59 | 17 |
| spin-explain | `spinexplain.js:12` | 16 | 61 | 109 | 224 | 268 | 613 | 657 | 1150 | 672 | 60 | 18 |
| connection-maker | `connection.js:5` | 17 | 63 | 117 | 234 | 376 | — | 664 | 1093 | 672 | 61 | 24 |
| concept-chain | `conceptchain.js:15` | 18 | 65 | 119 | 243 | 421 | — | 667 | 1169 | 672 | 62 | 26 |
| random-challenge | `randomchallenge.js:5` | 19 | 71 | 118 | 267 | 406 | 631 | 666 | 1113 | 672 | 62 | 25 |
| question-cube | `randomchallenge.js:5` | 19 | 75 | 123 | 254 | 391 | 620 | 665 | 1201 (by format) | 672 | 62 | 29 |
| bingo | `bingo.js:35` | 20 | 69 | 120 | 276 | 161 | — | 650 | 944 | 670 | 57 | 27 |
| low-stakes-quiz | `lowstakes.js:21` | 21 | 30 | 95 | 16 | 33 | — | 642 | 885 | 669 | 56 | 5 |
| quiz-bowl | `bowl.js:53` | 22 | 67 | 96 | 295 | 50 | — | 643 | **—** | 669 | 56 | 6 |
| spot-the-error | `spot.js:57` | 23 | 25 | 111 | 90 | 283 | 618 | 658 | **—** | SHOWCASE | 60 | 19 |
| fill-in-the-blanks | `fill.js:57` | 24 | 45 | 107 | 143 | 238 | — | 655 | **—** | SHOWCASE | 59 | 16 |

Registration gaps found:
- **No `AI_SPECS` for `bowl`, `spot` or `fill`.** Quiz studio's writer refuses them with "is not written by AI yet" (`js/ai.js:1247-1250`). AGENTS.md step 10 is unmet for three engines.
- **Boss shares the choice brief** (`js/ai.js:1195`), so the AI writes no `difficulty`. Every AI-written boss question compiles as medium (`src/model.js:1064-1067`).
- **Plain True or false has no playbook entry of its own.** `STYLE_BOOK.truefalse` points at `true-false` (`js/playbook.js:578`), which is Showdown. So a plain True or false game gets Showdown's "How to play" slide ("Next shows the room its own split… switch once"), but `compileGame` sets `showdown` only for `true-false` (`src/model.js:1254`).
- **A stale-looking override.** `Object.assign(BOOK['true-false'], {scoring: 'Uses the points and countdown chosen in Game settings.'})` (`js/playbook.js:603-606`) replaces the entry's own scoring line ("The final answer is marked. Switching is free…", `:25`). AGENTS.md warns about exactly this.
- **Question cube's playbook promises team credit the relay never pays.** The override says "with teams, credits the speaker’s team" (`js/playbook.js:623`). The cube's slides are style `randomchallenge`, and the relay gives `headsup` and `randomchallenge` 0 spoken points in every mode (`server/server.js:2051-2054`).
- **Demo kinds that skip a mechanic.** Compare & contrast's demo is `discuss` (`js/playbook.js:334`), so a lesson rehearsal never sorts; `inventChoice`'s sort branch (`js/demo.js:129`) is reached only when a caller pins `class` mode, and Quiz studio, which did, is deleted. The sprint is never rehearsed (games audit scorecard).

### 1.5 GA audit items per format (parity criteria)

Items common to every format, from the build list (`docs/BACKLOG.md:1268-1297`):
- GA-05: a refused entry says so;
- GA-08: rooms declared;
- GA-15, GA-16, GA-17: tally entry (choice input only), team rows, saved class lists;
- GA-28: solo practice, for the 8 solo formats only.

Scorecard tiers are from `docs/games-premium-audit.md:41-69`.

| Format | Own GA items | Audit tier (P1–P8) | Open in the audit |
|---|---|---|---|
| Multiple choice, True or false, Type answer, Slider | none (base engines, not graded) | — | — |
| Predict the outcome | GA-13 | Solid, near premium | the private written prediction (K8); P6, P8 ◐ |
| True/false showdown | GA-14 | Solid, near premium | P6, P8 ◐; not viewed |
| Horse race | GA-21, GA-24 | Solid | P3, P8 ◐ |
| Beat the clock | GA-10, GA-27 | Solid, near premium | the rehearsal does not sprint; not tested or viewed |
| Boss battle | GA-21, GA-24 | Solid | P5, P8 ◐ |
| Time traveler | GA-20 | Solid | P6, P8 ◐ |
| Ranking | GA-04, GA-23 | Solid, near premium | P6, P8 ◐ |
| Emoji guess | GA-22 | Solid | P3, P6, P8 ◐ |
| Definition challenge | GA-21, GA-22 | Solid | P3, P8 ◐ |
| Word reveal | GA-01 | Solid | reveal polish; P3, P5, P6, P8 ◐ |
| Fill in the blanks | GA-11 | Solid, near premium | P6 ◐; not viewed |
| Spot the error | GA-04 | Near premium (flagship) | the desk's heat-map preview (P6) |
| Odd one out | GA-12 | Solid, near premium | the written rule as an idea (K9) |
| Compare & contrast | GA-26 | Solid, near premium | — |
| Heads up | GA-06, 07, 09, 10, 25, 29, 30 | Solid | clue-givers' phones could show the term; P5 ✗ |
| Spin & explain | GA-06, 07, 09, 25, 29, 30 | Solid | P3 ◐, P5 ✗ |
| Connection maker | GA-06, 07, 18, **19 (open)**, 29, 30 | Solid | approved bridges drawn as lines |
| Concept chain | GA-06, 07, 18, 19, 29, 30 | Solid | the rehearsal never proposes a link |
| Random challenge | GA-06, 07, 09, 25, 29 | **Thin** | only the count is revealed; P5 ✗ |
| Question cube | GA-09, GA-25 | Solid | P3, P5, P8 ◐ |
| Memory flip, match, knowledge flip | GA-21 | Solid (board) | P5 ✗; P6, P7 ◐ |
| Bingo | GA-21 | Solid (board) | P5 ✗ |
| Quiz bowl | GA-02, GA-21 | Solid | P3, P8 ◐ |
| Low-stakes quiz | GA-21 | Solid (paper by design) | P6 ◐ |

### 1.6 Short notes per engine

- **`choice`** (`src/games/choice.js:8-101`). Two to six options, one right, optional `misconceptions` per option (never sent to phones; kept index-aligned in `normalize`, `:37-47`). **A bug for the pilot to avoid:** `compile` drops blank options but clamps `correct` instead of remapping it (`:79-84`). A blank option above the right one moves the answer: options `['', 'B', 'C', 'D']` with `correct: 1` compile as `['B', 'C', 'D']` with `correct: 1`, so C is marked right. `problems` does not catch it (`:63-66`). The misconception labels are remapped correctly two lines below. `race`, `speed` and `boss` call this `compile`, so they share the bug.
- **`truefalse`** (`choice.js:103-150`). Fixed options True and False; `correct` is 0 or 1. Showdown is the `true-false` format, not the engine.
- **`race`** (`race.js`, 29 lines). Choice plus the `race` mechanic. Lanes, majority moves and the track length live in the host (`js/live.js:1685-1800`) and the overlay (`src/render/live.js:600`). `trackLength` is a game setting.
- **`speed`** (`speed.js`). Choice plus a round. `compileGame` sets `roundSeconds` (30–600, default 90) and `paceSeconds` 15, and drops the per-question clock (`src/model.js:1280-1285`). A live room with no entered rows plays it as a **sprint**: the host sends the whole run with its key (`sprint`, `server/server.js:2207`), the relay marks each `sprintA` (`:2883-2905`), and the host only paints progress (`js/live.js:1903-1990`). This is K29, the only relay marking. Otherwise it is wall-paced through `js/rounds.js`.
- **`boss`** (`boss.js`). Choice plus `difficulty` (easy, medium, hard, boss = 1, 2, 3, 5 damage). The boss's HP is computed from **every quiz slide in the run deck** (`js/live.js:962-969`), not only the boss game's own.
- **`slider`** (`slider.js`). `min`, `max`, `step`, `target`, `tolerance`, `unit`. Time traveler adds one span for the game and `timeline` per question, and heals legacy typed saves (`healTimeTraveler`, `src/model.js:1136-1150`).
- **`type`** (`type.js`). `accept` spellings and `allowTypos`; `describe` shows the accepted spelling.
- **`order`** (`order.js`). 3–8 items in the right order; the phone shuffles. Part marks through `orderPoints`.
- **`emoji`** (`emoji.js`). `clues`, `hint`, `difficulty`; `showsQuestion: false`. The hint is a released step, timed on the relay (K27).
- **`definition`** (`definition.js`). `passage` and a recall question; a reading phase on a clamped clock (`clampDefinitionSeconds`). Desk Ask through `definitionCommand` (`js/player.js:540`).
- **`wordreveal`** (`wordreveal.js`). `word`, `hint`, `accept`, `difficulty` (`preReveal` fraction), `dripInterval`. In a lab lesson it plays on SlideForge's wall (`SLIDEFORGE_WALL`, `src/deck/labshow.js:29`), because the phones are scored by SlideForge's drip clock.
- **`fill`** (`fill.js`). Up to four `[gaps]` in `question`, plus `lures`. Compiles `fillParts`, a shuffled bank in `options`, and `gapAnswers`.
- **`spot`** (`spot.js`). Sentence, `error` words, `fix`. Compiles words as `options` with `errorFrom` and `errorTo`; `holdResults`. Flagship.
- **`oddone`** (`oddone.js`). Four items and the prepared odd one. Unmarked, points 0, held, never auto-revealed.
- **`compare`** (`compare.js`). `itemA`, `itemB`, `similarities`, `differences`, `category`, and `statements` tagged `Both:`, `A:`, `B:`. With two or more tagged statements it becomes a `sort` question (`compareSort`, `sortAnswers`, `sortBins`); without, a discussion with an idea box. The engine declares `input: 'choice'` and `fillQuestionSlide` switches it to `sort` (`src/model.js:1099`).
- **Spoken engines** (`headsup`, `spinexplain`, `connection`, `conceptchain`, `randomchallenge`). `isSpokenSlide` (`js/live.js:69`) sends `spoken` on the question, gives the phones a listen-and-watch card, and sends the recipient on the reveal (`:3282-3286`). The relay credits one team, or counts (`server/server.js:2050-2110`). Heads up, Spin and Random challenge are drawn (`DRAW_STYLES`). Connection and Concept chain open a proposal box (`proposalSlide`, `js/live.js:460`).
- **Board engines** (`memoryflip`, `memorymatch`, `knowledgeflip`, `bingo`, `bowl`, `lowstakes`). Each declares a `boardEngine` (runtime, field, commands, clock, focus) and compiles to one board slide (`memoryBoard`, `bingoBoard`, `bowlBoard` or `lowstakesBoard`). The runtime is `src/boards/runtime.js`; commands go through `SF.Boards.command` and the live host (`js/live.js:3099`). Phones do not answer.

---

## 2. Feedback kinds

Feedback is a `feedback` object on any slide (`src/types.d.ts:87-104`), never scored. The host opens it as a prompt when the slide comes up (`syncPrompt`, `js/live.js:2568`), or on demand (`startCustomPrompt`, `js/live.js:2629`).

| Kind | Fields | Phone | Wall (room pane) | Hold (AC-08) | Spotlight (AC-06) | Teacher entry | Demo | Playbook | AI |
|---|---|---|---|---|---|---|---|---|---|
| poll | `prompt`, 2–6 `options`, `max` forced 1, `presentAs`, `hold` | one tap (`openPrompt`, `join.html:1910`) | bars (`paintFeedbackRail`, `src/render/live.js:288`) | yes | no | **no** (AC-13 deferred) | sample digest (`js/demo.js:461-480`) | `js/playbook.js:494` | `generateOfflineSlidePoll` (`js/ai.js:244`) |
| word cloud | `prompt`, `max` 1–5, `presentAs` | a word or phrase | packed cloud (`focusCloud`, `src/render/live.js:149`) | no | no (single words cannot be spotlighted) | no | sample | `:509` | `generateOfflineCustomPrompt` (`js/ai.js:307`) |
| brainstorm | `prompt`, `max` 1–5, `presentAs` | a line of text | anonymous idea cards; named on the desk | no | yes, three per slide (`Live.spotlights`, `js/live.js:526-660`) | no | sample | `:524` | as above |
| scale | `prompt`, `points` 3–7, `lowLabel`, `highLabel`, `hold`; `max` forced 1 | one point on the scale | columns, mean, "room is split" | yes | no | no | sample | `:539` | as above |

- **Relay:** `prompt` (`server/server.js:2299`), `promptEnd` (`:2332`), the phone's `reply` (`:2857`); journalled as `prompt` and `reply` and projected into the class report (`server/sessions.js:152-153`).
- **Rooms:** every feedback activity declares `collect`, with phones `yes`, teams `partial`, entry `no` and solo `no` (`src/activities/rooms.js:39-45`).
- **Teams, boss battle, rounds, boards:** do not apply.
- **The lab** stores `feedback` on a slide as a placeholder and lets SlideForge's live session run it (`lab/src/model/types.ts:113-118, 163-165`).
- The brainstorm blurb says "listed newest first with names" (`src/deck/feedback.js:28`). The wall shows ideas without names; names are the desk's.

---

## 3. Activities

### 3.1 How an activity becomes slides

- **Activity records.** The catalogue (`src/activities/catalogue.js`) keeps the source records unchanged. `PRESETS` (`src/activities/presets.js:12`) and `GAME_PRESETS` (`src/activities/game-presets.js:34`) add the starter copy, any remap and its `reason`, applied at load (`catalogue.js:750-779`).
- **Targets.** There are five: `slide` 20, `game` 12, `moment` 11, `feedback` 9, `slide-arc` 2.
- **Slides.** `activitySlides` (`js/lesson-runtime.js:84-114`) makes one slide per page. It sets `activity`, `activityPage`, `activityInstance` and `activityPresentation`, the `feedback` for a feedback target, and a draft `modelAnswer` for 19 listed activities (`ANSWER_ACTIVITIES`, `:71-79`).
- **Fields.** `applyFields` (`src/activities/fields.js:66-78`) writes each row's label into the keyword term and its copy into the definition, and writes the Timer field into `timeLimit` in seconds.
- **Game targets** insert a game built from `gamePreset` (seeds, settings and, for Question cube, `format`) (`js/live-activities.js:78-83`).
- **Presentations.** `PRESENTATIONS` (`src/activities/presets.js:250-276`) gives 16 activities `stages`, 4 `steps`, 3 `panels` and 7 `brief`. The rest are plain rows or another layout.

### 3.2 Timed stages, row jobs and the brief

- **Which activities are staged.** AGENTS.md says an activity is staged when at least two rows carry a time, or when a stage-only feature is the point. In code it is the explicit list `PRESENTATIONS.stages`. Learning Log is staged with no timed rows (the per-stage private note is its point). The rule is tested in `tests/stages.test.js`, not computed.
- **Stage labels.** `parseStageLabel` (`src/activities/stages.js:126`) reads "Think · 1 min" as a name and seconds. It accepts `·`, `•`, `|`, `:`, `-`, `–`, `—` or `(`, and "every" or "about" before the number, so "Rotate · every 4 min" is four minutes. A label with no time is a stage with no clock.
- **Declared jobs.** "[note]", "[talk]", "[send]", "[work]" or "[down]" at the end of a label wins over the words (`DECLARED_JOB`, `:107`). It is stripped wherever a label is shown (`stripDeclaredJob`, `:110`).
- **Jobs read from words.** `JOB_WORDS` (`:61-68`) is tried in order:
  1. `work` for "you do alone", "independent practice" or "on your own";
  2. `note` for think, alone, jot, individual, reflect, silent, write;
  3. `talk` for pair, partner, compare, discuss, square, talk, group, argue, together, circle, switch, expert, home, return, teach;
  4. `send` for share, report, send, feedback, post, contribute;
  5. `work` for plan, create, design, solve, build, draft, refine, investigate, research, rotate, round, station, practise, self-assess, apply, attempt;
  6. `down` for connect, synthesise, summarise, debrief, teacher, plenary, close, link.

  Nothing matched is `down`.
- **Group talk.** A talk stage is group talk unless it says pair or partner, or the routine's only talk words are pair words (`groupTalk`, `:89-97`). The wall then reads "Talk in your group" (`GROUP_TALK`, `:50`).
- **What each job puts on the wall and the phone.** See `STAGE_JOBS` (`:18-45`). A `note` is private (K8). `send` opens one idea box per stage. `work` carries a quiet Need help. `down` says phones down.
- **The pinned brief.** A leading row with no time, followed by at least two timed rows, in a routine of more than two rows, is the brief (`stagedRows`, `:146-172`). It stays on the wall and the phone through every stage. At most eight stages follow it.

### 3.3 What drives a staged slide

- **Render.** `layoutStages` (`js/render.js:608-684`) draws the track, a panel per stage and the brief. It runs when `slide.activity` is set and `activityPresentation === 'stages'` (`:702`). `SF.lightStages` (`:685`) lights a stage, on the wall and in the desk preview (AK5, N8).
- **The runtime.** `js/stages.js` listens for `slide` and `step` (`:190-192`). The current stage is `P.revealStep − 1` (`:178`), so Next walks the stages as reveal steps; the keyword rows are the steps (`slideSteps`, `src/deck/content.js:811`). Each stage starts its own clock (`startClock`, `:73`). A clock never advances the slide (activities audit §6). `extend` adds +30s from the wall or desk (`:195`).
- **Phones.** `publish` (`:118-136`) sets `P.stage`: job, group, text, brief and seconds left. The host sends it with the slide context (`js/live.js:2887`), the relay cleans it (`cleanStage`, `server/server.js:996`), and the phone paints the job card (`paintStage`, `join.html:843`).
- **Idea boxes.** `syncShare` (`js/stages.js:91-116`) opens one `brainstorm` box per `send` stage (AK2). A teacher's own prompt wins.
- **The written count.** During a `note` stage the phone sends `wrote` (`server/server.js:2832`), and the wall shows "19 of 26 have written something" (`paintWritten`, `js/stages.js:217`).
- **Moments.** Non-staged timed moments run on `js/lesson-moments.js` (one clock, desk Pause, +1 min and Clear: N7, AC-01).

### 3.4 The 54 activities

Key to the job codes: n note, t talk (tg group talk), s send, w work, d down; `*` a declared job; [B] the pinned brief. Stage times are in minutes. Tiers are from `docs/activities-premium-audit.md:51-150`. AC-16 (rooms declared) applies to all 54 and is not repeated.

| # | Activity (key) | Phase | Target · engine or kind | View | Stages and jobs | AC items | Tier |
|---|---|---|---|---|---|---|---|
| 1 | clear-objectives-slide | starter-slide | slide · keywords | rows | — | — | Solid (slide) |
| 2 | hook-objectives | starter-slide | slide · keywords | brief | — | — | Solid |
| 3 | connection-slide | starter-slide | slide · keywords | rows | — | — | Solid |
| 4 | quick-retrieval-quiz | starter-activity | game · `lowstakes` | — | — | as its game | as Low-stakes quiz |
| 5 | think-pair-share | starter-activity | moment · keywords | stages | Think 1 n · Pair 2 t · Share 3 s · Connect 1 d | AC-01, 02, 06, 07 | Near premium |
| 6 | hook-and-predict | starter-activity | feedback · brainstorm | split | — | AC-06, 08, 09 | Solid |
| 7 | word-splash | starter-activity | feedback · word cloud | rows | — | AC-08, AC-15 (blocked) | Thin |
| 8 | daily-review-routine | starter-activity | slide · keywords | steps | — | — | Thin |
| 9 | establish-talk-ground-rules | starter-activity | slide · keywords | stages | Think 2 n · Pair 3 t · Share 3 s · Agree 2 d | AC-02, 06, 07, 12 | Solid, near premium |
| 10 | do-now-bell-ringer | activation | moment · keywords | steps | — (one clock) | AC-01 | Thin |
| 11 | knowledge-activation-web | activation | feedback · word cloud | rows | — | AC-08 | Thin |
| 12 | pre-assessment-quickfire | activation | game · `truefalse` | — | — | as its game | as True or false |
| 13 | i-do-we-do-you-do | construction | slide · keywords | stages | I do 5 d · We do 8 d · You do together 5 t · You do alone 7 w | AC-02, 04, 05 | Solid |
| 14 | concept-development | construction | slide · keywords | rows | — | — | Thin |
| 15 | flipped-instruction | construction | slide-arc · 3 pages | brief | — | AC-01 | Solid |
| 16 | question-cube-six-question-types | construction | game · `randomchallenge` (format `question-cube`) | — | — | AC-14 | Solid (as the game) |
| 17 | worked-example-analysis | mini-activity | slide · keywords | brief | — | — | Solid− |
| 18 | error-analysis | mini-activity | slide · keywords | brief | — | — | Solid |
| 19 | quick-practice-stations | mini-activity | slide · cards | — | — | AC-14 (Stations clock blocked) | Solid− |
| 20 | concept-card-sort | mini-activity | game · `compare` (sort) | — | — | AC-15 | Near premium |
| 21 | interleaving-mixed-practice | mini-activity | game · `choice` | — | — | as its game | as Multiple choice |
| 22 | strategic-wait-time-questioning | mini-activity | moment · keywords | steps | — (one clock) | AC-01 | Thin |
| 23 | guided-inquiry-investigation | main-activity | slide-arc · 4 pages | brief | — | AC-01 | Solid |
| 24 | jigsaw-expert-groups | main-activity | moment · keywords | stages | Home groups 5 tg · Expert groups 12 tg · Return home 12 tg | AC-02, 04, 05 | Solid |
| 25 | problem-based-learning | main-activity | slide · keywords | brief | — | — | Solid− |
| 26 | differentiated-practice-menu | main-activity | slide · keywords | panels | — | — | Solid |
| 27 | design-and-create-task | main-activity | slide · keywords | stages | [B] Brief · Planning 5 w · Creating 20 w · Self-assessment 3 w · Gallery walk 5 d | AC-02, 03, 04, 05 | Solid |
| 28 | think-pair-square-share | collaboration | moment · keywords | stages | Think 2 n · Pair 3 t · Square 4 tg · Share 4 s | AC-01, 02, 04, 06, 07 | Near premium |
| 29 | jigsaw-collaboration | collaboration | moment · keywords | stages | Home 2 tg · Expert 10 tg · Return 8 tg | AC-02, 04, 05 | Solid |
| 30 | peer-teaching-carousel | collaboration | moment · keywords | stages | [B] Setup · Rotate 4 w · Final round 5 w · Present d | AC-02, 03, 04, 05 | Solid |
| 31 | socratic-seminar | collaboration | moment · keywords | stages | [B] Discussion prompt · Inner circle 8 tg · Switch 8 tg · Debrief 4 d | AC-02, 03, 04, 05 | Solid |
| 32 | dialogue-chain-discussion | collaboration | slide · keywords | steps | — | — | Thin |
| 33 | real-world-connection-hunt | collaboration | moment · keywords | stages | [B] Concept · In this room 3 s* · At home 3 s* · In our community 3 s* · Reflect n | AC-02, 03, 06, 10 | Near premium |
| 34 | explanation-champion-challenge | collaboration | game · `headsup` | — | — | as its game | as Heads up |
| 35 | compare-and-contrast-venn-activity | collaboration | game · `compare` | — | — | as its game | as Compare & contrast |
| 36 | benefits-vs-limitations-battle | collaboration | slide · keywords | brief | — | AC-14 (stays a slide) | Thin, by decision |
| 37 | scenario-analysis-discussion | collaboration | slide · keywords | stages | [B] Three scenarios · Identify and explain 6 t* · Predict and compare 6 t · Report back 4 s | AC-02, 03, 06, 12 | Near premium |
| 38 | whiteboards-on-walls | collaboration | moment · keywords | stages | [B] Problem · Discuss and draw 5 tg · Gallery walk 3 d · Refine 2 w · Debrief 1 d | AC-02, 03, 05 | Solid |
| 39 | connect-four-concept-edition | collaboration | slide · table | — | — | AC-17 (to do) | Thin |
| 40 | multiple-choice-quiz | mini-quiz | game · `choice` | — | — | as its game | as Multiple choice |
| 41 | true-false-rapid-fire | mini-quiz | game · `truefalse` | — | — | as its game | as True or false |
| 42 | short-answer-check | mini-quiz | game · `type` | — | — | as its game | as Type answer |
| 43 | diagnostic-question | mini-quiz | game · `choice` | — | — | as its game | as Multiple choice |
| 44 | structured-reflection-protocol | reflection | feedback · poll (held) | panels | — | AC-08, AC-13 (deferred) | Solid, near premium |
| 45 | learning-log-entry | reflection | slide · keywords | stages | New learning n* · Connections n* · Challenges n* · Strategies n* · Next steps n* (untimed) | AC-07, 12 | Solid |
| 46 | muddiest-point | reflection | feedback · brainstorm | rows | — | AC-06, 08 | Solid− |
| 47 | plus-minus-interesting | reflection | slide · keywords | stages | Plus 2 s* · Minus 2 s* · Interesting 2 s* · Look back 3 d | AC-06, 11 | Near premium |
| 48 | exit-ticket | plenary | feedback · brainstorm | rows | — | AC-06, 08 | Solid− |
| 49 | preview-next-lesson | plenary | feedback · brainstorm | rows | — | AC-06, 08, 12 | Solid |
| 50 | exit-ticket-2 | activity-plenary | feedback · brainstorm | rows | — | AC-06, 08 | Solid− |
| 51 | recap-quiz-game | activity-plenary | game · `speed` | — | — | as its game | as Beat the clock |
| 52 | teach-someone | activity-plenary | moment · keywords | stages | Partner A 2 t · Partner B 1 t · Switch 3 t · Together 2 t | AC-02, 05 | Solid |
| 53 | visual-summary | activity-plenary | slide · keywords | stages | [B] Choose a format · Create 6 w · Share with a partner 2 t | AC-03, 04, 12 | Solid |
| 54 | reflection-ladder | activity-plenary | feedback · scale (held) | panels | — | AC-08, AC-13 (deferred) | Solid, near premium |

Room profiles: staged routines with no `send` stage are `staged`, with one `stagedSend`; feedback activities are `collect`; other moments are `moment`; slides are `slide`; a game takes its engine's (`activityPlays`, `src/activities/rooms.js:73-84`).

---

## 4. Cross-cutting room features

| Feature | Where it lives today |
|---|---|
| **Teams** | Game setting `mode` and `teams` (`src/games/factories.js:69-70`), up to `MAX_TEAMS` 6 (`src/model.js:262`). The room takes them from **the first game in the deck**, with its mechanic, track length and music (`buildRunDeck`, `src/model.js:1492-1510`). The lobby is `js/live.js:813-910`. Team scores are per-question averages (`server/server.js:796, 2102-2119`; sprint `:1214-1223`). Race lanes per team (`js/live.js:1741`); spoken credit to the speaker's team (`server/server.js:2272-2280`). |
| **Rosters** | Entered rows: `manualAdd`, `manualRename`, `manualTeam`, `manualRemove` (`server/server.js:1654-1730`). Saved class lists in `localStorage` `sf-class-lists` (`js/manual.js:57-78`). One-click team rows (`js/manual.js:84`). Roster management in reports (`rosterManage`, `js/reports.js:675`). |
| **Boss battle** | `Live.bossHp` and `bossMax`, set from every quiz slide in the run deck (`js/live.js:960-969`). `advanceBoss`, `bossAttack`, `bossRoomHit`, `showBoss` (`:1807-1900`). Wall bar `src/render/live.js:690`; player `bossFight` and `bossView` (`js/player.js:722-756`); desk Hit/Miss through `Player.bossCommand` (`:756`). |
| **Rounds** | A game is a round: `round` on a new `gameId` (`js/live.js:3084`), relay `roundNo` (`server/server.js:1794-1806`); the intro slide carries `gameId` (`src/model.js:1170`). Round clocks for Heads up and Beat the clock: `js/rounds.js`. Final scores across rounds: `deck.finalScores` (`src/model.js:1480-1490`). |
| **Boards** | Runtime `src/boards/runtime.js` (`createBoardRuntime`, as `SF.Boards`, `src/model.js:1755`); engines `src/boards/memory.js`, `bingo.js`, `bowl.js`, `lowstakes.js`; host wiring `js/live.js:3099`; verdicts to the journal `reportVerdict` (`js/live.js:3455`) → `oral` (`server/server.js:2447`). The lab plays them on SlideForge's board (`LIVE_BOARD`, `lab/src/model/designs/formats.ts:679`). |
| **Class reports** | Journal and projection `server/sessions.js` (`project`, `:80`); live report request `report` → `sessionReport` (`server/server.js:1792-1793`); the report UI and CSVs `js/reports.js` (`liveClassReport` `:658`, oral rounds `:253`, CSVs `:725-726`); the desk overview through `lastReport` (`js/live.js:68, 1129`). |
| **Presenter window** | `presenter.html` (1,743 lines) with `src/presenter/window.js` (`createPresenterWindow`, `:26`; `sf-presenter-cmd` handler `:52`), `js/presenter-live.js`, `js/presenter-activities.js`. Desk mirror of wall controls (`data-desk`, `Player.gameControls`, `js/player.js:2491-2510`). Teacher entry window `manual.html` with `js/manual.js` (state sync `js/live.js:72-100`). See [player-usage.md](player-usage.md) and [protocol.md](protocol.md). |
| **Solo play** | Classic wall clicking (`wireQuiz`, `js/player.js:810`; `updateSolo`, `:1911`); Share → Practice (`practiceDoc`, `src/model.js:1408`). |

---

## 5. M0.4: every field a classic slide and a saved game can hold

### 5.1 A saved game (`SF.GameStore`)

- **The store.** `SF.GameStore` is a document store over `localStorage` `slideforge.games.v1`, with the last opened game id in `slideforge.lastGameId` (`src/storage.js:229-239`). It adds `usedByDecks` and `usedBy`.
- **Normalising.** Every load goes through `normalizeGame` (`src/model.js:933`). It returns null for anything that is not an object.
- **Format wins.** When a format maps to a different engine, the questions are rebuilt from a fixed list of carried fields (`src/model.js:977-997`).

**`Game`** (`src/types.d.ts:596-613`; made in `makeGame`, `src/games/factories.js:58`):

| Field | Type | Normalised |
|---|---|---|
| `id` | string | uid if missing |
| `kind` | `'game'` | forced |
| `style` | `GameStyleKey` | the format's engine, else the raw style, else `choice` |
| `format` | string, up to 40 | healed to the style for a special style with no format |
| `title` | string | `'Untitled game'` |
| `theme` | `ThemeKey` | `resolveTheme` |
| `libraryGroup` | string | `normalizeLibraryGroup` |
| `sourceDeckId` | string, up to 80 | |
| `created`, `modified` | number | |
| `settings` | `GameSettings` | `normalizeGameSettings` |
| `questions` | `Question[]` | each through `normalizeQuestion` against the game's style; never empty |

**`GameSettings`** (`src/types.d.ts:559-583`; `normalizeGameSettings`, `src/model.js:899-931`):

| Field | Default | Range or values |
|---|---|---|
| `mode` | `individual` | `individual`, `teams` |
| `teams` | Red, Blue, Green, Yellow | `{name}`, through `normalizeQuizConfig` |
| `scoreboard` | true | |
| `defaultTime` | 20 | ≥ 0 seconds |
| `defaultPoints` | 1000 | > 0 (0 becomes 1000) |
| `intro` | true | |
| `howTo` | true | not normalised; `false` hides the rules slide |
| `scoreSlide` | true | |
| `explainStyle` | `inline` | `inline`, `slide`, `both` |
| `trackLength` | 5 | 3–12 (race) |
| `bowlTarget` | 1000 for a bowl | 500, 1000, 1500, 2000; migrated from question one's `targetScore` |
| `confidence` | true | |
| `scoreSpoken` | false | |
| `resultsOnReveal` | false | |
| `music` | `''` | `safeMedia` |
| `musicVolume` | 55 | 0–100 |

Engines override these defaults through `defaults` (for example Beat the clock 60 s and 0 points, Boss 30 s, Bowl target 1000). The engine table in section 1.2 lists them.

**`Question`** (`src/types.d.ts:489-557`; base in `makeQuestion`, `src/games/factories.js:20-52`; `normalizeQuestion`, `src/model.js:874-896`):

| Group | Fields |
|---|---|
| Every question | `id`, `question`, `timeLimit` (null inherits), `points` (null inherits), `image`, `imageAlt`, `imageLayout` (`band`, `first`, `overlay`), `notes`, `bloom` (always cleared to `''` on load, `src/model.js:889`), `voteOnly`, `explanation`, `source` |
| Choice family | `options`, `correct`, `misconceptions` |
| Typed | `accept`, `allowTypos`, `answer` |
| Help | `hint`, `difficulty` (`easy`, `medium`, `hard`, `boss`) |
| Slider | `min`, `max`, `step`, `target`, `tolerance`, `unit` |
| Bowl | `category`, `pointValue`, `answer`; legacy `targetScore` |
| Compare | `itemA`, `itemB`, `statements`, `similarities`, `differences`, `category` |
| Term formats | `term`, `terms`, `prompt`, `definition`, `passage`, `challenge` |
| Word and emoji | `word`, `clues`, `dripInterval` |
| Boards | `studySeconds`, `gridSize`, `rotateClaims` |
| Spot and fill | `error`, `fix` (spot); `lures` (fill). These two are kept by their engines' `normalize` but are **not** in the `Question` type |
| Legacy carried on question one (low-stakes) | `mode`, `teams`, `scoreboard` |

Each engine's own fields, as `make` writes them and `normalize` keeps them:

| Engine | Fields after `normalize` |
|---|---|
| choice, race, speed | question, options, correct (+ misconceptions) |
| truefalse | question, options (True, False), correct |
| boss | question, options, correct, difficulty |
| slider | question, min, max, step, target, tolerance, unit |
| type | question, accept, allowTypos |
| order | question, options, correct |
| emoji | question, accept, hint, difficulty, allowTypos, clues |
| definition | passage, question, accept, allowTypos |
| compare | question, itemA, itemB, similarities, differences, statements, category, options, correct |
| oddone | question, options, correct, explanation |
| wordreveal | question, word, hint, accept, allowTypos, difficulty, dripInterval |
| memoryflip, knowledgeflip | question, term, definition, studySeconds |
| memorymatch | question, term, definition, studySeconds, rotateClaims |
| headsup | question, term, category, hint, options, correct |
| spinexplain | question, term, hint, category, options, correct |
| connection | question, itemA, itemB, options, correct |
| conceptchain | question, term, prompt, options, correct |
| randomchallenge | question, challenge, options, correct, category |
| bingo | question, term, definition, gridSize, studySeconds |
| lowstakes | question, answer |
| bowl | question, category, pointValue, answer |
| spot | question, error, fix, explanation |
| fill | question, lures, explanation |

### 5.2 A classic deck slide that carries a game, activity or feedback

Authored on any slide (`src/types.d.ts:197-295`; `makeSlide`, `src/model.js:333`; `normalizeSlide`, `src/model.js:623`):

| Field | Purpose |
|---|---|
| `type: 'game'`, `gameId`, `gameTitle` | an embedded game; expanded by `buildRunDeck` |
| `type: 'quiz'` with `question`, `options`, `correct`, `timeLimit`, `points` | a legacy quiz slide in a deck; `migrateDeckQuizzes` moves them into a game (`src/model.js:1674`) |
| `feedback` | a `Feedback` or null (section 2) |
| `activity`, `activityInstance`, `activityPage`, `activityPresentation` (`rows`, `steps`, `panels`, `brief`, `stages`) | which activity, its group, its page and its view (`src/types.d.ts:214-220`) |
| `bullets` | an activity's rows as keyword lines (`term\tdef`): stage labels and copy |
| `timeLimit` | an activity's Timer, in seconds |
| `modelAnswer`, `modelAnswerDraft` | the flip card's worked answer (`js/lesson-runtime.js:108-111`). **Not in the `Slide` type** |
| `notes`, `title`, `image`, `layers` and the rest of an ordinary slide | carried as for any slide |

Deck-level: `quiz` (`QuizConfig`: `mode`, `teams`, `scoreboard`) and `finalScores` (`src/types.d.ts:442, 458`).

### 5.3 A compiled game slide (what the room plays)

Written by `compile` and `fillQuestionSlide`; listed under "compiled" in `Slide` (`src/types.d.ts:296-412`). The converter does not store these, but replay fixtures and the lab host will see them.

| Group | Fields |
|---|---|
| Identity | `style`, `format`, `input`, `questionNumber`, `gameId`, `gameTitle`, `sourceSlideId` |
| Core | `question`, `options`, `correct`, `timeLimit`, `points`, `answer`, `headPrompt` |
| Reveal | `explanation`, `explainStyle`, `source`, `misconceptions`, `hideAnswerUntilReveal`, `holdResults`, `voteOnly`, `unmarked` |
| Media | `image`, `imageAlt`, `imageLayout`, `notes`, `bloom` |
| Confidence and spoken | `confidence`, `scoreSpoken` (set by `src/model.js:1073` but **not** in the `Slide` type), `judgeKind` |
| Typed | `accept`, `allowTypos`, `hint` |
| Boss | `difficulty`, `bossDamage` |
| Slider and timeline | `min`, `max`, `step`, `target`, `tolerance`, `unit`, `timeline` |
| Spot | `errorFrom`, `errorTo`, `fix` |
| Fill | `fillParts`, `gapAnswers` |
| Sort and compare | `compareSort`, `sortAnswers`, `sortBins`, `compareDiscuss`, `itemA`, `itemB`, `similarities`, `differences`, `category` |
| Odd one out | `oddoneDiscuss` |
| Chain and terms | `conceptChain`, `term`, `prompt`, `passage`, `definition`, `definitionChallenge`, `challenge`, `phase` |
| Memory | `studySeconds`, `hideAfterStudy`, `gridSize`, `rotateClaims` |
| Word | `word`, `clues`, `preReveal`, `dripInterval` |
| Draws and rounds | `drawNo`, `drawTotal`, `spinDraw`, `spinTotal`, `roundSeconds`, `paceSeconds` |
| Moments | `showdown`, `predict` |
| Boards | `bingoBoard`, `bowlBoard`, `lowstakesBoard`, `memoryBoard` |
| Pointing back into the lab | `design.labStill`, `design.labReveal`, `design.labAsk` (`src/deck/labshow.js:58-62`) |

A `pointValue` field on the slide is declared but no engine compile writes it; bowl cells carry their values inside `bowlBoard`.

---

## 6. Porting difficulty and the M7 pilot

### 6.1 Ranking, easiest first

The measure is how much beyond a plain question, answer and reveal round trip a format needs: extra relay messages, host-side gains, a special wall, its own timing, or a separate runtime.

| Rank | Formats | Why here |
|---|---|---|
| 1 | **Multiple choice** | Index match; relay default scoring; generic wall; every room `yes`; key entry and tally; AI spec, demo class, solo; already drawn in the lab (`choiceWall`, `buttonsWall`) and bridged by `labshow.quizSlide` |
| 2 | True or false | As choice with fixed options. Needs its own playbook entry first (section 1.4) |
| 3 | Type answer | Typed marking (`markTyped`), text input, typed entry; solo only partial |
| 4 | Slider | Number input, tolerance marking, number line |
| 5 | Ranking | Order input, part-mark gains, slot heat and the swap |
| 6 | Spot the error | Tap input, held results, heat; word-button entry. The flagship, so its bar is highest |
| 7 | Odd one out | Unmarked vote, held, teacher-only reveal |
| 8 | Predict the outcome | Choice plus `closeAnswers` lock and the confidence bet |
| 9 | True/false showdown | `showdown` message, one switch, a two-beat reveal |
| 10 | Time traveler | Slider plus one span for the game, a growing timeline and the legacy heal |
| 11 | Definition challenge | A reading phase with its own clock, Ask on wall and desk |
| 12 | Emoji guess | Step-released help, `hintOut` timed on the relay, half points |
| 13 | Fill in the blanks | Fill input, shuffled bank, per-gap gains and reveal |
| 14 | Compare & contrast | Two modes: a sort input, or a discussion with a proposal box |
| 15 | Horse race | Deck-level mechanic, team majority, lanes per phone (`raceLanes`) |
| 16 | Boss battle | Deck-level HP over every quiz slide, damage, reveal moments, desk Hit/Miss |
| 17 | Word reveal | The drip runs on the host clock and scores per answer; the lab already hands it back to SlideForge's wall |
| 18 | Random challenge, Question cube | Spoken verdict with a recipient, draw order, count; the cube's own faces and spec |
| 19 | Spin & explain | Spoken, draw, a wheel, three verdicts with half credit |
| 20 | Heads up | Spoken, draw, round clock, the guesser, per-phone term (`spokenFanout`) |
| 21 | Connection maker | Spoken plus the proposal queue; GA-19's lines still open |
| 22 | Concept chain | Proposals, `oralCredit` while the term is open, redraw in place (K26) |
| 23 | Beat the clock | The sprint: relay-marked (K29), its own message set (`sprint`, `sprintQ`, `sprintA`, `sprintMark`, `sprintResult`), a progress wall, and a wall-paced fallback through `js/rounds.js` |
| 24 | Low-stakes quiz | A board with a whole-game clock and a paper reveal; the smallest board |
| 25 | Memory flip, Memory match, Knowledge flip | One board engine, three presets: study clock, claims, team rotation |
| 26 | Bingo | A board with a card per team and a caller |
| 27 | Quiz bowl | A board with team awards per cell, a target, and values in the journal |

Boards come last because they are a separate runtime (`src/boards/`, about 1,090 lines) with their own commands, frozen state and journal path. The lab already defers them, with Beat the clock and Question cube, to SlideForge's board (`LIVE_BOARD`).

Feedback kinds sit between ranks 4 and 5: a prompt, a reply and the room pane, with no marking. Poll and scale are the simplest, as indices. Activities are their own track (M10). The 16 staged routines share one runtime (`js/stages.js`, 233 lines), and porting it once covers all of them.

### 6.2 Recommended pilot: Multiple choice (`choice` format, `choice` engine)

**Why it is the simplest multiple-choice style:**
- **The fewest moving parts.** `mark` is `response === correct` (`src/games/choice.js:92-94`). There is no host-supplied gain, so the relay's default scoring applies (`server/server.js:2084-2091`). Every message is in the core set: `question`, `answer`, `locked`, `manualAnswer`, `manualTally`, `reveal` (see [protocol.md](protocol.md)).
- **It exercises the whole M7 acceptance list.** Live tallies, held or live bars (`resultsOnReveal`), reveal, leaderboard, advance, a phone reconnecting, teacher entry by key, and tally entry. Confidence is on by default, so the "how sure" grace is covered too (`js/live.js:3290-3330`).
- **Every room is `yes`**, so solo play in Preview (an M7 requirement) is in scope, and practice links include it.
- **It is already half there in the lab.** It has the Browse card, two looks (`HAS_LOOKS`, `formats.ts:694`), `choiceWall` and `buttonsWall`, and the bridge's `quizSlide` path (`src/deck/labshow.js:38`).
- **Its registration is complete.** It has a playbook entry (`js/playbook.js:437`), an AI spec (`js/ai.js:852`), presets (`src/games/presets.js:320`), demo kind `class`, and a contract test row.
- **It is the shape most later formats build on.** Race, Speed, Boss and Predict reuse its `compile` and `mark`, so the pilot's slots are the ones they will extend.

**Why not the others:**
- True or false is as simple, but its playbook resolves to Showdown's rules.
- Predict, Showdown and Beat the clock add moments or relay marking.
- Spot is the flagship, with a higher bar and a new input.

**Before or during the pilot:**
- Fix or deliberately not port the blank-option bug in `choice.compile` (section 1.6). Give the lab's version a test with a blank option above the right one.
- Record the M0.2 fixtures for the `choice` format, not `predict-outcome`, which shares the engine but sends `predict` and `closeAnswers`.
- Keep the deck-level coupling in mind. The live room's mechanic, teams and music come from the first game in a deck (`src/model.js:1492-1510`), so a pilot deck with only Multiple choice games avoids the race and boss paths.
