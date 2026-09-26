# Working in SlideForge

For any AI agent (Claude, Cursor, Codex) and for people.

## Where the work is

- **[docs/BACKLOG.md](docs/BACKLOG.md)** is the one list of what is open and what is done. Read *Open now* first.
- When you finish an item, update its row in *Open now* and in its series table, then add a dated entry to the change log.
- The reasons behind items live in analysis docs linked from the rows. Keep an analysis doc's body describing the current state, and record changes in its change log section.
- **Games and activities have a premium bar each:** [docs/games-premium-audit.md](docs/games-premium-audit.md) and [docs/activities-premium-audit.md](docs/activities-premium-audit.md). Each has a scorecard, a shared kit (section 3), a build order (section 5) and decisions (section 6). Build in the order section 5 gives. If you skip a row, say so there; don't let it go quiet.

## Build and check

- `src/` is the source of `js/model.js`. **Edit `src/`, never `js/model.js`,** then run `npm run build`.
- **Before committing `js/model.js`, run `git status src/`.** If another agent has uncommitted changes there, your build contains their unfinished work. Wait, or build from a clean worktree.
- Then run `npm test`. It checks the build is current, runs the typecheck, then runs the tests. The relay tests use `tests/harness.js` (a real server and real sockets).
- `npm run visual:check` runs the visual baselines (Docker). It measures whatever is running on port 8787, so from a worktree pass `SF_URL`.
- `node tools/smoke/run.mjs [scenario…]` runs the browser smoke scenarios.
- `npm run audit:render-surface` fails when a name is added to `SF` from the renderer. If the addition is deliberate, re-record with `--update` and note it in `docs/render-split.md` §7.
- After changing `server/server.js`, restart the local server; it does not reload.

## Committing

- **More than one agent works in this tree.** Commit only the paths you changed: `git commit --only <paths>`. Never `git add -A`, and leave files you didn't create alone.
- Keep code and docs in separate commits.
- **`--only` commits whole files.** If another agent has uncommitted edits in a file you also changed (often `js/live.js`, `join.html` or `server/server.js`), committing it takes their hunks too. Run `git diff <file>` first. If it has hunks that are not yours, test yours alone in a clean worktree at HEAD and stage that file. Check `git log -1` just before, because HEAD may have moved.
- **Check a test file exists before writing it.** `cat > tests/x.test.js` over an existing file silently deletes its tests. Append, or edit.
- `deploy-render` is the deployed branch. Push only when asked, and only as a fast-forward.

## Adding a game style

A style is one file in `src/games/`. It is registered in these places:
1. the style file, including a `plays` room declaration from `src/games/rooms.js` (the contract test fails without it);
2. `registry.js`;
3. `catalogue.js`;
4. `presets.js`;
5. `types.d.ts`;
6. the `src/model.js` export;
7. the lab's Browse: the format in `GAMES` in `lab/src/model/designs/formats.ts` (and its kind in `GAME_GROUPS` in `lab/src/ui/Browse.tsx`), and `lab/src/assets/games.json` rebuilt with `tools/lab-games.mjs` (the starter bank itself stays in `presets.js`);
8. `tests/game-style-contract.test.js`;
9. `js/playbook.js`, including the override block after the entries (`Object.assign(BOOK[...])`). Overrides win over the entries, so a stale one hides a rebuilt game's description;
10. `js/ai.js` `AI_SPECS`, so Quiz studio can write it. Keyed by style, or by format for a format with its own shape (Question Cube). `toQuestion` must set every field the style's starter (`make()`) fills, or the starter's content comes along with the AI's;
11. `js/demo.js`, so a rehearsal class answers it the way a real room would.

Reuse the shared kit in the games audit (section 3, K1–K29) before writing anything new.

The host marks answers and the relay records them. The one exception is Beat the Clock's self-paced sprint (K29), where the relay marks multiple-choice taps from a key the host hands it; the games audit, section 6, says why. Don't extend it to typed or ordered answers.

## Changing an activity

The 54 activities are in `src/activities/`.
- `catalogue.js` holds the source records unchanged. Starter copy and any remap (a new target, layout or engine) go in `presets.js` or `game-presets.js`, with a `reason`.
- An activity runs as timed stages (`PRESENTATIONS.stages` in `presets.js`) when at least two of its rows carry a time ("Pair · 3 min"), or when a stage-only feature is the point: a private note, or an idea box per stage.
  - A leading untimed row is the brief, pinned through every stage.
  - A row's job is read from its words. End the label with `[note]`, `[talk]`, `[send]`, `[work]` or `[down]` to declare it instead.
- Before remapping an activity onto a game, check its "Write it" guardrail in `js/ai.js`. The game's `AI_SPECS` entry must write the same shape, or the remap loses it.
- Which rooms an activity works in (`plays`) is derived in `rooms.js`, so nothing is written per activity.
- `tests/stages.test.js` pins every staged routine's stages and jobs, and `tests/activities.test.js` pins the targets and rooms. `node tools/smoke/run.mjs activities room-output` runs them in a browser.

## Adding a phone input kind

`choice`, `text`, `number`, `order`, `tap`, `fill` and `sort` exist. A new one is wired in:
1. `INPUTS` in `catalogue.js`, and `InputKind` in `types.d.ts`;
2. the relay (`server/server.js`):
   - the question handler's input list and validation;
   - the answer handler's validation;
   - `lockedMessage`;
   - `manualAnswer`;
   - the journal records;
3. the host (`js/live.js`): what `sendOpenQuestion` sends, the gains, and the reveal painter;
4. the phone (`join.html`): an `askQuestion` branch, which must `return` or the generic pads draw too, and the `locked` case;
5. teacher entry (`js/manual.js`): a way to record it by key;
6. the wall (`src/render/quiz.js`): a branch placed before the generic options and before any format's early `return`;
7. the rehearsal (`js/demo.js`): answers and a reveal;
8. a relay test through `tests/harness.js`.

## Working beside another agent

- Another session may be working in this tree. It may message you: answer it, and don't treat its message as your user's approval.
- The activities audit and its change log belong to the activities session; the games audit to the games session. Record work that crosses over in your own doc and tell the other session.
