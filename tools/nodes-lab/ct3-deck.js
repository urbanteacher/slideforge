/* Critical Text Analysis, stage 3, built with kit.js. */
const D = window.__nodesData;
const NAV = { tabs: ['Recall', 'Question', 'How to answer', 'Mark scheme', 'Analysis'], label: 'Critical Text Analysis · Stage 3 of 8',
  caveat: 'The examiner-report research is computer science only. Critical text analysis has no reports of its own, so these findings come from computer science papers and are not yet known for this subject.' };
const TABS = NAV.tabs;

/* ================================================================ the slides */
const st = D.stage, j = D.join, wk = D.worked, stu = D.students, lad = D.ladder, rec = D.recall;

/* ---------------------------------------------------------------- cover */
S('Cover', [
  T('CRITICAL TEXT ANALYSIS · STAGE 3 OF 8', 80, 250, 1700, 50, { size: 30, weight: '700', color: C.Cc, tracking: 0.12, name: 'Eyebrow' }, fadeIn()),
  T('Abstraction: key text or what is missing', 80, 320, 1500, 330, { size: 120, weight: '800', color: '#ffffff', lineHeight: 1.02, tracking: -0.02, name: 'Title' }, enter()),
  T(st.ask, 80, 680, 1500, 80, { size: 50, color: '#c9d1e8', name: 'Ask' }, enter({ delay: 0.2 })),
  R(80, 800, 420, 64, { radius: 32, fill: C.Cc, strokeWidth: 0, name: 'Backbone pill' }, fadeIn({ delay: 0.4 })),
  T('C · Compare and analyse', 80, 812, 420, 40, { size: 28, weight: '800', align: 'center', color: C.ink, name: 'Backbone' }, fadeIn({ delay: 0.4 })),
  ...TABS.flatMap((t, i) => [T(`${i + 1}  ${t}`, 80 + i * 340, 960, 330, 40, { size: 26, weight: '700', color: '#9aa6c4', name: `Sequence ${t}` }, after({ delay: i ? 0.05 : 0.6 }))]),
], { bg: C.ink, notes: `Critical Text Analysis, stage 3 of 8. ${st.ask}\nThe lesson follows the stage's tabs in order: Recall, Question, How to answer, Mark scheme, Analysis.\n${D.from}` });

/* ---------------------------------------------------------------- the Nodes formula */
/* Linkage matched to the task: each kind of question asks for a different relationship, not one
   universal "because → so". This stage weighs two routes by a criterion to reach a choice: a judgement. */
{
  const ROWS = [
    ['Definition', 'a term', 'its precise meaning', C.U],
    ['Description', 'a component', 'its specific role', C.U],
    ['Explanation', 'a claim', 'the mechanism or consequence that explains it', C.A],
    ['Evaluation', 'evidence and criteria', 'a judgement', C.Cc],
  ];
  const HERE = 'Evaluation';
  S('The Nodes formula', [
    T('THE NODES FORMULA', 80, 70, 1700, 40, { size: 28, weight: '800', color: C.Cc, tracking: 0.12, name: 'Eyebrow' }, still),
    T('Linkage matched to the task', 80, 118, 1760, 100, { size: 80, weight: '800', color: '#ffffff', tracking: -0.02, name: 'Heading' }, still),
    T('Each kind of question asks for a different relationship, not one universal “because → so”.', 80, 230, 1760, 60, { size: 38, color: '#c9d1e8', name: 'Subheading' }, still),
    ...ROWS.flatMap(([kind, from, to, col], i) => {
      const y = 340 + i * 132, here = kind === HERE;
      const first = onClick(), rest = after();
      return [
        R(80, y, 1760, 112, { radius: 18, fill: here ? '#2a2412' : '#202a45', stroke: here ? C.Cc : '#2f3a5c', strokeWidth: here ? 3 : 2, name: `Row ${kind}` }, first),
        T(kind, 120, y + 32, 340, 50, { size: 42, weight: '800', color: ({ [C.U]: '#56b4e9', [C.A]: '#3ccf9f' })[col] ?? col, name: `Kind ${kind}` }, rest),
        T('connect', 470, y + 38, 160, 40, { size: 30, color: '#9aa6c4', name: 'connect' }, rest),
        R(620, y + 22, 440, 68, { radius: 14, fill: '#ffffff', strokeWidth: 0, name: `From ${kind}` }, rest),
        T(from, 620, y + 36, 440, 44, { size: 32, weight: '800', align: 'center', name: `From text ${kind}` }, rest),
        T('→', 1070, y + 30, 70, 54, { size: 44, weight: '800', align: 'center', color: ({ [C.U]: '#56b4e9', [C.A]: '#3ccf9f' })[col] ?? col, name: 'Arrow' }, rest),
        R(1150, y + 22, 650, 68, { radius: 14, fill: col, strokeWidth: 0, name: `To ${kind}` }, rest),
        T(to, 1170, y + 36, 610, 44, { size: 30, weight: '800', align: 'center', color: col === C.Cc ? C.ink : '#ffffff', name: `To text ${kind}` }, rest),
        ...(here ? [T('THIS STAGE', 120, y + 84, 340, 24, { size: 18, weight: '800', color: C.Cc, tracking: 0.1, name: 'This stage' }, rest)] : []),
      ];
    }),
    T('Nodes explicitly teaches the relationships students must express to turn available knowledge into a complete answer, then checks whether they can construct those relationships independently.', 80, 890, 1760, 120, { size: 34, weight: '600', color: '#ffffff', lineHeight: 1.3, name: 'Positioning' }, onClick()),
  ], { bg: C.ink, notes: 'The Nodes formula: linkage matched to the task.\nDefinition: connect a term with its precise meaning.\nDescription: connect a component with its specific role.\nExplanation: connect a claim with the mechanism or consequence that explains it.\nEvaluation: connect evidence and criteria to a judgement.\nThese are different relationships, not one universal “because → so” formula.\nThis stage is an evaluation: two routes weighed by which gives stronger evidence for the question, then a choice.\nNodes explicitly teaches the relationships students must express to turn available knowledge into a complete answer, then checks whether they can construct those relationships independently.' });
}

/* ---------------------------------------------------------------- before, during, after */
/* Answer construction made visible at each point of the attempt: linkage is what students learn to
   recognise, express and check. The process taught; whether it causes better learning is the research question. */
