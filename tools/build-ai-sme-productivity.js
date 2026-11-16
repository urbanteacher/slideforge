#!/usr/bin/env node
'use strict';

/* Build "The Power of AI: practical case studies and proven tips for
 * productivity", a 40-minute session by Mark Martin MBE CITP for about 400
 * London SMEs at Working Smarter, Growing Together (Central District
 * Alliance, with Metro Bank, LabTech, UK Black Tech, and Camden and Islington
 * councils).
 *
 * The shape: where London's small firms are with AI (official figures), what
 * the research says AI does to productivity and where it falls short, five
 * case studies by kind of business, seven proven tips, where the human stays
 * in the loop, and a 7-day SME action plan that each person fills in on
 * sme-plan.html (a phone page at the root of the app; its QR code is drawn
 * here into assets/ai-sme/) and copies to take away.
 *
 * Every figure names its source in the slide's notes. Vendor surveys are said
 * as the vendor's. Four of the five case studies are composites of common SME
 * uses, not named firms, and the notes say so; the named firm (Vertis Media)
 * is from the government's AI upskilling case studies.
 *
 * Writes output/Power_of_AI_SMEs.sfdeck.json (for File → Import) and
 * js/lessons-ai-sme.js, which builds it into the app's lesson list and seeds
 * it into the Library's UK Black Tech folder. Theme: UK Black Tech. */
const fs = require('node:fs');
const path = require('node:path');

const memory = new Map();
global.localStorage = {
  getItem: key => memory.get(key) ?? null,
  setItem: (key, value) => memory.set(key, String(value)),
  removeItem: key => memory.delete(key)
};
global.window = { localStorage: global.localStorage };
require(path.join(__dirname, '..', 'js/model.js'));
const SF = global.window.SF;

const ROOT = path.join(__dirname, '..');
const stamp = Date.parse('2026-10-15T00:00:00Z');
const card = (heading, body) => `${heading}\t${body}`;
const stat = (label, value, note) => [label, value, note].join('\t');
/* A compare row is three cells: the row's own label, then one per column. */
const row = (label, left, right) => [label, left, right].join('\t');
/* The take-away page: sme-plan.html at the root of the app, live on Render. */
const PLAN_URL = 'https://slideforge-rpjj.onrender.com/sme-plan.html';
const PLAN_SHORT = 'slideforge-rpjj.onrender.com/sme-plan.html';
const PLAN_QR = 'assets/ai-sme/plan-qr.svg';
const PLAN_POSTER = 'assets/ai-sme/plan-poster.svg';
/* The clips: one HTML file each in tools/ai-sme/clips/, rendered to MP4 with
   tools/motion/render.mjs (see its README). A clip slide plays once, muted. */
const clip = (name, title, alt, notes) => ({
  type: 'video', title, video: `assets/ai-sme/clips/${name}.mp4`, videoPoster: `assets/ai-sme/clips/${name}-poster.jpg`,
  videoAutoplay: true, videoMuted: true, imageAlt: alt, design: { capStyle: 'none' }, notes
});

/* Who can help, for the support posters. A url of null draws a SAMPLE code
   that says, when scanned, where to put the real link. Replace each null with
   the partner's link once they confirm what they offer. */
const SUPPORT = {
  metro: { name: 'Metro Bank', logo: 'assets/ai-sme/logos/metro-bank.svg', lines: ['Business banking, cash flow', 'and finance'], url: null },
  cda: { name: 'Central District Alliance', logo: 'assets/ai-sme/logos/cda.png', lines: ['Your local business network:', 'events, support, introductions'], url: null },
  ukbt: { name: 'UK Black Tech', logo: 'assets/brand/ukbt-wordmark.png', lines: ['Tech skills, community', 'and events'], url: null },
  labtech: { name: 'LabTech', logo: 'assets/ai-sme/logos/labtech-white.svg', lines: ['Workspace, and Camden’s tech', 'and creative community'], url: null },
  camden: { name: 'Camden Council', logo: 'assets/ai-sme/logos/camden-white.svg', lines: ['Business support and advice', 'for Camden firms'], url: null },
  islington: { name: 'Islington Council', logo: 'assets/ai-sme/logos/islington.svg', lines: ['Business support and advice', 'for Islington firms'], url: null },
  survey: { name: 'local AI survey', lines: [], url: null }
};
const SUPPORT_SLIDES = [
  { file: 'support-money', kicker: 'Who can help · finance and growth', title: 'Money, cash flow and contacts', cards: ['metro', 'cda'] },
  { file: 'support-tech', kicker: 'Who can help · technology and AI', title: 'Skills, tools and community', cards: ['ukbt', 'labtech'] },
  { file: 'support-council', kicker: 'Who can help · your council', title: 'Local business support', cards: ['camden', 'islington'] }
];
const supportAsset = file => `assets/ai-sme/${file}.svg`;
/* Under 136 bytes, the most js/qr.js encodes. */
const sampleText = key => `SAMPLE QR CODE. Put the ${SUPPORT[key].name} link in SUPPORT.${key}.url`;

const COMPOSITE = 'A composite of how firms like this commonly use AI, not a named business. Say so out loud: "This is what I see again and again in businesses like yours."';

