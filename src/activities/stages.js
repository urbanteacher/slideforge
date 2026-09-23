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
  /* A stretch of making or solving. The phone's job is to stay out of the
     way, with one quiet way to say "I'm stuck" that only the desk sees. */
  work: {
    wall: 'Work on the task',
    phone: 'Work on the task. Stuck? Tell the teacher. Only they see it.',
    icon: '✍'
  },
  down: {
    wall: 'Phones down',
    phone: 'Phones down. Eyes on the board.',
    icon: '👀'
  }
};

/* A talk stage that is not a pair: a jigsaw's groups, a seminar's circle.
   "Turn to your partner" would send a group of four looking for one. */
const GROUP_TALK = {
  wall: 'Talk in your group',
  phone: 'Talk it through with your group.'
};

/* Read in order, so a stage with both kinds of word is the earlier kind.
   "Share with partner" is two people comparing notes. "Pairs share best
   ideas" is not — the pairs are reporting out — which is why the talk words
   match "pair" and not "pairs". "You do alone" is independent practice, so
   it is work before "alone" can make it a note. */
/** @type {[string, RegExp][]} */
const JOB_WORDS = [
  ['work', /\b(you do alone|independent(ly)? practi[cs]e|on your own)\b/i],
  ['note', /\b(think|alone|jot|individual|reflect|silent|write)\b/i],
  ['talk', /\b(pair|partner|compare|discuss|square|talk|group|argue|together|circle|switch|expert|home|return|teach(es|ing)?)\b/i],
  ['send', /\b(share|report|send|feed ?back|post|contribute)\b/i],
  ['work', /\b(plan|planning|create|creating|design|solve|solving|build|draft|refine|investigate|research|rotate|rotation|round|station|practi[cs]e|self-assess\w*|apply|attempt)\b/i],
  ['down', /\b(connect|synthes|summar|debrief|teacher|plenary|close|link)\w*/i]
];

/** @param {string} label @returns {'note'|'talk'|'send'|'work'|'down'} */
function stageJob(label) {
  const text = String(label || '');
  for (const [job, re] of JOB_WORDS) if (re.test(text)) return /** @type {any} */ (job);
  return 'down';
}

const PAIR_WORDS = /\b(pair|partner)\b/i;
const GROUP_WORDS = /\b(group|square|circle|expert|home|team|table)\b/i;

/**
 * Which talk stages are for more than two. A label that says so decides
 * ("Pair", "Expert groups"); one that doesn't ("Switch", "Together",
 * "Discuss and draw") takes the routine's word for it. Teach Someone's
 * Switch is still two partners; a seminar's Switch is still the circle. A
 * routine that names neither is a group, the commoner case.
 * @param {string[]} names
 * @param {string[]} [jobs] each stage's job, when some were declared
 */
function groupTalk(names, jobs) {
  const talk = names.map((n, i) => (jobs ? jobs[i] : stageJob(n)) === 'talk');
  const pair = names.map((n, i) => talk[i] && PAIR_WORDS.test(n));
  const group = names.map((n, i) => talk[i] && !pair[i] && GROUP_WORDS.test(n));
  const pairs = pair.some(Boolean) && !group.some(Boolean);
  return names.map((n, i) => talk[i] && (group[i] || (!pair[i] && !pairs)));
}

/** The words a stage puts on the wall and the phone, and its icon.
 *  @param {{job: string, group?: boolean}} st */
function stageCopy(st) {
  const base = STAGE_JOBS[/** @type {keyof typeof STAGE_JOBS} */ (st.job)] || STAGE_JOBS.down;
  return st.job === 'talk' && st.group ? { ...base, ...GROUP_TALK } : base;
}

/* A job written into the label, in brackets at the end: "At home · 3 min
   [send]". It beats the words, which cannot tell a hunt at home from a
   jigsaw's home group. It never reaches the wall. */
const DECLARED_JOB = /\s*\[(note|talk|send|work|down)\]\s*$/i;

