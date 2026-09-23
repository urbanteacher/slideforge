/* Authored starter copy, separate from the verbatim source catalogue.
 * Labels follow the source steps. Examples are editable teaching material,
 * not claims that the source supplied subject content. Remaps explain the
 * capacity or interaction mismatch they resolve. */
const box = (label, value, i) => ({ label, value, type: 'area', slide: `bullets.${i}.def` });
const text = (label, value, slide = 'title') => ({ label, value, type: 'text', slide });
const rows = (items) => items.map(([label, value], i) => box(label, value, i));
const page = (title, items, minutes) => ({ title, layout: 'keywords', fields: rows(items), minutes });
const preset = (items, extra = {}) => ({ layout: 'keywords', fields: rows(items), ...extra });

/** @type {Record<string, any>} */
const PRESETS = {
  'clear-objectives-slide': preset([
    ['Learning objectives', 'Measure length · Calculate perimeter · Explain your method.'],
    ['Success criteria', 'I can label lengths, add every side and give the correct unit.'],
    ['Key words', 'Length: distance along a line. Perimeter: distance around a shape.']
  ], { fieldsTitle: 'Measuring the world around us' }),
  'hook-objectives': preset([
    ['Stimulus', 'Two gardens have the same area. Do they need the same amount of fencing?'],
    ['Big question', 'How can we work out the distance around any shape?'],
    ['Today we will…', 'Measure a shape · Find its perimeter · Design a garden.'],
    ["By the end you’ll be able to…", 'Calculate a perimeter and explain how you checked it.']
  ], { reason: 'Four explicitly presented boxes need labels; split reserves half the slide for an image.' }),
  'daily-review-routine': preset([
    ['Homework check', 'Compare your method with a partner. Mark one step you want to discuss.'],
    ['Common errors', 'Did you miss a side, mix units or calculate area instead of perimeter?'],
    ['Guided practice', 'A 6 cm × 4 cm rectangle: 6 + 4 + 6 + 4 = 20 cm. Try 7 cm × 3 cm.'],
    ['Today’s link', 'Today we’ll build on this by finding missing side lengths.']
  ], { reason: 'Four stages overflow the three-card row; labelled rows preserve the sequence.', answer: 'Practice answer: 20 cm. Bring the actual homework answer key and replace the example errors with those observed.' }),
  'establish-talk-ground-rules': preset([
    ['Think · 2 min', 'What makes a group discussion go well, and what makes it go badly? Note one of each.'],
    ['Pair · 3 min', 'Turn each problem into a positive rule. Choose your two most useful.'],
    ['Share · 3 min', 'Send your pair’s most useful rule, written as something we do.'],
    ['Agree · 2 min', 'Agree 5–7 rules together. Which rule will we practise first?']
  ], { reason: 'The source drafts the rules in pairs and agrees them as a class. As stages, the drafts arrive from the phones as anonymous cards and the teacher spotlights the ones to keep.', timer: 10, answer: 'Rules to negotiate towards: listen fully; invite quiet voices; give reasons; question ideas, not people; build on answers. Display the agreed list and revisit it.' }),
  /* Stays a split slide: the picture is the hook, and a staged slide has no
     place for one. What the room wonders arrives as ideas beside it, and the
     teacher spotlights the question that opens the lesson. */
  'hook-and-predict': { target: 'feedback', feedbackKind: 'brainstorm',
    feedback: { prompt: 'What do you wonder? One question about what you can see.', max: 1 },
    reason: 'The notice-and-wonder questions were asked aloud and answered on paper. The wondering now comes from every phone, anonymously, and the teacher spotlights the question the lesson will answer.' },
  'think-pair-share': preset([
    ['Think · 1 min', 'Can two shapes have the same perimeter but different areas? Sketch an idea.'],
    ['Pair · 2 min', 'Compare sketches. Find an example you both think works.'],
    ['Share · 3 min', 'Show your strongest example and explain how you checked it.'],
    ['Connect · 1 min', 'What does this tell us about area and perimeter?']
  ], { answer: 'Example: 1 × 5 and 2 × 4 rectangles both have perimeter 12 units; areas are 5 and 8 square units.' }),
  'do-now-bell-ringer': preset([
    ['Recall', 'Find the perimeter of a rectangle measuring 6 cm by 4 cm.'],
    ['Connection', 'Draw a different rectangle with the same perimeter.'],
    ['Preview', 'Do your two rectangles also have the same area? Explain.']
  ], { timer: 10, answer: '20 cm. For example, 7 × 3 cm has perimeter 20 cm. Areas: 24 cm² and 21 cm². Source estimate is 8 minutes; its timed steps require 10.' }),
  'word-splash': preset([
    ['Key terms', 'Length · Width · Perimeter · Area · Unit · Scale'],
    ['Mark your confidence', 'On paper: circle what you know; underline what is familiar; leave new terms unmarked.'],
    ['Explain to a partner', 'Choose a circled term. Explain it using a drawing or example.'],
    ['Working definitions', 'Agree definitions as a class. Then check your confidence again.']
  ], { feedback: { prompt: 'Which term would you most like us to explain?', max: 1 }, answer: 'The cloud collects vocabulary needs; it cannot circle or underline words. Use the handout for the source’s marking task.' }),
  'knowledge-activation-web': preset([
    ['Topic', 'What do we already know about measurement?'],
    ['Contribute', 'Offer a word, example or idea. Explain how it connects.'],
    ['Find patterns', 'Which ideas belong together? Which connection is missing?'],
    ['Learning goal', 'Use our gaps to choose what we need to investigate today.']
  ], { feedback: { prompt: 'Name one idea connected to measurement.', max: 3 }, answer: 'Draw the connecting lines on the classroom board. A word cloud collects contributions but does not draw a concept web.' }),
  'i-do-we-do-you-do': preset([
    ['I do · 5 min', 'Watch: a 6 × 4 rectangle has perimeter 6 + 4 + 6 + 4 = 20 units.'],
    ['We do · 8 min', 'Find the perimeter of an 8 × 3 rectangle. Explain each step together.'],
    ['You do together · 5 min', 'Draw two different rectangles with perimeter 24 units. Check a partner.'],
    ['You do alone · 7 min', 'A rectangle has perimeter 30 cm and width 5 cm. Find its length.']
  ], { reason: 'The source has four phases, including both You Do stages; three cards obscure that distinction.', timer: 25, answer: 'We do: 22 units. Together: e.g. 8 × 4 and 7 × 5. Alone: 10 cm. Source estimate 20 min; timed steps total 25.' }),
  'concept-development': preset([
    ['Show', 'Perimeter is the distance around a shape. Trace the outside edge of a book.'],
    ['Explain', 'Measure every outside side in the same unit, then add the lengths.'],
    ['Examples / non-examples', 'Fencing a garden measures perimeter. Covering its ground measures area.'],
    ['Guided application', 'A triangle has sides 3 cm, 4 cm and 5 cm. What is its perimeter?'],
    ['Independent practice', 'Draw a shape with perimeter 16 cm. Label every side.']
  ], { timer: 25, answer: 'Triangle: 12 cm. Example independent response: a 4 cm square. Source estimate 20 min; timed steps total 25.' }),
  'flipped-instruction': { pages: [
    page('Review the home learning', [['Recall', 'What is perimeter? Explain without looking at your notes.'], ['Check', 'A 5 × 3 rectangle: is its perimeter 15 or 16 units? Why?'], ['Questions', 'Which part of the home learning needs another explanation?']], 3),
    page('Find the missing length', [['Deep dive', 'A rectangle has perimeter 34 cm and width 6 cm. Find its length.'], ['Think aloud', 'Two widths use 12 cm. The two lengths share the remaining 22 cm.'], ['Explain', 'Why do we divide the remaining length by two?']], 10),
    page('Apply and check', [['Core', 'Find the length when perimeter is 42 cm and width is 8 cm.'], ['Support', 'Draw and label all four sides before calculating.'], ['Challenge', 'Find three rectangles with perimeter 42 cm. Which has the largest area?']], 12)
  ], answer: 'Review: 16 units. Deep dive: 11 cm. Core: 13 cm. With whole-number sides, 10 × 11 has the greatest area for perimeter 42 cm.' },
  'question-cube-six-question-types': preset([
    ['Define', 'What is perimeter?'], ['Compare', 'How is it different from area?'],
    ['Why', 'Why must all side lengths use the same unit?'], ['Example', 'Give a real-world example of using perimeter.'],
    ['What if', 'What would happen if every side length doubled?'],
    ['Benefits / limits', 'What can perimeter tell us about a garden? What can it not tell us?']
  ], { fieldsTitle: 'Six ways to question perimeter', feedback: { prompt: 'Name your question type, then give your answer and reasoning.', max: 5 } }),
  'worked-example-analysis': preset([
    ['Completed example', 'Rectangle 7 cm × 3 cm → 7 + 3 + 7 + 3 → 20 cm.'],
    ['Identify the steps', 'What happened? Why? Explain the unit and each number in the sum.'],
    ['Create a recipe', 'With a partner, write a method someone else could follow.'],
    ['Test it', 'Try your recipe on a rectangle measuring 9 cm by 2 cm.']
  ], { reason: 'A text worked example plus analysis, recipe and transfer task needs four labelled rows; an empty image slot adds no teaching material.', timer: 12, answer: 'New perimeter: 22 cm. Source estimate 10 min; timed steps total 12.' }),
  'error-analysis': preset([
    ['Sample work · 3 errors', 'A 6 cm × 4 cm rectangle: “Perimeter = 6 × 4 = 24 cm².”'],
    ['Spot', 'Find the wrong operation, the wrong result and the wrong unit.'],
    ['Correct', 'Rewrite the solution. Explain why each change is needed.'],
    ['Reflect', 'Why might someone confuse area and perimeter? Sketch the difference.']
  ], { target: 'slide', reason: 'Odd One Out reveals one odd item; the source requires sample work with several errors and a correction. Use a labelled analysis slide with the answer in teacher notes.', answer: 'Perimeter = 6 + 4 + 6 + 4 = 20 cm. Multiplication calculated area; 24 is therefore not the perimeter; cm² is an area unit. Distinguish boundary length from surface coverage.' }),
  'quick-practice-stations': preset([
    ['Station 1 · Recall', 'List the facts you need to calculate the perimeter of a rectangle.'],
    ['Station 2 · Apply', 'A noticeboard is 90 cm by 60 cm. How much edging does it need?'],
    ['Station 3 · Create', 'Design a rectangle with perimeter 40 cm. Find a second possible design.']
  ], { layout: 'cards', answer: 'Apply: 300 cm. Create: e.g. 12 × 8 cm and 11 × 9 cm. Allow 3 minutes per station and 1 minute to share.' }),
  'concept-card-sort': preset([
    ['Cards 1–4', 'Fence length · Floor covering · Picture-frame edging · Carpet needed'],
    ['Cards 5–8', 'Garden boundary · Paint for a wall · Ribbon around a box · Lawn turf'],
    ['Cards 9–12', 'Track boundary · Tabletop covering · Window trim · Tile coverage'],
    ['Sort and justify', 'Cut these into 12 cards. Group them by what is measured. Name your categories.'],
    ['Compare', 'Visit another group. Which organisation is most useful? Why?']
  ], { target: 'slide', reason: 'Ranking enforces one linear order and at most eight items. The source requires 12–15 cards in student-chosen categories; use physical cards with the full bank on screen.', answer: 'One defensible sort is boundary length versus surface area: cards 1,3,5,7,9,11 versus 2,4,6,8,10,12. Accept other justified organisations.' }),
  'strategic-wait-time-questioning': preset([
    ['Question', 'Can a shape have a larger perimeter but a smaller area than another shape?'],
    ['Think', 'Wait 3–5 seconds. Prepare a reason before anyone is called on.'],
    ['Respond', 'Take 3 seconds to form your answer. Use a sketch if it helps.'],
    ['Follow up', 'Pause 2 seconds. Ask: “What example supports that?”']
  ], { answer: 'Use name sticks/cards. Seven questions: (1) Can a larger perimeter enclose less area? (2) Why does perimeter use linear units? (3) Can equal areas have different perimeters? (4) How would you find a missing side? (5) What happens when all lengths double? (6) Why must units match before adding? (7) How can a drawing check your answer? Example for Q1: 1 × 10 (P22, A10) versus 4 × 4 (P16, A16). Allow the source’s pauses for each response.' }),
  'guided-inquiry-investigation': { pages: [
    page('Explore · same boundary, different space', [['Investigate', 'Use 24 unit lengths to make different rectangles on squared paper.'], ['Record', 'List length, width, perimeter and area for each rectangle.'], ['Look for patterns', 'What happens to area when the sides become more equal?']], 10),
    page('Explain the pattern', [['Claim', 'Which rectangle encloses the greatest area in your results?'], ['Evidence', 'Use at least two measurements to support your explanation.'], ['Test', 'Does your rule explain all the rectangles you tried?']], 8),
    page('Apply to a new boundary', [['New situation', 'You now have 32 unit lengths. Predict the best rectangle before drawing.'], ['Check', 'Calculate and compare at least three possible designs.'], ['Refine', 'Does the same pattern still hold?']], 7),
    page('Share and refine', [['Present', 'Show your claim, evidence and a labelled diagram.'], ['Question', 'Ask another group how they tested their prediction.'], ['Conclude', 'Agree a rule and state what shapes you tested it on.']], 5)
  ], answer: 'For rectangles: perimeter 24 gives greatest area at 6 × 6 (36); perimeter 32 at 8 × 8 (64). Restrict the claim to rectangles; this investigation does not prove a rule for all shapes.' },
  'jigsaw-expert-groups': preset([
    ['Home groups · 5 min', 'Assign four experts: length, perimeter, area and units.'],
    ['Expert groups · 12 min', 'Use the reference notes. Prepare a definition, a worked example and a check question.'],
    ['Return home · 12 min', 'Each expert teaches for 3 minutes. Build one shared measurement guide.']
  ], { answer: 'Reference notes: length measures a line (cm); perimeter sums boundary lengths (cm); rectangle area = length × width (cm²); 1 m = 100 cm. Supply rulers, squared paper and these four notes as expert cards.' }),
  'problem-based-learning': preset([
    ['Problem', 'A school has 40 m of fencing for a rectangular garden. Choose a design with room to grow.'],
    ['What do we know?', 'All four sides need fencing. The total boundary is 40 m.'],
    ['What do we need to know?', 'What are possible dimensions? What makes one design better?'],
    ['Research and plan', 'Sketch three designs. Calculate their areas and note your assumptions.'],
    ['Solve', 'Choose a design and show the calculations that support it.'],
    ['Present and justify', 'Explain your choice. How would an entrance change your plan?']
  ], { reason: 'Six named stages cannot be expressed by one column plus an image; labelled rows retain every stage.', timer: 40, answer: 'With four fully fenced sides, a 10 × 10 m square maximises rectangular area (100 m²). Other choices need a stated constraint. Source estimate 35 min; steps total 40.' }),
  'differentiated-practice-menu': preset([
    ['Must do · 10 min', 'Find the perimeter of 6 × 4, 8 × 3 and 5 × 5 cm rectangles. Show your method.'],
    ['Consolidate', 'Draw each shape and label all four sides before adding.'],
    ['Apply', 'A rectangle has perimeter 28 cm and width 5 cm. Find its length.'],
    ['Extend', 'Find all whole-number rectangles with perimeter 28 cm. Compare their areas.']
  ], { reason: 'The compulsory task plus three choices needs four named boxes, beyond the three-card row.', answer: 'Must do: 20, 22, 20 cm. Apply: 9 cm. Extend: 1×13 through 7×7; largest area 49 cm². Choose a route for the remaining 15 minutes; routes are not fixed ability labels.' }),
  'design-and-create-task': preset([
    ['Brief', 'Create a garden plan using 40 m of fencing. Show its dimensions and area.'],
    ['Planning · 5 min', 'Sketch two ideas. Choose a scale and gather a ruler and squared paper.'],
    ['Creating · 20 min', 'Draw your final design and explain why you chose it.'],
    ['Self-assessment · 3 min', 'Check: labelled sides, stated scale, correct perimeter and area, clear reasoning.'],
    ['Gallery walk · 5 min', 'Find a design unlike yours. Leave one question about its choices.']
  ], { reason: 'Five source stages need five labels; cards wraps and hides the distinction between brief and success criteria.', answer: 'Assume all four sides are fenced; no gate allowance. Example: 10 × 10 m, perimeter 40 m, area 100 m²; scale 1 cm to 1 m.' }),
  'think-pair-square-share': preset([
    ['Think · 2 min', 'What makes a mathematical explanation convincing? Write two features.'],
    ['Pair · 3 min', 'Compare your features. Add an example of each.'],
    ['Square · 4 min', 'Join another pair. Agree the three most useful features.'],
    ['Share · 4 min', 'Present one feature and an example. Explain your choice.']
  ]),
  'jigsaw-collaboration': preset([
    ['Home · 2 min', 'Assign each person one part: length, perimeter, area or units.'],
    ['Expert · 10 min', 'Study your reference card. Prepare an example and one question to check understanding.'],
    ['Return · 8 min', 'Take turns teaching. Combine all four parts into a shared guide.']
  ], { answer: 'Reference cards: length is distance along a line (cm); perimeter is boundary length (cm); rectangle area = length × width (cm²); 1 m = 100 cm. Ask experts to illustrate each with a 6 × 4 cm rectangle.' }),
  'peer-teaching-carousel': preset([
    ['Setup', 'Four stations: define perimeter; correct 6×4=24; design P=20; compare area and perimeter.'],
    ['Rotate · every 4 min', 'Read the previous work. Add a reason, a correction or a new example.'],
    ['Final round · 5 min', 'Return to your first station. Summarise what improved and what remains unclear.'],
    ['Present', 'Share the strongest contribution and explain why it helped.']
  ], { timer: 21, answer: 'Four rotations take 16 minutes plus 5 to synthesise, before presentations. Source estimate is 20 minutes; allow additional sharing time. Station 2: perimeter is 20, not area 24.' }),
  'socratic-seminar': preset([
    ['Discussion prompt', '“The best garden design is always the one with the greatest area.” Do you agree?'],
    ['Inner circle · 8 min', 'Use a diagram, calculation or stated constraint as evidence. Build on another speaker.'],
    ['Switch · 8 min', 'Observers become speakers. Test an assumption from the first round.'],
    ['Debrief · 4 min', 'Which argument was convincing? What evidence changed your thinking?']
  ], { answer: 'Outer-circle observation: record one claim, its evidence and one unanswered question. Consider access, cost and purpose; there is no single predetermined stance.' }),
  'dialogue-chain-discussion': preset([
    ['Discussion question', 'Can two rectangles have equal area but different perimeters?'],
    ['Initial answer', 'My answer is… My example is…'],
    ['Agree / disagree', 'I agree/disagree because…'],
    ['Build on an idea', 'Building on that idea…'],
    ['Synthesis', 'Which example gives us the clearest answer?']
  ], { reason: 'A question and distinct sentence stems need labels; the source includes more than three contributions.', answer: 'Example: 2 × 6 and 3 × 4 both have area 12; perimeters are 16 and 14. Invite 8–10 speakers; allow each 30 seconds.' }),
  'real-world-connection-hunt': preset([
    ['Concept', 'Perimeter: the distance around a shape.'],
    ['In this room · 3 min [send]', 'Find an object here where its boundary length matters. Send it, and why.'],
    ['At home · 3 min [send]', 'Think of something at home that needs edging, trim or a border.'],
    ['In our community · 3 min [send]', 'Find a use for fencing or boundary measurement near here.'],
    ['Reflect', 'Why does this concept matter in real life?']
  ], { target: 'moment', reason: 'Three timed hunts under one clock, with one box for every find, lost where each find was made. As stages, each place has its own clock and its own idea box, and the teacher spotlights the best find from each.' }),
  'benefits-vs-limitations-battle': preset([
    ['Topic', 'Should every school replace part of its playground with a garden?'],
    ['Benefits team', 'Give a benefit and explain who would gain from it.'],
    ['Limitations team', 'Give a limitation and explain when it would matter.'],
    ['Scoring', 'Valid new point: 1. Repeated point: 0. Take 30 seconds to think before each round.'],
    ['Balanced view', 'What conditions would make the proposal work well?']
  ], { reason: 'Split is a text/image layout, not two equal text teams; labelled rows make both roles and scoring visible.' }),
  'scenario-analysis-discussion': preset([
    ['Three scenarios', '① A concert sells out quickly: more people want tickets than there are seats. ② A large harvest puts many more apples on sale while demand stays steady. ③ A new phone attracts many buyers, but the first delivery is small.'],
    ['Identify and explain · 6 min [talk]', 'Which scenarios show supply and demand? Pick one and explain how.'],
    ['Predict and compare · 6 min', 'What might happen next? Which effect could be strongest? State your assumptions.'],
    ['Report back · 4 min', 'Send your group’s strongest prediction, and the assumption it rests on.']
  ], { fieldsTitle: 'Supply and demand: three scenarios', timer: 18, reason: 'The source asks for three scenarios and guiding questions; a split image slot cannot hold them. As stages the three scenarios stay pinned while the groups work through the questions, and the predictions come back as cards.', answer: 'All three illustrate supply and demand. Other things equal, scarce concert tickets or phones create upward price pressure; an apple surplus creates downward pressure. No strongest case can be established without quantities and market rules.' }),
  'whiteboards-on-walls': preset([
    ['Problem', 'Find three rectangles with perimeter 24 units. Which has the greatest area?'],
    ['Discuss and draw · 5 min', 'Show dimensions, calculations and your reasoning on the board.'],
    ['Gallery walk · 3 min', 'Find a useful method or a claim you want to question.'],
    ['Refine · 2 min', 'Improve your work. Mark the change and explain why you made it.'],
    ['Debrief · 1 min', 'Which representation made the reasoning easiest to follow?']
  ], { answer: 'Examples: 2×10 (area20), 4×8 (32), 6×6 (36). Maximum rectangular area is 36. Allow the source’s first minute for moving and posing the problem.' }),
  'connect-four-concept-edition': {
    target: 'slide', layout: 'table', fieldsTitle: 'Match two. Explain the connection.', reason: 'Concept Chain grows spoken links and has no 4×4 matching grid. This activity supplies the source’s Mode A grid for classroom play; cover claimed pairs physically and score on the board.',
    fields: [{ label: '4 × 4 matching grid', type: 'area', slide: 'body', value: '1. Perimeter | 2. 100 cm | 3. Width | 4. 1 cm²\n5. Square | 6. Distance around | 7. Area | 8. 1 m\n9. Space covered | 10. Four equal sides | 11. Length | 12. Across a rectangle\n13. Along a rectangle | 14. Unit of area | 15. 1 m² | 16. 10,000 cm²' }],
    answer: 'Mode A: number cells 1–16 left to right. Pairs: 1–6, 2–8, 3–12, 4–14, 5–10, 7–9, 11–13, 15–16. Teams claim and explain two cells; cover valid pairs with sticky notes or cross them off on a copied grid. First to four valid pairs wins. Mode B is the source’s optional alternative, not an automated mode.'
  },
  'structured-reflection-protocol': preset([
    ['Got it', 'Create a new example and explain why it works.'],
    ['Mostly understand', 'Solve one example, then check the step you are least sure about.'],
    ['Getting there', 'Use the worked example with a partner. Explain each step.'],
    ['Need help', 'Bring your first uncertain step to the teacher. Start with a labelled sketch.']
  ], { feedback: { prompt: 'Which corner best describes your understanding?', options: ['Got it', 'Mostly understand', 'Getting there', 'Need help'], hold: true }, answer: 'Choose a corner or indicate a choice from your seat. Use 2 min to choose, 6 min for the task and 4 min for teacher support.' }),
  'learning-log-entry': preset([
    ['New learning [note]', 'What’s one new thing?'], ['Connections [note]', 'How does this connect?'],
    ['Challenges [note]', 'What was difficult?'], ['Strategies [note]', 'What helped me learn?'], ['Next steps [note]', 'What do I want to work on?']
  ], { reason: 'Five named reflection prompts need visible labels. As stages, each is a private note on the phone, one prompt at a time; the teacher sees only how many have written something.' }),
  'muddiest-point': preset([
    ['Write · 3 min', 'The muddiest point for me is…'], ['Be specific', 'Name the step or idea. Explain where your understanding breaks down.'],
    ['Listen and revisit', 'After the class explanations, write what is clearer and what still needs work.']
  ], { feedback: { prompt: 'The muddiest point for me is…', max: 1 } }),
  'plus-minus-interesting': preset([
    ['Plus · 2 min [send]', 'What worked well?'], ['Minus · 2 min [send]', 'What was challenging?'],
    ['Interesting · 2 min [send]', 'What surprised me?'],
    ['Look back · 3 min', 'One from each column: what do they tell us about next time?']
  ], { reason: 'Three columns the room never filled. As stages, each column is an idea box; the teacher spotlights one from each, and the three stand side by side for the look back.', timer: 9 }),
  'exit-ticket': preset([
    ['What?', 'What did you learn today? Include one example.'], ['So what?', 'Why does this learning matter?'], ['Now what?', 'What will you practise or ask about next?']
  ], { feedbackKind: 'brainstorm', reason: 'Choose the source’s What–So What–Now What format. Written reflections need free text; a poll cannot collect them.', feedback: { prompt: 'What did you learn? Why does it matter? What is your next step?', max: 1 } }),
  'preview-next-lesson': preset([
    ['Today we learned', 'Perimeter measures the boundary. Area measures the space inside.'],
    ['Next lesson we will', 'Investigate how changing a shape affects its area.'],
    ['Preparation task', 'Sketch a rectangular object at home. Estimate its length and width.'],
    ['Closing question', 'If every side length doubles, does the area double too?']
  ], { reason: 'Section only renders a title and subtitle. Four explicit source boxes require labelled rows. The closing question collects a prediction from every phone, so next lesson opens on the room\'s own answers.', target: 'feedback', feedbackKind: 'brainstorm', feedback: { prompt: 'If every side length doubles, does the area double too? Your prediction, and why.', max: 1 }, answer: 'For similar shapes, doubling lengths multiplies area by four. The predictions are in the session report; open the next lesson with them.' }),
  'exit-ticket-2': preset([
    ['3 ideas', 'Write three things you learned from the activity.'], ['2 connections', 'Explain two links to something you already knew.'], ['1 question', 'Ask one question you still want answered.']
  ], { feedbackKind: 'brainstorm', reason: 'Choose the source’s 3–2–1 format; one written submission preserves all three responses, unlike a fixed poll.', feedback: { prompt: 'Share 3 things learned, 2 connections and 1 remaining question.', max: 1 } }),
  'teach-someone': preset([
    ['Partner A · 2 min', 'Today I learned… Explain one idea with an example.'],
    ['Partner B · 1 min', 'Ask: “Why does that work?” and “Can you show another example?”'],
    ['Switch · 3 min', 'Partner B teaches; Partner A asks two questions.'],
    ['Together · 2 min', 'What would we tell someone who missed today?']
  ]),
  'visual-summary': preset([
    ['Choose a format', 'Mind Map · Comic Strip · Sketch Note · One-Pager'],
    ['Create · 6 min', 'Show the key ideas using words, images and connections. Include an example.'],
    ['Share with a partner · 2 min', 'Ask a partner to explain your visual. What could you make clearer?']
  ], { reason: 'Making, then sharing, under one clock. As stages, the formats stay pinned, making is a work stage with its own clock, and sharing is partner talk.' }),
  'reflection-ladder': preset([
    ['Choose your level', '1: Need help → 3: Can practise with support → 5: Can teach others.'],
    ['Explain', 'I’m here because…'], ['Plan', 'To move up I need to…'], ['Share', 'Tell a partner one specific action you will take next.']
  ], { feedback: { prompt: 'Where are you on the learning ladder?', points: 5, lowLabel: 'Need help', highLabel: 'Can teach others', hold: true } })
};