S('Before, during, after', [
  T('ANSWER CONSTRUCTION, MADE VISIBLE', 80, 70, 1700, 40, { size: 28, weight: '800', color: C.Cc, tracking: 0.12, name: 'Eyebrow' }, still),
  T('Before, during and after the attempt', 80, 118, 1760, 100, { size: 76, weight: '800', color: '#ffffff', tracking: -0.02, name: 'Heading' }, still),
  T('Linkage is what students learn to recognise, express and check.', 80, 226, 1760, 56, { size: 38, color: '#c9d1e8', name: 'Subheading' }, still),
  ...[
    ['BEFORE', 'What must I bring together?', 'What the question requires, and which ideas or relationships belong in the answer.', '#56b4e9'],
    ['DURING', 'How do these parts form a complete answer?', 'How to build the response, using labelled examples, contrasts and prompts.', '#3ccf9f'],
    ['AFTER', 'What is missing, and can I now supply it myself?', 'What is accurate, missing or insufficiently connected; then a repair and an independent reattempt.', C.Cc],
  ].flatMap(([when, q, what, col], i) => {
    const x = 80 + i * 600;
    return [
      R(x, 320, 560, 520, { radius: 22, fill: '#202a45', stroke: '#2f3a5c', strokeWidth: 2, name: `Card ${when}` }, onClick()),
      R(x, 320, 560, 10, { radius: 0, fill: col, strokeWidth: 0, name: `Top ${when}` }, after()),
      T(when, x + 40, 360, 480, 40, { size: 28, weight: '800', color: col, tracking: 0.12, name: `When ${when}` }, after()),
      T(q, x + 40, 414, 480, 200, { size: 46, weight: '800', color: '#ffffff', lineHeight: 1.12, name: `Question ${when}` }, after()),
      T('Nodes makes visible', x + 40, 640, 480, 34, { size: 22, weight: '700', color: '#9aa6c4', tracking: 0.04, name: `Label ${when}` }, after()),
      T(what, x + 40, 678, 480, 150, { size: 28, color: '#c9d1e8', name: `What ${when}` }, after()),
    ];
  }),
  T('“Nodes makes the construction of a complete answer visible: identifying the required relationships, expressing them, and checking them independently.”', 80, 878, 1760, 100, { size: 34, weight: '600', color: '#ffffff', lineHeight: 1.3, name: 'Positioning' }, onClick()),
  T('The process Nodes teaches students to use. Whether it causes better learning is the research question to test.', 80, 990, 1760, 40, { size: 22, color: '#9aa6c4', name: 'Research note' }, after()),
], { bg: C.ink, notes: 'Answer construction, made visible before, during and after the attempt. Linkage is what students learn to recognise, express and check.\nBefore: what the question requires and which ideas or relationships belong in the answer. Student asks: what must I bring together?\nDuring: how to build the response, using labelled examples, contrasts and prompts. Student asks: how do these parts form a complete answer?\nAfter: what is accurate, missing or insufficiently connected; then a repair and an independent reattempt. Student asks: what is missing, and can I now supply it myself?\nFor Define, the link is a term paired with its precise meaning. For Explain, it might be a cause connected to its consequence. The required relationship changes with the task.\n“Nodes makes the construction of a complete answer visible: identifying the required relationships, expressing them, and checking them independently.”\nThe mechanism is the process taught; whether it causes better learning remains the research question.' });

/* ---------------------------------------------------------------- Recall */
divider('Recall', 'What to retrieve before you start: the terms this question rests on.');
{
  const rows = rec.items;
  const top = 300, rh = 104;
  const layers = [...nav('Recall'), eyebrow('Knowledge to recall first'), heading(rec.question, 186, 56),
    R(80, top - 20, 1760, rows.length * rh + 70, {}, fadeIn()),
    T('KNOWLEDGE TO RECALL', 120, top, 420, 34, { size: 22, weight: '700', color: C.muted, tracking: 0.06 }, fadeIn()),
    T('WHAT YOU SHOULD KNOW', 560, top, 640, 34, { size: 22, weight: '700', color: C.muted, tracking: 0.06 }, fadeIn()),
    T('WHY IT MATTERS HERE', 1240, top, 560, 34, { size: 22, weight: '700', color: C.muted, tracking: 0.06 }, fadeIn())];
  rows.forEach((r, i) => {
    const y = top + 50 + i * rh;
    if (i) layers.push(R(120, y - 10, 1680, 2, { radius: 0, fill: C.tint, strokeWidth: 0, name: 'Rule' }, fadeIn()));
    if (r.used) layers.push(R(100, y - 4, 8, rh - 20, { radius: 4, fill: C.U, strokeWidth: 0, name: 'Used bar' }, fadeIn()));
    layers.push(T(r.term, 120, y, 420, 50, { size: 32, weight: '800' }, after({ delay: 0.05 })));
    if (r.used) layers.push(T('USED BY THIS STAGE', 120, y + 44, 420, 30, { size: 19, weight: '800', color: C.U, tracking: 0.06, name: 'Used' }, after({ delay: 0 })));
    layers.push(T(r.meaning, 560, y, 640, rh - 16, { size: 28 }, after({ delay: 0 })));
    layers.push(T(r.use, 1240, y, 560, rh - 16, { size: 28, color: C.muted }, after({ delay: 0 })));
  });
  S('Knowledge to recall first', layers, { notes: rows.map(r => `${r.term}${r.used ? ' (used by this stage)' : ''}: ${r.meaning} Why it matters: ${r.use}`).join('\n') });
}
S('Check recall first', [...nav('Recall'), eyebrow('Check recall first'), heading('Answer from memory, then check.', 186, 64),
  ...rec.checks.flatMap((q, i) => [dot(80, 360 + i * 120, 72, C.ink, String(i + 1), onClick()), T(q, 190, 368 + i * 120, 1500, 70, { size: 44, weight: '600' }, after({ delay: 0 }))]),
  R(80, 860, 1760, 120, { fill: C.green, stroke: C.A, strokeWidth: 0, radius: 18 }, onClick()),
  R(80, 860, 10, 120, { fill: C.A, strokeWidth: 0, radius: 0, name: 'Accent' }, after({ delay: 0 })),
  T('THEN APPLY IT', 120, 874, 400, 30, { size: 22, weight: '800', color: C.A, tracking: 0.08 }, after({ delay: 0 })),
  T(rec.bridge, 120, 908, 1680, 60, { size: 40, weight: '700' }, after({ delay: 0 })),
], { notes: `Check recall first:\n${rec.checks.map((q, i) => `${i + 1}. ${q}`).join('\n')}\nThen apply it: ${rec.bridge}` });

