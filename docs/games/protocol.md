# Live room protocol (M0.2)

## What this is

12 October 2026.

This is the wire protocol of a SlideForge live room, as the code has it today. It covers every WebSocket message between the classic host (`js/live.js` and the files it drives), the relay (`server/server.js`), the phone (`join.html`), the big-screen watcher (`view.html?follow=1`) and the speaker-notes channel (`prompter.html`). It also covers the HTTP endpoints a room uses, the journal the relay writes to disk, and the two window protocols: the presenter desk (`presenter.html`) and teacher entry (`manual.html`).

It is the spec for `docs/lab-engine-plan.md` M0.2. Hard rule 5 says the relay, the phones and the teacher-entry window do not change, so a lab host must speak exactly this. Nothing here proposes a change.

Every message cites `file:line`. Line numbers are from the tree on the date above. `server.js` means `server/server.js`; `live.js` means `js/live.js`.

The recorded sessions (`tests/fixtures/sessions/`) are the other half of M0.2 and are not in this document.

---

## 1. Conventions

| Term | Meaning |
|---|---|
| host | The teacher's wall page (`index.html` / `js/live.js`). One socket per room. |
| phone | A learner's `join.html`. One socket per learner. |
| relay | `server/server.js`. Holds every room in memory. |
| watcher | `view.html?s=<id>&follow=1` on a big screen. Not a player. |
| show / notes screen | The prompter channel: the show (`js/player.js`) and `prompter.html`. |
| H→R, R→H, P→R, R→P, R→all | Host to relay, relay to host, phone to relay, relay to phone, relay to every connected player phone (`broadcast`, `server.js:3064`). |
| "dropped" | The relay ignores the message with no reply. This is the relay's usual answer to bad input. |

Types are JSON types. `int` means a JSON number the relay checks with `Number.isInteger`. `id` (player) is an integer assigned by the relay. Slide and question ids are strings chosen by the host.

## 2. Transport

| Fact | Where |
|---|---|
| Same port as the HTTP server (default 8787, `PORT`). Hosted pages use `wss:` on the page host; a `file:` page uses `ws://localhost:8787`. | `server.js:18`, `live.js:792` |
| Own RFC 6455 server, no dependencies. Text frames only; a frame over 4 MiB is a protocol error. | `server/ws.js:1-4`, `server/ws.js:153` |
| Every message is one JSON object with a string `t`. Anything else is dropped. | `server.js:1463-1466` |
| The relay sends nothing on a timer except the pace-signal sweep (every 5 s while signals are live). There is no keep-alive ping from the relay. | `server.js:1120-1132` |
| A socket's role is fixed by its first accepted message: `host`/`rehost` makes a host, `join` a player, `watch` a watcher, `prompterOpen` a show, `prompterWatch` a notes screen. A second role message on the same socket is dropped. | `server.js:1452-1461`, `1470`, `1510`, `1544`, `2540`, `2562` |
| Host messages are only acted on when `role === 'host'` and the room exists. Player messages need `role === 'player'`. | `server.js:1651-1653`, `2702` onwards |
| `send()` on the host silently drops a message when the socket is not open. | `live.js:807-809` |

### Room phases (`room.phase`)

| Phase | Set by | Where |
|---|---|---|
| `lobby` | `host` | `server.js:1628` |
| `running` | `begin` | `server.js:1810` |
| `question` | `question` | `server.js:1910` |
| `revealed` | an accepted `reveal` | `server.js:2064` |
| `idle` | `at` with a non-question activity (outside the lobby), `idle`, `finish`, a closed sprint | `server.js:2423`, `2470`, `2495`, `1194` |
| `sprint` | `sprint` | `server.js:2219` |

---

## 3. HTTP endpoints the room uses

| Method and path | Used by | Request | Response | Where |
|---|---|---|---|---|
| `GET /api/sessions/<id>` | Reports (`js/reports.js:45`) | `Authorization: Bearer <session token>` | 200: `Sessions.project(...)` report. 404 if the token does not open it. 500 if the journal cannot be read. A live room is projected from memory. | `server.js:525-534` |
| `DELETE /api/sessions/<id>` | Reports (`js/reports.js:81`) | Same bearer token | 200 `{deleted}`; 409 while the room is live; 403 wrong token; 404 missing | `server.js:536-551` |
| `POST /api/share` | Share (`js/share.js:82`) | `{doc}` with `doc.slides` an array, under 8 MiB | 200 `{id, key, durable, base, url}`; 400, 413, 500 | `server.js:176-217`, `600` |
| `GET /api/share/<id>` | `view.html:125` (read and follow) | 32 hex id | 200 `{doc, at}`; 404 | `server.js:219-228`, `602` |
| `DELETE /api/share/<id>` | Share | `Authorization: Bearer <key>` | | `server.js:230`, `603` |
| `GET /api/ai/status`, `POST /api/ai/generate` | Quiz studio, not the room | | | `server.js:554-570` |
| `GET/POST /api/data` | Saving into the project folder (off when `SLIDEFORGE_HOSTED=1`) | | | `server.js:606-609` |

The session token comes back once, in `hosted.session.token`. The host keeps it (`SF.Reports.track`, `live.js:1167`). The relay stores only its SHA-256 (`server/sessions.js:21`). The share id is also the watch credential (section 11).

---

## 4. Lobby

### 4.1 Opening a room

| `t` | Dir | Payload | Relay checks | Sent when | Receiver does | Where |
|---|---|---|---|---|---|---|
| `host` | H→R | `title` string; `mode` `'teams'`\|other; `teams` array of `{name}` or strings | Socket has no role. Title cut to 80. Team names trimmed, cut to 20, empties dropped, at most 6. Teams mode only with 2 or more teams, else `individual`. | Socket opens with no held room | Creates the room, a 6-digit PIN, a 64-hex `hostToken`, and a journal (`Sessions.create`). Replies `hosted`. | send `live.js:1061-1066`; handle `server.js:1543-1648` |
| `hosted` | R→H | `session {id, token, title, createdAt}`, `hostToken` (64 hex), `pin` (string), `joinUrl`, `mode`, `teams` (strings) | | Reply to `host` | Stores PIN and token in `sessionStorage` key `slideforge.hostedRoom`, paints the lobby and QR, starts report tracking | send `server.js:1637-1645`; handle `live.js:1165-1187` |
| `error` | R→H | `message` | | Journal could not be created; role is reset | Shows the warning in the lobby | `server.js:1634`; `live.js:1331-1333` |
| `rehost` | H→R | `pin`, `hostToken` (64 chars) | Socket has no role; room exists; token matches; room has no open host | Socket opens and `sessionStorage` holds a room (page reload) | Re-attaches the host, clears the grace timer, broadcasts `hostAway {away:false}`, replies `rehosted`, then `players` | send `live.js:1057-1059`; handle `server.js:1509-1541` |
| `rehosted` | R→H | `phase`, `pin`, `hostToken`, `joinUrl`, `mode`, `teams`, `session {id, title, createdAt}` (no token) | | Reply to `rehost` | Back into the room; if `phase` is not `lobby` it goes live locally without sending `begin` | `server.js:1527-1537`; `live.js:1134-1157` |
| `rehostFailed` | R→H | `reason` | | Bad pin, bad token, or host still present | Forgets the held room, stops, toasts | `server.js:1513`, `1517`; `live.js:1159-1163` |
| `hostAway` | R→all | `away` boolean | | Host socket closed (`true`) or rehosted (`false`) | Phone shows a note after 6 s away; hides it on return | `server.js:3032`, `1526`; `join.html:1389-1398` |

The `joinUrl` is fixed when the socket connects. It is the LAN address for a localhost host, else the request's Host header with the forwarded scheme (`server.js:718-724`).

### 4.2 Joining from a phone

