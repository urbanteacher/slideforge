/* The CPU lesson: "Describe the main components of the CPU" (GCSE Computer Science, command word 2),
 * as a designed Lesson studio deck in the Nodes house style, built with kit.js. The words are the stage's
 * own (tools/nodes-lab/gcse-cs-2.json, exported by tools/export-stage-lesson.ts), and the CPU pictures are
 * the Nodes Plan view (assets/lesson/nodes/cpu-*.png), so the deck and the app say the same thing.
 *
 * A UK lesson shape (Rosenshine; the ITT and Early Career Framework): a Do Now that retrieves only earlier
 * learning; the objective, the question and a first attempt; the parts of the CPU; how to write the answer
 * (I do); the three answers (we do); a frame, then none (you do); the mark scheme; a new question, stretch,
 * plenary and homework; then the teacher's slides. Every task says what to do, how, and for how long, and
 * every question has an answer slide after it. The three answers are called weak, stable and excellent. */
const D = window.__nodesData;
const NAV = { tabs: ['Start', 'Learn', 'I do', 'We do', 'You do', 'Check'], label: 'Describe the CPU', caveat: '' };
const { stage, stages, recall, ladder, join, worked, students: stu, marks, readings, research, sources } = D;
const reading = (who) => readings.find(r => r.student === who);
const lines = (s) => s.split('\n').map(l => l.trim()).filter(Boolean);
const pic = (name) => D.cpu[name];

/* The six parts the answer covers: each one's specific role is the worked answer's own element; the plain
   words are for the class. `does` is true for the parts that do work, false for the ones that only hold. */
const PARTS = [
  { pic: 'control-unit', name: 'Control unit', role: worked.units[0], plain: 'It works out what each instruction means, then tells the other parts what to do, and when.', does: true },
  { pic: 'alu', name: 'ALU', long: 'Arithmetic logic unit', role: worked.units[1], plain: 'It does the maths (add, subtract) and the logic (compare two values, AND, OR).', does: true },
  { pic: 'registers', name: 'Registers', role: worked.units[2], plain: 'Tiny, very fast stores inside the CPU. Each one holds one thing the CPU is using right now.', does: false },
  { pic: 'pc', name: 'PC', long: 'Program counter', role: worked.units[3].replace(/^the PC /, ''), plain: 'An address is a location in memory. The PC holds the location of the next instruction.', does: false },
  { pic: 'cache', name: 'Cache', role: worked.units[4], plain: 'Small, fast memory that keeps what the CPU uses often, so it does not wait for main memory.', does: false },
  { pic: 'clock', name: 'Clock', role: worked.units[5], plain: 'It sends a steady pulse, a timing signal, that keeps every part working in step.', does: true },
];
const PART_COLOURS = [C.U, C.A, C.Cc, C.X, C.J, '#56b4e9'];
const LEVEL = { A: 'Weak answer', B: 'Stable answer', C: 'Excellent answer' };
const B_LINES = lines(stu.B.answer).map(l => [l.split(':')[0], l.slice(l.indexOf(':') + 1).trim()]);
const B_VERDICT = {
  'Control unit': [true, 'It names the two things the control unit does: it decodes instructions and sends control signals.'],
  ALU: [false, '“The brain” is a label. It does not say what the ALU does: arithmetic and logic.'],
  Registers: [false, '“Store data” could be any memory. Say what registers hold, and where.'],
  Cache: [false, '“Stores data” again. Say what it keeps, and why: so the CPU does not wait.'],
  Clock: [false, 'It sends timing signals. It does not “control the speed”.'],
};

/* A task: what to do, how, for how long. The same bar on every slide that asks the class to do something. */
const taskBar = (y, time, what, how = '', anim = onClick()) => [
  R(80, y, 1760, how ? 150 : 110, { radius: 18, fill: C.amber, stroke: C.Cc, strokeWidth: 3, name: 'Task bar' }, anim),
  R(110, y + 24, 190, 48, { radius: 24, fill: C.Cc, strokeWidth: 0, name: 'Time pill' }, after()),
  T(`TASK · ${time}`, 110, y + 33, 190, 30, { size: 21, weight: '800', align: 'center', color: C.ink, name: 'Time' }, after()),
  T(what, 330, y + 16, 1480, 70, { size: 38, weight: '800', lineHeight: 1.15, name: 'Task' }, after()),
  ...(how ? [T(how, 330, y + 90, 1480, 50, { size: 30, color: C.muted, name: 'How' }, after())] : []),
];
/* A numbered row, one click each. */
const row = (n, y, text, { h = 100, size = 38, anim = onClick(), fill = C.card, stroke = C.line, weight = '700', color = C.U } = {}) => [
  R(80, y, 1760, h, { radius: 16, fill, stroke, strokeWidth: 2, name: `Row ${n}` }, anim),
  dot(104, y + (h - 60) / 2, 60, color, String(n), after()),
  T(text, 190, y + (h - size * 1.25) / 2 - 2, 1620, h, { size, weight, lineHeight: 1.15, name: `Row text ${n}` }, after()),
];

