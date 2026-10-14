# Data storage: saving lessons online

Status: plan, 12 October 2026. Step 1 is built (`js/docs.js`). Steps 2 to 4 are built and live locally (14 October). The project is **SlideForge** (`qarbniuzgfxoqixqjhdn`, London, free plan, organisation "urban teacher"), with the schema applied. Render's environment and the Auth redirect URLs wait on the owner.

## 1. The problem

Everything a teacher makes is saved only in the browser it was made in.

| What | Where it lives now | Survives |
|---|---|---|
| Classic-editor lessons and games | localStorage (`slideforge.decks.v1`, `slideforge.games.v1`), via `SF.Store` (`src/storage.js`) | That browser, until its data is cleared |
| Lesson-studio decks | IndexedDB `slideforge-studio`, keys `deck:<id>` and an index (`lab/src/persist/idb.ts`, `lab/src/embed.ts`) | The same |
| Pictures | Data URLs inside the deck (`fileToDataUrl` in `lab/src/ui/Inspector.tsx`, and `src/editor/artwork.js`, `deck-settings.js`, `header-footer.js`) | Wherever the deck is |
| Library folders | localStorage `slideforge.libraryFolders.v1` | That browser |
| Restore points | IndexedDB `slideforge` (`js/history.js`) | That browser |
| Share links | Server files in `SHARE_DIR`, up to 40, each up to 8 MB (`server/server.js`) | **Until the next deploy or restart** on Render's free plan |
| Live-session reports | Server journal files | The same |
| Built-in lessons (IPDV weeks, Air Pollution) | Written into the code (`js/lessons.js`, `js/lab-decks.js`, `lessons/`) | Everywhere, because they are code |

The built-in lessons look "online" only because they are hard-coded. A picture changed in the app is not on Render, and a lesson made on the laptop is not on a phone.

**Save to Library → another folder moves the lesson.** `saveToLibrary` sets `doc.libraryGroup` to the chosen folder; it does not copy it.

## 2. What Render offers