/* --------------------------------------------------------------- the deck */
const slides = [
  {
    type: 'content',
    hidden: true,
    title: 'Speaker page',
    subtitle: 'Hidden from the room',
    bullets: [
      'A 40-minute session for about 400 business owners and leaders: what AI is really doing for small firms, where it goes wrong, what heavy use costs (more work, weaker skills), three case studies, the prompt recipe, where the human stays in the loop, and a 7-day action plan each person fills in during the session.',
      'No tech needed from the room. Interaction is hands up and turn to your neighbour, which works at 400.',
      'Before the day: add your name and role to the title slide notes, check the partners’ logos with CDA, and confirm any offers from the partners you want to name on “Grow together”.'
    ],
    notes:
      'RUNNING ORDER · ABOUT 40 MINUTES, 39 SLIDES SHOWN\n' +
      '· Open — 4 min: title, about me, hands up, Friday 4pm\n' +
      '· 01 Where we are — 2 min: the figures\n' +
      '· 02 What the evidence says — 5 min: four studies, the jagged frontier, the check\n' +
      '· 03 The hidden costs — 7 min: inside an AI company, faster means more, did people learn?, the psychology of leaning on it, the skill you skip\n' +
      '· 04 Three case studies and tips — 7 min: café, accountancy, trades, the prompt recipe, seven uses\n' +
      '· 05 Humans in the loop — 4 min: how much checking, when nobody checked, the data traffic light, five habits\n' +
      '· 06 Your 7-day action plan — 9 min: small hours, the key message, the plan and its code, questions 1–2, 3 and who can help, 4–5, one commitment, thank you, the survey\n\n' +
      'Hidden slides are backup for questions: the old counterweight and fluent-isn’t-right numbers, the online shop and agency cases, the tools table, a pilot run properly, the 30-day plan, grow together and the sources.\n\n' +
      'FOR 30 MINUTES. Also hide “The psychology of leaning on it”, the accountancy case, “Seven uses” and “Small hours add up”.\n\n' +
      'THE BIG IDEA. Productivity from AI is not a purchase, it is a habit: one task, measured, checked, shared. The evidence says it makes people faster and better inside its frontier and confidently wrong outside it. Everything in the talk hangs off that.\n\n' +
      'THE TONE. Practical and honest. 400 owners have heard the hype. Concede the catch early (the jagged frontier, the hidden costs, the cases where nobody checked) and the room trusts the tips. The human in the loop is not a disclaimer at the end: it is how every case study and every tip works.\n\n' +
      'SOURCES (also in each slide’s notes). ONS, “Artificial intelligence in UK businesses: 2023 to 2026” (20 July 2026, BICS wave 159, June 2026). British Chambers of Commerce with Atos and ISER/MiSoC, “Future of Work: AI in the Workplace” (19 March 2026; 668 firms, 94% SMEs). Noy and Zhang, “Experimental evidence on the productivity effects of generative artificial intelligence”, Science (2023). Brynjolfsson, Li and Raymond, “Generative AI at Work”, Quarterly Journal of Economics (2025). Dell’Acqua et al., “Navigating the Jagged Technological Frontier”, Harvard Business School working paper 24-013 (2023). Government Digital Service, Microsoft 365 Copilot cross-government experiment findings (2025). Dell Technologies, “AI in Action” UK SME research (2026; vendor). OpenAI with Enterprise Nation, UK SME survey (2026; vendor). DSIT, “What Works for AI Upskilling in the UK: supporting case studies” (10 June 2026). Humlum and Vestergaard, “Still Waters, Rapid Currents: Early Labor Market Transformation under Generative AI”, NBER working paper 33777 (revised March 2026; first issued May 2025 as “Large Language Models, Small Labor Market Effects”). METR, “Measuring the impact of early-2025 AI on experienced open-source developer productivity” (10 July 2025), and its February 2026 update. Niederhoffer et al., “AI-generated ‘workslop’ is destroying productivity”, Harvard Business Review (September 2025; Stanford and BetterUp Labs survey). BBC News: “How long will humans be needed for translation?” (John Laurenson, 14 October 2026); “Paramedics experiment with AI note-taking tool” (13 October 2026); “Make sure use of AI is safe, Guernsey data watchdog warns” (12 October 2026). Moffatt v. Air Canada, BC Civil Resolution Tribunal (February 2024). Associated Press reporting on Deloitte and the Australian Department of Employment and Workplace Relations (October 2025). Ayinde v London Borough of Haringey and Al-Haroun v Qatar National Bank [2025] EWHC 1383 (Admin), 6 June 2025. Anthropic, “How AI is transforming work at Anthropic” (2 December 2025). Shen and Tamkin, “How AI assistance impacts the formation of coding skills”, Anthropic (29 January 2026; arXiv 2601.20245). Ranganathan and Ye, “AI Doesn’t Reduce Work—It Intensifies It”, Harvard Business Review (9 February 2026). Lee et al., “The Impact of Generative AI on Critical Thinking”, CHI 2025 (Microsoft Research and Carnegie Mellon). Yunis, Jamali and Umar, “The illusion of AI mastery”, Journal of Innovation and Knowledge (2026; conceptual, no data). ICO, guidance on AI and data protection. NCSC, Cyber Essentials.\n\n' +
      'CHECK BEFORE YOU PRESENT. ONS and BCC publish new waves often: if a newer figure is out on the day, use it and change the notes.'
  },

  /* ---------------------------------------------------------------- OPEN */
  {
    type: 'title',
    title: 'The Power of AI',
    subtitle: 'Practical case studies and proven tips for productivity',
    notes: 'TITLE · up as the room settles. Working Smarter, Growing Together: Productivity, AI and the Future of Local SMEs, facilitated by Central District Alliance with Metro Bank, LabTech, UK Black Tech, and Camden and Islington councils.\n\nThank CDA and the partners by name, then the next slide introduces you.'
  },
  {
    type: 'split',
    title: 'Mark Martin MBE CITP',
    bullets: [
      'AI tools for SMEs',
      'Productivity improvements',
      'Streamlining business processes',
      'Identifying growth opportunities',
      'Practical implementation'
    ],
    image: 'assets/lesson/ipdv/mark-martin-portrait.jpg',
    imageSide: 'left',
    imageAlt: 'Mark Martin',
    notes: 'INTRO · 30 SECONDS. One line about who you are and why you care about small firms, then the promise: the five things on the slide, all practical, and everyone leaves with a 7-day action plan they fill in during the session.'
  },
  {
    hidden: true,
    type: 'statement',
    body: 'You don’t need an AI strategy. You need one hour back this week.',
    subtitle: 'Then the next one',
    design: { words: 'rise', wordStagger: 'wave' },
    notes: 'BACKUP · HIDDEN. The Friday clip now makes this point.\n\nOPEN · 1 MINUTE. Say it and pause. The promise of the next half hour: no hype, no jargon, things you can try on Monday morning.\n\nThe argument underneath: the firms getting value are not the ones with a strategy document, they are the ones who picked one task, measured it and kept going.'
  },
  {
    type: 'cards',
    title: 'Hands up if…',
    subtitle: 'Keep your hand up if it’s still true',
    bullets: [
      card('You’ve tried an AI tool', 'ChatGPT, Copilot, Gemini, Claude, anything.'),
      card('You used one this week', 'For real work, not a party trick.'),
      card('Your team uses one', 'And you know what for.'),
      card('You can say what it saved you', 'In hours, or in pounds.')
    ],
    progressive: true,
    notes: 'OPEN · 2 MINUTES. Reveal one card at a time; hands go down as you go. Most rooms go from nearly everyone to a handful. Name what just happened: "Almost everyone has tried it. Very few can say what it saved them. That gap is what today is about."'
  },
  clip('friday', 'Imagine: it’s Friday, 4pm',
    'Animation: it’s Friday, 4pm, and five jobs are still on the list. The clock runs on to 7:40pm, then one job, chasing 12 unpaid invoices, drops from an hour to ten minutes (AI drafts, you check) and the clock gives an hour back. One hour back: that’s where it starts.',
    'IMAGINE · 45 SECONDS. Let it play without talking for the first few seconds, then: "Imagine it’s Friday, 4pm. Here’s what’s still on your list." As the clock runs: "That’s your evening gone." When the invoices turn green: "Now hand one of these to AI. It drafts the reminders, you check them, and you send them. Ten minutes, not an hour." Land it: "One hour back. That’s where it starts, and that’s what the next half hour is about."\n\nThe clip plays once and holds on its last frame. The list is a composite of what small firms say eats their Friday.'),

  /* -------------------------------------------------------- 01 WHERE WE ARE */
  {
    hidden: true,
    type: 'section',
    title: 'Where we are',
    subtitle: 'What the official figures say about firms like yours',
    notes: 'BACKUP · HIDDEN. The figures slide stands on its own.\n\n01 · 4 MINUTES.'
  },
  {
    type: 'stats',
    title: 'More firms use AI than ever',
    bullets: [
      stat('UK firms using AI', '35%', 'up from about 12% in 2023 (ONS, June 2026)'),
      stat('Firms with 0–9 staff', '28%', 'against 49% of firms with 250+ (ONS)'),
      stat('“Actively using AI”', '54%', 'mostly SMEs, up from 35% a year earlier (BCC, 2026)'),
      stat('Headcount unchanged', '95%', 'of SMEs using AI say it hasn’t changed their workforce (BCC)')
    ],
    progressive: true,
    notes: '01 · 2 MINUTES. Two sources, two different questions, so two different numbers. Say that: the ONS asks about specific AI technologies, the BCC asks whether you are actively using AI.\n\nONS, “Artificial intelligence in UK businesses: 2023 to 2026” (20 July 2026), Business Insights and Conditions Survey wave 159, June 2026: about 35% of businesses report using at least one AI technology, up from about 12% in September 2023; 28% of firms with 0 to 9 employees, 49% of those with 250 or more.\n\nBritish Chambers of Commerce with Atos, analysis by ISER/MiSoC at the University of Essex, “Future of Work: AI in the Workplace” (19 March 2026): 54% of firms actively using AI; 668 firms surveyed 12 January to 6 February 2026, 94% of them SMEs. The BCC’s earlier surveys: 35% in 2025, 25% in 2024, 23% in 2023. Different samples, so read the jump with care.\n\nThe fourth number, from the same BCC survey: 95% of SMEs using AI report no impact on workforce size over the past year. AI is not emptying small firms; most are only scratching the surface.\n\nThe point for the room: the smallest firms are furthest behind, and that is most of this room.'
  },
  {
    hidden: true,
    type: 'keyfact',
    title: 'Wide, not deep',
    subtitle: 'What the figures also say',
    body: '95% of SMEs using AI say it hasn’t changed the size of their workforce',
    bullets: [
      'Most firms use general chat tools. About one in ten has gone further, into AI built for their business.',
      'Large language models are the most used kind of AI, at 18% of firms.',
      'So the gain on the table now is not replacing people. It is giving the people you have their time back.'
    ],
    progressive: true, buildMode: 'dim',
    notes: 'BACKUP · HIDDEN. Its headline number is now on the figures slide.\n\n01 · 2 MINUTES. BCC (March 2026): 95% of SMEs using AI report no impact on workforce size over the past year; 86% say job roles are unchanged; about one in ten has adopted bespoke AI rather than generic tools. ONS (July 2026): large language models are the most used AI technology, at 18%; around half of firms report no impact on headcount.\n\nThe reassurance and the challenge in one slide: AI is not emptying small firms, and most of them are only scratching the surface.'
  },

  /* ------------------------------------------------ 02 WHAT THE EVIDENCE SAYS */
  {
    type: 'section',
    title: 'What the evidence says',
    subtitle: 'Controlled studies, not sales claims',
    notes: '02 · 5 MINUTES. The difference that matters: these are experiments with a control group, not surveys of people who like the product.'
  },
  {
    type: 'stats',
    title: 'Four studies, one pattern',
    bullets: [
      stat('Business writing', '40% faster', 'and quality up 18% (Noy and Zhang, Science, 2023)'),
      stat('Customer support', '+14%', 'issues resolved an hour; +34% for new staff (Brynjolfsson et al., 2025)'),
      stat('Consultants', '25% faster', 'and 40% better on suitable tasks (Harvard and BCG, 2023)'),
      stat('Civil servants', '26 min', 'a day saved with Copilot, self-reported, 20,000 staff (GDS, 2025)')
    ],
    progressive: true,
    notes: '02 · 3 MINUTES.\n\nNoy and Zhang, Science (2023): 453 college-educated professionals on writing tasks such as press releases, short reports and emails. With ChatGPT, time fell by 40% and graded quality rose by 18%.\n\nBrynjolfsson, Li and Raymond, “Generative AI at Work”, Quarterly Journal of Economics (2025): 5,179 customer support agents. An AI assistant raised issues resolved per hour by 14% on average and by 34% for novice and low-skilled workers; the most experienced barely gained.\n\nDell’Acqua et al., “Navigating the Jagged Technological Frontier”, Harvard Business School working paper 24-013 (2023), with Boston Consulting Group: 758 consultants. On tasks inside AI’s capability they completed 12% more tasks, 25% faster, at over 40% higher quality.\n\nGovernment Digital Service, Microsoft 365 Copilot experiment (2025): around 20,000 civil servants across government reported saving an average of 26 minutes a day. Self-reported, so say so.\n\nThe pattern to land: biggest gains for writing, summarising and first drafts, and for the least experienced. That is good news for small teams and new staff.'
  },
  {
    hidden: true,
    type: 'stats',
    title: 'The honest counterweight',
    bullets: [
      stat('Danish workers, two years on', 'No change', 'in earnings or hours worked; firms added AI-checking work (NBER, 2026)'),
      stat('Experienced developers', '19% slower', 'measured, while feeling 20% faster (METR, early-2025 tools)'),
      stat('AI “workslop” from colleagues', '~2 hours', 'to fix each piece that looked done but wasn’t (HBR survey, 2025)')
    ],
    progressive: true,
    notes: 'BACKUP · HIDDEN. Its three findings now sit in The hidden costs: METR in the traps, the Danish study and workslop in Faster means more.\n\n02 · 2 MINUTES. Say this slide plainly: the gains are real but not automatic, and the room has heard enough hype to respect you for it.\n\nHumlum and Vestergaard, “Still Waters, Rapid Currents”, NBER working paper 33777 (revised March 2026): Danish administrative records linked to large worker surveys. Precise null effects on earnings and recorded hours two years after ChatGPT’s launch, ruling out effects larger than 2%. Employers reorganised work, adding tasks in content generation, AI oversight and AI integration. So the time saved often goes into new work, including checking the AI.\n\nMETR (10 July 2025): a randomised trial of 16 experienced open-source developers on 246 real tasks. With AI tools they took 19% longer; they had expected a 24% speed-up and afterwards believed they had been 20% faster. METR says the result reflects early-2025 tools in one setting and that tools have improved since; its February 2026 update could not measure the new effect reliably. The lesson that lasts is the gap between feeling faster and being faster: measure it.\n\nHarvard Business Review (September 2025), a Stanford and BetterUp Labs survey of about 1,150 US desk workers: 40% had received “workslop” in the last month (AI output that looks finished but does not do the job), and each case took nearly two hours to deal with. Self-reported, so say so.\n\nWhat not to quote: the widely shared “95% of AI pilots fail” figure (MIT NANDA, 2025) rests on 52 interviews and 153 survey responses, so it is not used here.'
  },
  clip('frontier', 'The jagged frontier',
    'Animation: the jagged frontier. Six tasks sit in one row at the same height, so they look just as hard. A jagged line rises over the ones AI does well (draft a reply to a customer, summarise a meeting, write a product listing) and dips under the ones it gets wrong (cite a court case, allergen advice, VAT on a quote). Brilliant at some tasks, wrong at others that look just as easy. So test it on work you already know the answer to.',
    '02 · 2 MINUTES. Let it play, then say the line under it: AI makes good work faster; it also makes unchecked work wrong, faster.\n\nThe catch, from the same Harvard and BCG study: on a task just outside AI’s capability, consultants using it were 19 percentage points less likely to get the right answer than those working without it. They trusted a confident, plausible answer.\n\nThe researchers call it the jagged frontier: AI is brilliant at some tasks and wrong at others that look just as easy, and you cannot tell which from the outside. The fix is not avoiding AI, it is knowing your frontier: test it on work you already know the answer to, and keep a human check on anything that goes to a customer, a regulator or the bank.'),

  clip('check', 'Fluent isn’t the same as right',
    'Animation: an AI translation of a patient leaflet types out perfectly: take 50 mg of vitamin B12 each morning, with food. A magnifier finds the unit: the source said µg. Micrograms, not milligrams, a thousand times the dose. The person corrects it and stamps it: checked by a person.',
    '02 · 1 MINUTE. Let it play. It is built on the error the BBC’s medical translator describes (μ, micro, translated as milli: a thousand-fold dose); the leaflet and the vitamin are illustrations. The point to land: the sentence reads perfectly, which is exactly why the mistake survives.\n\nThe numbers, if asked (hidden backup slide next): in the same BBC piece the Open Knowledge Association found 27% of AI-drafted Wikipedia translation text still needed a human fix before publishing, and 5 to 6% of the errors changed the meaning.'),
  {
    hidden: true,
    type: 'keyfact',
    title: 'Fluent isn’t the same as right',
    subtitle: 'BBC News, 14 October 2026 · AI translation for Wikipedia',
    body: '27% of AI-drafted text still needed a human fix before publishing',
    bullets: [
      'And 5 to 6% of the errors changed the meaning.',
      'The better AI writes, the harder its mistakes are to spot: they sound natural.',
      'Low stakes, a light check. High stakes, an expert reads every line.'
    ],
    progressive: true, buildMode: 'dim',
    notes: 'BACKUP · HIDDEN. The check clip makes the point; use this if someone asks for the numbers.\n\n02 · 2 MINUTES. From the BBC, “How long will humans be needed for translation?” (John Laurenson, 14 October 2026). The Open Knowledge Association, a non-profit that has published more than 10,000 AI-assisted Wikipedia translations, studied 119 articles, 10 language pairs and over 1,000 hours of translator work: 27% of the AI-generated text was corrected before publication, three quarters of those corrections were errors the AI introduced, and 5 to 6% of errors changed the meaning. Its founder says raw AI translation is the right call for internal documents or product listings; for an encyclopedia that runs on trust it is not.\n\nA medical translator in the same piece found μ (micro) translated as milli: a thousand-fold dosing error. Her point is the one to land: older machine errors jumped out because they sounded clunky; today’s sound fluent and natural, so they are harder to catch.\n\nThis is why every case study coming up has a row called “the human check”.'
  },

  /* ------------------------------------------------------ 03 THE HIDDEN COSTS */
  {
    type: 'section',
    title: 'The hidden costs',
    subtitle: 'What Anthropic and others found as people used more AI',
    notes: '03 · 7 MINUTES. The honest half of the talk. The firm that makes Claude studied its own staff, and what it found is the best warning in the room: more output, more new work, and worries about skills. Then the psychology of leaning on it.'
  },
  {
    type: 'stats',
    title: 'Inside an AI company',
    subtitle: 'Anthropic surveyed 132 of its own engineers and researchers · December 2025',
    bullets: [
      stat('Work done with AI', '59%', 'up from 28% a year earlier'),
      stat('Self-reported productivity', '+50%', 'up from +20% a year earlier'),
      stat('Work that wouldn’t exist', '27%', 'of AI-assisted work was new: it would never have been done'),
      stat('Fully handed over', '0–20%', 'of their work, for more than half of them')
    ],
    progressive: true,
    notes: '03 · 2 MINUTES. Anthropic, “How AI is transforming work at Anthropic” (2 December 2025): a survey of 132 engineers and researchers in August 2025, 53 interviews, and 200,000 internal Claude Code transcripts.\n\nRead the four numbers, then the twist. The gain showed up as more output, not shorter days: time per task fell only slightly, and 27% of the work was new work that would not otherwise have happened. More than half could fully hand over only 0 to 20% of their work: the rest still needed them.\n\nThe worries in their own words, said briefly: one engineer said they were “for sure atrophying” as a software engineer. The paper names a “paradox of supervision”: using AI well means checking it, and checking it needs the very skills that heavy use can wear down. Some reported fewer conversations with colleagues and less mentoring.\n\nCaveats Anthropic gives: self-reported, not anonymous, early adopters at an AI company, and the people building the tools. Not typical of a café or a builder: that is why it is a warning, not a forecast.'
  },
  {
    type: 'cards',
    title: 'Faster means more, not less',
    subtitle: 'Save an hour and decide what it’s for, or it fills itself',
    bullets: [
      card('Your job grows', 'Easy to start, so you take on work outside your role: the manager writing code, the owner doing the designer’s job.'),
      card('No off switch', 'Every task is one prompt away, so work slips into breaks and evenings.'),
      card('More plates spinning', 'Several jobs run at once in the background, and attention switches all day.'),
      card('Someone checks it', 'Colleagues review, fix and coach the AI-made work, and that is work too.')
    ],
    progressive: true,
    notes: '03 · 2 MINUTES. This is the lightning-pace problem: when AI makes everything feel quick, people say yes to more, and the work grows past the job they were hired for.\n\nAruna Ranganathan and Xingqi Maggie Ye (Berkeley Haas), “AI Doesn’t Reduce Work—It Intensifies It”, Harvard Business Review (9 February 2026). Coverage describes eight months of embedded research at a US tech company of about 200 people (Decrypt, ITPro; the article body was not checked, so say “reported”). The three patterns they name: task expansion, blurred boundaries between work and home, and more multitasking; engineers also ended up reviewing colleagues’ AI-made code. Participants felt more productive but no less busy. One said: “you don’t work less.” Their fix: an agreed “AI practice”, with pauses before big decisions, work sequenced to cut switching, and protected time with people.\n\nIt fits the other evidence: Anthropic found 27% of AI-assisted work was new work; the Danish study (Humlum and Vestergaard, NBER 2026) found no change in hours or earnings, with firms adding AI-checking work; and HBR’s “workslop” survey (Stanford and BetterUp Labs, September 2025) found colleagues spend nearly two hours fixing each piece of AI work that looked finished but was not.\n\nAsk the room: “If AI gave you an hour back on Monday, who would decide what happens to it?”'
  },
  {
    type: 'stats',
    title: 'AI did the task. Did people learn?',
    subtitle: 'Anthropic’s trial · 52 junior developers learning a new tool · January 2026',
    bullets: [
      stat('Quiz score with AI', '50%', 'against 67% for those coding by hand'),
      stat('Time saved', '~2 min', 'too small to count'),
      stat('Biggest gap', 'Fixing', 'errors (debugging): the skill you need to check AI’s work'),
      stat('Asked AI to explain', '65%+', 'against under 40% for those who handed it all over')
    ],
    progressive: true,
    notes: '03 · 2 MINUTES. Judy Hanwen Shen and Alex Tamkin, “How AI assistance impacts the formation of coding skills” (Anthropic, 29 January 2026; arXiv 2601.20245). A randomised trial: 52 mostly junior developers learned a new Python library, with or without an AI assistant, then took a quiz. AI group 50%, hand-coding 67% (p = 0.01). The AI group finished about two minutes faster, not a significant difference. The biggest gap was on debugging questions.\n\nHow people used it mattered most. Low scorers (under 40%) let AI write all the code, slid into handing it over, or used AI to fix every error. High scorers (65% and up) asked conceptual questions, or asked for code with explanations, then worked through errors themselves.\n\nThe authors’ caveats: small, short-term, one library, and patterns are associations, not proof. Their advice for managers is the line for this room: roll AI out deliberately, so people keep learning and can still oversee the work.\n\nFor a non-coder: the same goes for VAT, contracts or marketing. If AI does it for you, you get the output. If it explains it to you, you get the skill.'
  },
  {
    type: 'cards',
    title: 'The psychology of leaning on it',
    subtitle: 'Four traps, and what the research says',
    bullets: [
      card('Feeling faster', 'Developers felt 20% faster with AI and measured 19% slower. Time it.'),
      card('Trusting it', 'The more people trust AI, the less they check it, and the less they think.'),
      card('Borrowed skill', 'Fluent output feels like your own expertise. It isn’t, until you can do it without.'),
      card('The supervision paradox', 'Checking AI needs the very skill that heavy use lets slip.')
    ],
    progressive: true,
    notes: '03 · 2 MINUTES. One line each.\n\nFeeling faster: METR (10 July 2025), a randomised trial of 16 experienced open-source developers on 246 real tasks with early-2025 tools: 19% slower with AI, while believing afterwards they had been 20% faster. METR says tools have improved since; the lasting lesson is the gap between feeling and measuring.\n\nTrusting it: Lee et al., Microsoft Research and Carnegie Mellon, “The Impact of Generative AI on Critical Thinking”, CHI 2025, a survey of 319 knowledge workers: higher confidence in AI went with less critical thinking; higher confidence in your own skill went with more. People skipped checking most when they lacked the skill to check.\n\nBorrowed skill: an idea, not a finding. Yunis, Jamali and Umar, “The illusion of AI mastery: skill inflation in the age of accessible AI tools”, Journal of Innovation and Knowledge (2026), is a conceptual paper: it proposes that easy, polished output inflates confidence (a Dunning-Kruger effect), and calls for testing. Say it as a warning sign to watch for in yourself and your team.\n\nThe supervision paradox: Anthropic’s own name for it (December 2025).\n\nIf you want the motivation angle: psychologists distinguish mastery goals (I want to get better) from performance goals (I want it done). Someone with a mastery goal uses AI as a tutor; someone with a performance goal uses it as a shortcut. Anthropic’s trial shows the difference in the results. That is theory used as a lens, so present it as one.'
  },
  {
    type: 'statement',
    body: 'The skill you need to check AI is the skill AI lets you skip.',
    subtitle: 'So keep doing some of it yourself',
    design: { words: 'rise', wordStagger: 'wave' },
    notes: '03 · 30 SECONDS. Pause on it. The practical answer comes later in “Five habits that keep you in charge”. Then into the case studies: every one has a row for the human check.'
  },

  /* -------------------------------------------------- 03 FIVE CASE STUDIES */
  {
    type: 'section',
    title: 'Three case studies',
    subtitle: 'Three kinds of business, one task each',
    notes: '04 · 5 MINUTES. Ninety seconds each. The rule for every case: one task, a before and an after, and the human check that stays. Ask the room to listen for the one closest to their own business.'
  },
  {
    type: 'compare',
    title: 'The café: the admin after closing',
    subtitle: 'Before\tAfter',
    bullets: [
      row('Rota', 'An hour each week juggling availability by text.', 'Availability pasted in, a draft rota out, the owner fixes it.'),
      row('Reviews', 'Replies left for weeks, or written angry.', 'Calm draft replies to every review, edited and posted in minutes.'),
      row('Menus and posts', 'Specials board and Instagram written from scratch.', 'Allergen-checked menu copy and a week of posts from one list.'),
      row('The human check', 'Allergens, prices and tone.', 'Still checked by the owner, every time.')
    ],
    progressive: true,
    notes: '03 · 90 SECONDS. ' + COMPOSITE + '\n\nThe point: the gain is in the admin around the business, not the coffee. The last row is the one to say slowly: allergen information is a legal duty and the AI does not know your kitchen.'
  },
  {
    type: 'compare',
    title: 'The accountancy practice: the inbox',
    subtitle: 'Before\tAfter',
    bullets: [
      row('Client email', 'Around three hours a day writing replies.', 'AI drafts, the team reviews and sends in about thirty minutes.'),
      row('Meetings', 'Notes typed up after, actions forgotten.', 'Transcript, summary and action list, with the client’s consent.'),
      row('Explaining', 'The same tax deadline explained fifty times.', 'One plain-English explainer, reused and tailored.'),
      row('The human check', 'Every figure and every piece of advice.', 'No client data in tools the firm hasn’t approved.')
    ],
    progressive: true,
    notes: '03 · 90 SECONDS. ' + COMPOSITE + '\n\nThe three hours to thirty minutes is the shape consultancies commonly report for drafted replies (one UK consultancy’s published example), not a measured figure for a named firm. The research behind it is the customer support study two slides back.\n\nThe last row matters most for professional firms: client data stays in tools covered by a business agreement, not a personal free account.'
  },
  {
    type: 'compare',
    title: 'The trades firm: quotes from the van',
    subtitle: 'Before\tAfter',
    bullets: [
      row('Quotes', 'Written at the kitchen table at night.', 'Photos and a voice note on site, a draft quote by the time you’re home.'),
      row('Lost leads', 'Missed calls while on a job.', 'Every enquiry logged and a reply drafted the same day.'),
      row('Paperwork', 'Method statements rewritten for every job.', 'A template the AI fills from the job details.'),
      row('The human check', 'Prices, measurements and safety.', 'Signed off by the person who saw the job.')
    ],
    progressive: true,
    notes: '03 · 90 SECONDS. ' + COMPOSITE + '\n\nThis is the case for the people in the room who think AI is only for office businesses. The phone in the van is the tool: voice notes and photos are the input. The evenings back are the gain, and for a sole trader that is the whole point.'
  },
  {
    hidden: true,
    type: 'compare',
    title: 'The online shop: listings and questions',
    subtitle: 'Before\tAfter',
    bullets: [
      row('Product listings', 'Forty minutes a product, copy and alt text.', 'A first draft in a minute from the spec sheet and photos.'),
      row('Customer questions', 'The same five questions every day.', 'Drafted answers from your own policies, sent by a person.'),
      row('Insight', 'Sales data never looked at.', 'A monthly “what changed and why?” from the export.'),
      row('The human check', 'Claims, sizes and returns policy.', 'Nothing promised that the shop can’t deliver.')
    ],
    progressive: true,
    notes: 'BACKUP · HIDDEN. Cut for time. Use it if the room is mostly online retailers.\n\n03 · 90 SECONDS. ' + COMPOSITE + '\n\nThe insight row is the one most firms skip: you already have the data in your shop platform or accounting software. Ask the AI to explain the change, then check the explanation against the numbers.\n\nCustomer-facing claims are covered by consumer law: the business is responsible for what the chatbot says.'
  },
  {
    hidden: true,
    type: 'keyfact',
    title: 'The marketing agency: research and reporting',
    subtitle: 'A real case · Vertis Media, a small UK agency',
    body: 'Less time on reports and research, more on the work clients pay for',
    bullets: [
      'They built AI into the everyday workflow, not a one-off experiment.',
      'The team learned by doing, on real client work.',
      'Reporting and research were the first jobs to move.'
    ],
    progressive: true, buildMode: 'dim',
    notes: 'BACKUP · HIDDEN. Cut for time. The one named UK case (DSIT); use it if asked for a real example.\n\n03 · 90 SECONDS. From DSIT, “What Works for AI Upskilling in the UK: supporting case studies” (10 June 2026): Vertis Media, a small UK marketing and advertising business, reduced the time spent on reporting and research after integrating AI into its workflows. The government document does not put a number on the saving, so neither does this slide.\n\nThe lesson the government study draws across its cases: the firms that gained trained people on their real work, not in the abstract.'
  },

  /* ------------------------------------------------------- 04 PROVEN TIPS */
  {
    hidden: true,
    type: 'section',
    title: 'Proven tips',
    subtitle: 'What the firms that get value do differently',
    notes: 'BACKUP · HIDDEN. Tips follow the case studies without a break.\n\n04 · 6 MINUTES.'
  },
  {
    type: 'journey',
    title: 'The prompt recipe',
    subtitle: 'Five parts, any tool',
    bullets: [
      card('Role', '“You are an experienced bookkeeper for a small café.”'),
      card('Task', '“Draft a reply to this late-payment email.”'),
      card('Context', 'Paste the email, your terms and the history.'),
      card('Format', '“Three short paragraphs, friendly but firm, UK English.”'),
      card('Check', '“Then explain your choices, and list what you weren’t sure about.”')
    ],
    progressive: true,
    notes: '04 · 2 MINUTES. The single biggest difference between people who say AI is useless and people who say it saves them hours is context. A one-line request gets a generic answer; your terms, your history and your tone get a useful one.\n\nThe last step is the jagged-frontier fix built into the prompt: ask it what it was unsure of. Then treat its answer as a first draft from a quick, keen new starter.'
  },
  {
    type: 'keywords',
    title: 'Seven uses that pay back this month',
    bullets: [
      card('Email', 'drafting replies, chasing invoices, saying no politely'),
      card('Meetings', 'notes, summaries and action lists, with consent'),
      card('Documents', 'first drafts of proposals, policies and bids'),
      card('Customers', 'answers to common questions from your own policies'),
      card('Marketing', 'a month of posts, listings and newsletters from one brief'),
      card('Numbers', 'explaining a spreadsheet export in plain English'),
      card('Learning', 'a patient tutor for the thing you’ve been avoiding')
    ],
    progressive: true,
    notes: '04 · 2 MINUTES. These are the uses the studies and surveys keep finding: writing, summarising, first drafts. None needs a new system.\n\nAsk the room: "Which one of these would give you an hour back this week?" Turn to your neighbour and tell them. 30 seconds.'
  },
  {
    hidden: true,
    type: 'table',
    title: 'Start with what you already pay for',
    body: 'If you use…\tLook for…\tA good first job\nMicrosoft 365\tCopilot\tSummarise an email thread\nGoogle Workspace\tGemini\tDraft a proposal from notes\nAccounting software\tIts AI assistant\tExplain this month’s cash flow\nCanva\tIts AI tools\tA week of posts from one brief',
    notes: 'BACKUP · HIDDEN. Cut for time. Show it if someone asks which tool to start with.\n\n04 · 2 MINUTES. Not an endorsement of any product: the point is that most firms already pay for software that now has AI built in, so the first step costs nothing. Xero, QuickBooks and Sage all now build AI assistants in; a general chat assistant (ChatGPT, Claude, Gemini, Copilot) covers the rest. Check which plan you are on: business plans usually come with stronger data protection terms than free personal accounts, and that matters for client data.\n\nFeatures and names change often. Check the tools on the day.'
  },

  /* ------------------------------------------------------ 05 DO IT SAFELY */
  {
    type: 'section',
    title: 'Humans in the loop',
    subtitle: 'How much checking, who checks, and what goes in',
    notes: '05 · 5 MINUTES. The human in the loop is not a brake on productivity; it is what makes the gain safe to keep.'
  },
  {
    type: 'content',
    title: 'How much checking?',
    subtitle: 'Match the check to the stakes',
    bullets: [
      card('Low · for you', 'Notes, ideas, first drafts, summaries for your own use. A quick read.'),
      card('Medium · for customers', 'Emails, posts, listings, quotes. A person reads every word before it goes.'),
      card('High · money, law, health, people', 'Contracts, tax, safety, medical, hiring and credit decisions. Someone who knows the subject checks every line, against the source.')
    ],
    progressive: true, buildMode: 'dim',
    notes: '05 · 1 MINUTE. The BBC translation piece draws the same line: raw AI output can be the right call for internal documents and product listings, and an expert must check legal and medical work.\n\nDecisions about people need a human. Under UK data protection law, people have the right to have a significant automated decision about them reviewed by a person; the ICO’s guidance on AI and data protection covers it. If AI screens CVs or scores credit, a person decides.\n\nThe North East Ambulance Service’s current trial (BBC, 13 October 2026) is the high level done right: every AI-drafted note is reviewed and edited by a clinician before it goes into a patient’s record.'
  },
  {
    type: 'cards',
    title: 'When nobody checked',
    subtitle: 'You can hand AI the task. You can’t hand it the accountability.',
    bullets: [
      card('Air Canada · 2024', 'Its chatbot invented a refund policy. A tribunal ruled the airline was responsible for what its chatbot said.'),
      card('Deloitte · 2025', 'A report to the Australian government cited research that didn’t exist. Deloitte refunded part of the fee.'),
      card('UK High Court · 2025', 'Lawyers cited cases that didn’t exist. The court warned the profession and referred lawyers to their regulators.')
    ],
    progressive: true,
    notes: '05 · 2 MINUTES. One line each, then the point: in every case the AI was wrong in a fluent, confident way, and a person put their name to it without checking.\n\nAir Canada: Moffatt v. Air Canada, British Columbia Civil Resolution Tribunal (February 2024). The chatbot told a bereaved passenger he could claim a bereavement fare after travel, which contradicted the airline’s own policy page. Air Canada argued the chatbot was responsible for its own statements; the tribunal rejected that and ordered it to pay about C$650 plus interest and fees. A tribunal decision, not binding precedent, but widely read as the rule: your chatbot speaks for you.\n\nDeloitte: reported by the Associated Press (October 2025). A A$440,000 report for the Department of Employment and Workplace Relations contained a fabricated quote from a court judgment and references to non-existent papers. Deloitte repaid the final instalment and the revised report disclosed it had used Azure OpenAI; the department said the recommendations did not change.\n\nUK High Court: Ayinde and Al-Haroun [2025] EWHC 1383 (Admin), 6 June 2025, Dame Victoria Sharp. In one case 18 of 45 citations were fabricated. The court said lawyers may use AI but must check it against authoritative sources, and referred lawyers to their regulators.\n\nThe small-business version is smaller and just as real: a wrong price, a made-up allergen answer, a quote with the wrong VAT.\n\nThe subtitle echoes the Guernsey data protection commissioner, Brent Homan, to the BBC (12 October 2026): organisations “can outsource certain responsibilities, but they can’t outsource their accountability.”'
  },
  {
    hidden: true,
    type: 'statement',
    body: 'You can hand AI the task. You can’t hand it the accountability.',
    subtitle: 'Whoever signs it, owns it',
    notes: 'BACKUP · HIDDEN. Folded into When nobody checked.\n\n05 · 30 SECONDS. Echoes the Guernsey data protection commissioner, Brent Homan, to the BBC (12 October 2026): organisations “can outsource certain responsibilities, but they can’t outsource their accountability.” Guernsey and Jersey’s cyber security director, in the same piece, on the right attitude: careful testing, good controls, sensible and pragmatic adoption; “it is never going to be risk-free.”'
  },
  {
    type: 'content',
    title: 'The data traffic light',
    subtitle: 'Before you paste, ask: what colour is this?',
    bullets: [
      card('Green · go', 'Public information, your own marketing, general questions. Any tool.'),
      card('Amber · approved tools only', 'Internal documents, supplier terms, anonymised figures. Business accounts with data protection terms.'),
      card('Red · stop', 'Personal data, client files, passwords, bank details, health records. Not without a proper agreement and a reason.')
    ],
    progressive: true, buildMode: 'dim',
    notes: '05 · 30 SECONDS. A rule small teams can remember without a policy document. The legal background: the UK GDPR still applies when the processing is done by an AI tool; the ICO publishes guidance on AI and data protection.\n\nThe practical step: decide which tools are approved, on which accounts, and tell the team. Most data leaks from AI are someone pasting client data into a free personal account.'
  },
  {
    type: 'content',
    title: 'Five habits that keep you in charge',
    bullets: [
      card('Name the checker', 'Every AI task has a person who checks it, at the level the stakes need.'),
      card('Make it teach you', 'Ask it to explain, then do part of the work yourself.'),
      card('Keep one by hand', 'A regular task you still do without AI, so the skill stays sharp.'),
      card('Time it, checking included', 'If it isn’t faster once it’s checked, it isn’t faster.'),
      card('Keep an off switch', 'Decide what the saved time is for, and when work stops.')
    ],
    progressive: true, buildMode: 'dim',
    notes: '05 · 1 MINUTE. Each habit answers a finding: name the checker (When nobody checked); make it teach you (Anthropic’s trial: those who asked for explanations kept the skill); keep one by hand (the supervision paradox); time it, checking included (METR’s felt-faster gap); keep an off switch (Berkeley’s intensification: agree as a team when AI work stops, and what the saved hour is for).\n\nThe old four rules still apply, said in one breath: be open with customers about where AI is used; strong passwords and two-factor sign-in on every AI account (Cyber Essentials, from the NCSC, is a good start); and write it all on one page, reviewed every quarter.'
  },

  /* ------------------------------------------------------ 06 MAKE IT STICK */
  {
    hidden: true,
    type: 'section',
    title: 'Make it stick',
    subtitle: 'From one task to a habit',
    notes: 'BACKUP · HIDDEN. The figures run straight on into the key message.\n\n06 · 3 MINUTES.'
  },
  {
    hidden: true,
    type: 'keyfact',
    title: 'A pilot, run properly',
    subtitle: 'BBC News, 13 October 2026 · North East Ambulance Service',
    body: '38 staff, eight weeks, every AI note checked by a clinician',
    bullets: [
      'One task: recording and summarising patient conversations.',
      'A clear question: does it cut workload and keep records accurate?',
      'A decision date: keep it or drop it in November.'
    ],
    progressive: true, buildMode: 'dim',
    notes: 'BACKUP · HIDDEN. Cut for time. A good example of a careful pilot if asked.\n\n06 · 1 MINUTE. From the BBC, “Paramedics experiment with AI note-taking tool” (13 October 2026). The North East Ambulance Service is running an eight-week trial with 38 staff of ambient voice technology on iPads that records, transcribes and summarises patient conversations. Every note is reviewed and edited by a clinician before it goes into the record. Its digital clinical lead says the trial is to learn how the technology can be used “safely and effectively”.\n\nThe point for a small business: this is the shape of a good pilot at any size. One task, a human check, a question, a date. The action plan in a moment is the same thing for your business.'
  },
  {
    type: 'journey',
    hidden: true,
    title: 'Your first 30 days',
    subtitle: 'One task, measured',
    bullets: [
      card('Week 1 · Pick', 'One task that eats time every week. Time it as it is.'),
      card('Week 2 · Try', 'Use the prompt recipe every time. Save the prompts that work.'),
      card('Week 3 · Share', 'Show one colleague. Build a shared prompt library.'),
      card('Week 4 · Measure', 'Time it again, including the checking. Keep it, fix it, or drop it.')
    ],
    progressive: true,
    notes: 'BACKUP · HIDDEN. The 7-day action plan replaces this in the talk; show it if someone asks what happens after the first week.\n\nThe firms that get value treat it as an experiment, not a purchase. The before-and-after timing is the step everyone skips and the one that turns a feeling into a decision: the METR developers felt 20% faster and were 19% slower. Count the checking time too, or the saving is imaginary. If it does not save time after a month, drop it and pick another task: that is a result too.'
  },
  clip('hours', 'Small hours add up',
    'Animation: one hour back a week, for ten people. A grid of 10 rows and 52 weeks fills square by square, counting to 520 hours: about 14 working weeks of someone’s time, every year. Surveys of UK SMEs suggest 2.5 to 5 hours a week (vendor surveys); this claims one.',
    '06 · 1 MINUTE. 1 hour × 10 people × 52 weeks = 520 hours; at 37.5 hours a week, about 14 weeks.\n\nThe survey range, said as the vendors’: Dell Technologies’ “AI in Action” research (2026, 2,013 UK SME decision-makers) puts the average at about 2.5 hours per employee a week, and six or more for the 7% it calls front-runners. OpenAI’s UK SME survey with Enterprise Nation (2026) puts it at 5.2 hours a week for decision-makers using AI. Both sell AI, so the slide claims one hour.\n\nLand the question, with The hidden costs in mind: the value is not the hours, it is what you decide to do with them. More customers, better work, or home on time. Decide first, or the hour fills itself.'),

  {
    type: 'statement',
    body: 'Technology alone will not solve every challenge, and finance alone will not fix inefficient processes.',
    subtitle: 'Success comes from combining the right tools, systems and support',
    notes: 'THE KEY MESSAGE · 30 SECONDS. Say it slowly; it is the bridge into the action plan. This room has a bank, tech partners and councils in it for a reason: the fix for most small firms is the right tool, a better process and the right support together, not any one of them alone.'
  },
  {
    type: 'journey',
    title: 'Your 7-day SME action plan',
    subtitle: 'Five questions · fill it in now',
    bullets: [
      card('The problem', 'One key business challenge.'),
      card('The action', 'One thing you will do about it.'),
      card('The support', 'What help you need.'),
      card('The timescale', '48 hours, 7 days or 30 days.'),
      card('The measure', 'How you will know it worked.')
    ],
    progressive: true,
    notes: 'ACTION PLAN · 6 MINUTES IN ALL. Five questions on three slides, with the support posters after question 3. Everyone answers on their phone (next slide) or on paper.'
  },
  {
    type: 'image',
    title: 'Scan to fill in your plan',
    image: PLAN_POSTER,
    imageFit: 'cover',
    imageAlt: `Scan to fill in your 7-day SME action plan: a QR code for ${PLAN_SHORT}. Nothing is sent anywhere; copy your answers to take away.`,
    design: { capStyle: 'none' },
    notes: `SCAN · 30 SECONDS. Leave it up long enough for the room to scan, then keep it handy: go back to it before the close. The page is ${PLAN_SHORT}. It works on any phone, needs no sign-in and keeps nothing on a server; the answers stay on the phone (kept as a draft if the screen locks) and a button copies them to take away, or shares or saves them as a file. Paper works just as well.\n\nBefore the day: the page is live only once the deck is pushed to deploy-render. Scan the code on your own phone to check.`
  },
  {
    type: 'compare',
    title: 'Questions 1 and 2',
    subtitle: '1 · The main problem I want to solve\t2 · One action I will take',
    bullets: [
      row('Ask yourself', 'Where does my business lose time, money or opportunities?', 'What one step can I take myself this week?'),
      row('For example', 'Invoicing takes me four hours every Friday.', 'Draft the reminders with AI, and check each one.'),
      row('Keep it', 'One problem, small and specific.', 'One action, not six.')
    ],
    notes: 'Q1 AND Q2 · 2 MINUTES. Examples if people are stuck: chasing late invoices, writing quotes, answering the same customer questions, finding new customers, month-end bookkeeping. Push for specific: “invoicing takes me four hours every Friday” beats “admin”.\n\nThe action does not have to be AI: draft invoice reminders with the prompt recipe; turn on the AI feature in the accounting software you already pay for; write the one-page AI policy; book a call with the bank about cash flow. One action, not six.'
  },
  {
    type: 'cards',
    title: 'Question 3 · The support I need',
    subtitle: 'Tick any that apply',
    bullets: [
      card('Finance', 'Banking, cash flow or finance advice.'),
      card('Technology', 'Technology, automation or AI support.'),
      card('Customers', 'Corporate contracts or new customers.'),
      card('Skills', 'Skills, mentoring or business advice.')
    ],
    notes: 'Q3 · 1 MINUTE. This is the key message made practical. The next three slides show who can help with each kind of support: tools, systems and support. Point people to the partners in the room for each kind of support, once each partner has confirmed what they offer (add it to these notes before the day; do not promise an offer that is not confirmed).'
  },
  ...SUPPORT_SLIDES.map(slide => ({
    type: 'image',
    title: slide.title,
    image: supportAsset(slide.file),
    imageFit: 'cover',
    imageAlt: `${slide.kicker}: ${slide.cards.map(k => `${SUPPORT[k].name}, ${SUPPORT[k].lines.join(' ')}`).join('; ')}. Scan a code to find out more.`,
    design: { capStyle: 'none' },
    notes: `WHO CAN HELP · 30 SECONDS. Point to the people in the room: "${slide.cards.map(k => SUPPORT[k].name).join(' and ')} are here today." Leave it up long enough to scan.\n\n` +
      (slide.cards.some(k => !SUPPORT[k].url) ? 'BEFORE THE DAY: these are SAMPLE codes. Scanned, they say where the real link goes (SUPPORT in tools/build-ai-sme-productivity.js). Confirm with each partner what they offer and the link they want, set it, and rebuild. The one-line descriptions are placeholders too.' : 'Links confirmed.')
  })),
  {
    type: 'compare',
    title: 'Questions 4 and 5',
    subtitle: '4 · When will I take action?\t5 · How will I know it worked?',
    bullets: [
      row('Choose', 'Within 48 hours, 7 days or 30 days.', 'A number you can check: hours, pounds, customers or days.'),
      row('For example', 'Within 7 days.', 'Two hours a week less on invoicing, checking included.'),
      row('Remember', 'A plan with no date is a wish.', 'Time it now, then again in a week.')
    ],
    notes: 'Q4 AND Q5 · 1 MINUTE. Encourage 48 hours or 7 days. For the measure: time it now, then again in a week, and count the checking time too (remember the developers who felt faster and were slower). If it did not work, that is a result as well: drop it and try the next problem.'
  },
  {
    hidden: true,
    type: 'cards',
    title: 'Grow together',
    subtitle: 'You don’t have to work this out alone',
    bullets: [
      card('Swap a prompt', 'Before you leave, swap one prompt that works with someone from another business.'),
      card('Find a buddy', 'Pair with a business your size and check in after 30 days.'),
      card('Use the partners', 'Central District Alliance, Metro Bank, LabTech, UK Black Tech, Camden and Islington councils.'),
      card('Bring your team', 'Train everyone, not just the keen ones. The checks need people who know the work.')
    ],
    progressive: true,
    notes: 'BACKUP · HIDDEN. Cut for time. Say its first card, swap a prompt, as you hand over to the networking.\n\n06 · 1 MINUTE. The event’s promise is collaboration, so make it practical: the networking after this talk is the first prompt swap.\n\nBefore the day, confirm with each partner what support they want named here (programmes, workshops, funding, digital skills) and add it to these notes, so you can point people to the right table. Do not promise an offer a partner has not confirmed.\n\nThe last card: in the customer support study novices gained most, so train everyone. And keep growing people who know the work: the human check is only as good as the person doing it, and the Danish study found firms adding AI-checking work, not removing people.'
  },
  clip('commit', 'Leave with one commitment',
    'Animation: six new ideas float up: a chatbot for the website, a new CRM, an AI policy, automate invoice reminders, AI social posts, a smarter rota. Five drift away. One becomes a line of the 7-day action plan: automate my invoice reminders; support: technology; within 7 days; worked if two hours a week come back. Don’t leave with six new ideas. Leave with one commitment.',
    'CLOSE · 30 SECONDS. Ask everyone to tell their neighbour their answer to question 2 and question 4: the action and the date. Saying it to someone else is what makes it happen.'),

  {
    type: 'keyfact',
    title: 'Thank you',
    subtitle: 'The biggest takeaway',
    body: 'Productivity doesn’t always need a big investment',
    bullets: [
      'It starts with finding where your business loses time, money or opportunities, and taking one practical step.',
      'Speak to our team after the session about the support available to your business.'
    ],
    progressive: true, buildMode: 'dim',
    notes: 'CLOSE · 1 MINUTE. Then leave the survey slide (next) up through the networking. Say it: "We aim to help local businesses not only survive, but become more productive, resilient and ready to grow." Thank CDA and the partners again, say where the team will be standing, and hand over to the networking: "Go and swap a prompt, and find the support you ticked."'
  },
  {
    type: 'image',
    title: 'Tell us what you need',
    image: supportAsset('support-survey'),
    imageFit: 'cover',
    imageAlt: 'Tell us what you need: a short survey on the AI support local businesses want. Scan the code. Two minutes.',
    design: { capStyle: 'none' },
    notes: 'LEAVE UP DURING THE NETWORKING. BEFORE THE DAY: this is a SAMPLE code; set SUPPORT.survey.url in tools/build-ai-sme-productivity.js to the real survey link and rebuild. Agree with CDA whose survey it is and what happens to the answers, and say so out loud.'
  },
  {
    hidden: true,
    type: 'content',
    title: 'Sources',
    bullets: [
      'ONS, AI in UK businesses (July 2026). BCC, Atos and ISER, Future of Work (March 2026).',
      'Noy and Zhang, Science (2023). Brynjolfsson et al., QJE (2025). Dell’Acqua et al., HBS (2023). Humlum and Vestergaard, NBER (2026). METR (2025). HBR on workslop (2025).',
      'GDS Copilot experiment (2025). DSIT AI upskilling case studies (2026). BBC News, 12–14 October 2026.',
      'Moffatt v. Air Canada (2024). AP on Deloitte (2025). Ayinde and Al-Haroun [2025] EWHC 1383.',
      'Vendor surveys: Dell (2026); OpenAI and Enterprise Nation (2026). ICO; NCSC Cyber Essentials.'
    ],
    notes: 'BACKUP · HIDDEN. Show it if the organisers want the sources on screen.\n\nLeave up during questions if the organisers want the sources visible, or hide it. The full references are on the speaker page.'
  }
];