/* ---------------------------------------------------------------- start */
S('Cover', [
  T('NODES · GCSE COMPUTER SCIENCE', 80, 250, 1700, 50, { size: 30, weight: '700', color: C.Cc, tracking: 0.12, name: 'Eyebrow' }, still),
  T(stage.task, 80, 320, 1700, 320, { size: 116, weight: '800', color: '#ffffff', lineHeight: 1.02, tracking: -0.02, name: 'Title' }, still),
  T(`Command word ${stage.n}: ${stage.short}. ${stage.ask}`, 80, 690, 1500, 70, { size: 46, color: '#c9d1e8', name: 'Subtitle' }, enter()),
  R(80, 820, 560, 64, { radius: 32, fill: C.U, strokeWidth: 0, name: 'Pill' }, enter()),
  T('50 minutes · UK lesson', 80, 832, 560, 40, { size: 28, weight: '800', align: 'center', color: '#ffffff', name: 'Pill label' }, enter()),
], { bg: C.ink, notes: `Aim: describe the CPU’s main components, each with its specific role, and know what that answer has to contain.\nFrom the Nodes stage: ${D.from}` });

S('Do Now', [...nav('Start'), eyebrow('Do Now · earlier learning only'), heading('Answer in your book.', 186, 64),
  ...taskBar(300, '3 min', 'Answer the three questions on your own.', 'No notes. Write the number, then your answer.', enter()),
  ...['What does CPU stand for?', 'In one sentence: what does the CPU do?', 'What is hardware?'].flatMap((q, i) => row(i + 1, 490 + i * 150, q, { anim: enter(), size: 44, h: 120 })),
], { notes: '3 min, on entry. Retrieval of earlier learning only: the Define lesson (command word 1) and earlier work on hardware. If the class has not met these, swap in three questions from their last lesson.' });
S('Do Now: answers', [...nav('Start'), eyebrow('Do Now · answers'), heading('Tick or correct, in a different colour.', 186, 56),
  ...[['What does CPU stand for?', 'Central Processing Unit'], ['What does the CPU do?', 'It executes (carries out) program instructions.'], ['What is hardware?', 'The physical parts of a computer system.']].flatMap(([q, a], i) => [
    R(80, 340 + i * 190, 1760, 160, { radius: 16, fill: C.card, stroke: C.line, strokeWidth: 2, name: `Row ${i + 1}` }, onClick()),
    T(`${i + 1}. ${q}`, 120, 358 + i * 190, 1680, 50, { size: 30, weight: '700', color: C.muted, name: 'Question' }, after()),
    T(a, 120, 410 + i * 190, 1680, 80, { size: 48, weight: '800', color: C.A, name: 'Answer' }, after()),
  ]),
], { notes: '1 min. Students tick or correct in a different colour. Answer 3 is the AQA mark scheme’s own (8525/2, June 2023, Q8.1: physical components of a computer system).' });

S('Today', [...nav('Start'), eyebrow('Today'), heading(`I can ${stage.task.charAt(0).toLowerCase()}${stage.task.slice(1, -1)}, each with its specific role.`, 186, 56),
  T('SUCCESS CRITERIA', 80, 440, 900, 36, { size: 24, weight: '800', color: C.muted, tracking: 0.1, name: 'Criteria label' }, still),
  ...['I name each part exactly.', 'I say what each part does, or what it holds.', 'I avoid labels like “the brain” and vague words like “stores data”.'].flatMap((t, i) => row(i + 1, 500 + i * 140, t, { anim: i ? after() : onClick(), size: 40, h: 110, color: C.A })),
], { notes: '1 min. Read the three success criteria aloud. Students check their own answers against them at the end.' });

