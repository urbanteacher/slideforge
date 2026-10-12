/* One command word, three systems: Describe in the UK (GCSE), Singapore (O-Level) and China (Zhejiang
 * Gaokao IT), built with kit.js. Each system's own Describe stage from Nodes (tools/nodes-lab/describe-3.json,
 * exported by tools/export-stage-lesson.ts), set side by side: the question, the link it needs, the
 * answer that earns it, how it is marked, and what differs.
 * The differences are in how each system's papers frame the task, not evidence that students in each
 * country think differently: there are no Singapore or China examiner reports to show that. */
const D = window.__nodesData;
const NAV = { tabs: ['The structure', 'The question', 'The link', 'The answer', 'The marks', 'The difference'], label: 'Describe · three systems', caveat: '' };
const SYS = [
  { k: 'uk', name: 'UK · GCSE', short: 'UK', col: C.U, light: '#56b4e9', tint: C.blue, board: 'AQA and OCR' },
  { k: 'sg', name: 'Singapore · O-Level', short: 'Singapore', col: C.A, light: '#3ccf9f', tint: C.green, board: 'SEAB with Cambridge' },
  { k: 'cn', name: 'China · Zhejiang IT', short: 'China', col: C.J, light: '#e9a8cb', tint: '#f8edf3', board: 'Zhejiang Gaokao' },
];
const X = (i) => 80 + i * 600; // three columns
const BACKBONE = { U: C.U, A: C.A, C: C.Cc, X: C.X, J: C.J };
const BANDS = [[5, 'EXTENDED ABSTRACT', 'beyond the given, to new contexts'], [4, 'RELATIONAL', 'ideas connected into a whole'], [3, 'MULTISTRUCTURAL', 'several ideas, not yet connected'], [2, 'UNISTRUCTURAL', 'one relevant idea']];

/* A SOLO ladder as Nodes draws it ("As drawn"): four bands, top to bottom, a prestructural floor, the
   stages as numbered nodes in their backbone colours, and the track that snakes up through them
   (one relevant idea, then left to right, right to left, left to right). `ring` lights one stage. */
function ladder(x, y, w, stages, { bandH = 150, d = 50, label = 22, gloss = true, ring = null, ringAnim = onClick() } = {}) {
  const out = [], pos = {};
  const L = x + 34, Rr = x + w - 34;
  BANDS.forEach(([lv, name, g], b) => {
    const by = y + b * (bandH + 10);
    out.push(R(x, by, w, bandH, { radius: 14, fill: '#dde1e8', strokeWidth: 0, name: `Band ${name}` }, enter()));
    out.push(T(gloss ? `${name}  ·  ${g}` : name, x + 20, by + 12, w - 40, 30, { size: 17, weight: '800', color: C.ink, tracking: 0.06, name: `Band label ${name}` }, enter()));
    const row = stages.filter(st => st.solo === lv);
    const cy = by + bandH / 2 + 12;
    const xs = row.length === 1 ? [x + w / 2] : row.map((_, i) => x + 80 + i * ((w - 160) / (row.length - 1)));
    const order = lv === 4 ? [...xs].reverse() : xs; // the relational row runs right to left
    row.forEach((st, i) => { pos[st.n] = { x: order[i], y: cy }; });
  });
  // the track: along each row, then up at the ends where the snake turns
  const rowY = lv => y + BANDS.findIndex(b => b[0] === lv) * (bandH + 10) + bandH / 2 + 12;
  const line = (x0, y0, x1, y1) => R(Math.min(x0, x1) - 3, Math.min(y0, y1) - 3, Math.abs(x1 - x0) + 6, Math.abs(y1 - y0) + 6, { radius: 3, fill: '#bfc5d1', strokeWidth: 0, name: 'Track' }, enter());
  const uni = stages.find(st => st.solo === 2);
  out.push(line(L, rowY(2), uni ? pos[uni.n].x : x + w / 2, rowY(2)));
  out.push(line(L, rowY(3), L, rowY(2)));
  out.push(line(L, rowY(3), Rr, rowY(3)));
  out.push(line(Rr, rowY(4), Rr, rowY(3)));
  out.push(line(L, rowY(4), Rr, rowY(4)));
  out.push(line(L, rowY(5), L, rowY(4)));
  out.push(line(L, rowY(5), Rr - 40, rowY(5)));
  // the floor
  const fy = y + 4 * (bandH + 10);
  out.push(R(x, fy, w, 36, { radius: 10, fill: 'transparent', fillOpacity: 0, stroke: '#bfc5d1', strokeWidth: 2, name: 'Floor' }, enter()));
  out.push(T(gloss ? 'PRESTRUCTURAL  ·  missing the point' : 'PRESTRUCTURAL', x + 20, fy + 7, w - 40, 26, { size: 15, weight: '800', color: C.muted, tracking: 0.06, name: 'Floor label' }, enter()));
  // the nodes
  for (const st of stages) {
    const p = pos[st.n], col = BACKBONE[st.k] || C.U;
    out.push(dot(p.x - d / 2, p.y - d / 2, d, col, String(st.n), enter(), { stroke: '#ffffff', strokeWidth: 3, labelColor: st.k === 'C' || st.k === 'J' ? C.ink : '#ffffff' }));
    out.push(T(st.short, p.x - 80, p.y + d / 2 + 4, 160, label * 1.4, { size: label, weight: st.short === ring ? '800' : '500', align: 'center', color: st.short === ring ? C.ink : C.muted, name: `Stage ${st.short}` }, enter()));
  }
  if (ring) {
    const st = stages.find(q => q.short === ring);
    if (st) { const p = pos[st.n], r = d + 26; out.push(R(p.x - r / 2, p.y - r / 2, r, r, { shape: 'ellipse', fill: 'transparent', fillOpacity: 0, stroke: C.ink, strokeWidth: 5, name: `Ring ${ring}` }, ringAnim)); }
  }
  return out;
}
const card = (i, y, h, first) => R(X(i), y, 560, h, { fill: '#ffffff', stroke: C.line, strokeWidth: 2 }, first ? onClick() : after());
const flag = (i, y, s) => [
  R(X(i), y, 560, 10, { radius: 0, fill: s.col, strokeWidth: 0, name: `Top ${s.short}` }, after()),
  T(s.name.toUpperCase(), X(i) + 32, y + 30, 500, 34, { size: 24, weight: '800', color: s.col, tracking: 0.08, name: `System ${s.short}` }, after()),
];