/* ---------------------------------------------------------------- the build */
const KEY = 'ai-sme-productivity';
const TITLE = 'The Power of AI · practical case studies and proven tips for productivity';
const BLURB = 'A 40-minute session (with a 30-minute cut) by Mark Martin MBE CITP for about 400 London SMEs at Working Smarter, Growing Together: where small firms are with AI, what controlled studies say, the hidden costs of heavy use (Anthropic’s studies of its own staff and of skill formation, work intensification, the psychology of dependency), three case studies, the prompt recipe, where the human stays in the loop, and a 7-day SME action plan each person fills in on their phone and takes away.';
const THEME = 'ukbt';
const LOGO = 'assets/brand/ukbt-wordmark.png';

require(path.join(ROOT, 'js/qr.js'));
fs.mkdirSync(path.join(ROOT, path.dirname(PLAN_QR)), { recursive: true });
fs.writeFileSync(path.join(ROOT, PLAN_QR), SF.qrSvg(PLAN_URL, { dark: '#264258', title: PLAN_SHORT }) + '\n');
/* The scan slide: the code large on a white card, the address under it, on
   the theme's navy, drawn as one picture so nothing else lands on the code. */
{
  const code = SF.qr(PLAN_URL, {});
  const quiet = 4, span = code.size + quiet * 2, side = 440, unit = side / span;
  const x0 = 760, y0 = 110;
  let d = '';
  for (let y = 0; y < code.size; y++) for (let x = 0; x < code.size; x++) {
    if (code.modules[y][x]) d += `M${(x0 + (x + quiet) * unit).toFixed(2)} ${(y0 + (y + quiet) * unit).toFixed(2)}h${unit.toFixed(2)}v${unit.toFixed(2)}h-${unit.toFixed(2)}z`;
  }
  const font = `font-family="'Uncut Sans', 'Helvetica Neue', Arial, sans-serif"`;
  fs.writeFileSync(path.join(ROOT, PLAN_POSTER), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" role="img">
<title>Scan to fill in your 7-day SME action plan: ${PLAN_SHORT}</title>
<rect width="1280" height="720" fill="#264258"/>
<path d="M0 720 L230 470 L0 220 Z" fill="#00c57f" opacity=".14"/>
<text x="96" y="214" ${font} font-size="26" letter-spacing="3" fill="#00c57f">YOUR 7-DAY SME ACTION PLAN</text>
<text ${font} font-size="76" font-weight="600" fill="#ffffff"><tspan x="92" y="306">Scan to fill</tspan><tspan x="92" y="390">in your plan</tspan></text>
<text ${font} font-size="28" fill="#d7e2ea"><tspan x="96" y="462">Works on any phone. No sign-in.</tspan><tspan x="96" y="502">Nothing is sent anywhere.</tspan><tspan x="96" y="542">Copy your answers to take away.</tspan></text>
<rect x="${x0 - 20}" y="${y0 - 20}" width="${side + 40}" height="${side + 40}" rx="28" fill="#ffffff"/>
<path fill="#264258" shape-rendering="crispEdges" d="${d}"/>
<text x="${x0 + side / 2}" y="${y0 + side + 72}" text-anchor="middle" ${font} font-size="25" fill="#ffffff">${PLAN_SHORT}</text>
</svg>
`);
}

/* The support posters: partner cards with their logos and a code each, drawn
   as one picture per slide so the codes are big enough to scan from the back
   of a room. Logos sit on the deck's dark navy, which every partner's logo was
   made for. A partner with no url yet gets a SAMPLE code, marked as one. */
{
  const esc = v => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const font = `font-family="'Uncut Sans', 'Helvetica Neue', Arial, sans-serif"`;
  const dataUri = file => {
    const mime = file.endsWith('.svg') ? 'image/svg+xml' : 'image/png';
    return `data:${mime};base64,${fs.readFileSync(path.join(ROOT, file)).toString('base64')}`;
  };
  const qrPath = (text, x0, y0, side) => {
    const code = SF.qr(text, {});
    const quiet = 4, span = code.size + quiet * 2, unit = side / span;
    let d = '';
    for (let y = 0; y < code.size; y++) for (let x = 0; x < code.size; x++) {
      if (code.modules[y][x]) d += `M${(x0 + (x + quiet) * unit).toFixed(2)} ${(y0 + (y + quiet) * unit).toFixed(2)}h${unit.toFixed(2)}v${unit.toFixed(2)}h-${unit.toFixed(2)}z`;
    }
    return `<rect x="${x0}" y="${y0}" width="${side}" height="${side}" rx="14" fill="#ffffff"/><path fill="#254258" shape-rendering="crispEdges" d="${d}"/>`;
  };
  const short = url => url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const scanLabel = (key, x, y) => {
    const s = SUPPORT[key];
    return s.url
      ? `<text x="${x}" y="${y}" ${font} font-size="22" fill="#c9d6df">${esc(short(s.url))}</text>`
      : `<rect x="${x}" y="${y - 25}" width="262" height="36" rx="18" fill="#ff9667"/><text x="${x + 131}" y="${y}" text-anchor="middle" ${font} font-size="18" font-weight="600" fill="#1b3245">SAMPLE · LINK TO COME</text>`;
  };
  const frame = (title, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" role="img"><title>${esc(title)}</title>
<rect width="1280" height="720" fill="#254258"/>${body}
</svg>
`;
  for (const slide of SUPPORT_SLIDES) {
    let body = `<text x="96" y="104" ${font} font-size="22" letter-spacing="3" fill="#00c57f">${esc(slide.kicker.toUpperCase())}</text>
<text x="94" y="162" ${font} font-size="52" font-weight="600" fill="#ffffff">${esc(slide.title)}</text>`;
    slide.cards.forEach((key, i) => {
      const s = SUPPORT[key], x = 96 + i * 552, y = 214, w = 528, h = 440;
      body += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="26" fill="#1b3245" stroke="rgba(255,255,255,.16)"/>
<image href="${dataUri(s.logo)}" x="${x + 32}" y="${y + 30}" width="${w - 64}" height="88" preserveAspectRatio="xMinYMid meet"/>
<text x="${x + 32}" y="${y + 162}" ${font} font-size="30" font-weight="600" fill="#ffffff">${esc(s.name)}</text>
<text ${font} font-size="23" fill="#c9d6df">${s.lines.map((l, j) => `<tspan x="${x + 32}" y="${y + 200 + j * 30}">${esc(l)}</tspan>`).join('')}</text>
${qrPath(s.url || sampleText(key), x + 32, y + 262, 156)}
<text x="${x + 212}" y="${y + 312}" ${font} font-size="26" font-weight="600" fill="#ffffff">Scan to find out more</text>
${scanLabel(key, x + 212, y + 356)}`;
    });
    fs.writeFileSync(path.join(ROOT, supportAsset(slide.file)), frame(`${slide.kicker}: ${slide.title}`, body));
  }
  /* The survey: one large code, like the plan's scan slide. */
  const sv = SUPPORT.survey;
  fs.writeFileSync(path.join(ROOT, supportAsset('support-survey')), frame('Tell us what you need: a short survey on the AI support local businesses want',
    `<path d="M0 720 L230 470 L0 220 Z" fill="#00c57f" opacity=".14"/>
<text x="96" y="214" ${font} font-size="26" letter-spacing="3" fill="#00c57f">TELL US WHAT YOU NEED</text>
<text ${font} font-size="70" font-weight="600" fill="#ffffff"><tspan x="92" y="300">Help shape local</tspan><tspan x="92" y="380">AI support</tspan></text>
<text ${font} font-size="28" fill="#d7e2ea"><tspan x="96" y="452">A short survey on the help your</tspan><tspan x="96" y="492">business wants with AI.</tspan><tspan x="96" y="532">Two minutes, on your phone.</tspan></text>
${qrPath(sv.url || sampleText('survey'), 760, 110, 440)}
${sv.url ? `<text x="980" y="622" text-anchor="middle" ${font} font-size="25" fill="#ffffff">${esc(short(sv.url))}</text>`
    : `<rect x="830" y="590" width="300" height="44" rx="22" fill="#ff9667"/><text x="980" y="620" text-anchor="middle" ${font} font-size="22" font-weight="600" fill="#1b3245">SAMPLE · LINK TO COME</text>`}`));
}

const deck = SF.normalizeDeck({
  id: 'ai-sme-productivity-2026',
  title: TITLE,
  theme: THEME,
  libraryGroup: 'ukbt',
  aspect: '16:9',
  showSlideNumbers: true,
  finalScores: false,
  org: 'UK Black Tech',
  logo: LOGO, logoOn: 'all', logoSize: 'small', logoReverse: 'never',
  created: stamp,
  modified: stamp,
  slides: slides.map((slide, index) => ({ id: `aisme-${String(index).padStart(2, '0')}`, ...slide }))
});
if (!deck || deck.slides.length !== slides.length) throw new Error('SlideForge did not keep every slide');
if (deck.theme !== THEME) throw new Error(`theme became ${deck.theme}`);
if (!fs.existsSync(path.join(ROOT, LOGO))) throw new Error(`missing ${LOGO}`);
slides.forEach((source, index) => {
  const output = deck.slides[index];
  const where = `slide ${index} (${source.type})`;
  if (output.type !== source.type || output.notes !== source.notes) throw new Error(`${where} changed`);
  if ((source.bullets || []).length !== output.bullets.length) throw new Error(`${where} lost content`);
  if (source.image && !fs.existsSync(path.join(ROOT, source.image))) throw new Error(`${where}: missing ${source.image}`);
});

const target = path.join(ROOT, 'output', 'Power_of_AI_SMEs.sfdeck.json');
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, JSON.stringify(deck, null, 2) + '\n');
console.log(`${path.relative(ROOT, target)} (${deck.slides.length} slides, ${deck.slides.filter(s => !s.hidden).length} shown)`);

/* Built in: the app's lesson list and the Library's UK Black Tech folder. */
const lesson = {
  key: KEY, title: TITLE, blurb: BLURB, icon: '❯', kind: 'lecture', minutes: 40,
  theme: THEME, libraryGroup: 'ukbt', org: 'UK Black Tech',
  logo: LOGO, logoOn: 'all', logoSize: 'small', logoReverse: 'never',
  showSlideNumbers: true, games: [], slides
};
const builtIn = path.join(ROOT, 'js', 'lessons-ai-sme.js');
fs.writeFileSync(builtIn, `/* Generated by tools/build-ai-sme-productivity.js: do not edit by hand, rebuild instead.
   The Power of AI keynote, built into SlideForge's lesson list and seeded into
   the UK Black Tech folder of every browser's Library. Loaded after
   js/lessons.js, whose LESSONS and LIBRARY_SEED_KEYS it extends. */
(function (root) {
  'use strict';
  var SF = root.SF;
  if (!SF || !SF.LESSONS || !SF.LIBRARY_SEED_KEYS) return;
  var lesson = ${JSON.stringify(lesson)};
  if (!SF.LESSONS.some(function (l) { return l.key === lesson.key; })) SF.LESSONS.push(lesson);
  SF.LIBRARY_SEED_KEYS[lesson.key] = 'ukbt';
})(typeof window !== 'undefined' ? window : globalThis);
`);
console.log(`${path.relative(ROOT, builtIn)} (UK Black Tech folder)`);
