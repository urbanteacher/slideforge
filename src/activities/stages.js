/* SlideForge — activities/stages. Edit source here; npm run build updates js/model.js. */

/* An activity shown as the sequence it is.

   Think-Pair-Share used to render as four rows of small print and one clock
   for the whole seven minutes: indistinguishable from a glossary, with
   nothing saying which stage the room was in and the phones idle. As stages,
   the wall shows a track with the current stage lit, that stage's prompt as
   the biggest thing on the screen, and a clock for that stage alone. Each
   stage gives the phones a job, or tells them to go down.

   The stages are the rows the activity already stores — "Think · 1 min" and
   the line under it — so nothing new is authored. What a row asks of the
   phones is read off its label; a routine this file has never heard of still
   gets a track and clocks, and its phones are told to look up. */

/** What each kind of stage asks of the room, on the wall and on the phone. */
const STAGE_JOBS = {
  note: {
    wall: 'Silent thinking',
    phone: 'Write a private note. Only you can see it.',
    icon: '✎'
  },
  talk: {
    wall: 'Turn to your partner',
    phone: 'Your note, to compare with your partner’s.',
    icon: '💬'
  },
  send: {
    wall: 'Ideas arrive here, without names',
    phone: 'Send your pair’s strongest idea. No name goes with it.',
    icon: '↑'
  },
  down: {
    wall: 'Phones down',
    phone: 'Phones down. Eyes on the board.',
    icon: '👀'
  }
};

/* Read in order, so a stage with both kinds of word is the talking kind:
   "Share with partner" is two people comparing notes. "Pairs share best
   ideas" is not — the pairs are reporting out — which is why the talk words
   match "pair" and not "pairs". */
/** @type {[string, RegExp][]} */
const JOB_WORDS = [
  ['note', /\b(think|alone|jot|individual|reflect|silent|write)\b/i],
  ['talk', /\b(pair|partner|compare|discuss|square|talk|group|argue)\b/i],
  ['send', /\b(share|report|send|feed ?back|post|contribute)\b/i],
  ['down', /\b(connect|synthes|summar|debrief|teacher|plenary|close|link)\w*/i]
];

/** @param {string} label @returns {'note'|'talk'|'send'|'down'} */
function stageJob(label) {
  const text = String(label || '');
  for (const [job, re] of JOB_WORDS) if (re.test(text)) return /** @type {any} */ (job);
  return 'down';
}

/**
 * "Think · 1 min" → { name: 'Think', seconds: 60 }. A label with no time in it
 * is a stage with no clock of its own.
 * @param {string} term
 */
function parseStageLabel(term) {
  const text = String(term || '').trim();
  const m = /^(.*?)\s*[·•|:\-–—(]\s*(\d+(?:\.\d+)?)\s*(seconds?|secs?|s|minutes?|mins?|m)\b\)?\s*$/i.exec(text);
  if (!m) return { name: text, seconds: 0 };
  const n = Number(m[2]);
  const secs = /^s/i.test(m[3]) ? n : n * 60;
  return { name: m[1].trim() || text, seconds: Math.max(0, Math.min(3600, Math.round(secs))) };
}

/**
 * The stages of an activity slide, in order.
 * @param {{bullets?: string[]}} slide
 * @param {(line: string) => {term: string, def: string}} parseLine the deck's keyword-line parser
 * @returns {{i: number, name: string, seconds: number, text: string, job: 'note'|'talk'|'send'|'down'}[]}
 */
function activityStages(slide, parseLine) {
  return (slide && slide.bullets || [])
    .map(parseLine)
    .filter((p) => p.term || p.def)
    .slice(0, 8)
    .map((p, i) => {
      const label = parseStageLabel(p.term);
      return { i, name: label.name, seconds: label.seconds, text: p.def || '', job: stageJob(label.name) };
    });
}

export { STAGE_JOBS, stageJob, parseStageLabel, activityStages };
