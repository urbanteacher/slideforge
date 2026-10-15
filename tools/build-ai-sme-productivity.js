#!/usr/bin/env node
'use strict';

/* Build "The Power of AI: practical case studies and proven tips for
 * productivity", a 30-minute keynote for about 400 London SMEs at Working
 * Smarter, Growing Together (Central District Alliance, with Metro Bank,
 * LabTech, UK Black Tech, and Camden and Islington councils).
 *
 * The shape: where London's small firms are with AI (official figures), what
 * the research says AI does to productivity and where it fails, five case
 * studies by kind of business, seven proven tips, the guardrails, a 30-day
 * plan, and one commitment each before the networking.
 *
 * Every figure names its source in the slide's notes. Vendor surveys are said
 * as the vendor's. The five case studies are composites of common SME uses,
 * not named firms, and the notes say so; the one named firm (Vertis Media) is
 * from the government's AI upskilling case studies.
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
const COMPOSITE = 'A composite of how firms like this commonly use AI, not a named business. Say so out loud: "This is what I see again and again in businesses like yours."';

/* --------------------------------------------------------------- the deck */
const slides = [
  {
    type: 'content',
    hidden: true,
    title: 'Speaker page',
    subtitle: 'Hidden from the room',
    bullets: [
      'A 30-minute keynote for about 400 business owners and leaders: what AI is really doing for small firms, five case studies, seven tips, and one thing to try on Monday.',
      'No tech needed from the room. Interaction is hands up and turn to your neighbour, which works at 400.',
      'Before the day: add your name and role to the title slide notes, check the partners’ logos with CDA, and confirm any offers from the partners you want to name on “Grow together”.'
    ],
    notes:
      'RUNNING ORDER · ABOUT 30 MINUTES\n' +
      '· Open — 3 min: title, the claim, hands up\n' +
      '· 01 Where we are — 4 min: the figures, wide not deep\n' +
      '· 02 What the evidence says — 5 min: four studies, the jagged frontier\n' +
      '· 03 Five case studies — 8 min: café, accountancy, trades, online shop, marketing agency\n' +
      '· 04 Proven tips — 6 min: the prompt recipe, seven uses, the tools you already pay for\n' +
      '· 05 Do it safely — 2 min: the data traffic light, four rules\n' +
      '· 06 Make it stick — 2 min: the 30-day plan, the maths, grow together, your one thing, close\n\n' +
      'FOR 20 MINUTES. Hide “Wide, not deep”, the tools table and two of the five case studies (keep the café and the trades firm: the room is mostly not office businesses).\n\n' +
      'THE BIG IDEA. Productivity from AI is not a purchase, it is a habit: one task, measured, checked, shared. The evidence says it makes people faster and better inside its frontier and confidently wrong outside it. Everything in the talk hangs off that.\n\n' +
      'THE TONE. Practical and honest. 400 owners have heard the hype. Concede the catch early (the jagged frontier) and the room trusts the tips.\n\n' +
      'SOURCES (also in each slide’s notes). ONS, “Artificial intelligence in UK businesses: 2023 to 2026” (20 July 2026, BICS wave 159, June 2026). British Chambers of Commerce with Atos and ISER/MiSoC, “Future of Work: AI in the Workplace” (19 March 2026; 668 firms, 94% SMEs). Noy and Zhang, “Experimental evidence on the productivity effects of generative artificial intelligence”, Science (2023). Brynjolfsson, Li and Raymond, “Generative AI at Work”, Quarterly Journal of Economics (2025). Dell’Acqua et al., “Navigating the Jagged Technological Frontier”, Harvard Business School working paper 24-013 (2023). Government Digital Service, Microsoft 365 Copilot cross-government experiment findings (2025). Dell Technologies, “AI in Action” UK SME research (2026; vendor). OpenAI with Enterprise Nation, UK SME survey (2026; vendor). DSIT, “What Works for AI Upskilling in the UK: supporting case studies” (10 June 2026). ICO, guidance on AI and data protection. NCSC, Cyber Essentials.\n\n' +
      'CHECK BEFORE YOU PRESENT. ONS and BCC publish new waves often: if a newer figure is out on the day, use it and change the notes.'
  },

  /* ---------------------------------------------------------------- OPEN */
  {
    type: 'title',
    title: 'The Power of AI',
    subtitle: 'Practical case studies and proven tips for productivity',
    notes: 'TITLE · up as the room settles. Working Smarter, Growing Together: Productivity, AI and the Future of Local SMEs, facilitated by Central District Alliance with Metro Bank, LabTech, UK Black Tech, and Camden and Islington councils.\n\nIntroduce yourself in one line: [your name, your role]. Thank CDA and the partners by name.'
  },
  {
    type: 'statement',
    body: 'You don’t need an AI strategy. You need one hour back this week.',
    subtitle: 'Then the next one',
    design: { words: 'rise', wordStagger: 'wave' },
    notes: 'OPEN · 1 MINUTE. Say it and pause. The promise of the next half hour: no hype, no jargon, things you can try on Monday morning.\n\nThe argument underneath: the firms getting value are not the ones with a strategy document, they are the ones who picked one task, measured it and kept going.'
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

  /* -------------------------------------------------------- 01 WHERE WE ARE */
  {
    type: 'section',
    title: 'Where we are',
    subtitle: 'What the official figures say about firms like yours',
    notes: '01 · 4 MINUTES.'
  },
  {
    type: 'stats',
    title: 'More firms use AI than ever',
    bullets: [
      stat('UK firms using AI', '35%', 'up from about 12% in 2023 (ONS, June 2026)'),
      stat('Firms with 0–9 staff', '28%', 'against 49% of firms with 250+ (ONS)'),
      stat('“Actively using AI”', '54%', 'mostly SMEs, up from 35% a year earlier (BCC, 2026)')
    ],
    progressive: true,
    notes: '01 · 2 MINUTES. Two sources, two different questions, so two different numbers. Say that: the ONS asks about specific AI technologies, the BCC asks whether you are actively using AI.\n\nONS, “Artificial intelligence in UK businesses: 2023 to 2026” (20 July 2026), Business Insights and Conditions Survey wave 159, June 2026: about 35% of businesses report using at least one AI technology, up from about 12% in September 2023; 28% of firms with 0 to 9 employees, 49% of those with 250 or more.\n\nBritish Chambers of Commerce with Atos, analysis by ISER/MiSoC at the University of Essex, “Future of Work: AI in the Workplace” (19 March 2026): 54% of firms actively using AI; 668 firms surveyed 12 January to 6 February 2026, 94% of them SMEs. The BCC’s earlier surveys: 35% in 2025, 25% in 2024, 23% in 2023. Different samples, so read the jump with care.\n\nThe point for the room: the smallest firms are furthest behind, and that is most of this room.'
  },
  {
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
    notes: '01 · 2 MINUTES. BCC (March 2026): 95% of SMEs using AI report no impact on workforce size over the past year; 86% say job roles are unchanged; about one in ten has adopted bespoke AI rather than generic tools. ONS (July 2026): large language models are the most used AI technology, at 18%; around half of firms report no impact on headcount.\n\nThe reassurance and the challenge in one slide: AI is not emptying small firms, and most of them are only scratching the surface.'
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
    type: 'statement',
    body: 'AI makes good work faster. It also makes unchecked work wrong, faster.',
    subtitle: 'The jagged frontier',
    notes: '02 · 2 MINUTES. The catch, from the same Harvard and BCG study: on a task just outside AI’s capability, consultants using it were 19 percentage points less likely to get the right answer than those working without it. They trusted a confident, plausible answer.\n\nThe researchers call it the jagged frontier: AI is brilliant at some tasks and wrong at others that look just as easy, and you cannot tell which from the outside. The fix is not avoiding AI, it is knowing your frontier: test it on work you already know the answer to, and keep a human check on anything that goes to a customer, a regulator or the bank.'
  },

  /* -------------------------------------------------- 03 FIVE CASE STUDIES */
  {
    type: 'section',
    title: 'Five case studies',
    subtitle: 'Five kinds of business, one task each',
    notes: '03 · 8 MINUTES. Ninety seconds each. The rule for every case: one task, a before and an after, and the human check that stays. Ask the room to listen for the one closest to their own business.'
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
    notes: '03 · 90 SECONDS. ' + COMPOSITE + '\n\nThe insight row is the one most firms skip: you already have the data in your shop platform or accounting software. Ask the AI to explain the change, then check the explanation against the numbers.\n\nCustomer-facing claims are covered by consumer law: the business is responsible for what the chatbot says.'
  },
  {
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
    notes: '03 · 90 SECONDS. From DSIT, “What Works for AI Upskilling in the UK: supporting case studies” (10 June 2026): Vertis Media, a small UK marketing and advertising business, reduced the time spent on reporting and research after integrating AI into its workflows. The government document does not put a number on the saving, so neither does this slide.\n\nThe lesson the government study draws across its cases: the firms that gained trained people on their real work, not in the abstract.'
  },

  /* ------------------------------------------------------- 04 PROVEN TIPS */
  {
    type: 'section',
    title: 'Proven tips',
    subtitle: 'What the firms that get value do differently',
    notes: '04 · 6 MINUTES.'
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
      card('Check', '“Then list anything you weren’t sure about.”')
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
    type: 'table',
    title: 'Start with what you already pay for',
    body: 'If you use…\tLook for…\tA good first job\nMicrosoft 365\tCopilot\tSummarise an email thread\nGoogle Workspace\tGemini\tDraft a proposal from notes\nAccounting software\tIts AI assistant\tExplain this month’s cash flow\nCanva\tIts AI tools\tA week of posts from one brief',
    notes: '04 · 2 MINUTES. Not an endorsement of any product: the point is that most firms already pay for software that now has AI built in, so the first step costs nothing. Xero, QuickBooks and Sage all now build AI assistants in; a general chat assistant (ChatGPT, Claude, Gemini, Copilot) covers the rest. Check which plan you are on: business plans usually come with stronger data protection terms than free personal accounts, and that matters for client data.\n\nFeatures and names change often. Check the tools on the day.'
  },

  /* ------------------------------------------------------ 05 DO IT SAFELY */
  {
    type: 'section',
    title: 'Do it safely',
    subtitle: 'Four rules and a traffic light',
    notes: '05 · 2 MINUTES.'
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
    notes: '05 · 1 MINUTE. A rule small teams can remember without a policy document. The legal background: the UK GDPR still applies when the processing is done by an AI tool; the ICO publishes guidance on AI and data protection.\n\nThe practical step: decide which tools are approved, on which accounts, and tell the team. Most data leaks from AI are someone pasting client data into a free personal account.'
  },
  {
    type: 'content',
    title: 'Four rules for every team',
    bullets: [
      card('A person signs it off', 'Anything going to a customer, regulator, lender or the public is checked by a human.'),
      card('Say when it matters', 'Be open with customers about where AI is used, especially chatbots.'),
      card('Lock the doors', 'Strong passwords and two-factor sign-in on every AI account. Cyber Essentials is a good start.'),
      card('Write it down', 'One page: which tools, which data, who checks. Review it every quarter.')
    ],
    progressive: true, buildMode: 'dim',
    notes: '05 · 1 MINUTE. Cyber Essentials is the government-backed scheme run by the NCSC. The one-page policy is the thing most small firms are missing: it protects the business and it gives staff permission to use the tools properly instead of in secret.'
  },

  /* ------------------------------------------------------ 06 MAKE IT STICK */
  {
    type: 'section',
    title: 'Make it stick',
    subtitle: 'From one task to a habit',
    notes: '06 · 2 MINUTES.'
  },
  {
    type: 'journey',
    title: 'Your first 30 days',
    subtitle: 'One task, measured',
    bullets: [
      card('Week 1 · Pick', 'One task that eats time every week. Time it as it is.'),
      card('Week 2 · Try', 'Use the prompt recipe every time. Save the prompts that work.'),
      card('Week 3 · Share', 'Show one colleague. Build a shared prompt library.'),
      card('Week 4 · Measure', 'Time it again. Keep it, fix it, or drop it.')
    ],
    progressive: true,
    notes: '06 · 1 MINUTE. The firms that get value treat it as an experiment, not a purchase. The before-and-after timing is the step everyone skips and the one that turns a feeling into a decision. If it does not save time after a month, drop it and pick another task: that is a result too.'
  },
  {
    type: 'keyfact',
    title: 'Small hours add up',
    subtitle: 'The maths of one hour a week',
    body: '1 hour a week × 10 people = 520 hours a year',
    bullets: [
      'That is about 14 working weeks.',
      'Surveys of UK SMEs put the saving at 2.5 to 5 hours a week. Vendor surveys, so start with one.',
      'What would you do with 14 weeks?'
    ],
    progressive: true, buildMode: 'dim',
    notes: '06 · 1 MINUTE. 1 hour × 10 people × 52 weeks = 520 hours; at 37.5 hours a week, about 14 weeks.\n\nThe survey range, said as the vendors’: Dell Technologies’ “AI in Action” research (2026, 2,013 UK SME decision-makers) puts the average at about 2.5 hours per employee a week, and six or more for the 7% it calls front-runners. OpenAI’s UK SME survey with Enterprise Nation (2026) puts it at 5.2 hours a week for decision-makers using AI. Both sell AI, so the slide claims one hour.\n\nLand the question: the value is not the hours, it is what you do with them. More customers, better work, or home on time.'
  },
  {
    type: 'cards',
    title: 'Grow together',
    subtitle: 'You don’t have to work this out alone',
    bullets: [
      card('Swap a prompt', 'Before you leave, swap one prompt that works with someone from another business.'),
      card('Find a buddy', 'Pair with a business your size and check in after 30 days.'),
      card('Use the partners', 'Central District Alliance, Metro Bank, LabTech, UK Black Tech, Camden and Islington councils.'),
      card('Bring your team', 'The biggest gains go to the least experienced. Train everyone, not just the keen ones.')
    ],
    progressive: true,
    notes: '06 · 1 MINUTE. The event’s promise is collaboration, so make it practical: the networking after this talk is the first prompt swap.\n\nBefore the day, confirm with each partner what support they want named here (programmes, workshops, funding, digital skills) and add it to these notes, so you can point people to the right table. Do not promise an offer a partner has not confirmed.\n\nThe last card is the customer support study again: novices gained most. Small firms with new or junior staff stand to gain the most.'
  },
  {
    type: 'keyfact',
    title: 'Your one thing',
    subtitle: 'Write it down now · 30 seconds',
    body: 'The one task I’ll try with AI on Monday, and how long it takes now',
    notes: 'CLOSE · 1 MINUTE. Ask everyone to write it on their phone or the back of their badge, then tell their neighbour. Saying it to someone else is what makes it happen.'
  },
  {
    type: 'statement',
    body: 'Working smarter is a habit, not a purchase.',
    subtitle: 'Working Smarter, Growing Together',
    design: { words: 'rise', wordStagger: 'wave' },
    notes: 'CLOSE. One task. Measured. Checked. Shared. Thank CDA and the partners again, and hand over to the networking: "Go and swap a prompt."'
  },
  {
    type: 'content',
    title: 'Sources',
    bullets: [
      'ONS, Artificial intelligence in UK businesses: 2023 to 2026 (July 2026).',
      'British Chambers of Commerce, Atos and ISER/MiSoC, Future of Work: AI in the Workplace (March 2026).',
      'Noy and Zhang, Science (2023). Brynjolfsson, Li and Raymond, Quarterly Journal of Economics (2025). Dell’Acqua et al., Harvard Business School working paper 24-013 (2023).',
      'Government Digital Service, Microsoft 365 Copilot experiment (2025). DSIT, What Works for AI Upskilling in the UK: case studies (June 2026).',
      'Vendor surveys: Dell Technologies, AI in Action (2026); OpenAI and Enterprise Nation (2026). Guidance: ICO on AI and data protection; NCSC Cyber Essentials.'
    ],
    notes: 'Leave up during questions if the organisers want the sources visible, or hide it. The full references are on the speaker page.'
  }
];

/* ---------------------------------------------------------------- the build */
const KEY = 'ai-sme-productivity';
const TITLE = 'The Power of AI · practical case studies and proven tips for productivity';
const BLURB = 'A 30-minute keynote (with a 20-minute cut) for about 400 London SMEs at Working Smarter, Growing Together: where small firms are with AI, what controlled studies say it does to productivity and where it fails, five case studies (café, accountancy, trades, online shop, marketing agency), seven proven tips, a data traffic light, a 30-day plan and one commitment each.';
const THEME = 'ukbt';
const LOGO = 'assets/brand/ukbt-wordmark.png';

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
});

const target = path.join(ROOT, 'output', 'Power_of_AI_SMEs.sfdeck.json');
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, JSON.stringify(deck, null, 2) + '\n');
console.log(`${path.relative(ROOT, target)} (${deck.slides.length} slides, ${deck.slides.filter(s => !s.hidden).length} shown)`);

/* Built in: the app's lesson list and the Library's UK Black Tech folder. */
const lesson = {
  key: KEY, title: TITLE, blurb: BLURB, icon: '❯', kind: 'lecture', minutes: 30,
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