/* ---------------------------------------------------------------- cover */
S('Cover', [
  T('NODES · ACROSS SYSTEMS', 80, 250, 1700, 50, { size: 30, weight: '700', color: C.Cc, tracking: 0.12, name: 'Eyebrow' }, still),
  T('One command word, three systems', 80, 320, 1600, 260, { size: 120, weight: '800', color: '#ffffff', lineHeight: 1.02, tracking: -0.02, name: 'Title' }, still),
  T('“Describe”, as the UK, Singapore and China ask it about the same topic: the computer system.', 80, 600, 1500, 130, { size: 46, color: '#c9d1e8', name: 'Subtitle' }, enter()),
  ...SYS.flatMap((s, i) => [
    R(80 + i * 420, 800, 390, 64, { radius: 32, fill: s.col, strokeWidth: 0, name: `Pill ${s.short}` }, enter()),
    T(s.name, 80 + i * 420, 812, 390, 40, { size: 28, weight: '800', align: 'center', color: '#ffffff', name: `Pill label ${s.short}` }, enter()),
  ]),
], { bg: C.ink, notes: 'Describe is the one command word on all three Nodes ladders: UK GCSE (command word 2), Singapore O-Level (2) and China IT (2). Same word, the same SOLO level (several ideas), the same topic. What changes is the relationship each system asks the answer to show.' });