/** A label as a room reads it: without its declared job. @param {string} term */
function stripDeclaredJob(term) {
  return String(term == null ? '' : term).replace(DECLARED_JOB, '');
}

/** The job a label declares, or ''. @param {string} term */
function declaredJob(term) {
  const m = DECLARED_JOB.exec(String(term || ''));
  return m ? m[1].toLowerCase() : '';
}

/**
 * "Think · 1 min" → { name: 'Think', seconds: 60 }. A label with no time in it
 * is a stage with no clock of its own. "Rotate · every 4 min" is four
 * minutes: the source writes rotations that way. A declared job is taken off.
 * @param {string} term
 */
function parseStageLabel(term) {
  const text = String(term || '').replace(DECLARED_JOB, '').trim();
  const m = /^(.*?)\s*[·•|:\-–—(]\s*(?:every\s+|about\s+|~\s*)?(\d+(?:\.\d+)?)\s*(seconds?|secs?|s|minutes?|mins?|m)\b\)?\s*$/i.exec(text);
  if (!m) return { name: text, seconds: 0 };
  const n = Number(m[2]);
  const secs = /^s/i.test(m[3]) ? n : n * 60;
  return { name: m[1].trim() || text, seconds: Math.max(0, Math.min(3600, Math.round(secs))) };
}

/**
 * The rows of an activity slide, split into its brief and its stages.
 *
 * A leading row with no time, followed by at least two that have one, is the
 * brief: the problem, the seminar's question, the carousel's stations. It is
 * what the stages are *about*, so it stays on the wall through every one of
 * them instead of being a stage the room walks past. Think-Pair-Share's first
 * row is timed, so it has no brief.
 * @param {{bullets?: string[]}} slide
 * @param {(line: string) => {term: string, def: string}} parseLine
 */
function stagedRows(slide, parseLine) {
  const rows = (slide && slide.bullets || [])
    .map((line, row) => ({ ...parseLine(line), row }))
    .filter((p) => p.term || p.def);
  const labels = rows.map((p) => parseStageLabel(p.term));
  const timedAfter = labels.slice(1).filter((l) => l.seconds > 0).length;
  const hasBrief = rows.length > 2 && labels[0].seconds === 0 && timedAfter >= 2;
  const brief = hasBrief ? { row: rows[0].row, name: labels[0].name, text: rows[0].def || '' } : null;
  const staged = rows.slice(hasBrief ? 1 : 0, (hasBrief ? 1 : 0) + 8);
  const names = staged.map((p) => parseStageLabel(p.term).name);
  const jobs = staged.map((p, i) => /** @type {any} */ (declaredJob(p.term) || stageJob(names[i])));
  const groups = groupTalk(names, jobs);
  const stages = staged.map((p, i) => {
    const label = parseStageLabel(p.term);
    return {
      i, row: p.row, name: label.name, seconds: label.seconds, text: p.def || '',
      job: jobs[i], group: groups[i]
    };
  });
  return { brief, stages };
}

/**
 * The stages of an activity slide, in order.
 * @param {{bullets?: string[]}} slide
 * @param {(line: string) => {term: string, def: string}} parseLine the deck's keyword-line parser
 * @returns {{i: number, row: number, name: string, seconds: number, text: string, job: 'note'|'talk'|'send'|'work'|'down', group: boolean}[]}
 */
function activityStages(slide, parseLine) {
  return /** @type {any} */ (stagedRows(slide, parseLine).stages);
}

/**
 * The brief that stays up through every stage, or null.
 * @param {{bullets?: string[]}} slide
 * @param {(line: string) => {term: string, def: string}} parseLine
 * @returns {{row: number, name: string, text: string} | null}
 */
function activityBrief(slide, parseLine) {
  return stagedRows(slide, parseLine).brief;
}

export { STAGE_JOBS, stageJob, declaredJob, stripDeclaredJob, stageCopy, parseStageLabel, activityStages, activityBrief };