S('The question', [...nav('Start'), eyebrow('The question we will answer'),
  T(stage.task, 80, 220, 1760, 260, { size: 100, weight: '800', lineHeight: 1.05, tracking: -0.02, name: 'Question' }, still),
  R(80, 560, 860, 300, { radius: 22, fill: C.blue, strokeWidth: 0, name: 'Command word card' }, onClick()),
  T('THE COMMAND WORD', 116, 590, 800, 34, { size: 22, weight: '800', color: C.U, tracking: 0.1, name: 'Label' }, after()),
  T('“Describe” means: say what each part is like, or what it does.', 116, 640, 790, 200, { size: 40, weight: '700', lineHeight: 1.15, name: 'Meaning' }, after()),
  R(980, 560, 860, 300, { radius: 22, fill: C.green, strokeWidth: 0, name: 'Outcome card' }, onClick()),
  T('YOUR ANSWER SHOULD GIVE', 1016, 590, 800, 34, { size: 22, weight: '800', color: C.A, tracking: 0.1, name: 'Label' }, after()),
  T(`${stage.outcome}.`, 1016, 640, 790, 200, { size: 40, weight: '700', lineHeight: 1.15, name: 'Outcome' }, after()),
  note('For this question: name each part, then give its job.', 900),
], { notes: '1 min. Point at the command word, then at “its specific role”: that phrase is the whole job.' });

S('Have a go first', [...nav('Start'), eyebrow('Have a go first'), heading(stage.task, 186, 64),
  ...taskBar(380, '3 min', 'Answer the question in your book.', 'Name each part you know and say what it does.', enter()),
  T('It is fine not to know yet: this shows where you are starting.', 80, 600, 1700, 60, { size: 40, weight: '700', name: 'Reassurance' }, onClick()),
  T('Keep it. You will compare it with your answer at the end.', 80, 690, 1700, 60, { size: 40, color: C.muted, name: 'Keep it' }, after()),
], { notes: '3 min. Collect, do not correct. Then ask of two answers: “What does that mean it actually does?” A student who can then say it has the knowledge and needs expression; one who cannot needs the content.' });

/* ---------------------------------------------------------------- learn */
divider('Learn', 'The parts of the CPU, one at a time, on the Nodes diagram: what each one is, and its exact job.');
S('Inside the CPU', [...nav('Learn'), eyebrow('Inside the CPU · 1 min'), heading('This is a plan of a CPU, seen from above.', 186, 52),
  IMG(pic('plan'), 980, 300, 860, 484, { name: 'CPU plan' }, enter()),
  T('You need six parts for this answer:', 80, 330, 860, 50, { size: 34, weight: '700', color: C.muted, name: 'Lead' }, enter()),
  ...PARTS.flatMap((p, i) => [
    dot(80, 410 + i * 80, 52, PART_COLOURS[i], '', onClick()),
    T(p.long ? `${p.name} (${p.long.toLowerCase()})` : p.name, 150, 416 + i * 80, 780, 56, { size: 36, weight: '700', name: p.name }, after()),
  ]),
  note('Main memory and the buses sit outside the CPU. They come into the new task at the end.', 900),
], { notes: '1 min. Let the class look. Point to each part as you name it. Main memory and the buses come into the new task at the end.' });
PARTS.forEach((p, i) => S(`${i + 1}. ${p.name}`, [...nav('Learn'), eyebrow(`Part ${i + 1} of 6 · 1 min`), heading(p.long ? `${p.name} (${p.long.toLowerCase()})` : p.name, 186, 64, 880),
  IMG(pic(p.pic), 980, 232, 860, 484, { name: `${p.name} on the plan` }, enter()),
  T('IN PLAIN WORDS', 80, 330, 860, 34, { size: 22, weight: '800', color: C.muted, tracking: 0.1, name: 'Label' }, still),
  T(p.plain, 80, 372, 860, 230, { size: 40, weight: '600', lineHeight: 1.2, name: 'Plain words' }, enter()),
  R(80, 640, p.does ? 300 : 340, 54, { radius: 27, fill: p.does ? C.A : C.Cc, strokeWidth: 0, name: 'Do or hold' }, onClick()),
  T(p.does ? 'It DOES something.' : 'It HOLDS something.', 80, 651, p.does ? 300 : 340, 34, { size: 25, weight: '800', align: 'center', color: p.does ? '#ffffff' : C.ink, name: 'Do or hold label' }, after()),
  R(80, 730, 1760, 220, { radius: 20, fill: C.blue, stroke: C.U, strokeWidth: 3, name: 'Exam wording card' }, onClick()),
  T('WRITE THIS IN YOUR BOOK · THE EXAM WORDING', 116, 752, 1700, 32, { size: 21, weight: '800', color: C.U, tracking: 0.1, name: 'Book label' }, after()),
  T(`${p.name}: ${p.role}.`, 116, 800, 1690, 130, { size: 40, weight: '800', lineHeight: 1.15, name: 'Exam wording' }, after()),
], { notes: '1 min. The plain words first, then the exam wording, which stays bright: students copy it into their book.' }));

