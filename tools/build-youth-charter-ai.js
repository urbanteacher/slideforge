#!/usr/bin/env node
'use strict';

/* Build two SlideForge starter decks, ready for File → Import:
 * Soccerwise and Youthwise brought up to date with an AI focus.
 *
 * Presentation-driven: no phones, no join code, no live poll. Every vote is
 * hands up or four corners, every reveal is the presenter's click. The shape
 * follows the AI Awareness Day 2027 starters — cover question, scenario, vote
 * before the explanation, pair talk, facts, a judgement on a line, a reveal,
 * three rules, one personal choice — so students argue with each other's
 * ideas before they hear the teacher's.
 *
 * The copy is our own; the themes follow Youth Charter's packs, whose text and
 * images are not reproduced. Theme: css/youth-charter.css. Logo and covers:
 * assets/youth-charter/. */
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

const stamp = Date.parse('2026-10-02T00:00:00Z');
const CREDIT = 'Themes from Youth Charter’s education packs. Our own copy, not their materials.';
const info = (label, value, note) => [label, value, note].join('\t');
const card = (heading, body) => `${heading}\t${body}`;

/* The arrangement travels with each slide, so a deck moved to another theme
   keeps its poster cover, ballot and rules rather than falling back to lists. */
const COMPOSITION = {
  title: 'poster-art', quote: 'voice', cards: 'ballot', statement: 'prompt',
  iceberg: 'reveal-map', compare: 'comparison', sourcecheck: 'credits',
  spectrum: 'lanes', journey: 'rules', keyfact: 'commitment'
};

const teacherPage = (purpose, notes) => ({
  type: 'content',
  hidden: true,
  title: 'Teacher page',
  subtitle: 'Hidden from the class',
  bullets: [
    purpose,
    'Ten minutes. No phones, no join code: hands up, four corners and pair talk.',
    'Every reveal is one click. Ask first, then press →.'
  ],
  notes: `${CREDIT}\n\n${notes}`
});

/* ================================================================ SOCCERWISE
   Fairness is the thread: the referee's call, fair play online, and who gets
   to be a hero. The robot referee is the hook because every student already
   has an opinion about VAR. */
