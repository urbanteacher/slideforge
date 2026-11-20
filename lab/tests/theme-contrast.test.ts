// Every theme's words read on every one of its grounds (4.5:1, WCAG AA for body text): the built-in themes with their
// quiet and loud grounds (layouts/grounds.ts), and every palette in the Style guide, whatever colour set is chosen.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LAYOUT_STYLES, guideStyle } from '../src/layouts';
import { chooseSet, contrast, fromPreset, paletteGroups } from '../src/theme';

type Roles = { ground: string; ink: string; muted: string; accent: string };
const fails = (who: string, r: Roles) => (['ink', 'muted', 'accent'] as const)
  .filter((k) => /^#[0-9a-f]{6}$/i.test(r[k]) && /^#[0-9a-f]{6}$/i.test(r.ground) && contrast(r[k], r.ground) < 4.5)
  .map((k) => `${who} · ${k} ${r[k]} on ${r.ground}: ${contrast(r[k], r.ground).toFixed(2)}:1`);

test('the built-in themes, on each of their grounds', () => {
  const out = LAYOUT_STYLES.flatMap((st) => [
    // Mono's accent is its ink by design, and is read as ink.
    ...fails(st.name, st),
    ...(st.grounds ?? []).flatMap((g) => fails(`${st.name} ${g.name}`, g)),
  ]);
  assert.deepEqual(out, []);
});

test('every built-in theme has a quiet ground, so a deck in it is not one colour', () => {
  for (const st of LAYOUT_STYLES) assert.ok(st.grounds?.some((g) => g.id === 'quiet'), st.name);
});

test('every palette in the Style guide, with every colour set', () => {
  const out: string[] = [];
  for (const { presets } of paletteGroups()) for (const p of presets) {
    const g = fromPreset(p);
    for (const set of g.sets.length ? g.sets : [undefined]) {
      if (set) chooseSet(g, set);
      const st = guideStyle(g);
      out.push(...fails(`${p.name}${set ? ` set ${set}` : ''}`, st), ...(st.grounds ?? []).flatMap((gr) => fails(`${p.name}${set ? ` set ${set}` : ''} ${gr.name}`, gr)));
    }
  }
  assert.deepEqual(out, []);
});
