# Fixing what the CS review found

On 10 November 2026, twenty reviewers each read one part of the Claude Slides work (CS-01 to CS-19). Each checked its part against the official docs for what it uses: MDN, WCAG 2.2, Supabase, PostgREST, Node, immer, React, zustand, Lucide and the PDF spec. Their verdict: **the design is sound, but the failure paths and edges are thin, and the tests mostly cover the paths that work.** This plan fixes everything they found that holds up.

Each item has an ID (CR-), the place in the code, the fix, and the test that keeps it fixed. ✓ means the claim was checked in the code; the others are the reviewer's report, to be confirmed by a failing test before the fix.

## How the work is done

- **Eight batches, in this order.** Each is one code commit with its tests, then one docs commit. Batches 1 to 4 are what a teacher would hit; 5 and 6 are sharing; 7 is speed; 8 is tidying.
- **A failing test first.** Every bug gets a test that fails on today's code and passes after the fix. A claim that can't be made to fail is dropped, and this doc says so.
- **Checks after each batch:** `npm test`, `npm --prefix lab test`, `npm --prefix lab run build:app`. Run `node tools/smoke/run.mjs` where the show or the viewer changed.
- **Decisions are in section 9.** Those items wait for an answer. The rest go ahead.

## 1. Saving (batch 1)

| ID | What breaks | Where | Fix | Test |
|---|---|---|---|---|
| CR-01 ✓ · fixed `0e0639a4` | A lesson with a picture can't be saved on a plain-http address (`http://192.168.x.x:8787`): `crypto.subtle` exists only on secure pages, and nothing checks | `lab/src/app/pictureStore.ts:58` | Without `crypto.subtle`, keep pictures inline (the old format, which `restore` already reads) | The store with no `crypto.subtle`: it saves and reads back |
| CR-02 ✓ · fixed `0e0639a4` | A full browser storage hangs every later save, with no message: the write helpers never listen for `abort` | `lab/src/core/idb.ts` (`idbSet`, `idbSetMany`, `idbDelete`) | `tx.onabort = () => reject(tx.error ?? new DOMException('aborted'))` on every write | A fake transaction that aborts: the promise rejects, and the next save still runs |
| CR-03 · fixed `0e0639a4` | A new connection is opened on every call and never closed. Nothing handles `onversionchange`, so a future upgrade would be blocked | `idb.ts:5` | One cached connection, `db.onversionchange = () => db.close()`, and a lesson's pictures read in one transaction | Read many pictures with one open |
| CR-04 ✓ · fixed `0e0639a4` | A lesson saved by a newer studio is still repaired, refitted and autosaved over, despite the warning | `lab/src/store/store.ts:177`, `App.tsx` autosave | When `up.newer`, skip `repairGames` and `refitAllText`, and don't autosave while `deckTooNew` is set | Load a v99 deck: nothing is changed or saved |
| CR-05 · fixed `0e0639a4` | A version written as `"3"` or `2.5` is read as v1 and stamped current, which is the downgrade CS-12 meant to stop | `lab/src/core/version.ts:20` | `Number()` the stamp. If it is present but invalid, treat the deck as unknown: warn, and don't upgrade | `"3"` counts as newer, `"x"` as unknown |
| CR-06 · fixed `0e0639a4` | Builders still write `version: 1` | `defaults.ts`, `fromSlideForge.ts`, `ukbtDeck.ts`, `nulDeck.ts`, `motionLab.ts`, `layouts/style.ts` | Use `DECK_VERSION` | A test that every builder's deck is current |
| CR-07 · fixed `0e0639a4` | The share viewer never upgrades a deck. That is harmless today, but online shares last, so the first real upgrade step would miss them | `lab/src/viewer/state.ts:43` | `upgradeDeck` at the top of `sharedDeck` | A v1 share comes out current |

## 2. Slides and connectors (batch 2)

