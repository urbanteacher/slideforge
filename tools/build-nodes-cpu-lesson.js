#!/usr/bin/env node
'use strict';

/* A Nodes stage taught as a lesson: "Describe the main components of the CPU"
 * (Computer Science GCSE, command word 2). Every slide's content comes from the
 * stage itself, exported by Nodes, so the deck and the app say the same thing:
 *
 *   cd ~/Desktop/Nodes && npx tsx tools/export-stage-lesson.ts gcse-cs 2 \
 *     > "../App /SlideForge/tools/nodes-stage-gcse-cs-2.json"
 *   node tools/build-nodes-cpu-lesson.js
 *
 * Writes lessons/nodes/Nodes_CPU_Lesson.sfbundle.json (and a _STUDENT copy).
 * Import it from the Library's Import button.
 *
 * The order is a UK lesson shape (Rosenshine's principles, the ITT and Early
 * Career Framework) filled with the stage's tabs. Every slide carries its own
 * instruction (what to do, how, how long), its question in plain words, and an
 * answer slide after it, so a teacher can run it without reading the notes first: a Do Now (retrieval); the
 * objective and success criteria; the question and a first attempt; Recall (the
 * knowledge it rests on); How to answer, modelled (I do); compare and repair
 * (we do); the missing-link ladder, a frame then none (you do); the Mark scheme
 * check; an independent new task, a stretch task, a plenary and homework; then,
 * for the teacher, the Analysis readings, the findings and the sources. 50 min. */
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const memory = new Map();
global.localStorage = {
  getItem: key => memory.get(key) ?? null,
  setItem: (key, value) => memory.set(key, String(value)),
  removeItem: key => memory.delete(key)
};
global.window = { localStorage: global.localStorage };
require(path.join(root, 'js/model.js'));
const SF = global.window.SF;

const N = JSON.parse(fs.readFileSync(path.join(__dirname, 'nodes-stage-gcse-cs-2.json'), 'utf8'));
const { stage, stages, recall, routine, ladder, join, worked, students, marks, readings, research, sources } = N;
const rel = research.relationship;
const apart = research.apart;
const reading = who => readings.find(r => r.student === who);

const write = (prompt, max = 1) => ({ kind: 'brainstorm', prompt, max });
const poll = (prompt, options) => ({ kind: 'poll', prompt, options, hold: true });
const pair = (a, b) => `${a}\t${b}`;
const table = rows => rows.map(r => r.join('\t')).join('\n');
const section = (title, subtitle, notes) => ({ type: 'section', title, subtitle, notes });
const lines = s => s.split('\n').map(l => l.trim()).filter(Boolean);
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const FROM = `From the Nodes stage: ${N.from}`;
const sourceNotes = sources.map(s => [`${s.label}, ${s.qs.join(', ')}`, s.qp && `Question paper: ${s.qp}`, s.ms && `Mark scheme: ${s.ms}`, s.er && `Examiners' report: ${s.er}`].filter(Boolean).join('\n')).join('\n\n');
const FINDING_LABEL = {
  strong_answer: 'Strong answer', misconception: 'Misconception', imprecise_wording: 'Imprecise wording',
  found_difficult: 'Found difficult', stuck_at_level: 'Stopped short', slip_or_calculation_error: 'Slip or calculation error',
  not_applied_to_scenario: 'Not applied to the scenario', exam_technique: 'Exam technique', used_given_information: 'Used the given information'
};
/* Recall: the anchor term and the one this stage uses. */
const known = recall.items.filter(i => i.term === 'CPU' || i.used);
const unit = i => ({ label: worked.labels[i], text: worked.units[i] });
const cpu = name => `assets/lesson/nodes/cpu-${name}.png`;
/* What each instruction slide says to the class, in the same order everywhere: what to do, how, how long. */
const task = (what, how, time) => `Task (${time}): ${what}${how ? ` ${how}` : ''}`;

/* The six parts the answer covers, each on the Nodes diagram: its specific role (the worked answer's
   element, from Nodes) and the same idea in plain words for the class, and whether it does or holds. */