/* ---------------------------------------------------------------- Question */
divider('Question', 'What is asked, and answer content: whether a response is accurate and complete.');
/* The case: the advert, and its back, turned over by a click (the lab's flip to facts). */
{
  const s = S('The case: a laptop advert', [...nav('Question'), eyebrow('The case: a laptop advert'),
    heading('Look closely. What does it say, and what does it leave out?', 186, 52, 1760),
    IMG(D.svg.front, 80, 330, 1120, 700, { name: 'Velox 14 advert' }, enter({ type: 'zoomIn' })),
    R(1260, 360, 580, 84, { radius: 42, fill: C.ink, strokeWidth: 0, name: 'Turn over button' }, fadeIn({ delay: 0.5 })),
    T('↻  Turn over for the specs', 1260, 380, 580, 44, { size: 32, weight: '800', color: '#ffffff', align: 'center', name: 'Turn over' }, fadeIn({ delay: 0.5 })),
    T('Click the advert, or the button, to turn it over: the back of the box shows what the front chose not to say.', 1260, 480, 580, 200, { size: 30, color: C.muted, name: 'How to turn' }, fadeIn({ delay: 0.6 })),
  ], { notes: 'The case: the Velox 14 advert. 5.2 GHz* of pure power. Faster than you’ll ever need. £899. *Up to 5.2 GHz in Turbo mode. Performance varies by workload.\nClick the advert or the button to turn it over: the specification sheet the front leaves out.' });
  for (const l of s.layers) if (/^(Velox 14 advert|Turn over)/.test(l.name)) l.interact = { ...l.interact, click: 'flip' };
  const back = IMG(D.svg.back, 80, 330, 1120, 700, { name: 'Velox 14 specifications' }, fadeIn());
  back.face = 'back'; back.interact = { ...back.interact, click: 'flip' };
  const backBtn = R(1260, 360, 580, 84, { radius: 42, fill: C.Cc, strokeWidth: 0, name: 'Turn back button' }, fadeIn());
  const backTxt = T('↻  Turn back to the advert', 1260, 380, 580, 44, { size: 32, weight: '800', color: C.ink, align: 'center', name: 'Turn back' }, fadeIn());
  for (const l of [backBtn, backTxt]) { l.face = 'back'; l.interact = { ...l.interact, click: 'flip' }; }
  s.layers.push(back, backBtn, backTxt);
}
S('Question', [...nav('Question'), eyebrow('Question'),
  R(80, 200, 1760, 250, { fill: C.blue, strokeWidth: 0, radius: 18 }, fadeIn()),
  R(80, 200, 14, 250, { fill: C.U, strokeWidth: 0, radius: 0, name: 'Accent' }, fadeIn()),
  T(st.task, 130, 238, 1660, 180, { size: 66, weight: '800', lineHeight: 1.1, name: 'The question' }, enter()),
  T('Your answer should give:', 80, 500, 520, 50, { size: 36, weight: '800', color: C.muted }, onClick()),
  T(st.outcome, 520, 500, 1300, 50, { size: 36, color: C.muted }, after({ delay: 0 })),
  R(80, 600, 190, 52, { radius: 10, fill: '#f7e7c4', strokeWidth: 0, name: 'Requires pill' }, onClick()),
  T('REQUIRES', 80, 610, 190, 34, { size: 24, weight: '800', align: 'center', tracking: 0.06 }, after({ delay: 0 })),
  T(`${D.research.relationship.label}.`, 300, 600, 600, 56, { size: 40, weight: '800' }, after({ delay: 0 })),
  T(D.research.relationship.requires, 300, 660, 1500, 56, { size: 36 }, after({ delay: 0 })),
  T(`Often seen instead: ${D.research.relationship.difficulty.charAt(0).toLowerCase()}${D.research.relationship.difficulty.slice(1)}`, 300, 730, 1500, 100, { size: 32, color: C.muted }, onClick()),
], { notes: `Question: ${st.task}\nYour answer should give: ${st.outcome}\nRequires: ${D.research.relationship.label}. ${D.research.relationship.requires}\nOften seen instead: ${D.research.relationship.difficulty}` });
S('Before you answer', [...nav('Question'), eyebrow('Before you answer'), heading('Three checks before you write.', 186, 64),
  ...[
    ['What is it really asking?', 'Find the command word first. This practice question carries no marks, so size the answer from its join (explain, argue, compare or judge, extended answer). In an exam, the marks tell you how far to go.'],
    ['Use the case.', 'Every point should name something from it. A true fact that ignores the case can score nothing.'],
    ['Don’t hand the question back.', 'Repeating its wording, or copying labels from the source, is not an answer.'],
  ].flatMap(([h, t], i) => [
    dot(80, 340 + i * 190, 80, C.ink, String(i + 1), onClick()),
    T(h, 200, 340 + i * 190, 1600, 54, { size: 42, weight: '800' }, after({ delay: 0 })),
    T(t, 200, 398 + i * 190, 1600, 110, { size: 32, color: C.muted }, after({ delay: 0 })),
  ]),
  note('The reports record 356 exam-technique findings, 94 of answers not applied to the scenario and 66 on misusing the information given. Findings, not students.'),
], { notes: 'Before you answer: 1. What is it really asking? 2. Use the case. 3. Don’t hand the question back.' });
S('Join it up', [...nav('Question'), eyebrow('Join it up', 140, C.A), heading(j.rule, 186, 46),
  R(80, 330, 1050, 60, { radius: 12, fill: C.green, strokeWidth: 0, name: 'Size pill' }, fadeIn()),
  T(j.size, 100, 342, 1010, 40, { size: 28, weight: '800' }, fadeIn()),
  T('The join this question needs:', 80, 440, 1000, 50, { size: 38, weight: '800' }, fadeIn()),
  ...chain(j.links, 80, 510, { h: 96, size: 40, gap: 80 }),
  T('Here, the link to build:', 80, 680, 1000, 50, { size: 38, weight: '800' }, onClick()),
  ...chain(lad.relation.split(/\s*→\s*/), 80, 750, { h: 150, size: 32, gap: 70, widths: [420, 480, 700], fill: '#ffffff', joinFirst: true }),
], { transition: { type: 'fade', duration: 0.6 }, notes: `${j.rule}\nThe join this question needs: ${j.links.join(' → ')}.\nHere, the link to build: ${lad.relation}.` });
S('Refused without it', [...nav('Question'), eyebrow('Join it up', 140, C.A), heading('Refused without it', 186, 64),
  T(`${j.refused.charAt(0).toUpperCase()}${j.refused.slice(1)}.`, 80, 300, 1760, 140, { size: 48, weight: '600' }, enter({ delay: 0.1 })),
  R(80, 490, 1760, 230, { fill: '#ffffff', radius: 18 }, onClick()),
  R(80, 490, 10, 230, { fill: C.muted, strokeWidth: 0, radius: 0, name: 'Accent' }, after({ delay: 0 })),
  T(`“${j.quote.text}”`, 130, 520, 1660, 130, { size: 48, weight: '600', lineHeight: 1.2 }, after({ delay: 0 })),
  T(j.quote.cite, 130, 660, 1660, 40, { size: 28, color: C.muted }, after({ delay: 0 })),
  T('Where answers stopped at one point, the step that broke was reasoning in 39 of 68 examiner findings, against 12 of 119 at other levels; and answers stop short in 32% of question parts whose scheme requires reasons, against 6% where it does not. Where reasons are required, the fix is the link, not more facts.', 80, 770, 1760, 150, { size: 30, color: C.muted }, onClick()),
  note('A synthesis to test (hypothesis 10), model-read, not yet checked by a teacher.'),
], { notes: `Refused without it: ${j.refused}.\n“${j.quote.text}” (${j.quote.cite})` });
S('What to do', [...nav('Question'), eyebrow('What to do'),
  T('Pick out the key line or moment that reveals the most,', 80, 330, 1760, 160, { size: 76, weight: '800', lineHeight: 1.1 }, enter()),
  T('or identify what’s missing: the voices, perspectives, or facts left out.', 80, 560, 1760, 200, { size: 60, weight: '600', color: C.U, lineHeight: 1.15 }, onClick()),
], { notes: 'What to do: pick out the key line or moment that reveals the most, or identify what’s missing: the voices, perspectives, or facts left out.' });