S('Do or hold?', [...nav('Learn'), eyebrow('Does it DO something, or HOLD something?'), heading('Some parts do work. Registers only hold.', 186, 60),
  R(80, 360, 860, 380, { radius: 22, fill: C.green, strokeWidth: 0, name: 'Do card' }, onClick()),
  T('DO WORK', 116, 392, 780, 36, { size: 26, weight: '800', color: C.A, tracking: 0.1, name: 'Do label' }, after()),
  T('The control unit\nThe ALU\nThe clock', 116, 450, 780, 260, { size: 54, weight: '800', lineHeight: 1.25, name: 'Do list' }, after()),
  R(980, 360, 860, 380, { radius: 22, fill: C.amber, strokeWidth: 0, name: 'Hold card' }, onClick()),
  T('HOLD ONE THING', 1016, 392, 780, 36, { size: 26, weight: '800', color: '#9a6a00', tracking: 0.1, name: 'Hold label' }, after()),
  T('Registers\nThe PC\nCache', 1016, 450, 780, 260, { size: 54, weight: '800', lineHeight: 1.25, name: 'Hold list' }, after()),
  R(80, 780, 1760, 140, { radius: 18, fill: C.ink, strokeWidth: 0, name: 'Why card' }, onClick()),
  T('Why it matters: examiners mark “the MAR fetches data” wrong. A register holds. It never fetches.', 120, 806, 1680, 100, { size: 36, weight: '800', color: '#ffffff', lineHeight: 1.15, name: 'Why' }, after()),
], { notes: `2 min. Mixed up in ${research.apart.findings} examiner findings across ${research.apart.boards.join(', ')}: ${research.apart.title.toLowerCase()}.` });
S('Quick check', [...nav('Learn'), eyebrow('Quick check'), heading('The MAR (memory address register): does it DO something, or HOLD something?', 186, 56),
  ...taskBar(440, '1 min', 'Decide.', 'Vote on your phone, or hands up.', enter()),
  R(80, 640, 860, 200, { radius: 20, fill: C.card, stroke: C.line, strokeWidth: 3, name: 'Option A' }, onClick()),
  T('A: it does something', 80, 700, 860, 80, { size: 54, weight: '800', align: 'center', name: 'Option A label' }, after()),
  R(980, 640, 860, 200, { radius: 20, fill: C.card, stroke: C.line, strokeWidth: 3, name: 'Option B' }, after()),
  T('B: it holds something', 980, 700, 860, 80, { size: 54, weight: '800', align: 'center', name: 'Option B label' }, after()),
], { notes: '1 min. Then the answer slide.' });
S('Quick check: answer', [...nav('Learn'), eyebrow('Quick check · answer'), heading('B: the MAR holds something.', 186, 80),
  ...row(1, 440, 'It holds an address: where in memory the CPU is reading from or writing to.', { anim: onClick(), size: 40, h: 130, color: C.A }),
  ...row(2, 600, 'It does not fetch. The control unit directs the fetching.', { anim: onClick(), size: 40, h: 130, color: C.X }),
], { notes: '30 s.' });

