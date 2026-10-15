#!/usr/bin/env node
'use strict';

/* Build "Studio 90: designing the modern game", a 70-minute university
 * session on AI in football: how the game has been remade (the ball, the
 * offside line, the referee, the pitch, the boards, the screen), the line every
 * new job sits on (capture, engineer, model, design, decide), a job atlas of
 * five studios, a crit on authorship and data, and a studio brief where teams
 * design a football job for 2035 and pin it up.
 *
 * It runs like an art and design studio session: sheets, a wall chart, an
 * atlas, a crit, a brief. The posters are drawn here (tools/football-studio/
 * art.js) into assets/football-studio/. Theme: Studio 90 · Riso ink (src/themes.js; the lab's palette 'studio90').
 *
 * Writes output/Studio90_AI_Football.sfdeck.json (for File → Import) and
 * js/lessons-football-studio.js, which builds it into the app's lesson list
 * and seeds it into the Library's Northeastern folder. Every fact on a slide
 * names its source in the slide's notes; company figures are said as the
 * company's. */
const fs = require('node:fs');
const path = require('node:path');
const art = require('./football-studio/art.js');

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
const ASSETS = 'assets/football-studio';
const stamp = Date.parse('2026-10-15T00:00:00Z');
const info = (label, value, note) => [label, value, note].join('\t');
const card = (heading, body) => `${heading}\t${body}`;
/* A compare row is three cells: the row's own label, then one per column. */
const row = (label, left, right) => [label, left, right].join('\t');
const { ACID, CORAL, COBALT } = art.INK;

/* ------------------------------------------------------------- the posters */
const posters = {};
const poster = (name, svg) => { posters[name] = svg; return `${ASSETS}/${name}.svg`; };
/* A full-screen picture slide: the poster is the slide. */
const sheet = (name, svg, alt, notes, extra = {}) => ({
  type: 'image', title: alt.title, image: poster(name, svg), imageFit: 'cover', imageAlt: alt.alt,
  design: { capStyle: 'none' }, notes, ...extra
});

/* The five studios of the job atlas, in the order of the line. */
const STUDIOS = [
  { key: 'capture', name: 'Capture', ink: ACID, step: 'capture', title: ['Capture'],
    brief: ['The people who turn a match into data:', 'cameras, sensors, the ball itself.'],
    jobs: ['Optical tracking\noperator', 'Sports scientist\n(GPS and load)', 'Ref-cam and POV\nproducer', 'Data collector\n(event tagging)', 'Hardware and\nsensor technician'] },
  { key: 'engineer', name: 'Engineer', ink: COBALT, step: 'engineer', title: ['Engineer'],
    brief: ['The people who move and protect the data:', 'pipelines, platforms, security.'],
    jobs: ['Data engineer', 'Research engineer', 'Cybersecurity\nanalyst', 'Platform and\ncloud engineer', 'Data protection\nofficer'] },
  { key: 'model', name: 'Model', ink: CORAL, step: 'model', title: ['Model'],
    brief: ['The people who find the pattern and test the', 'future: models, simulations, forecasts.'],
    jobs: ['Data scientist', 'Tactical\nstatistician', 'Machine learning\nengineer', 'Recruitment\nanalyst', 'Head of AI'] },
  { key: 'design', name: 'Design', ink: ACID, step: 'design', title: ['Design'],
    brief: ['The people who make the data seen and felt:', 'graphics, screens, apps, the matchday itself.'],
    jobs: ['Broadcast motion\ndesigner', 'Virtual and AR\nad producer', 'Immersive venue\ndesigner', 'Fan product\ndesigner', 'Data visualisation\ndesigner'] },
  { key: 'care', name: 'Decide', ink: CORAL, step: 'decide', title: ['Decide'],
    brief: ['The people who make the call and look after', 'the humans the data is about.'],
    jobs: ['Specialist coach\n(throw-ins, set pieces)', 'Performance\npsychologist', 'Cognitive and\nneuro coach', 'AI ethics lead', 'Player data\nwelfare officer'] }
];
const STUDIO = Object.fromEntries(STUDIOS.map((s, i) => [s.key, { ...s, letter: 'ABCDE'[i] }]));

const studioCover = (key, notes) => {
  const s = STUDIO[key];
  return sheet(`studio-${s.letter.toLowerCase()}`, art.studioCard(s.letter, s),
    { title: `Studio ${s.letter} · ${s.title.join(' ')}`, alt: `Studio ${s.letter}, ${s.title.join(' ')}. ${s.brief.join(' ')}` }, notes);
};

