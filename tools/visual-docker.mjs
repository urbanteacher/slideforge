#!/usr/bin/env node
/* Run the visual regression suite in the same container CI uses.
 *
 * The baselines in tools/baselines are Linux-rendered. They have to be: a
 * screenshot suite is only a check if the thing capturing and the thing
 * verifying agree, and CI is the thing that has to verify. Running the suite
 * directly on macOS now fails all 642 for a reason that has nothing to do with
 * the change under test — Iowan Old Style and Helvetica Neue exist here and
 * not there — so the default route is through Docker.
 *
 * The image is pinned to the playwright version in package.json, because a
 * Chromium upgrade is exactly the kind of thing that moves every baseline at
 * once and should be a deliberate commit.
 *
 * Fonts matter as much as the browser. A bare playwright image has no Palatino
 * and no Helvetica, and resolves both to WenQuanYi Zen Hei — a CJK face, which
 * renders the Northeastern display serif as something nobody would recognise.
 * urw-base35 supplies P052, which is a Palatino clone and is the second entry
 * in the --nu-display stack, so what CI renders is a face the CSS itself names.
 *
 *   node tools/visual-docker.mjs            # check
 *   node tools/visual-docker.mjs --update   # rewrite baselines
 *   any other flags pass straight through to visual-regression.mjs
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const version = String(pkg.devDependencies.playwright).replace(/^[^0-9]*/, '');
const IMAGE = `mcr.microsoft.com/playwright:v${version}-noble`;

/* Same list as .github/workflows/ci.yml. If one changes, both change — a
   baseline written against different fonts is worse than no baseline. */
const FONTS = 'fonts-urw-base35 fonts-liberation fonts-crosextra-carlito fonts-crosextra-caladea';

const passthrough = process.argv.slice(2);

const script = [
  'set -e',
  'apt-get update -qq >/dev/null 2>&1',
  `DEBIAN_FRONTEND=noninteractive apt-get install -y -qq ${FONTS} >/dev/null 2>&1`,
  'fc-cache -f >/dev/null 2>&1',
  'cd /w',
  `node tools/visual-regression.mjs ${passthrough.map((a) => JSON.stringify(a)).join(' ')}`
].join('\n');

const probe = spawnSync('docker', ['info'], { stdio: 'ignore' });
if (probe.status !== 0) {
  console.error(
    'Docker is not available, and the baselines are Linux-rendered.\n\n'
    + 'Start Docker, or run the suite directly with `npm run visual:check:host`\n'
    + '— but expect every capture to differ, because macOS has fonts the\n'
    + 'baselines were not captured with. See tools/visual-docker.mjs.'
  );
  process.exit(1);
}

const run = spawnSync(
  'docker',
  ['run', '--rm', '-v', `${ROOT}:/w`, '-w', '/w', IMAGE, 'bash', '-lc', script],
  { stdio: 'inherit' }
);
process.exit(run.status ?? 1);
