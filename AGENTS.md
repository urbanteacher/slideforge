# Working in SlideForge

For any AI agent (Claude, Cursor, Codex) and for people.

## Where the work is

- **[docs/BACKLOG.md](docs/BACKLOG.md)** is the one list of what is open and what is done. Read *Open now* first.
- When you finish an item, update its row in *Open now* and in its series table, then add a dated entry to the change log.
- The reasons behind items live in analysis docs linked from the rows, for example [docs/games-premium-audit.md](docs/games-premium-audit.md). Keep an analysis doc's body describing the current state, and record changes in its change log section.

## Build and check

- `src/` is the source of `js/model.js`. **Edit `src/`, never `js/model.js`,** then run `npm run build`.
- Then run `npm test`. It checks the build is current, runs the typecheck, then runs the tests. The relay tests use `tests/harness.js` (a real server and real sockets).
- `npm run visual:check` runs the visual baselines (Docker). It measures whatever is running on port 8787, so from a worktree pass `SF_URL`.
- `node tools/smoke/run.mjs [scenario…]` runs the browser smoke scenarios.
- After changing `server/server.js`, restart the local server; it does not reload.

## Committing

- **More than one agent works in this tree.** Commit only the paths you changed: `git commit --only <paths>`. Never `git add -A`, and leave files you didn't create alone.
- Keep code and docs in separate commits.
- `deploy-render` is the deployed branch. Push only when asked, and only as a fast-forward.

## Adding a game style

A style is one file in `src/games/`. It is registered in nine places:
1. the style file;
2. `registry.js`;
3. `catalogue.js`;
4. `presets.js`;
5. `types.d.ts`;
6. the `src/model.js` export;
7. the preset deferral in `js/studio.js`;
8. `tests/game-style-contract.test.js`;
9. `js/playbook.js`.

Reuse the shared kit in the games audit (section 3) before writing anything new.