/* ---------------------------------------------------------------- the structure */
divider('The structure', 'Each system’s ladder of command words, as Nodes draws it: where Describe sits, and what sits around it.');
S('Three ladders', [...nav('The structure'), eyebrow('Three ladders, one level'), heading('Describe sits in the same place on all three: command word 2.', 186, 52),
  ...SYS.flatMap((s, i) => [
    T(`${s.name} · ${D.ladders[s.k].stages.length} command words`, X(i), 300, 560, 40, { size: 26, weight: '800', color: s.col, name: `Ladder title ${s.short}` }, enter()),
    ...ladder(X(i), 350, 560, D.ladders[s.k].stages, { bandH: 128, d: 40, label: 17, gloss: false, ring: 'Describe', ringAnim: i ? after() : onClick() }),
  ]),
  note('Same level, different neighbours: what comes before and after Describe is not the same in each system.', 1010),
], { notes: 'The three SOLO ladders as Nodes draws them. Describe is command word 2 in each, multistructural (several ideas, not yet connected). UK has 13 command words, Singapore 8, China 6. Click to ring Describe on all three.' });
for (const s of SYS) {
  const L = D.ladders[s.k];
  const byBand = BANDS.map(([lv, name]) => [name, L.stages.filter(st => st.solo === lv)]);
  S(`Ladder: ${s.short}`, [...nav('The structure'), eyebrow(`${s.name} · ${L.title}`), heading(`${L.stages.length} command words on four levels`, 186, 56),
    ...ladder(80, 290, 960, L.stages, { bandH: 150, d: 54, label: 22, ring: 'Describe' }),
    R(1100, 290, 740, 690, {}, enter()),
    T('THE LEVELS, TOP TO BOTTOM', 1140, 316, 660, 30, { size: 22, weight: '800', color: C.muted, tracking: 0.06 }, enter()),
    ...byBand.flatMap(([name, row], b) => [
      T(name.charAt(0) + name.slice(1).toLowerCase(), 1140, 370 + b * 140, 660, 40, { size: 30, weight: '800', color: s.col }, enter()),
      T(row.length ? row.map(st => `${st.n} ${st.short}`).join('  ·  ') : 'None', 1140, 414 + b * 140, 660, 80, { size: 30 }, enter()),
    ]),
    T('Ringed: Describe, command word 2.', 1140, 930, 660, 40, { size: 24, weight: '700', color: C.ink }, onClick()),
  ], { notes: `${s.name} (${L.title}): ${byBand.map(([n, row]) => `${n}: ${row.map(st => st.short).join(', ') || 'none'}`).join('. ')}.` });
}

/* ---------------------------------------------------------------- the question */
divider('The question', 'What each system asks when it says “Describe”.');
S('Three questions', [...nav('The question'), eyebrow('Three questions, one command word'), heading('Same word. Look at what each one asks for.', 186, 56),
  ...SYS.flatMap((s, i) => {
    const d = D[s.k];
    return [
      card(i, 330, 600, true), ...flag(i, 330, s),
      T(d.stage.task, X(i) + 32, 400, 500, 300, { size: 46, weight: '800', lineHeight: 1.15, name: `Question ${s.short}` }, after()),
      T('YOUR ANSWER SHOULD GIVE', X(i) + 32, 730, 500, 30, { size: 20, weight: '800', color: C.muted, tracking: 0.06, name: 'Label' }, after()),
      T(d.stage.outcome, X(i) + 32, 770, 500, 140, { size: 34, weight: '600', color: s.col, name: `Outcome ${s.short}` }, after()),
    ];
  }),
], { notes: SYS.map(s => `${s.name}: ${D[s.k].stage.task} Your answer should give: ${D[s.k].stage.outcome}`).join('\n') });
S('What “Describe” means', [...nav('The question'), eyebrow('What “Describe” means in each system'), heading('Each system says what the word asks, in its own terms.', 186, 56),
  ...[
    ['What the mark schemes reward', 'One mark for each relevant point. A few also credit an expansion of a point.', 'AQA and OCR mark schemes, 368 question parts read'],
    ['The syllabus glossary', '“Give a detailed account of the ‘what’ and the ‘how’.”', 'MOE O-Level Computing syllabus (2021): its most used term, in eight learning outcomes'],
    ['The examiners’ commentary', 'The questions test how an information system is made up and how it works (信息系统组成以及工作原理).', 'Zhejiang Examinations Authority, analysis of the June 2025 papers'],
  ].flatMap(([h, t, src], i) => [
    card(i, 330, 600, true), ...flag(i, 330, SYS[i]),
    T(h, X(i) + 32, 400, 500, 50, { size: 30, weight: '800', color: C.muted, name: 'What' }, after()),
    T(t, X(i) + 32, 460, 500, 300, { size: 40, weight: '700', lineHeight: 1.2, name: 'Meaning' }, after()),
    T(src, X(i) + 32, 790, 500, 120, { size: 24, color: C.muted, name: 'Source' }, after()),
  ]),
], { notes: 'UK: no definition in the papers read; the mark schemes credit one relevant point per mark. Singapore: MOE glossary, a detailed account of the what and the how. China: the Zhejiang commentary says the questions test how an information system is made up and how it works.' });

