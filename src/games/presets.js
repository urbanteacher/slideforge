/* SlideForge — game format presets and showcase generator.
   Provides rich, fully authored starter banks and sample games for all formats
   so "Try demo" can always showcase how every format plays in the classroom,
   even before a teacher has written their own questions. */

import { GAME_STYLES } from "./registry.js";
import { formatStyle, FORMAT_STYLE } from "./catalogue.js";
import { makeGame, makeQuestion } from "./factories.js";

/**
 * Curated preset seeds for each format.
 * Sourced from pedagogical content and classroom rehearsal requirements.
 * @type {Record<string, { style: string, title: string, settings?: any, seed?: any, seeds?: any[] }>}
 */
const GAME_FORMAT_PRESETS = {
  'low-stakes-quiz': {
    style: 'lowstakes',
    title: 'Low-stakes quiz',
    settings: { scoreboard: false, scoreSlide: false, defaultTime: 180, confidence: false, defaultPoints: 0 },
    seeds: [
      { question: 'What does RAM stand for?', answer: 'Random Access Memory' },
      { question: 'What is the function of the CPU?', answer: 'To process instructions and perform calculations' },
      { question: 'What type of storage is an SSD?', answer: 'Solid State Drive / Flash storage' },
      { question: 'What does ROM contain?', answer: 'Read Only Memory / Boot instructions / BIOS' },
      { question: 'What is cache memory used for?', answer: 'Storing frequently accessed data for quick retrieval' }
    ]
  },
  'beat-the-clock': {
    style: 'speed',
    title: 'Beat the clock',
    settings: { scoreboard: true, scoreSlide: true, defaultTime: 60, confidence: false },
    seeds: [
      { question: 'Which process releases energy from glucose in cells?', options: ['Photosynthesis', 'Respiration', 'Diffusion', 'Osmosis'], correct: 1, explanation: 'Respiration. Fast correct answers score more.' },
      { question: 'What is the speed of light in a vacuum?', options: ['300,000 km/s', '150,000 km/s', '3,000 km/s', '30,000 km/s'], correct: 0, explanation: 'Approximately 300,000 km/s. Quick thinking scores high!' },
      { question: 'Which organ filters waste from the blood to make urine?', options: ['Liver', 'Kidneys', 'Heart', 'Stomach'], correct: 1, explanation: 'Kidneys filter blood and regulate water balance.' }
    ]
  },
  'true-false': {
    style: 'truefalse',
    title: 'True / false showdown',
    settings: { scoreboard: true, scoreSlide: true, defaultTime: 15, confidence: false },
    seeds: [
      { question: 'Mitochondria are found only in animal cells.', options: ['True', 'False'], correct: 1, explanation: 'Plant cells have them too — they respire as well as photosynthesise.' },
      { question: 'Light travels faster than sound in air.', options: ['True', 'False'], correct: 0, explanation: 'True! Light travels ~300,000 km/s while sound is ~343 m/s.' },
      { question: 'The human heart has five chambers.', options: ['True', 'False'], correct: 1, explanation: 'False — the human heart has four chambers: two atria and two ventricles.' }
    ]
  },
  'truefalse': {
    style: 'truefalse',
    title: 'True or false',
    settings: { scoreboard: true, scoreSlide: true, defaultTime: 15 },
    seeds: [
      { question: 'Mitochondria are found only in animal cells.', options: ['True', 'False'], correct: 1, explanation: 'Plant cells have them too — they respire as well as photosynthesise.' },
      { question: 'Water expands when it freezes into ice.', options: ['True', 'False'], correct: 0, explanation: 'True! Water molecules form an open crystalline lattice.' },
      { question: 'Light travels faster than sound in air.', options: ['True', 'False'], correct: 0, explanation: 'True! Light travels ~300,000 km/s while sound is ~343 m/s.' }
    ]
  },
  'horse-race': {
    style: 'race',
    title: 'Horse race',
    settings: { scoreboard: true, scoreSlide: true, defaultTime: 20, mode: 'teams', trackLength: 5 },
    seeds: [
      { question: 'Which organelle is known as the powerhouse of the cell?', options: ['Nucleus', 'Mitochondria', 'Ribosome', 'Vacuole'], correct: 1, explanation: 'Mitochondria release cellular energy through respiration.' },
      { question: 'Which blood vessel carries oxygenated blood away from the heart?', options: ['Vein', 'Artery', 'Capillary', 'Vena cava'], correct: 1, explanation: 'Arteries carry blood away from the heart at higher pressure.' },
      { question: 'What gas do plants absorb from the air during photosynthesis?', options: ['Oxygen', 'Carbon dioxide', 'Nitrogen', 'Hydrogen'], correct: 1, explanation: 'Carbon dioxide enters leaves via stomata to build glucose.' },
      { question: 'What is the chemical formula for water?', options: ['CO2', 'NaCl', 'H2O', 'O2'], correct: 2, explanation: 'H2O: two hydrogen atoms bonded to one oxygen atom.' },
      { question: 'Which body system produces hormones to regulate functions?', options: ['Endocrine', 'Nervous', 'Digestive', 'Respiratory'], correct: 0, explanation: 'The endocrine system secretes hormones directly into the bloodstream.' }
    ]
  },
  'boss-battle': {
    style: 'boss',
    title: 'Boss battle',
    settings: { scoreboard: true, scoreSlide: true, defaultTime: 30, confidence: false, mode: 'teams' },
    seeds: [
      { question: 'Which organelle contains chlorophyll?', options: ['Nucleus', 'Mitochondrion', 'Chloroplast', 'Ribosome'], correct: 2, difficulty: 'easy', explanation: 'Chloroplasts. An easy hit — 1 damage.' },
      { question: 'Which process releases energy from glucose?', options: ['Photosynthesis', 'Respiration', 'Diffusion', 'Osmosis'], correct: 1, difficulty: 'medium', explanation: 'Respiration. A medium hit — 2 damage.' },
      { question: 'Why does an enzyme stop working above its optimum temperature?', options: ['It dissolves', 'Its active site changes shape', 'It runs out', 'It freezes'], correct: 1, difficulty: 'hard', explanation: 'It denatures — the active site changes shape. A hard hit — 3 damage.' },
      { question: 'Explain why water moves into a cell placed in pure water.', options: ['Active transport', 'Osmosis down a water potential gradient', 'Diffusion of solutes', 'It does not move'], correct: 1, difficulty: 'boss', explanation: 'Osmosis, down a water potential gradient. The boss blow — 5 damage.' }
    ]
  },
  'predict-outcome': {
    style: 'choice',
    title: 'Predict the outcome',
    settings: { scoreboard: true, scoreSlide: true, defaultTime: 30, confidence: true },
    seeds: [
      { question: 'A plant is moved from a sunny window to a dark cupboard for two weeks. What happens?', options: ['It grows taller and paler, reaching for light', 'It stops growing entirely and stays the same', 'It grows shorter and greener'], correct: 0, explanation: 'Etiolation: without light it invests in stem length rather than leaf, and makes less chlorophyll.' },
      { question: 'An ice cube is added to a cup of hot water. What happens to the thermal energy?', options: ['Thermal energy flows from hot water into the ice', 'Cold energy flows from the ice into the water', 'Energy is destroyed until temperatures balance'], correct: 0, explanation: 'Heat naturally flows from the higher temperature region to the lower temperature region.' }
    ]
  },
  'spot-the-error': {
    style: 'spot',
    title: 'Spot the error',
    settings: { scoreboard: true, scoreSlide: false, defaultTime: 30 },
    seeds: [
      { question: 'Photosynthesis happens in the mitochondria, uses carbon dioxide and water, and releases oxygen.', error: 'mitochondria', fix: 'chloroplasts', explanation: 'Mitochondria carry out respiration. Photosynthesis happens in the chloroplasts.' },
      { question: 'Sound travels fastest through a vacuum, because there are no particles in the way.', error: 'fastest', fix: 'not at all', explanation: 'Sound is a vibration passed between particles. With no particles, there is nothing to carry it.' },
      { question: 'The median of 2, 3, 3, 8 and 14 is 6, because it is the middle value once they are in order.', error: '6', fix: '3', explanation: 'In order the middle value is 3. Six is the mean, which a single large value pulls upward.' },
      { question: 'In 1066 William the Conqueror won the Battle of Hastings and was crowned King of Scotland.', error: 'Scotland', fix: 'England', explanation: 'He was crowned King of England on Christmas Day 1066; Scotland kept its own crown.' }
    ]
  },
  'odd-one-out': {
    style: 'oddone',
    title: 'Odd one out',
    settings: { scoreboard: false, scoreSlide: false, defaultTime: 0, confidence: false, defaultPoints: 0 },
    seeds: [
      { options: ['Iron', 'Copper', 'Oxygen', 'Zinc'], correct: 2, explanation: 'Oxygen is a non-metal. Accept any defensible rule a learner can argue for.' },
      { options: ['Mitochondrion', 'Chloroplast', 'Nucleus', 'Ribosome'], correct: 1, explanation: 'Chloroplasts are for photosynthesis; the others appear in typical animal cells too.' },
      { options: ['Photosynthesis', 'Respiration', 'Diffusion', 'Osmosis'], correct: 0, explanation: 'Photosynthesis builds glucose; the others move substances or release energy.' },
      { options: ['CPU', 'RAM', 'SSD', 'HDMI'], correct: 3, explanation: 'HDMI is a display connection; the others are core computer components.' }
    ]
  },
  'compare-contrast': {
    style: 'compare',
    title: 'Compare & contrast',
    settings: { scoreboard: false, scoreSlide: false, defaultTime: 0, confidence: false, defaultPoints: 0 },
    seeds: [
      { itemA: 'Photosynthesis', itemB: 'Respiration', category: 'Science', similarities: 'Both involve energy and gases moving in living cells.', differences: 'Photosynthesis stores energy in glucose; respiration releases it.' },
      { itemA: 'RAM', itemB: 'SSD', category: 'ICT', similarities: 'Both store data the computer uses.', differences: 'RAM is volatile and fast for working memory; an SSD keeps files when power is off.' },
      { itemA: 'Democracy', itemB: 'Dictatorship', category: 'History', similarities: 'Both are ways a state can be governed.', differences: 'In a democracy power is shared through voting; in a dictatorship one person or clique holds it.' },
      { itemA: 'Metaphor', itemB: 'Simile', category: 'Literature', similarities: 'Both compare one thing to another in writing.', differences: 'A simile uses like or as; a metaphor says something is something else.' }
    ]
  },
  'definition-challenge': {
    style: 'definition',
    title: 'Definition challenge',
    settings: { scoreboard: true, scoreSlide: true, defaultTime: 30, confidence: false, defaultPoints: 1 },
    seeds: [
      { passage: 'A catalyst speeds up a reaction by lowering the activation energy. It is not consumed, so the same catalyst can work again and again.', question: 'What is not used up in the reaction?', accept: ['the catalyst', 'catalyst'], explanation: 'Not being consumed is the defining property — it is why a small amount goes a long way.' },
      { passage: 'Osmosis is the diffusion of water across a partially permeable membrane, from a dilute solution to a more concentrated one.', question: 'What substance moves in osmosis?', accept: ['water'], explanation: 'Only water moves through the membrane in osmosis.' },
      { passage: 'RAM is volatile memory: it stores data the CPU is using right now, and that data is lost when power is removed.', question: 'What happens to data in RAM when the computer is switched off?', accept: ['it is lost', 'lost', 'it disappears', 'cleared', 'it is cleared'], explanation: 'Volatile means the contents vanish without power.' }
    ]
  },
  'emoji-guess': {
    style: 'emoji',
    title: 'Emoji guess',
    settings: { scoreboard: true, scoreSlide: true, defaultTime: 20 },
    seeds: [
      { clues: '🌱 ☀️ 💧 → 🌿', accept: ['photosynthesis'], hint: 'How a plant makes its own food', difficulty: 'easy', explanation: 'Plant, light and water making growth.' },
      { clues: '🧪 🔥 → ⚡', accept: ['respiration', 'aerobic respiration'], hint: 'Releasing energy from glucose', difficulty: 'medium', explanation: 'Cellular respiration releasing energy.' },
      { clues: '💧 → 🧱 → 🌿', accept: ['osmosis'], hint: 'Water across a partially permeable membrane', difficulty: 'hard', explanation: 'Water moving down a water potential gradient.' }
    ]
  },
  'fill-in-the-blanks': {
    style: 'type',
    title: 'Fill in the blanks',
    settings: { scoreboard: false, scoreSlide: false, defaultTime: 0 },
    seeds: [
      { question: 'Water moves into a cell by ______, from where there is more water to where there is less.', accept: ['osmosis'], explanation: 'Diffusion of water specifically, across a partially permeable membrane.' },
      { question: 'The organelle where protein synthesis occurs is the ______.', accept: ['ribosome', 'ribosomes'], explanation: 'Ribosomes assemble amino acids into proteins.' }
    ]
  },
  'ranking': {
    style: 'order',
    title: 'Ranking challenge',
    settings: { scoreboard: true, scoreSlide: true, defaultTime: 0 },
    seeds: [
      { question: 'Put these British history events in order, earliest first.', options: ['Roman invasion of Britain', 'Norman conquest', 'English Civil War', 'First World War'], explanation: 'AD 43, 1066, 1642, 1914. Part marks for items placed correctly.' },
      { question: 'Order these memory speeds from fastest to slowest.', options: ['CPU Registers', 'Cache Memory', 'RAM', 'Hard Drive'], explanation: 'Registers on the CPU die are fastest, followed by cache, main RAM, and secondary storage.' }
    ]
  },
  'time-traveler': {
    style: 'type',
    title: 'Time traveler',
    settings: { scoreboard: true, scoreSlide: true, defaultTime: 60 },
    seeds: [
      { question: '1928 — a researcher returns from holiday to a contaminated petri dish and notices bacteria around mould have died. What was discovered?', accept: ['penicillin'], explanation: 'Alexander Fleming discovered penicillin in 1928.' }
    ]
  },
  'word-reveal': {
    style: 'wordreveal',
    title: 'Word reveal',
    settings: { scoreboard: true, scoreSlide: true, defaultTime: 0, confidence: false, defaultPoints: 0 },
    seeds: [
      { question: 'What biological process is this?', word: 'PHOTOSYNTHESIS', hint: 'How plants make food using light', accept: ['photosynthesis'], difficulty: 'medium', dripInterval: 5, explanation: 'Fewer letters shown when you guess means a higher score.' },
      { question: 'Name this subatomic particle.', word: 'ELECTRON', hint: 'Carries a negative charge in an atom', accept: ['electron'], difficulty: 'easy', dripInterval: 4, explanation: 'Electrons orbit the nucleus of an atom.' }
    ]
  },
  'memory-flip': {
    style: 'memoryflip',
    title: 'Memory flip',
    settings: { scoreboard: true, scoreSlide: true, defaultTime: 0, confidence: false, defaultPoints: 1 },
    seeds: [
      { term: 'Chloroplast', question: 'Chloroplast', definition: 'Organelle where photosynthesis happens', studySeconds: 10 },
      { term: 'Mitochondrion', question: 'Mitochondrion', definition: 'Where respiration releases energy', studySeconds: 10 },
      { term: 'Nucleus', question: 'Nucleus', definition: 'Contains genetic material and controls the cell', studySeconds: 10 },
      { term: 'Ribosome', question: 'Ribosome', definition: 'Site of protein synthesis', studySeconds: 10 }
    ]
  },
  'memory-match': {
    style: 'memorymatch',
    title: 'Memory match',
    settings: { scoreboard: true, scoreSlide: true, defaultTime: 0, confidence: false, mode: 'teams', defaultPoints: 1 },
    seeds: [
      { term: 'Mitochondrion', question: 'Mitochondrion', definition: 'Where respiration releases energy', studySeconds: 10, rotateClaims: true },
      { term: 'Nucleus', question: 'Nucleus', definition: 'Contains DNA and instructions for the cell', studySeconds: 10, rotateClaims: true },
      { term: 'Cell membrane', question: 'Cell membrane', definition: 'Controls what enters and exits the cell', studySeconds: 10, rotateClaims: true },
      { term: 'Chloroplast', question: 'Chloroplast', definition: 'Traps sunlight for photosynthesis', studySeconds: 10, rotateClaims: true }
    ]
  },
  'knowledge-flip': {
    style: 'knowledgeflip',
    title: 'Knowledge flip',
    settings: { scoreboard: false, scoreSlide: false, defaultTime: 0, confidence: false, defaultPoints: 1 },
    seeds: [
      { term: 'Osmosis', question: 'Osmosis', definition: 'Diffusion of water across a partially permeable membrane', studySeconds: 0 },
      { term: 'Active transport', question: 'Active transport', definition: 'Movement of substances against a concentration gradient using energy', studySeconds: 0 },
      { term: 'Diffusion', question: 'Diffusion', definition: 'Net movement of particles from high to low concentration', studySeconds: 0 },
      { term: 'Enzyme', question: 'Enzyme', definition: 'A biological catalyst that speeds up chemical reactions', studySeconds: 0 }
    ]
  },
  'heads-up': {
    style: 'headsup',
    title: 'Heads up',
    settings: { scoreboard: true, scoreSlide: true, defaultTime: 60, confidence: false, defaultPoints: 1 },
    seeds: [
      { term: 'Photosynthesis', question: 'Photosynthesis', category: 'Biology', explanation: 'Plants using sunlight, water and CO2 to create glucose and oxygen.' },
      { term: 'Mitochondrion', question: 'Mitochondrion', category: 'Biology', explanation: 'The organelle responsible for aerobic cellular respiration.' },
      { term: 'Gravity', question: 'Gravity', category: 'Physics', explanation: 'The attractive force between masses in the universe.' }
    ]
  },
  'spin-explain': {
    style: 'spinexplain',
    title: 'Spin & explain',
    settings: { scoreboard: true, scoreSlide: true, defaultTime: 20, confidence: false, defaultPoints: 2 },
    seeds: [
      { term: 'Respiration', question: 'Respiration', hint: 'Energy from glucose', explanation: 'Cellular reaction releasing energy in the form of ATP.' },
      { term: 'Diffusion', question: 'Diffusion', hint: 'Particle spread', explanation: 'Movement of particles from high to low concentration.' },
      { term: 'Osmosis', question: 'Osmosis', hint: 'Water movement', explanation: 'Movement of water molecules across a partially permeable membrane.' }
    ]
  },
  'connection-maker': {
    style: 'connection',
    title: 'Connection maker',
    settings: { scoreboard: true, scoreSlide: true, defaultTime: 0, confidence: false, defaultPoints: 1 },
    seeds: [
      { itemA: 'Photosynthesis', itemB: 'Respiration', question: 'How do photosynthesis and respiration connect?', explanation: 'Photosynthesis produces glucose and oxygen, which respiration consumes to release energy.' },
      { itemA: 'CPU', itemB: 'RAM', question: 'How do the CPU and RAM connect?', explanation: 'The CPU reads and executes instructions and data held in RAM.' }
    ]
  },
  'concept-chain': {
    style: 'conceptchain',
    title: 'Concept chain',
    settings: { scoreboard: true, scoreSlide: true, defaultTime: 45, confidence: false, defaultPoints: 1 },
    seeds: [
      { term: 'Cell', prompt: 'The basic unit of living things — what connects next?' },
      { term: 'Tissue', prompt: 'Groups of similar cells — how does this link onward?' },
      { term: 'Organ', prompt: 'Tissues working together — what comes after?' },
      { term: 'System', prompt: 'Organs cooperating — how does this reach the organism?' }
    ]
  },
  'random-challenge': {
    style: 'randomchallenge',
    title: 'Random challenge',
    settings: { scoreboard: false, scoreSlide: false, defaultTime: 0, confidence: false },
    seeds: [
      { challenge: 'Explain this idea to someone who missed the last lesson.', question: 'Explain this idea to someone who missed the last lesson.', explanation: 'Summarize the core concept clearly without jargon.' },
      { challenge: 'Draw a diagram of the process on the board in 30 seconds.', question: 'Draw a diagram of the process on the board in 30 seconds.', explanation: 'Sketch the key stages with accurate labels.' }
    ]
  },
  'bingo': {
    style: 'bingo',
    title: 'Bingo',
    settings: { scoreboard: false, scoreSlide: false, defaultTime: 0, confidence: false, mode: 'teams' },
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
    ]
  },
  'quiz-bowl': {
    style: 'bowl',
    title: 'Quiz bowl',
    settings: { scoreboard: false, scoreSlide: false, defaultTime: 0, confidence: false, mode: 'teams', bowlTarget: 1000 },
    seeds: [
      { category: 'Cells', pointValue: 100, question: 'What is the jelly inside a cell called?', answer: 'Cytoplasm' },
      { category: 'Cells', pointValue: 200, question: 'What molecule carries genetic information?', answer: 'DNA' },
      { category: 'Cells', pointValue: 300, question: 'Which organelle releases energy in respiration?', answer: 'The mitochondrion' },
      { category: 'Transport', pointValue: 100, question: 'Which way do particles move in diffusion?', answer: 'From high to low concentration' },
      { category: 'Transport', pointValue: 200, question: 'What is the movement of water across a partially permeable membrane?', answer: 'Osmosis' },
      { category: 'Transport', pointValue: 300, question: 'Which kind of transport needs energy from respiration?', answer: 'Active transport' },
      { category: 'Enzymes', pointValue: 100, question: 'What kind of molecule is an enzyme?', answer: 'A protein' },
      { category: 'Enzymes', pointValue: 200, question: 'What happens to an enzyme above its optimum temperature?', answer: 'It denatures' },
      { category: 'Enzymes', pointValue: 300, question: 'What is the molecule an enzyme acts on called?', answer: 'The substrate' }
    ]
  },
  'slider': {
    style: 'slider',
    title: 'Numerical estimate',
    settings: { scoreboard: true, scoreSlide: true, defaultTime: 20 },
    seeds: [
      { question: 'In what year was the World Wide Web invented at CERN?', min: 1970, max: 2010, target: 1989, tolerance: 3, unit: 'year', explanation: 'Tim Berners-Lee invented the World Wide Web in 1989.' },
      { question: 'What percentage of the Earth’s surface is covered by water?', min: 0, max: 100, target: 71, tolerance: 5, unit: '%', explanation: 'Oceans and seas cover approximately 71% of Earth.' }
    ]
  },
  'choice': {
    style: 'choice',
    title: 'Multiple choice quiz',
    settings: { scoreboard: true, scoreSlide: true, defaultTime: 20 },
    seeds: [
      { question: 'What is the main gas found in Earth’s atmosphere?', options: ['Nitrogen', 'Oxygen', 'Carbon dioxide', 'Argon'], correct: 0, explanation: 'Nitrogen makes up approximately 78% of the atmosphere.' },
      { question: 'Which particle carries a positive electrical charge?', options: ['Proton', 'Neutron', 'Electron', 'Photon'], correct: 0, explanation: 'Protons are positively charged and located in the atomic nucleus.' },
      { question: 'What is the freezing point of water on the Celsius scale?', options: ['0°C', '32°C', '100°C', '-10°C'], correct: 0, explanation: 'Pure water freezes at 0°C (32°F) at standard atmospheric pressure.' }
    ]
  },
  'type': {
    style: 'type',
    title: 'Short answer retrieval',
    settings: { scoreboard: true, scoreSlide: true, defaultTime: 30 },
    seeds: [
      { question: 'What organelle is known as the powerhouse of the cell?', accept: ['mitochondria', 'mitochondrion'], explanation: 'Mitochondria generate most of the chemical energy needed to power the cell.' },
      { question: 'What is the chemical symbol for gold?', accept: ['Au'], explanation: 'From the Latin aurum, meaning shining dawn.' },
      { question: 'What gas do plants absorb during photosynthesis?', accept: ['carbon dioxide', 'CO2'], explanation: 'Plants use carbon dioxide and water to produce glucose and oxygen.' }
    ]
  },
  'order': {
    style: 'order',
    title: 'Ranking challenge',
    settings: { scoreboard: true, scoreSlide: true, defaultTime: 0 },
    seeds: [
      { question: 'Put these British history events in order, earliest first.', options: ['Roman invasion of Britain', 'Norman conquest', 'English Civil War', 'First World War'], explanation: 'AD 43, 1066, 1642, 1914. Part marks for items placed correctly.' },
      { question: 'Order these memory speeds from fastest to slowest.', options: ['CPU Registers', 'Cache Memory', 'RAM', 'Hard Drive'], explanation: 'Registers on the CPU die are fastest, followed by cache, main RAM, and secondary storage.' }
    ]
  }
};