/* ---------------------------------------------------------------- I do */
divider('I do', 'Watch me write the answer: the rule, the mistakes it avoids, and the answer built one part at a time.');
S('The rule', [...nav('I do'), eyebrow('The rule for this answer · 1 min'), heading('Name the part, then give its specific job.', 186, 64),
  ...chain(['name the part', 'give its specific job'], 80, 470, { h: 150, size: 54, gap: 90, widths: [680, 880], fill: '#ffffff', joinFirst: true }),
  ...['Do this for every part.', 'One part, one job, one line.', 'No more reasoning than the question asks for, and no less precision.'].map((t, i) => T(t, 80, 700 + i * 74, 1700, 60, { size: 38, weight: i === 2 ? '700' : '500', color: i === 2 ? C.ink : C.muted, name: `Rule ${i + 1}` }, onClick())),
], { notes: `1 min. This is the join Nodes gives for “describe components”: a pairing, not a chain of reasons. So the fix is precision, not more “because”.\n${join.rule}\nFrom the Nodes stage: ${D.from}` });
S('Answers that lose the mark', [...nav('I do'), eyebrow('Answers that lose the mark · 1 min'), heading('Three mistakes the mark schemes record.', 186, 56),
  ...[['A label', '“The CPU is the brain of the computer”', 'It does not say what it does.'],
    ['An action for a holder', '“The MAR fetches data”', 'Registers hold. They do not fetch.'],
    ['The wrong name', '“Main memory” when the question means RAM', 'Use the exact term the question needs.']].flatMap(([m, e, w], i) => [
    R(80, 320 + i * 220, 1760, 190, { radius: 18, fill: C.red, stroke: C.X, strokeWidth: 3, name: `Mistake ${i + 1}` }, onClick()),
    T(m.toUpperCase(), 116, 340 + i * 220, 1700, 32, { size: 22, weight: '800', color: C.X, tracking: 0.1, name: 'Mistake' }, after()),
    T(e, 116, 380 + i * 220, 1700, 60, { size: 42, weight: '800', name: 'Example' }, after()),
    T(w, 116, 448 + i * 220, 1700, 50, { size: 32, color: C.muted, name: 'Why' }, after()),
  ]),
], { notes: `1 min. Each is a refusal the mark schemes record. A mark scheme’s own warning to markers: “${join.quote.text}” (${join.quote.cite}).` });
S('Watch: the answer', [...nav('I do'), eyebrow('Watch: the answer, one part at a time · 3 min'), heading('Which part? What exactly does it do or hold?', 186, 52),
  ...PARTS.flatMap((p, i) => {
    const y = 330 + i * 106;
    return [
      R(80, y, 1760, 92, { radius: 14, fill: C.card, stroke: C.line, strokeWidth: 2, name: `Line ${p.name}` }, onClick()),
      dot(100, y + 16, 60, PART_COLOURS[i], String(i + 1), after()),
      T(`${p.name}: ${worked.units[i]}`, 190, y + 22, 1630, 70, { size: 31, weight: '700', lineHeight: 1.15, name: `Line text ${p.name}` }, after()),
    ];
  }),
], { notes: '3 min, one line per click. THINK ALOUD for each: “Which part? What exactly does it do or hold? Would these words fit any other part? Then they are not precise enough.”' });

