/* Ready-made lessons, as data.
   These used to be one lesson built by hand inside makeLesson(), which meant
   the only way to see it again was to clear the browser's storage so the app
   thought it was a first run. They are content, not code: a lesson here is a
   plain object, and adding another one is adding an entry to this array.
   A .js file rather than .json so the app still works opened from disk, where
   fetch() of a local file is blocked. */
(function (global) {
  'use strict';
  /** @type {import("../src/types.js").SlideForgeGlobal} */
  var SF = global.SF = global.SF || {};

  var LESSONS = [
    {
      key: 'attention',
      title: 'The art of paying attention',
      icon: '✳',
      blurb: 'Focus, distraction and how we learn. Six slides with a check and three moments the room answers.',
      minutes: 25,
      theme: 'studio',
      games: [{
        ref: 'check',
        title: 'Let’s check that idea',
        style: 'choice',
        settings: { defaultTime: 0, scoreboard: false, scoreSlide: false },
        questions: [{
          question: 'Which strategy best helps you focus on a difficult task?',
          options: ['Switch between tasks', 'Remove distractions', 'Keep every notification on', 'Do everything at once'],
          correct: 1,
          explanation: 'Removing distractions reduces the number of things competing for your attention. Try a short, focused work session, then pause and reflect.'
        }]
      }],
      slides: [
        { type: 'title', title: 'The art of\npaying attention.',
          subtitle: 'A small exploration of focus, distraction & how we learn.',
          notes: 'Welcome everyone. Invite them to notice where their attention is right now. There is no leaderboard or countdown in this lesson.' },
        { type: 'section', title: 'Where does your\nattention go?',
          subtitle: 'One word. No wrong answers.',
          feedback: { kind: 'wordcloud', prompt: 'What pulls your attention away?', options: [], max: 2 },
          notes: 'Use the sample response preview to rehearse. In a live session, invite responses and discuss the largest words.' },
        { type: 'cards', title: 'Give your attention a little space.',
          bullets: ['Remove the distractions competing for your focus.',
            'Choose one small task with a clear finish line.',
            'Pause, reflect and adjust your approach.'],
          notes: 'Ask for one everyday example of each strategy.' },
        { type: 'game', gameRef: 'check',
          notes: 'Invite an answer, then ask learners to explain their reasoning. Revisit any misconceptions before moving on.' },
        { type: 'content', title: 'Make it work in your world.',
          bullets: ['Think of a moment when focusing feels difficult.',
            'Choose one change you could try tomorrow.',
            'Share your idea, then build on someone else’s.'],
          feedback: { kind: 'brainstorm', prompt: 'What is one change you could try tomorrow?', options: [], max: 2 },
          notes: 'Invite the room to compare suggestions. Ask which ideas might work in different contexts.' },
        { type: 'section', title: 'A little reflection.\nA better next step.',
          subtitle: 'Before you go, check in with yourself.',
          feedback: { kind: 'poll', prompt: 'Could you apply one of these strategies?',
            options: ['I need another example', 'I could try with support', 'I’m ready to try it'], max: 1 },
          notes: 'Use the responses to decide whether to revisit an example or move to independent practice.' }
      ]
    },
    {
      key: 'retrieval',
      title: 'Start with what you remember',
      icon: '↺',
      blurb: 'A retrieval-practice opener: recall first, check second, then decide what to reteach.',
      minutes: 15,
      theme: 'studio',
      games: [{
        ref: 'recall',
        title: 'What stuck from last time?',
        style: 'choice',
        settings: { defaultTime: 20, scoreboard: false, scoreSlide: false, confidence: true },
        questions: [{
          question: 'Before you look anything up — which of these did we cover last lesson?',
          options: ['Only the first idea', 'Both ideas, briefly', 'Both ideas in depth', 'Neither'],
          correct: 1,
          explanation: 'Rewrite this with your own content. The point of the opener is that they answer from memory first, and find out afterwards.'
        }]
      }],
      slides: [
        { type: 'title', title: 'Start with what\nyou remember.',
          subtitle: 'Notes closed. Getting it wrong here is the useful part.',
          notes: 'Say plainly that this is not assessed. Retrieval works because they try to recall before being told.' },
        { type: 'section', title: 'Two minutes.\nNo notes.',
          subtitle: 'Write down everything you can recall from last lesson.',
          notes: 'Time it properly. Silence is fine — recall is slow and that is the work.' },
        { type: 'game', gameRef: 'recall',
          notes: 'Replace this question with your own. Ask how sure they were before you reveal anything.' },
        { type: 'content', title: 'What do we go back to?',
          bullets: ['Anything most of the room could not recall.',
            'Anything they were confident about and wrong about.',
            'Everything else can wait until next time.'],
          feedback: { kind: 'poll', prompt: 'Which of these needs another go?',
            options: ['The first idea', 'The second idea', 'Neither — keep going'], max: 1 },
          notes: 'A wrong answer given confidently is a misconception; a wrong guess is a gap. They need different lessons.' }
      ]
    },
    {
      key: 'ipdv-intro',
      title: 'LDSCI6253 Advanced Information Presentation & Visualisation',
      icon: '📊',
      blurb: 'Foundations of visualisation: cognitive value, Anscombe’s quartet, historical discoveries, chart idioms, and the 4P framework.',
      minutes: 90,
      theme: 'northeastern',
      logo: 'assets/brand/nu-london-logo.png',
      logoOn: 'all',
      logoSize: 'small',
      games: [{
        ref: 'quiz-check',
        title: 'Lecture 1 Check — Foundations of Visualisation',
        style: 'choice',
        settings: { defaultTime: 20, scoreboard: true, scoreSlide: false },
        questions: [
          {
            question: 'According to Tamara Munzner, what is the core purpose of a computer-based visualization system?',
            options: [
              'Replace human decision-makers with automated algorithmic pipelines',
              'Provide visual representations designed to help people carry out tasks more effectively',
              'Store large datasets in efficient visual formats to save disk space',
              'Eliminate the need for exploratory data analysis'
            ],
            correct: 1,
            explanation: 'Munzner emphasizes that visualization is designed to augment human capabilities rather than replace people, supporting analysis, discovery, and decision-making.'
          },
          {
            question: 'What fundamental principle does Anscombe’s Quartet demonstrate to data practitioners?',
            options: [
              'Linear regression models always predict non-linear patterns accurately',
              'Summary statistics can be identical while the underlying visual structures are wildly different',
              'Visualizations should always precede calculating summary statistics',
              'Four data points are the minimum required to establish correlation'
            ],
            correct: 1,
            explanation: 'All four datasets in Anscombe’s Quartet share identical means, variances, correlations, and regression lines, yet plotting them reveals completely different relationships (non-linear, outliers, vertical lines).'
          },
          {
            question: 'In a Sankey diagram, what quantitative attribute is directly encoded by the width of each link/arrow?',
            options: [
              'The statistical variance of the variable',
              'The flow volume or transfer quantity between nodes',
              'The temporal speed or velocity of the process',
              'The margin of error or uncertainty in measurement'
            ],
            correct: 1,
            explanation: 'Sankey diagram arrows have widths directly proportional to the flow quantity or volume between nodes (e.g. energy, cost, material, or patient flow).'
          },
          {
            question: 'Which historical breakthrough used a spatial visualization of water pump locations to isolate a cholera outbreak?',
            options: [
              'William Playfair (1801)',
              'Francis Galton (1883)',
              'John Snow (1854)',
              'E.W. Maunder (1904)'
            ],
            correct: 2,
            explanation: 'Dr. John Snow mapped cholera deaths relative to Broad Street water pumps in London in 1854, providing decisive visual evidence that cholera was a water-borne disease.'
          }
        ]
      }],
      slides: [
        {
          type: 'title',
          title: 'Introduction\n& Foundations',
          subtitle: 'Week 1 · Lecture 1',
          notes: 'Welcome to Advanced Information Presentation & Visualisation (LDSCI6253). This semester explores how visual representations transform raw data into human insight. Today we examine why we visualise, historical breakthroughs, core definitions, and foundational idioms.'
        },
        {
          type: 'cards',
          title: 'Course Administration & Expectations',
          bullets: [
            'Canvas Deadlines: Worksheets must be submitted on Canvas by the Friday after each lab at midday.',
            'Time Management & Balance: Consistent weekly practice across theory, design, and code prevents last-minute overload.',
            'Active Support: When unsure, ask questions during lecture, in labs, or via discussion boards early.'
          ],
          notes: 'Emphasize the Friday midday submission rhythm. Lab sessions reinforce lecture concepts with practical coding and analysis.'
        },
        {
          type: 'content',
          title: 'Learning Objectives',
          bullets: [
            'Define visualisation and explain its cognitive value over pure statistics.',
            'Apply Tamara Munzner’s What-Why-How framework to deconstruct visualisations.',
            'Identify the four levels of the nested model for visualisation design.',
            'Distinguish between principles, guidelines, and rules of thumb (the 4Ps).',
            'Critique visualisations using systematic analytical criteria.'
          ],
          notes: 'By the end of this session, students will be able to articulate why visualisation matters and begin applying systematic critique to any chart idiom.'
        },
        {
          type: 'split',
          title: 'Reading & Reference Texts',
          bullets: [
            'Tamara Munzner: Visualization Analysis and Design (Chapters 1 & 6). Focus on task abstraction and visual encoding.',
            'John Burn-Murdoch: How Charts Work. Real-world explanatory graphics and scatterplot analysis from the Financial Times.',
            'Weekly Cadence: Read the assigned chapters before Tuesday’s lecture to maximize lab application.'
          ],
          notes: 'Munzner is our primary theoretical text. Burn-Murdoch provides practitioner-grade intuition on explanatory journalism and statistical communication.'
        },
        {
          type: 'section',
          title: 'Why Visualise?',
          subtitle: 'Beyond raw numbers and summary tables.',
          feedback: {
            kind: 'wordcloud',
            prompt: 'In one word: what does a graphic do that statistics alone cannot?',
            options: [],
            max: 2
          },
          notes: 'Launch the word cloud. Ask students to submit on their phones. Highlight words like "patterns", "outliers", "speed", "intuition", "relationships".'
        },
        {
          type: 'cards',
          title: 'Three Cognitive Pillars of Visualisation',
          progressive: true,
          bullets: [
            'Amplifies Cognition: Offloads working memory to the visual cortex, allowing preattentive processing of shape, color, and position.',
            'Enables Discovery: Surfaces unanticipated structure, clusters, and anomalies that were not hypothesized in advance.',
            'Handles Complexity: Makes multivariate interactions and complex dependencies intelligible where single summary statistics fail.'
          ],
          notes: 'Our working memory can hold only 4-7 items, but the human visual cortex processes millions of bits per second in parallel. Visualisation is external cognition.'
        },
        {
          type: 'content',
          title: 'Big Questions for Data Practitioners',
          progressive: true,
          bullets: [
            'What were historical authors thinking when they invented new visual forms?',
            'What visual ideas and computational tools were available in their era?',
            'What was needed to see and understand something genuinely new?',
            'What are the modern challenges in big data, AI, and decision-making?'
          ],
          notes: 'As we trace the history of charts, observe that every new visual idiom was invented because an existing representation failed to answer an urgent question.'
        },
        {
          type: 'section',
          title: 'A History of Seeing Patterns',
          subtitle: 'From ancient clay tablets to modern computational graphics.',
          notes: 'We now take a whirlwind tour of data visualisation history to understand the evolution from physical accounting to abstract data coordinates.'
        },
        {
          type: 'keywords',
          title: 'Ancient Records to Renaissance Astronomy',
          progressive: true,
          bullets: [
            'Pre-Sargonic Tablets\tSumerian accounts of silver and commodities arranged in structured grid columns.',
            'Cartography\tScience and aesthetics of spatial reality; communicating geographic relationships effectively.',
            'Christoph Scheiner (1612)\tEngraved observation plates systematically tracking sunspot trajectories over time.'
          ],
          notes: 'Scheiner’s sunspot drawings represent one of the earliest systematic time-series observations of an astronomical phenomenon.'
        },
        {
          type: 'split',
          title: 'William Playfair & Abstract Data Space',
          progressive: true,
          bullets: [
            'The 1801 Statistical Breviary: Published the earliest known pie chart showing the Turkish Empire’s landmass across Asia, Europe, and Africa.',
            'Invention of Statistical Graphics: Playfair also invented the bar chart and line graph, breaking free from physical geography to plot abstract economic data.',
            'Proportional Angle & Area: Early experiments in communicating part-to-whole relationships visually.'
          ],
          notes: 'Before Playfair, charts were almost exclusively maps or astronomical diagrams tied to physical space. Playfair realized money, debt, and populations could be plotted as coordinates.'
        },
        {
          type: 'cards',
          title: 'When Visualisations Led to Discovery',
          progressive: true,
          bullets: [
            'John Snow (1854): Mapped cholera deaths around the Broad Street pump, proving cholera was water-borne rather than airborne miasma.',
            'Francis Galton (1883): Plotted barometric pressures and winds across Europe, discovering anti-cyclonic weather patterns.',
            'E.W. Maunder (1904): The solar "butterfly diagram", uncovering the 11-year sunspot latitude migration cycle.',
            'Hertzsprung & Russell (1911): Plotted stellar luminosity against spectral class, revealing the main sequence of star evolution.'
          ],
          notes: 'In each of these cases, the discovery could not have been achieved by reviewing raw data tables. The visual spatialization made the invisible pattern undeniable.'
        },
        {
          type: 'content',
          title: 'Timeline of Data Visualisation',
          progressive: true,
          bullets: [
            'Pre-Historic & Antiquity: Cave paintings, tally sticks, and Roman road itineraries (Peutinger Table).',
            '10th–17th Century: Celestial movement plots, Van Langren’s 1644 longitude error graphic.',
            '18th–19th Century: Playfair’s statistical graphics, Minard’s Napoleon march flow map, Nightingale’s rose chart.',
            '20th Century: Tukey’s Exploratory Data Analysis (EDA), Bertin’s Semiology of Graphics, Cleveland & McGill perception studies.',
            'The Information Age: Interactive web graphics (D3, Observable), GPU rendering, real-time streaming dashboards.'
          ],
          notes: 'Point out John Tukey’s quote: "The greatest value of a picture is when it forces us to notice what we never expected to see." This sets up Anscombe’s Quartet.'
        },
        {
          type: 'quote',
          body: 'Computer-based visualization systems provide visual representations of datasets designed to help people carry out tasks more effectively.',
          subtitle: 'Tamara Munzner · Visualization Analysis and Design',
          notes: 'Unpack this definition carefully: computer-based (scalable, interactive), visual representations (encoding data onto visual channels), datasets, tasks (why are we doing this?), and effectively (validation).'
        },
        {
          type: 'content',
          title: 'Augmenting Human Capabilities',
          progressive: true,
          bullets: [
            'Human-in-the-Loop: Visualisation is needed when computational algorithms alone cannot make fully automated decisions.',
            'Huge Design Space: Infinite combinations of visual idioms exist; most possibilities in the design space are ineffective for a given task.',
            'Trade-offs & Constraints: Every visual encoding prioritizes some comparisons while obscuring others.',
            'Validation is Difficult: Must validate at all four levels: domain problem, data/task abstraction, visual encoding, and algorithm efficiency.'
          ],
          notes: 'Contrast visualization with machine learning. When you know exactly what to optimize and trust the model 100%, automate. When there is ambiguity, open-ended exploration, or human accountability, visualize.'
        },
        {
          type: 'section',
          title: 'The Danger of Summary Statistics',
          subtitle: 'A prediction challenge before we plot.',
          feedback: {
            kind: 'poll',
            prompt: 'Four datasets have identical mean (x=9, y=7.5), variance, correlation (r=0.816), and regression line. Will their graphs look similar?',
            options: [
              'Yes — nearly identical shapes',
              'No — completely different distributions',
              'Only if extreme outliers exist'
            ],
            max: 1
          },
          notes: 'Ask students to vote. Most who haven’t seen Anscombe will assume identical regression means similar visual scatter.'
        },
        {
          type: 'gallery',
          title: 'Anscombe’s Quartet (1973)',
          progressive: true,
          imageFit: 'contain',
          design: { imageFrame: '4:3' },
          layers: [
            { image: 'assets/lesson/anscombe/anscombe-i.svg',
              caption: 'Dataset I — a straight relationship',
              source: 'Anscombe, F.J. (1973) · The American Statistician 27(1)' },
            { image: 'assets/lesson/anscombe/anscombe-ii.svg',
              caption: 'Dataset II — a curve, not a line',
              source: 'Anscombe, F.J. (1973) · The American Statistician 27(1)' },
            { image: 'assets/lesson/anscombe/anscombe-iii.svg',
              caption: 'Dataset III — one point drags the line',
              source: 'Anscombe, F.J. (1973) · The American Statistician 27(1)' },
            { image: 'assets/lesson/anscombe/anscombe-iv.svg',
              caption: 'Dataset IV — one point makes the line',
              source: 'Anscombe, F.J. (1973) · The American Statistician 27(1)' }
          ],
          notes: 'One plot per press, each landing on the pile of the ones before it — so the room watches four identical summaries turn into four different pictures. Every panel shares the same axes and the same fitted line, y = 3 + 0.5x. I: Gaussian scatter about the line, the only one a linear fit honestly describes. II: a clean parabola — the relationship is real but not linear. III: a tight line with one extreme vertical outlier dragging the slope off it. IV: every x is 8 except one; that single high-leverage point is the only thing defining the slope at all. Close by asking what they would have missed with only the summary statistics from the previous slide.'
        },
        {
          type: 'content',
          title: 'Case Study: Scatterplots in Explanatory Journalism',
          progressive: true,
          bullets: [
            'Financial Times Brexit Analysis (John Burn-Murdoch, June 2016).',
            'Plotted percentage with higher education (x-axis) against percentage voting Leave (y-axis) across UK local authorities.',
            'Revealed an unmistakable strong negative correlation: areas with lower formal education voted overwhelmingly to Leave.',
            'Scatterplots reveal clustering, variance, and outlier communities simultaneously without losing individual data points.'
          ],
          notes: 'Burn-Murdoch published this chart immediately following the referendum. It replaced pundit speculation with clear empirical evidence of the demographic education divide.'
        },
        {
          type: 'section',
          title: 'Chart Idioms & Multivariate Analysis',
          subtitle: 'Selecting the right visual encoding for the analytical task.',
          notes: 'Now we move from foundational principles to specific chart idioms and their appropriate use cases.'
        },
        {
          type: 'cards',
          title: 'Core Visualisation Use Cases',
          progressive: true,
          bullets: [
            'Changes Over Time: The most common analytical task. Line charts, area plots, and connected scatterplots showing trend and seasonality.',
            'Frequency & Distribution: Histograms, density estimates, and frequency polygons showing skewness, modality, and spread.',
            'Relationships & Correlation: Scatterplots, scatter matrices (SPLOMs), and heatmaps displaying multi-variable association.',
            'Value, Flow & Risk: Sankey diagrams, treemaps, and risk matrices communicating resource transfer and hierarchical composition.'
          ],
          notes: 'Ask students: What question are you asking of the data? The task dictates the idiom, not aesthetic preference.'
        },
        {
          type: 'split',
          title: 'Sankey Diagrams',
          progressive: true,
          bullets: [
            'Directed Flow Networks: Arrows and bands connecting two or more stages of nodes or processes.',
            'Proportional Width: Link width is strictly proportional to the quantity of flow (energy, material, cost, traffic).',
            'Conservation & Distribution: Immediately reveals where resources originate, branch, concentrate, or are lost.',
            'Alternative to Bar or Flow Charts: Captures multi-stage transitions and system-wide allocation simultaneously.'
          ],
          notes: 'Sankey diagrams originated in thermodynamics (Capt. Matthew Sankey in 1898 showing steam engine energy efficiency). Widely used today in financial audits, user journey funnels, and supply chains.'
        },
        {
          type: 'keywords',
          title: 'Specialized Idioms: Likert & Multi-Axis',
          progressive: true,
          bullets: [
            'Likert Scale Display\tDiverging stacked bar charts showing agreement/disagreement levels centered around a neutral baseline.',
            'Multi-Axis Line Chart\tPlots multiple data series with different units and scales on separate y-axes.',
            'Dual-Axis Warning\tCaution: Arbitrary scaling can exaggerate or hide correlations. Often better to use small multiples or normalized indexing.'
          ],
          notes: 'Warn students about dual-axis charts: by stretching one axis, you can make two unrelated lines appear to correlate or cross at will.'
        },
        {
          type: 'keywords',
          title: 'Multivariate Idioms: Radar & Boxplots',
          progressive: true,
          bullets: [
            'Radar Chart\tMultiple quantitative variables plotted on radial axes from a center point; useful for multivariate profile comparison.',
            'Radar Trade-off\tAxis ordering influences enclosed polygon area, which can mislead viewers into perceiving overall size differences.',
            'Box & Whisker Plot\tDisplays the 5-number summary: minimum, Q1 (25th), median (50th), Q3 (75th), and maximum, plus outliers.',
            'Distributional Comparison\tCompact footprint allows side-by-side comparison of dozens of distributions across categories.'
          ],
          notes: 'Tukey invented the box plot in 1977. Point out the difference between the box (interquartile range IQR) and the whiskers (typically 1.5 * IQR).'
        },
        {
          type: 'section',
          title: 'Applying What We’ve Learned',
          subtitle: 'Choose the appropriate idiom for the scenario.',
          feedback: {
            kind: 'poll',
            prompt: 'A hospital needs to track patient flow from admission through triage, testing, wards, and discharge. Which idiom is best?',
            options: [
              'Sankey diagram',
              'Multi-axis line chart',
              'Radar chart',
              'Box and whisker plot'
            ],
            max: 1
          },
          notes: 'Give the room 45 seconds to vote. Correct answer is Sankey diagram because it tracks flow volume across sequential multi-stage nodes.'
        },
        {
          type: 'game',
          gameRef: 'quiz-check',
          notes: 'Formative quiz time! 4 questions covering Munzner’s definition, Anscombe’s Quartet, Sankey width encoding, and John Snow’s cholera map.'
        },
        {
          type: 'section',
          title: 'The Rule of Thumb',
          subtitle: 'The 4P Framework for visual analysis and design.',
          notes: 'Now we synthesize this into a repeatable professional practice: the 4P framework.'
        },
        {
          type: 'keywords',
          title: 'The 4P Methodology',
          progressive: true,
          buildMode: 'dim',
          bullets: [
            '1. PLAN\tDefine purpose and audience; establish success metrics; gather context; choose core message.',
            '2. PREPARE\tClean and validate raw data; handle missing values; inspect outliers; structure into tidy format.',
            '3. PRESENTATION\tSelect appropriate chart idiom; apply intentional color strategy; build visual hierarchy; add annotations.',
            '4. POLISH\tConduct usability tests; check accessibility (colorblindness, screen readers); verify factual accuracy; optimize for medium.'
          ],
          notes: 'Every project in this module will be evaluated against the 4P lifecycle. Emphasize that 80% of project failure happens in Plan and Prepare, not Presentation.'
        },
        {
          type: 'content',
          title: 'Modern Tooling: Python & AI Workflows',
          progressive: true,
          bullets: [
            'Computational Libraries: Pandas for data wrangling; Matplotlib & Seaborn for static publication graphics; Altair & Plotly for interactive web charts.',
            'Grammar of Graphics: Leland Wilkinson’s grammar underlying ggplot2 and Altair separates data, marks, scales, and coordinates.',
            'AI-Assisted Exploration: Use LLMs to generate exploratory scripts, test chart variations, and audit edge cases rapidly.',
            'Critical Practitioner Rule: AI generates prototypes; the human practitioner applies the 4Ps, domain expertise, and ethical validation.'
          ],
          notes: 'In this course, you will use Python in Google Colab and Jupyter notebooks. We encourage AI assistance for code drafting, provided you can explain and justify every visual design decision.'
        },
        {
          type: 'section',
          title: 'Reflect & Self-Assess',
          subtitle: 'Check your confidence before our first practical lab.',
          feedback: {
            kind: 'scale',
            prompt: 'How confident do you feel applying the 4Ps to evaluate a visualization?',
            points: 5,
            lowLabel: 'Need guidance',
            highLabel: 'Ready to critique',
            max: 1
          },
          notes: 'Use this scale feedback to gauge student readiness for Lab 1. If many students score 1-2, plan a brief recap at the start of the lab session.'
        },
        {
          type: 'content',
          title: 'Summary & Looking Ahead to Lab 1',
          bullets: [
            'Read Chapter 1 & 6 in Munzner before Thursday’s lab.',
            'Lab 1 Focus: Setting up your Python environment, importing datasets with Pandas, and building your first clean visualisations.',
            'Worksheet Submission: Complete and submit Lab 1 worksheets on Canvas by Friday midday.',
            'Open Q&A: Bring your questions to the desk or post in the course discussion channel.'
          ],
          notes: 'Close the lecture. Remind them of the lab schedule and room. Open the floor to initial questions.'
        }
      ]
    }
  ];

  /**
   * Turn a lesson in this file into a real deck, with its games saved.
   *
   * Fresh ids every time, so activating a lesson twice gives two lessons
   * rather than two references to the same one. Games are created through
   * makeGame so a lesson here never has to know the shape of a question.
   *
   * @param {string} [key]  which lesson; the first one by default
   * @returns {object|null} deck
   */
  function buildLesson(key) {
    var spec = LESSONS.filter(function (l) { return l.key === key; })[0] || LESSONS[0];
    if (!spec) return null;
    var deck = SF.makeDeck(spec.title);
    deck.theme = spec.theme || 'studio';
    if (spec.logo) {
      deck.logo = spec.logo;
      deck.logoOn = spec.logoOn || 'all';
      deck.logoSize = spec.logoSize || 'medium';
    }

    var ids = {};
    (spec.games || []).forEach(function (g) {
      var game = SF.makeGame(g.title, g.style);
      game.theme = deck.theme;
      Object.assign(game.settings, g.settings || {});
      if (g.questions && g.questions.length) {
        game.questions = g.questions.map(function (q) {
          return SF.normalizeQuestion(Object.assign(SF.makeQuestion(g.style), q), g.style);
        });
      }
      SF.GameStore.save(game);
      ids[g.ref] = game;
    });

    deck.slides = (spec.slides || []).map(function (s) {
      var slide = Object.assign(SF.makeSlide(s.type), s);
      delete slide.gameRef;
      if (s.gameRef && ids[s.gameRef]) {
        slide.gameId = ids[s.gameRef].id;
        slide.gameTitle = ids[s.gameRef].title;
        slide.title = ids[s.gameRef].title;
      }
      return slide;
    });
    if (!deck.slides.length) deck.slides = [SF.makeSlide('title')];
    return deck;
  }

  SF.LESSONS = LESSONS;
  SF.buildLesson = buildLesson;
})(typeof window !== 'undefined' ? window : globalThis);