| `t` | Dir | Payload | Relay checks | Sent when | Receiver does | Where |
|---|---|---|---|---|---|---|
| `join` | P→R | `pin`, `name`, optional `team` (int), optional `resumeToken` (64 chars), optional `probe` | Socket has no role. Room must exist. Resume first (4.3). Name trimmed, cut to 18, required. In teams mode `team` must be a valid index. Name unique (case-insensitive) across players and waiting. At most 200 in the room. | Join button, Enter, or auto-join on reload when `sessionStorage` has a saved identity | Creates the player. If the join window is open: `joined`, then `context` (if a slide is known), the open `prompt` (if any), `qaList`; else `waiting`. Then `players` to the host. Journals `join`. | send `join.html:1174`, team retry `join.html:1690`; handle `server.js:2561-2699` |
| `room` | R→P | `mode`, `teams`, `title` | | Reply to `join` with `probe` | No phone sends `probe` today and `join.html` has no case for `room` | `server.js:2569-2572` |
| `error` | R→P | `message`; with "Pick a team." also `mode:'teams'`, `teams` | | No room ("No quiz found with that PIN."), no name, no team, name taken, room full, already connected in another tab | Teams list opens the team picker; otherwise the message is shown | `server.js:2566`, `2604`, `2612-2617`, `2625`, `2629`, `2577`; `join.html:1261-1271` |
| `joined` | R→P | `resumeToken` (fresh join and resume only), `name`, `title`, `phase`, `mode`, `team`, `teamName`, `reactions`, `phonesBlank`, `floor` (boolean, open or not); `score` on resume; `admitted: true` and `round` when admitted from waiting | | Join with the window open, admission, or resume | Saves `{token, name}` under `slideforge.resume.<pin>`, shows the wait screen | `server.js:2670-2685`, `1390-1404`, `2580`; `join.html:1235-1259` |
| `waiting` | R→P | `resumeToken`, `name`, `title`, `mode`, `team`, `teamName` (resume adds `phase`, `score`, `reactions`, `phonesBlank`, `floor`) | | Join while the window is shut (a question has been asked since the last non-question slide) | Shows the hold screen | `server.js:2654-2662`, `2580`; `join.html:1213-1229` |
| `players` | R→H | `pin`, `joinUrl`, `joinOpen`, `waiting` (count), `round`, `list` [{`id`, `name`, `score`, `connected`, `away`, `manual`, `team`, `correct`}] sorted by score, `mode`, `rows` (scoreboard rows, below), `counts` (members per team, or null) | | After almost every roster or score change | Roster, rail, join card, entry window, race lanes for individuals | `server.js:844-863`; `live.js:1189-1217` |

`rows` (`scoreRows`, `server.js:807-842`): individual `{key:'p'+id, name, score, accuracy, answered, asked, gained}`; teams `{key:'t'+i, name, ci, members, score, accuracy, answered, asked, gained}`, sorted by score.

The relay also sends `bookmarks` with every `players` push (`server.js:846`), and schedules `responses` when a prompt is open (`server.js:848`).

### 4.3 Resume and reconnect

| Who | What happens | Where |
|---|---|---|
| Phone, socket drops | No automatic retry. The phone shows "Disconnected" and a Reconnect button, which runs `join` again with the saved token. A reload auto-joins when `sessionStorage` has `slideforge.resume.pin` and an identity. | `join.html:1182-1195`, `2677-2691` |
| Relay, phone resumes | Token matched against players and waiting. If that player's old socket is still open: `error` "You are already connected in another tab." Otherwise the new socket takes the seat, journals `resume`, admits from waiting if the window is open, sends `joined` or `waiting`. If joined: `context`; then, if a question is open and this player was eligible and time remains, `question` (with `timeLimit` set to the seconds left, and Heads Up fields for this player) and `locked` if they had answered; else if a prompt is open, `prompt` and `replied` with what they had sent. Then `players` and `tally` to the host. | `server.js:2573-2600` |
| Relay, phone closes | Seat kept (`me.sock = null`), journals `leave`, drops the pace signal, pushes `players`, `tally`. | `server.js:3037-3051` |
| Host, socket drops | Room held for 90 s (`HOST_GRACE_MS`), `hostAway {away:true}` broadcast. After 90 s with no host the room closes with "The host disconnected." | `server.js:683`, `3019-3036` |
| Host, page reload | `Live.resumeHeldRoom` connects with the held `{pin, token}` and sends `rehost`. A dropped socket without a reload is not retried: the host toasts and clears the PIN. | `live.js:925-934`, `1081-1097` |
| Host, slow hosted relay | Connect budget 45 s hosted, 4 s local, two retries hosted only. | `live.js:1012-1017`, `1039-1050` |

### 4.4 Starting and rounds

| `t` | Dir | Payload | Relay checks | Sent when | Receiver does | Where |
|---|---|---|---|---|---|---|
| `begin` | H→R | none | Phase is `lobby` | Start button | Phase `running`, journals `begin`, broadcasts `begun` | `live.js:2321`; `server.js:1807-1812` |
| `begun` | R→all | none | | After `begin` | Wait screen says "Here we go" | `server.js:1811`; `join.html:1273-1276` |
| `round` | H→R | `gameId` string | none | Host lands on a slide whose `gameId` differs from the last one | Round number +1, spoken count for the game reset, join window opened, waiting players admitted (each gets `joined` with `admitted:true`), broadcasts `roundOpen`, pushes `players` | `live.js:3080-3085`; `server.js:1794-1805` |
| `roundOpen` | R→all | `n` int | | After `round` | No-op on the phone | `server.js:1802`; `join.html:1231-1233` |
| `joinClosed` | R→all | none | | First `question` while the window is open | No case in `join.html`; the host learns from `players.joinOpen` | `server.js:1910-1916` |

The join window also reopens, and waiting players are admitted, whenever the host sends `at` with an activity other than `question` outside the lobby (`server.js:2422-2428`). So in practice it shuts at each question and reopens at the next non-question slide, not only at each round.

### 4.5 Teacher-entered roster (host relays these from `manual.html`)

| `t` | Dir | Payload | Relay checks | Result | Where |
|---|---|---|---|---|---|
| `manualAdd` | H→R | `names` string[], `team` int (teams mode) | Not during a question. Teams mode needs a valid team. Names trimmed, cut to 24, at most 200, unique against the room, room total at most 200. | Players with `manual:true`, no socket; journals `join` with `source:'teacher', admitted:true`; `players` | `live.js:348`; `server.js:1654-1675` |
| `manualRename` | H→R | `playerId`, `name` | Player exists (players or waiting); name non-empty, unique | Journals `rename`; `players`, `tally` | `live.js:248`, `349`; `server.js:1676-1691` |
| `manualTeam` | H→R | `playerId`, `team` | Player exists; teams mode; valid index | Journals `team`; `players` | `live.js:350`; `server.js:1692-1705` |
| `manualRemove` | H→R | `playerId`, `mode` `'kick'`\|other (`'delete'`) | Player exists | Removed from players or waiting and from the open question's eligible set; journals `kick` or `remove` with `source`; a connected phone gets `kicked` and is closed; `players`, `tally`, `signals` | `live.js:255`, `262`, `351-352`; `server.js:1706-1730` |
| `manualError` | R→H | `message`; for `manualAnswer` also `playerId`, `id` | | Any refusal above or in `manualAnswer` | Forwarded to the entry window as `sf-manual-error` | `server.js:1655-1683`, `1733`; `live.js:1219-1223` |
| `kicked` | R→P | `reason` | | `manualRemove` of a phone | Clears the saved identity, shows "You left the room" | `server.js:1721-1724`; `join.html:1566-1576` |

---

## 5. Every slide (any phase)

