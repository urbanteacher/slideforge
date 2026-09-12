/*
 * The activity catalogue: the 54 activities, as the source records them.
 *
 * Carried over from activity-catalog-app rather than reinvented. Names,
 * durations and steps are that source's, unchanged. The target and primitive
 * on each row are the mapping in docs/pedagogy-architecture-and-catalogue.md,
 * and every style, layout and feedback kind it names has been checked to
 * exist here — tests/activities.test.js fails if one stops existing.
 *
 * Data, not behaviour. Choosing an entry says which of five things to make:
 *
 *   slide      a deck slide in a named layout
 *   game       a quiz game, built by Quiz studio's engines
 *   feedback   an audience prompt attached to the slide on screen
 *   moment     a timed protocol run in the room, with no screen component
 *   slide-arc  a run of slides; not buildable in one step yet
 *
 * Note the shape: 20 slides and 10 moments against 13 games. Most of a lesson
 * is not a quiz, and a catalogue that led with games would be describing a
 * different product.
 *
 * There is deliberately no `research` field. The source stores name,
 * duration, description and steps and carries no citation data at all; the
 * Rosenshine and EEF attributions in the doc were written alongside it rather
 * than drawn from it. A citation a teacher might repeat to a head of
 * department should be sourced before it is stored.
 */

/**
 * @typedef {import("../types.js").Activity} Activity
 * @typedef {import("../types.js").Phase} Phase
 * @typedef {import("../types.js").PhaseKey} PhaseKey
 */

/** The eleven phases, in the order a lesson runs through them. */
/** @type {Phase[]} */
const PHASES = [
  { key: 'starter-slide',    label: 'Starter Slide',    icon: '▤', blurb: 'Put the destination on the wall before anything else.' },
  { key: 'starter-activity', label: 'Starter Activity', icon: '◎', blurb: 'Settle the room and pull back what they already know.' },
  { key: 'activation',       label: 'Activation',       icon: '✦', blurb: 'Surface prior thinking, including the wrong kind.' },
  { key: 'construction',     label: 'Construction',     icon: '◧', blurb: 'Build the idea: model it, name its edges.' },
  { key: 'mini-activity',    label: 'Mini Activity',    icon: '⚡', blurb: 'A short go at it while the modelling is still warm.' },
  { key: 'main-activity',    label: 'Main Activity',    icon: '▣', blurb: 'The long piece of work the lesson is for.' },
  { key: 'collaboration',    label: 'Collaboration',    icon: '▦', blurb: 'Make them say it out loud to somebody.' },
  { key: 'mini-quiz',        label: 'Mini Quiz',        icon: '?', blurb: 'Find out who has it, while there is time to act.' },
  { key: 'reflection',       label: 'Reflection',       icon: '↺', blurb: 'What stuck, what did not, and what to do about it.' },
  { key: 'plenary',          label: 'Plenary',          icon: '⚑', blurb: 'Close it, and point at what comes next.' },
  { key: 'activity-plenary', label: 'Activity Plenary', icon: '⚐', blurb: 'Close on the work rather than on the clock.' }
];