| ID | What breaks | Where | Fix | Test |
|---|---|---|---|---|
| CR-08 ✓ · fixed `959e80c9` | Duplicating a slide, or inserting one from the Gallery, breaks its connectors: the copy gets new layer ids, but `from`/`to` still name the old ones | `lab/src/core/defaults.ts:63` `cloneSlide` | Map old ids to new and rewrite `from`/`to`. Do the same when several layers are copied together | Duplicate a slide with a connector: it is not lost |
| CR-09 · fixed `959e80c9` | Double-clicking a connector opens a text editor showing raw layer ids, and typing there breaks the join | `kinds/connector/def.ts:9` (`type: 'text'`), `CanvasEditors.tsx` `wordFields` | Give `from`/`to` a type of their own, or the `_hidden` group, so they aren't treated as words | `wordFields(connector)` is empty |
| CR-10 · fixed `959e80c9` | A hidden layer still gets a line, drawn to empty space | `lab/src/core/connectors.ts:50` | Count a hidden end as lost | Hide one end: the connector is marked lost |
| CR-11 · fixed `959e80c9` | Rotation is ignored: the line ends on the unrotated edge | `connectors.ts:15` | Use the rotated box's bounding box | A 45° box: the end is on its bounding edge |
| CR-12 · no change needed `959e80c9` | An imported deck draws its connectors in one place, but selects and wipes them from their old box until the first edit | `store.ts` `loadDeck` | Run `syncConnectors` inside `loadDeck` | Load a deck with a stale connector box: the box is current |
| CR-13 · fixed `959e80c9` | The "lost" rule is written twice (store and drawing) | `kinds/connector/raster.ts:23`, `connectors.ts:50` | One `joined(slide, layer)` in `core/connectors.ts`, used by both | Existing tests |

## 3. Lesson files and icons (batch 3)

| ID | What breaks | Where | Fix | Test |
|---|---|---|---|---|
| CR-14 ✓ · fixed `638f9f05` | `"layout": "constructor"` (or `toString`, `__proto__`) crashes the import with "spec.needs is not iterable" | `lab/src/decks/lessonFormat.ts:79` | `Object.hasOwn(LESSON_LAYOUTS, …)` | Those names give the "must be one of" message |
| CR-15 ✓ · fixed `638f9f05` | An icon named `constructor` crashes the drawing (`hasIcon` returns true, then the loop throws) | `lab/src/kinds/icon/draw.ts:11,18` | `Object.hasOwn(SET.icons, name)` | `hasIcon('constructor') === false`, and it draws the fallback |
| CR-16 · fixed `638f9f05` | A seventh term in a `keywords` slide is dropped without a word | `lessonFormat.ts:96`, `layouts/system.ts:93` | Limit `terms` to 1–6, and say so in `docs/lesson-format.md` | Seven terms gives a problem |
| CR-17 · fixed `638f9f05` | A file whose `format` is slightly wrong (`slideforge-lesson/v1`, or missing) is loaded as a broken deck | `js/shell.js:1142` | Send any object whose `slides[0].layout` is a string to `importLesson`, which then says what is wrong with `format` | Shell routing test |
| CR-18 · fixed `638f9f05` | When the lesson reader or the quiz starter fails, the teacher only sees "The lesson could not be built" | `lab/src/app/embed.ts:481-483` | Move both inside the `try`, and say the reason | Starter import that fails: the reason is shown |
| CR-19 · fixed `638f9f05` | A slide id `check-2` collides with a quiz's own built ids, and nothing reports it | `lessonFormat.ts:152`, `fromLesson.ts:95` | Reserve `${id}-${n}` for quiz slides | A collision gives a problem |
| CR-20 · fixed `638f9f05` | AGENTS.md says `factCheck: { note }`, but the lesson file takes a string | `AGENTS.md:23` | Write the lesson file's form, and say the deck stores `{ note }` | (docs) |
| CR-21 · fixed `638f9f05` | One unknown icon name rejects the whole lesson. AI writers use older Lucide names (`home`, `alert-triangle`, `help-circle`) | `lessonFormat.ts:104`, `tools/lab-icons.mjs` | The tool writes an `aliases` map from lucide's alias files. A name that is still unknown is a warning, and draws the fallback | `home` gives `house`; an unknown name imports with a warning. **Decision D3** |
| CR-22 · fixed `638f9f05` | `polyline` and `polygon` aren't drawn, so adding `inbox` or `package` would draw part of a blank icon | `draw.ts:28`, `lab-icons.mjs:42` | The tool fails on any tag it can't draw, and polyline/polygon are drawn with `moveTo`/`lineTo` | A polyline icon draws |
| CR-23 · fixed `638f9f05` | Filled dots (`chart-scatter`) draw as rings at the lowest weight | `draw.ts:31` | `ctx.fill()` when the element has a fill | (visual) |
| CR-24 · fixed `638f9f05` | The licence notices aren't shipped. About 20 of the 117 icons are Feather (MIT) as well as Lucide (ISC), and both notices must be in all copies | `tools/lab-icons.mjs:31`, `lab-app/` | Copy both notices into `icons.json`, and ship a `NOTICE` in `lab-app/`. Record the lucide version in `source` | The tool's output includes both |