/* ---------------------------------------------------------------- we do */
divider('We do', 'Three answers to the same question: a weak, a stable and an excellent one. We mark them, then repair the stable one.');
S('Three answers', [...nav('We do'), eyebrow('Three answers to the same question · 30 s'), heading('Weak → stable → excellent', 186, 80),
  ...[['A weak answer', 'Misses the point.', C.X, C.red], ['A stable answer', 'Some parts right, some not exact.', C.Cc, C.amber], ['An excellent answer', 'Every part with its exact job.', C.A, C.green]].flatMap(([h, t, c, f], i) => [
    R(X3(i), 400, 560, 360, { radius: 22, fill: f, stroke: c, strokeWidth: 3, name: `Card ${h}` }, onClick()),
    T(h, X3(i) + 36, 440, 490, 110, { size: 46, weight: '800', color: c === C.Cc ? '#9a6a00' : c, lineHeight: 1.1, name: 'Level' }, after()),
    T(t, X3(i) + 36, 570, 490, 150, { size: 38, weight: '600', lineHeight: 1.2, name: 'What it shows' }, after()),
  ]),
  note('They are made up, so we can practise marking them. In Nodes they are the three answers on the Question tab.', 900),
], { notes: '30 s. In Nodes these are the weak, stable and excellent answers on the Question tab.' });
function X3(i) { return 80 + i * 600; }
S('The weak answer', [...nav('We do'), eyebrow('The weak answer'), heading('Read it.', 186, 56),
  R(80, 340, 1760, 200, { radius: 22, fill: C.red, stroke: C.X, strokeWidth: 3, name: 'Answer card' }, enter()),
  T(stu.A.answer, 120, 380, 1680, 120, { size: 72, weight: '800', lineHeight: 1.1, name: 'Weak answer' }, enter()),
  ...taskBar(640, '1 min', 'With your partner, say what is wrong with it.', 'Be ready to say why.', onClick()),
], { notes: `1 min. Take two answers, then the next slide.\n${reading('A').gap}` });
S('The weak answer: what is wrong', [...nav('We do'), eyebrow('The weak answer · what is wrong · 1 min'), heading('A hard drive and RAM are not parts of the CPU.', 186, 64),
  ...row(1, 440, 'They are storage and memory, outside the CPU.', { size: 40, h: 120, color: C.X }),
  ...row(2, 590, 'It needs the CPU’s own parts, each with its job.', { size: 40, h: 120, color: C.X }),
  ...row(3, 740, `Ask the writer: ${(stu.A.feedback.match(/^“[^”]*”/) || [stu.A.feedback])[0]}`, { size: 34, h: 130, color: C.A }),
], { notes: '1 min.' });
S('The stable answer', [...nav('We do'), eyebrow('The stable answer · 1.5 min'), heading('Which lines give the exact job?', 186, 60),
  ...B_LINES.flatMap(([p, t], i) => [
    R(80, 330 + i * 100, 1760, 88, { radius: 14, fill: C.card, stroke: C.line, strokeWidth: 2, name: `Line ${p}` }, enter()),
    T(p, 110, 350 + i * 100, 330, 56, { size: 34, weight: '800', color: C.muted, name: 'Part' }, enter()),
    T(t, 450, 350 + i * 100, 1360, 56, { size: 34, weight: '600', name: 'Line' }, enter()),
  ]),
  ...taskBar(850, '1 min', 'Decide for each line: exact job, or not? Then vote.', '', onClick()),
], { notes: '1.5 min. Students read each line and decide: exact job, or not? Then vote on how many give the exact job.' });
S('The stable answer: marked', [...nav('We do'), eyebrow('The stable answer · marked · 1 min'), heading('One line is right: the control unit.', 186, 60),
  ...B_LINES.flatMap(([p], i) => {
    const [ok, why] = B_VERDICT[p];
    const y = 330 + i * 120;
    return [
      R(80, y, 1760, 104, { radius: 14, fill: ok ? C.green : C.red, stroke: ok ? C.A : C.X, strokeWidth: 3, name: `Verdict ${p}` }, onClick()),
      T(p, 110, y + 30, 270, 50, { size: 34, weight: '800', name: 'Part' }, after()),
      R(390, y + 28, 190, 48, { radius: 24, fill: ok ? C.A : C.X, strokeWidth: 0, name: 'Verdict pill' }, after()),
      T(ok ? '✓ Exact job' : '✗ Not exact', 390, y + 36, 190, 32, { size: 22, weight: '800', align: 'center', color: '#ffffff', name: 'Verdict' }, after()),
      T(why, 610, y + 16, 1210, 80, { size: 29, weight: '600', lineHeight: 1.15, name: 'Why' }, after()),
    ];
  }),
], { notes: `1 min. One line is right: the control unit.\n${stu.B.why}` });
S('Fix the stable answer', [...nav('We do'), eyebrow('Fix the stable answer · 2 min'), heading('Give each wrong line its exact job.', 186, 60),
  ...taskBar(320, '2 min', 'Rewrite the four wrong lines in your book.', 'Give each part its exact job, with no labels.', enter()),
  ...['ALU: …', 'Registers: …', 'Cache: …', 'Clock: …'].flatMap((t, i) => row(i + 1, 520 + i * 120, t, { size: 44, h: 100, color: C.Cc, weight: '800', anim: onClick() })),
], { notes: '2 min. The fix is precision, not reasoning: adding “because” would not fix “the brain of the CPU”.' });
S('The excellent answer', [...nav('We do'), eyebrow('The excellent answer · 1 min'), heading('Compare it with your fixed lines, one by one.', 186, 56),
  ...PARTS.flatMap((p, i) => {
    const y = 330 + i * 106;
    return [
      R(80, y, 1760, 92, { radius: 14, fill: C.green, stroke: C.A, strokeWidth: 2, name: `Line ${p.name}` }, onClick()),
      dot(100, y + 16, 60, PART_COLOURS[i], String(i + 1), after()),
      T(`${p.name}: ${worked.units[i]}`, 190, y + 22, 1630, 70, { size: 31, weight: '700', lineHeight: 1.15, name: `Line text ${p.name}` }, after()),
    ];
  }),
], { notes: '1 min. Compare it with your fixed lines, one by one.' });

/* ---------------------------------------------------------------- you do */
divider('You do', 'First with a frame to fill in, then the same question with nothing to lean on.');
S('Fill in the frame', [...nav('You do'), eyebrow('Fill in the frame · 2 min'), heading('Copy the table. Complete each row.', 186, 60),
  ...taskBar(300, '2 min', 'Give each part its specific job.', 'Check: would your words fit any other part? Then make them more exact.', enter()),
  ...PARTS.flatMap((p, i) => [
    R(80, 500 + i * 76, 1760, 64, { radius: 12, fill: C.card, stroke: C.line, strokeWidth: 2, name: `Frame ${p.name}` }, enter()),
    T(p.name, 110, 510 + i * 76, 420, 46, { size: 34, weight: '800', name: 'Part' }, enter()),
    T('…', 560, 506 + i * 76, 1200, 50, { size: 40, color: C.muted, name: 'Blank' }, enter()),
  ]),
], { notes: '2 min. Task: copy the table and complete each row. Check: would your words fit any other part? Then make them more exact.' });
S('Now without the frame', [...nav('You do'), eyebrow('Now without the frame · 3 min'), heading(stage.task, 186, 72),
  ...taskBar(400, '3 min', 'Answer the question again, without the frame or your notes.', 'Cover the frame.', enter()),
  T('Then check: does every part have its own job?', 80, 640, 1700, 70, { size: 46, weight: '800', color: C.A, name: 'Check' }, onClick()),
], { notes: '3 min. Frame hidden, models hidden.' });