/* ---------------------------------------------------------------- the link */
divider('The link', 'The relationship each answer has to show: the Nodes formula, system by system.');
S('The link each needs', [...nav('The link'), eyebrow('The link each answer needs'), heading('Same command word, three different relationships.', 186, 56),
  ...SYS.flatMap((s, i) => {
    const d = D[s.k], y = 320 + i * 220;
    const links = d.ladder.relation.split(/\s*→\s*/);
    const widths = links.length === 2 ? [520, 640] : [380, 380, 560];
    return [
      R(80, y, 1760, 190, { radius: 20, fill: s.tint, strokeWidth: 0, name: `Row ${s.short}` }, onClick()),
      T(s.short, 110, y + 30, 260, 50, { size: 40, weight: '800', color: s.col, name: `System ${s.short}` }, after()),
      T(d.research.relationship.label, 110, y + 90, 260, 80, { size: 24, weight: '700', color: C.muted, name: 'Relationship' }, after()),
      ...chain(links, 400, y + 40, { h: 110, size: 30, gap: 60, widths, stroke: s.col, build: 'with' }),
    ];
  }),
], { notes: SYS.map(s => `${s.name}: ${D[s.k].ladder.relation} (${D[s.k].research.relationship.label}: ${D[s.k].research.relationship.requires})`).join('\n') });
S('What the link adds', [...nav('The link'), eyebrow('What each system adds to “Describe”'),
  heading('UK pairs a part with its job. Singapore adds how the parts work together. China places the parts inside one system, in its setting.', 186, 48),
  ...[
    ['One part at a time', 'Name each component, then its exact job. Precision on every line.', 'Control unit → decodes instructions and sends control signals.'],
    ['Parts, then the interaction', 'Each part’s function, and the “how”: what passes between them.', 'The processor reads from and writes to memory over the buses.'],
    ['The whole system, in context', 'The system’s parts in this case: its users, hardware, software and data.', 'Users: technicians and students. Data: CPU readings, logins and the export queue.'],
  ].flatMap(([h, t, ex], i) => [
    card(i, 420, 560, true), ...flag(i, 420, SYS[i]),
    T(h, X(i) + 32, 490, 500, 110, { size: 44, weight: '800', lineHeight: 1.1 }, after()),
    T(t, X(i) + 32, 620, 500, 140, { size: 32 }, after()),
    T(ex, X(i) + 32, 790, 500, 160, { size: 28, weight: '600', color: SYS[i].col }, after()),
  ]),
], { notes: 'UK: decompose and name precisely. Singapore: the function of each part and how they interact. China: describe the system as a whole, applied to the scenario.' });