## 4. The show, widgets and the design check (batch 4)

| ID | What breaks | Where | Fix | Test |
|---|---|---|---|---|
| CR-25 ✓ | The widget comment, its tab and its description say it "cannot reach the internet". It can: it may load another page in its own frame, and that page has no content policy | `lab/src/engine/widget.ts:1-5`, `kinds/widget/Inspector.tsx:16`, `def.ts:6`, `docs/lesson-format.md` | Say what is true. What else to do is **decision D1** | (copy) |
| CR-26 | Once the teacher clicks inside a widget, the clicker and arrow keys stop working until they click the slide | `lab/src/show/Show.tsx:423` | `widgetDoc` forwards the navigation keys with `parent.postMessage`. The show accepts them only when `ev.source` is that frame's window | Try it in the show by hand. A unit test for the message filter |
| CR-27 | Try It rebuilds the widget on every keystroke, so a half-typed `while(true){` can freeze the editor | `kinds/widget/Inspector.tsx:18,48` | Debounce it by 600 ms, plus a Run button | (by hand) |
| CR-28 | A pasted page of several MB is kept in the deck, the undo history and shares. Only running it is refused | Widget inspector, `lessonFormat.ts` | Refuse more than 4 × `WIDGET_MAX` at input | Paste too much: refused, with a message |
| CR-29 | A back-face layer, and a layer still waiting for its click, are framed live at slide entry | `lab/src/engine/web.ts:24` | `webContent` takes the show's flipped/built state, and skips layers that aren't showing yet | Back face and an unbuilt step give null |
| CR-30 | A rotated video or widget is framed upright over its rotated still | `Show.tsx:520` | `transform: rotate(${b.rot}deg)` on the frame | (smoke) |
| CR-31 ✓ | The design check rounds contrast before comparing, so 4.49:1 passes | `lab/src/theme/combos.ts:26`, `palettes.ts`, `gradeOf` | Compare the exact ratio, and round only for display | `#008580` on white fails at 4.5 |
| CR-32 | A note's own panel, or a text block, is ignored, so a default note on a dark slide gets a false contrast warning | `lab/src/designs/designCheck.ts:29` | The layer's own panel or block (opacity ≥ 0.9) is its ground first | A default note on a dark slide: no warning |
| CR-33 | Back-face layers count as ground for front text. A non-normal blend, or opacity under 0.9, gives a confident wrong answer | `designCheck.ts:31-35` | Look only at the same face, and say nothing for a non-normal blend or low opacity | One case each |
| CR-34 | The 44px "large text" size is labelled WCAG, but WCAG's large text is 24px (or 18.67px bold) | `designCheck.ts:4,11` | Call it a projection rule, stricter than WCAG on purpose | (comment) |
| CR-35 | Colours that aren't 6-digit hex (`#abc`, `rgb()`, named), and outline-only shapes, quietly stop the check | `designCheck.ts` | Turn colours into hex, and look past a shape with no fill | One case each |
| CR-36 ✓ | "Facts to check" stays in Status after every fact is fixed | `lab/src/app/factsWarning.ts:30` | Clear the row (report it as done) when the list is empty | A fixed deck clears the row |
| CR-37 | The placeholder pattern matches code (`[__init__]`, `df["__x"]`) and reads every param, URLs and game data included | `lab/src/core/facts.ts:12` | Need a space or the bracket before `__`, cap it at `_{2,60}`, and read only text params | A code slide gives no hits |
| CR-38 | A malformed `factCheck` (`{}`) in a deck file crashes the filmstrip | `facts.ts:40`, `Filmstrip.tsx:164` | Read the note only when it is a string | `factCheck: {}` gives null |
| CR-39 | The not-yet-checked checkbox and its note have no accessible names, and `aria-label` on the role-less badges isn't read | `inspectorSlide.tsx:87`, `Filmstrip.tsx` | Give the inputs `aria-label`, and the badges `role="img"` and a label | (a11y check) |
| CR-40 | The opening notice can be replaced within 7 s by another `say()` | `Show.tsx` | Hold the opening notice for its time, then show the next one | (smoke) |