/* The three answers. A and B as written; C builds unit by unit, its lines gliding over from B (morph). */
const LINES_C = [
  { t: 'Route A, key text: "5.2 GHz of pure power."', role: 'Point', c: C.U },
  { t: 'It joins a measurable number to an unmeasurable word,', role: 'Explained', c: C.A },
  { t: 'so "pure" borrows the number\'s authority.', role: 'So', c: C.A },
  { t: 'Route B, what\'s missing: no cores, cache, battery life or heat.', role: 'Point', c: C.U },
  { t: 'I\'m choosing Route B, because it gives stronger evidence for my question.', role: 'Because', c: C.A },
];
S('Answers: Student A', [...nav('Question'), eyebrow('Answers'), ...answerTabs(0),
  ...elementDots(0, 5, 80, 340),
  T(stu.A.answer, 80, 420, 1760, 90, { size: 60, weight: '600', color: C.muted, name: 'Student A answer' }, enter()),
  R(80, 458, 900, 6, { radius: 3, fill: C.X, strokeWidth: 0, name: 'Strike' }, onClick({ type: 'wipeRight' })),
  T('No useful elements: chooses nothing, neither a revealing line nor what is missing.', 80, 560, 1760, 60, { size: 36, weight: '700' }, after({ delay: 0 })),
  T('What may be missing: interpretation. Read what the question is actually asking.', 80, 640, 1760, 60, { size: 34, color: C.muted }, onClick()),
  R(80, 760, 1760, 160, { fill: C.green, strokeWidth: 0, radius: 18 }, onClick()),
  R(80, 760, 10, 160, { fill: C.A, strokeWidth: 0, radius: 0, name: 'Accent' }, after({ delay: 0 })),
  T(`Feedback for this answer: ${stu.A.feedback}`, 120, 784, 1680, 120, { size: 32 }, after({ delay: 0 })),
], { notes: `Student A: ${stu.A.answer}\n0 of 5 elements. Feedback: ${stu.A.feedback}` });
S('Answers: Student B', [...nav('Question'), eyebrow('Answers'), ...answerTabs(1),
  ...elementDots(2, 5, 80, 340),
  T(LINES_C[0].t, 80, 420, 1760, 60, { size: 44, weight: '600', highlight: true, highlightColor: '#cfe3f2' }, enter()),
  T(LINES_C[3].t, 80, 490, 1760, 60, { size: 44, weight: '600', highlight: true, highlightColor: '#cfe3f2' }, enter({ delay: 0.1 })),
  T('I\'m choosing Route B.', 80, 560, 1760, 60, { size: 44, weight: '600', color: C.muted }, enter({ delay: 0.2 })),
  T(`2 of 5 elements. ${stu.B.why}`, 80, 670, 1760, 110, { size: 32, color: C.muted }, onClick()),
  R(80, 810, 1760, 120, { fill: C.green, strokeWidth: 0, radius: 18 }, onClick()),
  R(80, 810, 10, 120, { fill: C.A, strokeWidth: 0, radius: 0, name: 'Accent' }, after({ delay: 0 })),
  T(`Feedback for this answer: ${stu.B.feedback}`, 120, 846, 1680, 60, { size: 34 }, after({ delay: 0 })),
], { notes: `Student B: ${stu.B.answer}\n2 of 5 elements: ${stu.B.why}\nFeedback: ${stu.B.feedback}` });
S('Answers: Student C', [...nav('Question'), eyebrow('Answers'), ...answerTabs(2),
  ...elementDots(5, 5, 80, 340),
  ...LINES_C.flatMap((ln, i) => {
    const y = 420 + i * 92;
    const shared = i === 0 || i === 3; // the lines B already had glide into place
    const anim = shared ? fadeIn() : onClick();
    return [
      T(ln.t, 150, y, 1300, 70, { size: 40, weight: '600', highlight: true, highlightColor: ln.c === C.U ? '#cfe3f2' : '#cdeee2' }, anim),
      dot(80, y + 4, 52, ln.c, String(i + 1), shared ? fadeIn() : after({ delay: 0 })),
      R(1500, y, 300, 56, { radius: 28, fill: '#ffffff', stroke: ln.c, strokeWidth: 3, name: `Role ${ln.role}` }, shared ? fadeIn() : after({ delay: 0 })),
      T(ln.role, 1500, y + 10, 300, 40, { size: 28, weight: '800', align: 'center', color: ln.c, name: `Role label ${ln.role}` }, shared ? fadeIn() : after({ delay: 0 })),
    ];
  }),
  note('Every unit: the worked example. The two points Student B had are in blue; the three links B left out arrive one per click.', 900),
], { transition: { type: 'morph', duration: 0.9 }, notes: `Student C, the worked example: ${wk.text}\nUnits: ${wk.units.map((u, i) => `${i + 1} ${wk.labels[i]}: ${u}`).join('; ')}.` });
S('Next check', [...nav('Question'), eyebrow('Next check'),
  heading('A fresh, independent task', 186, 64),
  R(80, 340, 1760, 300, { fill: C.green, strokeWidth: 0, radius: 18 }, fadeIn()),
  R(80, 340, 12, 300, { fill: C.A, strokeWidth: 0, radius: 0, name: 'Accent' }, fadeIn()),
  T(lad.transfer, 130, 380, 1660, 230, { size: 48, weight: '600', lineHeight: 1.25 }, enter()),
], { notes: stu.C.feedback });
S('Breakdown', [...nav('Question'), eyebrow('Breakdown · in the join’s terms'), heading('5 useful elements', 186, 64),
  T('a planning count, not marks', 700, 210, 800, 50, { size: 30, color: C.muted }, fadeIn()),
  R(80, 320, 1760, 580, {}, fadeIn()),
  ...wk.units.flatMap((u, i) => {
    const y = 350 + i * 108;
    return [
      ...(i ? [R(120, y - 14, 1680, 2, { radius: 0, fill: C.tint, strokeWidth: 0, name: 'Rule' }, fadeIn())] : []),
      dot(130, y, 60, LINES_C[i].c, String(i + 1), onClick()),
      T(wk.labels[i], 230, y + 8, 300, 50, { size: 34, weight: '800', color: LINES_C[i].c }, after({ delay: 0 })),
      T(u, 560, y + 8, 1220, 80, { size: 36 }, after({ delay: 0 })),
    ];
  }),
], { notes: `Breakdown: ${wk.units.map((u, i) => `${i + 1} ${wk.labels[i]}: ${u}`).join('; ')}.` });
S('Transfer check', [...nav('Question'), eyebrow('Transfer check'), heading('Same link, new case. Same principle, somewhere else.', 186, 52),
  R(80, 340, 860, 560, {}, enter()),
  T('NEAR: THE SAME LINK, A NEW CASE', 120, 370, 780, 34, { size: 24, weight: '800', color: C.U, tracking: 0.06 }, enter()),
  T(lad.transfer, 120, 420, 780, 440, { size: 36, lineHeight: 1.3 }, enter()),
  R(980, 340, 860, 560, {}, onClick()),
  T('FAR: THE SAME PRINCIPLE, SOMEWHERE ELSE', 1020, 370, 780, 34, { size: 24, weight: '800', color: C.J, tracking: 0.06 }, after({ delay: 0 })),
  T('“From two sources on the same historical event, choose the one line that best supports your argument, and say why you rejected the other.” This tests choosing evidence by purpose, not this advert.', 1020, 420, 780, 440, { size: 36, lineHeight: 1.3 }, after({ delay: 0 })),
  note('Score both on the same SOLO scale as the stage. Ideally set after a delay and without support. If one fails, check the new topic’s knowledge first. Drafted items, not yet tried with students.', 940),
], { notes: 'Transfer check. Near and far tasks; score both on the same SOLO scale.' });

