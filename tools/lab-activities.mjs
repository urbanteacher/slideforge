#!/usr/bin/env node
/* The 54 activities' content, for the lab (SlideForge Studio).
 *
 * The same process as the Layout bank (tools/lab-layout-bank.mjs): the lab builds each activity
 * itself, from its own layouts and layers (lab/src/model/activities.ts); what it needs from
 * SlideForge is only what each activity says. This reads the catalogue through SlideForge's own
 * code — the slides an activity makes (SF.Activities.makeSlides) and, for a game, the starter game
 * Quiz studio would make (SF.createPresetGame) — keeps the content fields, and writes one file.
 * Nothing is measured off the screen.
 *
 *   SF_URL=http://localhost:8787 node tools/lab-activities.mjs
 *     → lab/src/assets/activities.json
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../', import.meta.url));
const SF_URL = process.env.SF_URL || 'http://localhost:8787';

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(SF_URL, { waitUntil: 'load' });
await page.waitForFunction(() => window.SF && window.SF.Activities && window.SF.Activities.makeSlides && window.SF.createPresetGame);
const data = await page.evaluate(() => {
  const SF = window.SF, A = SF.Activities;
  // The fields that say what a slide is, as the Layout bank keeps them; player and editor state
  // stay behind. The time limit and the feedback stay: they are what an activity does in the room.
  const drop = new Set(['id', 'videoStart', 'videoEnd', 'videoLoop', 'videoMuted', 'videoAutoplay', 'correct', 'points',
    'imageSide', 'imageFit', 'tableHeader', 'chartUnit', 'buildMode', 'transition', 'layers', 'activityInstance']);
  const empty = (v) => v === '' || v === null || v === undefined || (Array.isArray(v) && !v.length) || (typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length);
  const clean = (s) => Object.fromEntries(Object.entries(s).filter(([k, v]) => !drop.has(k) && !empty(v)));
  const text = (v) => String(v == null ? '' : v);
  return A.ACTIVITIES.filter((a) => a.enabled !== false).map((a) => {
    const phase = A.PHASES.find((p) => p.key === a.phase);
    const out = {
      key: a.key, title: a.title, icon: a.icon || '', blurb: a.blurb || '',
      phase: a.phase, phaseLabel: phase ? phase.label : a.phase, phaseIcon: phase ? phase.icon : '',
      minutes: a.minutes || 0, target: a.target, presentation: a.presentation || '',
      steps: (a.steps || []).map(text), materials: (a.materials || []).map(text), teacherNotes: text(a.teacherNotes),
    };
    if (a.target === 'game' && a.style) {
      // The starter game Quiz studio would make: its questions, as the room sees them.
      const g = SF.createPresetGame(a.style, Object.assign({ title: a.title }, a.gamePreset || {}), 'studio');
      const style = SF.gameStyle(g.style);
      out.game = {
        title: g.title, style: g.style, format: g.format || '', styleLabel: style ? style.label : g.style,
        questions: (g.questions || []).map((q) => ({
          question: text(q.question || q.term || q.prompt || q.statement || ''),
          options: (q.options || []).map(text).filter((o) => o.trim()),
          correct: typeof q.correct === 'number' ? q.correct : -1,
          explanation: text(q.explanation),
        })),
      };
    } else {
      out.slides = A.makeSlides(a).map(clean);
    }
    return out;
  });
});
await browser.close();

const out = root + 'lab/src/assets/activities.json';
writeFileSync(out, JSON.stringify({ activities: data }));
const counts = {};
data.forEach((a) => { counts[a.target] = (counts[a.target] || 0) + 1; });
console.log(`${data.length} activities → ${out} (${(JSON.stringify({ activities: data }).length / 1e3).toFixed(0)} kB)`);
console.log(Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(' · '));