## 5. Sharing: the relay server (batch 5)

| ID | What breaks | Where | Fix | Test |
|---|---|---|---|---|
| CR-41 ✓ | "That picture is over 8 MB" never reaches the teacher, because `req.destroy()` comes before the reply, so they see "Failed to fetch". The same pattern is at 211 and 591 | `server/server.js:287` | Send the 413 with `Connection: close`, then `req.resume()` | The test asserts 413 and its words (today it accepts a crash) |
| CR-42 | The key and `n` are checked only after up to 8 MB has been read | `server.js:285` | Check `shareWithKey`, `n` and `Content-Length` before reading the body | A bad key with a large body gets 403 fast |
| CR-43 | The 100 MB-per-share check races, and blocks: `readdirSync` and `statSync` run on every PUT | `server.js:304` | Keep a running total in the share's record | Parallel PUTs can't pass 100 MB |
| CR-44 | A refused share still evicts another share, because pruning runs before the over-600 check. One client can push every teacher's share off the shelf | `server.js:227-239` | Validate before pruning, and cap the shelf's total bytes | A refused share leaves the shelf as it was |
| CR-45 | Pictures come back as base64 in JSON, marked `no-store`, so every view downloads them all again | `server.js:323` | Send the bytes with their own type and `Cache-Control: public, max-age=31536000, immutable`. The viewer then uses the URL as the picture source | GET returns `image/*` |
| CR-46 | Any data type is accepted, `data:text/html` included | `server.js:302` | Accept `image/*` only | `text/html` is refused |
| CR-47 | Dead code and wrong comments: `Math.min(…, SHARE_PICS)`, the count kept twice, and "nobody has opened in a month" | `server.js:236` and others | Remove them, and keep one count | Existing tests |
| CR-48 | Shares on Render's local disk are lost at every deploy or restart | `render.yaml` | **Decision D2** | — |

## 6. Sharing: the client, the viewer and Supabase (batch 6)