/* ---------------------------------------------------------------- check */
divider('Check', 'Mark it like an examiner, then a new question with no models and no frames.');
S('How the marks are awarded', [...nav('Check'), eyebrow('How the marks are awarded · 2 min'), heading('1 mark for each part with its exact job.', 186, 60),
  ...row(1, 340, 'Labels like “controls the computer” or “fast memory” get no mark.', { size: 38, h: 120, color: C.X }),
  ...taskBar(500, '1 min', 'Mark your answer: 1 mark per part with its exact job.', 'Write your score at the top.', onClick()),
  note(`A real example: ${marks.example}.`, 740),
], { notes: `2 min. ${marks.pattern[2].example}` });
S('What examiners saw', [...nav('Check'), eyebrow('What examiners saw in real answers · 2 min'), heading(marks.example.split(':')[0], 186, 52),
  R(80, 340, 860, 430, { radius: 22, fill: C.red, stroke: C.X, strokeWidth: 3, name: 'Weaker card' }, onClick()),
  T('WEAKER ANSWERS', 116, 372, 780, 34, { size: 24, weight: '800', color: C.X, tracking: 0.1, name: 'Weaker label' }, after()),
  T(marks.weak, 116, 430, 790, 320, { size: 38, weight: '600', lineHeight: 1.2, name: 'Weaker' }, after()),
  R(980, 340, 860, 430, { radius: 22, fill: C.green, stroke: C.A, strokeWidth: 3, name: 'Stronger card' }, onClick()),
  T('STRONGER ANSWERS', 1016, 372, 780, 34, { size: 24, weight: '800', color: C.A, tracking: 0.1, name: 'Stronger label' }, after()),
  T(marks.strong, 1016, 430, 790, 320, { size: 38, weight: '600', lineHeight: 1.2, name: 'Stronger' }, after()),
  T('Which side is your answer on?', 80, 830, 1760, 70, { size: 48, weight: '800', name: 'Ask' }, onClick()),
], { notes: '2 min. From the examiners’ report for that paper.\nASK: “Which side is your answer on?”' });
S('New question', [...nav('Check'), eyebrow('A new question · 5 min'), heading(ladder.transfer.replace(/^“|”$/g, ''), 186, 60),
  ...taskBar(440, '5 min', 'Answer this new question on your own.', 'Use the same rule: name the part, then give its specific job.', enter()),
  note('No models, no frames, a new topic.', 700),
], { notes: `5 min. Same join, new content. If it does not transfer, check the new topic’s knowledge first.\nStronger evidence later: ${ladder.repair}` });
S('Stretch', [...nav('Check'), eyebrow('Finished early? Stretch'), heading(stages.find(x => x.short === 'Explain').task, 186, 64),
  R(80, 460, 1760, 200, { radius: 22, fill: C.blue, stroke: C.U, strokeWidth: 3, name: 'Stretch card' }, onClick()),
  T('This is harder: say how the parts work together, not just what each one is.', 120, 500, 1680, 130, { size: 46, weight: '800', lineHeight: 1.15, name: 'Stretch' }, after()),
], { notes: `For those who finish. The demand changes from a job to a link between parts. This is command word ${stages.find(x => x.short === 'Explain').n} in Nodes, Explain.` });
S('Check against today', [...nav('Check'), eyebrow('Check against today · 2 min'), heading('Tick each one you did in your new answer.', 186, 60),
  ...['I named each part exactly.', 'I said what each part does, or what it holds.', 'I avoided labels and vague words.'].flatMap((t, i) => row(i + 1, 340 + i * 130, t, { size: 40, h: 110, color: C.A })),
  ...taskBar(740, '1 min', 'Which do you need to practise most?', 'Knowing what each part does · Saying it exactly · None: I can do all three', onClick()),
], { notes: '2 min. The poll is the next lesson’s starting point.' });
S('Homework', [...nav('Check'), eyebrow('Homework'), heading('Answer this real exam question.', 186, 64),
  R(80, 360, 1760, 260, { radius: 22, fill: C.card, stroke: C.line, strokeWidth: 2, name: 'Question card' }, enter()),
  T(`${marks.example.split(':').slice(1).join(':').trim().replace(/^describe/, 'Describe')}. [3 marks]`, 120, 400, 1680, 180, { size: 52, weight: '800', lineHeight: 1.15, name: 'Exam question' }, enter()),
  T(`From ${marks.example.split(':')[0]}.`, 80, 660, 1700, 50, { size: 32, color: C.muted, name: 'Source' }, enter()),
  T('Use the rule: name the part, then give its specific job.', 80, 740, 1700, 60, { size: 40, weight: '800', color: C.A, name: 'Rule' }, onClick()),
], { notes: '1 min. One mark per component. Mark it next lesson against the published scheme.' });