/* ---------------------------------------------------------------- How to answer */
divider('How to answer', 'How to approach this question: the steps, the routine and the ladder of support.');
S('Answer routine', [...nav('How to answer'), eyebrow('Answer routine'),
  heading(`${D.routine.wrongIdeas}% of coded examiner-report findings describe wrong ideas. Each step guards against one kind of mistake.`, 186, 44),
  ...D.routine.rows.flatMap((r, i) => {
    const y = 330 + i * 128;
    return [
      T(`${r.n}. ${r.name}`, 80, y, 300, 50, { size: 38, weight: '800' }, onClick()),
      R(80, y + 58, Math.max(16, r.share * 6.5), 22, { radius: 11, fill: C.Cc, strokeWidth: 0, name: 'Share bar' }, after({ delay: 0, type: 'wipeRight' })),
      T(`${r.share}%`, 90 + Math.max(16, r.share * 6.5), y + 50, 120, 40, { size: 28, weight: '800', color: C.muted, name: 'Share' }, after({ delay: 0 })),
      T(r.prompt, 520, y, 1320, 70, { size: 30 }, after({ delay: 0 })),
      T(`Guards against ${r.guards}.`, 520, y + 72, 1320, 40, { size: 24, color: C.muted }, after({ delay: 0 })),
    ];
  }),
  note('After marking, log each lost mark by the step that failed. A design to try, not a tested result.', 990),
], { notes: D.routine.rows.map(r => `${r.n}. ${r.name} (${r.share}% of findings): ${r.prompt} Guards against ${r.guards}.`).join('\n') });
S('The mental operations', [...nav('How to answer'), eyebrow('The mental operations this question needs'),
  heading('Operations you move between, not steps in a fixed order.', 186, 52),
  T('You might go back to retrieve after interpreting the question, or rebuild a connection after checking.', 80, 270, 1760, 50, { size: 30, color: C.muted }, fadeIn()),
  ...[
    ['Interpret', 'Choose one route: the most revealing line, or what is missing.', C.X, 'Where Student A’s answer breaks down'],
    ['Connect', 'Link the choice to the question it will help answer.', C.U, 'Teaching method: write explanations as cause linked to effect'],
    ['Express', 'State the choice, then why it is the stronger evidence.', C.U, ''],
    ['Check', 'Is the choice something the next stage can use?', C.U, ''],
  ].flatMap(([n, t, c, tag], i) => {
    const x = 80 + i * 450;
    return [
      R(x, 380, 410, 470, { stroke: c, strokeWidth: 4 }, onClick()),
      T(n, x + 34, 410, 350, 60, { size: 48, weight: '800', color: c }, after({ delay: 0 })),
      T(t, x + 34, 490, 350, 220, { size: 32 }, after({ delay: 0 })),
      ...(tag ? [T(tag, x + 34, 740, 350, 90, { size: 22, weight: '700', color: c, name: 'Tag' }, after({ delay: 0 }))] : []),
      ...(i < 3 ? [T('⇄', x + 410, 580, 40, 60, { size: 40, weight: '700', color: C.muted, align: 'center', name: 'Between' }, after({ delay: 0 }))] : []),
    ];
  }),
  note('Separate from the command word, the answer’s structure and the mark scheme. Draft guidance written for this app.', 900),
], { notes: 'The mental operations: Interpret (where Student A breaks down), Connect, Express, Check. Operations you move between, not steps in a fixed order.' });
S('Step by step: Recognition', [...nav('How to answer'), eyebrow('Step by step: Recognition'),
  heading('Spot the right feature, term or pattern when it is in front of you.', 186, 52),
  ...['Read or look through the whole item first.', 'Mark each thing that matches what you are looking for.', 'Say why each one counts, and what you ruled out.'].flatMap((t, i) => [
    dot(80, 360 + i * 120, 72, C.ink, String(i + 1), onClick()), T(t, 190, 370 + i * 120, 1600, 60, { size: 42, weight: '600' }, after({ delay: 0 })),
  ]),
  T('Knowledge to bring:', 80, 760, 400, 50, { size: 32, weight: '800' }, onClick()),
  ...['Connotation', 'Omission', 'Performance factors'].flatMap((k, i) => [
    R(420 + i * 330, 752, 300, 60, { radius: 30, fill: '#ffffff', stroke: C.line, strokeWidth: 2, name: `Chip ${k}` }, after({ delay: 0.05 })),
    T(k, 420 + i * 330, 764, 300, 40, { size: 28, weight: '700', align: 'center', name: `Chip label ${k}` }, after({ delay: 0 })),
  ]),
  T('Check your answer: could I tell this apart from something that looks similar?', 80, 870, 1760, 60, { size: 36, weight: '800', color: C.U }, onClick()),
], { notes: 'Step by step, recognition: read the whole item, mark each match, say why each counts and what you ruled out. Knowledge to bring: connotation, omission, performance factors.' });
S('Fluency practice', [...nav('How to answer'), eyebrow('Fluency practice'),
  heading('When you can already do it accurately: make it quick and smooth.', 186, 52),
  ...[['A GOOD ANSWER', 'Correct without hesitation, with few prompts.'], ['PRACTISE BY', 'Short, regular, timed repetition. Cut the prompts as you improve.'], ['TO REACH GENERALISATION', 'Try it on a different case from the one you practised. That is generalisation.']].flatMap(([h, t], i) => [
    R(80 + i * 600, 360, 560, 420, { fill: C.tint, strokeWidth: 0 }, onClick()),
    T(h, 120 + i * 600, 400, 480, 40, { size: 24, weight: '800', color: C.muted, tracking: 0.06 }, after({ delay: 0 })),
    T(t, 120 + i * 600, 460, 480, 280, { size: 40, weight: '600' }, after({ delay: 0 })),
  ]),
  note('Stages of mastery from the instructional hierarchy (Haring and Eaton, 1978). Draft: each stage’s placement is judged from its power words, not from examiner data.', 900),
], { notes: 'Fluency practice: a good answer is correct without hesitation; practise by short, regular, timed repetition; to reach generalisation, try a different case.' });
S('The missing-link ladder', [...nav('How to answer'), eyebrow('The missing-link ladder'),
  heading(`The link to build: ${lad.relation}`, 186, 40),
  ...[
    ['1. Independent', st.task],
    ['2. Neutral prompt', lad.probe],
    ['3. Partial hint', lad.hint],
    ['4. Model', 'Show the worked example (Student C on the Question tab), then withdraw it.'],
    ['5. New task: independent, but asked', lad.transfer],
  ].flatMap(([n, t], i) => {
    const y = 330 + i * 118, w = 160 + i * 70;
    return [
      R(80, y, w, 96, { radius: 12, fill: C.Cc, fillOpacity: 0.35 + i * 0.16, strokeWidth: 0, name: 'Rung' }, onClick({ type: 'wipeRight' })),
      T(n, 100 + w, y + 6, 880 - (100 + w), 90, { size: 30, weight: '800' }, after({ delay: 0 })),
      T(t, 900, y + 6, 940, 100, { size: 28 }, after({ delay: 0 })),
    ];
  }),
  T(`Repair, unprompted, in a later and different task: ${lad.repair}`, 80, 930, 1760, 80, { size: 26, weight: '600', color: C.muted }, onClick()),
], { notes: `The missing-link ladder. Support one rung at a time, then withdraw it.\n2 Neutral prompt: ${lad.probe}\n3 Partial hint: ${lad.hint}\n5 New task: ${lad.transfer}\nRepair later: ${lad.repair}` });