/* These visual treatments reuse the same label/value data. They change the
 * reading order and emphasis, not the task or its required number of boxes. */
const PRESENTATIONS = {
  /* Timed stages: the track, a clock per stage and a job for the phones (see
     activities/stages.js). An activity is staged when at least two of its
     rows carry a time: a routine the room moves through together. A leading
     untimed row (the seminar's question, the problem) is the brief, and
     stays up through every stage. A list the room needs to see whole — Do
     Now's three tasks, a menu, the teacher's own pauses — is not staged. */
  stages: ['think-pair-share', 'think-pair-square-share', 'jigsaw-expert-groups',
    'jigsaw-collaboration', 'peer-teaching-carousel', 'socratic-seminar',
    'teach-someone', 'whiteboards-on-walls', 'i-do-we-do-you-do',
    'design-and-create-task',
    /* And where a stage-only feature is the point: a private note per
       prompt, or an idea box per column or place. */
    'establish-talk-ground-rules', 'real-world-connection-hunt',
    'scenario-analysis-discussion', 'learning-log-entry',
    'plus-minus-interesting', 'visual-summary'],
  steps: ['do-now-bell-ringer', 'strategic-wait-time-questioning',
    'daily-review-routine', 'dialogue-chain-discussion'],
  panels: ['differentiated-practice-menu',
    'structured-reflection-protocol', 'reflection-ladder'],
  brief: ['hook-objectives', 'worked-example-analysis', 'error-analysis',
    'problem-based-learning', 'benefits-vs-limitations-battle',
    'flipped-instruction', 'guided-inquiry-investigation']
};
for (const [view, keys] of Object.entries(PRESENTATIONS)) {
  for (const key of keys) PRESETS[key].presentation = view;
}
export { PRESETS, rows, text };
