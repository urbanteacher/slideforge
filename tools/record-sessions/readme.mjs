/* Writes tests/fixtures/sessions/README.md from the fixtures on disk, so the
   table says what each recording actually captured rather than what it was
   meant to. The prose is here; the numbers come from each fixture's
   `coverage`. */
import fs from 'node:fs';
import path from 'node:path';
import { GAPS, NOT_RECORDED } from './gaps.mjs';

const yes = (v) => (v ? 'yes' : '—');
const num = (v) => (v ? String(v) : '—');

export function writeReadme(dir, scenarios) {
  const rows = [];
  const missing = [];
  for (const s of scenarios) {
    const file = path.join(dir, s.name + '.json');
    if (!fs.existsSync(file)) { missing.push(s); continue; }
    const f = JSON.parse(fs.readFileSync(file, 'utf8'));
    const c = f.coverage || {};
    rows.push(`| \`${s.name}\` | ${num(c.phonesJoined)} | ${num(c.questions)} | ${num(c.answers)} | ${num(c.locked)} | ${yes(c.reconnect)} | ${num(c.manualAnswer)} | ${num(c.manualError)} | ${num(c.prompts)}/${num(c.replies)} | ${num(c.sprint)}/${num(c.sprintMarks)} | ${yes(c.teams)} | ${num(c.rounds)} | ${c.journalStatus === 200 ? `${c.journalAttendance || 0} / ${c.journalChecks || 0} / ${c.journalFeedback || 0}` : 'no'} |`);
  }
  const describe = scenarios.map((s) => `- **\`${s.name}\`** (${s.kind}). ${s.description}` +
    (GAPS[s.name] ? `\n  *Not in this recording:* ${GAPS[s.name]}` : '')).join('\n');

  const md = `# Recorded live sessions (M0.2)

Real message logs from the classic live host, one JSON file per scenario.
They are the replay fixtures for M7 onward (docs/lab-engine-plan.md, M0.2):
the replay test feeds a recording into the lab host and compares what it sends
with \`host\` below, normalising ids and timestamps itself. **Nothing in these
files is normalised.**

## How they are recorded

From the host side only (hard rule 5). \`tools/record-sessions/record.mjs\`
starts the unmodified relay (\`server/server.js\`, through \`tests/harness.js\`)
on a free port with a throwaway session directory, opens the classic host
(\`index.html\`) in Playwright, and loads \`tools/record-sessions/tap.js\` into the
page with \`addInitScript\`. The tap wraps \`WebSocket\` and \`BroadcastChannel\`
and reports every frame; it changes nothing on the wire.

The host is driven through the app's own API: \`SF.Live.host\` with a deck built
by the app's factories, \`SF.Live.begin\`, \`SF.Player.next\` (so the live gate
decides reveal, lock, split or advance exactly as a Next press would),
\`SF.Live.stop\`. Teacher entry goes through a real \`manual.html#<key>\` page
on the \`sf-manual-<key>\` channel, using manual.html's own command shape.
Phones are raw sockets speaking join.html's side (\`tools/record-sessions/phone.mjs\`).
At the end the session journal is read through the relay's existing
\`GET /api/sessions/<id>\` with the token the host was handed in \`hosted\`.

## Re-recording

\`\`\`
node tools/record-sessions/record.mjs                 # every scenario (about 20 minutes)
node tools/record-sessions/record.mjs game-choice     # one, by name
node tools/record-sessions/record.mjs --list          # names and descriptions
\`\`\`

Never port 8787: the recorder takes a free port and its own relay, so it does
not disturb a running local server. The README table is rewritten after every
run. Re-record after any change to \`js/live.js\`, \`server/server.js\`,
\`join.html\`, \`manual.html\` or a style's compiled slide fields, and review the
diff: a changed frame is a protocol change.

## File shape

| Field | What it holds |
| --- | --- |
| \`scenario\`, \`kind\`, \`covers\`, \`description\` | What was recorded |
| \`deck\` | What \`build\` hosted (format, style, mode, slide list) |
| \`coverage\` | Counts taken from the logs below (the table) |
| \`steps\` | What the recorder did, and when (\`next\`, \`question up\`, \`manual:answer\`, …) |
| \`host\` | **Every host WebSocket frame**: \`{ms, seq, conn, dir: connect/open/send/recv/close, data}\` |
| \`window\` | Every \`sf-*\` BroadcastChannel message, once as posted (\`dir: post\`, \`page\` says who) and once as heard by the host (\`dir: recv\` on index.html). A post identical to the previous post on the same page and channel is stored as \`{"$repeat": true}\`: the host re-posts its unchanged \`sf-manual-state\` after every relay frame |
| \`otherPages\` | Frames from any other page the app opened (Teacher Presenter) |
| \`phones\` | Each phone's frames, by name: \`{ms, conn, dir, data}\`. \`locked\`, \`result\`, \`sprintMark\` live here |
| \`journal\` | \`{status, body}\` of \`GET /api/sessions/<id>\` after \`end\` |
| \`notes\`, \`pageErrors\` | Anything the recorder could not do, and page errors |

\`ms\` is milliseconds since the scenario started, on one clock for page and
phones. \`seq\` orders host frames within the page.

## What each recording holds

| Scenario | Phones | Questions | Answers | Locked | Reconnect | manualAnswer | manualError | Prompts/replies | Sprint/marks (K29) | Teams | Rounds | Journal (attendance / checks / feedback) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
${rows.join('\n')}

## Scenarios

${describe}

## Not recorded yet

${missing.length ? missing.map((s) => `- \`${s.name}\`: no fixture on disk (not run yet, or the run failed).`).join('\n') + '\n' : ''}${NOT_RECORDED}
`;
  fs.writeFileSync(path.join(dir, 'README.md'), md);
}