/* ---------------------------------------------------------------- Mark scheme */
/* The stage borrows Justify's evidence, so its sources are that stage's papers (Nodes' Sources card). */
const OCR = 'https://www.ocr.org.uk/Images', SYS = 'computer-systems.pdf';
const SOURCES = [
  { label: 'OCR GCSE J277/01, June 2023', qs: ['Q6', 'Q3(c)(i)'], qp: `${OCR}/704760-question-paper-${SYS}`, ms: `${OCR}/704882-mark-scheme-${SYS}`, er: `${OCR}/704717-examiners-report-${SYS}` },
  { label: 'OCR GCSE J277/01, June 2024', qs: ['Q5(b)(i)'], qp: `${OCR}/727534-question-paper-${SYS}`, ms: `${OCR}/727652-mark-scheme-${SYS}`, er: `${OCR}/727492-examiners-report-${SYS}` },
];
divider('Mark scheme', 'Awarded credit: what meets the marking criteria, from the mark schemes themselves.');
S('What kind of mark scheme this is', [...nav('Mark scheme'), eyebrow('What kind of mark scheme this is'),
  R(80, 200, 300, 64, { radius: 12, fill: C.tint, strokeWidth: 0, name: 'Not examined pill' }, fadeIn()),
  T('NOT EXAMINED', 80, 214, 300, 40, { size: 28, weight: '800', align: 'center' }, fadeIn()),
  T('This framework is not examined, so it has no mark scheme of its own. Anything below is borrowed from the closest examined stage, and says so.', 80, 300, 1760, 130, { size: 44, weight: '600' }, enter()),
  R(80, 500, 1760, 300, { fill: C.amber, strokeWidth: 0, radius: 18 }, onClick()),
  R(80, 500, 12, 300, { fill: C.Cc, strokeWidth: 0, radius: 0, name: 'Accent' }, after({ delay: 0 })),
  T('Closest examined stage: Computer Science (GCSE), command word 11, Justify.', 130, 530, 1660, 60, { size: 40, weight: '800' }, after({ delay: 0 })),
  T('Choosing a route and saying why is a Justify: the choice, then the reasons that fit it. This framework is not examined, so the evidence below is that stage’s.', 130, 610, 1660, 160, { size: 34 }, after({ delay: 0 })),
  note('No demand check here: the demand audit covers six command words (Identify, Complete, Describe, State, Give and Explain).', 900),
], { notes: 'Not examined: the mark-scheme evidence is borrowed from GCSE Computer Science, command word 11, Justify.' });
S('How the marks are awarded', [...nav('Mark scheme'), eyebrow('How the marks are awarded · borrowed from Justify'),
  ...[['3 marks', 'The choice (1), then two reasons, or a reason and its follow-on.', 'OCR J277/01, June 2023, Q3(c)(i), compression for a text file: lossless (1); no data is removed (1) … and a text file needs every character to work (1).'],
    ['4 marks', 'In OCR 2024 and 2025 the choice earns nothing: all 4 marks are for reasons that fit it, each linked to the user.', 'OCR J277/01, June 2024, Q5(b)(i), storage for a musician: solid state is robust (1) … which matters if the device is moved (1), and so on.']].flatMap(([h, t, ex], i) => [
    R(80 + i * 900, 200, 860, 560, { fill: C.tint, strokeWidth: 0 }, i ? onClick() : enter()),
    R(80 + i * 900, 200, 12, 560, { fill: C.ink, strokeWidth: 0, radius: 0, name: 'Accent' }, i ? after({ delay: 0 }) : enter()),
    T(h, 130 + i * 900, 230, 780, 70, { size: 56, weight: '800' }, i ? after({ delay: 0 }) : enter()),
    T(t, 130 + i * 900, 320, 780, 200, { size: 36, weight: '600' }, i ? after({ delay: 0 }) : enter()),
    T(ex, 130 + i * 900, 540, 780, 200, { size: 28, color: C.muted }, i ? after({ delay: 0 }) : enter()),
  ]),
  T('NOT CREDITED', 80, 800, 400, 40, { size: 26, weight: '800', color: C.X, tracking: 0.06 }, onClick()),
  T('•  Reasons that do not match the choice made.\n•  Comparisons with no object: “faster”, without saying faster at what.', 80, 850, 1760, 120, { size: 34 }, after({ delay: 0 })),
], { notes: '3 marks: the choice, then two reasons, or a reason and its follow-on. 4 marks: in OCR 2024 and 2025 the choice earns nothing. Not credited: reasons that do not match the choice; comparisons with no object.' });
S('What examiners saw', [...nav('Mark scheme'), eyebrow('What examiners saw'),
  heading('OCR J277/01, June 2024, Q5(b)(i): magnetic or solid state storage for a musician', 186, 44),
  R(80, 360, 860, 440, { fill: C.tint, strokeWidth: 0 }, enter()),
  R(80, 360, 860, 12, { fill: C.X, strokeWidth: 0, radius: 0, name: 'Top' }, enter()),
  T('WEAKER ANSWERS', 120, 400, 780, 40, { size: 26, weight: '800', color: C.muted, tracking: 0.06 }, enter()),
  T('“Solid state is faster”, without saying faster at what.', 120, 460, 780, 300, { size: 44, weight: '600' }, enter()),
  R(980, 360, 860, 440, { fill: C.tint, strokeWidth: 0 }, onClick()),
  R(980, 360, 860, 12, { fill: C.A, strokeWidth: 0, radius: 0, name: 'Top' }, after({ delay: 0 })),
  T('STRONGER ANSWERS', 1020, 400, 780, 40, { size: 26, weight: '800', color: C.muted, tracking: 0.06 }, after({ delay: 0 })),
  T('Links each property to the user: solid state is robust, which matters because the musician may move the device.', 1020, 460, 780, 300, { size: 44, weight: '600' }, after({ delay: 0 })),
  note('Paraphrased from the examiners’ report for that paper.', 860),
], { notes: 'What examiners saw, OCR J277/01 June 2024 Q5(b)(i): weaker answers say “faster” without saying at what; stronger answers link each property to the user.' });
S('What the mark schemes show', [...nav('Mark scheme'), eyebrow('What the mark schemes show'),
  R(80, 200, 600, 64, { radius: 32, fill: '#d9efe6', strokeWidth: 0, name: 'Verdict pill' }, fadeIn()),
  T('Partly consistent with this level', 80, 214, 600, 40, { size: 28, weight: '800', align: 'center', color: '#0b6b4f' }, fadeIn()),
  T('The marks reward reasons linked to the context (relational). The judgement is required, but earns at most 1 mark on its own.', 80, 310, 1760, 130, { size: 44, weight: '600' }, enter()),
  R(80, 500, 560, 300, { fill: C.tint, strokeWidth: 0 }, onClick()),
  T('IN THE PAPERS', 120, 530, 480, 40, { size: 24, weight: '800', color: C.muted, tracking: 0.06 }, after({ delay: 0 })),
  T('8 question parts, 2–4 marks', 120, 590, 480, 180, { size: 56, weight: '800' }, after({ delay: 0 })),
  R(680, 500, 1160, 300, { fill: C.tint, strokeWidth: 0 }, onClick()),
  T('HOW MARKS ARE EARNED', 720, 530, 1080, 40, { size: 24, weight: '800', color: C.muted, tracking: 0.06 }, after({ delay: 0 })),
  T('The choice earns 1 mark in some papers and none in others. The rest of the marks are for reasons that match the choice, with follow-on marks for linking each one to the context.', 720, 590, 1080, 190, { size: 34 }, after({ delay: 0 })),
  note('Read from the 368 question parts that have a mark scheme, of 384 in 12 GCSE Computer Science papers (AQA 8525 June 2022–23, OCR J277 June 2022–25). Readings by this app, not yet checked by a teacher.', 860),
], { notes: 'What the mark schemes show: partly consistent with this level. 8 question parts, 2–4 marks.' });
{
  const ROWS = [
    ['1', '115 parts', 'One precise point.', 'The exact term or fact: “cache size”, not “cache”. Mostly State, Shade, Give, Identify and Define.'],
    ['2', '111 parts', 'Two points, or one point and its expansion.', 'Define: what it is, and what sets it apart. “Describe one …” or “Explain one …”: the point, then how or why.'],
    ['3', '51 parts', 'Three units of substance.', 'Three separate points; a name or choice, then two points describing or justifying it; a three-step chain or process.'],
    ['4', '49 parts', 'Four units, usually in pairs.', 'Two points, each expanded or applied (2 + 2); a choice and three reasons, or four reasons with no mark for the choice; four steps or rows.'],
    ['5', '10 parts', 'Mostly building: completing code or a table.', 'Each correct element earns its own mark.'],
    ['6+', '32 parts', 'Two different kinds of question, most still points-marked.', 'Write an algorithm (13): one mark per required feature. Discuss (7, levels-marked): coverage, application, balance, structure. The other 12 are points-marked.'],
  ];
  [ROWS.slice(0, 3), ROWS.slice(3)].forEach((part, pi) => S(`Marks and substance${pi ? ' (continued)' : ''}`, [...nav('Mark scheme'), eyebrow(`Marks and substance, across every command word${pi ? ' · continued' : ''}`),
    heading(pi ? 'At 6 marks or more, 7 of the 32 parts are levels-marked and judged as a whole.' : 'Up to 5 marks, count roughly one unit of substance per mark: a planning aid the actual mark scheme overrides.', 186, 44),
    R(80, 330, 1760, 640, {}, fadeIn()),
    T('MARKS', 120, 356, 200, 30, { size: 22, weight: '800', color: C.muted, tracking: 0.06 }, fadeIn()),
    T('WHAT IT NEEDS', 330, 356, 500, 30, { size: 22, weight: '800', color: C.muted, tracking: 0.06 }, fadeIn()),
    T('HOW THE MARKS FALL', 900, 356, 900, 30, { size: 22, weight: '800', color: C.muted, tracking: 0.06 }, fadeIn()),
    ...part.flatMap(([m, n, need, how], i) => {
      const y = 416 + i * 180;
      return [
        ...(i ? [R(120, y - 20, 1680, 2, { radius: 0, fill: C.tint, strokeWidth: 0, name: 'Rule' }, fadeIn())] : []),
        T(m, 120, y, 160, 70, { size: 60, weight: '800' }, onClick()),
        T(n, 120, y + 76, 200, 40, { size: 24, color: C.muted }, after({ delay: 0 })),
        T(need, 330, y, 530, 150, { size: 36, weight: '700' }, after({ delay: 0 })),
        T(how, 900, y, 900, 150, { size: 32 }, after({ delay: 0 })),
      ];
    }),
  ], { notes: 'Marks and substance: ' + part.map(r => `${r[0]} marks (${r[1]}): ${r[2]} ${r[3]}`).join(' ') }));
}
S('Sources for this stage', [...nav('Mark scheme'), eyebrow('Sources for this stage'), heading('The exact questions cited on this stage. Check each claim against its source.', 186, 48),
  ...SOURCES.flatMap((s, i) => {
    const y = 380 + i * 250;
    const links = [['Question paper', s.qp], ['Mark scheme', s.ms], ['Examiners’ report', s.er]].filter(([, u]) => u);
    return [
      R(80, y, 1760, 210, {}, enter({ delay: i * 0.1 })),
      T(`${s.label}: ${s.qs.join(', ')}`, 120, y + 30, 1680, 60, { size: 40, weight: '800' }, enter({ delay: i * 0.1 })),
      ...links.flatMap(([label, url], k) => {
        const l = T(`${label} ↗`, 120 + k * 380, y + 120, 360, 50, { size: 32, weight: '700', color: C.U, underline: true, name: `Link ${label}` }, enter({ delay: i * 0.1 }));
        l.interact = { ...l.interact, click: 'link', url };
        return [l];
      }),
    ];
  }),
], { notes: SOURCES.map(s => `${s.label}, ${s.qs.join(', ')}: ${[s.qp, s.ms, s.er].filter(Boolean).join(' · ')}`).join('\n') });