/* ---------------------------------------------------------------- the answer */
divider('The answer', 'The answer that earns it in each system, element by element: the worked example from each Nodes stage.');
for (const s of SYS) {
  const d = D[s.k], w = d.worked;
  const lines = s.k === 'sg'
    ? w.text.split(/(?<=\.)\s+/)
    : w.text.split(/\n|(?<=\.)\s+(?=[A-Z])/).filter(Boolean);
  const tags = s.k === 'cn' ? lines.map(l => l.split(':')[0]) : s.k === 'sg' ? w.labels : lines.map(l => (w.labels.find(x => x.startsWith(l.split(':')[0])) || l.split(':')[0]).split(':')[1]?.trim() || '');
  S(`The answer: ${s.short}`, [...nav('The answer'), eyebrow(`${s.name} · the excellent answer`),
    heading(d.stage.task, 186, 52),
    ...lines.flatMap((ln, i) => {
      const y = 340 + i * (lines.length > 4 ? 100 : 130);
      return [
        dot(80, y + 6, 52, s.col, String(i + 1), onClick()),
        T(ln, 160, y, 1260, 90, { size: 36, weight: '600', name: `Line ${i + 1}` }, after()),
        R(1480, y + 4, 360, 56, { radius: 28, fill: '#ffffff', stroke: s.col, strokeWidth: 3, name: `Tag ${i + 1}` }, after()),
        T(tags[i] || '', 1480, y + 14, 360, 40, { size: 24, weight: '800', align: 'center', color: s.col, name: `Tag label ${i + 1}` }, after()),
      ];
    }),
    note(`${w.units.length} useful elements: a planning count, not marks. From the Nodes stage: ${d.from}`, 990),
  ], { notes: `${s.name}, the worked example: ${w.text}\nElements: ${w.units.map((u, i) => `${i + 1} ${w.labels[i]}: ${u}`).join('; ')}.` });
}
{
  const ukB = D.uk.students.B, sgB = D.sg.students.B, cnA = D.cn.students.A;
  const cnWhy = (D.cn.readings.find(r => r.student === 'A')?.gap || '').replace(/^Possible explanation:\s*/, '').split(' Probe:')[0];
  S('Where each answer slips', [...nav('The answer'), eyebrow('Where each answer slips'), heading('The near-miss looks different in each system.', 186, 56),
    ...[
      [SYS[0], 'ALU: the brain of the CPU.\nRegisters: store data.', 'A label, and words that fit any memory: not each part’s exact job.', ukB.feedback],
      [SYS[1], 'Main memory stores files.', 'That is secondary storage, and nothing joins the processor to memory.', sgB.feedback],
      [SYS[2], cnA.answer, cnWhy || 'A label for the whole, with none of the system’s parts.', D.cn.students.A.feedback],
    ].flatMap(([s, ans, why, ask], i) => [
      card(i, 320, 640, true), ...flag(i, 320, s),
      T(`“${ans}”`, X(i) + 32, 390, 500, 150, { size: 36, weight: '700', color: C.muted, name: 'Slip' }, after()),
      T(why, X(i) + 32, 560, 500, 170, { size: 30 }, after()),
      T(`Ask: ${(ask.match(/^“[^”]*”/) || [ask])[0]}`, X(i) + 32, 760, 500, 180, { size: 26, weight: '700', color: s.col, name: 'Probe' }, after()),
    ]),
  ], { notes: `UK, the stable answer: ${ukB.answer}\n${ukB.why}\nSingapore, the stable answer: ${sgB.answer}\n${sgB.why}\nChina, the weak answer: ${cnA.answer}\n${cnWhy}` });
}

/* ---------------------------------------------------------------- the marks */
divider('The marks', 'How each system’s papers award the marks for a Describe.');
S('How the marks fall', [...nav('The marks'), eyebrow('How the marks fall'), heading('Points, follow-ons, or the right statement about a system.', 186, 56),
  ...[
    ['40 question parts, 1–6 marks', 'One mark for each relevant point. A few also credit an expansion of a point.', 'AQA 8525/2, June 2023, Q8.2: the role of the clock, control unit and a register, 1 mark for each component.'],
    ['6 question parts, all 2 marks', 'Two points, or a point and how it works. Cambridge lists the points, with follow-ons marked “…”.', 'Detail the question did not ask for earns nothing, though it costs nothing either.'],
    ['3 question parts, 1–2 marks', 'Two 1-mark single-choice items on how data flows, and one open 2-mark description with a sample answer.', 'Zhejiang June 2025, Q13(1): sensor → smart terminal → server → database. All or nothing.'],
  ].flatMap(([n, how, ex], i) => [
    card(i, 320, 640, true), ...flag(i, 320, SYS[i]),
    T(n, X(i) + 32, 390, 500, 110, { size: 40, weight: '800', lineHeight: 1.1 }, after()),
    T(how, X(i) + 32, 520, 500, 200, { size: 30 }, after()),
    T(ex, X(i) + 32, 750, 500, 190, { size: 26, color: C.muted }, after()),
  ]),
  note('Singapore: SEAB publishes no mark schemes, so the points patterns are from a Cambridge O Level scheme. China: the reference answers come from a resource site, not the examinations authority.', 980),
], { notes: 'UK: points-marked, one mark per relevant point. Singapore: every specimen Describe worth 2; Cambridge points with follow-ons. China: single choice on data flow, and one open description with a sample answer.' });

