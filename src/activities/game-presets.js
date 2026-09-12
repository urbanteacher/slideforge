/* Authored measurement examples. Question counts follow the activity source;
 * answer keys and distractor explanations travel with the editable game. */
const mc = (question, options, correct, explanation) => ({ question, options, correct, explanation });
const recall = [
  ['What is the distance around a shape called?', 'Perimeter'],
  ['How many centimetres are in one metre?', '100'],
  ['What is the perimeter of a square with side 4 cm?', '16 cm'],
  ['What is the area of a 6 cm × 3 cm rectangle?', '18 cm²'],
  ['What unit would you use for the area of a classroom floor?', 'Square metres']
];
const choice = [
  mc('What does perimeter measure?', ['Space inside', 'Distance around', 'Number of corners', 'Mass'], 1, 'Perimeter measures the outside boundary.'),
  mc('A rectangle is 6 cm by 4 cm. What is its perimeter?', ['10 cm', '24 cm', '20 cm', '20 cm²'], 2, '6 + 4 + 6 + 4 = 20 cm. 24 is its area; cm² is an area unit.'),
  mc('A square has side 5 m. What is its area?', ['25 m²', '20 m', '10 m²', '5 m²'], 0, 'Area = 5 × 5 = 25 m².'),
  mc('Which equals 2.5 m?', ['25 cm', '2,500 cm', '250 cm', '0.25 cm'], 2, 'There are 100 cm in each metre: 2.5 × 100 = 250.'),
  mc('A rectangle has perimeter 30 cm and width 5 cm. Its length is…', ['25 cm', '20 cm', '15 cm', '10 cm'], 3, 'Two widths use 10 cm, leaving 20 cm shared by two lengths.'),
  mc('Double both sides of a rectangle. Its area becomes…', ['Twice as large', 'Four times as large', 'Unchanged', 'Eight times as large'], 1, 'Both factors double: (2L) × (2W) = 4LW.')
];
const statements = [
  ['Perimeter is the distance around a shape.', true, 'Trace the boundary to measure perimeter.'],
  ['Area is measured in centimetres rather than square centimetres.', false, 'Area needs square units such as cm².'],
  ['One metre equals 100 centimetres.', true, 'The prefix centi means one hundredth.'],
  ['A 6 cm by 4 cm rectangle has perimeter 24 cm.', false, 'Its perimeter is 20 cm; 24 cm² is its area.'],
  ['A square has four equal sides.', true, 'All four sides have equal length.'],
  ['Rectangles with the same area always have the same perimeter.', false, '2×6 and 3×4 both have area 12, but perimeters 16 and 14.'],
  ['Doubling every side length doubles the perimeter.', true, 'Every term in the boundary sum doubles.'],
  ['Doubling both sides of a rectangle doubles its area.', false, 'The area becomes four times as large.'],
  ['A rectangle with perimeter 20 cm can have sides 6 cm and 4 cm.', true, '6 + 4 + 6 + 4 = 20.'],
  ['One square metre equals 100 square centimetres.', false, '100 cm × 100 cm = 10,000 cm².']
];
const tf = statements.map(([question, yes, explanation]) => ({ question, options: ['True', 'False'], correct: yes ? 0 : 1, explanation }));
const bank = (seeds, defaultTime, settings = {}) => ({ seeds, settings: { defaultTime, scoreboard: false, scoreSlide: false, ...settings } });
/** @type {Record<string, any>} */
const GAME_PRESETS = {
  'quick-retrieval-quiz': { game: bank(recall.map(([question, answer]) => ({ question, answer })), 120), answer: 'Paper recall for 2 minutes, pair check for 2, whole-class review for 3. The answer key is revealed by the retrieval board.' },
  'pre-assessment-quickfire': { game: bank(tf.slice(0, 8), 30, { confidence: true }), answer: 'Use thumbs sideways for Unsure; the digital true/false engine has two answer buttons. Ask for an explanation before revealing. Note confident misconceptions and use them to set learning goals.' },
  'interleaving-mixed-practice': { game: bank([
    choice[0], mc('Earlier learning: what is 7 × 8?', ['54', '56', '64', '48'], 1, '7 groups of 8 = 56.'),
    choice[1], choice[2], mc('Earlier learning: half of 34 is…', ['16', '17', '18', '68'], 1, '34 ÷ 2 = 17.'),
    choice[3], mc('Earlier learning: 0.5 is equivalent to…', ['1/5', '5/100', '1/2', '2/1'], 2, '0.5 = 5/10 = 1/2.'),
    choice[4], choice[5], mc('Earlier learning: 36 ÷ 4 equals…', ['6', '8', '9', '12'], 2, '4 × 9 = 36.')
  ], 0), answer: 'Ten questions: six measurement questions interleaved with four earlier arithmetic questions. For the source protocol, work on paper for 8 minutes before revealing; pair-check for 3 and discuss transfer for 3. Replace earlier topics with your class’s actual learning history.' },
  'explanation-champion-challenge': { game: bank([
    { term: 'Perimeter', category: 'Measurement', hint: 'Banned: around, outside, edge, boundary', explanation: 'The total length of all sides of a shape.' },
    { term: 'Area', category: 'Measurement', hint: 'Banned: space, inside, square, surface', explanation: 'How much flat covering a shape needs.' },
    { term: 'Rectangle', category: 'Shapes', hint: 'Banned: four, sides, right, angles', explanation: 'A quadrilateral with each corner measuring 90 degrees.' },
    { term: 'Metre', category: 'Units', hint: 'Banned: length, hundred, centimetres, ruler', explanation: 'A standard distance unit, equal to 1,000 millimetres.' }
  ], 60), answer: 'Allow 2 minutes to plan before the first explanation. Banned words appear as the hint. Run the source’s Clear=2 / Okay=1 / Unclear=0 class vote on paper; Heads Up’s Correct/Pass control does not implement that rubric.' },
  'compare-and-contrast-venn-activity': { game: bank([
    { question: 'Compare area and perimeter. Draw a Venn diagram before the reveal.', itemA: 'Area', itemB: 'Perimeter', similarities: 'Both measure an aspect of a shape; both need stated units.', differences: 'Area measures surface coverage in square units. Perimeter measures boundary length in linear units.' },
    { question: 'Compare these two rectangles. What belongs in the overlap?', itemA: '2 cm × 6 cm rectangle', itemB: '3 cm × 4 cm rectangle', similarities: 'Both have four right angles and area 12 cm².', differences: 'Perimeters are 16 cm and 14 cm respectively.' },
    { question: 'Compare these equal-perimeter rectangles.', itemA: '1 cm × 5 cm rectangle', itemB: '2 cm × 4 cm rectangle', similarities: 'Both are rectangles with perimeter 12 cm.', differences: 'Their areas are 5 cm² and 8 cm² respectively.' }
  ], 0), answer: 'Use the first comparison for the 15-minute source protocol; the board requires three comparisons, so two transfer examples are supplied for optional follow-up. Students draw Venn diagrams on paper; the engine displays two concepts and reveals similarities/differences.' },
  'multiple-choice-quiz': { game: bank(choice, 40) },
  'true-false-rapid-fire': { game: bank(tf, 20, { confidence: true }), answer: 'Ten statements mix recall and misconceptions. Accept sideways thumbs for Unsure; digital answers remain True/False. Discuss errors after the rapid round.' },
  'short-answer-check': { game: bank(recall.map(([question, answer], i) => ({ question, accept: [answer, ...([[], ['one hundred'], ['16', '16 centimetres'], ['18', '18 square centimetres'], ['m²', 'm2', 'square meters']][i])], explanation: answer })), 48), answer: 'For the source’s peer-marking method, write answers on paper for 4 minutes, swap for 1, mark with the reveal for 2 and discuss for 1. Digital typing is also available; inspect accepted spellings in Quiz studio.' },
  'diagnostic-question': { game: bank([
    mc('A 6 cm × 4 cm rectangle has perimeter… Explain your choice before the reveal.', ['10 cm', '24 cm', '20 cm', '20 cm²'], 2, 'A adds two sides only. B calculates area. C correctly adds all four sides. D has the right number with an area unit. Ask each group to explain before reteaching.'),
    mc('A 7 cm × 3 cm rectangle has perimeter… What changed in your method?', ['21 cm', '20 cm²', '10 cm', '20 cm'], 3, '21 calculates area; 20 cm² uses the wrong unit; 10 omits two sides; 20 cm is correct. Use this second question to check the correction.')
  ], 0, { confidence: true }), answer: 'Take explanations before revealing. Use Q1 to diagnose, spend 2 minutes addressing the observed misconception, then use Q2 as the check.' },
  'recap-quiz-game': { game: bank(choice, 40, { scoreboard: true, scoreSlide: true, defaultPoints: 1000 }), answer: 'Quick-Fire is the selected source option: six 40-second questions fill 4 minutes, followed by 2 minutes discussing common errors.' }
};
export { GAME_PRESETS };