/** @type {Activity[]} */
const ACTIVITIES = [
  {
    key: 'clear-objectives-slide', icon: '▤', title: 'Clear Objectives Slide',
    blurb: 'Display learning objectives, success criteria, and key words',
    phase: 'starter-slide', minutes: 2, target: 'slide', layout: 'keywords',
    steps: [
      'Display slide with: Title, Learning Objectives (3), Success Criteria (I can...), Key Words',
      'Teacher reads objectives aloud',
      'Get started with active learning'
    ]
  },
  {
    key: 'hook-objectives', icon: '▤', title: 'Hook + Objectives',
    blurb: 'Engaging stimulus + big question + today\'s activities',
    phase: 'starter-slide', minutes: 2, target: 'slide', layout: 'split',
    steps: [
      'Show engaging image/video/question',
      'Present Big Question that will be answered',
      'Show: Today we will... (3 activities)',
      'Show: By the end you\'ll be able to...'
    ]
  },
  {
    key: 'connection-slide', icon: '▤', title: 'Connection Slide',
    blurb: 'Last lesson → Today → Next lesson + Why it matters',
    phase: 'starter-slide', minutes: 2, target: 'slide',
    /* keywords, not the doc's cards. Each of the five steps names a box and
       what goes in it, and keywords is the layout that draws a label beside
       its text; cards draws five unlabelled tiles three-wide, so two wrap and
       none says which is which. The doc's own note reads "Yesterday → Today →
       Tomorrow" — three boxes — the shape it was written for before the
       source grew to five. */
    layout: 'keywords',
    steps: [
      'Show: Last Lesson (brief recap)',
      'Show: Today (what we\'re learning)',
      'Show: Next Lesson (where we\'re going)',
      'Show: Why This Matters (real-world connection)',
      'Show: What You\'ll Do (3 activities)'
    ],
    /* One box per step. The labels are the steps' own, so all a teacher fills
       in is the content. */
    fields: [
      { label: 'Last lesson', type: 'text', slide: 'bullets.0.def',
        value: 'A one-line recap of where we got to.',
        hint: 'Brief. They were there — a hook back, not a re-teach.' },
      { label: 'Today', type: 'text', slide: 'bullets.1.def',
        value: 'What we are learning today.' },
      { label: 'Next lesson', type: 'text', slide: 'bullets.2.def',
        value: 'Where this is going.' },
      { label: 'Why this matters', type: 'text', slide: 'bullets.3.def',
        value: 'Where this shows up outside the room.',
        hint: 'The real-world connection — the part they actually remember.' },
      { label: 'What you will do', type: 'area', slide: 'bullets.4.def',
        value: 'Measure · Draw to scale · Check a partner',
        hint: 'The three activities on one line. Separate them how you like.' }
    ]
  },
  {
    key: 'quick-retrieval-quiz', icon: '◎', title: 'Quick Retrieval Quiz',
    blurb: 'Answer 3-5 questions from memory to recall prior learning',
    phase: 'starter-activity', minutes: 7, target: 'game', style: 'lowstakes',
    steps: [
      'Students answer 3-5 recall questions individually',
      'Pair check answers (2 mins)',
      'Whole class review and discussion (3 mins)',
      'Link to today\'s objective'
    ]
  },
  {
    key: 'think-pair-share', icon: '◎', title: 'Think-Pair-Share',
    blurb: 'Individual thinking → Partner discussion → Share out',
    phase: 'starter-activity', minutes: 7, target: 'moment',
    steps: [
      'Think alone (1 min) - jot down ideas about [topic]',
      'Share with partner (2 mins) - compare notes',
      'Pairs share best ideas (3 mins) - class discussion',
      'Teacher synthesizes (1 min) - connect to today\'s goal'
    ]
  },
  {
    key: 'hook-and-predict', icon: '◎', title: 'Hook & Predict',
    blurb: 'Present intriguing stimulus and ask \'What do you notice? What do you wonder?\'',
    phase: 'starter-activity', minutes: 7, target: 'slide', layout: 'split',
    steps: [
      'Show attention-grabbing stimulus (30 secs)',
      'Students write 2 things they notice (1 min)',
      'Students write 1 thing they wonder (1 min)',
      'Share out observations and questions (3 mins)',
      'Link to today\'s learning objective (1 min)'
    ],
    /* The two questions are the activity — the blurb states them verbatim —
       so they arrive written rather than as empty pits. The stimulus is the
       teacher's, because only they know what the lesson is about. */
    fields: [
      { label: 'The stimulus', type: 'text', slide: 'title',
        value: 'What is going on here?',
        hint: 'The line above the image. Keep it short — the picture is doing the work.' },
      { label: 'Question 1', type: 'text', slide: 'bullets.0',
        value: 'What do you notice?',
        hint: 'Observation. Answerable by anyone looking at it.' },
      { label: 'Question 2', type: 'text', slide: 'bullets.1',
        value: 'What do you wonder?',
        hint: 'Curiosity. This is the one that opens the lesson.' },
      { label: 'Timer', type: 'minutes', slide: 'timeLimit', value: 7,
        hint: 'Shown on the wall while they look. The five steps add up to this.' }
    ]
  },
  {
    key: 'word-splash', icon: '◎', title: 'Word Splash',
    blurb: 'Connect key vocabulary to prior knowledge through self-assessment',
    phase: 'starter-activity', minutes: 7, target: 'feedback', feedbackKind: 'wordcloud',
    steps: [
      'Display 5-8 key terms for today\'s lesson',
      'Students circle terms they know well',
      'Underline terms they\'ve heard but unsure',
      'Leave blank terms they don\'t know',
      'Partner discussion (2 mins): Explain circled terms',
      'Class creates working definitions (3 mins)',
      'Self-assess confidence: 🟢🟡🔴'
    ]
  },
  {
    key: 'daily-review-routine', icon: '◎', title: 'Daily Review Routine',
    blurb: 'Check homework, address common errors, reteach concepts - daily routine for retention',
    phase: 'starter-activity', minutes: 8, target: 'slide', layout: 'cards',
    steps: [
      'Quick homework check (2 mins) - scan for completion, spot common issues',
      'Address common errors (3 mins) - whole class discussion of 2-3 frequent mistakes',
      'Guided practice (3 mins) - reteach tricky concept with worked example',
      'Link to today\'s lesson (30 secs) - \'Today we\'ll build on this by...\''
    ]
  },
  {
    key: 'establish-talk-ground-rules', icon: '◎', title: 'Establish Talk Ground Rules',
    blurb: 'Co-create class ground rules for quality dialogue and oracy (use at start of year/unit)',
    phase: 'starter-activity', minutes: 10, target: 'slide', layout: 'keywords',
    steps: [
      'Ask: \'What makes group discussions go well?\' (2 mins) - brainstorm ideas',
      'Ask: \'What makes them go badly?\' (2 mins) - identify problems',
      'Students pair-discuss and share ideas (3 mins) - synthesize thinking',
      'Co-create list of 5-7 ground rules together (2 mins) - write on chart paper',
      'Display rules prominently in classroom (1 min)',
      'Note: Revisit these before each oracy activity throughout year'
    ]
  },
  {
    key: 'do-now-bell-ringer', icon: '✦', title: 'Do Now / Bell Ringer',
    blurb: 'Silent individual work on board when students enter',
    phase: 'activation', minutes: 8, target: 'moment',
    steps: [
      'On board: 3 questions (recall from last lesson, connection, preview)',
      'Silent individual work (5 mins)',
      'Quick pair check (2 mins)',
      'Whole class review (3 mins)',
      'Link to today\'s objective'
    ]
  },
  {
    key: 'knowledge-activation-web', icon: '✦', title: 'Knowledge Activation Web',
    blurb: 'Build a web of connected ideas on the board',
    phase: 'activation', minutes: 7, target: 'feedback', feedbackKind: 'wordcloud',
    steps: [
      'Write topic in center of board (1 min)',
      'Students call out anything they know (3 mins)',
      'Teacher writes and draws connecting lines',
      'Look for patterns and gaps (2 mins)',
      'Set today\'s learning goal (1 min)'
    ]
  },
  {
    key: 'pre-assessment-quickfire', icon: '✦', title: 'Pre-Assessment Quickfire',
    blurb: 'Thumbs up/down/sideways for 8-10 true/false statements',
    phase: 'activation', minutes: 8, target: 'game', style: 'truefalse',
    steps: [
      'Teacher reads 8-10 statements',
      'Students show: 👍 True / 👎 False / 👉 Unsure',
      'Teacher notes misconceptions',
      'Clarify key terms',
      'Set learning goals based on gaps'
    ]
  },
  {
    key: 'i-do-we-do-you-do', icon: '◧', title: 'I Do, We Do, You Do',
    blurb: 'Gradual release: Teacher models → Guided practice → Independent practice',
    phase: 'construction', minutes: 20, target: 'slide', layout: 'cards',
    steps: [
      'I DO (5 mins): Teacher models with think-aloud',
      'WE DO (8 mins): Class solves together, teacher guides',
      'YOU DO Together (5 mins): Partner practice with support',
      'YOU DO Alone (7 mins): Independent practice, quick check'
    ]
  },
  {
    key: 'concept-development', icon: '◧', title: 'Concept Development',
    blurb: 'Build understanding: Show → Explain → Examples/Non-Examples → Apply',
    phase: 'construction', minutes: 20, target: 'slide', layout: 'keywords',
    steps: [
      'SHOW: Present concept with clear example (3 mins)',
      'EXPLAIN: Break down - what, why, how (5 mins)',
      'EXAMPLES & NON-EXAMPLES: Identify features (5 mins)',
      'GUIDED APPLICATION: Apply concept (7 mins)',
      'INDEPENDENT PRACTICE: Create own examples (5 mins)'
    ]
  },
  {
    key: 'flipped-instruction', icon: '◧', title: 'Flipped Instruction',
    blurb: 'Deepen understanding after home learning (Review → Deep Dive → Application)',
    phase: 'construction', minutes: 25, target: 'slide-arc',
    steps: [
      'Home Learning Review (3 mins): Poll understanding, address questions',
      'Deep Dive (10 mins): Focus on hardest parts, work complex examples',
      'Application Practice (12 mins): Apply to challenging problems, differentiated support'
    ]
  },
  {
    key: 'question-cube-six-question-types', icon: '◧', title: 'Question Cube - Six Question Types',
    blurb: 'Deep questioning using Rosenshine\'s six question templates: Define, Compare, Why, Example, What If, Benefits/Limits',
    phase: 'construction', minutes: 20, target: 'feedback', feedbackKind: 'brainstorm',
    steps: [
      'Present topic/concept (e.g., \'Photosynthesis\') (1 min)',
      'Explain the 6 question types (2 mins):',
      '🔵 DEFINE: What is [concept]?',
      '🟢 COMPARE: How is it different from [related concept]?',
      '🟡 WHY: Why is [concept] important/how does it work?',
      '🟣 EXAMPLE: Give a real-world example',
      '🔴 WHAT IF: What would happen if...?',
      '🟠 BENEFITS/LIMITS: What conditions are needed? What are the limitations?',
      'Round 1 (12 mins): Teacher or student picks question type, student answers (30s thinking, 30s response), rotate through all 6 types with 2-3 students per type',
      'Round 2 (optional): Students generate their own questions for each type',
      'Debrief (5 mins): Which questions were hardest? Which helped you understand most?'
    ]
  },
  {
    key: 'worked-example-analysis', icon: '⚡', title: 'Worked Example Analysis',
    blurb: 'Analyze a completed example together to understand the process',
    phase: 'mini-activity', minutes: 10, target: 'slide', layout: 'split',
    steps: [
      'Display completed example (1 min)',
      'Students identify each step (3 mins) - What happened? Why?',
      'Pairs create a \'recipe\' for solving similar problems (3 mins)',
      'Test recipe on new problem (3 mins)',
      'Compare approaches (2 mins)'
    ]
  },
  {
    key: 'error-analysis', icon: '⚡', title: 'Error Analysis',
    blurb: 'Find and fix mistakes in sample work to identify misconceptions',
    phase: 'mini-activity', minutes: 10, target: 'game', style: 'oddone',
    steps: [
      'Show work with 3-4 deliberate errors (1 min)',
      'Individual: Spot the errors (3 mins)',
      'Pairs: Discuss and correct errors (3 mins)',
      'Share: What were the errors? (2 mins)',
      'Reflect: Why might someone make these mistakes? (1 min)'
    ]
  },
  {
    key: 'quick-practice-stations', icon: '⚡', title: 'Quick Practice Stations',
    blurb: 'Rotate through 3 quick tasks: Recall, Apply, Create',
    phase: 'mini-activity', minutes: 10, target: 'slide', layout: 'cards',
    steps: [
      'Station 1: Recall task (3 mins)',
      'Station 2: Apply task (3 mins)',
      'Station 3: Create task (3 mins)',
      'Brief share out (1 min)'
    ]
  },
  {
    key: 'concept-card-sort', icon: '⚡', title: 'Concept Card Sort',
    blurb: 'Organize information into categories to understand relationships',
    phase: 'mini-activity', minutes: 10, target: 'game', style: 'order',
    steps: [
      'Give each group 12-15 cards with terms/images/examples (1 min)',
      'Sort into categories (4 mins) - choose or create categories',
      'Groups walk around to see others\' sorts (2 mins)',
      'Discuss: Different ways to organize (2 mins)',
      'Reflect: Which organization is most useful? Why? (1 min)'
    ]
  },
  {
    key: 'interleaving-mixed-practice', icon: '⚡', title: 'Interleaving Mixed Practice',
    blurb: 'Mix problems from today AND previous weeks for long-term retention (spaced learning)',
    phase: 'mini-activity', minutes: 15, target: 'game', style: 'choice',
    steps: [
      'Present 10 problems: 6 from today\'s topic, 4 from previous weeks (1 min)',
      'Students solve independently (8 mins) - mix of old and new',
      'Pair-check answers (3 mins) - discuss strategies used',
      'Whole class: \'How did previous learning help today?\' (3 mins)',
      'Reflect: Which problems were harder - new or old? Why?'
    ]
  },
  {
    key: 'strategic-wait-time-questioning', icon: '⚡', title: 'Strategic Wait Time Questioning',
    blurb: 'Questioning with explicit 3-5 second wait time for deeper thinking and participation',
    phase: 'mini-activity', minutes: 10, target: 'moment',
    steps: [
      'Pose question to whole class clearly',
      '⏱️ WAIT 3-5 seconds (no hands up yet) - give thinking time',
      'Call on student randomly (use name sticks/cards)',
      '⏱️ WAIT 3 seconds for student to formulate answer',
      'Student responds',
      '⏱️ WAIT 2 seconds before responding or asking follow-up',
      'Repeat 5-7 times with different students (10 mins total)',
      'Note: Increased wait time = better answers + more participation'
    ]
  },
  {
    key: 'guided-inquiry-investigation', icon: '▣', title: 'Guided Inquiry Investigation',
    blurb: 'Students discover concepts through structured exploration (Explore → Explain → Elaborate → Share)',
    phase: 'main-activity', minutes: 30, target: 'slide-arc',
    steps: [
      'EXPLORE (10 mins): Investigate stimulus - What patterns? What happens when you change X?',
      'EXPLAIN (8 mins): Develop explanation - Why? What\'s the rule?',
      'ELABORATE (7 mins): Apply to new situation - Use understanding to solve problems',
      'SHARE & REFINE (5 mins): Present findings and build shared understanding'
    ]
  },
  {
    key: 'jigsaw-expert-groups', icon: '▣', title: 'Jigsaw Expert Groups',
    blurb: 'Students become experts and teach peers (Home → Expert → Home)',
    phase: 'main-activity', minutes: 29, target: 'moment',
    steps: [
      'Home Groups (5 mins): Groups of 4, assign each person a sub-topic',
      'Expert Groups (12 mins): All 1s together, become experts, create teaching plan',
      'Home Groups Return (12 mins): Each expert teaches their part (3 mins each), create complete picture'
    ]
  },
  {
    key: 'problem-based-learning', icon: '▣', title: 'Problem-Based Learning',
    blurb: 'Solve authentic, complex problem through structured inquiry',
    phase: 'main-activity', minutes: 35, target: 'slide', layout: 'split',
    steps: [
      'Present Problem: Real-world scenario (3 mins)',
      'What do we KNOW? List given information (5 mins)',
      'What do we NEED to know? Identify gaps (5 mins)',
      'Research & Plan: Find information, develop strategy (10 mins)',
      'Solve: Implement solution, show working (10 mins)',
      'Present & Justify: Share solution and reasoning (7 mins)'
    ]
  },
  {
    key: 'differentiated-practice-menu', icon: '▣', title: 'Differentiated Practice Menu',
    blurb: 'Must-do task plus choice board (Consolidate/Apply/Extend)',
    phase: 'main-activity', minutes: 25, target: 'slide', layout: 'cards',
    steps: [
      'Must Do: Core practice task - everyone (10 mins)',
      'Choose Your Challenge (15 mins):',
      '🟢 Consolidate: Easier version with scaffolding',
      '🟡 Apply: Standard problem-solving',
      '🔴 Extend: Complex multi-step challenge'
    ]
  },
  {
    key: 'design-and-create-task', icon: '▣', title: 'Design & Create Task',
    blurb: 'Create something that demonstrates understanding (poster/model/presentation/video)',
    phase: 'main-activity', minutes: 35, target: 'slide', layout: 'cards',
    steps: [
      'Brief: Design/create [product] that shows understanding (2 mins)',
      'Planning: Sketch ideas, gather resources (5 mins)',
      'Creating: Make your product (20 mins)',
      'Self-assessment: Check against criteria (3 mins)',
      'Gallery walk: View and learn from others (5 mins)'
    ]
  },
  {
    key: 'think-pair-square-share', icon: '▦', title: 'Think-Pair-Square-Share',
    blurb: 'Progressive sharing: Individual → Pair → Group of 4 → Class',
    phase: 'collaboration', minutes: 13, target: 'moment',
    steps: [
      'THINK (2 mins): Individual reflection',
      'PAIR (3 mins): Share with partner',
      'SQUARE (4 mins): Join another pair, synthesize',
      'SHARE (4 mins): Groups present to class'
    ]
  },
  {
    key: 'jigsaw-collaboration', icon: '▦', title: 'Jigsaw Collaboration',
    blurb: 'Home groups → Expert groups → Return to teach (see Main Activity for full version)',
    phase: 'collaboration', minutes: 20, target: 'moment',
    steps: [
      'Home groups split (2 mins)',
      'Expert groups learn one piece (10 mins)',
      'Return to home groups to teach (8 mins)'
    ]
  },
  {
    key: 'peer-teaching-carousel', icon: '▦', title: 'Peer Teaching Carousel',
    blurb: 'Rotate through stations, adding to and building on previous groups\' work',
    phase: 'collaboration', minutes: 20, target: 'moment',
    steps: [
      'Setup: 4-5 stations with different tasks',
      'Groups rotate every 4 minutes',
      'At each station: Read previous work, add thinking, correct errors',
      'Final Round (5 mins): Return to starting station, review, synthesize',
      'Present to class'
    ]
  },
  {
    key: 'socratic-seminar', icon: '▦', title: 'Socratic Seminar (Simple)',
    blurb: 'Student-led discussion: Inner circle discusses, outer circle observes',
    phase: 'collaboration', minutes: 20, target: 'moment',
    steps: [
      'Round 1 (8 mins): Inner circle discusses prompt with evidence',
      'Round 2 (8 mins): Switch circles, new discussion',
      'Debrief (4 mins): What strong arguments? What was convincing?'
    ]
  },
  {
    key: 'dialogue-chain-discussion', icon: '▦', title: 'Dialogue Chain Discussion',
    blurb: 'Structured student-led discussion where each student builds on previous responses using academic connectors',
    phase: 'collaboration', minutes: 15, target: 'slide', layout: 'cards',
    steps: [
      'Present discussion question to class (1 min)',
      'Student 1: Gives initial answer (30 seconds)',
      'Student 2: \'I agree/disagree because...\' OR \'Building on that idea...\' (30 seconds)',
      'Student 3: Continues chain using academic language (30 seconds)',
      'Continue for 8-10 students (10 mins)',
      'Teacher synthesizes key insights (2 mins)'
    ]
  },
  {
    key: 'real-world-connection-hunt', icon: '▦', title: 'Real-World Connection Hunt',
    blurb: 'Students identify real-world examples of concepts in their classroom, school, home, and community',
    phase: 'collaboration', minutes: 15, target: 'feedback', feedbackKind: 'brainstorm',
    steps: [
      'Present concept (e.g., \'Friction\' or \'Democracy\') (2 mins)',
      'Challenge 1 (3 mins): Find examples in THIS ROOM',
      'Challenge 2 (3 mins): Think of examples AT HOME',
      'Challenge 3 (3 mins): Identify examples IN YOUR COMMUNITY',
      'Share out (3 mins): Students explain their connections',
      'Reflect (1 min): \'Why does this concept matter in real life?\''
    ]
  },
  {
    key: 'explanation-champion-challenge', icon: '▦', title: 'Explanation Champion Challenge',
    blurb: 'Students explain concepts without using banned words, forcing deeper articulation of understanding',
    phase: 'collaboration', minutes: 15, target: 'game', style: 'headsup',
    steps: [
      'Display concept word (e.g., \'Photosynthesis\') (1 min)',
      'Show 4-5 BANNED WORDS students can\'t use (e.g., \'sunlight\', \'oxygen\', \'plants\') (1 min)',
      'Think time (2 mins): Students plan their explanation',
      'Volunteer explains to class (60 seconds)',
      'Class votes: Clear (2 pts), Okay (1 pt), Unclear (0 pts)',
      'Repeat with 3-4 more students and concepts (8 mins)',
      'Debrief (2 mins): What made explanations clear?'
    ]
  },
  {
    key: 'compare-and-contrast-venn-activity', icon: '▦', title: 'Compare & Contrast Venn Activity',
    blurb: 'Visual comparison of two concepts using Venn diagram, focusing on similarities and differences',
    phase: 'collaboration', minutes: 15, target: 'game', style: 'compare',
    steps: [
      'Present two concepts (e.g., \'Photosynthesis\' vs \'Respiration\') (1 min)',
      'Individual thinking (3 mins): List characteristics of each',
      'Pair work (5 mins): Create Venn diagram together',
      'Gallery walk (4 mins): View other pairs\' work',
      'Class synthesis (2 mins): What patterns? What connections?'
    ]
  },
  {
    key: 'benefits-vs-limitations-battle', icon: '▦', title: 'Benefits vs Limitations Battle',
    blurb: 'Two teams take turns stating benefits and limitations of a concept, practicing balanced analysis',
    phase: 'collaboration', minutes: 15, target: 'slide', layout: 'split',
    steps: [
      'Present topic (e.g., \'Renewable Energy\' or \'Social Media\') (1 min)',
      'Team setup: Benefits Team vs Limitations Team (1 min)',
      '30-second think time before each round',
      'Teams alternate stating points (10 mins)',
      'Scoring: Valid point = 1 point, Repeat = no points',
      'Switch sides and continue (optional)',
      'Debrief (2 mins): Balanced view discussion'
    ]
  },
  {
    key: 'scenario-analysis-discussion', icon: '▦', title: 'Scenario Analysis Discussion',
    blurb: 'Analyze real-world scenarios to identify concepts, explain applications, and predict outcomes',
    phase: 'collaboration', minutes: 18, target: 'slide', layout: 'split',
    steps: [
      'Present concept (e.g., \'Supply and Demand\') (2 mins)',
      'Show 3 scenarios (e.g., concert tickets, crop harvest, iPhone release) (3 mins)',
      'Question 1 (4 mins): Which scenarios show the concept? (All/Some/One)',
      'Question 2 (4 mins): Pick one and explain HOW',
      'Question 3 (3 mins): Predict what happens next',
      'Question 4 (2 mins): Compare - which is most extreme?'
    ]
  },
  {
    key: 'whiteboards-on-walls', icon: '▦', title: 'Whiteboards on Walls',
    blurb: 'Students discuss and write thinking on wall whiteboards - visible thinking and peer learning (Franklin Sixth Form approach)',
    phase: 'collaboration', minutes: 12, target: 'moment',
    steps: [
      'Students move to wall whiteboards in pairs/groups (30 secs)',
      'Teacher poses problem/question (30 secs)',
      'Groups discuss and write their thinking on whiteboards (5 mins)',
      'Gallery walk - observe and learn from other groups\' work (3 mins)',
      'Return to own board and refine thinking based on what you saw (2 mins)',
      'Whole class debrief of key ideas and strongest arguments (1 min)',
      'Note: Arrive early to start, revisit at lesson end for consolidation'
    ]
  },
  {
    key: 'connect-four-concept-edition', icon: '▦', title: 'Connect Four - Concept Edition',
    blurb: 'Competitive matching game where students connect related concepts (definitions/terms, causes/effects, questions/answers)',
    phase: 'collaboration', minutes: 20, target: 'game', style: 'conceptchain',
    steps: [
      'MODE A - Match Pairs (20 mins):',
      'Setup (2 mins): Create 4x4 grid with paired cards (definitions/terms, causes/effects, questions/answers, benefits/limitations)',
      'Teams take turns (15 mins): Claim two cards that match and explain the connection',
      'If correct: Cards disappear, team scores a connection',
      'If incorrect: Cards stay, next team\'s turn',
      'Win condition: First team to make 4 valid connections wins',
      'Debrief (3 mins): Discuss strongest connections and misconceptions',
      'MODE B - Category Conquest (Alternative):',
      'Setup: 4 columns, 4 rows of questions (Define, Compare, Example, Why)',
      'Students answer questions to \'claim\' spaces',
      'First to get 4 in a row (vertical, horizontal, diagonal) wins'
    ]
  },
  {
    key: 'multiple-choice-quiz', icon: '?', title: 'Multiple Choice Quiz',
    blurb: '5-8 multiple choice questions with immediate feedback',
    phase: 'mini-quiz', minutes: 6, target: 'game', style: 'choice',
    steps: [
      'Present 5-8 multiple choice questions',
      'Students respond (paper/whiteboard/digital/fingers)',
      'Show correct answer after each (30-45 secs per question)',
      'Quick explanation if needed',
      'Move on - don\'t dwell'
    ]
  },
  {
    key: 'true-false-rapid-fire', icon: '?', title: 'True/False Rapid Fire',
    blurb: '10-12 true/false statements with thumbs up/down/sideways',
    phase: 'mini-quiz', minutes: 5, target: 'game', style: 'truefalse',
    steps: [
      'Teacher reads 10-12 true/false statements',
      'Students show: 👍 True / 👎 False / 👉 Unsure',
      'Statements mix easy, challenging, and misconceptions',
      'Tally scores, address misconceptions'
    ]
  },
  {
    key: 'short-answer-check', icon: '?', title: 'Short Answer Check',
    blurb: '3-5 short answer questions, pair mark with answer key',
    phase: 'mini-quiz', minutes: 8, target: 'game', style: 'type',
    steps: [
      'Students write answers to 3-5 questions (4 mins)',
      'Swap with partner (1 min)',
      'Mark using answer key (2 mins)',
      'Discuss any disagreements (1 min)',
      'Self-assess: ___ / 5'
    ]
  },
  {
    key: 'diagnostic-question', icon: '?', title: 'Diagnostic Question',
    blurb: '1-2 carefully designed questions that reveal thinking and misconceptions',
    phase: 'mini-quiz', minutes: 7, target: 'game', style: 'choice',
    steps: [
      'Present 1-2 diagnostic questions (3 mins)',
      'Students answer with explanation',
      'Teacher analyzes common answers (2 mins)',
      'Address misconception immediately (2 mins)',
      'Group students by need if necessary'
    ]
  },
  {
    key: 'structured-reflection-protocol', icon: '↺', title: 'Structured Reflection Protocol (Four-Corner)',
    blurb: 'Students move to corners based on confidence level',
    phase: 'reflection', minutes: 12, target: 'feedback', feedbackKind: 'poll',
    steps: [
      'Explain corners: Got it / Mostly understand / Getting there / Need help',
      'Students move to their corner (2 mins)',
      'Each corner completes specific task (6 mins)',
      'Teacher visits each corner, addresses needs (4 mins)'
    ]
  },
  {
    key: 'learning-log-entry', icon: '↺', title: 'Learning Log Entry',
    blurb: 'Structured journal: New Learning / Connections / Challenges / Strategies / Next Steps',
    phase: 'reflection', minutes: 10, target: 'slide', layout: 'content',
    steps: [
      'Students complete structured reflection (8 mins):',
      '1. NEW LEARNING: What\'s one new thing?',
      '2. CONNECTIONS: How does this connect?',
      '3. CHALLENGES: What was difficult?',
      '4. STRATEGIES: What helped me learn?',
      '5. NEXT STEPS: What do I want to work on?',
      'Optional: Share one insight with partner (2 mins)'
    ]
  },
  {
    key: 'muddiest-point', icon: '↺', title: 'Muddiest Point',
    blurb: 'Identify what\'s unclear, teacher addresses top confusions',
    phase: 'reflection', minutes: 13, target: 'feedback', feedbackKind: 'brainstorm',
    steps: [
      'Individual (3 mins): Write \'The muddiest point for me is...\' on sticky note',
      'Teacher collects & groups (2 mins): Sort by common themes',
      'Address Top 3 (8 mins): Clear up biggest confusions with student explanations'
    ]
  },
  {
    key: 'plus-minus-interesting', icon: '↺', title: 'Plus-Minus-Interesting (PMI)',
    blurb: 'Edward de Bono thinking: What worked (+) / What was challenging (−) / What surprised (?)',
    phase: 'reflection', minutes: 10, target: 'slide', layout: 'cards',
    steps: [
      'Individual Reflection (5 mins):',
      'PLUS: What worked well?',
      'MINUS: What was challenging?',
      'INTERESTING: What surprised me?',
      'Share (5 mins): Pairs compare, class discusses themes'
    ]
  },
  {
    key: 'exit-ticket', icon: '⚑', title: 'Exit Ticket (Plenary)',
    blurb: 'Quick written reflection before leaving (same as Activity Plenary #4)',
    phase: 'plenary', minutes: 5, target: 'feedback', feedbackKind: 'poll',
    steps: [
      'Choose format: 3-2-1 / Traffic Light / What-So What-Now What',
      'Students write responses (3 mins)',
      'Submit on way out',
      'Teacher reviews for planning'
    ]
  },
  {
    key: 'preview-next-lesson', icon: '⚑', title: 'Preview Next Lesson',
    blurb: 'Recap today, preview tomorrow, set preparation task',
    phase: 'plenary', minutes: 7, target: 'slide', layout: 'section',
    steps: [
      'Today We Learned (2 mins): Quick recap',
      'Next Lesson We Will (2 mins): Preview and connect',
      'Preparation Task (1 min): Quick homework/prep',
      'Closing Question (2 mins): Leave them thinking'
    ]
  },
  {
    key: 'exit-ticket-2', icon: '⚐', title: 'Exit Ticket',
    blurb: 'Quick written reflection: 3-2-1 or Traffic Light or What-So What-Now What',
    phase: 'activity-plenary', minutes: 5, target: 'feedback', feedbackKind: 'poll',
    steps: [
      'Choose format: 3-2-1 / Traffic Light / What-So What-Now What',
      'Students write individual responses (3 mins)',
      'Submit on way out',
      'Teacher reviews for next lesson planning'
    ]
  },
  {
    key: 'recap-quiz-game', icon: '⚐', title: 'Recap Quiz Game',
    blurb: 'Fun, competitive review (Quiz-Quiz-Trade / Stand Up If / Quick-Fire)',
    phase: 'activity-plenary', minutes: 6, target: 'game', style: 'speed',
    steps: [
      'Choose format (Quiz-Quiz-Trade / Stand Up If / Quick-Fire)',
      'Play game with review questions (4 mins)',
      'Celebrate correct answers',
      'Address common errors (2 mins)'
    ]
  },
  {
    key: 'teach-someone', icon: '⚐', title: 'Teach Someone',
    blurb: 'Explain today\'s learning to a partner',
    phase: 'activity-plenary', minutes: 8, target: 'moment',
    steps: [
      'Partner A teaches (2 mins): Today I learned...',
      'Partner B asks 2 questions (1 min)',
      'Switch roles (3 mins)',
      'Together: What would we tell someone who missed today? (2 mins)'
    ]
  },
  {
    key: 'visual-summary', icon: '⚐', title: 'Visual Summary',
    blurb: 'Create visual showing learning (Mind Map / Comic Strip / Sketch Note / One-Pager)',
    phase: 'activity-plenary', minutes: 8, target: 'slide', layout: 'cards',
    steps: [
      'Choose visual format (Mind Map / Comic Strip / Sketch Note / One-Pager)',
      'Create visual summary (6 mins)',
      'Optional: Share with partner (2 mins)'
    ]
  },
  {
    key: 'reflection-ladder', icon: '⚐', title: 'Reflection Ladder',
    blurb: 'Self-assess learning journey from \'need help\' to \'can teach others\'',
    phase: 'activity-plenary', minutes: 9, target: 'feedback', feedbackKind: 'scale',
    steps: [
      'Show ladder: Bottom (need help) → Top (can teach others)',
      'Students draw themselves on their level (1 min)',
      'Write: \'I\'m here because...\' (2 mins)',
      'Write: \'To move up I need to...\' (2 mins)',
      'Share with partner (2 mins)',
      'Teacher notes who needs support (2 mins)'
    ]
  }];

/** @param {string} key @returns {Activity | null} */
function activity(key) {
  return ACTIVITIES.find((a) => a.key === key) || null;
}

/**
 * Activities in one phase, in catalogue order. Disabled entries are omitted:
 * an activity that cannot run should not be offered.
 * @param {PhaseKey} phase
 * @returns {Activity[]}
 */
function activitiesInPhase(phase) {
  return ACTIVITIES.filter((a) => a.phase === phase && a.enabled !== false);
}

/** How many runnable activities each phase offers, keyed by phase.
 *  @returns {Record<string, number>} */
function phaseCounts() {
  return Object.fromEntries(PHASES.map((p) => [p.key, activitiesInPhase(p.key).length]));
}

/** Rough minutes for a run of activities, for the plan rail's time budget.
 *  @param {string[]} keys @returns {number} */
function totalMinutes(keys) {
  return keys.reduce((sum, key) => sum + ((activity(key) || {}).minutes || 0), 0);
}

export { PHASES, ACTIVITIES, activity, activitiesInPhase, phaseCounts, totalMinutes };