const soccerwise = [
  teacherPage(
    'Students decide where AI belongs in football, and what fair play means online.',
    'RUNNING ORDER\n' +
    '1 Cover — up as they come in\n' +
    '2 Scenario — 30s, read it, say nothing\n' +
    '3 Four corners — 90s, walk to a letter, one reason each\n' +
    '4 Pair talk — 75s\n' +
    '5 Did you know — 45s\n' +
    '6 Stand on the line — 2 min\n' +
    '7 Under the surface — 75s, one layer per click\n' +
    '8 Myth or fact — 2 min, the questions and answers\n' +
    '9 Three rules — 30s\n' +
    '10 Your choice — 45s\n\n' +
    'THE MOVE THAT MAKES IT WORK. Students hear each other before they hear you. ' +
    'After every vote, ask someone from a different corner to say the best reason ' +
    'for a corner they did not choose.\n\n' +
    'SEND / YOUNGER LEARNERS. Use slide 3 as a show of hands. On slide 6, give ' +
    'each pair one card to place rather than standing.\n\n' +
    'EXTENSION. Design a pitch-side poster: one rule for fair play online.'
  ),
  {
    type: 'title',
    title: 'Would you trust a robot referee?',
    subtitle: 'Soccerwise · Starter activity',
    body: 'Football. Fairness. AI.',
    image: 'assets/youth-charter/poster-soccerwise.svg',
    notes: 'COVER. Up as the class comes in. Do not explain the question; let them start arguing about it in the doorway.'
  },
  {
    type: 'quote',
    body: 'The cameras say offside by a toenail. The whole stadium saw a goal.',
    subtitle: 'The scenario · 30 seconds',
    notes: 'BEAT 1 · 30 SECONDS. Read it once. Let it sit. Do not comment.\n\nMost students will already have a VAR story. Save them for the next slide.'
  },
  {
    type: 'cards',
    title: 'Who should make the final call?',
    subtitle: 'Four corners · walk to your letter · 90 seconds',
    bullets: [
      card('The AI', 'It sees every millimetre, every time.'),
      card('The referee', 'Football is a human game.'),
      card('Both', 'The AI checks. A person can overrule it.'),
      card('The players', 'Let the people on the pitch decide.')
    ],
    notes: 'BEAT 2 · 90 SECONDS. Point to a corner of the room for each letter. Everyone moves; nobody sits this one out.\n\nThen the key move: ask one person in each corner for their reason, and ask someone in ANOTHER corner to repeat it back fairly before they argue with it.\n\nNo right answer yet. C is closest to how it works today, but do not say so until slide 8.'
  },
  {
    type: 'statement',
    body: 'Is a decision fair if it is accurate, but nobody can see how it was made?',
    subtitle: 'Discuss in pairs · 75 seconds',
    notes: 'BEAT 3 · 75 SECONDS. Pair with someone from a different corner.\n\nThe 75 seconds are the lesson. Resist filling them.\n\nListen for "but the computer can\'t be biased". That is the idea to test later: a system is only as fair as the people who built and use it.'
  },
  {
    type: 'stats',
    title: 'The ball is now a sensor',
    subtitle: 'Did you know?',
    bullets: [
      info('Points tracked on every player', '29', '50 times a second at the 2022 World Cup'),
      info('Readings a second from the ball', '500', 'from a sensor inside the match ball'),
      info('Goal-line technology at the World Cup', '2014', 'cameras check the whole ball crossed the line')
    ],
    body: 'Source: FIFA, semi-automated offside technology (Qatar 2022) and goal-line technology (Brazil 2014)',
    notes: 'BEAT 4 · 45 SECONDS. Let them react to 500 a second. Then the point: the machine measures; the officials still decide.\n\nAsk: does knowing this change your corner?'
  },
  {
    type: 'spectrum',
    title: 'Where should AI play?',
    subtitle: 'AI can help here | This must stay human',
    bullets: [
      info('Tracking how far each player runs', '8', ''),
      info('Flagging a player who needs rest', '28', ''),
      info('Drawing the offside line', '40', ''),
      info('Picking the starting eleven', '68', ''),
      info('Showing a red card', '84', ''),
      info('Choosing who gets a youth trial', '94', 'a decision about someone’s future')
    ],
    progressive: true,
    body: 'The positions are arguable. That is the activity.',
    notes: 'BEAT 5 · 2 MINUTES. STAND ON THE LINE. One wall is "AI can help", the opposite wall is "must stay human". Read each item before you reveal it; students stand where they think it goes. Then click to show where we put it.\n\nThe argument is always about the middle. Ask: "Which one did we put in the wrong place?"\n\nThe youth trial is the one to land: when AI helps decide who gets a chance, a hidden bias becomes someone\'s missed future.'
  },
  {
    type: 'iceberg',
    title: 'A video of a star player selling an app',
    subtitle: 'What is under the surface?',
    bullets: [
      info('A copied voice', 'Layer 1', 'AI can learn how a player sounds'),
      info('A copied face', 'Layer 2', 'and make their mouth match the words'),
      info('A scam link', 'Layer 3', 'built to take your money or your data'),
      info('A real person harmed', 'Layer 4', 'their name used to trick their own fans')
    ],
    progressive: true,
    body: 'Check the player’s official channels before you believe or share.',
    notes: 'BEAT 6 · 75 SECONDS. Ask "what could be fake here?" before each click. Take their answers, then reveal the layer that matches.\n\nThe last layer is the point: deepfakes are not just a trick on you, they are harm to a real person. A hero uses their real voice; a fake steals it.'
  },
  {
    type: 'compare',
    title: 'Myth or fact?',
    subtitle: 'Myth | Fact',
    bullets: [
      card('The AI makes the offside decision', 'The officials decide. The technology draws the line.'),
      card('Football is an aerobic sport', 'It is both: steady running and all-out sprints.'),
      card('Only famous people can be heroes', 'Anyone who speaks up for others can be one.'),
      card('If a video looks real, it is real', 'AI can fake faces and voices. Check first.')
    ],
    progressive: true,
    notes: 'BEAT 7 · 2 MINUTES · QUESTIONS AND ANSWERS. Read each myth aloud. Thumbs up for true, thumbs down for false. Then click to show the fact.\n\nRow 1 answers the four corners: today it is C, both.\nRow 3: in 2020 Marcus Rashford spoke from his own childhood and won free school meals over the holidays. Ask who in their own community speaks up for others.'
  },
  {
    type: 'journey',
    title: 'Three rules for football in the age of AI',
    subtitle: 'In the order you would use them',
    bullets: [
      card('Play fair, online too', 'No abuse of players, referees or fans, anywhere.'),
      card('Check before you share', 'Official channels first. Fakes spread through kind people.'),
      card('Keep humans in the big calls', 'AI can measure. People decide what is fair.')
    ],
    progressive: true,
    notes: 'BEAT 8 · 30 SECONDS. One rule per click. Three is the limit; a fourth rule is one nobody remembers.'
  },
  {
    type: 'keyfact',
    subtitle: 'Your choice · 45 seconds',
    title: 'Be the fair player',
    body: 'Decide one thing you will do this week to make football fairer, on the pitch or online.',
    bullets: ['One thing I will do:'],
    notes: 'BEAT 9 · 45 SECONDS. Everyone decides one thing. A few volunteers say theirs aloud; the rest keep it.\n\nIf someone mentions online abuse they have seen, follow it up after the lesson.'
  }
];