/* ---------------------------------------------------------------- Analysis */
divider('Analysis', 'A learning diagnosis to investigate: possible difficulties and the probes to test them, not verdicts.');
S('Four views of this stage', [...nav('Analysis'), eyebrow('Four views of this stage'),
  heading('Each view has a different source of evidence. Only the first three are evidence; the fourth is what to try.', 186, 40),
  ...[
    ['1. ASSESSMENT DEMAND', 'Evidence → explanation: what the evidence shows, and why it matters here. SOLO demanded: relational.', 'The question only: no demand audit for this command word', C.U],
    ['2. AWARDED EVIDENCE', 'Not examined: no mark scheme of its own.', 'No mark scheme read for this stage', C.A],
    ['3. REPORTED BREAKDOWN', 'Typically described: quotes or copies the evidence without explaining its significance.', 'Computer science reports, not this subject’s', C.Cc],
    ['4. INSTRUCTIONAL RESPONSE', `One successful route: ${lad.relation}. A teaching hypothesis, not the mark scheme.`, 'A teaching hypothesis, not yet tested with students', C.J],
  ].flatMap(([h, t, src, c], i) => {
    const x = 80 + (i % 2) * 900, y = 330 + Math.floor(i / 2) * 340;
    return [
      R(x, y, 860, 310, { fill: C.tint, strokeWidth: 0 }, onClick()),
      R(x, y, 860, 10, { fill: c, strokeWidth: 0, radius: 0, name: 'Top' }, after({ delay: 0 })),
      T(h, x + 36, y + 34, 790, 40, { size: 24, weight: '800', color: C.muted, tracking: 0.06 }, after({ delay: 0 })),
      T(t, x + 36, y + 84, 790, 150, { size: 32, weight: '600' }, after({ delay: 0 })),
      T(src, x + 36, y + 250, 790, 40, { size: 22, weight: '700', color: c }, after({ delay: 0 })),
    ];
  }),
], { notes: 'Four views: assessment demand, awarded evidence, reported breakdown, instructional response.' });
S('Behind this stage', [...nav('Analysis'), eyebrow('Behind this stage'), heading('Where this stage sits', 186, 64),
  T('POWER WORDS', 80, 310, 600, 34, { size: 24, weight: '800', color: C.muted, tracking: 0.06 }, fadeIn()),
  ...['select', 'abstract', 'omit', 'identify absence'].flatMap((w, i) => [
    R(80 + i * 260, 360, 240, 60, { radius: 30, fill: '#ffffff', stroke: C.line, strokeWidth: 2, name: `Word ${w}` }, after({ delay: 0.05 })),
    T(w, 80 + i * 260, 372, 240, 40, { size: 28, weight: '700', align: 'center', name: `Word label ${w}` }, after({ delay: 0 })),
  ]),
  ...[['BACKBONE', 'C Compare and analyse', C.Cc], ['BLOOM', '4 Analyse', C.Cc], ['COGNITIVE', 'Recognition', '#5fb3b3'], ['MASTERY', 'Fluency', '#c9a66b']].flatMap(([h, v, c], i) => [
    T(h, 80 + i * 440, 480, 400, 34, { size: 22, weight: '800', color: C.muted, tracking: 0.06 }, onClick()),
    R(80 + i * 440, 524, 400, 64, { radius: 32, fill: c, strokeWidth: 0, name: `Lens ${h}` }, after({ delay: 0 })),
    T(v, 80 + i * 440, 536, 400, 40, { size: 28, weight: '800', align: 'center', name: `Lens value ${h}` }, after({ delay: 0 })),
  ]),
  T('NEEDED FOR FULL MARKS (DRAFT)', 80, 660, 800, 34, { size: 22, weight: '800', color: C.muted, tracking: 0.06 }, onClick()),
  ...[['2 Unistructural', 'one unit: a single point.'], ['3 Multistructural', 'several units, each credited on its own.'], ['4 Relational', 'the units linked: expansions and follow-ons credited. The level this stage is placed at.']].flatMap(([lv, t], i) => [
    R(80, 710 + i * 90, 330, 64, { radius: 32, fill: i === 2 ? C.U : '#cfe3f2', strokeWidth: 0, name: `SOLO ${lv}` }, after({ delay: 0.05 })),
    T(lv, 80, 722 + i * 90, 330, 40, { size: 28, weight: '800', align: 'center', color: i === 2 ? '#ffffff' : C.ink, name: `SOLO label ${lv}` }, after({ delay: 0 })),
    T(t, 440, 722 + i * 90, 1400, 50, { size: 32, weight: i === 2 ? '700' : '400' }, after({ delay: 0 })),
  ]),
], { notes: 'Power words: select, abstract, omit, identify absence. Backbone C; Bloom 4 Analyse; Cognitive: recognition; Mastery: fluency. Needed for full marks: 4 Relational.' });
{
  const ROWS = ['Prestructural', 'Unistructural', 'Multistructural', 'Relational', 'Extended abstract'];
  const COLS = ['Retrieval', 'Recognition', 'Comprehension', 'Connection', 'Application', 'Transfer', 'None shown'];
  const x0 = 420, y0 = 360, cw = 200, rh = 104;
  const place = { A: ['Prestructural', 'Comprehension', C.X], B: ['Multistructural', 'Connection', C.Cc], C: ['Relational', 'None shown', C.A] };
  S('SOLO × process', [...nav('Analysis'), eyebrow('SOLO × process · stage 3, Abstraction'),
    heading('The structure each answer showed, down the side; the process to investigate, across.', 186, 44),
    R(80, 300, 1760, 640, {}, fadeIn()),
    ...COLS.map((c, i) => T(c.toUpperCase(), x0 + i * cw, y0 - 40, cw, 30, { size: 18, weight: '800', color: C.muted, align: 'center', tracking: 0.04, name: `Col ${c}` }, fadeIn())),
    ...ROWS.flatMap((r, i) => [
      ...(i === 3 ? [R(100, y0 + i * rh - 6, 1720, rh - 8, { radius: 12, fill: C.blue, strokeWidth: 0, name: 'Stage level' }, fadeIn())] : []),
      T(r, 120, y0 + i * rh + 22, 300, 44, { size: 28, weight: '800' }, fadeIn()),
      ...COLS.map((c, k) => T('—', x0 + k * cw, y0 + i * rh + 22, cw, 44, { size: 28, color: C.line, align: 'center', name: 'Empty' }, fadeIn())),
    ]),
    ...Object.entries(place).flatMap(([who, [r, c, col]]) => {
      const x = x0 + COLS.indexOf(c) * cw + cw / 2 - 34, y = y0 + ROWS.indexOf(r) * rh + 10;
      return [dot(x, y, 68, col, who, onClick({ type: 'pop' }))];
    }),
    note('Letters place this stage’s three students: the same answers as on its Question tab. Readings of answers, not of minds. The shaded row is the level this stage asks for.', 960),
  ], { notes: 'SOLO × process: A prestructural, comprehension; B multistructural, connection; C relational, none shown.' });
}
for (const [who, solo, process, answer, missing, col] of [
  ['A', 'Prestructural', 'Comprehension', stu.A.answer, 'Interpretation. Possible explanation: chooses nothing, neither a revealing line nor what is missing. Probe: “How did you decide between the two routes?” If that is not enough: “Which route gives you something you could use as evidence for your question?” Teaching response, if the probe confirms it: practise reading what the question actually asks.', C.X],
  ['B', 'Multistructural', 'Connection', stu.B.answer, `Connection. Possible explanation: ${stu.B.why} Probe: ${stu.B.feedback} Teaching response, if the probe confirms it: model the link from cause to effect, then fade the model.`, C.Cc],
  ['C', 'Relational', 'None shown on this task. Next check, not an observation: transfer.', wk.text, `On this task, nothing shown missing. Next check, not an observation: ${stu.C.feedback} Teaching response: if it does not transfer, check the new topic’s knowledge first, then return to the hint.`, C.A],
]) {
  S(`Reading: Student ${who}`, [...nav('Analysis'), eyebrow('Below the grid: each answer'),
    dot(80, 190, 110, col, who, enter({ type: 'pop' })),
    T(`Structure demonstrated: ${solo}`, 230, 196, 1600, 50, { size: 40, weight: '800' }, enter()),
    T(`Process to investigate: ${process}`, 230, 252, 1600, 50, { size: 34, weight: '600', color: C.muted }, enter({ delay: 0.1 })),
    R(80, 350, 1760, 240, {}, onClick()),
    T('WRITTEN ANSWER', 120, 376, 600, 30, { size: 22, weight: '800', color: C.muted, tracking: 0.06 }, after({ delay: 0 })),
    T(answer, 120, 420, 1680, 150, { size: 34, weight: '600' }, after({ delay: 0 })),
    T('POSSIBLY MISSING', 80, 640, 600, 30, { size: 22, weight: '800', color: col, tracking: 0.06 }, onClick()),
    T(missing, 80, 684, 1760, 300, { size: 32, lineHeight: 1.35 }, after({ delay: 0 })),
  ], { notes: `Student ${who}. Structure: ${solo}. Process to investigate: ${process}.\n${missing}` });
}

window.__deck = { id: 'nodes-critical-text-3', title: 'Abstraction: key text or what is missing', width: 1920, height: 1080, version: 1, slides };