const PARTS = [
  { pic: 'control-unit', name: 'Control unit', role: unit(0).text, plain: 'It works out what each instruction means, then tells the other parts what to do, and when.', kind: 'It DOES something.' },
  { pic: 'alu', name: 'ALU (arithmetic logic unit)', role: unit(1).text, plain: 'It does the maths (add, subtract) and the logic (compare two values, AND, OR).', kind: 'It DOES something.' },
  { pic: 'registers', name: 'Registers', role: unit(2).text, plain: 'Tiny, very fast stores inside the CPU. Each one holds one thing the CPU is using right now.', kind: 'They HOLD something.' },
  { pic: 'pc', name: 'PC (program counter)', role: unit(3).text.replace(/^the PC /, ''), plain: 'An address is a location in memory. The PC holds the location of the next instruction.', kind: 'It HOLDS something.' },
  { pic: 'cache', name: 'Cache', role: unit(4).text, plain: 'Small, fast memory that keeps what the CPU uses often, so it does not wait for main memory.', kind: 'It HOLDS something.' },
  { pic: 'clock', name: 'Clock', role: unit(5).text, plain: 'It sends a steady pulse, a timing signal, that keeps every part working in step.', kind: 'It DOES something.' },
];
const B_LINES = lines(students.B.answer).map(l => [l.split(':')[0], l.slice(l.indexOf(':') + 1).trim()]);
const B_VERDICT = {
  'Control unit': ['✓ Exact job', 'It names the two things the control unit does: it decodes instructions and sends control signals.'],
  ALU: ['✗ A label, not a job', '“The brain” does not say what it does: arithmetic and logic.'],
  Registers: ['✗ Too vague', '“Store data” could be any memory. Say what they hold and where.'],
  Cache: ['✗ Too vague', '“Stores data” again. Say what it keeps, and why: so the CPU does not wait.'],
  Clock: ['✗ Wrong job', 'It sends timing signals. It does not “control the speed”.'],
};