/* --------------------------------------------------------------- the deck */
const slides = [
  {
    type: 'content',
    hidden: true,
    title: 'Teacher page',
    subtitle: 'Hidden from the room',
    bullets: [
      'Students map how AI and new technology have remade football, place the new jobs on one line from the pitch to the call, argue about authorship and data, then design a football job for 2035.',
      'About 70 minutes, with 60- and 45-minute cuts. It runs like a studio: sheets, a wall chart, an atlas, case files, a crit and a brief.',
      'No phones needed. Votes are hands up; the brief is pen and A3, or one slide per team.'
    ],
    notes:
      'RUNNING ORDER · ABOUT 70 MINUTES\n' +
      '· 00 Open studio — 6 min: cover, the claim, the session as a studio, which job is real?\n' +
      '· 01 The game, remade — 12 min: the wall chart, six moments, old game and modern game, pair talk\n' +
      '· 02 Under the hood — 7 min: the line, three things AI does, the numbers\n' +
      '· 03 The job atlas — 21 min: the atlas, five studios (cover and jobs each), case files 01 (PLAIER) and 02 (the Companion), the companies behind the jobs, how new is this job?, hybrid skills\n' +
      '· 04 The crit — 13 min: who is the author?, case file 03 (the Klopp hire), AI and people, the 90/10 debate, myth or fact, case file 04 (the clone), whose data?\n' +
      '· 05 The brief — 11 min: the brief, the poster, the crit rules, pin-up\n\n' +
      'FOR 60 MINUTES. Hide the 90/10 debate, myth or fact and "How new is this job?".\n\nFOR 45 MINUTES. Also hide "Old game, modern game", the numbers and case files 02 and 04, and give the brief 8 minutes.\n\n' +
      'THE BIG IDEA. Football is now a production: the match is captured, engineered, modelled and designed before a person makes the call. Every one of those steps is somebody’s job, and many of them are design jobs. The line (sheet 02) is the spine: the atlas, the crit and the brief all hang off it.\n\n' +
      'THE MOVE THAT MAKES IT WORK. Do not sell the technology. Every studio has a catch, and the crit is where the room argues with it.\n\n' +
      'SOURCES (also in each slide’s notes). Premier League, “Semi-automated offside technology: what you need to know” (April 2025). Adidas, the Al Rihla connected ball release (2022). CBS Sports and FIFA on referee body cameras at the Club World Cup (June 2025); IFAB on body-camera trials. Ingenia and Buro Happold on Tottenham Hotspur Stadium’s dividing pitch; The Stadium Business and ENR on the Bernabéu’s 360° screen (Daktronics). BusinessCloud (2018) on Southampton’s virtual boards (ADI and Supponor). Training Ground Guru and These Football Times on Thomas Grønnemark; Brentford FC (May 2024) on Bernardo Cueva. Leeds United’s data engineer/scientist advert (UK Sport jobs, June 2025). Business Today (24 July 2026) on Arsenal’s research engineer. BBC Sport (6 March 2026) on Reading’s head of AI. The Mirror (2022) quoting Liverpoolfc.com on William Spearman. Liverpool.com (January 2020) on the 1.3% goal probability. Google DeepMind, TacticAI (Nature Communications, March 2024). The Analyst on set-piece goals in 2025–26. BCAM on the San Mamés digital twin. World Economic Forum, The Future of Jobs Report 2025. Sky Sports, “AI revolution in football: how PLAIER is helping Premier League clubs make better decisions” (6 February 2025). Microsoft, “Premier League: transforming fan experiences” and unlocked.microsoft.com/premier-league (Microsoft’s figures). OneFootball (10 June 2026), reporting the Telegraph, on Nostrada.ai. Ulrich Lichtenthaler, “Liverpool Football Club: extending data analytics and AI with neuroscience” (23 May 2022). AI Awareness Day, “Did you know the English Premier League uses AI?” (aiawarenessday.co.uk/timeline/english-premier-league).\n\n' +
      'CHECK BEFORE YOU TEACH. Job adverts move fast: the Leeds and Arsenal adverts are cited as reported, and may have closed. Swap in a current advert from Jobs In Football or Training Ground Guru if you have one.'
  },

  /* ---------------------------------------------------------- 00 OPEN STUDIO */
  sheet('cover', art.cover(), { title: 'Studio 90', alt: 'Studio 90: designing the modern game. AI, football and the jobs nobody had in 2015. A pitch in acid line-work with a ball ringed by sensor waves.' },
    'COVER · up as they come in. Ask the door: "Name a job at a football club that is not player, manager or referee." Keep a list on the board; come back to it at the atlas.'),
  {
    type: 'statement',
    body: 'In 2018 a club hired a man to teach its players how to throw the ball in.',
    subtitle: 'Liverpool FC · the weirdest job in football',
    design: { words: 'rise', wordStagger: 'wave' },
    notes: 'OPEN · 1 MINUTE. Thomas Grønnemark, a Danish throw-in specialist, was hired by Jürgen Klopp in July 2018, reportedly the Premier League’s first dedicated throw-in coach. He called it “the weirdest job in football”. Liverpool had been 18th of 20 for keeping the ball from a throw-in under pressure in 2017–18.\n\nSources: These Football Times (March 2020), Training Ground Guru, Liverpoolfc.com.\n\nAsk: "Weird, or just new? What makes a job look weird?" The answer we want by the end: it looks weird because nobody had measured throw-ins before. Data makes new jobs.'
  },
  {
    type: 'cards',
    title: 'Today runs like a studio',
    subtitle: 'Five sheets on the wall, in four moves',
    bullets: [
      card('01 · The game, remade', 'A wall chart of how football changed, and six moments up close.'),
      card('02 · Under the hood', 'One line from the pitch to the call, and what AI does on it.'),
      card('03 · The job atlas', 'Five studios, twenty-five jobs, and where you fit.'),
      card('04–05 · Crit and brief', 'We argue about authorship and data, then your team designs a football job for 2035.')
    ],
    progressive: true,
    notes: 'OPEN · 1 MINUTE. Frame the hour as a studio session, not a lecture: we build a wall, then crit it. The output is theirs: a job poster per team.\n\nIf the room is a design course, say it plainly: half the jobs on the atlas are design jobs.'
  },
  {
    type: 'cards',
    title: 'Which of these is a real football job?',
    subtitle: 'Hands up for each · 2 minutes',
    bullets: [
      card('Throw-in coach', 'Teaches players to use a throw-in as an attack.'),
      card('Tactical statistician', 'Turns set pieces into a science.'),
      card('Research engineer', 'Builds AI tools for the first-team analysts.'),
      card('Head of AI', 'Runs AI across recruitment, tactics and the business.')
    ],
    notes: 'OPEN · 2 MINUTES. Read each card, hands up if they think it is real. Then the next slide: all four are.\n\nThrow-in coach: Thomas Grønnemark, Liverpool, 2018. Tactical statistician: Bernardo Cueva’s title at Brentford, where he ran set pieces, before he left for Chelsea in 2024 (Brentford FC, May 2024). Research engineer: Arsenal advertised one for its men’s first-team analysis in July 2026 (Business Today, 24 July 2026). Head of AI: Reading appointed Stuart Fenton, reported as the first at an English club (BBC Sport, 6 March 2026).'
  },
  {
    type: 'statement',
    body: 'All four are real. None of them was a job in 2010.',
    subtitle: 'The reveal',
    design: { words: 'rise', wordStagger: 'one' },
    notes: 'OPEN · 30 SECONDS. Let it land. Then: "So how did football get here? Sheet one."'
  },

  /* ------------------------------------------------------- 01 THE GAME, REMADE */
  sheet('part-01', art.section(1, ['The game,', 'remade'], ['How a 150-year-old game became', 'a live data production.'], art.MOTIF.remade, ACID),
    { title: '01 · The game, remade', alt: 'Part 01. The game, remade: how a 150-year-old game became a live data production.' },
    'PART 01 · 12 MINUTES. The wall chart, then six moments up close: the ball, the line, the referee, the pitch, the boards, the screen.'),
  sheet('timeline', art.timeline([
    { year: 2013, label: ['Goal-line', 'technology in', 'the Premier League'] },
    { year: 2015, label: ['FIFA lets players', 'wear GPS vests', 'in matches'] },
    { year: 2018, label: ['A throw-in coach;', 'virtual ad boards', 'at Southampton'] },
    { year: 2019, label: ['VAR in the Premier', 'League; Spurs’ new', 'stadium opens'] },
    { year: 2022, label: ['World Cup ball', 'carries a sensor;', 'semi-auto offside'] },
    { year: 2024, label: ['TacticAI:', 'DeepMind and', 'Liverpool'] },
    { year: 2025, label: ['Semi-auto offside', 'in the Premier League;', 'ref cams at the CWC'] },
    { year: 2026, label: ['Reading’s head', 'of AI; Arsenal’s', 'research engineer'], nudge: -20 }
  ]), { title: 'The game, remade · the wall chart', alt: 'A timeline from 2013 to 2026: goal-line technology; GPS vests allowed; a throw-in coach and virtual ad boards; VAR and Spurs’ stadium; the sensor ball and semi-automated offside at the World Cup; TacticAI; semi-automated offside in the Premier League and referee body cameras; a head of AI at Reading and Arsenal’s research engineer.' },
    'PART 01 · 2 MINUTES. THE WALL CHART. Walk it left to right, one sentence each. The pattern to point at: the early changes help the referee; the later ones are about the club, the broadcast and the fan. And the last stop is people: the newest change is the job titles.\n\n2013: Hawk-Eye goal-line technology in the Premier League from 2013–14. 2015: FIFA’s law change allowing electronic performance and tracking systems (GPS vests) in matches. 2018: Grønnemark at Liverpool; Southampton’s virtual hybrid boards (BusinessCloud, 2018). 2019: VAR in the Premier League from 2019–20; Tottenham Hotspur Stadium opened in April 2019. 2022: Adidas Al Rihla with a 500 Hz sensor, and FIFA’s semi-automated offside at Qatar 2022. 2024: TacticAI, Google DeepMind with Liverpool (Nature Communications, March 2024). 2025: semi-automated offside in the Premier League from 12 April 2025; referee body cameras at the FIFA Club World Cup, June 2025. 2026: Reading’s head of AI (BBC Sport, March 2026); Arsenal’s research engineer advert (Business Today, July 2026).\n\nAsk: "What is missing from this chart?" (Good answers: the women’s game, fans’ phones, betting, video games like EA FC that taught a generation to read stats.)'),
  sheet('moment-ball', art.moment({ sheet: 'Sheet 01a · the ball', kicker: 'Moment 1', title: ['The ball', 'is a sensor'], figure: art.FIG.ball, number: '500×', unit: ['a second, the World Cup ball', 'reports its own movement'], tag: 'Adidas, 2022', ink: ACID }),
    { title: 'Moment 1 · The ball is a sensor', alt: 'The ball is a sensor: a ball ringed by sensor waves with a motion unit at its centre. 500 times a second, the World Cup ball reports its own movement.' },
    'MOMENT 1 · 1 MINUTE. Adidas’s Al Rihla, the 2022 World Cup ball, held a 500 Hz inertial measurement unit (a motion sensor) suspended at its centre. It reported every touch to the video match officials within seconds, and with player tracking it fed FIFA’s semi-automated offside. Built with FIFA and KINEXON. The balls had to be charged before a match.\n\nSource: Adidas news release, “adidas reveals the first FIFA World Cup official match ball featuring connected ball technology” (2022). The “no change in performance” claim is Adidas’s.\n\nAsk: "If the ball is a device, who designs it: a kit designer or an electronics engineer?" (Both. That is the point.)'),
  sheet('moment-offside', art.moment({ sheet: 'Sheet 01b · the line', kicker: 'Moment 2', title: ['The offside', 'line is a', 'render'], figure: art.FIG.offside, number: '30', unit: ['cameras in each ground, some', 'filming at 100 frames a second'], tag: 'Premier League, 2025', ink: CORAL }),
    { title: 'Moment 2 · The offside line is a render', alt: 'The offside line is a render: skeleton figures with joint points on a pitch and a red offside line. Up to 30 cameras in each ground, some filming at 100 frames a second.' },
    'MOMENT 2 · 2 MINUTES. Semi-automated offside technology began in the Premier League on 12 April 2025, after the FA Cup. Up to 30 cameras in each ground, several at 100 frames a second, twice broadcast rate, track the players’ bodies. The system suggests the kick point and draws the lines; the VAR checks and approves; then a 3D decision visual of the players, in their kits, goes to the big screen and to TV. Built with PGMOL and Genius Sports. The league says it makes decisions faster and more consistent, not more accurate.\n\nSource: Premier League, “Semi-automated offside technology: what you need to know” (April 2025). AI Awareness Day’s Premier League page adds the moment that makes it real: a 95th-minute West Ham equaliser against Arsenal was checked across camera angles in seconds, a foul on David Raya was found, and Arsenal’s 1-0 win stood.\n\nTHE DESIGN POINT. Somebody designed those 3D players: their proportions, the camera angle, the red and green lines, how long the replay holds. That picture is the decision fans see. Ask: "Is that a referee’s job or a designer’s?"'),
  sheet('moment-refcam', art.moment({ sheet: 'Sheet 01c · the referee', kicker: 'Moment 3', title: ['The referee', 'is a camera'], figure: art.FIG.refcam, number: '2025', unit: ['the first FIFA tournament to', 'put body cameras on referees'], tag: 'FIFA · IFAB', ink: ACID }),
    { title: 'Moment 3 · The referee is a camera', alt: 'The referee is a camera: a recording frame showing the referee’s point of view. 2025 was the first FIFA tournament to put body cameras on referees.' },
    'MOMENT 3 · 1 MINUTE. At the FIFA Club World Cup in the USA (June–July 2025), referees wore a small camera on their headset. The footage went into broadcasts after a check, mainly for non-controversial moments, and into referee training. Pierluigi Collina said it went “beyond our expectations”. The IFAB then opened body-camera trials to competitions worldwide, but FIFA does not pay for them.\n\nSources: CBS Sports (June 2025); Soccerway and AFP reporting Collina; IFAB trials page.\n\nAsk: "Who chooses which referee clip you see? That is an editor’s job."'),
  sheet('moment-pitch', art.moment({ sheet: 'Sheet 01d · the pitch', kicker: 'Moment 4', title: ['The pitch', 'moves'], figure: art.FIG.pitch, number: '3', unit: ['pieces: Spurs’ grass splits and', 'rolls away under the South Stand'], tag: 'Ingenia · Buro Happold', ink: ACID }),
    { title: 'Moment 4 · The pitch moves', alt: 'The pitch moves: a grass pitch split into three sections sliding away to reveal artificial turf below. Three pieces: Spurs’ grass splits and rolls away under the South Stand.' },
    'MOMENT 4 · 1 MINUTE. Tottenham Hotspur Stadium (opened 2019, designed by Populous) has the world’s first dividing retractable pitch: the grass splits into three trays and rolls under the South Stand, revealing an NFL artificial pitch below. It was the feature that won the club its NFL deal. The touchline and tunnel ramps rise and fall to meet either surface.\n\nSources: Ingenia, “Tottenham Hotspur Stadium: the football pitch in three pieces”; Buro Happold; Dezeen.\n\nThe point: a stadium is now a venue that is football one night and a concert or NFL game the next. That makes jobs: venue producers, event designers, turf scientists.'),
  sheet('moment-boards', art.moment({ sheet: 'Sheet 01e · the boards', kicker: 'Moment 5', title: ['The board', 'you see isn’t', 'the board', 'they see'], figure: art.FIG.boards, tag: 'BusinessCloud, 2018', ink: CORAL }),
    { title: 'Moment 5 · The board you see isn’t the board they see', alt: 'The board you see isn’t the board they see: three versions of one advertising board, one for the ground, one for TV in Germany, one for TV in Spain.' },
    'MOMENT 5 · 1 MINUTE. Virtual advertising: fans in the ground see one advert on the pitch-side boards, and TV viewers in each country see a different one, laid over the picture so players still run in front of it. Southampton installed ADI and Supponor’s “Virtual Hybrid” boards in 2018; the Bundesliga and LaLiga have used it for international broadcasts. One board, sold many times.\n\nSources: BusinessCloud, “Southampton FC signs revolutionary advertising deal” (2018); Inside World Football on the Bundesliga.\n\nAsk: "If every country sees a different match, what is the real match?"'),
  sheet('moment-screen', art.moment({ sheet: 'Sheet 01f · the screen', kicker: 'Moment 6', title: ['The roof', 'is a screen'], figure: art.FIG.screen, number: '360°', unit: ['of LED screen ringing the pitch', 'inside the new Bernabéu'], tag: 'Daktronics · ENR, 2025', ink: COBALT }),
    { title: 'Moment 6 · The roof is a screen', alt: 'The roof is a screen: a ring of LED screen hanging above a pitch. 360 degrees of LED screen ringing the pitch inside the new Bernabéu.' },
    'MOMENT 6 · 1 MINUTE. The rebuilt Santiago Bernabéu in Madrid has a 360° video scoreboard hanging from the roof: 18 LED screens, part of over 3,700 square metres of LED supplied by Daktronics, and a retractable roof and pitch for concerts. ENR named it a 2025 Global Best Project.\n\nSources: The Stadium Business (April 2022) on the Daktronics deal; ENR, 2025 Global Best Projects.\n\nThe design point: 3,700 square metres of screen needs content every second of a matchday. Somebody designs it: motion designers, live graphics operators, creative directors. That is a studio inside a stadium.'),
  {
    type: 'compare',
    title: 'The old game and the modern game',
    subtitle: 'Old game | Modern game',
    bullets: [
      row('The ball', 'Leather and air.', 'A sensor reporting 500 times a second.'),
      row('Offside', 'A linesman’s eye.', 'Thirty cameras, a skeleton and a 3D replay.'),
      row('The referee', 'Heard, never seen from inside.', 'A camera on the headset.'),
      row('The pitch', 'Grass, for football only.', 'Grass that rolls away for the NFL.'),
      row('The boards', 'One advert for everyone.', 'A different advert in every country.'),
      row('The coach', 'A manager and an assistant.', 'Specialists for throw-ins, set pieces and the mind.')
    ],
    progressive: true,
    notes: 'PART 01 · 2 MINUTES. One row per click. On each, ask: "Who has a new job because of this change?" Write the answers on the board under the cover list: tracking operator, ball electronics, broadcast designer, POV producer, venue producer, virtual ad producer, specialist coach.'
  },
  {
    type: 'statement',
    body: 'Which change made football better to watch? Which made it worse?',
    subtitle: 'Pair talk · 2 minutes',
    notes: 'PART 01 · 2 MINUTES. Pairs pick one of each from the six moments. Take three pairs.\n\nPush them: "Better for whom: the fan in the ground, the fan on TV abroad, the player, the club’s finance director?" The same change can be all four.'
  },

  /* ------------------------------------------------------- 02 UNDER THE HOOD */
  sheet('part-02', art.section(2, ['Under', 'the hood'], ['One line from the thing that happened', 'to the call a person makes.'], art.MOTIF.hood, COBALT),
    { title: '02 · Under the hood', alt: 'Part 02. Under the hood: one line from the thing that happened to the call a person makes.' },
    'PART 02 · 7 MINUTES. The line every job sits on, what AI does on it, and three numbers.'),
  sheet('pipeline', art.pipeline([
    { name: 'Capture', ink: ACID, what: ['Cameras, sensors', 'and the ball turn', 'the match into data.'], example: '30 cameras · 500 Hz' },
    { name: 'Engineer', ink: COBALT, what: ['Pipelines clean,', 'join, store and', 'protect it.'], example: 'tracking + event + GPS' },
    { name: 'Model', ink: CORAL, what: ['AI finds the pattern', 'and tests the future.'], example: 'pitch control · 1.3%' },
    { name: 'Design', ink: ACID, what: ['Graphics, apps and', 'screens make it', 'seen and felt.'], example: '3D replay · 360° screen' },
    { name: 'Decide', ink: CORAL, what: ['A person makes', 'the call, and lives', 'with it.'], example: 'VAR · coach · doctor' }
  ]), { title: 'From the pitch to the call', alt: 'Five stages from the pitch to the call: capture, engineer, model, design, decide. Every new job in football sits somewhere on this line.' },
    'PART 02 · 2 MINUTES. THE SPINE OF THE SESSION. Take one example along the whole line: an offside. Capture: thirty cameras track every player’s joints. Engineer: the frames are synced with the ball’s touch data. Model: computer vision finds the bodies and the kick point. Design: a 3D picture of the decision. Decide: the VAR approves it, and the referee gives it.\n\nThen ask: "Where does the designer sit, and why is it before the decision, not after?" Because the picture shapes how the call is seen and checked.\n\nThis is a simplification: real clubs loop back (a coach’s question changes what is captured next).'),
  {
    type: 'cards',
    title: 'Three things AI does in football',
    subtitle: 'See · Predict · Make',
    bullets: [
      card('It sees', 'Computer vision finds players, joints and the ball in video. The offside skeleton, the highlight clipper.'),
      card('It predicts', 'Machine learning and simulation turn past matches into chances: an injury risk, a goal probability, a season played 10,000 times.'),
      card('It makes', 'Generative AI writes, draws and talks: match reports, fan chatbots, kit concepts, a highlight voiced in your language.')
    ],
    progressive: true,
    notes: 'PART 02 · 2 MINUTES. Short for a university room; they will know the terms. Make one link per card to the line: seeing is capture into model; predicting is model; making is design.\n\nTacticAI (Google DeepMind with Liverpool, Nature Communications, March 2024) predicted corner-kick outcomes and suggested player positions; Liverpool’s experts preferred its suggestions to existing tactics about 90% of the time in the study. Name it as the study’s finding. The Opta supercomputer plays each Premier League season 10,000 times to forecast the title and relegation (AI Awareness Day’s Premier League page).\n\nAsk: "Which of the three would a design studio use most?" (Make, then see.)'
  },
  {
    type: 'stats',
    title: 'The numbers behind the modern game',
    subtitle: 'Did you know?',
    bullets: [
      info('Chance of a goal in the next 15 seconds', '1.3%', 'Liverpool’s model, from where the ball and players are'),
      info('Premier League goals from set pieces, 2025–26', '27.4%', 'not counting penalties: the second-highest share in 34 seasons'),
      info('Liverpool’s league goals from throw-in situations, 2019–20', '14 of 85', 'the season after the throw-in coach arrived')
    ],
    body: 'Sources: Liverpool.com (January 2020) · The Analyst (Opta) · Training Ground Guru',
    notes: 'PART 02 · 2 MINUTES. Three numbers, one argument: measuring a part of the game makes a job for it.\n\n1.3%: Liverpool’s data scientist Tim Waskett showed at the Royal Institution Christmas Lectures how every moment becomes a goal probability (Liverpool.com, January 2020). 27.4%: The Analyst’s figure for non-penalty set-piece goals in the 2025–26 Premier League, the second-highest in the competition’s history. That is why clubs hire set-piece coaches. 14 of 85: the figure most often cited for Grønnemark’s impact; do not credit it all to him.\n\nAsk: "Which part of the game has nobody measured yet?" (Good answers: communication between players, the crowd’s effect, a goalkeeper’s voice.) That is a job waiting to exist; hold it for the brief.'
  },

  /* --------------------------------------------------------- 03 THE JOB ATLAS */
  sheet('part-03', art.section(3, ['The job', 'atlas'], ['Five studios, twenty-five jobs,', 'and where you fit.'], art.MOTIF.atlas, CORAL),
    { title: '03 · The job atlas', alt: 'Part 03. The job atlas: five studios, twenty-five jobs, and where you fit.' },
    'PART 03 · 17 MINUTES. The heart of the session. The atlas, then each studio: its cover, its jobs and a real case.'),
  sheet('atlas', art.atlas(STUDIOS), { title: 'The job atlas', alt: `Five studios pinned up as cards. ${STUDIOS.map((s, i) => `Studio ${'ABCDE'[i]}, ${s.name}: ${s.jobs.map(j => j.replace('\n', ' ')).join(', ')}.`).join(' ')}` },
    'PART 03 · 2 MINUTES. THE ATLAS. Five studios, one per step on the line. Twenty-five jobs; some are long-standing but changed by AI (sports scientist, data protection officer), some are new (research engineer, head of AI, virtual ad producer).\n\nTick off the cover list from the start: which jobs did the room already name, and which are new to them?\n\nSay what the atlas is: our grouping, built from real adverts and reports, not an official list. Studios overlap; a data visualisation designer sits between Model and Design.'),

  studioCover('capture', 'STUDIO A · 30 SECONDS. Capture: the people who turn a match into data.'),
  {
    type: 'cards',
    title: 'Studio A · Capture',
    subtitle: 'Turning a match into data',
    bullets: [
      card('Optical tracking operator', 'Runs the camera rigs that track every player, 25 to 100 times a second, for offside and for the analysts.'),
      card('Sports scientist', 'Reads GPS vests and heart rates to manage training load. An old job, rebuilt by sensors.'),
      card('Ref-cam and POV producer', 'Turns body-camera footage into broadcast and training clips, and decides what is shown.'),
      card('Data collector', 'Tags every pass, tackle and shot by hand and with AI help, for data companies and clubs.')
    ],
    progressive: true,
    notes: 'STUDIO A · 2 MINUTES. One card per click. For each: "What skill does this need that the machine does not have?"\n\nThe tracking operator: semi-automated offside runs on up to 30 cameras per ground (Premier League, 2025). The sports scientist: FIFA allowed GPS and tracking systems in matches from 2015; sports science is now in every Premier League club, and academy and first-team sports scientist roles are advertised throughout the leagues. Data collectors: data companies employ people to tag event data, increasingly checking an AI’s first pass rather than tagging from scratch. That is how many analysts start.'
  },
  studioCover('engineer', 'STUDIO B · 30 SECONDS. Engineer: the people who move and protect the data.'),
  {
    type: 'cards',
    title: 'Studio B · Engineer',
    subtitle: 'Moving and protecting the data',
    bullets: [
      card('Data engineer', 'Builds the pipelines that join tracking, event, GPS and medical data. Leeds United advertised one in 2025, up to £55,000.'),
      card('Research engineer', 'Turns AI research into tools coaches use every day. Arsenal advertised one in 2026: Python, SQL, TypeScript, PyTorch.'),
      card('Cybersecurity analyst', 'Protects a club’s data, from medical records to transfer plans, from attack and leaks.'),
      card('Data protection officer', 'Makes sure fans’ and players’ personal data is used within the law.')
    ],
    progressive: true,
    notes: 'STUDIO B · 2 MINUTES. These are the jobs a computing or data student could apply for this year.\n\nLeeds United’s data engineer/scientist advert (UK Sport jobs board, June 2025): building pipelines for data science across performance, medicine and recruitment, up to £55,000. Arsenal’s research engineer (Business Today, 24 July 2026): joining the data analytics team to work with the men’s first-team analysis department; to “turn advanced AI research into tools” the coaching staff use daily; asking for Python, SQL, JavaScript or TypeScript, and deep learning frameworks such as PyTorch, JAX or TensorFlow, plus an understanding of football. Brentford and Cardiff Metropolitan University funded a PhD studentship in Premier League performance data (2026).\n\nAsk: "What does ‘an understanding of football’ add to a job advert for an engineer?"'
  },
  studioCover('model', 'STUDIO C · 30 SECONDS. Model: the people who find the pattern and test the future.'),
  {
    type: 'cards',
    title: 'Studio C · Model',
    subtitle: 'Finding the pattern, testing the future',
    bullets: [
      card('Data scientist', 'Builds models of space, passes and chances. Liverpool’s research team was led by physicists.'),
      card('Tactical statistician', 'Brentford’s title for the man who made their set pieces a science, before Chelsea hired him in 2024.'),
      card('Recruitment analyst', 'Searches the world’s leagues in data before a scout ever travels.'),
      card('Head of AI', 'Runs AI across recruitment, tactics and the business. Reading made one in 2026.')
    ],
    progressive: true,
    notes: 'STUDIO C · 2 MINUTES. William Spearman, Liverpool’s lead data scientist, has a physics PhD and worked at CERN; his best-known idea is pitch control, which parts of the pitch a team controls. He said: “I grew up being really bad at most team sports. I still am.” (The Mirror, September 2022, quoting Liverpoolfc.com.) You do not have to be good at football to work in it.\n\nBernardo Cueva: Brentford’s first-team tactical statistician, whose work was largely set pieces; he left for Chelsea to build a set-piece department (Brentford FC, May 2024). Stuart Fenton: Reading’s head of AI, working on recruitment, tactics and the business; Reading say AI complements the team and results are down to the coaches (BBC Sport, 6 March 2026).'
  },
  sheet('case-plaier', art.caseFile({ n: 1, kicker: 'Model · PLAIER', title: ['The season,', 'played', '100,000 times'], ink: CORAL,
    facts: [['100+', 'leagues in the company’s football database'], ['100,000', ['times it plays out a signing’s season,', '38 games against each opponent']], ['4', 'Premier League clubs working with it']],
    job: 'Model builder at an AI supplier', tag: 'Sky Sports, Feb 2025' }),
    { title: 'Case file 01 · PLAIER', alt: 'Case file 01, PLAIER: the season, played 100,000 times. Over 100 leagues in its database; a signing’s season simulated 100,000 times; four Premier League clubs. The job it shows: model builder at an AI supplier.' },
    'CASE FILE 01 · 2 MINUTES. From Sky Sports, “AI revolution in football: how PLAIER is helping Premier League clubs make better decisions” (Adam Bate, 6 February 2025). PLAIER, co-founded by Jan Wendt, builds models from event, injury and salary data, and says it has the largest football database, over 100 leagues. It works with four Premier League clubs and about ten times as many worldwide. Its most-used tool is a player impact calculator: swap one player for another and see the likely change in goal difference. For a proposed signing it plays 38 games against each Premier League team 100,000 times. These are the company’s own claims; say so.\n\nThe headline case: its models said Harry Kane would not improve Bayern Munich, and Bayern’s goal difference went from 54 to 49 with him (PLAIER’s figures). AI Awareness Day’s Premier League page adds that PLAIER turns scouting metrics into written, natural-language scouting reports.\n\nAsk: "Some clubs use it as a filter, some as a sense-check, and the most advanced use its recommendations directly. Which would you trust, and who signs off?"'),
  studioCover('design', 'STUDIO D · 30 SECONDS. Design: the people who make the data seen and felt. For an art and design room, this is the studio to stay in longest.'),
  {
    type: 'cards',
    title: 'Studio D · Design',
    subtitle: 'Making the data seen and felt',
    bullets: [
      card('Broadcast motion designer', 'Designs the 3D offside replay, the live stats and the graphics a billion people watch.'),
      card('Virtual and AR ad producer', 'Makes one pitch-side board show a different advert in every country, and still look real.'),
      card('Immersive venue designer', 'Fills a 360° roof screen, the lights and the sound, and designs the matchday as an experience.'),
      card('Data visualisation designer', 'Turns a model into a picture a coach reads in ten seconds at half-time.')
    ],
    progressive: true,
    notes: 'STUDIO D · 3 MINUTES. THE ART-STUDIO STUDIO. Every moment in part 01 ended at a picture: the 3D replay, the virtual board, the 360° screen, the referee’s POV. Each picture is a design brief.\n\nThe broadcast motion designer: the semi-automated offside decision visual is generated and sent to the big screen and broadcasters (Premier League, 2025). Somebody sets how it looks. The virtual ad producer: the overlay has to respond to light and be hidden by passing players to look real (BusinessCloud, 2018). The immersive venue designer: 3,700 m² of LED at the Bernabéu (Daktronics). Also on the atlas, the fan product designer: the club app, the AI chatbot and the second screen; Microsoft and the Premier League built an AI Companion for fans (Microsoft’s own figures, 2026). The data visualisation designer: a coach at half-time has minutes, not an hour.\n\nGenerative AI is now in this studio too: concept art for kits and campaigns, auto-cut highlights, translated commentary. Ask: "Which part of a designer’s job does generative AI take, and which part does it make more valuable?"'
  },
  sheet('case-companion', art.caseFile({ n: 2, kicker: 'Design · Premier League Companion', title: ['A chatbot', 'that knows', '30 seasons'], ink: ACID,
    facts: [['30', 'seasons of stats behind every answer'], ['300,000', 'articles and 9,000 videos turned into content'], ['60m', ['fans in its first two months,', 'Microsoft’s own figure']]],
    job: 'Conversational and fan product designer', tag: 'Microsoft · Premier League' }),
    { title: 'Case file 02 · The Premier League Companion', alt: 'Case file 02, the Premier League Companion: a chatbot that knows 30 seasons. 30 seasons of stats; 300,000 articles and 9,000 videos; 60 million fans in its first two months, Microsoft’s figure. The job it shows: conversational and fan product designer.' },
    'CASE FILE 02 · 2 MINUTES. From Microsoft’s customer story, “Premier League: transforming fan experiences”, and its Premier League page (unlocked.microsoft.com/premier-league). The Premier League Companion is a conversational AI assistant built on Microsoft Foundry and Azure: it reasons over 30 seasons of history and stats, 300,000 articles, 9,000 videos and live data from 380 matches a season, and answers each fan in the way they follow the game. A Fantasy Premier League Companion gives managers personalised gameweek advice. Microsoft says 60 million fans used it in its first two months and engagement on the league’s app and site rose 20% year on year: the company’s figures. The league’s Chris Archer, Director of Digital Products & Technology, calls it a multi-agent AI system; Will Brass, Chief Commercial Officer, calls it a storytelling platform for 1.8 billion fans in 189 countries.\n\nTHE DESIGN POINT. Somebody decides how the Companion speaks, what it will not answer, and what a fan sees first. That is conversation design, a design job that barely existed before chatbots.\n\nAsk: "Brass calls it a storytelling platform. Who writes the story when the AI writes the words?"'),
  studioCover('care', 'STUDIO E · 30 SECONDS. Decide and care: the people who make the call and look after the humans the data is about.'),
  {
    type: 'cards',
    title: 'Studio E · Decide & care',
    subtitle: 'Making the call, looking after people',
    bullets: [
      card('Specialist coach', 'Throw-ins, set pieces, kicking, the goalkeeper’s feet: a coach for each part data can measure.'),
      card('Performance psychologist', 'Works on pressure, focus and confidence. Clubs now advertise these roles at first-team and academy level.'),
      card('Cognitive and neuro coach', 'Trains how fast players scan and decide. Liverpool worked with neuro11 on penalties.'),
      card('AI ethics lead', 'Asks the hard questions before a club uses a new AI, and after.')
    ],
    progressive: true,
    notes: 'STUDIO E · 2 MINUTES. The studio people forget, and the one AI makes more important, not less. The last step on the line is a person.\n\nSpecialist coaches: Grønnemark at Liverpool (2018); set-piece coaches across the Premier League as set pieces became 27.4% of goals (The Analyst, 2025–26). Performance psychologists: advertised at clubs such as Southampton and West Bromwich Albion’s academy (sport psychology job roundups). Neuro coaching: neuro11, a German neuroscience company, worked with Liverpool from 2021; Klopp credited them after the February 2022 League Cup final shootout (Ulrich Lichtenthaler, 2022). FC Copenhagen built a brain-training function led by a neuroscientist (Training Ground Guru). AI ethics lead: a role more common in big organisations than in clubs yet. Say so: it is an opening, not a crowded field.'
  },
  {
    type: 'cards',
    title: 'Many of these jobs are not at clubs',
    subtitle: 'The companies behind the modern game',
    bullets: [
      card('Genius Sports', 'Built semi-automated offside with the Premier League and PGMOL.'),
      card('KINEXON', 'Built the sensor in the World Cup ball with Adidas and FIFA.'),
      card('PLAIER', 'Sells transfer and squad models to four Premier League clubs.'),
      card('Microsoft', 'Built the Premier League Companion for 1.8 billion fans.')
    ],
    progressive: true,
    notes: 'PART 03 · 2 MINUTES. A club has a few dozen staff off the pitch; the companies that supply it employ thousands. Every moment in part 01 was built by a supplier: Genius Sports (offside, Premier League, 2025), KINEXON and Adidas (the ball, 2022), Daktronics (the Bernabéu screen), ADI and Supponor (virtual boards), Microsoft (the Companion), PLAIER (models, Sky Sports, 2025) and Nostrada.ai (the negotiation clone, case file 04).\n\nThe point for a job hunt: search the suppliers as well as the clubs. Ask: "Which of these companies would hire someone from your course?"'
  },
  {
    type: 'spectrum',
    title: 'How new is this job?',
    subtitle: 'Existed in 2010 | Did not exist in 2015',
    bullets: [
      info('Sports scientist', '10', 'rebuilt by GPS'),
      info('Data protection officer', '26', 'required more often since 2018'),
      info('Performance analyst', '38', ''),
      info('Throw-in coach', '64', '2018'),
      info('Optical tracking operator', '72', ''),
      info('Virtual ad producer', '80', ''),
      info('Research engineer', '90', ''),
      info('Head of AI', '96', '2026')
    ],
    progressive: true,
    body: 'The positions are arguable. That is the activity.',
    notes: 'PART 03 · 3 MINUTES. STAND ON THE LINE. One wall is "existed in 2010", the other "did not exist in 2015". Read each job; students move; then click to show ours.\n\nThe point: most jobs were not invented by AI; they were rebuilt by it. Only a few, like head of AI, are new titles. The data protection officer moves right because UK GDPR (2018) made the role a legal requirement for many organisations.\n\nAsk: "Which of these will not exist in 2035?"'
  },
  {
    type: 'cards',
    title: 'Football × something else',
    subtitle: 'Hybrid skills · pair talk · 2 minutes',
    bullets: [
      card('Football × physics', 'Pitch control, ball flight, the space between players.'),
      card('Football × motion design', 'The replay, the stats, the screen in the roof.'),
      card('Football × psychology', 'Pressure, focus, the penalty shootout.'),
      card('Football × law', 'Whose data is it, and who can sell it?')
    ],
    notes: 'PART 03 · 2 MINUTES. Every job on the atlas is football crossed with another discipline. Pairs say which cross they are, from their own course, and one job it leads to.\n\nTake four answers. Write the crosses on the board: the brief will use them.'
  },

  /* ------------------------------------------------------------- 04 THE CRIT */
  sheet('part-04', art.section(4, ['The crit'], ['We argue with the wall:', 'authorship, data, and who decides.'], art.MOTIF.crit, CORAL),
    { title: '04 · The crit', alt: 'Part 04. The crit: we argue with the wall: authorship, data, and who decides.' },
    'PART 04 · 7 MINUTES. A studio crit. The rule of a crit: argue with the work, not the person.'),
  {
    type: 'statement',
    body: 'If the offside line is a render, who is its author?',
    subtitle: 'Hands up: the referee, the engineer, the designer · then reasons',
    design: { words: 'rise', wordStagger: 'wave' },
    notes: 'PART 04 · 2 MINUTES. Three-way vote. Then one reason from each.\n\nThe Premier League’s line: the VAR reviews and approves; the technology speeds it up. But the camera placement, the model, the kick-point suggestion and the 3D picture were all designed by someone. When a decision is disputed, fans argue with the picture.\n\nPush: "If a designer’s replay makes a toenail offside look obvious, is that fair design or persuasion?"'
  },
  sheet('case-klopp', art.caseFile({ n: 3, kicker: 'Decide · Liverpool FC', title: ['The data', 'said hire', 'Klopp'], ink: CORAL,
    facts: [['2015', ['Liverpool’s research team says Dortmund', 'had been unlucky, not badly managed']], ['2019', 'the Champions League'], ['2020', 'the Premier League']],
    job: 'Head of research, beside the manager', tag: 'Lichtenthaler, 2022' }),
    { title: 'Case file 03 · The Klopp hire', alt: 'Case file 03, Liverpool FC: the data said hire Klopp. In 2015 Liverpool’s research team found Dortmund had been unlucky, not badly managed; the Champions League in 2019; the Premier League in 2020. The job it shows: head of research, beside the manager.' },
    'CASE FILE 03 · 2 MINUTES. From Ulrich Lichtenthaler, “Liverpool Football Club: extending data analytics and AI with neuroscience” (23 May 2022). After a hard final season at Borussia Dortmund, Jürgen Klopp was widely criticised; Liverpool’s Head of Research, Ian Graham, and his team found Dortmund had been unlucky and Klopp was still a top manager. Liverpool hired him in 2015 and won the Champions League in 2019 and the Premier League in 2020. From 2021 the club also worked with neuro11, a neuroscience company, on penalties: Liverpool won both 2022 domestic cup finals against Chelsea on penalties.\n\nLichtenthaler’s argument is integrated intelligence: the data found the manager, and the manager’s emotional intelligence and empathetic leadership made the data pay off. He writes that artificial and human intelligence complement each other. The next slide makes it a table.\n\nAsk: "So did the data win those trophies?"'),
  {
    type: 'compare',
    title: 'What AI brings and what people bring',
    subtitle: 'What AI brings | What people bring',
    bullets: [
      row('Offside', 'Tracks every joint, 100 times a second.', 'Decides what “level” should mean in the law.'),
      row('Recruitment', 'Searches every league in the world.', 'Sees who will fit the dressing room.'),
      row('The screen', 'Generates a thousand graphics a match.', 'Chooses the one that makes 60,000 people feel something.'),
      row('The shootout', 'Trains focus and scanning.', 'Puts an arm round the one who missed.')
    ],
    progressive: true,
    notes: 'PART 04 · 2 MINUTES. Ulrich Lichtenthaler (2022) calls it integrated intelligence: Liverpool’s data paid off when it was combined with Klopp’s people skills. Read each AI cell, ask "and what do people bring?", then click.\n\nThe design row is the one to land for this room: generation is cheap; taste and judgement are not.'
  },
  {
    type: 'statement',
    body: 'An AI company says players are 90% of a team’s success, and the coach only 10%.',
    subtitle: 'Agree or disagree · hands up · 2 minutes',
    notes: 'PART 04 · 2 MINUTES. THE DEBATE. Hands up: agree, disagree, not sure. One reason from each side.\n\nFrom Sky Sports (6 February 2025): Jan Wendt of PLAIER says player quality explains around 90% of success and the coach around 10%. He says its models rated Klopp’s Liverpool as performing about as well as the squad should, and calls sacking a coach a “Hail Mary pass”. Set that against case file 03, where Liverpool’s data chose the coach. Both can be true: the coach is part of why the players got that good.\n\nFor a design room: if a model rates the people, who designs the rating, and who is allowed to see it?'
  },
  {
    type: 'compare',
    title: 'Myth or fact?',
    subtitle: 'Myth or fact? | The facts',
    bullets: [
      row('AI decides offside now', 'Myth', 'It suggests the lines; the VAR approves the decision.'),
      row('You need to be good at football to work in it', 'Myth', 'Liverpool’s lead data scientist says he is “really bad at most team sports”.'),
      row('Clubs advertise for AI engineers', 'Fact', 'Arsenal advertised for a research engineer in 2026.'),
      row('AI will replace the creative jobs first', 'Not proven', 'The World Economic Forum lists creative thinking among the fastest-rising skills.')
    ],
    progressive: true,
    notes: 'PART 04 · 2 MINUTES. Thumbs up for fact, down for myth, then click.\n\nRow 4 is the honest one: nobody knows. The World Economic Forum’s Future of Jobs Report 2025 lists creative thinking, with AI and big data, among the skills employers expect to grow most by 2030; it also expects graphic designers to be among the roles that decline. Both are in the same report. Ask: "How can both be true?" (The task is automated; the judgement is not.)'
  },
  sheet('case-nostrada', art.caseFile({ n: 4, kicker: 'Model · Nostrada.ai', title: ['Negotiating', 'with a clone'], ink: COBALT,
    facts: [['3', ['Premier League clubs reported to be', 'considering it, unnamed']], ['2026', ['reported in June: a tool first', 'built to model politicians']], ['0', 'clubs confirmed as using it']],
    job: 'Negotiation analyst', tag: 'OneFootball · Telegraph, 2026' }),
    { title: 'Case file 04 · Negotiating with a clone', alt: 'Case file 04, Nostrada.ai: negotiating with a clone. Three unnamed Premier League clubs reported to be considering it; reported in June 2026, from a tool first built to model politicians; no club confirmed as using it. The job it shows: negotiation analyst.' },
    'CASE FILE 04 · 2 MINUTES. From OneFootball (10 June 2026), reporting the Telegraph: at least three unnamed Premier League clubs were considering an AI chatbot from Nostrada.ai, a company whose tool was first used to model politicians, that builds a “digital clone” of a rival club to predict how it would answer a bid before the real talks start. The football version uses transfer and market data from an Argentine firm. Nostrada says it would run on a secure platform for each club, and has not said whether it would sell to one club or many. Reported, not confirmed: no club is named as using it.\n\nAsk: "If both clubs bring a clone, who is negotiating? And would you tell the other side?" Then the last question of the crit.'),
  {
    type: 'statement',
    body: 'A player’s body is tracked every day for years. Who owns that data when they leave?',
    subtitle: 'Pair talk · 1 minute',
    notes: 'PART 04 · 1 MINUTE. The question under every studio. The player, the club, the data company, the next club? Under UK data protection law the player can ask what is held about them; health data is special category data with extra protection. In 2021 Project Red Card, a group of players backed by former manager Russell Slade, threatened legal action over data companies using players’ performance data without consent.\n\nThat is a job too: Studio B’s data protection officer, Studio E’s ethics lead.'
  },

  /* ------------------------------------------------------------- 05 THE BRIEF */
  sheet('part-05', art.section(5, ['Your', 'brief'], ['Design a football job for 2035.', 'Pin it up. Defend it.'], art.MOTIF.brief, ACID),
    { title: '05 · Your brief', alt: 'Part 05. Your brief: design a football job for 2035. Pin it up. Defend it.' },
    'PART 05 · 11 MINUTES. The output of the session. Teams of three, mixing courses if you can.'),
  {
    type: 'keyfact',
    subtitle: 'The brief · teams of three · 12 minutes',
    title: 'Design a football job for 2035',
    body: 'Find a part of football nobody measures, designs or looks after yet. Invent the job that does it, put it on the line, and make its poster.',
    bullets: ['Our job title:'],
    notes: 'PART 05 · 1 MINUTE TO SET. Start points from the session: the parts nobody has measured (from the numbers slide), the crosses (football × your discipline), and the catches from the crit.\n\nThe constraint that makes it good: the job must name its catch. A job with no catch is an advert.'
  },
  sheet('brief-template', art.briefTemplate([
    { label: 'The gap', prompt: 'What in football does nobody do yet?' },
    { label: 'On the line', prompt: 'Capture, engineer, model, design or decide?' },
    { label: 'The data', prompt: 'What does the job use, and where from?' },
    { label: 'The human part', prompt: 'What does this person do that AI cannot?' },
    { label: 'The catch', prompt: 'Who could it harm, and how would you stop it?' }
  ]), { title: 'The job poster', alt: 'A job poster template for football in 2035: job title, then five fields: the gap, its place on the line, the data, the human part, the catch. Teams of three, 12 minutes, on A3 or a slide.' },
    'PART 05 · 8 MINUTES TO MAKE. Leave this up while they work. A3 and markers, or one slide per team. Walk the room and push on field 4: if AI could do the whole job, it is not a job.\n\nExamples to unstick a team (do not show unless stuck): crowd-noise designer, who tunes the sound of a stadium; academy data guardian, who decides what a 12-year-old’s tracking data can be used for; multilingual AI commentary editor; women’s game data scout, where data is scarcer; stadium digital-twin operator, who runs crowd simulations before matchday (Athletic Club’s San Mamés has been modelled this way, BCAM, 2025).'),
  {
    type: 'journey',
    title: 'Crit rules',
    subtitle: 'Pin up · 90 seconds a team',
    bullets: [
      card('Pitch it', 'Sixty seconds: the gap, the job, the human part.'),
      card('One question', 'The room asks one question, about the catch.'),
      card('Yes, and', 'One team builds on it: what would make this job better?')
    ],
    progressive: true,
    notes: 'PART 05 · 2 MINUTES FOR THREE OR FOUR TEAMS. Pin the posters up on the wall beside the atlas, at the step on the line each job claims. The wall is the session’s output; photograph it.\n\nIf time is short, do a gallery walk: everyone puts a dot on the job they would apply for.'
  },
  {
    type: 'statement',
    body: 'Football’s next great signing might be a designer.',
    subtitle: 'Studio 90 · close',
    design: { words: 'rise', wordStagger: 'wave' },
    notes: 'CLOSE. AI Awareness Day ends its Premier League page with: “The future of football isn’t just played, it’s programmed.” This deck’s answer: and designed. Back to the throw-in coach: a job that looked weird in 2018 because nobody had measured throw-ins. The jobs on the wall look weird today for the same reason.\n\nFollow-up: Jobs In Football and Training Ground Guru list club roles; the World Economic Forum’s Future of Jobs Report 2025 is free to read.'
  }
];