| ID | What breaks | Where | Fix | Test |
|---|---|---|---|---|
| CR-49 | A failed share can leave a copy online that the teacher can't withdraw: the clean-up delete isn't checked, and the key is saved only on success | `js/share.js:99,118,200` | Save `{id, key}` before the pictures go up. Drop it only when the delete succeeds, and say if a copy was left | Stub a failing picture, then a failing delete: the share is still listed |
| CR-50 | One dropped request among 40 pictures throws the whole share away | `share.js:84` | Retry each picture twice, with a wait, two at a time | A stub that fails once: the share completes |
| CR-51 | More than 600 pictures is found only on picture 601, after 600 uploads | `js/lab-engine.js:1030` | Check the count before the first upload | 601 pictures gives a clear refusal |
| CR-52 | A network failure doesn't say which picture failed | `share.js:116` | Add "picture k of n" in each picture's `catch` | — |
| CR-53 | Supabase has no size limit on a picture, a lesson or a title, and any data type is accepted | `supabase/migrations/` | New `0004_share_limits.sql` with `alter table … add constraint`: `data ~ '^data:image/'`, `octet_length(data) <= 8000000`, a cap on `doc`, and `char_length(title) <= 200` | (SQL, run by hand) |
| CR-54 | The RLS policies don't follow Supabase's advice: no `to authenticated`, and `auth.uid()` and `is_teacher()` aren't wrapped in `(select …)`. Also `search_path = public`, not `''`; anon can execute `is_teacher()`; and `share_id` is unqualified | 0002, 0003 | The same `0004` recreates the policies and functions the advised way | (SQL) |
| CR-55 | `is_teacher()` trusts the email claim (safe only while every sign-in proves the address), and matches the domain with `like` | `0001` | Require `email_verified`, and compare with `split_part(email,'@',2) = domain` | (SQL) |
| CR-56 | Nothing tests the SQL | — | A `supabase/tests/shares.sql` script, run by hand in the SQL editor, that checks each rule as anon, as a teacher and as another teacher | — |
| CR-57 | The viewer trusts the share's own picture count, so a count of `1e8` means 1e8 fetches | `lab/src/viewer/state.ts:127` | Cap the count at 600, or use the count the relay returns | `1e8` gives at most 600 |
| CR-58 | A picture that fails shows as a blank image, with no word to the student. A reference past the count becomes a request for `/@picture:7` | `viewer/page.ts:57`, `core/pictures.ts:33` | One line in the viewer's bar, and empty any reference with no picture | `withPictures` with a missing picture |
| CR-59 | Pasting a slide link into a tab that already has the share open doesn't move the slide | `viewer/page.ts:149` | Listen for `hashchange` (not in follow mode) | (smoke) |
| CR-60 | `cloud.ts` fetches its settings twice, caches a failed fetch forever, and retries each picture's 401 separately | `lab/src/viewer/cloud.ts` | One `project()`, cleared when it fails, and one `rpc()` helper that drops a refused token after the first 401 | `cloudPicture` tests, with the stubs restored |
| CR-61 | Signed-out reads send the anon key as a Bearer token. That works only while the project uses a legacy anon key, and those are deprecated by the end of 2026 | `cloud.ts:35,64` | Without a token, send no `Authorization` header | Signed out: no header |
| CR-62 | A signed-in teacher whose token has expired (after an hour away) is told to sign in | `cloud.ts:17`, `page.ts:38` | Change the words to "Open SlideForge, then this link again" | — |
| CR-63 | Any stored Supabase session can be picked | `cloud.ts:13` | Build the exact key from `cfg.url` | Two sessions: the right one is used |

## 7. Speed (batch 7)

| ID | What breaks | Where | Fix | Test |
|---|---|---|---|---|
| CR-64 | The lesson's text-size count re-measures every text layer on every slide at every keystroke, which is slow on 100+ slide decks | `inspectorSlide.tsx` DesignNote, `designCheck.ts` | Cache the sizes per slide in a `WeakMap` (immer keeps unchanged slides as the same objects), and fix the memo's dependencies | Unchanged slides aren't measured again |
| CR-65 | Every keystroke redraws every connector on the slide | `lab/src/engine/renderer.ts:184` | A kind returns what it depends on, the two joined boxes, by reference | Edit another layer: no redraw |
| CR-66 | `syncConnectors` reads the whole deck through immer's drafts on every change, which is about 1.5 ms per pointer move on a 150-slide deck | `store.ts:144`, `connectors.ts` | Search `original(draft)`, and skip slides with no connector | Time it before and after |
| CR-67 | Every slide's facts and limits are worked out again on every edit | `Filmstrip.tsx` | `memo` on the badges, keyed on the slide | — |
| CR-68 | The PDF draws hidden slides it then leaves out, and its flip-side pages show no progress | `lab/src/app/embed.ts:499` | Render only the pages it uses, and turn each into bytes as it goes | — |
| CR-69 | Icon tiles don't redraw when the app's light/dark theme changes | `kinds/icon/IconTile.tsx` | Redraw on a theme change | — |