/* ---------------------------------------------------------------- for the teacher */
S('For the teacher: what each answer shows', [...nav('Check'), eyebrow('For the teacher · hidden from the class'), heading('Readings of answers, not of minds: each is a possibility to test with its probe.', 186, 44),
  ...readings.flatMap((r, i) => {
    const y = 360 + i * 200;
    return [
      R(80, y, 1760, 180, { radius: 18, fill: C.card, stroke: C.line, strokeWidth: 2, name: `Reading ${r.student}` }, onClick()),
      T(LEVEL[r.student], 110, y + 20, 400, 44, { size: 32, weight: '800', color: [C.X, C.Cc, C.A][i] === C.Cc ? '#9a6a00' : [C.X, C.Cc, C.A][i], name: 'Answer' }, after()),
      T(r.solo.split(/[:(]/)[0].trim(), 110, y + 70, 400, 44, { size: 28, weight: '700', color: C.muted, name: 'Structure' }, after()),
      T(`Process to investigate: ${r.bottleneck || 'none shown on this task'}`, 540, y + 20, 1260, 44, { size: 28, weight: '700', name: 'Process' }, after()),
      T(r.student === 'C' ? 'Probe: a fresh, independent task.' : `Probe: ${(stu[r.student].feedback.match(/^“[^”]*”/) || [stu[r.student].feedback])[0]}`, 540, y + 76, 1260, 90, { size: 28, color: C.muted, lineHeight: 1.15, name: 'Probe' }, after()),
    ];
  }),
], { notes: 'Teacher-facing. Readings of answers, not of minds: each is a possibility to test with its probe.\n' + readings.map(r => `${LEVEL[r.student]}: ${r.gap}`).join('\n') });
{
  const FINDING_LABEL = { strong_answer: 'Strong answer', misconception: 'Misconception', imprecise_wording: 'Imprecise wording', found_difficult: 'Found difficult', stuck_at_level: 'Stopped short', slip_or_calculation_error: 'Slip or calculation error' };
  const kinds = Object.entries(research.findings.types).slice(0, 6);
  S(`Examiner findings on “${research.findings.word}”`, [...nav('Check'), eyebrow('For the teacher · examiner findings'), heading(`${research.findings.n} findings on “${research.findings.word}”, by kind.`, 186, 56),
    ...kinds.flatMap(([k, n], i) => {
      const y = 340 + i * 100, w = Math.round(1000 * n / kinds[0][1]);
      return [
        T(FINDING_LABEL[k] || k, 80, y + 16, 520, 50, { size: 34, weight: '700', name: 'Kind' }, enter()),
        R(620, y + 8, w, 66, { radius: 14, fill: i ? '#9bbfd9' : C.U, strokeWidth: 0, name: `Bar ${k}` }, enter()),
        T(String(n), 640 + w, y + 14, 140, 50, { size: 36, weight: '800', name: 'Count' }, enter()),
      ];
    }),
    note('Findings, not students. Kinds assigned with model help, not yet checked by teachers.', 960),
  ], { notes: `Teacher-facing. ${research.findings.n} findings, not students. Kinds assigned with model help, not yet checked by teachers.` });
}
{
  const links = [['This stage in Nodes', D.from], ...sources.flatMap(s => [s.ms && [`${s.label}: mark scheme (${s.qs.join(', ')})`, s.ms], s.er && [`${s.label}: examiners’ report`, s.er]]).filter(Boolean).slice(0, 7)];
  S('Sources', [...nav('Check'), eyebrow('Sources'), heading('Check each teaching claim against its source.', 186, 56),
    ...links.flatMap(([label, url], i) => {
      const l = T(`${label} ↗`, i < 4 ? 80 : 980, 320 + (i % 4) * 130, 860, 100, { size: 28, weight: '700', color: C.U, underline: true, lineHeight: 1.15, name: `Link ${i + 1}` }, enter());
      l.interact = { ...l.interact, click: 'link', url };
      return [l];
    }),
  ], { notes: links.map(([l, u]) => `${l}: ${u}`).join('\n') });
}

window.__deck = { id: 'nodes-cpu-lesson', libraryGroup: 'nodes', title: stage.task, width: 1920, height: 1080, version: 1, slides };