/* ---------------------------------------------------------------- the build */
const KEY = 'nul-ai-football-studio';
const TITLE = 'Studio 90 · AI, football and the new jobs';
const BLURB = 'Seventy minutes (with 60- and 45-minute cuts) for university students, run like a design studio: how AI and new technology remade football (the sensor ball, the rendered offside line, ref cams, moving pitches, virtual boards, the 360° screen), one line from the pitch to the call, a job atlas of five studios with four case files (PLAIER, the Premier League Companion, the Klopp hire, a negotiation clone), a crit on authorship and data, and a brief to design a football job for 2035.';
const THEME = 'studio90';

fs.mkdirSync(path.join(ROOT, ASSETS), { recursive: true });
for (const [name, svg] of Object.entries(posters)) fs.writeFileSync(path.join(ROOT, ASSETS, `${name}.svg`), svg);

const deck = SF.normalizeDeck({
  id: 'ai-football-studio-2026',
  title: TITLE,
  theme: THEME,
  libraryGroup: 'nul',
  aspect: '16:9',
  showSlideNumbers: true,
  finalScores: false,
  created: stamp,
  modified: stamp,
  slides: slides.map((slide, index) => ({ id: `studio90-${String(index).padStart(2, '0')}`, ...slide }))
});
if (!deck || deck.slides.length !== slides.length) throw new Error('SlideForge did not keep every slide');
if (deck.theme !== THEME) throw new Error(`theme became ${deck.theme}`);
slides.forEach((source, index) => {
  const output = deck.slides[index];
  const where = `slide ${index} (${source.type})`;
  if (output.type !== source.type || output.notes !== source.notes) throw new Error(`${where} changed`);
  if ((source.bullets || []).length !== output.bullets.length) throw new Error(`${where} lost content`);
  if (source.image && !fs.existsSync(path.join(ROOT, source.image))) throw new Error(`${where}: missing ${source.image}`);
});