/* ================================================================= YOUTHWISE
   Fairness again, at the scale of a life: the five Youthwise themes as five
   places AI could widen or close the gap. The ballot lets students pick a
   theme, then swap reasons with someone who picked a different one. */
const youthwise = [
  teacherPage(
    'Students decide whether AI will make their future fairer, across the five Youthwise themes.',
    'RUNNING ORDER\n' +
    '1 Cover — up as they come in\n' +
    '2 Scenario — 30s\n' +
    '3 Four corners — 90s, then swap reasons\n' +
    '4 Pair talk — 75s\n' +
    '5 Did you know — 45s\n' +
    '6 Stand on the line — 2 min\n' +
    '7 Check the claim — 75s, one row per click\n' +
    '8 Myth or fact — 2 min, the questions and answers\n' +
    '9 Three rules — 30s\n' +
    '10 Your move — 45s\n\n' +
    'THE FIVE THEMES. Education; health; citizenship; environment; college, ' +
    'employment and enterprise.\n\n' +
    'THE MOVE THAT MAKES IT WORK. After the ballot, everyone finds one person who ' +
    'chose a different letter and explains their choice in one sentence. They ' +
    'come back with the other person\'s reason, not their own.\n\n' +
    'SEND / YOUNGER LEARNERS. Run slide 3 as a show of hands and slide 6 with ' +
    'cards on a table.\n\n' +
    'EXTENSION. Each group takes one theme and designs an AI tool that would make ' +
    'it fairer, and names who it might leave out.'
  ),
  {
    type: 'title',
    title: 'Will AI make your future fairer?',
    subtitle: 'Youthwise · Starter activity',
    body: 'Five themes. One future. Yours.',
    image: 'assets/youth-charter/poster-youthwise.svg',
    notes: 'COVER. Up as the class comes in. The five dots on the cover are the five Youthwise themes; someone usually asks.'
  },
  {
    type: 'quote',
    body: 'An AI wrote my CV in ten seconds. My mate couldn’t afford the app.',
    subtitle: 'The scenario · 30 seconds',
    notes: 'BEAT 1 · 30 SECONDS. Read it, let it sit, move on. The question underneath is who gets the benefit.'
  },
  {
    type: 'cards',
    title: 'Which part of your life will AI change most?',
    subtitle: 'Four corners · then swap reasons · 90 seconds',
    bullets: [
      card('Learning', 'How you study, revise and get feedback.'),
      card('Wellbeing', 'Your health, your sleep, who you talk to.'),
      card('Your voice', 'Your rights, your views, what you believe.'),
      card('Work', 'College, jobs, and starting something of your own.')
    ],
    notes: 'BEAT 2 · 90 SECONDS. Four corners. Everyone moves.\n\nThe letters are four of the Youthwise themes: education, health, citizenship, and college, employment and enterprise. The fifth, environment, comes in on slides 5 and 8.\n\nThen: find one person from a different letter. Each explains their choice in one sentence. Come back ready to share THEIR reason.\n\nTake two or three of those borrowed reasons. Students are far more generous with someone else\'s idea than their own.'
  },
  {
    type: 'statement',
    body: 'If AI helps some young people far more than others, is that progress?',
    subtitle: 'Discuss in pairs · 75 seconds',
    notes: 'BEAT 3 · 75 SECONDS. Pair with your swap partner.\n\nListen for "everyone has a phone". Push on it: the free tool and the paid tool are not the same, and neither is the help at home to use them well.'
  },
  {
    type: 'stats',
    title: 'AI is already in your future',
    subtitle: 'Did you know?',
    bullets: [
      info('UNESCO’s suggested minimum age for AI in class', '13', 'guidance on generative AI in education, 2023'),
      info('World electricity used by data centres', '1.5%', 'in 2024, set to more than double by 2030'),
      info('New jobs expected worldwide by 2030', '170m', 'while 92m are displaced')
    ],
    body: 'Sources: UNESCO 2023 · International Energy Agency, Energy and AI, 2025 · World Economic Forum, Future of Jobs 2025',
    notes: 'BEAT 4 · 45 SECONDS. One number for school, one for the planet, one for work. Ask which theme each belongs to.\n\nHold the 170m figure: the next slides test it.'
  },
  {
    type: 'spectrum',
    title: 'Helpful or harmful?',
    subtitle: 'AI mostly helps | AI mostly harms',
    bullets: [
      info('Live captions for a deaf student', '6', ''),
      info('A patient tutor at midnight', '24', ''),
      info('Writing your CV for you', '44', ''),
      info('A chatbot as your only friend', '72', ''),
      info('Using AI to avoid all the thinking', '80', ''),
      info('A fake image of a classmate', '97', 'can be abuse; an intimate one is a crime')
    ],
    progressive: true,
    body: 'The positions are arguable. That is the activity.',
    notes: 'BEAT 5 · 2 MINUTES. STAND ON THE LINE. One wall helps, the other harms. Read each item, students stand, then click to show where we put it.\n\nThe CV is the one to argue about: helpful for the person who has it, and unfair for the one who does not. That is the scenario from slide 2.\n\nThe last item is not up for debate. Sharing an intimate deepfake of a real person is a criminal offence in the UK (Online Safety Act 2023). Follow your safeguarding process if anything is disclosed.'
  },
  {
    type: 'sourcecheck',
    title: '“AI will create 170 million new jobs”',
    subtitle: 'On a slide two minutes ago. Did anyone check it?',
    bullets: [
      info('Who', 'WEF', 'the World Economic Forum’s Future of Jobs Report'),
      info('When', '2025', 'published in January'),
      info('Basis', 'A forecast', 'what over 1,000 employers expect, not a count'),
      info('Against', '92m lost', 'so 78m more overall, if it comes true'),
      info('Gap', 'For whom?', 'the headline does not say who gets the new jobs')
    ],
    progressive: true,
    notes: 'BEAT 6 · 75 SECONDS. One row per click. Let the claim come apart a little.\n\nBe fair to the number: it is a serious forecast from a serious source. The point is that nobody asked, and that the last row is the fairness question from slide 4 again.'
  },
  {
    type: 'compare',
    title: 'Myth or fact?',
    subtitle: 'Myth | Fact',
    bullets: [
      card('AI knows the right answer', 'It predicts likely words. It can be confidently wrong.'),
      card('AI lives in the cloud, so it costs nothing', 'The cloud is buildings full of computers using power and water.'),
      card('AI will take all the jobs', 'Experts expect jobs to change more than disappear.'),
      card('Your rights stop at the screen', 'The UN says children’s rights apply online too.')
    ],
    progressive: true,
    notes: 'BEAT 7 · 2 MINUTES · QUESTIONS AND ANSWERS. Read each myth. Thumbs up for true, thumbs down for false. Click to reveal the fact.\n\nRow 1: when AI is confidently wrong it is called a hallucination.\nRow 4: UN Committee on the Rights of the Child, General Comment No. 25 (2021).'
  },
  {
    type: 'journey',
    title: 'Three rules for a fairer AI future',
    subtitle: 'In the order you would use them',
    bullets: [
      card('Think first, then ask', 'Use AI to think harder, not to skip the thinking.'),
      card('Ask who it leaves out', 'If a tool helps you, who does it not help?'),
      card('Use your voice', 'Young people have a right to be heard on decisions about them.')
    ],
    progressive: true,
    notes: 'BEAT 8 · 30 SECONDS. One rule per click. The right to be heard is Article 12 of the UN Convention on the Rights of the Child.'
  },
  {
    type: 'keyfact',
    subtitle: 'Your move · 45 seconds',
    title: 'Pick your theme. Make one move.',
    body: 'Choose one Youthwise theme and one thing you will do, with AI or without it, to make it fairer.',
    bullets: ['My theme and my move:'],
    notes: 'BEAT 9 · 45 SECONDS. Everyone writes or decides one move. Volunteers share; collect a few as the opening of your next lesson.'
  }
];

