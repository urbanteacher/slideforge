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
          date: '2026-09-14',
          notes: 'Welcome to Advanced Information Presentation & Visualisation (LDSCI6253). This semester explores how visual representations transform raw data into human insight. Today we examine why we visualise, historical breakthroughs, core definitions, and foundational idioms.'
        },
        {
          type: 'introduction',
          title: 'Mark Martin',
          subtitle: 'Course leader',
          body: 'Advanced Information Presentation & Visualisation\nLDSCI6253',
          notes: 'Before teaching: add your job title and upload your headshot in Design & content. Introduce your background and what you enjoy about data visualisation. Invite students to share what they hope to learn.'
        },
        {"type": "journey", "title": "Your course journey · foundations", "subtitle": "Weeks 1–6 · build the skills you will use in AE1", "progressive": true, "buildMode": "dim", "bullets": ["W1 · Introductions\tWhy visualisation matters and how it evolved. Reading: VAD 1.", "W2 · Visual communication\tMeasurement scales, marks and channels, design guidance. VAD 2, 5, 6.", "W3 · Data abstraction\tData types, tables and tools. VAD 2, 3, 7.", "W4 · Colour\tPerception, cognition and illusions. VAD 10–12.", "W5 · Interaction and animation\tInteraction, animation, reduce and embed. VAD 13, 14.", "W6 · Maps and SciVis\tGeospatial and scientific visualisation. VAD 8."], "notes": "Start with Week 1: you are here. Reveal each stop with Next and ask what it adds to the previous one. VAD means Visualization Analysis and Design by Tamara Munzner. Teaching sequence supplied by the course leader; assessment briefs are for 2026–27. The source timetable header says 2025/6: confirm the year before distributing the complete timetable."},
        {"type": "journey", "title": "Your course journey · advanced practice", "subtitle": "Extend your visual thinking, then evaluate how well it communicates", "progressive": true, "buildMode": "dim", "bullets": ["W7–8 · Pause and assessment\tWeek 7: reading week. Week 8: exam week in the timetable; use the AE deadlines for coursework.", "W9 · Networks and trees\tGraph structures, network visualisations and trees. VAD 9.", "W10 · Experiential visualisation\tGuest speaker. Reading to be confirmed.", "W11 · Visualisation for ML\tHigh-dimensional data, feature engineering and model performance. Reading TBC.", "Later · Current research\tIEEE VIS and CHI proceedings; how to write a paper. Reading TBC.", "Later · Evaluation and storytelling\tThreats, validation, telling a data story and giving a talk. VAD 4."], "notes": "The supplied timetable lists Week 13 before Week 12. The last two stops deliberately say Later until their order is confirmed. AE2 refers to Weeks 8–11, whereas the timetable places some relevant topics later. Confirm alignment and which material will have been taught before the AE2 deadline. No exact calendar dates have been inferred from teaching-week labels."},
        {"type": "journey", "journeyMode": "handover", "title": "Two assessments · one developing project", "subtitle": "Green Jobs and Skills in London: Visualising the Data · 2026–27", "progressive": true, "buildMode": "hide", "bullets": ["AE1 · 60%\tBUILD & COMMUNICATE\nPython visualisations + accessible public communication\nSet exercises · 24–32 hours\n30 October 2026 · 13:00 UK", "AE2 · 40%\tEVALUATE & DEVELOP\n2,500-word written report\nDevelop at least one AE1 visualisation, dataset or visual idea\n27 November 2026 · 13:00 UK"], "body": "Carry something forward. Explain what changed, why it changed and how it helps the audience.", "notes": "Both assessments were issued on 14 September 2026. The two percentages total the module assessment weighting. Do not present the stated 24–32 hours as an exam duration. AE2 explicitly builds on AE1. AE1 feedback is planned within 28 calendar days, reaching the AE2 deadline if counted from hand-in; clarify interim feedback arrangements rather than promising feedback will arrive before AE2."},
        {"type": "journey", "title": "How your project develops", "subtitle": "One public-facing question: what should people understand about London’s green jobs and skills?", "progressive": true, "buildMode": "dim", "bullets": ["Start with real evidence\tRead the GLA analysis. Use the raw datasets provided on Canvas; cite sources.", "Make purposeful choices\tChoose data, marks, channels, colour and interactions to answer a clear question.", "Submit AE1\tReproducible Python visualisations and accessible communication for a general audience.", "Revisit a design decision\tReuse, extend, rework, transform or redesign at least one AE1 element.", "Explain your development in AE2\tUse concrete examples and readings to discuss clarity, trust, ethics and evaluation."], "body": "AE2 reading: GLA green jobs analysis · ONS green jobs estimates (March 2026) · Nesta evidence review (2023)", "notes": "The London Datastore Green Job Postings page provides HTML analysis rather than a raw Lightcast dataset. Use it for context and methodology unless extracting tables is explicitly permitted. Raw downloadable datasets are on Canvas. AE2 should include the carried-over element, comparisons of good and bad practice and visual examples from required readings. New visualisations may be included where useful; they are not mandatory simply because they appear in the list of possible examples."},
        {"type": "mindmap", "title": "Ready to submit?", "progressive": true, "buildMode": "hide", "bullets": ["Where?\tSubmit online through Canvas.", "Identity\tBoth submissions must be anonymous.", "When?\tAE1: 30 October. AE2: 27 November. Both 13:00 UK, 2026.", "AE1 files\tPython notebook (.ipynb) AND its .html export.", "AI rule\tAI use is prohibited in both assessments.", "Evidence\tUse real, cited data and justify your design choices."], "notes": "Ask students to say what they would check under each branch before revealing it. AE2 is a written report, but its supplied brief also lists .ipynb and .html. Confirm the report packaging before giving a definite AE2 file instruction. Categorical marking applies. Refer students to the full Canvas briefs for complete requirements; these slides summarise them."},
        {"type": "section", "title": "Check the assessment connection", "subtitle": "Think first, vote, then explain your choice to a partner", "feedback": {"kind": "poll", "prompt": "Which approach meets the AE2 carry-over requirement?", "options": ["Start a completely unrelated project", "Develop an AE1 visualisation, dataset or visual idea and explain the changes", "Resubmit AE1 unchanged with a new title", "Use an AI tool to write the report"], "max": 1}, "notes": "Correct: develop an AE1 visualisation, dataset or visual idea and explain the changes. Give 20 seconds of private thinking, take the vote, then ask pairs to explain why the other choices do not meet the brief. If responses are split, return to Two assessments and explain the connecting arrow. AI use is prohibited on both assignments."},
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
          type: 'mindmap',
          title: 'Why visualise?',
          progressive: true,
          buildMode: 'dim',
          bullets: [
            'Discover\tSpot patterns we did not expect.',
            'Explain\tMake a finding understandable to others.',
            'Compare\tSee differences between groups.',
            'Question\tNotice outliers and challenge assumptions.',
            'Decide\tUse evidence to choose what to do next.',
            'Think\tPut relationships on the page to reason about them.'
          ],
          notes: 'Connect this map to the preceding word cloud. Ask which branch a student contribution belongs to. Reveal one branch at a time with Next. Ask for an example before moving on. These branches organise reasons to visualise; they are not numerical measurements.'
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
          subtitle: 'Same numbers on paper — same picture on screen?',
          feedback: {
            kind: 'poll',
            prompt: 'Four datasets share the same average, spread, correlation (r ≈ 0.82), and best-fit line. Will their scatterplots look alike?',
            options: [
              'Yes — nearly the same shape',
              'No — they can look totally different',
              'Only if there are extreme outliers'
            ],
            max: 1
          },
          notes: 'Ask students to vote. Most who haven’t seen Anscombe will assume identical regression means similar visual scatter. Keep the jargon light: averages and “best-fit line” before you say mean/variance/r.'
        },
        {
          type: 'split',
          title: 'Anscombe I — a fair straight line',
          progressive: true,
          image: 'assets/lesson/anscombe/anscombe-i.svg',
          imageSide: 'left',
          imageFit: 'contain',
          subtitle: 'Anscombe, F.J. (1973) · The American Statistician 27(1)',
          bullets: [
            'Everyday story: hours revised vs exam mark — more study, higher score, with normal scatter around the trend.',
            'Same quick report as the other three: same average, same spread, same “how together” score, same best-fit line.',
            'What the plot shows: points hug the line. Here the shortcut numbers and the picture agree.'
          ],
          notes: 'Start with this “normal” scatter. Plain language: average = mean, spread = variance, how-together = correlation, best-fit line = regression. Ask: if you only saw the report, would you expect anything else?'
        },
        {
          type: 'split',
          title: 'Anscombe II — a curve wearing a straight line',
          progressive: true,
          image: 'assets/lesson/anscombe/anscombe-ii.svg',
          imageSide: 'left',
          imageFit: 'contain',
          subtitle: 'Anscombe, F.J. (1973) · The American Statistician 27(1)',
          bullets: [
            'Everyday story: practice helps… then levels off. More hours still help early on; later the gains flatten (a curve, not a ramp).',
            'The printed report still claims the same straight best-fit line as Dataset I.',
            'What the plot shows: a clear bend. The relationship is real — the straight-line model is the wrong shape.'
          ],
          notes: 'Contrast with I. Same string through the glitter; wrong shape of pile. Correlation can look fine while the model is misspecified.'
        },
        {
          type: 'split',
          title: 'Anscombe III — one bad row spoils the story',
          progressive: true,
          image: 'assets/lesson/anscombe/anscombe-iii.svg',
          imageSide: 'left',
          imageFit: 'contain',
          subtitle: 'Anscombe, F.J. (1973) · The American Statistician 27(1)',
          bullets: [
            'Everyday story: nine honest marks on a neat line — plus one mistyped score that shoots off the chart.',
            'Again: the summary report matches Datasets I and II, including that same best-fit line.',
            'What the plot shows: almost everything is tidy; one extreme point drags the line away from the truth.'
          ],
          notes: 'Ask what they would do: fix the typo, investigate, or leave it? Visualisation makes the odd row impossible to ignore before the model ships.'
        },
        {
          type: 'split',
          title: 'Anscombe IV — one point invents the slope',
          progressive: true,
          image: 'assets/lesson/anscombe/anscombe-iv.svg',
          imageSide: 'left',
          imageFit: 'contain',
          subtitle: 'Anscombe, F.J. (1973) · The American Statistician 27(1)',
          bullets: [
            'Everyday story: every house on the street costs about the same — except one mansion far out of town that “creates” a trend.',
            'Same averages and same best-fit line on paper as the other three.',
            'What the plot shows: almost no spread in x — that single far point is the only reason the line has a slope.'
          ],
          notes: 'Close by asking what the room would have missed with only the summary statistics from the poll slide. High leverage without a plot stays invisible.'
        },
        {
          type: 'content',
          title: 'Four pictures, one quick report',
          progressive: true,
          bullets: [
            'All four datasets share the same short summary — averages, spread, correlation, and best-fit line.',
            'Only the scatterplots show a fair line, a hidden curve, a rogue point, or a slope built on one observation.',
            'Rule of thumb: never trust a fitted line you have not plotted. The picture is part of the analysis.'
          ],
          notes: 'Recap before Burn-Murdoch. If short on time, dwell here after a quick flip through I–IV.'
        },
        {
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
            'Assessment rule: AI use is prohibited in both AE1 and AE2.',
            'Critical Practitioner Rule: AI generates prototypes; the human practitioner applies the 4Ps, domain expertise, and ethical validation.'
          ],
          notes: 'Distinguish general discussion of AI tools from assignment permissions. AI use is prohibited in AE1 and AE2. Do not suggest students use AI to draft assessment code or reports.'
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
    },
    {
      key: 'layout-bank',
      title: 'Layout bank — every slide type, one of each',
      icon: '▦',
      blurb: 'A reference deck holding every layout in the layout picker, in the Northeastern theme. Page through it to see what each one does, then copy the slide you want into your own lesson.',
      minutes: 15,
      theme: 'northeastern',
      logo: 'assets/brand/nu-london-logo.png',
      logoOn: 'all',
      logoSize: 'small',
      slides: [
        { type: 'title', title: 'Layout bank', subtitle: 'One of every slide type · Northeastern theme',
          notes: 'This deck is a reference, not a lesson. Every layout SlideForge can draw appears once, in running order, with a note like this one saying what it is for. Duplicate a slide here and paste it into a real deck to reuse the shape.' },

        { type: 'section', title: 'Opening a session', subtitle: 'Title, introduction, section, quote',
          notes: 'SECTION — full red, nothing on it but the words. The loudest surface in the theme, so keep it for the two or three moments you want the room to look up. Subtitle is optional.' },

        { type: 'introduction', title: 'Mark Martin', subtitle: 'Course Leader · Northeastern University London',
          body: 'Advanced Information Presentation & Visualisation. Research interests in data literacy, computing education and how people read charts under time pressure.',
          notes: 'INTRODUCTION — who is standing at the front. Title is the name, subtitle the role, body the paragraph. Use it once, on your first meeting with a cohort.' },

        { type: 'quote', body: 'The purpose of visualization is insight, not pictures.', subtitle: 'Ben Shneiderman',
          notes: 'QUOTE — body is the quotation, subtitle the attribution. Long quotations wrap and shrink; if it runs past three lines it has stopped being a quote slide and wants to be a content slide.' },

        { type: 'section', title: 'Explaining and organising', subtitle: 'Content, journey, mind map, keywords, italics, cards',
          notes: 'The six layouts that carry an argument. Each takes the same bullets array and arranges it differently — so you can change your mind about the shape without retyping the words.' },

        { type: 'content', title: 'Content — the plain bullet slide',
          bullets: [
            'One point per line, in the bullets list.',
            'A tab inside a line makes the part before it a lead-in, so a point can carry its own sub-clause.\tLike this trailing half.',
            'Reveal them one at a time with Build on Next, or show them all at once.'
          ],
          progressive: true, buildMode: 'dim',
          notes: 'CONTENT — the workhorse. This one has Build on Next set to DIM: points already made stay on screen at 38% so the argument so far is still readable, while the eye is told where you are now. Set it to Hide instead when an earlier point would give away the next one.' },

        { type: 'journey', title: 'Journey — a route with milestones',
          subtitle: 'Reveal each milestone as you explain it',
          bullets: [
            'Week 1\tFoundations: why we visualise at all.',
            'Week 6\tColour, scale and the grammar of graphics.',
            'Week 12\tCritique and assessment.'
          ],
          progressive: true,
          notes: 'JOURNEY — numbers each point as a milestone (01, 02, 03) along a route. Reach for it for a course outline, a project timeline, or a handover. Text before the tab is the milestone label, text after is the detail.' },

        { type: 'mindmap', title: 'Where visualisation sits',
          bullets: [
            'Perception\tWhat the eye does before the brain catches up.',
            'Encoding\tTurning a number into a position, length or hue.',
            'Interaction\tLetting the reader ask the next question.',
            'Critique\tSaying why a chart fails.'
          ],
          progressive: true,
          notes: 'MIND MAP — arranges the points around the title in the centre rather than down the page. Use it when the points are siblings with no order; use Journey when the order is the point.' },

        { type: 'keywords', title: 'Keywords — term and definition',
          bullets: [
            'Idiom\tA particular way of encoding data visually.',
            'Data ink\tThe pixels that carry meaning rather than decoration.',
            'Chartjunk\tEverything else.'
          ],
          progressive: true,
          notes: 'KEYWORDS — the tab splits each line into a term and its definition, set as a two-column row. The vocabulary slide. Build on Next reveals a row at a time.' },

        { type: 'italics', title: 'Italics — a phrase and its gloss',
          bullets: [
            'correlation is not causation\tTwo things moving together need not be connected.',
            'the mean hides the shape\tAnscombe’s whole point in four scatterplots.'
          ],
          notes: 'ITALICS — the same term/definition split as Keywords, but the term is set in italic display type and given more room. Better for a handful of phrases you want to dwell on; Keywords is better for a list of six.' },

        { type: 'cards', title: 'Cards — parallel items, side by side',
          bullets: [
            'Plan\tDefine the purpose and the audience before opening the data.',
            'Prepare\tClean, validate, and know what is missing.',
            'Present\tChoose the idiom that fits the question.',
            'Pause\tAsk whether it actually reads.'
          ],
          progressive: true, buildMode: 'dim',
          notes: 'CARDS — items that are peers, arranged in a row with the number on the side rather than across the top, so four fit without shrinking. The card count drives the column ladder automatically: two cards are wide, six are narrow. Also on dim build here.' },

        { type: 'section', title: 'Data and evidence', subtitle: 'Table, chart in three kinds',
          notes: 'Table and chart read the same pasted text, so a range from a spreadsheet becomes either without retyping.' },

        { type: 'table', title: 'Table — when the numbers are the point',
          body: 'Dataset\tMean x\tMean y\tCorrelation\nI\t9.00\t7.50\t0.816\nII\t9.00\t7.50\t0.816\nIII\t9.00\t7.50\t0.816\nIV\t9.00\t7.50\t0.816',
          progressive: true,
          notes: 'TABLE — paste a range straight from Excel or Sheets; tabs and pipes both work, first row is the header. Build on Next reveals a row at a time. Reach for a table when the reader needs the exact value, a chart when they need the shape.' },

        { type: 'chart', chartKind: 'bar', title: 'Chart — bar, for comparing magnitudes',
          body: 'Region\tLeave %\tRemain %\nBoston\t75.6\t24.4\nBristol\t38.0\t62.0\nLambeth\t21.4\t78.6\nGlasgow\t33.4\t66.6',
          progressive: true,
          notes: 'CHART (bar) — identical text to a table slide; change the type and it draws. Several series means one press of Next lands a whole series; a single series means one press lands a category. Colours come from the validated palette, assigned in fixed order.' },

        { type: 'chart', chartKind: 'line', title: 'Chart — line, for change over time',
          body: 'Year\tCambridge\tBlackpool\n2019\t62\t31\n2020\t58\t28\n2021\t64\t30\n2022\t69\t29\n2023\t74\t27',
          progressive: true,
          notes: 'CHART (line) — series names are drawn at the right-hand end rather than in a legend box, so the eye never has to travel. The right margin is measured from the longest name before drawing, and converging labels step apart. One press of Next draws a whole line.' },

        { type: 'chart', chartKind: 'pie', title: 'Chart — pie, for parts of one whole',
          body: 'Continent\tShare of population\nAsia\t59\nAfrica\t18\nEurope\t9\nAmericas\t13\nOceania\t1',
          notes: 'CHART (pie) — only honest when the slices are parts of a single total and there are few of them. Two series will not work here. If you are comparing magnitudes rather than showing a composition, use the bar.' },

        { type: 'section', title: 'Pictures', subtitle: 'Image, split, gallery, before/after',
          notes: 'Four ways a picture can carry a slide, and the caption and frame settings that apply across all of them.' },

        { type: 'image', title: 'Image — full bleed, caption over the picture',
          subtitle: 'Northeastern University London · the City campus',
          image: 'assets/brand/nu-london-skyline.png',
          design: { capStyle: 'scrim', capPos: 'bottom' },
          notes: 'IMAGE (full bleed) — the picture fills the slide and the caption sits on it under a gradient scrim, which reads over any image. Title is the caption line, subtitle the credit. Caption styles: scrim (default, safest), bar (solid), plain, none. Caption can sit top instead of bottom.' },

        { type: 'image', title: 'Image — framed to a fixed ratio',
          subtitle: 'Anscombe’s third dataset · Anscombe 1973',
          image: 'assets/lesson/anscombe/anscombe-iii.svg',
          imageFit: 'contain',
          design: { imageFrame: '4:3', capStyle: 'bar' },
          notes: 'IMAGE (framed) — the picture takes a shape of its own and the caption sits clear below it. Ratios: 16:9, 4:3, 3:2, 1:1, 4:5. Use a frame for anything with labels near the edge — a caption bar across the bottom of a chart covers its axis. Fit contain shows the whole image; cover crops it to fill.' },

        { type: 'split', title: 'Split — picture on one side, points on the other',
          subtitle: 'NU London',
          bullets: [
            'The picture takes one half, the points the other.',
            'Image side can be left or right.',
            'Use it when the picture is evidence for the points, not decoration beside them.'
          ],
          image: 'assets/brand/nu-london-skyline.png',
          imageSide: 'right', imageFit: 'cover',
          progressive: true,
          notes: 'SPLIT — the compromise layout, and the one to be suspicious of. If the picture is not actually doing work, drop it and use a content slide. Set imageSide to left or right.' },

        { type: 'gallery', title: 'Gallery — an image stack',
          imageFit: 'contain',
          design: { imageFrame: '4:3', capStyle: 'bar' },
          layers: [
            { image: 'assets/lesson/anscombe/anscombe-i.svg', caption: 'Dataset I — a plain linear relationship', source: 'Anscombe 1973' },
            { image: 'assets/lesson/anscombe/anscombe-ii.svg', caption: 'Dataset II — a clear curve', source: 'Anscombe 1973' },
            { image: 'assets/lesson/anscombe/anscombe-iii.svg', caption: 'Dataset III — one outlier drags the line', source: 'Anscombe 1973' },
            { image: 'assets/lesson/anscombe/anscombe-iv.svg', caption: 'Dataset IV — one point invents the slope', source: 'Anscombe 1973' }
          ],
          progressive: true,
          notes: 'GALLERY — each press lays the next picture in front of the last, with its own caption and source, the earlier ones still showing at the edges. Up to eight layers. The effect is cumulative: the room sees the pile growing, which is what makes four near-identical scatterplots land. Every layer here has the same summary statistics.' },

        { type: 'beforeafter', title: 'Before and after',
          exploration: {
            before: 'assets/lesson/anscombe/anscombe-i.svg',
            after: 'assets/lesson/anscombe/anscombe-iv.svg',
            beforeLabel: 'Dataset I', afterLabel: 'Dataset IV'
          },
          notes: 'BEFORE / AFTER — drag the handle to wipe between two pictures. Only worth it when the two images are registered to each other — same framing, same scale — so the wipe compares like with like. A redesign, a map at two dates, a chart before and after a fix.' },

        { type: 'section', title: 'Things the room can touch', subtitle: 'Explore, simulation, video, links',
          notes: 'The interactive layouts. All of them work on the projector and on a learner phone in a live session.' },

        { type: 'explore', title: 'Explore — hotspots on one picture',
          image: 'assets/brand/nu-london-skyline.png',
          imageFit: 'cover',
          exploration: {
            spots: [
              { x: 42, y: 40, zoom: 2.2, title: 'The Shard', body: 'The tallest thing on the horizon, and the reason the eye lands here first.' },
              { x: 60, y: 68, zoom: 2.2, title: 'Tower Bridge', body: 'Picked out in red while everything round it stays blue — colour doing the work of a label.' }
            ]
          },
          notes: 'EXPLORE — pin hotspots to a picture by percentage coordinates; each one zooms in and shows a title and a note. Use it to walk a room around a complicated image — a chart with several stories in it, a map, a screenshot of an interface.' },

        { type: 'simulation', title: 'Simulation — change an input, watch the output',
          exploration: { model: 'quadratic', min: 0, max: 10, a: 2, b: 1, inputLabel: 'Sample size', outputLabel: 'Confidence' },
          notes: 'SIMULATION — a slider bound to a model, drawn as a curve. Reach for it when the relationship is the lesson and a static chart would only show one point on it. Learners can drive their own copy from their phones.' },

        { type: 'links', title: 'Links — the reading list',
          bullets: [
            'Munzner, Visualization Analysis and Design\thttps://www.cs.ubc.ca/~tmm/vadbook/',
            'Financial Times Visual Vocabulary\thttps://github.com/Financial-Times/chart-doctor',
            'Anscombe 1973, Graphs in Statistical Analysis\thttps://www.jstor.org/stable/2682899'
          ],
          notes: 'LINKS — text before the tab is the label, after it the URL. In a live session these become tappable on learner phones, which is the point: nobody copies a URL off a projector.' },

        { type: 'content', title: 'Video — the one layout this deck cannot show',
          bullets: [
            'A video slide takes a file or URL and plays it full bleed, with an optional caption.',
            'Start time, loop, mute and autoplay are all settable; autoplay is honoured on the projector and never in a preview.',
            'Left out of this bank on purpose — a placeholder clip would only ever show a broken frame.'
          ],
          notes: 'VIDEO — add one from the layout picker and point it at a file or URL. Set videoStart to begin partway into a longer recording. There is deliberately no example here because a fake URL renders as a black box, which would teach you nothing.' },

        { type: 'section', title: 'Two settings that apply everywhere', subtitle: 'Build on Next, and the theme',
          notes: 'Worth knowing before you start copying slides out of this deck.' },

        { type: 'cards', title: 'What carries across every layout',
          bullets: [
            'Build on Next\tReveal a slide piece by piece rather than all at once. Per slide, not per deck.',
            'Hide or Dim\tHide keeps the next point secret. Dim leaves earlier points on screen at 38%.',
            'Theme\tSet on the deck. Every layout here redraws in any of the themes.',
            'Notes\tWhat you are reading now. Visible on the presenter desk, never on the projector.',
            'Logo\tSet on the deck, drawn top right. Keep a slide title under about 40 characters so it cannot run under it.'
          ],
          progressive: true, buildMode: 'dim',
          notes: 'Be strategic with dim. It suits a list where the earlier points are still doing work — a framework, a set of criteria. It is wrong where the next point is a reveal, or where the slide is already busy.' },

        { type: 'content', title: 'Using this bank',
          bullets: [
            'Page through it once to see what exists.',
            'Found a shape you want? Duplicate the slide and paste it into your own deck, then replace the content.',
            'Layouts are app-wide — every one of these is already in the layout picker of every deck you open.',
            'This deck is a reference copy. Edit it freely; rebuild it from the lesson picker whenever you want a clean one.',
            'Not here: quiz, game, results, join and explain. Those are made for you, not chosen from the picker.'
          ],
          notes: 'Close. Rebuilding this lesson gives a fresh copy, so nothing here is precious. The picker offers twenty layouts and nineteen of them are in this deck; video is named on its own slide but not rendered, because a placeholder URL would only ever draw a black box. The remaining five slide types never appear in the picker: quiz, game, results and join are built by the live session, and explain is the card that shows the correct answer after a check — which is also why the student handout leaves it out.' }
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