const target = path.join(ROOT, 'output', 'Studio90_AI_Football.sfdeck.json');
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, JSON.stringify(deck, null, 2) + '\n');
console.log(`${path.relative(ROOT, target)} (${deck.slides.length} slides, ${deck.slides.filter(s => !s.hidden).length} shown, ${Object.keys(posters).length} posters)`);

/* Built in: the app's lesson list and the Library's Northeastern folder. */
const lesson = {
  key: KEY, title: TITLE, blurb: BLURB, icon: '🎨', kind: 'lecture', minutes: 70,
  theme: deck.theme, libraryGroup: 'nul', showSlideNumbers: true, games: [], slides
};
const builtIn = path.join(ROOT, 'js', 'lessons-football-studio.js');
fs.writeFileSync(builtIn, `/* Generated by tools/build-football-studio.js: do not edit by hand, rebuild instead.
   Studio 90, built into SlideForge's lesson list and seeded into the
   Northeastern folder of every browser's Library. Loaded after js/lessons.js,
   whose LESSONS and LIBRARY_SEED_KEYS it extends. */
(function (root) {
  'use strict';
  var SF = root.SF;
  if (!SF || !SF.LESSONS || !SF.LIBRARY_SEED_KEYS) return;
  var lesson = ${JSON.stringify(lesson)};
  if (!SF.LESSONS.some(function (l) { return l.key === lesson.key; })) SF.LESSONS.push(lesson);
  SF.LIBRARY_SEED_KEYS[lesson.key] = 'nul';
})(typeof window !== 'undefined' ? window : globalThis);
`);
console.log(`${path.relative(ROOT, builtIn)} (Northeastern folder)`);