function build(id, title, slides, theme) {
  const authored = slides.map((slide, index) => ({
    id: `${id}-${String(index).padStart(2, '0')}`,
    ...slide,
    ...(!slide.hidden && COMPOSITION[slide.type] ? { design: { composition: COMPOSITION[slide.type] } } : {})
  }));
  const deck = SF.normalizeDeck({
    id,
    title,
    theme,
    libraryGroup: 'other',
    aspect: '16:9',
    org: 'Youth Charter',
    closingNote: 'Youth Charter · Sport, art, culture & digital tech',
    showSlideNumbers: true,
    finalScores: false,
    logo: 'assets/youth-charter/yc-logo.png',
    logoOn: 'all',
    logoSize: 'large',
    created: stamp,
    modified: stamp,
    slides: authored
  });
  if (!deck || deck.slides.length !== slides.length) throw new Error(`${title}: SlideForge did not keep every slide`);
  if (deck.theme !== theme) throw new Error(`${title}: theme became ${deck.theme}`);
  if (deck.logo !== 'assets/youth-charter/yc-logo.png') throw new Error(`${title}: lost its logo`);
  if (deck.slides.filter(s => !s.hidden).length !== 10) throw new Error(`${title}: wants 10 visible slides`);
  slides.forEach((source, index) => {
    const output = deck.slides[index];
    const where = `${title}: slide ${index} (${source.type})`;
    if (output.type !== source.type || output.notes !== source.notes) throw new Error(`${where} changed`);
    if ((source.bullets || []).length !== output.bullets.length) throw new Error(`${where} lost content`);
    if (source.feedback || output.feedback) throw new Error(`${where} carries a live poll; these decks are presentation-only`);
    if (source.image && !fs.existsSync(path.join(__dirname, '..', source.image))) throw new Error(`${where}: missing ${source.image}`);
    const want = !source.hidden && COMPOSITION[source.type];
    if (want && SF.slideComposition(deck, output) !== want) throw new Error(`${where} lost its ${want} arrangement`);
  });
  return deck;
}

const outputs = [
  ['Soccerwise_AI.sfdeck.json', build('soccerwise-ai-2026', 'Soccerwise · Would you trust a robot referee?', soccerwise, 'youth-charter-matchday')],
  ['Youthwise_AI.sfdeck.json', build('youthwise-ai-2026', 'Youthwise · Will AI make your future fairer?', youthwise, 'youth-charter')]
];
for (const [file, deck] of outputs) {
  const target = path.join(__dirname, '..', 'output', file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(deck, null, 2) + '\n');
  console.log(`${target} (${deck.slides.length} slides, ${deck.slides.filter(s => !s.hidden).length} shown)`);
}