/* ---------------------------------------------------------------- the difference */
divider('The difference', 'What the papers show, side by side, and what they cannot show.');
{
  const ROWS = [
    ['The unit of the answer', 'One part at a time', 'Two parts and how they interact', 'The whole system, in its setting'],
    ['The link', 'Component → its specific role', 'Each part → its function → how they work together', 'The system → its parts → how they connect'],
    ['How it is marked', 'One mark per relevant point', '2 marks: two points, or a point and how', 'Single choice, all or nothing; one open change'],
    ['The typical slip', 'A label or a vague role', 'Main memory confused with storage; nothing joining the parts', 'A general label, not this system’s parts'],
  ];
  S('Side by side', [...nav('The difference'), eyebrow('Side by side'), heading('Describe, as each system asks it', 186, 64),
    R(80, 300, 1760, 690, {}, enter()),
    ...SYS.map((s, i) => T(s.short.toUpperCase(), 520 + i * 440, 326, 420, 34, { size: 24, weight: '800', color: s.col, tracking: 0.08, name: `Head ${s.short}` }, enter())),
    ...ROWS.flatMap(([h, ...cells], r) => {
      const y = 380 + r * 150;
      return [
        ...(r ? [R(120, y - 16, 1680, 2, { radius: 0, fill: C.tint, strokeWidth: 0, name: 'Rule' }, after())] : []),
        T(h, 120, y, 380, 120, { size: 30, weight: '800' }, onClick()),
        ...cells.map((c, i) => T(c, 520 + i * 440, y, 410, 130, { size: 30, color: C.ink }, after())),
      ];
    }),
  ], { notes: ROWS.map(r => `${r[0]}: UK ${r[1]}; Singapore ${r[2]}; China ${r[3]}.`).join('\n') });
}
S('What the papers show', [...nav('The difference'), eyebrow('What the papers on file show'), heading('From the Nodes Across systems evidence', 186, 64),
  ...[
    'Fetch-decode-execute itself is assessed only in the UK papers on file. Singapore’s specimen assesses memory roles; Zhejiang assesses hardware within a scenario.',
    'The same topic is assessed through different relationships: UK names, sequences and a part’s causal role; Singapore purpose; Zhejiang choosing the correct statement about a system.',
    'Only the UK parts have a demand reading and a points-based mark scheme, so demand can be compared in detail only for the UK.',
    'A similar demand does not establish a similar difficulty. There are no Singapore or China examiner reports, so whether students there struggle in the same way cannot be read from this corpus.',
  ].flatMap((t, i) => [
    dot(80, 330 + i * 160, 64, i === 3 ? C.X : C.ink, String(i + 1), onClick()),
    T(t, 180, 330 + i * 160, 1660, 140, { size: 34, weight: i === 3 ? '700' : '400' }, after()),
  ]),
], { notes: 'The four findings from the Nodes Across systems page, on the computer system as each system’s papers assess it.' });
S('Teaching all three', [...nav('The difference'), eyebrow('In the classroom'),
  heading('Same knowledge, three shapes of answer', 186, 64),
  T('Teach the CPU once. Then ask for it in each system’s shape, and name the link each one needs.', 80, 300, 1760, 60, { size: 38, color: C.muted }, enter()),
  ...[
    ['Precise', 'Name each part, then its exact job.', 'Describe the main components of the CPU.'],
    ['Connected', 'Each part’s function, then what passes between them.', 'Describe the function of the processor and main memory.'],
    ['In context', 'This system’s parts: users, hardware, software, data, and how they connect.', 'Describe the lab’s monitoring system as an information system.'],
  ].flatMap(([h, t, q], i) => [
    card(i, 420, 520, true), ...flag(i, 420, SYS[i]),
    T(h, X(i) + 32, 490, 500, 60, { size: 48, weight: '800', color: SYS[i].col }, after()),
    T(t, X(i) + 32, 570, 500, 160, { size: 32 }, after()),
    T(q, X(i) + 32, 760, 500, 150, { size: 28, weight: '700', color: C.muted }, after()),
  ]),
  note('The differences are in how each system’s papers frame the task, not evidence that students in each country think differently.', 980),
], { notes: 'Same CPU knowledge, three demands. UK: precision on each part. Singapore: function and interaction. China: the system as a whole, in its context. Name the link each needs, as the Nodes formula does.' });
/* ---------------------------------------------------------------- the roadmap (from Nodes' Across systems page) */
{
  const RM = D.roadmap, COL = ['#56b4e9', '#3ccf9f', C.Cc];
  S('The research roadmap', [
    T('THE RESEARCH ROADMAP', 80, 70, 1700, 40, { size: 28, weight: '800', color: C.Cc, tracking: 0.12, name: 'Eyebrow' }, still),
    T(RM.framing, 80, 118, 1760, 170, { size: 60, weight: '800', color: '#ffffff', lineHeight: 1.1, tracking: -0.01, name: 'Heading' }, still),
    ...RM.stages.flatMap((st, i) => {
      const x = 80 + i * 600;
      return [
        R(x, 330, 560, 470, { radius: 22, fill: '#202a45', stroke: '#2f3a5c', strokeWidth: 2, name: `Stage ${st.label}` }, onClick()),
        R(x, 330, 560, 10, { radius: 0, fill: COL[i], strokeWidth: 0, name: 'Top' }, after()),
        T(st.label.toUpperCase(), x + 40, 370, 480, 36, { size: 26, weight: '800', color: COL[i], tracking: 0.1, name: 'Stage label' }, after()),
        R(x + 40, 730, 150, 46, { radius: 23, fill: 'transparent', fillOpacity: 0, stroke: COL[i], strokeWidth: 2, name: 'Status pill' }, after()),
        T(st.status, x + 40, 739, 150, 30, { size: 20, weight: '800', align: 'center', color: COL[i], name: 'Status' }, after()),
        T(st.question, x + 40, 430, 480, 170, { size: 40, weight: '800', color: '#ffffff', lineHeight: 1.15, name: 'Question' }, after()),
        T(st.evidence, x + 40, 610, 480, 110, { size: 26, color: '#c9d1e8', name: 'Evidence' }, after()),
      ];
    }),
    T(`Provisional: ${RM.stages[0].now}`, 80, 830, 1760, 80, { size: 24, color: '#e6c27a', name: 'Provisional' }, onClick()),
    T(RM.purpose, 80, 930, 1760, 60, { size: 32, weight: '700', color: '#ffffff', name: 'Purpose' }, after()),
  ], { bg: C.ink, notes: `${RM.framing}\n${RM.question}\n${RM.stages.map(st => `${st.label} (${st.status}): ${st.question} Evidence: ${st.evidence} Now: ${st.now}`).join('\n')}\n${RM.purpose}` });
  S('What to look for in the materials', [...nav('The difference'), eyebrow('Taught linkage · the crucial next step'),
    heading('Not whether textbooks contain explanations, but whether they teach students to build one.', 186, 48),
    ...RM.checklist.flatMap((t, i) => [
      dot(80, 340 + i * 110, 70, C.ink, String(i + 1), onClick()),
      T(t, 190, 352 + i * 110, 1640, 60, { size: 42, weight: '700' }, after()),
    ]),
    R(80, 900, 1760, 100, { radius: 16, fill: C.amber, strokeWidth: 0, name: 'Rule card' }, onClick()),
    T(RM.rule, 110, 920, 1700, 60, { size: 30, weight: '700' }, after()),
  ], { notes: `Apply the same checklist to matched topics and tasks in each qualification.\n${RM.checklist.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n${RM.rule}\n${RM.comparable}` });
}
{
  const links = [
    ['UK: this stage in Nodes', D.uk.from], ['Singapore: this stage in Nodes', D.sg.from], ['China: this stage in Nodes', D.cn.from],
    ['AQA 8525/2, June 2023: mark scheme', 'https://filestore.aqa.org.uk/sample-papers-and-mark-schemes/2023/june/AQA-85252-MS-JUN23.PDF'],
    ['SEAB 7155/01 specimen paper, 2025', 'https://isomer-user-content.by.gov.sg/334/c96eb69a-ed24-491a-8234-7eebc546a0e4/7155_y25_sp_1.pdf'],
    ['Cambridge 2210, June 2024: examiner report', 'https://www.cambridgeinternational.org/Images/570403-june-2024-examiner-report.pdf'],
    ['Zhejiang IT, June 2025: paper and answers', 'https://zy.21cnjy.com/23274375'],
  ];
  S('Sources', [...nav('The difference'), eyebrow('Sources'), heading('Check each claim against its source.', 186, 56),
    ...links.flatMap(([label, url], i) => {
      const l = T(`${label} ↗`, 80, 320 + i * 90, 1760, 56, { size: 34, weight: '700', color: C.U, underline: true, name: `Link ${i + 1}` }, enter());
      l.interact = { ...l.interact, click: 'link', url };
      return [l];
    }),
  ], { notes: links.map(([l, u]) => `${l}: ${u}`).join('\n') });
}

window.__deck = { id: 'nodes-describe-three-systems', title: 'One command word, three systems: Describe', width: 1920, height: 1080, version: 1, slides };
