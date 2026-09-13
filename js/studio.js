/* Local lesson-design tools. Reuses the existing game and feedback engines. */
(function () {
  'use strict';
  /** @type {import("../src/types.js").SlideForgeGlobal} */
  var SF = window.SF;
  var el = SF.el;
  var returnFocus;
  /* The lessons themselves live in js/lessons.js, as data. This only turns
     the chosen one into a deck. */
  function makeLesson(key) {
    return (SF.buildLesson && SF.buildLesson(key)) || SF.makeDeck('Untitled lesson');
  }

  /** Pick a ready-made lesson. */
  function openLessons() {
    returnFocus = document.activeElement;
    var modal = /** @type {HTMLDialogElement|null} */ (document.getElementById('lessonModal'));
    var body = document.getElementById('lessonBody');
    if (!modal || !body) return;
    body.replaceChildren();
    var all = SF.LESSONS || [];
    body.appendChild(el('p', 'library-note', all.length +
      (all.length === 1 ? ' ready-made lesson. ' : ' ready-made lessons. ') +
      'Opening one leaves your current lesson where it is — it stays in File → Open.'));
    var grid = el('div', 'activity-grid starters-grid');
    all.forEach(function (lesson) {
      var b = el('button', 'activity-card check');
      b.type = 'button';
      b.appendChild(el('span', 'activity-icon', lesson.icon || '✧'));
      b.appendChild(el('strong', null, lesson.title));
      b.appendChild(el('span', 'activity-description', lesson.blurb || ''));
      b.appendChild(el('span', 'activity-tag',
        (lesson.slides || []).length + ' SLIDES' +
        (lesson.minutes ? ' · ' + lesson.minutes + ' MIN' : '') + '  ↗'));
      b.onclick = function () {
        if (modal) modal.close();
        SF.Editor.useLesson(lesson.key);
        SF.toast('"' + lesson.title + '" opened. Your previous lesson is saved in File → Open.');
      };
      grid.appendChild(b);
    });
    body.appendChild(grid);
    modal.showModal();
  }

  /** The tabs the library can open on. Anything else means "everything". */
  var LIBRARY_TABS = ['all', 'check', 'feedback'];

  /**
   * @param {string} [filter] one of LIBRARY_TABS
   *
   * The filter is checked rather than trusted because this is wired straight
   * to a button's onclick, which hands the handler a PointerEvent. An event
   * is truthy, so `filter || 'all'` kept it, matched no category, and opened
   * the library on an empty grid reading "0 formats here".
   */
  function openLibrary(filter) {
    returnFocus = document.activeElement;
    var modal = /** @type {HTMLDialogElement|null} */ (document.getElementById('activityModal'));
    if (modal) modal.showModal();
    /* Quiz studio opens on the checks, because feedback prompts attach to a
       slide and there is no slide here to attach them to. */
    drawLibrary(LIBRARY_TABS.indexOf(String(filter)) > -1 ? String(filter) : 'all');
  }

  /* One-click presentation shapes — fill the pits after they land. */
  var starters = [
    {
      icon: 'T', title: 'Opening title', blurb: 'Big title at the top. Subtitle underneath.',
      build: function () {
        var s = SF.makeSlide('title');
        s.title = 'Lesson title';
        s.subtitle = 'Your name · ' + new Date().toLocaleDateString();
        return s;
      }
    },
    {
      icon: '•', title: 'Title + content', blurb: 'Classic teaching slide — heading, then bullet pits.',
      build: function () {
        var s = SF.makeSlide('content');
        s.title = 'Slide title';
        s.bullets = ['', '', ''];
        return s;
      }
    },
    {
      icon: 'K', title: 'Keywords', blurb: 'Bold keyword + lowercase definition — vocabulary pits.',
      build: function () {
        var s = SF.makeSlide('keywords');
        s.title = 'Key vocabulary';
        s.bullets = [
          SF.formatKeywordLine('', ''),
          SF.formatKeywordLine('', ''),
          SF.formatKeywordLine('', '')
        ];
        return s;
      }
    },
    {
      icon: 'I', title: 'Italics', blurb: 'Italic phrase + plain explanation — emphasis pits.',
      build: function () {
        var s = SF.makeSlide('italics');
        s.title = 'Phrases to notice';
        s.bullets = [
          SF.formatKeywordLine('', ''),
          SF.formatKeywordLine('', ''),
          SF.formatKeywordLine('', '')
        ];
        return s;
      }
    },
    {
      icon: '↗', title: 'Hyperlinks', blurb: 'Label + URL — clickable further reading.',
      build: function () {
        var s = SF.makeSlide('links');
        s.title = 'Further reading';
        s.bullets = [
          SF.formatKeywordLine('', ''),
          SF.formatKeywordLine('', ''),
          SF.formatKeywordLine('', '')
        ];
        return s;
      }
    },
    {
      icon: '◫', title: 'Dual coding', blurb: 'Half text, half image — say it and show it.',
      build: function () {
        var s = SF.makeSlide('split');
        s.title = 'Say it. Show it.';
        s.bullets = ['', '', ''];
        s.image = '';
        s.imageSide = 'right';
        return s;
      }
    },
    {
      icon: 'S', title: 'Section break', blurb: 'A clean pause between parts of the lesson.',
      build: function () {
        var s = SF.makeSlide('section');
        s.title = 'Next idea';
        s.subtitle = 'A short bridge into what follows.';
        return s;
      }
    },
    {
      icon: '▣', title: 'Full-bleed image', blurb: 'One dominant image with a caption.',
      build: function () {
        var s = SF.makeSlide('image');
        s.title = 'Caption';
        s.image = '';
        return s;
      }
    },
    {
      icon: '▦', title: 'Three cards', blurb: 'Three idea pits side by side.',
      build: function () {
        var s = SF.makeSlide('cards');
        s.title = 'Three ideas to hold onto.';
        s.bullets = ['', '', ''];
        return s;
      }
    },
    {
      icon: '“', title: 'Quote', blurb: 'A line the room can sit with.',
      build: function () {
        var s = SF.makeSlide('quote');
        s.body = 'Replace this with the line you want the room to sit with.';
        s.subtitle = 'Attribution';
        return s;
      }
    },
    {
      icon: '1', title: 'Steps', blurb: 'Title plus four numbered teaching steps.',
      build: function () {
        var s = SF.makeSlide('content');
        s.title = 'How it works';
        s.bullets = ['Step one', 'Step two', 'Step three', 'Step four'];
        return s;
      }
    }
  ];

  function openStarters() {
    returnFocus = document.activeElement;
    var modal = /** @type {HTMLDialogElement|null} */ (document.getElementById('starterModal'));
    var body = document.getElementById('starterBody');
    if (!modal || !body) return;
    body.replaceChildren();
    body.appendChild(el('p', 'library-note', 'Pick a shape to insert after the selected slide. You can change Layout any time in the right panel.'));
    var grid = el('div', 'activity-grid starters-grid');
    starters.forEach(function (st) {
      var b = el('button', 'activity-card check');
      b.type = 'button';
      b.appendChild(el('span', 'activity-icon', st.icon));
      b.appendChild(el('strong', null, st.title));
      b.appendChild(el('span', 'activity-description', st.blurb));
      b.appendChild(el('span', 'activity-tag', 'INSERT SLIDE  ↗'));
      b.onclick = function () {
        if (modal) modal.close();
        SF.Editor.insertStarter(st.build());
        SF.toast(st.title + ' added. Layout is in the right panel.');
      };
      grid.appendChild(b);
    });
    body.appendChild(grid);
    modal.showModal();
  }

  /* Catalogue formats that are an existing engine set up a particular way,
     rather than a new engine.
     Low-stakes quiz is its own worksheet board (paper answers, whole-quiz
     clock, reveal — no phone scoring). Beat the Clock is multiple choice with
     a short timer. What is genuinely blocked is a different shape of answer —
     an ordering, a set of marked cells — because the relay carries one scalar
     response per person. These are the ones that need nothing new. */
  var presets = {
    'low-stakes-quiz': { style: 'lowstakes', title: 'Low-stakes quiz',
      settings: { scoreboard: false, scoreSlide: false, defaultTime: 180, confidence: false, defaultPoints: 0 },
      seeds: [
        { question: 'What does RAM stand for?', answer: 'Random Access Memory' },
        { question: 'What is the function of the CPU?', answer: 'To process instructions and perform calculations' },
        { question: 'What type of storage is an SSD?', answer: 'Solid State Drive / Flash storage' },
        { question: 'What does ROM contain?', answer: 'Read Only Memory / Boot instructions / BIOS' },
        { question: 'What is cache memory used for?', answer: 'Storing frequently accessed data for quick retrieval' }
      ] },
    'beat-the-clock': { style: 'speed', title: 'Beat the clock',
      settings: { scoreboard: true, scoreSlide: true, defaultTime: 60, confidence: false },
      seeds: [
        { question: 'Which process releases energy from glucose in cells?', options: ['Photosynthesis', 'Respiration', 'Diffusion', 'Osmosis'], correct: 1, explanation: 'Respiration. Fast correct answers score more.' },
        { question: 'What is the speed of light in a vacuum?', options: ['300,000 km/s', '150,000 km/s', '3,000 km/s', '30,000 km/s'], correct: 0, explanation: 'Approximately 300,000 km/s. Quick thinking scores high!' },
        { question: 'Which organ filters waste from the blood to make urine?', options: ['Liver', 'Kidneys', 'Heart', 'Stomach'], correct: 1, explanation: 'Kidneys filter blood and regulate water balance.' }
      ] },
    'true-false': { style: 'truefalse', title: 'True / false showdown',
      settings: { scoreboard: true, scoreSlide: true, defaultTime: 15, confidence: false },
      seeds: [
        { question: 'Mitochondria are found only in animal cells.', options: ['True', 'False'], correct: 1, explanation: 'Plant cells have them too — they respire as well as photosynthesise.' },
        { question: 'Light travels faster than sound in air.', options: ['True', 'False'], correct: 0, explanation: 'True! Light travels ~300,000 km/s while sound is ~343 m/s.' },
        { question: 'The human heart has five chambers.', options: ['True', 'False'], correct: 1, explanation: 'False — the human heart has four chambers: two atria and two ventricles.' }
      ] },
    'truefalse': { style: 'truefalse', title: 'True or false',
      settings: { scoreboard: true, scoreSlide: true, defaultTime: 0 },
      seeds: [
        { question: 'Mitochondria are found only in animal cells.', options: ['True', 'False'], correct: 1, explanation: 'Plant cells have them too — they respire as well as photosynthesise.' },
        { question: 'Water expands when it freezes into ice.', options: ['True', 'False'], correct: 0, explanation: 'True! Water molecules form an open crystalline lattice.' }
      ] },
    'horse-race': { style: 'race', title: 'Horse race',
      settings: { scoreboard: true, scoreSlide: true, defaultTime: 20, mode: 'teams', trackLength: 5 },
      seeds: [
        { question: 'Which organelle is known as the powerhouse of the cell?', options: ['Nucleus', 'Mitochondria', 'Ribosome', 'Vacuole'], correct: 1, explanation: 'Mitochondria release cellular energy through respiration.' },
        { question: 'Which blood vessel carries oxygenated blood away from the heart?', options: ['Vein', 'Artery', 'Capillary', 'Vena cava'], correct: 1, explanation: 'Arteries carry blood away from the heart at higher pressure.' },
        { question: 'What gas do plants absorb from the air during photosynthesis?', options: ['Oxygen', 'Carbon dioxide', 'Nitrogen', 'Hydrogen'], correct: 1, explanation: 'Carbon dioxide enters leaves via stomata to build glucose.' },
        { question: 'What is the chemical formula for water?', options: ['CO2', 'NaCl', 'H2O', 'O2'], correct: 2, explanation: 'H2O: two hydrogen atoms bonded to one oxygen atom.' },
        { question: 'Which body system produces hormones to regulate functions?', options: ['Endocrine', 'Nervous', 'Digestive', 'Respiratory'], correct: 0, explanation: 'The endocrine system secretes hormones directly into the bloodstream.' }
      ] },
    'boss-battle': { style: 'boss', title: 'Boss battle',
      settings: { scoreboard: true, scoreSlide: true, defaultTime: 30, confidence: false,
        mode: 'teams' },
      /* One of each difficulty, so the boss has 11 HP and the damage ladder is
         visible before a single word is rewritten. A single-question seed left
         a boss that died to the first answer. */
      seeds: [
        { question: 'Which organelle contains chlorophyll?',
          options: ['Nucleus', 'Mitochondrion', 'Chloroplast', 'Ribosome'],
          correct: 2, difficulty: 'easy',
          explanation: 'Chloroplasts. An easy hit — 1 damage.' },
        { question: 'Which process releases energy from glucose?',
          options: ['Photosynthesis', 'Respiration', 'Diffusion', 'Osmosis'],
          correct: 1, difficulty: 'medium',
          explanation: 'Respiration. A medium hit — 2 damage.' },
        { question: 'Why does an enzyme stop working above its optimum temperature?',
          options: ['It dissolves', 'Its active site changes shape', 'It runs out', 'It freezes'],
          correct: 1, difficulty: 'hard',
          explanation: 'It denatures — the active site changes shape. A hard hit — 3 damage.' },
        { question: 'Explain why water moves into a cell placed in pure water.',
          options: ['Active transport', 'Osmosis down a water potential gradient',
            'Diffusion of solutes', 'It does not move'],
          correct: 1, difficulty: 'boss',
          explanation: 'Osmosis, down a water potential gradient. The boss blow — 5 damage.' }
      ] },

    /* Three futures, one of them the likely one. Timed, because the value is
       committing before you know. */
    'predict-outcome': { style: 'choice', title: 'Predict the outcome',
      settings: { scoreboard: true, scoreSlide: true, defaultTime: 30, confidence: true },
      seed: { question: 'A plant is moved from a sunny window to a dark cupboard for two weeks. What happens?',
        options: ['It grows taller and paler, reaching for light', 'It stops growing entirely and stays the same', 'It grows shorter and greener'],
        correct: 0, explanation: 'Etiolation: without light it invests in stem length rather than leaf, and makes less chlorophyll.' } },

    /* One wrong phrase among several candidates. Choice rather than a free
       selection: picking words out of a sentence needs an answer shape the
       relay does not carry yet, and the diagnosis is the same either way. */
    'spot-the-error': { style: 'choice', title: 'Spot the error',
      settings: { scoreboard: true, scoreSlide: false, defaultTime: 0 },
      seed: { question: 'Which part of this is wrong?\n\n"Photosynthesis happens in the mitochondria, uses carbon dioxide and water, and releases oxygen."',
        options: ['happens in the mitochondria', 'uses carbon dioxide and water', 'releases oxygen', 'nothing is wrong'],
        correct: 0, explanation: 'Chloroplasts, not mitochondria. Mitochondria do respiration \u2014 close to the opposite process.' } },

    /* Four equal items; discuss the rule; reveal the prepared odd one. */
    'odd-one-out': { style: 'oddone', title: 'Odd one out',
      settings: { scoreboard: false, scoreSlide: false, defaultTime: 0, confidence: false, defaultPoints: 0 },
      seeds: [
        { options: ['Iron', 'Copper', 'Oxygen', 'Zinc'], correct: 2,
          explanation: 'Oxygen is a non-metal. Accept any defensible rule a learner can argue for — the reasoning is the point.' },
        { options: ['Mitochondrion', 'Chloroplast', 'Nucleus', 'Ribosome'], correct: 1,
          explanation: 'Chloroplasts are for photosynthesis; the others appear in typical animal cells too. Other rules may also work.' },
        { options: ['Photosynthesis', 'Respiration', 'Diffusion', 'Osmosis'], correct: 0,
          explanation: 'Photosynthesis builds glucose; the others move substances or release energy. Defend another grouping if you can.' },
        { options: ['CPU', 'RAM', 'SSD', 'HDMI'], correct: 3,
          explanation: 'HDMI is a display connection; the others are core computer components. Other rules welcome.' }
      ] },

    /* Two equal items; discuss alike/differ; reveal prepared points. */
    'compare-contrast': { style: 'compare', title: 'Compare & contrast',
      settings: { scoreboard: false, scoreSlide: false, defaultTime: 0, confidence: false, defaultPoints: 0 },
      seeds: [
        { itemA: 'Photosynthesis', itemB: 'Respiration', category: 'Science',
          similarities: 'Both involve energy and gases moving in living cells.',
          differences: 'Photosynthesis stores energy in glucose; respiration releases it.' },
        { itemA: 'RAM', itemB: 'SSD', category: 'ICT',
          similarities: 'Both store data the computer uses.',
          differences: 'RAM is volatile and fast for working memory; an SSD keeps files when power is off.' },
        { itemA: 'Democracy', itemB: 'Dictatorship', category: 'History',
          similarities: 'Both are ways a state can be governed.',
          differences: 'In a democracy power is shared through voting; in a dictatorship one person or clique holds it.' },
        { itemA: 'Metaphor', itemB: 'Simile', category: 'Literature',
          similarities: 'Both compare one thing to another in writing.',
          differences: 'A simile uses like or as; a metaphor says something is something else.' }
      ] },

    /* Passage held separately; reading clears before recall. */
    'definition-challenge': { style: 'definition', title: 'Definition challenge',
      settings: { scoreboard: true, scoreSlide: true, defaultTime: 30, confidence: false, defaultPoints: 1 },
      seeds: [
        {
          passage: 'A catalyst speeds up a reaction by lowering the activation energy. It is not consumed, so the same catalyst can work again and again.',
          question: 'What is not used up in the reaction?',
          accept: ['the catalyst', 'catalyst'],
          explanation: 'Not being consumed is the defining property — it is why a small amount goes a long way.'
        },
        {
          passage: 'Osmosis is the diffusion of water across a partially permeable membrane, from a dilute solution to a more concentrated one.',
          question: 'What substance moves in osmosis?',
          accept: ['water'],
          explanation: 'Only water moves through the membrane in osmosis.'
        },
        {
          passage: 'RAM is volatile memory: it stores data the CPU is using right now, and that data is lost when power is removed.',
          question: 'What happens to data in RAM when the computer is switched off?',
          accept: ['it is lost', 'lost', 'it disappears', 'cleared', 'it is cleared'],
          explanation: 'Volatile means the contents vanish without power.'
        }
      ] },

    /* Symbols in, concept out. */
    'emoji-guess': { style: 'emoji', title: 'Emoji guess',
      settings: { scoreboard: true, scoreSlide: true, defaultTime: 20 },
      /* Three puzzles across the three help levels, so an author sees what
         the difficulty dial does before writing their own. */
      seeds: [
        { clues: '\ud83c\udf31 \u2600\ufe0f \ud83d\udca7 \u2192 \ud83c\udf3f', accept: ['photosynthesis'],
          hint: 'How a plant makes its own food', difficulty: 'easy',
          explanation: 'Plant, light and water making growth.' },
        { clues: '\ud83e\uddea \ud83d\udd25 \u2192 \u26a1', accept: ['respiration', 'aerobic respiration'],
          hint: 'Releasing energy from glucose', difficulty: 'medium' },
        { clues: '\ud83d\udca7 \u2192 \ud83e\uddf1 \u2192 \ud83c\udf3f', accept: ['osmosis'],
          hint: 'Water across a partially permeable membrane', difficulty: 'hard' }
      ] },

    /* Cloze: the word matters because the sentence around it does. */
    'fill-in-the-blanks': { style: 'type', title: 'Fill in the blanks',
      settings: { scoreboard: false, scoreSlide: false, defaultTime: 0 },
      seed: { question: 'Water moves into a cell by ______, from where there is more water to where there is less.',
        accept: ['osmosis'], explanation: 'Diffusion of water specifically, across a partially permeable membrane.' } },

    /* A clue and a date; name the thing. */
    'ranking': { style: 'order', title: 'Ranking challenge',
      settings: { scoreboard: true, scoreSlide: true, defaultTime: 0 },
      seed: { question: 'Put these in order, earliest first.',
        options: ['Roman invasion of Britain', 'Norman conquest', 'English Civil War', 'First World War'],
        explanation: 'AD 43, 1066, 1642, 1914. Part marks for the ones you placed correctly.' } },

    'time-traveler': { style: 'type', title: 'Time traveler',
      settings: { scoreboard: true, scoreSlide: true, defaultTime: 60 },
      seed: { question: '1928 \u2014 a researcher returns from holiday to a contaminated petri dish and notices the bacteria around the mould have died. What was discovered?',
        accept: ['penicillin'], explanation: 'Fleming. The accident mattered because he looked at it properly rather than throwing the plate away.' } },

    'word-reveal': { style: 'wordreveal', title: 'Word reveal',
      settings: { scoreboard: true, scoreSlide: true, defaultTime: 0, confidence: false, defaultPoints: 0 },
      seed: { question: 'What process is this?', word: 'PHOTOSYNTHESIS', hint: 'How plants make food',
        accept: ['photosynthesis'], difficulty: 'medium', dripInterval: 5,
        explanation: 'Fewer letters shown when you guess means a higher score.' } },

    'memory-flip': { style: 'memoryflip', title: 'Memory flip',
      settings: { scoreboard: true, scoreSlide: true, defaultTime: 0, confidence: false, defaultPoints: 1 },
      seed: { term: 'Chloroplast', question: 'Chloroplast',
        definition: 'Organelle where photosynthesis happens', studySeconds: 10 } },

    'memory-match': { style: 'memorymatch', title: 'Memory match',
      settings: { scoreboard: true, scoreSlide: true, defaultTime: 0, confidence: false, mode: 'teams', defaultPoints: 1 },
      seed: { term: 'Mitochondrion', question: 'Mitochondrion',
        definition: 'Where respiration releases energy', studySeconds: 10, rotateClaims: true } },

    'knowledge-flip': { style: 'knowledgeflip', title: 'Knowledge flip',
      settings: { scoreboard: false, scoreSlide: false, defaultTime: 0, confidence: false, defaultPoints: 1 },
      seed: { term: 'Osmosis', question: 'Osmosis',
        definition: 'Diffusion of water across a partially permeable membrane', studySeconds: 0 } },

    'heads-up': { style: 'headsup', title: 'Heads up',
      settings: { scoreboard: true, scoreSlide: true, defaultTime: 60, confidence: false, defaultPoints: 1 },
      seeds: [
        { term: 'Photosynthesis', question: 'Photosynthesis', category: 'Biology', explanation: 'Plants using sunlight, water and CO2 to create glucose and oxygen.' },
        { term: 'Mitochondrion', question: 'Mitochondrion', category: 'Biology', explanation: 'The organelle responsible for aerobic cellular respiration.' },
        { term: 'Gravity', question: 'Gravity', category: 'Physics', explanation: 'The attractive force between masses in the universe.' }
      ] },

    'spin-explain': { style: 'spinexplain', title: 'Spin & explain',
      settings: { scoreboard: true, scoreSlide: true, defaultTime: 20, confidence: false, defaultPoints: 2 },
      seeds: [
        { term: 'Respiration', question: 'Respiration', hint: 'Energy from glucose', explanation: 'Cellular reaction releasing energy in the form of ATP.' },
        { term: 'Diffusion', question: 'Diffusion', hint: 'Particle spread', explanation: 'Movement of particles from high to low concentration.' },
        { term: 'Osmosis', question: 'Osmosis', hint: 'Water movement', explanation: 'Movement of water molecules across a partially permeable membrane.' }
      ] },

    'connection-maker': { style: 'connection', title: 'Connection maker',
      settings: { scoreboard: true, scoreSlide: true, defaultTime: 0, confidence: false, defaultPoints: 1 },
      seeds: [
        { itemA: 'Photosynthesis', itemB: 'Respiration', question: 'How do photosynthesis and respiration connect?', explanation: 'Photosynthesis produces glucose and oxygen, which respiration consumes to release energy.' },
        { itemA: 'CPU', itemB: 'RAM', question: 'How do the CPU and RAM connect?', explanation: 'The CPU reads and executes instructions and data held in RAM.' }
      ] },

    'concept-chain': { style: 'conceptchain', title: 'Concept chain',
      settings: { scoreboard: true, scoreSlide: true, defaultTime: 45, confidence: false, defaultPoints: 1 },
      seeds: [
        { term: 'Cell', prompt: 'The basic unit of living things — what connects next?' },
        { term: 'Tissue', prompt: 'Groups of similar cells — how does this link onward?' },
        { term: 'Organ', prompt: 'Tissues working together — what comes after?' },
        { term: 'System', prompt: 'Organs cooperating — how does this reach the organism?' }
      ] },

    'random-challenge': { style: 'randomchallenge', title: 'Random challenge',
      settings: { scoreboard: false, scoreSlide: false, defaultTime: 0, confidence: false },
      seeds: [
        { challenge: 'Explain this idea to someone who missed the last lesson.', question: 'Explain this idea to someone who missed the last lesson.', explanation: 'Summarize the core concept clearly without jargon.' },
        { challenge: 'Draw a diagram of the process on the board in 30 seconds.', question: 'Draw a diagram of the process on the board in 30 seconds.', explanation: 'Sketch the key stages with accurate labels.' }
      ] },

    'slider': { style: 'slider', title: 'Numerical estimate',
      settings: { scoreboard: true, scoreSlide: true, defaultTime: 20 },
      seeds: [
        { question: 'In what year was the World Wide Web invented at CERN?', min: 1970, max: 2010, target: 1989, tolerance: 3, unit: 'year', explanation: 'Tim Berners-Lee invented the World Wide Web in 1989.' },
        { question: 'What percentage of the Earth’s surface is covered by water?', min: 0, max: 100, target: 71, tolerance: 5, unit: '%', explanation: 'Oceans and seas cover approximately 71% of Earth.' }
      ] },

    'choice': { style: 'choice', title: 'Multiple choice quiz',
      settings: { scoreboard: true, scoreSlide: true, defaultTime: 20 },
      seeds: [
        { question: 'What is the main gas found in Earth’s atmosphere?', options: ['Nitrogen', 'Oxygen', 'Carbon dioxide', 'Argon'], correct: 0, explanation: 'Nitrogen makes up approximately 78% of the atmosphere.' },
        { question: 'Which particle carries a positive electrical charge?', options: ['Proton', 'Neutron', 'Electron', 'Photon'], correct: 0, explanation: 'Protons are positively charged and located in the atomic nucleus.' },
        { question: 'What is the freezing point of water on the Celsius scale?', options: ['0°C', '32°C', '100°C', '-10°C'], correct: 0, explanation: 'Pure water freezes at 0°C (32°F) at standard atmospheric pressure.' }
      ] },

    'bingo': { style: 'bingo', title: 'Bingo',
      settings: { scoreboard: false, scoreSlide: false, defaultTime: 0, confidence: false,
        mode: 'teams' },
      /* Twelve pairs, because a 3×3 card needs nine and a pool the same size
         as the card deals every team the same card. */
      seeds: [
        { term: 'Nucleus', question: 'Nucleus', definition: 'Holds the cell’s DNA and controls what it makes', gridSize: 3 },
        { term: 'Cytoplasm', question: 'Cytoplasm', definition: 'The jelly where most of the cell’s reactions happen', gridSize: 3 },
        { term: 'Cell membrane', question: 'Cell membrane', definition: 'Controls what gets into and out of the cell', gridSize: 3 },
        { term: 'Mitochondrion', question: 'Mitochondrion', definition: 'Releases energy from glucose in respiration', gridSize: 3 },
        { term: 'Ribosome', question: 'Ribosome', definition: 'Builds proteins from amino acids', gridSize: 3 },
        { term: 'Vacuole', question: 'Vacuole', definition: 'Stores sap and keeps a plant cell firm', gridSize: 3 },
        { term: 'Chloroplast', question: 'Chloroplast', definition: 'Traps light so the plant can photosynthesise', gridSize: 3 },
        { term: 'Cell wall', question: 'Cell wall', definition: 'Stops a plant cell bursting when it fills with water', gridSize: 3 },
        { term: 'Chromosome', question: 'Chromosome', definition: 'A long coiled molecule of DNA carrying many genes', gridSize: 3 },
        { term: 'Enzyme', question: 'Enzyme', definition: 'A protein that speeds up one reaction and is not used up', gridSize: 3 },
        { term: 'Diffusion', question: 'Diffusion', definition: 'Particles spreading from where there are many to where there are few', gridSize: 3 },
        { term: 'Osmosis', question: 'Osmosis', definition: 'Water moving across a partially permeable membrane', gridSize: 3 }
      ] },

    'quiz-bowl': { style: 'bowl', title: 'Quiz bowl',
      settings: { scoreboard: false, scoreSlide: false, defaultTime: 0, confidence: false,
        mode: 'teams' },
      /* A grid, not one cell: three categories by three values is the smallest
         board where choosing a cell is a decision. */
      seeds: [
        { category: 'Cells', pointValue: 100, targetScore: 1000,
          question: 'What is the jelly inside a cell called?', answer: 'Cytoplasm' },
        { category: 'Cells', pointValue: 200, targetScore: 1000,
          question: 'What molecule carries genetic information?', answer: 'DNA' },
        { category: 'Cells', pointValue: 300, targetScore: 1000,
          question: 'Which organelle releases energy in respiration?', answer: 'The mitochondrion' },
        { category: 'Transport', pointValue: 100, targetScore: 1000,
          question: 'Which way do particles move in diffusion?', answer: 'From high to low concentration' },
        { category: 'Transport', pointValue: 200, targetScore: 1000,
          question: 'What is the movement of water across a partially permeable membrane?', answer: 'Osmosis' },
        { category: 'Transport', pointValue: 300, targetScore: 1000,
          question: 'Which kind of transport needs energy from respiration?', answer: 'Active transport' },
        { category: 'Enzymes', pointValue: 100, targetScore: 1000,
          question: 'What kind of molecule is an enzyme?', answer: 'A protein' },
        { category: 'Enzymes', pointValue: 200, targetScore: 1000,
          question: 'What happens to an enzyme above its optimum temperature?', answer: 'It denatures' },
        { category: 'Enzymes', pointValue: 300, targetScore: 1000,
          question: 'What is the molecule an enzyme acts on called?', answer: 'The substrate' }
      ] }
  };
  /* Expose presets on SF so other modules and Try demo can access all starter banks. */
  SF.GAME_FORMAT_PRESETS = presets;

  /* Discussion formats — no competitive score. Copy says so on the card. */
  var feedbackPresets = {
    'question-cube': { kind: 'brainstorm', title: 'Question cube',
      prompt: 'What question would you ask about this? No score — open the discussion.' }
  };


  /* [id, icon, title, blurb, kind, enabled] — Memory Maze stays out of scope. */
  var activities = [
    ['choice','?','Multiple choice','Check an idea. Discuss the why.','check',true],
    ['truefalse','½','True / False','Uncover a common misconception.','check',true],
    ['type','Aa','Type answer','Recall it without the clues — no options to pick from.','check',true],
    ['slider','↔','Slider','Estimate a value on a line — near enough counts.','check',true],
    ['poll','▤','Poll','Take the pulse of the room.','feedback',true],
    ['wordcloud','✳','Word cloud','Turn individual thoughts into patterns.','feedback',true],
    ['brainstorm','✎','Brainstorm','Make space for everyone’s ideas.','feedback',true],
    ['scale','≋','Scale','Explore confidence and agreement.','feedback',true],
    ['true-false','⚡','True/False Showdown','Fast retrieval under time pressure.','check',true],
    ['low-stakes-quiz','◎','Low-Stakes Quiz','Timed paper retrieval. Reveal answers when the clock ends — no scoreboard.','check',true],
    ['quiz-bowl','▦','Quiz Bowl','A category and value board. Pick an unused cell, answer aloud, the teacher awards it.','check',true],
    ['beat-the-clock','◷','Beat the Clock','Speeded multiple-choice fluency.','check',true],
    ['boss-battle','▲','Boss Battle','Shared goal: bring the boss HP down.','check',true],
    ['horse-race','♘','Horse Race','Team race across quick competitive rounds.','check',true],
    ['memory-flip','🂠','Memory Flip','Study the board, then build one class collection. Teacher checks each recall.','check',true],
    ['memory-match','⧉','Memory Match','Study, choose a hidden card, explain and claim. Teams rotate; misses can be retried.','check',true],
    ['memory-maze','⎇','Memory Maze','Hold a sequence, then navigate it.','check',false],
    ['bingo','▣','Bingo','Call a definition; the team holding that term explains it to claim the square. A line wins — no points.','check',true],
    ['knowledge-flip','↺','Knowledge Flip','Choose a visible keyword, explain it and collect the card. No study timer.','check',true],
    ['definition-challenge','¶','Definition Challenge','Read a passage, then answer from memory once it clears.','check',true],
    ['emoji-guess','☺','Emoji Guess','Decode a concept from symbols. Release the letter pattern, then a hint, as they get stuck.','check',true],
    ['word-reveal','…','Word Reveal','Guess from letters as they drip in.','check',true],
    ['fill-in-the-blanks','_','Fill in the Blanks','Type the missing word in a sentence, then discuss why it fits.','check',true],
    ['heads-up','↑','Heads Up','Describe a term; peers retrieve it.','check',true],
    ['spin-explain','◉','Spin & Explain','Spin a concept; explain it aloud.','check',true],
    ['spot-the-error','✗','Spot the Error','Find the mistake; explain the fix.','check',true],
    ['ranking','↕','Ranking Challenge','Order items by criteria — part marks on the scoreboard.','check',true],
    ['odd-one-out','◇','Odd One Out','Four equal items. Discuss the rule, then reveal the prepared odd one. No score.','check',true],
    ['compare-contrast','⇄','Compare & Contrast','Two equal items. Discuss alike and differ, then reveal prepared points. No score.','check',true],
    ['predict-outcome','→','Predict the Outcome','Choose what happens next, and why.','check',true],
    ['time-traveler','☽','Time Traveler','Recall events from year or clue.','check',true],
    ['connection-maker','⚭','Connection Maker','Link two ideas; explain the bridge.','check',true],
    ['question-cube','⚀','Question Cube · discussion prompt','Add a discussion prompt beside your slide. Cube rolling is not available yet.','feedback',true],
    ['random-challenge','✦','Random Challenge','Draw varied open challenges. Count only — no scoreboard.','check',true],
    ['concept-chain','⛓','Concept Chain','Grow a justified chain. Type the link, Accept — it appears on the wall.','check',true]
  ];
  function drawLibrary(filter) {
    var body = document.getElementById('activityBody');
    if (!body) return;
    body.replaceChildren();
    var tabs = el('div','library-tabs');
    [['all','All activities'],['check','Knowledge checks'],['feedback','Gather feedback']].forEach(function (t) {
      var b = SF.Shell.UI.button(t[1], filter === t[0] ? 'active' : '', function () {drawLibrary(t[0]);}); tabs.appendChild(b);
    });
    body.appendChild(tabs);
    /* Say the numbers. "I cannot see the 27" is unanswerable from a grid you
       have to count yourself, and a tab filter quietly hides three of them —
       so the note states how many are here, how many are ready, and where
       the rest went. */
    var shown = activities.filter(function (a) { return filter === 'all' || a[4] === filter; });
    var ready = shown.filter(function (a) { return a[5]; }).length;
    var hidden = activities.length - shown.length;
    var note = shown.length + ' formats here \u00b7 ' + ready + ' ready to use, ' +
      (shown.length - ready) + ' planned.';
    if (hidden) note += ' ' + hidden + ' more on the other tabs.';
    note += ' Choose a format, add your lesson content, then try its demo. Memory Maze is not yet available.';
    body.appendChild(el('p','library-note', note));
    var grid = el('div','activity-grid');
    activities.filter(function (a) {return filter === 'all' || a[4] === filter;}).forEach(function (a) {
      var b = el('button','activity-card ' + a[4]); b.disabled = !a[5];
      b.appendChild(el('span','activity-icon',a[1]));
      b.appendChild(el('strong',null,a[2])); b.appendChild(el('span','activity-description',a[3]));
      var book = SF.Playbook && SF.Playbook.forKey(a[0]);
      var setup = SF.Playbook && SF.Playbook.setupForKey(a[0]);
      if (setup) b.appendChild(el('span', 'activity-howto', setup.participation));
      else if (book && book.howToPlay && book.howToPlay[0]) b.appendChild(el('span', 'activity-howto', book.howToPlay[0]));
      b.appendChild(el('span','activity-tag',a[5] ? (a[4] === 'check' ? 'BETWEEN SLIDES  ↗' : 'BESIDE YOUR SLIDE  ↗') : 'PLANNED FORMAT'));
      /* Planned cards stay disabled — never call insert with an unimplemented style id. */
      if (a[5]) b.onclick = function () {
        var actModal = /** @type {HTMLDialogElement|null} */ (document.getElementById('activityModal'));
        if (actModal) actModal.close();
        if (a[4] === 'check') {
          var raw = presets[a[0]];
          var pre = raw ? {
            style: raw.style,
            title: raw.title,
            settings: raw.settings ? Object.assign({}, raw.settings) : undefined,
            seed: raw.seed ? Object.assign({}, raw.seed) : undefined,
            /* A format whose one question cannot show it seeds a whole set. */
            seeds: raw.seeds ? raw.seeds.map(function (q) { return Object.assign({}, q); }) : undefined
          } : {
            style: (SF.formatStyle && SF.formatStyle(a[0])) || a[0],
            title: a[2]
          };
          /* Catalogue id is always the format — even when the card is a bare
             engine — so Game settings lock to the right activity instead of
             offering Beat the Clock beside True/False. */
          pre.format = a[0];
          /* `.key`, not the workspace itself. Shell.current() hands back the
             workspace object, so `=== 'game'` was never true and this branch
             never ran: picking a format in Quiz studio built the game, filed
             it in the deck, left you editing the one you already had, and
             said "customize it in the right panel" about something the right
             panel was not showing. */
          var ws = SF.Shell && SF.Shell.current && SF.Shell.current();
          if (ws && ws.key === 'game') {
            var curG = SF.Games && SF.Games.game && SF.Games.game();
            var g = SF.createPresetGame(pre.style || a[0], pre, curG ? curG.theme : 'midnight');
            if (SF.Games && SF.Games.openGame) SF.Games.openGame(g.id);
            SF.toast('Switched to ' + a[2] + '. Customize it in the right panel.');
          } else {
            SF.Editor.insertNewGame(pre.style || a[0], pre);
            SF.toast(a[2] + ' added. Customize it in the right panel.');
          }
        } else {
          var fp = feedbackPresets[a[0]];
          SF.Editor.attachFeedback(fp ? fp.kind : a[0], fp);
          /* The feedback branch's own toast. It used to share an
             unconditional one below, which also fired after the two above and
             overwrote whichever had just run. */
          SF.toast(a[2] + ' added. Customize it in the right panel.');
        }
      };
      grid.appendChild(b);
    });
    body.appendChild(grid);
  }
  function init() {
    var modal = el('dialog','activity-modal'); modal.id = 'activityModal';
    modal.setAttribute('aria-labelledby','activityTitle');
    modal.innerHTML = '<header><div><span class="eyebrow">LESS WATCHING. MORE THINKING.</span><h2 id="activityTitle">Bring the room into the lesson.</h2></div><button class="btn ghost" aria-label="Close activity library">✕</button></header><div id="activityBody"></div><footer><span class="local-dot"></span> Design & preview locally · Planned formats are not yet available</footer>';
    document.body.appendChild(modal);
    modal.querySelector('header button').onclick = function () {modal.close();};
    modal.addEventListener('click', function (e) {if (e.target === modal) {var r = modal.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) modal.close();}});
    modal.addEventListener('close',function () {if (returnFocus) returnFocus.focus();});

    var startersModal = el('dialog', 'activity-modal'); startersModal.id = 'starterModal';
    startersModal.setAttribute('aria-labelledby', 'starterTitle');
    startersModal.innerHTML = '<header><div><span class="eyebrow">START FROM A SHAPE.</span><h2 id="starterTitle">Slide starters</h2></div><button class="btn ghost" aria-label="Close slide starters">✕</button></header><div id="starterBody"></div><footer><span class="local-dot"></span> Boilerplates only — customise after they land</footer>';
    document.body.appendChild(startersModal);
    startersModal.querySelector('header button').onclick = function () { startersModal.close(); };
    startersModal.addEventListener('click', function (e) {
      if (e.target === startersModal) {
        var r = startersModal.getBoundingClientRect();
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) startersModal.close();
      }
    });
    startersModal.addEventListener('close', function () { if (returnFocus) returnFocus.focus(); });

    var lessonModal = el('dialog', 'activity-modal'); lessonModal.id = 'lessonModal';
    lessonModal.innerHTML = '<header><div><span class="eyebrow">START FROM A LESSON.</span><h2 id="lessonTitle">Ready-made lessons</h2></div><button class="btn ghost" aria-label="Close lessons">✕</button></header><div id="lessonBody"></div><footer><span class="local-dot"></span> Yours to rewrite — nothing here is locked</footer>';
    document.body.appendChild(lessonModal);
    lessonModal.querySelector('header button').onclick = function () { lessonModal.close(); };
    lessonModal.addEventListener('click', function (e) {
      if (e.target === lessonModal) {
        var r = lessonModal.getBoundingClientRect();
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) lessonModal.close();
      }
    });
    lessonModal.addEventListener('close', function () { if (returnFocus) returnFocus.focus(); });

    var btnActivities = document.getElementById('btnActivities');
    /* Wrapped, not passed: onclick hands its handler the event, and this one
       takes a tab name. */
    if (btnActivities) btnActivities.onclick = function () { openLibrary('all'); };
    /* The same library from Quiz studio. One list, so a format cannot exist
       in one studio and not the other. */
    var gameLib = document.getElementById('btnActivitiesGame');
    if (gameLib) gameLib.onclick = function () { openLibrary('check'); };
    var btnTemplate = document.getElementById('btnTemplate');
    if (btnTemplate) btnTemplate.onclick = openLessons;
    var btnReadyMade = document.getElementById('btnReadyMade');
    if (btnReadyMade) btnReadyMade.onclick = openLessons;
    var btnReflect = document.getElementById('btnReflect');
    if (btnReflect) btnReflect.onclick = function () {SF.Editor.addSlide('section'); SF.Editor.attachFeedback('poll');};
    document.querySelectorAll('.file-actions button').forEach(function (b) {
      b.addEventListener('click',function () {
        var menu = /** @type {HTMLDetailsElement|null} */ (document.querySelector('.file-menu'));
        if (menu) menu.open = false;
      });
    });
  }
  SF.Studio = {init:init,makeLesson:makeLesson,openLibrary:openLibrary,openStarters:openStarters,openLessons:openLessons};
})();