const slides = [
  { type: 'title', title: stage.task, subtitle: `${N.framework} · Command word ${stage.n}: ${stage.short} · ${stage.ask}`,
    notes: `Aim: describe the CPU’s main components, each with its specific role, and know what that answer has to contain.\n${FROM}` },

  /* ------------------------------------------------ Do Now: prior learning only */
  { type: 'content', title: 'Do Now: answer in your book',
    bullets: [task('answer the three questions on your own.', 'No notes.', '3 min'), '1. What does CPU stand for?', '2. In one sentence: what does the CPU do?', '3. What is hardware?'],
    feedback: write('Your three answers, one per send.', 3),
    notes: '3 min, on entry. Retrieval of earlier learning only: the Define lesson (command word 1) and earlier work on hardware. If the class has not met these, swap in three questions from their last lesson.' },
  { type: 'table', title: 'Do Now: answers',
    body: table([['Question', 'Answer'], ['1. What does CPU stand for?', 'Central Processing Unit'], ['2. What does the CPU do?', 'It executes (carries out) program instructions.'], ['3. What is hardware?', 'The physical parts of a computer system.']]),
    notes: '1 min. Students tick or correct in a different colour. Answer 3 is the AQA mark scheme’s own (8525/2, June 2023, Q8.1: physical components of a computer system).' },

  /* ------------------------------------------------ Objective, the question, a first attempt */
  { type: 'keyfact', title: 'Today', body: `I can ${stage.task.charAt(0).toLowerCase()}${stage.task.slice(1, -1)}, each with its specific role.`,
    bullets: ['I name each part exactly.', 'I say what each part does, or what it holds.', 'I avoid labels like “the brain” and vague words like “stores data”.'],
    notes: '1 min. Read the three success criteria aloud. Students check their own answers against them at the end.' },
  { type: 'keyfact', title: 'The question we will answer', body: stage.task, subtitle: `Your answer should give: ${stage.outcome}`,
    bullets: ['“Describe” means: say what each part is like, or what it does.', 'For this question: name each part, then give its job.'],
    notes: '1 min. Point at the command word, then at “its specific role”: that phrase is the whole job.' },
  { type: 'content', title: 'Have a go first',
    bullets: [task('answer the question in your book.', 'Name each part you know and say what it does.', '3 min'), 'It is fine not to know yet: this shows where you are starting.', 'Keep it: you will compare it with your answer at the end.'],
    feedback: write(stage.task),
    notes: '3 min. Collect, do not correct. Then ask of two answers: “What does that mean it actually does?” A student who can then say it has the knowledge and needs expression; one who cannot needs the content.' },

  /* ------------------------------------------------ Teach: the parts, on the Nodes diagram */
  section('The parts of the CPU', 'Learn it · 8 min', 'The diagram is the Nodes Plan view (the Visual tab).'),
  { type: 'split', title: 'Inside the CPU', image: cpu('plan'), imageFit: 'contain', imageSide: 'right',
    bullets: ['This is a plan of a CPU, seen from above.', 'You need six parts for this answer:', 'control unit, ALU, registers, the PC, cache and clock.', 'Main memory and the buses sit outside the CPU.'],
    notes: '1 min. Let the class look. Point to each part as you name it. Main memory and the buses come into the new task at the end.' },
  ...PARTS.map((p, i) => ({ type: 'split', title: `${i + 1}. ${p.name}`, image: cpu(p.pic), imageFit: 'contain', imageSide: 'right',
    bullets: [`In plain words: ${p.plain} ${p.kind}`, `Write this in your book: ${p.name.replace(/ \(.*\)$/, '')}: ${p.role}.`],
    notes: `1 min. The plain words first, then the exam wording, which stays bright: students copy it into their book.` })),

  /* ------------------------------------------------ Check: do or hold */
  { type: 'keyfact', title: 'Does it DO something, or HOLD something?', body: 'Some parts do work. Registers only hold.',
    bullets: ['Do work: the control unit, the ALU, the clock.', `Hold one thing: registers (${apart.a[0].replace(/^Registers \(|\)$/g, '')}) and cache.`, 'Why it matters: examiners mark “the MAR fetches data” wrong. A register holds; it never fetches.'],
    notes: `2 min. Mixed up in ${apart.findings} examiner findings across ${apart.boards.join(', ')}: ${apart.title.toLowerCase()}.` },
  { type: 'content', title: 'Quick check: do or hold?',
    bullets: [task('decide for each part: does it DO something or HOLD something?', 'Vote on your phone, or hands up.', '1 min'), 'The MAR (memory address register)'],
    feedback: poll('The MAR: does it do something or hold something?', ['A: it does something', 'B: it holds something']),
    notes: '1 min. Then the answer slide.' },
  { type: 'keyfact', title: 'Quick check: answer', body: 'B: the MAR holds something.',
    bullets: ['It holds an address: where in memory the CPU is reading from or writing to.', 'It does not fetch. The control unit directs the fetching.'],
    notes: '30 s.' },

  /* ------------------------------------------------ I do: how to write the answer */
  section('How to write the answer', 'Watch me · 6 min', join.rule),
  { type: 'keyfact', title: 'The rule for this answer', body: 'Name the part → give its specific job',
    bullets: ['Do this for every part.', 'One part, one job, one line.', 'No more reasoning than the question asks for, and no less precision.'],
    notes: `1 min. This is the join Nodes gives for “describe components”. ${join.recall ? 'It is mostly recall: a pairing, not a chain of reasons. So the fix is precision, not more “because”.' : ''}\n${FROM}` },
  { type: 'table', title: 'Answers that lose the mark',
    body: table([['Mistake', 'Example', 'Why it loses the mark'],
      ['A label', '“The CPU is the brain of the computer”', 'It does not say what it does.'],
      ['An action for a holder', '“The MAR fetches data”', 'Registers hold. They do not fetch.'],
      ['The wrong name', '“Main memory” when the question means RAM', 'Use the exact term the question needs.']]),
    notes: `1 min. Each is a refusal the mark schemes record. A mark scheme’s own warning to markers: “${join.quote.text}” (${join.quote.cite}).\n${sourceNotes}` },
  { type: 'content', title: 'Watch: the answer, one part at a time',
    bullets: worked.units.map((u, i) => `${PARTS[i] ? PARTS[i].name.replace(/ \(.*\)$/, '') : worked.labels[i]}: ${u}`),
    notes: '3 min, one line per click. THINK ALOUD for each: "Which part? What exactly does it do or hold? Would these words fit any other part? Then they are not precise enough."' },

  /* ------------------------------------------------ We do: spot the mistakes */
  section('Spot the mistakes', 'Together · 8 min', 'Three made-up answers, written for Nodes (its Students A, B and C).'),
  { type: 'keyfact', title: 'Three answers to the same question', body: 'Weak → stable → excellent',
    bullets: ['A weak answer: misses the point.', 'A stable answer: some parts right, some not exact.', 'An excellent answer: every part with its exact job.', 'They are made up, so we can practise marking them.'],
    notes: '30 s. In Nodes these are Students A (weak), B (stable) and C (excellent): the same three on the Question tab.' },
  { type: 'quote', body: students.A.answer, subtitle: 'The weak answer. Task (1 min): with your partner, say what is wrong with it.',
    notes: `1 min. Take two answers, then the next slide.\n${reading('A').gap}` },
  { type: 'keyfact', title: 'The weak answer: what is wrong', body: 'A hard drive and RAM are not parts of the CPU.',
    bullets: ['They are storage and memory, outside the CPU.', 'It needs the CPU’s own parts, each with its job.', `Ask the writer: ${(students.A.feedback.match(/^“[^”]*”/) || [students.A.feedback])[0]}`],
    notes: '1 min.' },
  { type: 'table', title: 'The stable answer: which lines are right?',
    body: table([['Part', 'The stable answer says'], ...B_LINES]),
    feedback: poll('How many lines give the exact job?', ['1', '2', '3', '4 or 5']),
    notes: '1.5 min. Students read each line and decide: exact job, or not? Then vote.' },
  { type: 'table', title: 'The stable answer: marked',
    body: table([['Part', 'Verdict', 'Why'], ...B_LINES.map(([p]) => [p, ...(B_VERDICT[p] || ['', ''])])]),
    notes: `1 min. One line is right: the control unit.\n${students.B.why}` },
  { type: 'content', title: 'Fix the stable answer',
    bullets: [task('rewrite the four wrong lines in your book.', 'Give each part its exact job, with no labels.', '2 min'), 'ALU: …', 'Registers: …', 'Cache: …', 'Clock: …'],
    feedback: write('One of your fixed lines.', 4),
    notes: '2 min. The fix is precision, not reasoning: adding “because” would not fix “the brain of the CPU”.' },
  { type: 'table', title: 'The excellent answer',
    body: table([['Part', 'The excellent answer says'], ...worked.units.map((u, i) => [PARTS[i] ? PARTS[i].name.replace(/ \(.*\)$/, '') : worked.labels[i], u])]),
    notes: '1 min. Compare it with your fixed lines, one by one.' },

  /* ------------------------------------------------ You do: a frame, then none */
  section('Your turn', 'On your own · 6 min', 'A frame first, then the same question without it.'),
  { type: 'table', title: 'Fill in the frame',
    body: table([['Part', 'Its specific job'], ...PARTS.map(p => [p.name.replace(/ \(.*\)$/, ''), '…'])]),
    feedback: write('Your completed rows, one per send.', 6),
    notes: '2 min. Task: copy the table and complete each row. Check: would your words fit any other part? Then make them more exact.' },
  { type: 'content', title: 'Now without the frame',
    bullets: [task('answer the question again, without the frame or your notes.', 'Cover the frame.', '3 min'), stage.task, 'Then check: does every part have its own job?'],
    feedback: write(stage.task),
    notes: '3 min. Frame hidden, models hidden.' },

  /* ------------------------------------------------ Check against a real mark scheme */
  section('Mark it like an examiner', 'Check · 4 min', marks.example),
  { type: 'content', title: 'How the marks are awarded',
    bullets: ['1 mark for each part with its exact job.', 'Labels like “controls the computer” or “fast memory” get no mark.', task('mark your answer: 1 mark per part with its exact job.', 'Write your score at the top.', '1 min')],
    notes: `2 min. ${marks.pattern[2].example}\n${sourceNotes}` },
  { type: 'compare', title: 'What examiners saw in real answers', subtitle: pair('Weaker answers', 'Stronger answers'),
    bullets: [[marks.example.split(':')[0], marks.weak, marks.strong].join('\t')],
    notes: `2 min. From the examiners’ report for that paper.\nASK: "Which side is your answer on?"\n${sourceNotes}` },

  /* ------------------------------------------------ New task, stretch, plenary, homework */
  section('A new question', 'On your own · 8 min', 'No models, no frames, a new topic.'),
  { type: 'content', title: 'New question',
    bullets: [task('answer this new question on your own.', 'Use the same rule: name the part → give its specific job.', '5 min'), ladder.transfer.replace(/^“|”$/g, '')],
    feedback: write('Your answer.', 4),
    notes: `5 min. Same join, new content. If it does not transfer, check the new topic’s knowledge first.\nStronger evidence later: ${ladder.repair}` },
  { type: 'content', title: 'Finished early? Stretch',
    bullets: [stages.find(x => x.short === 'Explain').task, 'This is harder: say how the parts work together, not just what each one is.'],
    notes: `For those who finish. The demand changes from a job to a link between parts. This is command word ${stages.find(x => x.short === 'Explain').n} in Nodes, Explain.` },
  { type: 'content', title: 'Check against today',
    bullets: [task('tick each one you did in your new answer.', '', '1 min'), 'I named each part exactly.', 'I said what each part does, or what it holds.', 'I avoided labels and vague words.'],
    feedback: poll('Which do you need to practise most?', ['Knowing what each part does', 'Saying it exactly', 'None: I can do all three']),
    notes: '2 min. The poll is the next lesson’s starting point.' },
  { type: 'content', title: 'Homework',
    bullets: [`Answer this real exam question: ${marks.example.split(':').slice(1).join(':').trim().replace(/^describe/, 'Describe')}. [3 marks]`, `From ${marks.example.split(':')[0]}.`, 'Use the rule: name the part → give its specific job.'],
    notes: `1 min. One mark per component. Mark it next lesson against the published scheme.\n${sourceNotes}` },

  /* ------------------------------------------------ For the teacher */
  { type: 'table', title: 'For the teacher: what each answer shows',
    body: table([['Answer', 'Structure', 'Process to investigate', 'Probe'],
      ...readings.map(r => [({ A: 'Weak', B: 'Stable', C: 'Excellent' })[r.student], r.solo.split(/[:(]/)[0].trim(), r.bottleneck || 'None shown on this task', r.student === 'C' ? 'A fresh, independent task' : (students[r.student].feedback.match(/^“[^”]*”/) || [students[r.student].feedback])[0]])]),
    notes: 'Teacher-facing: hidden in the student copy. Readings of answers, not of minds: each is a possibility to test with its probe.\n' + readings.map(r => `${({ A: 'Weak', B: 'Stable', C: 'Excellent' })[r.student]}: ${r.gap}`).join('\n') },
  { type: 'table', title: `Examiner findings on “${research.findings.word}”, by kind`,
    body: table([['Kind of finding', 'Findings'], ...Object.entries(research.findings.types).slice(0, 6).map(([k, n]) => [FINDING_LABEL[k] || k, String(n)])]),
    notes: `Teacher-facing. ${research.findings.n} findings, not students. Kinds assigned with model help, not yet checked by teachers.` },
  { type: 'links', title: 'Sources for this lesson',
    bullets: [pair('This stage in Nodes', N.from), ...sources.flatMap(s => [s.ms && pair(`${s.label}: mark scheme (${s.qs.join(', ')})`, s.ms), s.er && pair(`${s.label}: examiners’ report`, s.er)]).filter(Boolean).slice(0, 7)],
    notes: 'Check each teaching claim against its source.' }
];

/* Nodes' own look (css/nodes.css, and the 'nodes' palette in the Lesson studio). */
const THEME = 'nodes';
const deck = SF.makeDeck(stage.task);
/* The id carries a hash of the content. The Lesson studio converts a lesson once and keeps that copy
   under the lesson's id, so a rebuilt lesson with new content needs a new id to be converted afresh;
   an unchanged rebuild keeps its id, and any edits made to it in the studio. */
const version = require('node:crypto').createHash('sha1').update(JSON.stringify({ theme: THEME, slides })).digest('hex').slice(0, 8);
Object.assign(deck, { id: `nodes-gcse-cs-2-${version}`, theme: THEME, sourceKey: 'nodes-gcse-cs-2', aspect: '16:9' });
/* Nothing builds unless a slide asks to: a build would dim the answer the class is repairing. */
deck.slides = slides.map((s, i) => Object.assign(SF.makeSlide(s.type), { id: `nodes-cs2-${version}-${String(i + 1).padStart(3, '0')}`, progressive: false }, s));
const out = SF.normalizeDeck(deck);

if (out.slides.length !== slides.length) throw new Error('SlideForge did not keep every slide');
slides.forEach((s, i) => {
  if (out.slides[i].type !== s.type) throw new Error(`slide ${i + 1} became ${out.slides[i].type}`);
  if (s.feedback && !out.slides[i].feedback) throw new Error(`slide ${i + 1} lost its feedback`);
});

/* Pictures travel inside the bundle, so it opens on any machine. */
const dataUri = file => `data:image/png;base64,${fs.readFileSync(path.join(root, file)).toString('base64')}`;
const embed = v => Array.isArray(v) ? v.map(embed) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, embed(x)]))
  : typeof v === 'string' && /^assets\/.*\.png$/.test(v) ? dataUri(v) : v;
const bundle = d => JSON.stringify({ kind: 'slideforge-bundle', version: 1, exported: new Date().toISOString(), decks: [embed(d)], games: [] }, null, 2) + '\n';
const dir = path.join(root, 'lessons/nodes');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'Nodes_CPU_Lesson.sfbundle.json'), bundle(out));

/* The student copy: the teacher-facing slides hidden, not removed. */
const student = JSON.parse(JSON.stringify(out));
student.id += '-student';
student.title += ' (student copy)';
student.slides.forEach(sl => { if (/^(For the teacher|Examiner findings)/.test(sl.title || '')) sl.hidden = true; });
fs.writeFileSync(path.join(dir, 'Nodes_CPU_Lesson_STUDENT.sfbundle.json'), bundle(student));

console.log(`${out.slides.length} slides, ${out.slides.filter(s => s.feedback).length} with phone answers · lessons/nodes/Nodes_CPU_Lesson.sfbundle.json`);