From [render.com/docs/free](https://render.com/docs/free) and [render.com/docs/disks](https://render.com/docs/disks):

- **The free web service** loses its files on every redeploy, restart and spin-down, can't attach a disk, and sleeps after 15 minutes without visitors (about a minute to wake).
- **Free Postgres** is 1 GB and expires 30 days after creation. It's deleted 14 days later unless upgraded, and has no backups.
- **Free Key Value** is in memory only.
- **A persistent disk** needs a paid service (Starter, about $7 a month, plus the disk).

There is no free way to keep data on Render. Render stays the host; the data goes to a provider built for it.

## 3. Supabase or AWS

| | Supabase (free plan) | AWS |
|---|---|---|
| What you get | Postgres (500 MB), file storage (1 GB, S3-compatible), sign-in (50,000 monthly users), all in one project | S3, Cognito and DynamoDB or RDS, wired together yourself or through Amplify |
| Free terms | Free indefinitely. A project pauses after **1 week without use**; a weekly ping prevents it. 2 active projects. No backups on free. | New accounts: the Free plan gives up to $200 of credits and **closes after 6 months** or when the credits run out ([aws.amazon.com/free](https://aws.amazon.com/free/)). After that, pay as you go. |
| Fit with this code | One script include and a public key. The browser talks to it directly, and Row Level Security keeps each teacher's rows private. Works from plain JS (classic) and React (Lesson studio) alike. | Needs IAM roles, a Cognito pool and signed S3 uploads. Amplify Gen 2 expects its own build and CDK stack, which this repo doesn't use. |
| Docs | Good, short, one place | The most thorough anywhere, but spread over many services, and much of it assumes AWS-hosted apps |
| Moving away later | Plain Postgres (dump and restore) and an S3-compatible bucket | Not applicable |
| UK data | London region (eu-west-2), with a DPA available | London region, with a DPA |

**Decision: Supabase.** AWS has better documentation for very large systems, but for this app it means more moving parts and a free period that ends. Supabase gives sign-in, a database and a bucket in one project, free, with an API the existing code can call from the browser.

The code still talks to storage through one adapter (step 1 of section 6). Because Supabase Storage speaks the S3 API, moving pictures to S3 or Cloudflare R2 later (R2: 10 GB free and free downloads) is a configuration change, not a rewrite.

### With our JavaScript

SlideForge has two kinds of front end: the Lesson studio (`lab/`: Vite 8, React 19, TypeScript), and the classic app (plain `<script>` tags, about 37 in `index.html`, with no bundler). Both have to save.

| | Supabase (`@supabase/supabase-js`) | AWS Amplify Gen 2 |
|---|---|---|
| Vite (Lesson studio) | `npm install @supabase/supabase-js`, then the URL and key come from `import.meta.env.VITE_SUPABASE_*` | Supported: the quickstart is React and Vite ([docs.amplify.aws](https://docs.amplify.aws/react/start/quickstart/)) |
| Plain scripts (classic app) | One `<script>` from jsDelivr, pinned to an exact version, which gives `window.supabase.createClient` | Not covered. It's npm imports and TypeScript only, so the classic app would need a bundler first |
| What else it brings | Nothing | An `amplify/` backend folder, `npx ampx sandbox` running beside `npm run dev`, AWS credentials with deploy permissions, and an `amplify_outputs.json` |
| Hosting | Any host, Render included | Built for Amplify Hosting or your own AWS account; other hosts aren't covered |

Vite works well with both. Only Supabase also works with the classic app as it stands, which is the deciding point.

## 4. How Render and Supabase connect

- **The browser talks to Supabase directly.** The project URL and its public "anon" key go into the page (they're public by design; Row Level Security is what protects data). Render serves the app as it does now.
- **Render's server needs Supabase only for shares and session reports.** It uses the service key, stored as a Render environment variable and never sent to a browser. Shares then survive deploys without a paid disk.
- **Locally,** the same two values sit in `.env` (git-ignored). Without them the app keeps working exactly as today, browser-only, so a laptop with no connection is never broken.

```
browser ──(sign-in, lessons, pictures)──► Supabase  (Postgres + Storage + Auth)
   │
   └──(live rooms, relay, AI)──► Render server ──(shares, reports; service key)──► Supabase
```

## 5. Hygiene of the current code

Ready:
- **Lesson studio saves through one place.** `persistDeck` and `saveCurrent` in `lab/src/embed.ts` are already async and serialised, so a cloud copy slots in beside IndexedDB.
- **The classic editor saves through one place** (`SF.Store` in `src/storage.js`), and most of the other ~30 localStorage keys are per-device preferences (zoom, panels, prompter size) that should stay local.
- **The server already has a hosted switch** (`SLIDEFORGE_HOSTED`) and a durable-share check (`shareIsDurable`).

Needs fixing first, whether or not we go online:
1. **`SF.Store` is synchronous** (`list()` and `get()` return values). A cloud store is asynchronous. Plan: keep localStorage as the instant local copy, and sync it in the background, so callers stay synchronous.
2. **Two libraries in two stores.** Classic decks are in localStorage, studio decks in IndexedDB, and the Library merges them as "cards" (`js/lab-engine.js`). Online, they become one `documents` table with a `kind` column.
3. **Pictures as data URLs.** They make decks megabytes each, hit the 8 MB share cap and the browser quota, and store the same picture again in every copy. Online, pictures become uploaded files referenced by URL, and they're de-duplicated by content hash.
4. ~~**The backup leaves out Lesson-studio decks.**~~ Fixed on 12 October: the backup (version 2) carries them in `labDecks`, and a restore files them back.
5. **The repository is heavy.** `.git` is 472 MB, mainly MP4s in `assets/lesson/` (one is 44 MB) and lesson bundles with embedded images in `lessons/`. Once a bucket exists, large media move there and the code keeps only links. Git LFS would be the alternative.
6. **Untracked build folders** (`.codex-deck-build/`, `.codex-finalizer/`) sit in the tree. Ignore them or remove them.

## 6. Build order

Each step is its own commit and works on its own.

1. **One storage adapter, and a complete backup. Done, 12 October.**
   - `SF.Docs` (`js/docs.js`) reads both stores (`SF.Store` and the studio's IndexedDB):
     - `list()` returns every document with a `kind`: `lesson`, `classic` or `game`;
     - `bundle()` builds the backup;
     - `restore()` files it back.
   - The studio side is `SF.LabEngine.savedDecks` and `restoreDecks`, over `readSaved` and `restoreSaved` in `lab/src/embed.ts`.
   - File → Export and Import go through it.
   - Tests: `tests/docs.test.js`.
2. **The Supabase project. Code ready 14 October; the project waits on the owner.**
   - The schema is `supabase/migrations/0001_lessons.sql`:
     - `documents (owner, id, kind, title, folder, modified, deleted, body jsonb)`
     - `folders (owner, id, name, sort)`
     - `assets (owner, hash, path, bytes, type)`
     - `allowed_domains`, starting with `urbanteacher.co.uk` (the owner's choice, 14 October; it was `nulondon.ac.uk`)
   - Row Level Security: a teacher reads and writes only their own rows, and only when signed in with an email at an allowed domain (`is_teacher()`).
   - A private `media` bucket, each teacher's files under a folder named by their user id.
   - `.github/workflows/supabase-keepalive.yml` reads one row every Monday, so the free project never pauses. It does nothing until the repository has the secrets.
   - The relay tells the browser where to save (`GET /api/cloud-config`, from `SUPABASE_URL` and `SUPABASE_ANON_KEY`), or that it saves in this browser only. Test: `tests/cloud-config.test.js`.
   - **What the owner does, once:**
     1. At supabase.com, create a project named SlideForge in the London region (eu-west-2), on the free plan.
     2. In its SQL editor, run `supabase/migrations/0001_lessons.sql`.
     3. Under Authentication → Providers, keep Email on, with "Confirm email" on. Under Authentication → URL configuration, set the Site URL to the Render address, and add `http://localhost:8787` as a redirect URL.
     4. From Settings → API, copy the Project URL and the anon public key into Render's environment (`SUPABASE_URL`, `SUPABASE_ANON_KEY`), into `.env` locally, and into the GitHub repository's Actions secrets under the same two names. The service_role key stays in Supabase.
3. **Sign-in: an email magic link, teachers only. Built 14 October; live once the project exists.** Signed out, the app is as today.
   - `js/cloud.js` (`SF.Cloud`): asks the relay for the project (`/api/cloud-config`). With none, nothing shows, and the Supabase library is never loaded.
   - With one, it loads `@supabase/supabase-js` 2.45.4 from jsDelivr, pinned, and the header gains **Sign in**.
   - The dialog takes a work email. An email outside `allowed_domains` is refused before anything is sent. A work email is sent a magic link that brings the teacher back to the page they were on, signed in. It uses the implicit flow, so the link works in whichever browser opens it (a phone, say); PKCE would complete only in the browser that asked. The button then names them, and the dialog signs out.
   - Checked by `tools/smoke/cloud-signin.mjs` (in the CI set), against a stand-in for Supabase. The real email can only be tried once the project exists.
4. **Sync lessons. Built 14 October** (`js/sync.js`, `SF.Sync`).
   - **When:** while a teacher is signed in: on sign-in, every 30 seconds, and when the tab is hidden. The account dialog says when they were last in step, with a **Save to account now** button.
   - **What:** every document this browser keeps: Lesson-studio lessons, classic lessons and games. A studio lesson's Library card is not a document of its own.
   - **How:** each document's local and online modified times are remembered as they were when last in step, per account, with a fingerprint of its content (modified time left out). Changed here only: uploaded. Changed online only: downloaded and filed, and the lesson open in the studio is shown as it now is. Changed in both: the newer wins, and the copy here is kept in History first. Saved again with nothing changed: nothing uploads.
   - **Deletions:** a document deleted here after being in step is marked `deleted` online and does not come back. A deletion online never removes another device's copy.
   - **Size:** pictures are still inside lessons until step 5, so a document over 12 MB stays in this browser only, and the dialog names it.
   - The studio no longer re-writes a lesson that has not changed (`persistDeck` in `lab/src/app/embed.ts`), so its modified time is when it last changed.
   - Checked by `tools/smoke/cloud-sync.mjs` (in the CI set): two browser profiles as the same teacher, against a stand-in for the documents table.
5. **Pictures to the bucket.**
   - New pictures upload and are stored as URLs.
   - Existing data URLs are moved the first time a deck syncs.
   - Export and share still embed pictures, so a file you download is complete on its own.
6. **Shares and reports to Supabase.** The server writes them to the database or bucket instead of `SHARE_DIR`, so they survive deploys. This lifts the 40-share limit.
7. **Built-in lessons as data.** Lessons hard-coded today (`js/lab-decks.js`, `lessons/`) can be published to a shared "built-in" folder in Supabase instead of the code. Large MP4s move to the bucket. The code then keeps only the starter decks.

Steps 1 to 4 fix the real problem (lessons on every device). Steps 5 to 7 make it scale.

## 7. Costs

- Supabase free: £0. If the 500 MB database or 1 GB of files fills up, Pro is $25 a month (8 GB database, 100 GB files, daily backups).
- Render: unchanged (free). Shares and reports no longer need a paid disk.
- Cloudflare R2, if pictures and video outgrow 1 GB: free up to 10 GB.

## 8. Open questions

1. ~~**Who signs in.**~~ **Decided 14 October: teachers only.** Students keep using links.
2. ~~**Sign-in method.**~~ **Decided 14 October: an email magic link.** Microsoft sign-in can be added later without changing the data.
3. **University policy:** is storing staff email addresses and teaching material with Supabase (London region, DPA signed) acceptable to NU London?
4. **Built-in lessons:** keep them in the code (simple, versioned with the app), or move them to the shared online folder (step 7)?

## Change log

- 14 October 2026, later still: step 4 built, lessons and games synced to the teacher's account (`js/sync.js`).
- 14 October 2026, later: the sign-in link works in any browser (the implicit flow in place of PKCE).
- 14 October 2026, later: the allowed domain changed from nulondon.ac.uk to urbanteacher.co.uk, in the project and in `0001_lessons.sql`.
- 14 October 2026, evening: the SlideForge project created in London through the Supabase connection, and `0001_lessons.sql` applied (with `execute_sql`, so it is not in the project's migration history; its `drop policy` lines were left out, as the project was new). Checked: four tables with Row Level Security, five policies, the private `media` bucket, nulondon.ac.uk allowed. With the public key alone, lessons read empty, and writing a lesson or a domain is refused (401). `.env` holds the URL and anon key, and localhost shows Sign in.

- 14 October 2026, later: step 3 built, the email magic-link sign-in (`js/cloud.js`), hidden until the project exists.
- 14 October 2026: teachers only and an email magic link decided. Step 2's code built: the schema with Row Level Security and the teachers-only rule, the private media bucket, the weekly keep-alive, and `/api/cloud-config`. The project itself waits on the owner.

- 12 October 2026: step 1 built. `SF.Docs` reads both stores, and the backup carries Lesson-studio lessons.

- 12 October 2026: plan written.