/**
 * Creates a valid, problem-free showcase game for any format or style.
 * If the provided game already has questions with zero validation errors and forceSample is not true,
 * returns that game. Otherwise, constructs a complete showcase game from curated seeds.
 *
 * @param {import('../types.js').Game|string} gameOrStyle
 * @param {{ forceSample?: boolean, theme?: string }} [opts]
 * @returns {import('../types.js').Game}
 */
function getShowcaseGame(gameOrStyle, opts) {
  opts = opts || {};
  /** @type {import('../types.js').Game | null} */
  var gameObj = (typeof gameOrStyle === 'object' && gameOrStyle !== null) ? gameOrStyle : null;
  /** @type {import('../types.js').GameStyleKey} */
  var style = (gameObj ? gameObj.style : /** @type {import('../types.js').GameStyleKey} */ (gameOrStyle)) || 'choice';
  var format = (gameObj && gameObj.format) ? gameObj.format : '';
  if (!format) {
    var mapped = formatStyle(style);
    format = mapped || style;
  }
  /** @type {import('../types.js').ThemeKey} */
  var theme = (gameObj && gameObj.theme) || /** @type {import('../types.js').ThemeKey} */ (opts.theme || 'midnight');

  // Check if current game is already valid and not forcing sample
  if (!opts.forceSample && gameObj && Array.isArray(gameObj.questions) && gameObj.questions.length > 0) {
    var engine = /** @type {any} */ (GAME_STYLES[style] || GAME_STYLES.choice);
    var probs = [];
    if (engine && typeof engine.problems === 'function') {
      probs = gameObj.questions.map(function (q, i) {
        try {
          return engine.problems(q, i + 1, gameObj);
        } catch (_err) {
          return 'Validation error in Q' + (i + 1);
        }
      }).filter(Boolean);
    }
    if (engine && typeof engine.board === 'function') {
      try {
        var bp = engine.board(gameObj);
        if (bp) probs.push(bp);
      } catch (_err) {
        probs.push('Board validation error');
      }
    }
    if (probs.length === 0) {
      return gameObj;
    }
  }

  // Lookup preset by format or style
  var pre = GAME_FORMAT_PRESETS[format] || GAME_FORMAT_PRESETS[style] || null;
  if (!pre) {
    for (var k in FORMAT_STYLE) {
      if (FORMAT_STYLE[k] === style && GAME_FORMAT_PRESETS[k]) {
        pre = GAME_FORMAT_PRESETS[k];
        break;
      }
    }
  }
  /** @type {import('../types.js').GameStyleKey} */
  var targetStyle = /** @type {import('../types.js').GameStyleKey} */ ((pre && pre.style && GAME_STYLES[pre.style]) ? pre.style : (GAME_STYLES[style] ? style : 'choice'));

  var eng = GAME_STYLES[targetStyle];
  var showcaseGame = makeGame((pre && pre.title) || ('Sample ' + (eng ? eng.label : targetStyle)), targetStyle);
  showcaseGame.theme = theme;
  showcaseGame.format = format;
  if (pre && pre.settings) {
    Object.assign(showcaseGame.settings, pre.settings);
  }

  if (pre && pre.seeds && pre.seeds.length) {
    showcaseGame.questions = pre.seeds.map(function (s) {
      var q = makeQuestion(targetStyle);
      Object.assign(q, s);
      if (eng && typeof eng.normalize === 'function') eng.normalize(q);
      return q;
    });
  } else if (pre && pre.seed) {
    var qSingle = makeQuestion(targetStyle);
    Object.assign(qSingle, pre.seed);
    if (eng && typeof eng.normalize === 'function') eng.normalize(qSingle);
    showcaseGame.questions = [qSingle];
  } else {
    if (eng && eng.starters && eng.starters.length) {
      showcaseGame.questions = JSON.parse(JSON.stringify(eng.starters)).map(function (row) {
        var qStar = makeQuestion(targetStyle);
        Object.assign(qStar, row);
        if (typeof eng.normalize === 'function') eng.normalize(qStar);
        return qStar;
      });
    }
  }

  return showcaseGame;
}

export { GAME_FORMAT_PRESETS, getShowcaseGame };