## 8. Tidying: one rule in one place, and comments that are true (batch 8)

| ID | What | Where | Fix |
|---|---|---|---|
| CR-70 ✓ | The warnings still say "A shared lesson carries 7.5 MB in all" | `lab/src/core/limits.ts:5,14,50` | New words, and thresholds taken from one exported share-limits constant |
| CR-71 | The widget limit is written three times, and the video limit two ways (60 MB, against a 2 MB warning) | `limits.ts:37`, `lessonFormat.ts:108`, `insert.ts:12`, `inspectorDesign.tsx:250` | Import `WIDGET_MAX`, and keep one media limit |
| CR-72 | The SVG limit measures the encoded address, not the drawing | `limits.ts:49` | Measure decoded bytes (base64 × 3/4, or the decoded URI) |
| CR-73 | `needs.ts` repeats a video regex, and reads only the top-level `src` | `lab/src/core/needs.ts:18` | `webContent(l)?.kind === 'frame'`, and walk the params as `limits.ts` does |
| CR-74 | The handout pages are built twice, and the file name is made with its own copy of `slug` | `embed.ts:437,491,498` | One `handoutImages()`, and import `slug` |
| CR-75 | The "joinable layer" rule is written twice | `kinds/connector/Inspector.tsx:9`, `ui/stage/insert.ts` | Export it from `core/connectors.ts` |
| CR-76 | Comments that no longer match the code | `connectors.ts:4-6`, `pictureStore.ts:63`, `core/pictures.ts:3`, `lab-icons.mjs:8` (a test file that doesn't exist), `engine/web.ts` | Correct each one |
| CR-77 | Tests that can't fail: constants checked against themselves, and messages reading "0 KB, over 0 KB" | `limits.test.ts:26,33`, `widget.test.ts:11`, `web-layers.test.ts:35` | Replace them with real cases at real sizes |
| CR-78 | The cloud tests replace `fetch` and `localStorage` and never put them back | `lab/tests/viewer-cloud.test.ts` | `t.mock.method`, and set storage in each test |
| CR-79 | The Send to… label promises Drive, Teams and Mail on desktops where it can only download | `js/shell.js:1290` | "Send to… (share or download)" |
| CR-80 | The PDF writes a non-JPEG as JPEG, so the file won't open. Non-ASCII titles lose their letters | `lab/src/export/pdf.ts:32,53` | Refuse a page that isn't a JPEG, with a message, and write the title as UTF-16BE | One case each |
| CR-81 | The picture sweep runs once a minute after opening, and deleting a lesson doesn't sweep | `embed.ts:51,386` | Sweep after `remove` too | — |
| CR-82 | Minor duplications: `allowFullScreen` is given beside `allow="fullscreen"`, and `media.ts` and `web.ts` check `visible` differently | `Show.tsx:524`, `media.ts:109,140` | Keep one of each |

## 9. Decisions for Mark

- **D1, the widget and the internet (CR-25).** Recommended: **(a) say what is true, and ask before running a widget from a lesson someone else made.** The other choices: (b) serve widgets from a second address with a header content policy, which is truly offline but needs a second host on Render; (c) Chrome's iframe `csp` attribute, which works in Chrome only.
- **D2, shares on the relay's disk (CR-48).** Recommended: **(a) leave the relay as the quick, short-lived share, say so where the link is made, and keep lasting shares in the account (Supabase).** The other choice: (b) a paid Render disk.
- **D3, unknown icon names (CR-21).** Recommended: **resolve aliases, and let any other unknown name import with a warning and the fallback square,** rather than rejecting the lesson.

## 10. What the reviewers found sound (left as it is)

- **Widget isolation:** scripts only, with no same origin, so it can't reach the sign-in, storage or the lesson.
- **The viewer:** no `innerHTML`, and the id and slide number are checked strictly.
- **Supabase:** the access model is right. Nobody can list shares, private stays private, and no teacher can write to another's share.
- **immer:** used correctly. Changes are written only when something differs, and undo carries the connector with the move.
- **The deck-version design** (ordered steps, run once), and its test that every version has its step.
- **The PDF writer** follows ISO 32000-1, and the WCAG luminance formula is exact.
- **Web layers:** the old per-kind code in the show is really gone.
- **Lesson file:** its doc matches the code, and the icon list matches the set.

## Change log

- **10 November 2026, batch 3 done (`638f9f05`).** CR-14 to CR-24, with D3 as recommended. Each new test failed on the code before the fix. CR-17 was checked in SlideForge: a file with `"format": "slideforge-lesson/v1"` now gets the lesson reader's problem list ("format must be…") and imports nothing, where before it would have opened as a deck with empty slides. Notes:
  - CR-21: `icons.json` now has an `aliases` map, which the tool builds from Lucide's own alias files (15 of them). `readLesson` now returns `warnings` as well as `problems`. They reach the teacher through Status, and through the shell's toast.
  - CR-22: the tool stops on any element the studio can't draw.
  - CR-24: the licence is in `icons.json` (`license`) and in `lab/public/icons-LICENSE.txt`, which ships in `lab-app/`.
  - CR-20: AGENTS.md now gives `factCheck` in both its forms.
- **10 November 2026, batch 2 done (`959e80c9`).** CR-08 to CR-11 and CR-13. Each new test failed on the code before the fix, and a duplicated slide was checked in the browser: its connector is drawn solid and joined, where before it was marked lost. Notes:
  - CR-08: copying now goes through `cloneLayers`, which re-links connectors. It is used for slides, the gallery, slide blocks and copied groups. A connector copied on its own keeps joining its old layers.
  - CR-09: a connector's ends are in the `_hidden` group, and `wordFields` skips that group.
  - CR-11: rotated layers use the bounding box of what is drawn (`shownBox`).
  - CR-13: the rules are in one place, `joinable` and `joinedPair`.
  - **CR-12 was not a bug.** `loadDeck` runs `refitAllText`, which already syncs connectors. A test now pins this.
  - The test build had been running some test files twice. A test using `await import()` split the build, and a shared chunk then imported other test files. Tests now load a document stand-in (`tests/dom-stand-in.ts`) with a normal import. The lab count went from 474 runs to 465 tests, each run once.
- **10 November 2026, batch 1 done (`0e0639a4`).** CR-01 to CR-07. Each new test failed on the code before the fix. On the old code, the storage-full write never settled, as the review said. Notes on how the fixes were done:
  - CR-01: on a page without SHA-256 the lesson is kept with its pictures inside.
  - CR-03: there is one connection per page, which closes on `versionchange`, and a new `idbGetMany` reads them.
  - CR-04: a lesson from a newer studio skips repair, theme pinning and refit. `saveCurrent` refuses to write it, with the reason shown in Status, and `persistDeck` skips it quietly so the shell can still open it.
  - CR-05: a stamp that can't be read is NaN and is treated as newer. A stamp written as text (`"3"`) is read as its number.
  - The lab's test build now bundles its packages (`ssr.noExternal`), so a test can load the store when the root's runner builds it into a temporary folder.
- **10 November 2026.** Written from the twenty reviews.
