#!/usr/bin/env node
'use strict';

/* Build two SlideForge starter decks: Soccerwise and Youthwise brought up to
 * date with an AI focus, and The AI stadium (AI across a Premier League club). Writes output/*.sfdeck.json (for File → Import) and
 * js/lessons-youth-charter.js, which builds both into the app's lesson list
 * and seeds them into the Library's Youth Charter folder.
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
/* A compare row is three cells: the row's own label, then one per column. */
const row = (label, left, right) => [label, left, right].join('\t');
const myth = (claim, fact, verdict = 'Myth') => row(claim, verdict, fact);

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
    subtitle: 'Myth or fact? | The facts',
    bullets: [
      myth('The AI makes the offside decision', 'The officials decide. The technology draws the line.'),
      myth('Football is an aerobic sport', 'It is both: steady running and all-out sprints.'),
      myth('Only famous people can be heroes', 'Anyone who speaks up for others can be one.'),
      myth('If a video looks real, it is real', 'AI can fake faces and voices. Check first.')
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
    subtitle: 'Myth or fact? | The facts',
    bullets: [
      myth('AI knows the right answer', 'It predicts likely words. It can be confidently wrong.'),
      myth('AI lives in the cloud, so it costs nothing', 'The cloud is buildings full of computers using power and water.'),
      myth('AI will take all the jobs', 'Experts expect jobs to change more than disappear.'),
      myth('Your rights stop at the screen', 'The UN says children’s rights apply online too.')
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

/* ===================================================== THE AI STADIUM (EPL)
   The whole club, not one gadget: a map of a Premier League ground on
   matchday and the club around it, zone by zone. The facts about the Premier
   League come from AI Awareness Day's "Did you know the English Premier
   League uses AI?" (aiawarenessday.co.uk/timeline/english-premier-league/);
   Liverpool's neuroscience and the Klopp hire come from Ulrich
   Lichtenthaler, "Liverpool FC: Extending data analytics and AI with
   neuroscience" (2022). The rest is said as what clubs and grounds can do,
   not as any one club's practice. Every zone names who still decides and the catch, so the map is
   a debate and not an advert. */
const ML = 'Machine learning', DL = 'Deep learning', CV = 'Computer vision', NLP = 'Language AI (NLP)', GEN = 'Generative AI', SIM = 'Simulation';
const STADIUM_ZONES = {
  gates: { name: 'Gates & turnstiles', ai: [CV, ML],
    does: 'Tickets on phones are scanned at the turnstiles. Software counts fans in and predicts where queues will build, so stewards can open more gates early.',
    how: 'Machine learning learns from past matchdays when crowds arrive. Computer vision can read faces, which some police forces have trialled outside grounds.',
    decides: 'The stewards and the ground’s safety officer.',
    risk: 'If your face becomes your ticket, your face is on a database.',
    ask: 'Would you scan your face to get in quicker?' },
  control: { name: 'Safety control room', ai: [CV],
    does: 'CCTV software watches stairways and concourses, and warns the safety team when a crowd gets too packed or starts moving the wrong way.',
    how: 'Computer vision counts people in each camera picture and spots crowding patterns faster than a person watching dozens of screens.',
    decides: 'The safety officer. Keeping 50,000 people safe is a human job.',
    risk: 'The cameras watch everyone, not only the trouble.',
    ask: 'Is being watched the price of being safe?' },
  stands: { name: 'The stands', ai: [ML],
    does: 'The club app holds your ticket, lets you order food to your seat, and suggests offers.',
    how: 'Machine learning finds patterns in what fans like you bought before, and predicts what you will want next.',
    decides: 'You, every time you tap “accept”.',
    risk: 'The app learns where you sit, what you buy and when you leave.',
    ask: 'What does your phone tell the club about you?' },
  pitch: { name: 'The pitch & the officials', ai: [CV, DL],
    does: 'Semi-automated offside tracks dozens of points on every player’s body, and a chip in the ball. VAR checks camera angles in seconds.',
    how: 'Deep learning has been trained on thousands of hours of video to find players’ joints in every frame, so a computer can draw the offside line.',
    decides: 'The referee and the VAR officials. The machine draws the line; people make the call.',
    risk: 'Everyone waits for the check before they can celebrate.',
    ask: 'Would you trade the wait for a fairer result?' },
  dugout: { name: 'Dugout & analysts’ box', ai: [ML, DL, SIM],
    does: 'Analysts track every player 25 times a second to see which team controls which space, and test thousands of corner routines before a match.',
    how: 'Machine learning turns tracking into “pitch control”. Google DeepMind’s TacticAI, a deep learning model, suggests where players should stand at corners.',
    decides: 'The manager picks the team and the tactics.',
    risk: 'If every club follows the same models, football gets more predictable.',
    ask: 'Should a manager ever ignore what the data says?' },
  medical: { name: 'Dressing room & medical', ai: [ML],
    does: 'GPS vests and sensors measure every sprint and heartbeat, in training and in matches.',
    how: 'Machine learning compares a player’s numbers with thousands of past injuries, and flags when tired muscles are at risk of a tear.',
    decides: 'The medical team and the player.',
    risk: 'A player’s body becomes data. Who owns it?',
    ask: 'Would you wear a sensor that tells your coach you are tired?' },
  tv: { name: 'TV gantry & media', ai: [CV, SIM],
    does: 'Highlights are cut in seconds, and live graphics show each team’s chance of winning.',
    how: 'Computer vision spots goals, shots and celebrations in the video. The Opta supercomputer simulates the season 10,000 times to get the chances.',
    decides: 'The TV director chooses what millions of people see.',
    risk: 'The highlights pick which players become famous.',
    ask: 'Who decides what goes viral?' },
  grounds: { name: 'Pitch care & energy', ai: [ML],
    does: 'Sensors under the grass measure moisture and temperature, and help decide when to water, light and mow.',
    how: 'Machine learning finds the pattern between weather, sensor readings and how the grass grows.',
    decides: 'The head groundsperson, who knows the pitch.',
    risk: 'A sensor can say the grass is fine when a player knows it is not.',
    ask: 'Where would you trust the sensor over the expert?' },
  training: { name: 'Training ground & academy', ai: [ML, CV],
    does: 'Every session is filmed and tracked. Liverpool also worked with neuro11, a neuroscience company, to train players’ focus for penalties.',
    how: 'Computer vision tracks the players on film; machine learning plans how hard each one should work this week. Academies collect the same data on young players.',
    decides: 'The coaches and academy staff.',
    risk: 'Data on a 12-year-old can label them too early.',
    ask: 'Should data decide who gets released from an academy?' },
  scouting: { name: 'Scouting office', ai: [ML, NLP, SIM],
    does: 'Clubs search for players across the world. Reading made the first head of AI at an English club to find players they never knew about.',
    how: 'PLAIER’s machine learning rates players from data on over 100 leagues, simulates a signing’s season 100,000 times, and writes reports in plain words.',
    decides: 'The scouts. Reading kept its human scouts; the AI gives them more players to look at.',
    risk: 'A player in a league with no data is invisible to the machine.',
    ask: 'Who gets missed when scouting runs on data?' },
  business: { name: 'Club business', ai: [ML, GEN],
    does: 'Clubs use data to set prices and sell sponsorship. At least three Premier League clubs are reported to be exploring an AI copy of rival clubs, to practise transfer deals.',
    how: 'Machine learning predicts demand for each match. The copy is a generative AI chatbot built on data about clubs’ past transfers.',
    decides: 'The club’s owners and directors.',
    risk: 'The copy is built from what real people said and did. Nobody asked them.',
    ask: 'Is it fair to practise a deal against an AI copy of the other side?' },
  home: { name: 'Fans at home', ai: [NLP, GEN],
    does: 'The Premier League Companion, built with Microsoft, answers fans’ questions from 30 seasons of stats and live data. The Fantasy Premier League Companion helps pick your team.',
    how: 'A generative AI chatbot reads your question in your own language and writes an answer from the league’s data. Language AI also filters abuse aimed at players.',
    decides: 'You pick your team. Platforms decide what you are shown.',
    risk: 'It learns what keeps you on the app, and abuse still gets past filters.',
    ask: 'Is it still your team if an AI picked it?' }
};
const STADIUM_EYEBROW = 'The AI stadium';
const STADIUM_SOURCE = 'Sources: AI Awareness Day · Microsoft · BBC · Sky Sports · OneFootball · Mirror · Liverpool.com · U. Lichtenthaler';
const stadiumData = (title) => ({
  eyebrow: STADIUM_EYEBROW, title, source: STADIUM_SOURCE,
  intro: { name: 'Twelve zones', ask: 'Where does AI matter most?' },
  cloud: { name: 'One league, one cloud', ai: [ML, CV, NLP, GEN, SIM],
    does: 'Every zone sends its data to the same place: tickets, cameras, sensors, scouting, prices, your app.',
    how: 'The Premier League is building one media, data and AI platform with Microsoft, its official Cloud and AI partner, for 1.8 billion fans.',
    decides: 'Whoever controls the data.', risk: 'Data collected to keep you safe can be used to sell to you.', ask: 'Who should be allowed to see all of it?' },
  zones: STADIUM_ZONES
});
const ZONE_ORDER = ['gates', 'control', 'stands', 'pitch', 'dugout', 'medical', 'tv', 'grounds', 'training', 'scouting', 'business', 'home'];
/* One zone, one slide: the map zooms in on it as the slide opens. */
const zonePage = (zone, notes) => {
  const n = ZONE_ORDER.indexOf(zone) + 1, z = STADIUM_ZONES[zone];
  return {
    type: 'figure', figure: 'stadium', title: `Zone ${n} · ${z.name}`,
    figureAlt: `The stadium map zoomed in on zone ${n}, ${z.name}. ${z.does} The AI: ${z.ai.join(', ')}.`,
    figureData: stadiumData(n <= 8 ? 'Inside the ground' : 'Beyond the ground'),
    figureSteps: [{ zone, caption: `Zone ${n} · ${z.name}` }],
    notes
  };
};

const premierLeague = [
  teacherPage(
    'Students map where AI works across a whole football club on matchday, and decide where people must keep control.',
    'RUNNING ORDER · ABOUT 40 MINUTES (slide numbers are the shown slides)\n' +
    '· Cover — up as they come in\n' +
    '· The 95th minute — 1 min\n' +
    '· Four corners — 2 min, where does AI work hardest?\n' +
    '· What is AI? — 2 min\n' +
    '· How AI learns, and what AI can do — 2 min\n' +
    '· THE AI STADIUM — 1 min, the map and its twelve zones\n' +
    '· Zones 1–6, a slide each — 6 min\n' +
    '· Pair talk — 2 min, the sensor that knows you are tired\n' +
    '· Zones 7–12, a slide each — 5 min\n' +
    '· One league, one cloud — 2 min\n' +
    '· The numbers — 1 min\n' +
    '· The Klopp hire — 1 min\n' +
    '· Integrated intelligence — 2 min\n' +
    '· The 90/10 debate — 2 min\n' +
    '· Stand on the line — 3 min\n' +
    '· Myth or fact — 2 min\n' +
    '· Bad at team sports — 1 min\n' +
    '· Careers four corners — 2 min\n' +
    '· Three rules — 1 min\n' +
    '· Your move — 1 min\n' +
    '· The last word\n\n' +
    'FOR 30 MINUTES. Hide the 90/10 debate, stand on the line and myth or fact; keep a zone to 40 seconds.\n\n' +
    'THE BIG IDEA. Integrated intelligence: the clubs that win combine AI and data with human skills, like Jürgen Klopp’s people skills at Liverpool. Every zone on the map is AI plus a person, never AI alone. The Klopp hire and integrated intelligence say it out loud, and the 90/10 debate argues with it.\n\n' +
    'THE MAP. The map slide shows all twelve zones. Each of the next twelve slides is one zone: the map zooms in as it opens, and the panel says what happens there, which kinds of AI do it (the dark labels), how they work, who still decides and the catch. Read the yellow question and take two answers. Hover a zone to name it.\n\n' +
    'THE BASICS. "What is AI?" and "The kinds of AI" come before the map, so every zone can be named: machine learning, deep learning, computer vision, language AI, generative AI, simulation.\n\n' +
    'THE MOVE THAT MAKES IT WORK. Every zone has a catch. Do not sell the technology; let them argue about it.\n\n' +
    'SOURCES. The Premier League facts are from AI Awareness Day’s timeline post, “Did you know the English Premier League uses AI?”. Liverpool’s neuroscience work and the Klopp hire are from Ulrich Lichtenthaler, “Liverpool FC: Extending data analytics and AI with neuroscience” (May 2022). The Premier League Companion and the fan figures are Microsoft’s (unlocked.microsoft.com/premier-league and its customer story); treat them as the company’s claims. Reading’s head of AI is from BBC Sport, “Reading hope AI can take them to the Premier League” (6 March 2026). PLAIER’s simulations, the Kane prediction and the 90/10 claim are from Sky Sports, “AI revolution in football: how PLAIER is helping Premier League clubs make better decisions” (6 February 2025): the company’s own findings. William Spearman’s words are from the Mirror (21 September 2022), quoting Liverpoolfc.com. The 1.3% goal probability and Moneyball are from Liverpool.com, “Liverpool are using incredible data science during matches” (15 January 2020). The negotiation clone is from OneFootball (10 June 2026), reporting the Telegraph: the software is Nostrada.ai, and clubs were said to be considering it, not yet using it. The other zones say what clubs and grounds can do, not what one named club does.\n\n' +
    'SEND / YOUNGER LEARNERS. Give pairs a printed map and twelve sticky dots: they place a dot where they think AI is before slide 4.\n\n' +
    'EXTENSION. Design one new zone: where else in a club could AI help, and what would its catch be?'
  ),
  {
    type: 'title',
    title: 'The AI stadium',
    subtitle: 'Youth Charter · AI in football',
    body: 'Twelve places AI works on matchday. Can you find them?',
    image: 'assets/youth-charter/poster-premier-league.svg',
    notes: 'COVER. Up as the class comes in. Ask the door: "How many computers do you think are working at a Premier League match?"'
  },
  {
    type: 'quote',
    body: 'Ninety-five minutes on the clock. The ball hits the net. Before the celebration ends, the cameras have already found the foul.',
    subtitle: 'Arsenal v West Ham · 1 minute',
    notes: 'BEAT 1 · 1 MINUTE. From the AI Awareness Day post: West Ham scored what looked like a late equaliser against Arsenal; multiple camera angles were checked in seconds and the foul on goalkeeper David Raya was found. The 1-0 stood.\n\nAsk: "Was that fair? Would you feel differently if you supported West Ham?"'
  },
  {
    type: 'cards',
    title: 'Where does AI work hardest on matchday?',
    subtitle: 'Four corners · walk to your letter · 2 minutes',
    bullets: [
      card('On the pitch', 'Offside lines, VAR, the ball.'),
      card('In the stands', 'Tickets, crowds, cameras.'),
      card('On TV', 'Highlights, graphics, predictions.'),
      card('Behind the scenes', 'Injuries, scouting, tactics.')
    ],
    notes: 'BEAT 2 · 2 MINUTES. Everyone moves. One reason from each corner.\n\nThe answer is all four, which the map shows next. Remember who stood where: come back to it after slide 6.'
  },
  {
    type: 'image',
    title: 'What is AI?',
    image: 'assets/youth-charter/ai-family.svg',
    imageFit: 'contain',
    design: { capStyle: 'none' },
    notes: 'BEAT 3 · 2 MINUTES. THE BASICS. Ask first: "What is AI?" Take two answers.\n\nThen the picture, from the outside in. AI is the big idea: computers doing jobs that usually need human intelligence, like seeing, predicting or understanding language. Machine learning is one way to build it: instead of writing every rule, you show the computer lots of examples and it learns the pattern. Deep learning is machine learning with many layers of artificial “neurons”, which is what made computers good at pictures and speech. Generative AI is deep learning that makes something new: words, images, video.\n\nCheck: "Is a calculator AI?" (No: it follows fixed rules and learns nothing.) "Is a spam filter AI?" (Yes: it learned what spam looks like.)'
  },
  {
    type: 'cards',
    title: 'How AI learns and predicts',
    subtitle: 'The engines',
    bullets: [
      card('Machine learning', 'Learns patterns from past examples. In football: warns that a player is at risk of injury.'),
      card('Deep learning', 'Learns from huge amounts of data, in many layers. In football: finds every player’s joints in a video.'),
      card('Simulation', 'Plays out “what if” thousands of times. In football: plays the season 10,000 times.')
    ],
    notes: 'BEAT 4 · 1 MINUTE. The engines. Machine learning and deep learning are how AI learns; simulation uses what it learned to try thousands of futures.\n\nSimulation on its own is not always AI, but in football it usually runs on what machine learning has learned.'
  },
  {
    type: 'cards',
    title: 'What AI can do',
    subtitle: 'The jobs',
    bullets: [
      card('Computer vision', 'Sees and understands pictures and video. In football: draws the offside line.'),
      card('Language AI (NLP)', 'Understands and writes human language. In football: writes scouting reports.'),
      card('Generative AI', 'Makes new words, pictures or video. In football: answers fans in a chatbot.')
    ],
    notes: 'BEAT 5 · 1 MINUTE. The jobs. NLP means natural language processing. Every zone on the map uses at least one of these six kinds: watch for the dark labels on each zone’s page.\n\nAsk: "Which one have you used today?" Face unlock is computer vision; autocorrect and voice assistants are language AI; a chatbot is generative AI; a recommended video is machine learning.'
  },
  {
    type: 'figure', figure: 'stadium', title: 'The AI stadium',
    figureAlt: 'A top-down map of a football stadium and the club around it, with twelve numbered zones where AI is used.',
    figureData: stadiumData('The whole club'),
    figureSteps: [{ zone: 'all', caption: 'The whole club on matchday' }],
    notes: 'BEAT 6 · 1 MINUTE. THE MAP. Twelve zones: eight in the ground, four beyond it. The next twelve slides take one zone each, and the map zooms in on it.\n\nAsk the yellow question, and remember who said what: come back to it at the cloud.'
  },
  zonePage('gates', 'BEAT 7 · ZONE 1 · ABOUT 1 MINUTE. Read "What happens here" in your own words, point at the AI labels, then the question. Facial recognition: South Wales Police used live facial recognition at Cardiff City and Swansea City matches. Take a hands-up vote on the question.'),
  zonePage('control', 'BEAT 8 · ZONE 2 · ABOUT 1 MINUTE. In the UK every big ground has a safety officer in a control room high in the stand, watching the cameras. Computer vision helps them notice what a person would miss across dozens of screens.'),
  zonePage('stands', 'BEAT 9 · ZONE 3 · ABOUT 1 MINUTE. Make it personal: "Who has a club or ticket app? What did you agree to when you installed it?" The same machine learning chooses your next video on social media.'),
  zonePage('pitch', 'BEAT 10 · ZONE 4 · ABOUT 1 MINUTE. Link back to the 95th minute: this is the zone that found the foul on David Raya. Deep learning finds the players’ joints; computer vision turns them into a line. A person still makes the call.'),
  zonePage('dugout', 'BEAT 11 · ZONE 5 · ABOUT 1 MINUTE. Pitch control: which areas of the pitch a team controls, so that a pass there would reach them. TacticAI was built by Google DeepMind with Liverpool. Ask the question with a show of hands.'),
  zonePage('medical', 'BEAT 12 · ZONE 6 · ABOUT 1 MINUTE. Machine learning in its simplest form: lots of past examples (sprints, heart rate, injuries), and a pattern that warns before the next one. Then the pair talk on the next slide.'),
  {
    type: 'statement',
    body: 'A sensor knows a player is tired before they do. Who should be allowed to see that?',
    subtitle: 'Pair talk · 2 minutes',
    notes: 'BEAT 13 · 2 MINUTES. Pair with someone from a different corner.\n\nPush for a list: the player, the coach, the doctor, the manager, a new club that wants to buy them, a betting company. Where does it stop being OK?'
  },
  zonePage('tv', 'BEAT 14 · ZONE 7 · ABOUT 1 MINUTE. Two kinds of AI in one zone: computer vision finds the moments in the video, and simulation gives the win chances on screen. Ask: "Have you watched a highlight that made one player look better than they were?"'),
  zonePage('grounds', 'BEAT 15 · ZONE 8 · 30 SECONDS. The quick one: AI looking after grass. Ask the question and move on.'),
  zonePage('training', 'BEAT 16 · ZONE 9 · ABOUT 1 MINUTE. Beyond the ground now. neuro11 is a neuroscience company: it is the brain science alongside the data, not an AI itself. In the February 2022 League Cup final shootout, every Liverpool taker scored. The academy question matters most for this room.'),
  zonePage('scouting', 'BEAT 17 · ZONE 10 · ABOUT 1 MINUTE. Three kinds of AI: machine learning rates players, simulation tests a signing, language AI writes the report. Reading (BBC Sport, March 2026) kept its human scouts.'),
  zonePage('business', 'BEAT 18 · ZONE 11 · ABOUT 1 MINUTE. Reported, not confirmed: OneFootball (June 2026), citing the Telegraph, said at least three clubs were considering Nostrada.ai, a tool first used to model politicians in negotiations. Ask the question.'),
  zonePage('home', 'BEAT 19 · ZONE 12 · ABOUT 1 MINUTE. Generative AI they will know: a chatbot. Microsoft says 60 million fans used the Premier League Companion in its first two months (Microsoft’s figure). Ask the question.'),
  {
    type: 'figure', figure: 'stadium', title: 'One league, one cloud',
    figureAlt: 'The stadium map with every zone’s data flowing to one data cloud.',
    figureData: stadiumData('Every zone, one cloud'),
    figureSteps: [{ zone: 'cloud', caption: 'Every zone, one cloud' }],
    notes: 'BEAT 20 · 2 MINUTES. Every zone feeds one place. Ask who should be allowed to see all of it.\n\nThen go back to the four corners at the start: everyone was right. AI works in every corner of the club.'
  },
  {
    type: 'stats',
    title: 'The numbers behind matchday',
    subtitle: 'Did you know?',
    bullets: [
      info('Chance of a goal in the next 15 seconds', '1.3%', 'Liverpool’s model, from where the ball and players are'),
      info('Premier League fans, in 189 countries', '1.8bn', 'Microsoft and the Premier League’s figure'),
      info('Penalties Liverpool scored in a cup final shootout', '11 of 11', 'after neuroscience training, February 2022')
    ],
    body: 'Sources: Liverpool.com (2020) on pitch control; Microsoft, “AI at the heart of the beautiful game” (2026); Ulrich Lichtenthaler (2022) on Liverpool and neuro11',
    notes: 'BEAT 21 · 1 MINUTE. Liverpool’s Director of Research, William Spearman, has a PhD in particle physics and worked at CERN. Ask: "Did you think football clubs hired physicists?"\n\nThe 1.3%: Liverpool’s data scientist Tim Waskett, an astrophysicist, showed at the Royal Institution Christmas Lectures how the club turns every moment of a match into a goal probability: with the ball in one position, a 1.3% chance of a goal in the next 15 seconds (Liverpool.com, January 2020). Every pass changes the number. Ask: "Which pass would you make to push it up?"\n\nThe 1.8 billion: Microsoft says the Premier League Companion reached 60 million active fans in its first two months, with 20% more engagement on the league’s app and website. Those are Microsoft’s own figures, from its customer story; say so.\n\nThe 11 of 11: Liverpool beat Chelsea on penalties in the February 2022 League Cup final, with every Liverpool taker scoring. Jürgen Klopp credited neuro11, a German neuroscience company the club had worked with since 2021, for preparing players for penalties and set pieces.'
  },
  {
    type: 'journey',
    title: 'Why Liverpool hired Jürgen Klopp',
    subtitle: '2015 · what the data saw',
    bullets: [
      card('A bad season', 'Klopp’s last season at Borussia Dortmund went badly, and the papers criticised him.'),
      card('The data', 'Liverpool’s research team, led by Ian Graham, found Dortmund had been very unlucky. Klopp was still one of the best.'),
      card('The result', 'Liverpool hired him. They won the Champions League in 2019 and the Premier League in 2020.')
    ],
    progressive: true,
    notes: 'BEAT 22 · 1 MINUTE. From Ulrich Lichtenthaler (2022): after a bad final season at Borussia Dortmund, Klopp was heavily criticised. Liverpool’s Head of Research, Ian Graham, and his team showed that Dortmund had been very unlucky and that Klopp was still one of the best managers. Liverpool won the Champions League in 2019 and the Premier League in 2020.\n\nAsk: "So did the data win those trophies?" Take answers, then the next slide.'
  },
  {
    type: 'compare',
    title: 'Integrated intelligence',
    subtitle: 'What AI brings | What people bring',
    bullets: [
      row('Matchday', 'Tracks every player 25 times a second.', 'Spots who is having a bad week at home.'),
      row('The season', 'Simulates the season 10,000 times.', 'Picks the moment to take a risk.'),
      row('Transfers', 'Finds players in data from around the world.', 'Sees who will fit the dressing room.'),
      row('Penalties', 'Trains players’ focus for the shootout.', 'Puts an arm round the one who missed.')
    ],
    progressive: true,
    notes: 'BEAT 23 · 2 MINUTES. THE BIG IDEA. Lichtenthaler calls it integrated intelligence: Liverpool’s data and AI only paid off when they were combined with Klopp’s emotional intelligence and people skills. Neither side wins alone.\n\nRead each AI line, ask "and what does a person bring?", take an answer, then click. Then: "Go back to the map. Which zone has AI with no person beside it?" (None should.)\n\nLiverpool.com (2020) put it simply: whatever the data scientists find, Klopp has to interpret it and apply it in a footballing sense. Liverpool’s owners have trusted data for a long time: John Henry once offered Billy Beane, the man behind Moneyball, the job of running the Boston Red Sox.\n\nThe same idea from BBC Sport (March 2026): Professor Nick Jennings of Loughborough University says AI “complements human expertise and human insight”, and Reading’s head of AI says that for now it complements the team, and results are down to the coaches.'
  },
  {
    type: 'statement',
    body: 'An AI company says players are 90% of a team’s success, and the coach only 10%.',
    subtitle: 'Agree or disagree · hands up · 2 minutes',
    notes: 'BEAT 24 · 2 MINUTES. THE DEBATE. Hands up: agree, disagree, not sure. Then one reason from each side.\n\nFrom Sky Sports (February 2025): Jan Wendt, co-founder of PLAIER, said its models found player quality responsible for around 90% of success and the coach around 10%, though 10% can still make the difference. PLAIER also said Klopp’s Liverpool performed about as well as its squad should have.\n\nSet that against the last two slides: Lichtenthaler credits Klopp’s people skills. Who is right? Maybe both: the coach is part of why the players got that good. That is integrated intelligence again.'
  },
  {
    type: 'spectrum',
    title: 'Where should AI decide?',
    subtitle: 'AI can decide | A person must decide',
    bullets: [
      info('When to water the pitch', '8', ''),
      info('Which gate to open next', '22', ''),
      info('Drawing the offside line', '38', ''),
      info('Resting a tired player', '58', ''),
      info('Who you are, from your face', '76', 'facial recognition at the gate'),
      info('Releasing a 12-year-old from the academy', '94', 'a decision about someone’s future')
    ],
    progressive: true,
    body: 'The positions are arguable. That is the activity.',
    notes: 'BEAT 25 · 3 MINUTES. STAND ON THE LINE. One wall "AI can decide", the opposite wall "a person must decide". Read each item, students move, then click to show where we put it.\n\nAsk: "Which one did we put in the wrong place?" The academy is the one to land.'
  },
  {
    type: 'compare',
    title: 'Myth or fact?',
    subtitle: 'Myth or fact? | The facts',
    bullets: [
      myth('AI picks the Premier League teams', 'Managers pick the team. AI gives them evidence.'),
      myth('The supercomputer knows who will win', 'It gives chances, not answers. Upsets still happen.'),
      myth('Football clubs hire physicists', 'Liverpool’s research team includes physicists and an astrophysicist.', 'Fact'),
      myth('Signing a superstar always makes a team better', 'An AI model predicted Harry Kane would not improve Bayern. Their goal difference fell.')
    ],
    progressive: true,
    notes: 'Row 4 is from Sky Sports (February 2025): PLAIER’s model predicted Bayern’s record signing would not have a positive effect, and Bayern’s goal difference was 49 with him against 54 the season before (PLAIER’s figures). It is no slight on Kane: football is a team game.\n\nBEAT 26 · 2 MINUTES. Thumbs up for true, down for false, then click for the fact.\n\nRow 3 is a good one to argue: if the computer says 70%, who is surprised when the 30% happens?'
  },
  {
    type: 'quote',
    body: 'I grew up being really bad at most team sports. I still am.',
    subtitle: 'William Spearman, lead data scientist, Liverpool',
    notes: 'BEAT 27 · 1 MINUTE. You do not have to be good at football to work in football. Spearman did a physics PhD, got hooked on sports data watching American football, and now works in Liverpool’s six-person research team on transfers and tactics. His best-known idea is “pitch control”: which areas of the pitch a team controls, so that a pass there would reach them, and how runs create and close space.\n\nSource: the Mirror (21 September 2022), quoting his interview with Liverpoolfc.com.\n\nAsk: "What are you really good at that is not football?"'
  },
  {
    type: 'cards',
    title: 'Which job would you want?',
    subtitle: 'Four corners · the people behind the manager · 2 minutes',
    bullets: [
      card('Data scientist', 'Turns tracking data into tactics.'),
      card('Machine learning engineer', 'Builds the models that flag injuries.'),
      card('Video analyst', 'Breaks down every match, frame by frame.'),
      card('Head of AI', 'Reading made the first one at an English club.')
    ],
    notes: 'BEAT 28 · 2 MINUTES. From the AI Awareness Day post: "The sports industry is hungry for tech talent."\n\nEveryone picks a corner. Ask: "What do you already do that is a start? Gaming, maths, coding, stats, editing videos?" Link to Youth Charter’s digital tech pathway.\n\nHead of AI is a real job title now: BBC Sport (March 2026) reported that Reading, in League One, appointed Stuart Fenton as the first head of AI at an English club, working on recruitment, tactics and the business. Reading point to Brentford and Brighton as clubs that climbed using data.'
  },
  {
    type: 'journey',
    title: 'Three rules for the AI stadium',
    subtitle: 'In the order you would use them',
    bullets: [
      card('Ask what it collects', 'Tickets, faces, bodies, clicks: know what is being measured.'),
      card('Keep people in the big calls', 'AI can measure. People decide what is fair.'),
      card('Your data, your say', 'You can ask a club or app what it holds about you.')
    ],
    progressive: true,
    notes: 'BEAT 29 · 1 MINUTE. One rule per click.\n\nRule 3 is real: under UK data protection law anyone can ask an organisation for the personal data it holds about them.'
  },
  {
    type: 'keyfact',
    subtitle: 'Your move · 1 minute',
    title: 'Pick your zone',
    body: 'Choose one zone on the map. Decide one thing you would change about how AI is used there, or one job there you would like to do.',
    bullets: ['My zone and my move:'],
    notes: 'BEAT 30 · 1 MINUTE. Everyone decides. Two or three volunteers share. Collect the zones: the most popular one is your next session.'
  },
  {
    type: 'statement',
    body: 'The future of football isn’t just played. It’s programmed.',
    subtitle: 'AI Awareness Day',
    notes: 'CLOSE. The line from the AI Awareness Day post. Leave it up as they go: "Your passion for coding, gaming, maths or statistics could help your favourite club win its next trophy." And the other half, from Liverpool: the club still needs people who understand people.'
  }
];

function build(id, title, slides, theme, visible = 10) {
  const authored = slides.map((slide, index) => ({
    id: `${id}-${String(index).padStart(2, '0')}`,
    ...slide,
    ...(!slide.hidden && COMPOSITION[slide.type] ? { design: { composition: COMPOSITION[slide.type] } } : {})
  }));
  const deck = SF.normalizeDeck({
    id,
    title,
    theme,
    libraryGroup: 'youth-charter',
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
  if (deck.slides.filter(s => !s.hidden).length !== visible) throw new Error(`${title}: wants ${visible} visible slides`);
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

const LESSONS = [
  { key: 'yc-soccerwise-ai', file: 'Soccerwise_AI.sfdeck.json', icon: '⚽', slides: soccerwise, theme: 'youth-charter-matchday',
    title: 'Soccerwise · Would you trust a robot referee?',
    blurb: 'Ten minutes on fairness and AI in football: the robot referee, fair play online and who gets to be a hero. Hands up and four corners, no phones.' },
  { key: 'yc-youthwise-ai', file: 'Youthwise_AI.sfdeck.json', icon: '✊', slides: youthwise, theme: 'youth-charter',
    title: 'Youthwise · Will AI make your future fairer?',
    blurb: 'Ten minutes on AI and a fair future: jobs, the feed and who gets heard. Hands up and four corners, no phones.' },
  { key: 'yc-premier-league-ai', file: 'PremierLeague_AI.sfdeck.json', icon: '🏟', slides: premierLeague, theme: 'youth-charter-matchday', visible: 32, minutes: 40,
    title: 'The AI stadium · AI in the Premier League',
    blurb: 'Forty minutes on the whole club: what AI is and its kinds, then a live map of a Premier League ground, a slide per zone, from the turnstiles to the TV gantry, the training ground and fans at home. Hands up and four corners, no phones.' }
];
const outputs = LESSONS.map(L => [L.file, build(L.key.replace(/^yc-/, '') + '-2026', L.title, L.slides, L.theme, L.visible)]);
for (const [file, deck] of outputs) {
  const target = path.join(__dirname, '..', 'output', file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(deck, null, 2) + '\n');
  console.log(`${target} (${deck.slides.length} slides, ${deck.slides.filter(s => !s.hidden).length} shown)`);
}

/* Built in: the app's lesson list and the Library's Youth Charter folder. The
   lessons carry the authored slides; the app gives each its own ids. */
const lessons = LESSONS.map((L, i) => {
  const deck = outputs[i][1];
  return {
    key: L.key, title: L.title, blurb: L.blurb, icon: L.icon, kind: 'lecture', minutes: L.minutes || 10,
    theme: deck.theme, libraryGroup: 'youth-charter', org: deck.org, closingNote: deck.closingNote,
    showSlideNumbers: deck.showSlideNumbers, logo: deck.logo, logoOn: deck.logoOn, logoSize: deck.logoSize, games: [],
    slides: L.slides.map(slide => (!slide.hidden && COMPOSITION[slide.type] ? { ...slide, design: { composition: COMPOSITION[slide.type] } } : slide))
  };
});
const builtIn = path.join(__dirname, '..', 'js', 'lessons-youth-charter.js');
fs.writeFileSync(builtIn, `/* Generated by tools/build-youth-charter-ai.js: do not edit by hand, rebuild instead.
   Youth Charter's lessons, built into SlideForge's lesson list and seeded into
   the Youth Charter folder of every browser's Library. Loaded after js/lessons.js,
   whose LESSONS and LIBRARY_SEED_KEYS it extends. */
(function (root) {
  'use strict';
  var SF = root.SF;
  if (!SF || !SF.LESSONS || !SF.LIBRARY_SEED_KEYS) return;
  var lessons = ${JSON.stringify(lessons)};
  lessons.forEach(function (lesson) {
    if (!SF.LESSONS.some(function (l) { return l.key === lesson.key; })) SF.LESSONS.push(lesson);
    SF.LIBRARY_SEED_KEYS[lesson.key] = 'youth-charter';
  });
})(typeof window !== 'undefined' ? window : globalThis);
`);
console.log(`${path.relative(path.join(__dirname, '..'), builtIn)} (${lessons.length} lessons, Youth Charter folder)`);