| `t` | Dir | Payload | Relay checks | Sent when | Receiver does | Where |
|---|---|---|---|---|---|---|
| `at` | H→R | `slideId`, `title`, `n`, `total`, `step`, `activity` (`content`\|`question`\|`feedback`\|`moment`), `text` (excerpt), `bloom`, `style`, `role` (`watch`\|`discuss`\|`paper`\|`wait`\|''), `participation`, `headPrompt`, `stage` (object or null) | Each field bounded (ids 160, title 200, text 2400, step 0-99); unknown `activity` becomes `content`; `stage` cleaned by `cleanStage` (`server.js:996-1011`): `i` 0-7, `of` 0-8, `name`, `job` one of `note`/`talk`/`send`/`work`/`down`, `group`, `text`, `brief`, `seconds`, `left`, `next` | Every slide change (`onSlide`), every build step, every stage change | Stores `room.at`. If the slide moved and a prompt is open: closes it (`promptEnd` broadcast). If not a question and not the lobby: phase `idle`, question cleared, window reopened, waiting admitted, `players`. A new note stage resets its written count (`wrote` to host). Broadcasts `context` (also to watchers), then `floor`, then `bookmarks` to host. If the slide moved, pace signals clear (`signalled {kind:null}` broadcast, `signals` to host). | send `live.js:2865-2889`, `2890-2894`, `2914-2918`, `3091`; handle `server.js:2391-2445` |
| `context` | R→P, R→watcher | `sessionId`, `lesson` (room title), every field of `room.at`; per-phone copy adds `reacted` boolean | | After `at`; on join, admission and resume (`sendContext`, only when a slide is known) | Phone repaints its companion screen; watcher moves the slide | `server.js:1289-1291`, `1349-1354`, `2436-2437`, `3075-3079`; `join.html:1210-1212`; `view.html:219` |
| `floor` | H→R | `mode` `auto`\|`open`\|`shut` | Unknown becomes `auto` | Host toggles who may speak | Broadcasts `floor` | `live.js:2347`; `server.js:2364-2367` |
| `floor` | R→all | `open` boolean, `mode` | | After `floor`, `blankPhones`, every `at` | Shows or hides the Ask button | `server.js:2366`, `2381`, `2439`; `join.html:1400-1402` |
| `blankSoon` | H→R / R→all | `seconds` 0-60 (0 cancels) | Rounded and clamped | Host starts "phones down in N" | Phone shows the countdown. The host runs the clock and then sends `blankPhones`. | `live.js:2365`, `2376`; `server.js:2369-2376`; `join.html:1408-1410` |
| `blankPhones` | H→R / R→all | `on` boolean | `on === true` | Host blanks or restores phones | Phone dark or back; `floor` follows | `live.js:2396`; `server.js:2378-2382`; `join.html:1404-1406` |
| `reactions` | H→R / R→all | `on` boolean | `on !== false` | Host toggles reactions | Phone shows or hides the reaction bar | `live.js:2405`; `server.js:2384-2389`; `join.html:1412-1414` |
| `react` | P→R | `kind` (`clap`\|`yes`\|`wow`\|`idea`), `slideId` | Player in room; reactions on; slide matches; no question, no prompt, activity `content`; once per slide; once per 2.5 s per phone; 12 per 2 s per room | Reaction tap | `reaction {kind}` to host, `reacted {kind, slideId}` to the phone. Not journalled. | `join.html:1741`; `server.js:2758-2786` |
| `reaction` | R→H | `kind` | | After `react` | Wall animation, desk counts | `server.js:2783`; `live.js:1287-1293` |
| `reacted` | R→P | `kind`, `slideId` | | After `react` | Marks the slide acknowledged | `server.js:2784`; `join.html:1416-1421` |
| `signal` | P→R | `kind` (`lost`\|`fast`\|`slow`, or anything else to clear), `slideId` | Player in room; slide matches if given. Not gated by the floor. Same kind again clears it. | Pace pad | `signalled` to the phone; `signals` to host. First signal of a kind per slide per phone journals `signal` without the player. | `join.html:1799`; `server.js:2799-2828` |
| `signalled` | R→P | `kind` or null | | After `signal`; broadcast `{kind:null}` when the slide moves | Pace pad state | `server.js:2812`, `2815`, `2443`; `join.html:1381-1383` |
| `signals` | R→H | `counts {lost, fast, slow}`, `live`, `of` (connected phones), `kind` (loudest or null), `spike` boolean (2 or more and at least a quarter of the room) | | After a signal, a leave, a kick, a slide move; every 5 s while signals expire | Cues on the wall and desk | `server.js:1096-1132`; `live.js:1298-1303` |
| `away` | P→R | `away` boolean | Player in room; changed | Page visibility changes, and on (re)join | `players` (the roster's `away`) | `join.html:770-777`; `server.js:2790-2797` |
| `bookmark` | P→R | `slideId`, `saved` boolean | Player in room; slide is the current one; at most 500 | Save-for-review toggle | `bookmarks` to host when the count changes | `join.html:955`; `server.js:2749-2756` |
| `bookmarks` | R→H | `slideId`, `count` | | With `players`, on `at`, on a change | Desk count | `server.js:930-933`; `live.js:1295-1296` |
| `ask` | P→R | `text` | Floor open (else `askRejected`); text trimmed, cut to 240, non-empty; at most 5 live questions per player | Ask screen | Pending Q&A item; journals `qaAsk`; `asked {id}` to the phone; `qa` to host, `qaList` to every phone | `join.html:1852`; `server.js:2702-2731` |
| `asked` / `askRejected` | R→P | `id` / `reason` | | After `ask` | Confirmation or error | `server.js:2728`, `2708`, `2719`; `join.html:1286-1293` |
| `qaVote` | P→R | `id` | Item approved; not the voter's own | Vote button | Toggles the vote; journals `qaVote`; `qa`, `qaList` | `join.html:1897`; `server.js:2843-2855` |
| `qaModerate` | H→R | `id`, `action` (`approve`\|`dismiss`\|`answered`\|`pending`) | Item exists, action known | Desk Q&A buttons (via `Player.emit('qaCommand')`) | State changes; unpins if no longer approved; journals `qaModerate`; `qa`, `qaList` | `live.js:1675`; `server.js:2337-2352` |
| `qaPin` | H→R | `id` or null | Only an approved item can be pinned | Desk pin and unpin | Journals `qaPin`; `qa`, `qaList` | `live.js:1673-1674`; `server.js:2354-2362` |
| `qa` | R→H | `items` [{`id`, `text`, `name`, `at`, `state`, `votes`}] incl. pending, `pinned`, `pending` count, `open` count | | After any Q&A change | Desk queue, pinned item on the wall | `server.js:1047-1062`, `1134-1139`; `live.js:1305-1311` |
| `qaList` | R→P | `items` [{`id`, `text`, `name`, `state`, `votes`, `mine`, `asked`}] approved and answered only, `pinned` | | On fresh join, after any Q&A change | Ask screen list and badge | `server.js:1064-1073`, `2691`; `join.html:1278-1284` |
| `report` | H→R | none | | Overview refresh (debounced 200 ms), entry window `hello` and `report` | `sessionReport` | `live.js:238`, `346`, `411`; `server.js:1792-1793` |
| `sessionReport` | R→H | `report` (live projection with names) | | After `report` | Overview pane, entry window | `server.js:1793`; `live.js:1121-1132` |
| `recording` | R→H | `id`, `persisted` boolean, `updatedAt` | | After every journal write | Toast if writing failed | `server.js:1414-1418`; `live.js:1116-1120` |

---

## 6. Question

### 6.1 `question` (H→R)

Sent by `sendOpenQuestion` when the host lands on an unrevealed quiz slide (`live.js:2944-3005`, from `onSlide` `live.js:3137`). Not sent for boards, sprint runs, Definition Challenge in its reading stage, discuss-only Compare & Contrast, or Concept Chain; those get `idle` (`live.js:3097-3136`).

| Field | Type | Relay treatment (`server.js:1814-1932`) |
|---|---|---|
| `id` | string | Cut to 160. A repeat of the open question's id while in `question` is dropped (`server.js:1833`). |
| `n`, `total` | number | Position in the deck; `n` falls back to a running count |
| `question` | string | Cut to 2000 |
| `input` | string | One of `text`, `number`, `order`, `tap`, `fill`, `sort`; anything else is `choice` |
| `options` | string[] | Required for choice (2-6), tap (2-80), fill word bank (2-12), sort statements (2-10), order (3-8). Each cut to 2000. Ignored for `text` and `number`. Message dropped if the count is wrong. |
| `fillParts` | string[] | Fill only. Gaps = length − 1, must be 1-4. At most 5 parts, each cut to 400. |
| `bins` | string[3] | Sort only. Exactly 3 or dropped. Each cut to 60. |
| `range` | `{min, max, step, unit}` | Number only. Defaults 0, 100, 1, ''. Shape of the slider, not used for marking. |
| `timeLimit` | number | Seconds, 0 = none. Answers after it are dropped. |
| `points` | number | Default 1000 |
| `confidence` | boolean | Phone asks "how sure?" after locking. Host sends `s.confidence !== false`. |
| `voteOnly`, `unmarked` | boolean | Journalled; `unmarked` means no verdicts are needed at reveal |
| `showdown`, `predict` | boolean | Choice only |
| `timeTravel`, `timeline` [{`label`, `year`}] | | Number only; at most 20 events |
| `roundLeft` | number | 0-600 s; the phone counts down the round, adjusted on resume |
| `misconceptions` | string[] | Choice only, at most 6. Journalled, never sent to phones. |
| `spoken` | boolean | Only honoured for style `headsup`, `spinexplain`, `connection`, `conceptchain`, `randomchallenge` |
| `term`, `guesser` | string, int | Heads Up only |
| `gameId`, `scoreSpoken`, `participation`, `sourceSlideId`, `bloom` | | Bounded and journalled |
| `style`, `headPrompt`, `clueMode` (`emoji` only), `clues` | | Phone skin |

On accept the relay: bumps `asked`, resets `answerRev` to 0 and `answersClosed`; generates `attempt` (a UUID that keys every journal record for this question); sets phase `question`; closes the join window (`joinClosed`, `players`) if it was open; snapshots `eligible` = manual rows plus players with an open socket; journals `question`; clears every player's answer, `sure`, `answeredAt`, `lastGain`, `switched`; sends `spoken` per phone (spoken styles) or broadcasts `question`; sends `tally` to the host.

### 6.2 `question` and `spoken` (R→P)

`questionMessage` (`server.js:1294-1337`).

| Message | Fields |
|---|---|
| `question` | `n`, `question`, `options`, `input`, `range`, `confidence`, `count` (options length), `total`, `timeLimit`; when set: `style`, `headPrompt`, `clueMode`, `clues`, `fillParts` and `gaps` (fill), `bins` (sort), `predict`, `timeTravel` and `timeline`, `roundLeft`. No `id`, no correct answer, no `misconceptions`, no `showdown` flag. |
| `spoken` | `style`, `role:'discuss'`, `headPrompt`, `participation`; Heads Up adds `headsWaiting` (no guesser yet), `youGuess` (this phone guesses), or `term` (clue-givers) |

The phone draws the pad for `input` (`join.html:2059` `askQuestion`, `1313-1316`) or the spoken wait screen (`join.html:1341-1360`).

### 6.3 Input kinds and the `answer` message (P→R)

`answer` is accepted only when: the player is in the room, phase is `question`, the player is eligible, the question is not spoken, the time limit has not passed, answers are not closed, and the player has not already answered (`server.js:2907-2914`, `2926`). Failing any check drops it silently.

| Input | Phone sends | Relay validation | Stored as | `locked` reply | Phone send site |
|---|---|---|---|---|---|
| `choice` | `{choice}`; Predict adds `sure` | Integer, 0 ≤ choice < options | index | `{choice}` | `join.html:2457`, `2435` |
| `tap` | `{choice}` (word index) | As choice | index | `{choice}` | `join.html:2303` |
| `text` | `{text}` | Trimmed, cut to 120, non-empty | string | `{text}` | `join.html:2509` |
| `number` | `{value}` | `typeof number`, finite, \|v\| ≤ 1e12 | number | `{value}` | `join.html:2484` |
| `order` | `{order}` | Array of length n, a permutation of 0..n−1 | int[] | `{order}` | `join.html:2521` |
| `fill` | `{fill}` | Array of length `gaps`, each a word-bank index (repeats allowed) | int[] | `{fill}` | `join.html:2239` |
| `sort` | `{sort}` | Array of length n, each 0 (A only), 1 (both) or 2 (B only) | int[] | `{sort}` | `join.html:2156` |

Validation is in `server.js:2930-2970`. An optional `sure` boolean on `answer` is stored. On accept the relay sets `answeredAt`, bumps `answerRev`, journals `answer`, sends `locked` (`lockedMessage`, `server.js:1340-1347`) and pushes `tally`.

The phone locks its pad before the relay replies (`join.html:2455-2458`). If the relay drops the answer, the phone still looks locked.

| `t` | Dir | Payload | Relay checks | Sent when | Receiver does | Where |
|---|---|---|---|---|---|---|
| `locked` | R→P | exactly one of `choice`, `text`, `value`, `order`, `fill`, `sort` | | After an accepted `answer`; on resume if already answered | Locks the pad; asks "how sure?" if the question wants it | `server.js:1340-1347`, `2999`, `2591`; `join.html:1362-1379` |
| `sure` | P→R | `sure` boolean | Phase `question`; answers open; player has answered | Confidence buttons after `locked` | Stores it, journals `sure`, `tally`. `answerRev` does not move. | `join.html:1843`; `server.js:2737-2747` |
| `tally` | R→H | `id`, `counts` (per option, choice and tap only, including hand counts), `answered`, `sured`, `total` (eligible and connected or answered or manual, plus hand counts), `split`, `switched`, `waiting`, `allIn`, `manual` (any teacher rows), `rev` (= `answerRev`), `answers` [{`id`, `name`, `team`, `response`, `sure`, `elapsedMs`}] | | After every answer, sure, switch, join, leave, manual answer and tally, and after `question` and `reveal` | Stores the snapshot for marking, paints the bars, auto-reveals when `allIn && answered > 0 && !manual` (with a 5 s grace for confidence) | `server.js:877-927`; `live.js:1224-1242`, `3300-3335` |

### 6.4 Teacher entry during a question

| `t` | Dir | Payload | Relay checks | Result | Where |
|---|---|---|---|---|---|
| `manualAnswer` | H→R | `playerId`, `id` (question id), `clear` boolean, and one of `choice`, `text`, `value`, `order`, `fill`, `sort` | Player is a manual row; question open with that `id`; answers not closed; not spoken; player eligible. Same per-input validation as `answer` except: text needs non-empty; choice and tap need a valid index; other inputs refused. Refusals reply `manualError` with `playerId` and `id`. | Sets or clears the answer (`clear`), bumps `answerRev`, journals `manualAnswer`, `tally` | `live.js:353`; `server.js:1731-1790` |
| `manualTally` | H→R | `id`, `counts` int[] (one per option) | Choice only; open; not closed; `id` matches if given; length matches. Each 0-500. | Hand counts added to `tally`; never scored; journals `manualTally` | `live.js:387`; `server.js:1934-1944` |

When any manual row is in the room, the relay pays flat points with no speed bonus (`server.js:2085`) and the host does not auto-reveal (`live.js:1241`).

### 6.5 Style-specific mid-question messages

| `t` | Dir | Payload | Relay checks | Sent when | Receiver does | Where |
|---|---|---|---|---|---|---|
| `guesser` | H→R | `id` (player id or null) | Open spoken Heads Up question | Teacher picks the speaker in entry | Re-sends `spoken` to every eligible phone | `live.js:364`; `server.js:1946-1953` |
| `closeAnswers` | H→R | `id` | Open, not closed, id matches | Predict the Outcome: lock predictions | Closes answers, journals `closeAnswers`, sends `answersClosed` to eligible phones | `live.js:3028`; `server.js:1955-1967` |
| `answersClosed` | R→P | `id`, `answered` boolean | | After `closeAnswers` | "Prediction locked" wait screen | `server.js:1965`; `join.html:1322-1330` |
| `showdown` | H→R | `id` | Open showdown question, split not yet shown, not closed | True/False Showdown: Next, or half-way through a timed question | Counts the split from answers, journals `showdown`, sends `showdown` to eligible phones, `tally` | `live.js:3041`; `server.js:1969-1988` |
| `showdown` | R→P | `id`, `counts`, `options`, `mine` | | After `showdown` | Shows the split and the one-time Switch button | `server.js:1985`; `join.html:1318-1320` |
| `answer` with `switch:true` | P→R | `choice`, `switch: true` | Split shown; already answered; not yet switched; valid and different choice | Switch button | Changes the answer, bumps `answerRev`, journals `switch`, replies `switched`, `tally` | `join.html:2585`; `server.js:2915-2925` |
| `switched` | R→P | `choice` | | After a switch | Final answer shown | `server.js:2922`; `join.html:1332-1339` |
| `hintOut` | H→R | `id` | Open question, id matches, hint not already out | Emoji Guess: hint step revealed on the wall | Stamps `hintAt`, journals `hintOut`, sends `hintOut` to phones that have not answered. Later phone answers that score are halved. | `live.js:2898-2910`; `server.js:2250-2261`, `2092-2095` |
| `hintOut` | R→P | none | | After `hintOut` | Banner: an answer now scores half | `server.js:2260`; `join.html:1511-1519` |

---

## 7. Reveal

### 7.1 `reveal` (H→R)

Sent by `sendReveal` (`live.js:3253-3289`), from `revealNow` (`live.js:3337`), which runs on Next, on auto-reveal, on an entry-window `reveal` or `revealWith`, or on `markStale`.

| Field | Type | Meaning |
|---|---|---|
| `id` | string | Must match the open question if given |
| `rev` | number | The `answerRev` of the snapshot the host marked (`Live.snapshot.rev`, from the last `tally`) |
| `marks` | `[[playerId, boolean], ...]` | The host's verdict for every answer in the snapshot (`SF.markResponse`). Empty when `unmarked`. Keys compared as strings. |
| `correct` | int | Choice: required valid index, else the reveal is dropped. Text and number send -1. |
| `answer` | string | Display text (cut to 200) |
| `explanation` | string | Cut to 1200 |
| `gains` | `[[playerId, number], ...]` | Optional. When present for a player it replaces the relay's own points. Sent for speed, predict, boss, wordreveal, order, fill, sort, claim; `[]` for spoken and bowl. |
| `spoken` | `{recipient: {type:'player'\|'team'\|'room', id}}` | Spoken styles only |

Relay steps (`server.js:1990-2205`):

1. Drop unless phase is `question` and the id matches. Set `answersClosed = true` (the set cannot grow from here).
2. If `rev` differs from `answerRev`, or any eligible answered player has no mark (and the question is not `unmarked`), reply `markStale` and stop. The question stays open; answers stay closed.
3. Choice with no valid `correct`: dropped.
4. Points per player: host gain if given (counts a right mark too); else, if marked right, `points × (0.5 + 0.5 × speed)` when there is a time limit and no manual rows, else flat `points`. Halved after the Emoji hint. Score never below 0. `askedCount`/`answeredCount` updated for eligible players on marked, non-spoken questions.
5. Spoken: accepted means `correct === 0` (Spin & Explain also 1, half points). Points 1000 (`SPOKEN_POINTS`), 0 for Heads Up and Random Challenge. Teams mode credits the recipient's team; individual mode credits the named player only if `scoreSpoken`. `oralCount` to host.
6. Teams mode, non-spoken: each team adds the average `lastGain` of its eligible members.
7. Phase `revealed` (`server.js:2064`). `result` to every connected phone. `teamAnswers` to host (choice only). Journal `reveal`. `players`, `tally`.

| `t` | Dir | Payload | Sent when | Receiver does | Where |
|---|---|---|---|---|---|
| `markStale` | R→H | `id`, `rev`, `answers` (as in `tally`) | A reveal marked from a stale or incomplete snapshot | Replaces the snapshot and sends `reveal` again for the same slide, repaints typed and placed answers | `server.js:2012-2027`; `live.js:1244-1254` |
| `result` | R→P | `spoken`, `unmarked`, `switched`, `split`, `picked`, `oralCount`, `oralAccepted`, `oralYou`, `oralTeam`, `oralPoints`, `right` (boolean or null), `answered`, `gained`, `hinted`, `score`, `correct`, `asked`, `rank`, `of`, `tied`, `won`, `label`, `team` (team standing or null), `answer`, `why` | After an accepted reveal | Result screen (verdict, points, standing, explanation); spoken and unmarked variants on the wait screen | `server.js:2132-2174`; `join.html:1423-1474` |
| `teamAnswers` | R→H | `correct`, `counts` (per team, per option) | Choice reveal | Race and boss mechanics advance | `server.js:2176-2191`; `live.js:1282-1285` |
| `oralCount` | R→H | `gameId`, `slideId`, `kind`, `count`, `accepted` | Spoken reveal, `oralCredit` | Spoken count chip | `server.js:2128-2129`, `2284-2285`; `live.js:1276-1280` |

`team` (standing) is `{team, score, rank, of, tied, won, label}` (`server.js:1249-1265`).

### 7.2 After the reveal

| `t` | Dir | Payload | Relay checks | Sent when | Receiver does | Where |
|---|---|---|---|---|---|---|
| `raceLanes` | H→R | `length` 1-50, `rows` [[key, pos]] (key `p<id>` or `t<team>`, at most 500) | | A race redraws its track | Each phone gets its own `lane` | `live.js:1767-1770`; `server.js:2231-2248` |
| `lane` | R→P | `pos`, `length`, `place`, `tied`, `of`, `team` boolean | | After `raceLanes` | Lane strip on the result screen | `server.js:2246`; `join.html:1476-1478` |
| `oralCredit` | H→R | `id` (slide), `gameId`, `style:'conceptchain'`, `recipient {type, id}`, `scoreSpoken` | Style must be `conceptchain` | Concept Chain: each accepted link, while the term stays open | 1000 to the team (teams) or to the named player (`scoreSpoken`, individual); `oralCount` to host; `credit` to every phone; journals `oralCredit`; `players` | `live.js:739-750`; `server.js:2263-2297` |
| `credit` | R→P | `oralYou`, `oralTeam`, `oralPoints`, `gained`, `score`, `oralCount` | | After `oralCredit` | Banner | `server.js:2291-2292`; `join.html:1521-1535` |
| `oral` | H→R | `slideId`, `title`, `kind`, `set`, `card`, `term` (required), `participant`, `right`, `value` (0-10000) | `term` non-empty | A board verdict (memory, knowledge, quiz bowl, boss) that no phone sees | Journals `oral` only. No reply. | `live.js:3455-3459`; `server.js:2447-2467` |

---

## 8. Beat the Clock self-paced sprint (K29)

The one place the relay marks. The host hands over the whole run with its answer key; each phone works through it at its own pace against one round clock (`server.js:1141-1153`).

| `t` | Dir | Payload | Relay checks | Sent when | Receiver does | Where |
|---|---|---|---|---|---|---|
| `sprint` | H→R | `id`, `gameId`, `seconds` (10-600, default 90), `questions` [{`id`, `question`, `options`, `correct`}] | At most 60 questions; question cut to 500, options to 200, at most 6; a question needs 2 or more options and a valid `correct` or it is removed; none left: dropped. An open sprint is closed first. | Host lands on the first slide of a speed game with a round clock | Clears `room.question`, phase `sprint`, starts the timer, journals `sprint`, sends `sprintQ` to every non-manual player, `sprintProgress` | `live.js:1921-1931`; `server.js:2207-2226` |
| `sprintQ` | R→P | `id`, `n`, `of`, `question`, `options`, `left` (seconds) | | Start of the sprint (per phone) | Draws the question | `server.js:1167-1175`; `join.html:1482-1484` |
| `sprintA` | P→R | `choice` int | Sprint open and before `endsAt`; valid index for this phone's current question. No sprint id, phase or manual check. | Tap | Marks against `correct`: right 10 + (10 − whole seconds since shown, min 0); wrong −5; score not below 0. Advances, replies `sprintMark`, `sprintProgress`. | `join.html:1075`; `server.js:2883-2905` |
| `sprintMark` | R→P | `id`, `right`, `answer` (correct option text), `gained`, `score`, `right_n`, `next` (next `sprintQ` body or null), `done` (`{right, answered}` or null) | | After `sprintA` | Flashes the mark, then the next question or the finished screen | `server.js:2900-2902`; `join.html:1486-1488`, `1090-1106` |
| `sprintDone` | R→P | `right`, `answered`, `score` | | `sendSprintQuestion` when a phone has no question left | Finished screen | `server.js:1174`; `join.html:1490-1492` |
| `sprintProgress` | R→H | `id`, `answers`, `right`, `finished`, `playing` (non-manual players), `of` | | Start and after every tap | Sprint panel | `server.js:1177-1187`; `live.js:1260-1262` |
| `sprintEnd` | H→R | none | | Teacher stops it, or leaves the game's slides | `closeSprint` | `live.js:1941`, `1946`; `server.js:2228-2229` |
| `sprintResult` | R→H | `id`, `gameId`, `answers`, `right`, `questions` [{`id`, `answered`, `wrong`, `lure`, `lureN`}] | | Clock runs out or `sprintEnd` | Marks the run's slides revealed, paints the result | `server.js:1225-1226`; `live.js:1264-1274` |
| `sprintOver` | R→P | `right`, `answered`, `gained`, `score`, `rank`, `of`, `tied`, `label`, `team` | | Same | "Time!" result screen | `server.js:1229-1233`; `join.html:1494-1509` |

`closeSprint` (`server.js:1189-1237`) sets phase `idle`, folds the run into each player's correct, asked and answered counts, credits teams with the average gained, journals `sprintEnd`, and pushes `players`.

---

## 9. Feedback prompts (poll, word cloud, brainstorm, scale)

Independent of the quiz flow. Opened from a slide's feedback, a quick poll (`js/quick-poll.js` via `Live.startCustomPrompt`), a Share stage's idea box (`js/stages.js:104-111`, brainstorm, max 1), or proposals for Concept Chain, Connection and Compare (`live.js:479-482`, brainstorm, max 2).

| `t` | Dir | Payload | Relay checks | Sent when | Receiver does | Where |
|---|---|---|---|---|---|---|
| `prompt` | H→R | `id` (`<slideId>:fb` or `quick:<ms>`), `kind`, `prompt`, `options`, `ends {low, high}`, `max`, `shape` (`link`\|`bridge`), `from`, `bloom`, `nextStep`; host also sends `presentAs`, `hold`, `custom`, `origin`, `stage`, `quiet`, which the relay ignores | `kind` must be `poll`, `wordcloud`, `brainstorm` or `scale`. Prompt cut to 240; at most 6 options, each cut to 500; `max` 1-5; `ends` only for scale. | Landing on a slide with feedback; starting a custom prompt | New `attempt`, replies cleared, journals `prompt`, broadcasts `prompt`, `responses` to host | `live.js:2614`, `2679`; `server.js:2299-2330` |
| `prompt` | R→P | `kind`, `prompt`, `options`, `ends`, `max`, `shape`, `from` | | Broadcast, and on join, admission and resume | Prompt screen with poll pads, scale, or text box | `server.js:1356-1368`; `join.html:1295-1297` |
| `reply` | P→R | poll and scale: `choice` int; word cloud and brainstorm: `text` | Player in room; a prompt open. Poll and scale: valid index, last vote wins. Text: under the `max` quota, trimmed, cut to 40 (word cloud) or 160, non-empty. | Poll button, text send | `replied` to the phone; journals `reply` with all of this player's values; `responses` | `join.html:2002`, `2018`; `server.js:2857-2880` |
| `replied` | R→P | poll and scale: `choice`; text: `text`, `used`, `max`; on resume: `choice` or `used`, `max` | | After `reply`, on resume | Confirms, updates the quota | `server.js:2868`, `2876`, `2596`; `join.html:1309-1311` |
| `responses` | R→H | `id`, `answered` (phones that replied), `players`, plus the digest: poll and scale `{kind, counts, total}`; word cloud `{kind, words [{text, n}] top 40, total, unique}`; brainstorm `{kind, items [{name, pid, text, seq}] newest 40, total}` | | After `prompt`, `reply`, and with `players` while a prompt is open | Rail or full-screen digest; proposals listed in entry | `server.js:935-992`, `1028-1036`; `live.js:1322-1329` |
| `promptEnd` | H→R / R→all | none | | Slide without feedback, custom prompt ended; relay also sends it when `at` moves while a prompt is open | Prompt closed; phone thanks and waits | `live.js:2585`, `2700`; `server.js:2332-2335`, `2420`; `join.html:1299-1307` |

### Staged activities

| `t` | Dir | Payload | Relay checks | Sent when | Receiver does | Where |
|---|---|---|---|---|---|---|
| `wrote` | P→R | `slideId`, `stage` int, `yes` boolean | Current stage's job is `note`; slide and stage match | The learner writes or clears a private note | Adds or removes the player from the written set; `wrote` to host. The words stay on the phone (`localStorage`). | `join.html:810-819`; `server.js:2832-2841` |
| `wrote` | R→H | `slideId`, `stage`, `n`, `of` (non-manual players) | | After a phone `wrote`, and when a new note stage starts | Written count on the wall and desk | `server.js:1019-1026`; `live.js:1313-1320` |

---

## 10. Between questions and at the end of a game

| `t` | Dir | Payload | Relay checks | Sent when | Receiver does | Where |
|---|---|---|---|---|---|---|
| `idle` | H→R | `style`, `role`, `participation`, `headPrompt` (from `phoneCompanion`) | Bounded; missing fields fall back to `room.at` | Any non-question slide, a revisited revealed question, a board, a sprint slide after the first, and the waits listed in 6.1 | Phase `idle`, question cleared, companion fields saved into `room.at`, broadcasts `idle` | `live.js:2861-2863`; `server.js:2469-2486` |
| `idle` | R→all | `style`, `role`, `participation`, `headPrompt` | | After `idle` | Participation screen, or "Hold on" if a question was showing | `server.js:2472-2485`; `join.html:1541-1564` |
| `finish` | H→R | `title`, `note`, `kind` (`race`\|`boss`, else points) | Bounded | Results slide, 400 ms after landing | Phase `idle`; each phone gets its own `finish` | `live.js:3138-3167`; `server.js:2488-2500` |
| `finish` | R→P | `title`, `note`, plus `finishPayload`: points `{score, rank, of, tied, won, label, team}`; race and boss `{score, kind, won:false, tied:false, rank:null, of:0, team:null, label:'', note}` | | After `finish` | Final screen | `server.js:1267-1287`, `2499`; `join.html:1537-1539` |

---

## 11. Room end

| `t` | Dir | Payload | Sent when | Receiver does | Where |
|---|---|---|---|---|---|
| `end` | H→R | none | `Live.stop()`; the host closes its socket 1.5 s later so the report can arrive | `closeRoom` | `live.js:3435-3445`; `server.js:2520-2522` |
| `sessionClosed` | R→H | `report` | `closeRoom` (end, host grace expired, server shutdown) | Forgets the held room, stores the report | `server.js:1425`; `live.js:1121-1132` |
| `watchEnd` | R→watcher | `message` (only from `closeRoom`) | Room closed, or `watchOn` with no id | Watcher shows the message and closes | `server.js:1430`, `2514`; `view.html:220` |
| `over` | R→P | `reason`, plus `finishPayload` for players (waiting phones get `reason` only) | `closeRoom` | Clears the saved identity, final screen, no reconnect | `server.js:1432-1440`; `join.html:1578-1584` |

`closeRoom` (`server.js:1420-1443`) journals `end {reason}` first, then sends the above, then deletes the room. `SIGINT` and `SIGTERM` close every room with "The server stopped." (`server.js:3124-3130`).

---

## 12. Big-screen watcher (`view.html?s=<id>&follow=1`)

The watcher reads the shared deck over HTTP, then follows the room on the socket. It is never a player and is never journalled.

| `t` | Dir | Payload | Relay checks | Sent when | Receiver does | Where |
|---|---|---|---|---|---|---|
| `watchOn` | H→R | `s` (share id, 32 hex, or '' to turn off) | Host role | `Live.watchOn(id)` after a share is created (share dialog, or desk `shareWatch`) | Stores `room.watchId`; turning off sends `watchEnd` to watchers; replies `watchState` | `live.js:3501-3505`; `server.js:2502-2518` |
| `watchState` | R→H | `on` boolean | | After `watchOn` | No case in `live.js` | `server.js:2517` |
| `watch` | watcher→R | `s` | Socket has no role; `s` is 32 hex; compared in constant time against each room's `watchId` | Socket opens (and on every reconnect, backing off to 30 s) | Adds the watcher; replies `watching`; afterwards it receives every `context` | `view.html:211-231`; `server.js:2539-2558` |
| `watching` | R→watcher | `title`, `at` (last `context`, or null) | | Reply to `watch` | Moves to slide `at.n`, steps to `at.step` | `server.js:2556`; `view.html:218` |
| `error` | R→watcher | `message` | | Bad id, or no room is presenting it | Shows the message | `server.js:2542`, `2549`; `view.html:221` |

---

## 13. Speaker notes channel (`prompter.html`)

Separate from rooms. The show is `js/player.js`, not `js/live.js`, and it uses its own socket.

| `t` | Dir | Payload | Relay checks | Sent when | Receiver does | Where |
|---|---|---|---|---|---|---|
| `prompterOpen` | show→R | none | Socket has no role; fewer than 500 channels | "Notes on another device" | New 32-hex channel id; replies `prompterReady` | `js/player.js:3003`; `server.js:1469-1476` |
| `prompterReady` | R→show | `id` | | Reply | Shows QR and link `prompter.html?p=<id>`, sends state | `server.js:1474`; `js/player.js:3007` |
| `prompterState` | show→R | `state {index, total, step, steps, title, notes, next, deck, startedAt}` | Role is show. Numbers clamped, strings cut (notes 20,000). | Every slide change | Stores and forwards to every watcher | `js/player.js:2921-2931`, `3015`; `server.js:669-680`, `1477-1483` |
| `prompterState` | R→notes screen | `state` | | Forwarded, and on watch if known | Paints notes, title, next, clock | `server.js:1481`, `1492`; `prompter.html:115` |
| `prompterWatch` | notes screen→R | `id` | Socket has no role; 32 hex; channel exists | Socket opens (retries with back-off) | Adds the watcher; `prompterWatchers` to the show | `prompter.html:112`; `server.js:1484-1494` |
| `prompterWatchers` | R→show | `n` | | A notes screen joins or leaves | Count on the card | `server.js:1491`, `3013`; `js/player.js:3008` |
| `prompterCmd` | notes screen→R | `cmd` `next`\|`prev` | Role is watcher; show open; at most one per 150 ms | Next and Back buttons, arrow keys | Forwarded to the show | `prompter.html:103-105`; `server.js:1495-1502` |
| `prompterCmd` | R→show | `cmd` | | Forwarded | `Player.next()` or `Player.prev()` | `server.js:1500`; `js/player.js:3009` |
| `prompterEnd` | R→notes screen | `reason` | | Unknown id, or the show's socket closed | Stops retrying, shows the reason | `server.js:1487`, `3007`; `prompter.html:116` |

---

## 14. Journal on disk

`server/sessions.js`. Directory: `SLIDEFORGE_SESSION_DIR`, else `SLIDEFORGE_DATA_DIR/sessions`, else `.slideforge/sessions` (`sessions.js:6-11`). Files are mode 0600 and each write is fsynced.

| File | Content |
|---|---|
| `<uuid>.json` | `{id, title, mode, teams, createdAt, tokenHash}` (`sessions.js:20-22`) |
| `<uuid>.jsonl` | One event per line: `{seq, at, type, data}`. Appended by `record()` (`server.js:1414-1418`, `sessions.js:27-37`). |

Each record is followed by a `recording` message to the host. `attempt` is the question's or prompt's UUID.

| `type` | `data` | Where |
|---|---|---|
| `created` | `{}` | `sessions.js:24` |
| `join` | `{id, name, team, admitted}`; teacher rows add `source:'teacher'` and `admitted:true` | `server.js:2648`, `1672` |
| `admit` | `{id}` | `server.js:1389` |
| `resume` | `{id}` | `server.js:2579` |
| `leave` | `{id}` | `server.js:3042` |
| `rename` | `{id, name}` | `server.js:1686` |
| `team` | `{id, team}` | `server.js:1701` |
| `kick` / `remove` | `{id, name, source}` (`teacher` or `device`) | `server.js:1717` |
| `begin` | `{}` | `server.js:1809` |
| `question` | the whole relay question: `id, attempt, input, spoken, gameId, scoreSpoken, participation, question, bloom, sourceSlideId, options, bins, fillParts, gaps, misconceptions, range, timeLimit, points, confidence, voteOnly, unmarked, showdown, predict, timeline, timeTravel, roundLeft, term, guesser, split, switched, index, total, style, headPrompt, clueMode, clues`, plus `eligible` (ids) | `server.js:1922` |
| `answer` | `{attempt, playerId, input, choice, text, value, order, fill, sort, sure, elapsedMs}`; only the field for `input` is non-null (`choice` holds tap too) | `server.js:2985-2997` |
| `manualAnswer` | as `answer`, plus `clear`, `source:'teacher'`; `sure` and `elapsedMs` null | `server.js:1788` |
| `manualTally` | `{attempt, counts}` | `server.js:1943` |
| `sure` | `{attempt, playerId, sure}` | `server.js:2742` |
| `showdown` | `{attempt, counts}` | `server.js:1982` |
| `switch` | `{attempt, playerId, choice}` | `server.js:2921` |
| `closeAnswers` | `{attempt}` | `server.js:1962` |
| `hintOut` | `{attempt}` | `server.js:2258` |
| `reveal` | `{attempt, correct, answer, explanation, spoken: {accepted, count, recipient (name), points} or null, marks [[id, bool]], scores [{id, score}]}` | `server.js:2193-2203` |
| `sprint` | `{gameId, seconds, questions}` (count) | `server.js:2224` |
| `sprintEnd` | `{gameId, answers, right, questions [{id, answered, wrong, lure, lureN}], scores}` | `server.js:1234-1235` |
| `oralCredit` | `{slideId, gameId, count, recipient (name or team name), points, scores}` | `server.js:2294-2296` |
| `oral` | `{slideId, title, kind, set, card, term, participant, right, value}` | `server.js:2455-2466` |
| `prompt` | the relay prompt: `{attempt, bloom, id, kind, prompt, options, nextStep, ends, max, shape, from}` | `server.js:2327` |
| `reply` | `{attempt, playerId, values}` (all of this player's values so far) | `server.js:2878` |
| `qaAsk` | `{id, playerId, text}` | `server.js:2727` |
| `qaModerate` | `{id, state}` | `server.js:2351` |
| `qaVote` | `{id, votes}` | `server.js:2852` |
| `qaPin` | `{id}` or `{id:null}` | `server.js:2361` |
| `signal` | `{kind, slideId, title, n}` (no player) | `server.js:2822` |
| `end` | `{reason}` | `server.js:1424` |

Not journalled: reactions, `away`, bookmarks, `wrote`, `floor`, blanking, `at`, `idle`, `finish`, `raceLanes`, `guesser`, individual sprint taps.

`Sessions.project` (`sessions.js:80-275`) builds the report from these. It reads `question`, `answer`, `manualAnswer`, `sure`, `reveal`, `sprintEnd`, `oralCredit`, `prompt`, `reply`, the Q&A records, `signal`, `oral`, the roster records and `end`. It does not read `switch`, `showdown`, `closeAnswers`, `hintOut`, `manualTally` or `sprint`.

---

## 15. Window protocols

These are browser messages between same-origin windows, not socket messages. The host turns some of them into socket messages.

### 15.1 Teacher entry (`manual.html`, `js/manual.js`)

The host makes a 32-hex key and opens a `BroadcastChannel` named `sf-manual-<key>` (`live.js:103-110`). The entry page is loaded as `manual.html#<key>`, in the in-app dialog iframe (`#teachFrame`, `live.js:127-132`), popped out as a window, or as the desk's `#teacherWorkspace` iframe (via `teacherUrl` in `sf-presenter-state`).

Routes:

| Direction | Route | Where |
|---|---|---|
| Entry → host | `BroadcastChannel('sf-manual-<key>')` when the hash is a valid key; otherwise `window.opener.postMessage(m, origin)`. One route, never both. | `js/manual.js:5`, `18-21` |
| Host → entry | `postMessage` to the popped window (if open) and the channel | `live.js:99-101`, `316-317`, `1221-1222` |
| Host listens | Channel `onmessage` and `window` `message` from `manualWindow` with the same origin. Commands are de-duplicated by `id` (last 60). | `live.js:107`, `338-345`, `791-793` |
| Key change | The entry page rebinds its channel on `hashchange` and sends `hello` | `js/manual.js:846-855` |
| Storage | `localStorage` `sf-teacher-notes-<key>` and a `storage` listener sync notes between entry windows. `sessionStorage` `sf-entry-draft-<key>` keeps typed names. Neither reaches the host. | `js/manual.js:819-822`, `8`, `22-28` |

Messages:

| `type` | Dir | Payload | Host does | Where |
|---|---|---|---|---|
| `sf-manual-command` | entry→host | `action`, `id` (`m<seq>-<startedAt>`), plus per action below | See next table | `js/manual.js:18-21`; `live.js:338-412` |
| `sf-manual-state` | host→entry | `active`, `showing`, `live`, `view`, `report`, `players`, `teams`, `mode`, `pin`, `recipient`, `pendingVerdict {choice, label}`, `recentSpeakers`, `handCounts`, `proposals`, `onTable`, `lastCredit`, `oralCount`, `question {id, question, input, options, gaps, bins, spoken, scoreSpoken, style, range, revealed}`, `answers [{id, response, sure, right}]` (`right` only after the reveal) | Sent after every relay message the host handles (`ws.onmessage` calls `syncManual`) and after local changes | `live.js:72-102`, `1069-1074` |
| `sf-manual-error` | host→entry | `message`; from `manualError` also `playerId`, `id` | Shown on the row (if `playerId` and `id` match the question) or as a page error | `live.js:315-318`, `1219-1223`; `js/manual.js:830-835` |
| `sf-teacher-view` | desk→entry iframe | `view` (`roster`\|`mark`\|`questions`\|`overview`\|`tools`) | Entry shows that pane; `questions` and `overview` send `report` | `presenter.html:955`; `js/manual.js:322-328` |

`sf-manual-command` actions:

| `action` | Extra fields | Host turns it into | Where |
|---|---|---|---|
| `hello` | | `syncManual()` and socket `report` | `live.js:346` |
| `host` | `force` | Starts a room from the desk (`Live.host`) | `live.js:347`, `321-333` |
| `add` | `names`, `team` | `manualAdd` | `live.js:348` |
| `rename` | `playerId`, `name` | `manualRename` | `live.js:349` |
| `team` | `playerId`, `team` | `manualTeam` | `live.js:350` |
| `kick` / `delete` | `playerId` | `manualRemove` `mode:'kick'` / `'delete'` | `live.js:351-352` |
| `answer` | `answer {id, playerId, choice\|text\|value\|order\|fill\|sort, clear}` | `manualAnswer` | `live.js:353`; `js/manual.js:234-238` |
| `recipient` | `recipient {type, id}` | Sets the speaker; Heads Up sends `guesser`; completes a held verdict (which reveals) | `live.js:354-372` |
| `verdictRoom` | | Completes a held verdict with no recipient | `live.js:374-381` |
| `verdictCancel` | | Drops the held verdict. Handled but no sender found. | `live.js:382` |
| `tally` | `counts` | `manualTally` | `live.js:383-390` |
| `useProposal` | `pid`, `text` | Puts a proposal on the table (local only) | `live.js:391-408` |
| `reveal` | | `revealNow()` → `reveal` | `live.js:409` |
| `revealWith` | `choice` | Moves the run's answer to that option, then reveals (spoken: the verdict) | `live.js:410`, `766-790` |
| `report` | | socket `report` | `live.js:411` |

### 15.2 Presenter desk (`presenter.html`)

The wall is `src/presenter/window.js` (built into `js/model.js`) and `js/player.js`.

Routes:

| Direction | Route | Where |
|---|---|---|
| Desk → wall | `window.opener.postMessage(msg, origin)` if there is an opener, else `BroadcastChannel('slideforge.presenter.v1')`. One route. Every command carries an `id` (`<startedAt>-<seq>`). | `presenter.html:628-637`, `722` |
| Wall listens | `window` `message` from `presenterWin` (same origin) and the channel. De-duplicated by `id` (last 60). | `src/presenter/window.js:44-55`, `374-381`, `436-441` |
| Wall → desk | `postPresenter`: a broadcast goes to `presenterWin` and the channel; a reply goes only to the window that asked | `src/presenter/window.js:57-95` |

Messages:

| `type` | Dir | Payload | Where |
|---|---|---|---|
| `sf-presenter-cmd` | desk→wall | `cmd`, `id`, extra fields per command (below) | `presenter.html:651-653`; `js/presenter-live.js:19`, `111`; `js/presenter-activities.js:44`; handled `src/presenter/window.js:383-431` |
| `sf-presenter-cmd` `cmd:'who'` | wall→desk | none. Posted with target origin `'*'`. | `js/player.js:216`; `presenter.html:1183` |
| `sf-presenter-state` | wall→desk | Full desk state: `teacherUrl`, `requestedPanel`, `moment`, `quizGenBusy`, `quickPoll`, `roomPulse`, `ask`, `deck`, `index`, `lessonIndex`, `spontaneous`, `answers`, board snapshot, `chainLinks`, `chainPending`, `startedAt`, `qa`, `pace`, `confidence`, `exploreStates`, `nextAction`, `progress`, `revealStep`, `effectiveTimeLimit`, `waiting`, `frozen`, `blank`, `blankWhite`, `live`, `pin`, `joinUrl`, `reactions`, `phonesBlank`, `blankSoonAt`, `away`, `needsHand`, `stage`, `reading`, `gameControls`, `floor`, `roomView` (`hidden`\|`beside`\|`full`), `inkOn`, `inkMode`, `wallOverlay`, `wallRail` (HTML), `focusOn`, `focusKind`, `pollOpen`, `joinCard`, `fullscreen` | `src/presenter/window.js:233-368`; `presenter.html:1317-1364` |
| `sf-presenter-wait` | wall→desk | `text` | `src/presenter/window.js:182-186`; `presenter.html:1185-1188` |
| `sf-share-prep` | wall→desk (reply) | `doc`, `live` | `src/presenter/window.js:410-424`; `presenter.html:1311-1316` |
| `sf-share-watch` | wall→desk (reply) | `ok`, `id` | `src/presenter/window.js:425-428` |
| `sf-activity-result` | wall→desk (reply) | `requestId`, `result` or `error` | `src/presenter/window.js:401-406`; `js/presenter-activities.js:67` |

`sf-presenter-cmd` commands the wall handles (`src/presenter/window.js:383-431`):

| `cmd` | Extra | Effect, and any socket message it causes |
|---|---|---|
| `goto` | `index` | `Player.goTo`, so `at`, and `question`/`idle`/`prompt` as for any slide |
| `hello` | | Wall re-sends `sf-presenter-state` |
| `ink` | `action` (`begin`, `move`, `end`, others) | Desk pen on the wall (`SF.Teaching.remote`); bare `ink` toggles the bar |
| board commands | `action`, `card` | `SF.Boards.command`; verdicts produce `oral` |
| `moment` | `action` (`start`, `pause`, `resume`, `extend`, `clear`), `kind`, `seconds`, `title` | Timers and breaks on the wall (`js/presenter-live.js:19-47`) |
| `quickPoll` | `action` (`start`, `end`, `where`, `join`), `kind`, `prompt`, `options`, `presentAs` | `prompt` / `promptEnd` (`js/presenter-live.js:111-168`) |
| `ask` | `action` (`show`, `close`, `spot`, `unspot`, `hide`, `unhide`), `key`, `sid` | `Live.askCommand` (`live.js:590`); `close` ends the prompt |
| `explore` | `action`, `value` | `SF.Explore.command` |
| `quizGen` | | `Player.quizGen` |
| `activity` | `action`, `requestId` | `SF.LiveActivities.handle`; reply `sf-activity-result` |
| `qa` | `action`, `id` | `Player.emit('qaCommand')` → `qaModerate` / `qaPin` |
| `gameControl` | `id` | `Player.pressGameControl` |
| `sharePrep` | | Reply `sf-share-prep` |
| `shareWatch` | `id` | `Live.watchOn` → `watchOn`; reply `sf-share-watch` |
| anything else | | `Player.control(cmd)`: `prev`, `next`, `rail`, `focus`, `join`, `share`, `poll`, `freeze`, `reactions` (→ `reactions`), `blankPhones` (→ `blankPhones`), `blankPhonesSoon` (→ `blankSoon`), `stageMore` (→ `at` with the longer stage), `floor` (→ `floor`), `reset`, `who`, `ink`, `blank`, `white`, `full`, `help`, `exit`, `presenter`, `teacher` (`js/player.js:181-223`) |

---

## 16. Other socket clients

| Client | What it is | Where |
|---|---|---|
| `tools/audience.js` | A simulated class: joins N phones and answers, replies, asks and signals using the phone protocol | `tools/audience.js:1-28` |
| `tools/smoke/live-quiz.mjs`, `tests/harness.js` | Smoke scenario and test harness (real server, real sockets) | |
| `js/demo.js` | Rehearsal class. It does not open a socket; it feeds the wall directly. | `js/demo.js:1-2` |

---

## 17. What a lab host must send to be indistinguishable

The minimum for one multiple-choice question, individual mode, from an empty room to the reveal. Message order is what `js/live.js` produces. "Expect" lists what the relay sends back.

| # | Host sends | Expect |
|---|---|---|
| 1 | `{t:'host', title, mode:'individual', teams:[]}` as the socket's first message | `hosted` (keep `session.token` for Reports and `hostToken` + `pin` in `sessionStorage` `slideforge.hostedRoom` for reload) |
| 2 | (phones join) | `players`, `bookmarks` per arrival; `recording` per journal write |
| 3 | `{t:'begin'}` | phones get `begun`; `recording` |
| 4 | `{t:'round', gameId}` on the first slide of the game | `roundOpen` to phones, `players` |
| 5 | `{t:'at', slideId, title, n, total, activity:'question', text, step:0, style, role, participation, headPrompt, stage:null}` | phones get `context` and `floor`; host gets `bookmarks` |
| 6 | `{t:'promptEnd'}` only if a prompt was open | |
| 7 | `{t:'question', id, n, total, question, input:'choice', options (2-6), timeLimit, points, confidence:true, voteOnly:false, unmarked:false, sourceSlideId, spoken:false, gameId, scoreSpoken:false, participation, range:null, style, headPrompt}` | `joinClosed` to phones and `players` (first question of the window), `recording`, `question` to phones, `tally` (rev 0) |
| 8 | (phones answer) | `tally` after each `answer` and `sure`, each with a higher `rev` and the full `answers` |
| 9 | When `tally.allIn && answered > 0 && !manual`: wait until `sured === answered` or 5 s, then reveal. Otherwise reveal on Next. | |
| 10 | `{t:'reveal', id, rev:<last tally rev>, marks:[[playerId, right], ...] for every answer in that tally, correct:<index>, answer:<option text>, explanation}` | phones get `result`; host gets `teamAnswers`, `recording`, `players`, `tally` |
| 10a | If `markStale` comes back: mark its `answers` and send `reveal` again with its `rev` | as 10 |
| 11 | Next slide: `{t:'at', ... activity:'content'}` (or `moment` if staying on the revealed question), then `{t:'idle', style, role, participation, headPrompt}` | phase `idle`, join window reopens, waiting phones admitted |

Also needed for parity, even in this minimal case:

- Re-send `at` on every build step and stage change (`live.js:2890-2894`, `2914-2918`).
- Hold the reveal when any teacher-entered row is in the room (no auto-reveal), and pass `timeLimit` from `SF.questionTimeLimit(s, hasManual)`.
- Relay `sf-manual-command` actions to `manual*` messages and answer each relay message with `sf-manual-state`, so the entry window keeps working.
- Send `end`, then close the socket about 1.5 s later so `sessionClosed` arrives.

---

## 18. Open questions

1. **Phone resume after a silent drop.** The relay has no keep-alive. If a phone's network drops without a close frame, its old socket stays "open" and a resume is refused with "You are already connected in another tab." until TCP gives up (`server.js:2577`). Is this seen in class? The lab cannot fix it under rule 5.
2. **Resume during a sprint.** A phone that rejoins in phase `sprint` gets `joined` and `context` but no `sprintQ`; `sendSprintQuestion` is not called on resume (`server.js:2583-2598`). It sits on the wait screen until `sprintOver`.
3. **Resume loses mid-question state.** A rejoining phone is not re-sent `showdown`, `answersClosed`, `hintOut` or its `sure`, and a resume does not send `qaList` (only a fresh join does, `server.js:2691`). Recordings should capture what the classic host does here so the lab can match it.
4. **Showdown switches are not in the report.** `switch` is journalled but `Sessions.project` ignores it, so the report shows the first answer (`server/sessions.js:80-140`). The relay's reveal marks the switched answer. Which does the lab report trust?
5. **Dead or unused messages.** The host handles `scores`, which nothing sends (`live.js:1256`). The relay sends `room` (probe), `joinClosed` and `watchState`, which no client handles. The entry action `verdictCancel` has a handler and no sender. Should the lab host replicate the gaps exactly, or is "ignores them" enough for the replay tests?
6. **Join window rule.** The window reopens on any non-question `at`, not only on `round` (`server.js:2422-2428`). Is that the intended behaviour, or a side effect the lab should keep only because the relay does it?
7. **Optimistic lock on the phone.** The phone locks its pad before `locked` arrives. A silently dropped answer (late, invalid, closed) leaves it looking locked. Not a lab concern, but the replay fixtures should include a late answer to show it.
8. **`sprintA` has no sprint id.** A late tap from one sprint could land in the next if they overlap (`server.js:2883-2886`). Only matters if a deck has two speed games back to back.
9. **Host reload during a question.** `Live.resumeHeldRoom` clears `Live.revealed` and the host gets `rehosted` and `players` but no `tally` until something changes (`live.js:925-934`, `server.js:1538`). Revealing straight after a reload sends `rev:0` and will draw `markStale`. Is that recovery path acceptable for the lab, or should the lab host ask for state some other way within the existing protocol?
10. **Target origin `'*'`.** The wall posts `cmd:'who'` to the desk with `'*'` (`js/player.js:216`); everything else uses the page origin. Harmless today, but worth knowing before the lab presenter copies it.
11. **Extra fields on `prompt`.** The host sends `presentAs`, `hold`, `custom`, `origin`, `stage` and `quiet`; the relay drops them. The lab can omit them on the wire, but replay comparison will need to ignore them or the lab must send them too.
