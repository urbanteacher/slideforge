/* Factory lesson packs, as seed data for the Library.
   Looks (Northeastern, UKBT, Studio sage, Product, Editorial) live in
   Settings → Theme. These packs are documents: seeded once into Store, then
   opened and saved in place. Vibe galleries and the infographic museum stay
   in this file for buildLesson, but they are not Library cards.
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
      blurb: 'Week 1 foundations: course journey and assessment, why we visualise, history and discovery plates, Anscombe, the 4Ps, and a formative check.',
      minutes: 90,
      theme: 'northeastern',
      libraryGroup: 'nul',
      kind: 'lecture',
      org: 'Northeastern University London',
      logo: 'assets/brand/nu-london-logo.png',
      logoOn: 'all',
      logoSize: 'small',
      games: [
      {
        ref: 'check-admin',
        title: 'Check · Course and assessment',
        style: 'choice',
        settings: { defaultTime: 20, scoreboard: false, scoreSlide: false, intro: false, howTo: false },
        questions: [
          {
            question: "Your lab worksheet is due on Canvas when?",
            options: [
        "As you leave the lab",
        "The Friday after the lab, by midday",
        "The Monday after the lab, by 23:59",
        "Before the next lecture"
            ],
            correct: 2,
            explanation: "Monday after each lab, 23:59. It is the one deadline that repeats every week of the term."
          }
        ]
      },
      {
        ref: 'check-why',
        title: 'Check · Why visualise',
        style: 'choice',
        settings: { defaultTime: 20, scoreboard: false, scoreSlide: false, intro: false, howTo: false },
        questions: [
          {
            question: "What does a graphic let you do that a table of the same numbers does not?",
            options: [
        "Store the data more efficiently",
        "Prove that a relationship is causal",
        "See patterns, outliers and relationships you were not looking for",
        "Remove the need to check the data"
            ],
            correct: 2,
            explanation: "Visualisation is for discovery as much as explanation: the eye finds structure nobody thought to query for."
          }
        ]
      },
      {
        ref: 'check-history',
        title: 'Check · A history of seeing patterns',
        style: 'choice',
        settings: { defaultTime: 20, scoreboard: false, scoreSlide: false, intro: false, howTo: false },
        questions: [
          {
            question: "Which of these was the first to chart abstract quantities — money and trade — rather than physical space?",
            options: [
        "Ptolemy’s world map, 1482",
        "Christoph Scheiner’s sunspot plates, 1612",
        "William Playfair’s Statistical Breviary, 1801",
        "Charles Joseph Minard’s Pavé de Paris, 1826"
            ],
            correct: 2,
            explanation: "Before Playfair, graphics were maps or astronomical diagrams tied to physical space. He plotted money, debt and population — quantities with no shape of their own."
          }
        ]
      },
      {
        ref: 'check-discovery',
        title: 'Check · When visualisations led to discovery',
        style: 'choice',
        settings: { defaultTime: 20, scoreboard: false, scoreSlide: false, intro: false, howTo: false },
        questions: [
          {
            question: "What did John Snow’s 1854 map make undeniable that a list of the same deaths could not?",
            options: [
        "That the deaths clustered tightly around one water pump",
        "How many people had died in total",
        "The dates on which the deaths occurred",
        "The ages of those who died"
            ],
            correct: 0,
            explanation: "Spatialising the cases turned a column of addresses into a cluster. The pattern was in the data all along; the map is what made it arguable."
          }
        ]
      },
      {
        ref: 'check-framework',
        title: 'Check · What, Why and How',
        style: 'choice',
        settings: { defaultTime: 20, scoreboard: false, scoreSlide: false, intro: false, howTo: false },
        questions: [
          {
            question: "In the What–Why–How framework, “What” asks about:",
            options: [
        "The idiom you will draw",
        "The data you have",
        "The task the reader needs to do",
        "The algorithm’s running time"
            ],
            correct: 1,
            explanation: "What = data, Why = task, How = idiom. Keeping them in that order stops you choosing a chart before you know what it is for."
          }
        ]
      },
      {
        ref: 'check-summaries',
        title: 'Check · When summaries mislead',
        style: 'choice',
        settings: { defaultTime: 20, scoreboard: false, scoreSlide: false, intro: false, howTo: false },
        questions: [
          {
            question: "In Anscombe’s fourth dataset, ten of the eleven points share the same x value. What follows?",
            options: [
        "The correlation falls to zero",
        "The means of x and y differ from the other three sets",
        "The one remaining point decides the slope by itself",
        "The regression line cannot be calculated"
            ],
            correct: 2,
            explanation: "Points that never vary in x carry no information about slope. That is leverage: the further a point sits from the rest along x, the harder it can swing the line."
          }
        ]
      },
      {
        ref: 'check-idioms',
        title: 'Check · Choosing the right chart',
        style: 'choice',
        settings: { defaultTime: 20, scoreboard: false, scoreSlide: false, intro: false, howTo: false },
        questions: [
          {
            question: "You need to show how a total divides, recombines and is partly lost as it moves through a system. Which idiom fits?",
            options: [
        "A histogram",
        "A Sankey diagram",
        "A scatterplot",
        "A box plot"
            ],
            correct: 1,
            explanation: "Band width carries the quantity moving between stages, so branching and loss are visible as shape rather than arithmetic."
          }
        ]
      },
      {
        ref: 'check-multivariate',
        title: 'Check · Idioms for many variables',
        style: 'choice',
        settings: { defaultTime: 20, scoreboard: false, scoreSlide: false, intro: false, howTo: false },
        questions: [
          {
            question: "Why can a radar chart mislead when you compare two profiles?",
            options: [
        "It cannot show more than three variables",
        "It requires every axis to use the same units",
        "Changing the order of the axes changes the enclosed area",
        "It only works for data measured over time"
            ],
            correct: 2,
            explanation: "The polygon’s area is an artefact of axis order, not of the data. Two identical datasets can enclose very different-looking shapes."
          }
        ]
      },
      {
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
              'Francis Galton (1863)',
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
          type: "title",
          title: "Introduction\n& Foundations",
          subtitle: "Week 1 · Lecture 1",
          notes: "Welcome to Advanced Information Presentation & Visualisation (LDSCI6253). This semester explores how visual representations transform raw data into human insight. Today we examine why we visualise, historical breakthroughs, core definitions, and foundational idioms.",
          date: "2026-09-14"
        },
        {
          type: "introduction",
          title: "Mark Martin",
          subtitle: "Course leader",
          body: "Advanced Information Presentation & Visualisation\nLDSCI6253",
          notes: "Before teaching: add your job title and upload your headshot in Design & content. Introduce your background and what you enjoy about data visualisation. Invite students to share what they hope to learn.",
          image: "assets/lesson/ipdv/mark-martin-portrait.jpg"
        },
        {
          type: "section",
          title: "Your Course,\nYour Assessment",
          subtitle: "Where the term is going, and what you are judged on.",
          notes: "Red beat before the housekeeping. Twelve minutes of course mechanics is a lot to sit through cold — tell them this block is the map, and that the subject itself starts at Why Visualise?"
        },
        {
          type: "journey",
          title: "Your course journey · foundations",
          subtitle: "Weeks 1–6 · build the skills you will use in AE1",
          bullets: [
            "W1 · Introductions\tWhy visualisation matters and how it evolved. Reading: VAD 1.",
            "W2 · Visual communication\tMeasurement scales, marks and channels, design guidance. VAD 2, 5, 6.",
            "W3 · Data abstraction\tData types, tables and tools. VAD 2, 3, 7.",
            "W4 · Colour\tPerception, cognition and illusions. VAD 10–12.",
            "W5 · Interaction and animation\tInteraction, animation, reduce and embed. VAD 13, 14.",
            "W6 · Maps and SciVis\tGeospatial and scientific visualisation. VAD 8."
          ],
          notes: "Start with Week 1: you are here. Reveal each stop with Next and ask what it adds to the previous one. VAD means Visualization Analysis and Design by Tamara Munzner. Teaching sequence supplied by the course leader; assessment briefs are for 2026–27. The source timetable header says 2025/6: confirm the year before distributing the complete timetable.",
          buildMode: "dim",
          progressive: true
        },
        {
          type: "journey",
          title: "Your course journey · advanced practice",
          subtitle: "Extend your visual thinking, then evaluate how well it communicates",
          bullets: [
            "W7–8 · Pause and assessment\tWeek 7: reading week. Week 8: exam week in the timetable; use the AE deadlines for coursework.",
            "W9 · Networks and trees\tGraph structures, network visualisations and trees. VAD 9.",
            "W10 · Experiential visualisation\tGuest speaker. Reading to be confirmed.",
            "W11 · Visualisation for ML\tHigh-dimensional data, feature engineering and model performance. Reading TBC.",
            "Later · Current research\tIEEE VIS and CHI proceedings; how to write a paper. Reading TBC.",
            "Later · Evaluation and storytelling\tThreats, validation, telling a data story and giving a talk. VAD 4."
          ],
          notes: "The supplied timetable lists Week 13 before Week 12. The last two stops deliberately say Later until their order is confirmed. AE2 refers to Weeks 8–11, whereas the timetable places some relevant topics later. Confirm alignment and which material will have been taught before the AE2 deadline. No exact calendar dates have been inferred from teaching-week labels.",
          buildMode: "dim",
          progressive: true
        },
        {
          type: "journey",
          title: "Two assessments · one developing project",
          subtitle: "Green Jobs and Skills in London: Visualising the Data · 2026–27",
          body: "Carry something forward. Explain what changed, why it changed and how it helps the audience.",
          bullets: [
            "AE1 · 60%\tBUILD & COMMUNICATE\nPython visualisations + accessible public communication\nSet exercises · 24–32 hours\n30 October 2026 · 13:00 UK",
            "AE2 · 40%\tEVALUATE & DEVELOP\n2,500-word written report\nDevelop at least one AE1 visualisation, dataset or visual idea\n27 November 2026 · 13:00 UK",
            ""
          ],
          notes: "Both assessments were issued on 14 September 2026. The two percentages total the module assessment weighting. Do not present the stated 24–32 hours as an exam duration. AE2 explicitly builds on AE1. AE1 feedback is planned within 28 calendar days, reaching the AE2 deadline if counted from hand-in; clarify interim feedback arrangements rather than promising feedback will arrive before AE2.",
          progressive: true,
          journeyMode: "handover"
        },
        {
          type: "journey",
          title: "How your project develops",
          subtitle: "One public-facing question: what should people understand about London’s green jobs and skills?",
          body: "AE2 reading: GLA green jobs analysis · ONS green jobs estimates (March 2026) · Nesta evidence review (2023)",
          bullets: [
            "Start with real evidence\tRead the GLA analysis. Use the raw datasets provided on Canvas; cite sources.",
            "Make purposeful choices\tChoose data, marks, channels, colour and interactions to answer a clear question.",
            "Submit AE1\tReproducible Python visualisations and accessible communication for a general audience.",
            "Revisit a design decision\tReuse, extend, rework, transform or redesign at least one AE1 element.",
            "Explain your development in AE2\tUse concrete examples and readings to discuss clarity, trust, ethics and evaluation."
          ],
          notes: "The London Datastore Green Job Postings page provides HTML analysis rather than a raw Lightcast dataset. Use it for context and methodology unless extracting tables is explicitly permitted. Raw downloadable datasets are on Canvas. AE2 should include the carried-over element, comparisons of good and bad practice and visual examples from required readings. New visualisations may be included where useful; they are not mandatory simply because they appear in the list of possible examples.",
          buildMode: "dim",
          progressive: true
        },
        {
          type: "mindmap",
          title: "Ready to submit?",
          bullets: [
            "Where?\tSubmit online through Canvas.",
            "Identity\tBoth submissions must be anonymous.",
            "When?\tAE1: 30 October. AE2: 27 November. Both 13:00 UK, 2026.",
            "AE1 files\tPython notebook (.ipynb) AND its .html export.",
            "AI rule\tAI use is prohibited in both assessments.",
            "Evidence\tUse real, cited data and justify your design choices."
          ],
          notes: "Ask students to say what they would check under each branch before revealing it. AE2 is a written report, but its supplied brief also lists .ipynb and .html. Confirm the report packaging before giving a definite AE2 file instruction. Categorical marking applies. Refer students to the full Canvas briefs for complete requirements; these slides summarise them.",
          progressive: true
        },
        {
          type: "keyfact",
          title: "Course Administration & Expectations",
          subtitle: "Canvas deadline",
          body: "Friday after each lab,\n12:00",
          notes: "One fact, nothing beside it. The reminders used to sit under this in grey, which said they mattered less — they do not, so they have a slide of their own now. Read this out, pause, then move on."
        },
        {
          type: "cards",
          title: "Three things that keep you out of trouble",
          design: {
            cardsMode: "rows"
          },
          bullets: [
            "Time management\tDon’t wait until the last minute. Manage your time and keep a balance.",
            "Ask early\tWhen unsure, ask for help.",
            "One submission\tSubmit worksheets on Canvas by midday on the Friday after the lab."
          ],
          notes: "All three carry equal weight, which is why they are equal on the slide. The third repeats the deadline deliberately — it is the one students get wrong, and hearing it twice in two minutes is the point.",
          progressive: true
        },
        {
          type: "split",
          title: "Reading · the theory text",
          subtitle: "Munzner, Visualization Analysis & Design (CRC Press)",
          bullets: [
            "Chapters 1 and 6 this week — what visualisation is, and why we do it at all.",
            "Chapter 1 gives you the definition we use all term; chapter 6 gives you rules of thumb to argue with.",
            "This is the book the assessment criteria are written against. Read it slowly."
          ],
          notes: "The theory spine of the course. Flag the chapter numbers explicitly — the Canvas page and an earlier slide have disagreed on this before, so say which is right out loud.",
          image: "assets/lesson/ipdv/munzner-cover.jpg",
          imageFit: "contain",
          progressive: true
        },
        {
          type: "split",
          title: "Reading · the practitioner text",
          subtitle: "Alan Smith, How Charts Work (FT Publishing)",
          bullets: [
            "How a working newsroom reads a chart: finding the real story, then designing for an audience that did not ask for it.",
            "Where the Financial Times explanatory graphics come from — including John Burn-Murdoch’s scatterplots.",
            "We look at one of those charts later today."
          ],
          notes: "Alan Smith wrote the book; Burn-Murdoch is a colleague whose charts appear in it. Do not attribute the book to Burn-Murdoch — students will cite it wrongly if you do.",
          image: "assets/lesson/ipdv/smith-how-charts-work-cover.jpg",
          imageFit: "contain",
          progressive: true
        },
        {
          type: "split",
          title: "Reading · the weekly rhythm",
          bullets: [
            "Read the assigned chapters before Tuesday’s lecture, not after it.",
            "The lab applies what the reading sets up — arriving cold costs you the session.",
            "Lab worksheets are submitted on Canvas by Friday midday."
          ],
          notes: "The habit slide. Tie the reading to the lab rather than to an exam: the pay-off is being able to do Thursday’s work, which is a reason that survives week three.",
          image: "assets/brand/nu-london-skyline.png",
          progressive: true
        },
        {
          type: "content",
          title: "Learning Objectives",
          bullets: [
            "Define visualisation and explain its cognitive value over pure statistics.",
            "Apply Tamara Munzner’s What-Why-How framework to deconstruct visualisations.",
            "Identify the four levels of the nested model for visualisation design.",
            "Distinguish principles, guidelines and rules of thumb, then use the 4Ps as a practical workflow.",
            "Critique visualisations using systematic analytical criteria."
          ],
          notes: "By the end of this session, students will be able to articulate why visualisation matters and begin applying systematic critique to any chart idiom."
        },
        {
          type: "game",
          gameRef: "check-admin",
          notes: "Closes the housekeeping block. If more than a couple get this wrong, say the deadline again before moving on — it is the only administrative fact they cannot afford to lose."
        },
        {
          type: "section",
          title: "Why Visualise?",
          subtitle: "Beyond raw numbers and summary tables.",
          notes: "Launch the word cloud. Ask students to submit on their phones. Highlight words like \"patterns\", \"outliers\", \"speed\", \"intuition\", \"relationships\".",
          feedback: {
            kind: "wordcloud",
            prompt: "In one word: what does a graphic do that statistics alone cannot?",
            options: [],
            max: 2
          }
        },
        {
          type: "mindmap",
          title: "Why visualise?",
          bullets: [
            "Discover\tSpot patterns we did not expect.",
            "Explain\tMake a finding understandable to others.",
            "Compare\tSee differences between groups.",
            "Question\tNotice outliers and challenge assumptions.",
            "Decide\tUse evidence to choose what to do next.",
            "Think\tPut relationships on the page to reason about them."
          ],
          notes: "Connect this map to the preceding word cloud. Ask which branch a student contribution belongs to. Reveal one branch at a time with Next. Ask for an example before moving on. These branches organise reasons to visualise; they are not numerical measurements.",
          buildMode: "dim",
          progressive: true
        },
        {
          type: "content",
          title: "Big Questions for Data Practitioners",
          bullets: [
            "What were historical authors thinking when they invented new visual forms?",
            "What visual ideas and computational tools were available in their era?",
            "What was needed to see and understand something genuinely new?",
            "What are the modern challenges in big data, AI, and decision-making?"
          ],
          notes: "As we trace the history of charts, observe that every new visual idiom was invented because an existing representation failed to answer an urgent question.",
          progressive: true
        },
        {
          type: "game",
          gameRef: "check-why",
          notes: "Watch for anyone picking the causal option — that misconception comes back at the Brexit scatterplot, so it is worth naming now."
        },
        {
          type: "section",
          title: "A History of Seeing Patterns",
          subtitle: "From ancient clay tablets to modern computational graphics.",
          notes: "We now take a whirlwind tour of data visualisation history to understand the evolution from physical accounting to abstract data coordinates."
        },
        {
          type: "content",
          title: "Timeline of Data Visualisation",
          bullets: [
            "Pre-Historic & Antiquity: Cave paintings, tally sticks, and Roman road itineraries (Peutinger Table).",
            "10th–17th Century: Celestial movement plots, Van Langren’s 1644 longitude error graphic.",
            "18th–19th Century: Playfair’s statistical graphics, Minard’s Napoleon march flow map, Nightingale’s rose chart.",
            "20th Century: Tukey’s Exploratory Data Analysis (EDA), Bertin’s Semiology of Graphics, Cleveland & McGill perception studies.",
            "The Information Age: Interactive web graphics (D3, Observable), GPU rendering, real-time streaming dashboards."
          ],
          notes: "Point out John Tukey’s quote: \"The greatest value of a picture is when it forces us to notice what we never expected to see.\" This sets up Anscombe’s Quartet.",
          progressive: true
        },
        {
          type: "image",
          title: "Pre-Sargonic tablet · c. 2500 BC",
          body: "This tablet records silver and other commodities.\nRuled columns separate entries into a structured account.\nIts organisation connects an ancient record to the tables we use today.",
          subtitle: "Sumerian account of silver and commodities, in ruled columns · from the course slides",
          notes: "Encoding used → insight unlocked: structured columns made accounts auditable. Ask what the grid is doing before naming “spreadsheet”.",
          image: "assets/lesson/ipdv/clay-tablet-presargonic.jpg",
          imageFit: "contain",
          design: {
            capStyle: "scrim"
          }
        },
        {
          type: "image",
          title: "Ptolemy’s world map · 1482",
          body: "Maps encode places through their position on a surface.\nA grid provides a shared reference for locating and comparing places.\nEvery flat world map must make choices about how to represent a curved Earth.",
          subtitle: "Spatial reality made communicable — science and aesthetics together · from the course slides",
          notes: "Spatial encoding made relationships traversable. Maps are the oldest data graphics many students already trust — use that familiarity.",
          image: "assets/lesson/ipdv/ptolemy-cartography.jpg",
          imageFit: "contain",
          design: {
            capStyle: "scrim"
          }
        },
        {
          type: "image",
          title: "Christoph Scheiner · 1612",
          body: "The plates record sunspot positions at different times.\nRepeated observations turn a changing phenomenon into a visible sequence.\nKeeping a consistent frame makes movement easier to compare.",
          subtitle: "Engraved plates tracking sunspot positions over time · from the course slides",
          notes: "Time-series drawings made sunspot motion undeniable — one of the earliest systematic astronomical series. Force the so-what before moving on to discovery cases.",
          image: "assets/lesson/ipdv/scheiner-sunspots-1612.jpg",
          imageFit: "contain",
          design: {
            capStyle: "scrim"
          }
        },
        {
          type: "image",
          title: "William Playfair · Statistical Breviary, 1801",
          body: "This chart compares the Turkish Empire’s land across Asia, Europe and Africa.\nThe circle represents a whole and its sectors represent shares.\nThe visual task is comparing proportions rather than geographic locations.",
          subtitle: "Pie chart of the Turkish Empire’s landmass · from the course slides",
          notes: "Before Playfair, charts were almost exclusively maps or astronomical diagrams tied to physical space. Playfair realized money, debt, and populations could be plotted as coordinates. Teaching beats if asked: earliest known pie chart; also invented bar and line charts; proportional angle and area for part-to-whole.",
          image: "assets/lesson/ipdv/playfair-pie-1801.jpg",
          imageFit: "contain",
          design: {
            capStyle: "scrim"
          }
        },
        {
          type: "image",
          title: "Charles Joseph Minard · Pavé de Paris, 1826",
          body: "The chart records the maintenance of Paris pavements over time.\nA chronological arrangement makes successive periods comparable.\nIt shows how an everyday administrative record can become a visual account of change.",
          subtitle: "Tableau chronologique de l’entretien du pavé de Paris — his earliest statistical graphic · from the course slides",
          notes: "Minard’s first statistical graphic, forty-three years before the Napoleon map — from Projet de canal et de chemin de fer pour le transport de pavés à Paris (1826). Ask what is being compared before naming it — the shape reads long before the French does.",
          image: "assets/lesson/ipdv/tableau-chronologique-paris.jpg",
          imageFit: "contain",
          design: {
            capStyle: "scrim"
          }
        },
        {
          type: "game",
          gameRef: "check-history",
          notes: "The point of the plate run in one question: the jump is from drawing things that have a location to drawing things that do not."
        },
        {
          type: "section",
          title: "When Visualisations\nLed to Discovery",
          subtitle: "Four cases where the picture made the pattern undeniable.",
          notes: "Red section break after the ancient plates. Pause here: the next four slides are full-bleed discovery cases — Snow, Galton, Maunder, Hertzsprung–Russell. Ask what those three plates already shared before naming the pattern."
        },
        {
          type: "image",
          title: "John Snow · 1854",
          body: "The map places cholera deaths in their street locations.\nTheir concentration around Broad Street made a spatial pattern visible.\nThe map supported Snow’s investigation; a cluster alone does not establish its cause.",
          subtitle: "Cholera deaths around the Broad Street pump — visual proof the disease was water-borne, not miasma",
          notes: "Discovery beat 1 of 4. Could not have been achieved from raw death tables alone — the map made the cluster undeniable. Ask: what would a spreadsheet of the same cases have hidden?",
          image: "assets/lesson/ipdv/snow-cholera-map-1854.jpg",
          imageFit: "contain",
          design: {
            capStyle: "scrim"
          }
        },
        {
          type: "image",
          title: "Francis Galton · 1863",
          body: "Weather maps bring observations from different places into a shared geographic view.\nSymbols allow several weather conditions to be compared across locations.\nGalton’s Meteorographica appeared in 1863 and used observations from December 1861.",
          subtitle: "Meteorographica, built from December 1861 observations · the pattern that made anti-cyclones visible",
          notes: "Discovery beat 2 of 4. Spatialising barometric readings revealed a structure no column of numbers showed. Tie back to Snow: same lesson, different domain.",
          image: "assets/lesson/ipdv/galton-weather-chart-1861.gif",
          imageFit: "contain",
          design: {
            capStyle: "scrim"
          }
        },
        {
          type: "image",
          title: "E.W. Maunder · 1904",
          body: "The butterfly diagram plots sunspot latitude against time.\nRepeated bands show how sunspot locations shift during successive solar cycles.\nIts distinctive shape comes from a pattern in the observations.",
          subtitle: "Solar “butterfly diagram” — sunspot latitudes march with the 11-year cycle",
          notes: "Discovery beat 3 of 4. The cycle was in the data; the diagram made the migration pattern obvious. Link to Scheiner’s earlier sunspot plates if you still have that beat warm.",
          image: "assets/lesson/ipdv/maunder-butterfly-1904.jpg",
          imageFit: "contain",
          design: {
            capStyle: "scrim"
          }
        },
        {
          type: "image",
          title: "Hertzsprung–Russell · 1911",
          body: "The diagram compares stellar luminosity with spectral class or temperature.\nStars form recognisable groups rather than filling the chart uniformly.\nThe main sequence illustrates how a scatterplot can reveal structure across many observations.",
          subtitle: "Luminosity vs spectral class — the main sequence of stellar evolution appears as a structure, not a table",
          notes: "Discovery beat 4 of 4. Close the set: in every case the visual spatialisation made the invisible pattern undeniable. Then land Munzner’s definition.",
          image: "assets/lesson/ipdv/hr-diagram-1911.svg",
          imageFit: "contain",
          design: {
            logoGround: "dark",
            capStyle: "scrim"
          }
        },
        {
          type: "quote",
          title: "",
          subtitle: "Tamara Munzner · Visualization Analysis and Design",
          body: "Computer-based visualization systems provide visual representations of datasets designed to help people carry out tasks more effectively.",
          notes: "Unpack this definition carefully: computer-based (scalable, interactive), visual representations (encoding data onto visual channels), datasets, tasks (why are we doing this?), and effectively (validation)."
        },
        {
          type: "content",
          title: "Augmenting Human Capabilities",
          bullets: [
            "Human-in-the-Loop: Visualisation is needed when computational algorithms alone cannot make fully automated decisions.",
            "Huge Design Space: Infinite combinations of visual idioms exist; most possibilities in the design space are ineffective for a given task.",
            "Trade-offs & Constraints: Every visual encoding prioritizes some comparisons while obscuring others.",
            "Validation is Difficult: Must validate at all four levels: domain problem, data/task abstraction, visual encoding, and algorithm efficiency."
          ],
          notes: "Contrast visualization with machine learning. When you know exactly what to optimize and trust the model 100%, automate. When there is ambiguity, open-ended exploration, or human accountability, visualize.",
          progressive: true
        },
        {
          type: "game",
          gameRef: "check-discovery",
          notes: "Note that every wrong option is something the table does tell you. The map did not add data — it changed what could be seen in it."
        },
        {
          type: "section",
          title: "From Examples\nto a Framework",
          subtitle: "The history showed what works. Now the vocabulary for why.",
          notes: "Red section break after the discovery cases. They have just watched five centuries of examples; this is the turn from \"look at these\" to \"here is how we analyse any of them\". Say the shift out loud — it is the moment students lose the thread if you do not."
        },
        {
          type: "mindmap",
          title: "What, Why and How",
          bullets: [
            "WHAT · Data\tWhat information do we have: tables, networks, fields, geometry or combinations?",
            "WHY · Task\tWhat does the audience need to discover, compare, locate, explain or decide?",
            "HOW · Encode\tWhich marks and visual channels will make the important comparison easiest to see?",
            "HOW · Interact\tHow can people filter, select, navigate, rearrange or change the view?"
          ],
          notes: "Use one familiar chart and walk around the map. WHAT describes the data, WHY names the human task, and HOW covers the visual idiom and interaction. Ask students to change one branch and predict how the design must change.",
          buildMode: "dim",
          progressive: true
        },
        {
          type: "journey",
          title: "Four levels of the nested model",
          subtitle: "Validate from the domain question inward",
          bullets: [
            "1 · Domain problem\tUnderstand the people, vocabulary, decisions and real-world constraints.",
            "2 · Data and task abstraction\tTranslate the domain into data types and actions without losing what matters.",
            "3 · Visual encoding and interaction\tChoose marks, channels and controls that support those tasks.",
            "4 · Algorithm\tImplement the design accurately and efficiently at the required scale."
          ],
          body: "A failure at an outer level cannot be repaired by polishing an inner one.",
          notes: "Reveal from the outside in. Give one failure example at each level: solving the wrong domain problem, abstracting the wrong task, choosing an ineffective idiom, or implementing a slow algorithm. Validation is different at every level.",
          buildMode: "dim",
          progressive: true
        },
        {
          type: "game",
          gameRef: "check-framework",
          notes: "Quick check before Anscombe. If the room confuses What with How, the rest of the term gets harder — it is the difference between the data and the picture of it."
        },
        {
          type: "section",
          title: "When Summaries\nMislead",
          subtitle: "Four datasets that agree on paper and disagree on sight.",
          notes: "Red beat before Anscombe. Ask for a show of hands: who would trust a mean, a spread and a correlation to describe a dataset they had never seen? Then show them the four plots."
        },
        {
          type: "image",
          title: "The Danger of Summary Statistics",
          body: "Anscombe’s Quartet contains four datasets with closely matching summary statistics.\nTheir scatterplots reveal very different patterns.\nAverages and a fitted line cannot fully describe the shape of a dataset.",
          subtitle: "All four: mean x 9 · mean y 7.50 · correlation 0.816 · line y = 3 + 0.5x",
          notes: "Vote before you reveal anything. Most students who have not met Anscombe assume identical numbers mean similar-looking data. Read the four statistics off the slide, then ask the room to sketch what they expect the scatter to look like. Keep the plain words in front: average, spread, how-together, best-fit line.",
          image: "assets/lesson/ipdv/anscombe-raw-data.png",
          imageFit: "contain",
          design: {
            imageFrame: "4:3",
            capStyle: "bar"
          }
        },
        {
          type: "split",
          title: "Anscombe I — a fair straight line",
          subtitle: "Anscombe, F.J. (1973) · The American Statistician 27(1)",
          bullets: [
            "The story: hours revised against exam mark. More study, higher score, with ordinary scatter either side of the trend.",
            "Why it works: the data really is a straight line with even scatter, so an average, a spread and a straight best-fit line are the right tools to describe it.",
            "Hold on to this one. It is the only dataset of the four where the numbers and the picture tell the same story."
          ],
          notes: "Establish the honest case first — everything after this is measured against it. Plain language: average = mean, spread = variance, how-together = correlation, best-fit line = regression. Say explicitly that nothing is wrong here, so nobody assumes statistics are always a trick.",
          image: "assets/lesson/anscombe/anscombe-i.svg",
          design: {
            mediaGround: "full"
          },
          imageFit: "contain",
          imageSide: "left",
          progressive: true
        },
        {
          type: "split",
          title: "Anscombe II — a curve wearing a straight line",
          subtitle: "Anscombe, F.J. (1973) · The American Statistician 27(1)",
          bullets: [
            "The story: practice helps, then levels off. Early hours add a lot, later hours add less. The data bends.",
            "Why the numbers miss it: a correlation measures how straight a relationship is. Asked about curved data it still answers 0.816 — it replies to the question you asked, not the one you should have asked.",
            "No tool warns you. Software fits a straight line to anything, including a curve. Only the plot shows the bend."
          ],
          notes: "The point is not that 0.816 is wrong, it is that it is the wrong measurement. Ask: what would you have to plot to notice? Nothing in the printed report can tell you the shape is unsuitable — that is the whole lesson.",
          image: "assets/lesson/anscombe/anscombe-ii.svg",
          design: {
            mediaGround: "full"
          },
          imageFit: "contain",
          imageSide: "left",
          progressive: true
        },
        {
          type: "split",
          title: "Anscombe III — one bad row spoils the story",
          subtitle: "Anscombe, F.J. (1973) · The American Statistician 27(1)",
          bullets: [
            "The story: ten marks sitting on a perfect straight line, plus one mistyped score far above it.",
            "Why the numbers miss it: without that one row the correlation would be 1.00, a flawless fit. That single point drags it down to 0.816 and pulls the line up with it.",
            "The summary reports one mediocre relationship. The plot reports ten perfect points and one error to go and check."
          ],
          notes: "The counterfactual is the teaching moment: a correlation of 0.816 sounds like slightly noisy data, when what it actually describes is perfect data plus one mistake. Ask what they would do — fix it, investigate it, or drop it — and make them justify the choice.",
          image: "assets/lesson/anscombe/anscombe-iii.svg",
          design: {
            mediaGround: "full"
          },
          imageFit: "contain",
          imageSide: "left",
          progressive: true
        },
        {
          type: "split",
          title: "Anscombe IV — one point invents the slope",
          subtitle: "Anscombe, F.J. (1973) · The American Statistician 27(1)",
          bullets: [
            "The story: every house on the street costs about the same, except one mansion far out of town.",
            "Why the numbers miss it: ten of the eleven points share the same x value of 8. Only one sits out at x = 19. Points that never vary in x can say nothing about slope, so that one far point decides the line by itself.",
            "This is leverage: the further a point sits from the rest along x, the harder it can swing the line. Remove it and there is no slope left to report."
          ],
          notes: "Name leverage, then show it rather than defining it: cover the far point with your hand and ask what the slope is now. Close the set by asking what the room would have missed with only the four numbers from the poll slide.",
          image: "assets/lesson/anscombe/anscombe-iv.svg",
          design: {
            mediaGround: "full"
          },
          imageFit: "contain",
          imageSide: "left",
          progressive: true
        },
        {
          type: "split",
          title: "Four pictures, one quick report",
          bullets: [
            "All four: mean x 9, mean y 7.50, correlation 0.816, best-fit line y = 3 + 0.5x — identical to two decimal places, from eleven points each.",
            "A summary squeezes eleven points into four numbers, and squeezing throws the shape away. That is why different shapes can squeeze down to the same numbers.",
            "So the numbers cannot tell you whether the numbers are the right ones. Only the picture can. Plot the data before you trust any summary of it."
          ],
          notes: "This is the slide to dwell on if time is short. Anscombe built the quartet in 1973 to counter the belief that numerical calculations are exact and graphs are rough. If the room wants more, the Datasaurus Dozen (Matejka and Fitzmaurice, 2017) pushes the same trick to thirteen datasets, one of which is a dinosaur.",
          image: "assets/lesson/ipdv/anscombe-four-plots.png",
          design: {
            mediaGround: "full"
          },
          imageFit: "contain",
          imageSide: "left",
          progressive: true
        },
        {
          type: "split",
          title: "Case Study: Scatterplots in Explanatory Journalism",
          subtitle: "Share of Leave vote against share of regional GDP exported to the EU · Financial Times",
          bullets: [
            "Financial Times Brexit Analysis (John Burn-Murdoch, June 2016).",
            "Each point is a UK region: the x-axis shows the share of regional GDP exported to the EU; the y-axis shows the Leave vote share.",
            "The chart shows a positive association: regions with greater export exposure often recorded a higher Leave vote.",
            "The labelled regions reveal exceptions and context. Association alone does not explain why people voted as they did."
          ],
          notes: "Read the axes before interpreting the line. The surprising relationship is economic exposure to EU trade against Leave vote, not education. Ask why this pattern might exist, then separate hypotheses from evidence: the scatterplot shows association, not a causal explanation.",
          image: "assets/lesson/ipdv/brexit-scatter-ft.jpg",
          design: {
            mediaGround: "full"
          },
          imageFit: "contain",
          progressive: true
        },
        {
          type: "keywords",
          title: "Error Analysis · what the scatterplot does not say",
          bullets: [
            "The claim\t“Regions that export more to the EU voted Leave. So exposure to EU trade caused the Leave vote.”",
            "Spot · 3 min\tFind three things wrong with that sentence as a reading of the chart you have just seen.",
            "Correct · 3 min\tRewrite the claim so it says only what the scatterplot can actually support.",
            "Reflect · 2 min\tWhat further evidence would you need before the word “caused” is allowed?"
          ],
          notes: "Three errors to land: association is not causation; the dotted line is a model someone fitted, not something the data reported; and the labelled exceptions — Inner London, Eastern Scotland — already contradict a simple rule. A fourth, if the room is strong: these are regional averages, so they say nothing about how any individual voted. Ten minutes.",
          timeLimit: 600,
          modelAnswer: "The chart shows that regions exporting more to the EU tended to record a higher Leave vote. It does not show why. The dotted line is a model someone fitted, Inner London and Eastern Scotland sit well off it, and these are regional averages — they say nothing about how any one person voted.",
          activity: "error-analysis",
          activityPresentation: "brief",
          progressive: true
        },
        {
          type: "keyfact",
          title: "After Anscombe",
          subtitle: "The habit",
          body: "Plot the data before you\ntrust any summary of it.",
          notes: "The whole section in one line. Say it, let it sit, then check. If they remember nothing else from this half of the lecture, this is the sentence worth keeping."
        },
        {
          type: "game",
          gameRef: "check-summaries",
          notes: "The hardest of the four datasets, so it is the one worth checking. Cover the far point with your hand again if the room hesitates."
        },
        {
          type: "section",
          title: "Choosing the\nRight Chart",
          subtitle: "The question you are asking decides the shape you reach for.",
          notes: "Red section break after the case study. The run before this was about being misled; this one is about choosing well. Four analytical tasks, four families of chart."
        },
        {
          type: "split",
          title: "Changes over time",
          subtitle: "Time charts reveal direction, pace, cycles and turning points.",
          bullets: [
            "Line position shows how a value rises, falls or remains stable across time.",
            "Slope reveals the direction and rate of change; repeated shapes reveal seasonal cycles.",
            "Peaks, troughs and changes in direction identify the moments that need explanation."
          ],
          notes: "Time is ordered from left to right. Explain the overall trend first, then identify cycles and the specific points where the direction or rate changes.",
          image: "assets/lesson/ipdv/multi-axis-sales-profit.jpg",
          design: {
            mediaGround: "full"
          },
          imageFit: "contain",
          imageSide: "left",
          progressive: true
        },
        {
          type: "split",
          title: "Frequency and distribution",
          subtitle: "A distribution reveals what is typical, how values vary and what is unusual.",
          bullets: [
            "Histograms and density plots reveal the shape, concentration and skew of values.",
            "Box plots summarise the median, middle 50%, overall spread and potential outliers.",
            "Multiple peaks can expose distinct groups that a single average conceals."
          ],
          notes: "Connect this directly to Anscombe's Quartet: equal averages can belong to very different distributions. The shape provides evidence that the summary cannot.",
          image: "assets/lesson/ipdv/box-whisker-age-groups.jpg",
          design: {
            mediaGround: "full"
          },
          imageFit: "contain",
          imageSide: "right",
          progressive: true
        },
        {
          type: "split",
          title: "Relationships and correlation",
          subtitle: "Scatterplots show the form, direction and strength of an association.",
          bullets: [
            "Each point preserves one observation and its values on two quantitative measures.",
            "The overall pattern can be positive, negative, curved or show little association.",
            "Clusters and outliers reveal subgroups and exceptions; correlation alone does not establish cause."
          ],
          notes: "Use the preceding Financial Times chart as the example. Describe the overall positive association, the regional clusters and the labelled exceptions without claiming a causal explanation.",
          image: "assets/lesson/ipdv/brexit-scatter-ft.jpg",
          design: {
            mediaGround: "full"
          },
          imageFit: "contain",
          imageSide: "left",
          progressive: true
        },
        {
          type: "split",
          title: "Value, flow and risk",
          subtitle: "Size and position show quantity, movement and concentration across a system.",
          bullets: [
            "In a Sankey diagram, band width represents the quantity moving between stages.",
            "Branches reveal how a total divides, recombines, concentrates or is lost.",
            "Treemap area represents value within a hierarchy; a risk matrix positions likelihood against consequence."
          ],
          notes: "The visual encoding must remain quantitative: thicker bands and larger areas must represent larger values. Preview the detailed Sankey explanation later in the lesson.",
          image: "assets/lesson/ipdv/sankey-income-spending.jpg",
          design: {
            mediaGround: "full"
          },
          imageFit: "contain",
          imageSide: "right",
          progressive: true
        },
        {
          type: "keyfact",
          title: "Before you draw anything",
          subtitle: "The habit",
          body: "The question you are asking\ndecides the shape you reach for.",
          notes: "The counterpart to the Anscombe line: that one is about not trusting a summary, this one is about not reaching for a chart before you know what it is for. Together they are the two habits this lecture exists to build."
        },
        {
          type: "game",
          gameRef: "check-idioms",
          notes: "Task to idiom, which is the whole point of the run they have just seen. Ask the ones who chose a histogram what question a histogram answers instead."
        },
        {
          type: "section",
          title: "The Rule of Thumb",
          subtitle: "Four habits. One professional practice.",
          notes: "Red beat before the 4Ps. Tell them every project this term is judged against this lifecycle — then reveal the cards."
        },
        {
          type: "cards",
          title: "Principles, guidelines and rules of thumb",
          design: {
            cardsMode: "rows"
          },
          bullets: [
            "Principle\tA broad explanation grounded in how people perceive, think or act.",
            "Guideline\tAdvice that usually improves a design, but still depends on audience, task and context.",
            "Rule of thumb\tA memorable shortcut for practice that prompts useful checks rather than guaranteeing an answer."
          ],
          notes: "Ask the room which kind of claim can have exceptions. All three can guide design, but they carry different strength. Present the 4Ps next as this course's practical rule of thumb, not a scientific law.",
          buildMode: "dim",
          progressive: true
        },
        {
          type: "keywords",
          title: "The Rule of Thumb (The 4Ps)",
          bullets: [
            "Plan\tDefine purpose & audience; set success metrics; gather context; choose the core message.",
            "Prepare\tClean & validate data; handle missing values; check for outliers; structure the table properly.",
            "Presentation\tSelect the right chart type; apply colour strategy; create visual hierarchy; add clear annotations.",
            "Polish\tTest with users; check accessibility; verify accuracy; optimise for the medium."
          ],
          notes: "Same keywords layout as Multivariate Idioms. Emphasize that most project failure happens in Plan and Prepare, not Presentation. Reveal one row at a time if you want the room to predict the next P.",
          progressive: true
        },
        {
          type: "game",
          gameRef: "quiz-check",
          notes: "Formative quiz time! 4 questions covering Munzner’s definition, Anscombe’s Quartet, Sankey width encoding, and John Snow’s cholera map.",
          transition: "zoom"
        },
        {
          type: "section",
          title: "Idioms for\nMany Variables",
          subtitle: "When one chart has to carry more than two measures.",
          notes: "Red beat after the formative quiz. Marks the last teaching block before the wrap-up: Sankey, radar, boxplot, Likert and multi-axis."
        },
        {
          type: "image",
          title: "Chart Idioms & Multivariate Analysis",
          body: "Different chart forms support different comparisons.\nMarks represent observations, while channels such as position, length and colour encode values.\nA useful chart makes the audience’s intended comparison easy to see.",
          subtitle: "Selecting the right visual encoding for the analytical task.",
          notes: "Now we move from foundational principles to specific chart idioms and their appropriate use cases.",
          image: "assets/lesson/ipdv/chart-type-grid.png",
          imageFit: "contain",
          design: {
            imageFrame: "16:9",
            capStyle: "bar"
          }
        },
        {
          type: "split",
          title: "Sankey Diagrams",
          subtitle: "Income and spending Sankey · from the course slides",
          bullets: [
            "Directed Flow Networks: Arrows and bands connecting two or more stages of nodes or processes.",
            "Proportional Width: Link width is strictly proportional to the quantity of flow (energy, material, cost, traffic).",
            "Conservation & Distribution: Immediately reveals where resources originate, branch, concentrate, or are lost.",
            "Alternative to Bar or Flow Charts: Captures multi-stage transitions and system-wide allocation simultaneously."
          ],
          notes: "Sankey diagrams originated in thermodynamics (Capt. Matthew Sankey in 1898 showing steam engine energy efficiency). Widely used today in financial audits, user journey funnels, and supply chains. The diagram beside you is Sankey’s own, from the paper the idiom is named after.",
          image: "assets/lesson/ipdv/sankey-income-spending.jpg",
          design: {
            mediaGround: "full"
          },
          imageFit: "contain",
          imageSide: "left",
          progressive: true
        },
        {
          type: "split",
          title: "Box plots compare distributions at a glance",
          subtitle: "Employee age by department · from the course slides",
          bullets: [
            "The box holds the middle 50% of the values, from the lower quartile to the upper, and the line inside it is the median.",
            "The whiskers reach the rest of the range; anything drawn beyond them is flagged as an outlier worth going to check.",
            "Each summary is narrow, so a dozen groups fit side by side — the comparison a histogram cannot make without a dozen charts."
          ],
          notes: "Read one box aloud before comparing any: box, median line, whiskers, outlier. Then ask which department has the widest spread and which has the highest median — they are not the same one, which is the point. Tukey introduced the box plot in 1977.",
          image: "assets/lesson/ipdv/box-whisker-age-groups.jpg",
          imageFit: "contain",
          imageSide: "left",
          design: {
            mediaGround: "full"
          },
          progressive: true
        },
        {
          type: "split",
          title: "Likert scales show the balance of opinion",
          bullets: [
            "Responses run from disagreement through a neutral position to agreement.",
            "A diverging stacked bar makes the balance on both sides of neutral easy to compare.",
            "Keep category order, wording and the neutral group consistent across questions."
          ],
          notes: "Ask students what the centre line lets them compare. Point out that a Likert response is ordered categorical data; the spacing between response categories is not automatically a measured numerical distance.",
          image: "assets/lesson/ipdv/likert-customer-survey.jpg",
          design: {
            mediaGround: "full"
          },
          imageFit: "contain",
          progressive: true
        },
        {
          type: "split",
          title: "Multi-axis charts need restraint",
          bullets: [
            "Separate axes allow series with different units to share one time scale.",
            "Changing either axis range can manufacture or hide apparent agreement between the lines.",
            "Use aligned small multiples or an indexed baseline when the comparison remains clear without two scales."
          ],
          notes: "Demonstrate the warning by describing how stretching one axis changes where the lines cross without changing a single value. Ask what comparison the author actually wants the audience to make.",
          image: "assets/lesson/ipdv/multi-axis-sales-profit.jpg",
          design: {
            mediaGround: "full"
          },
          imageFit: "contain",
          imageSide: "left",
          progressive: true
        },
        {
          type: "keywords",
          title: "Multivariate Idioms: Radar & Boxplots",
          bullets: [
            "Radar Chart\tMultiple quantitative variables plotted on radial axes from a center point; useful for multivariate profile comparison.",
            "Radar Trade-off\tAxis ordering influences enclosed polygon area, which can mislead viewers into perceiving overall size differences.",
            "Box & Whisker Plot\tDisplays the 5-number summary: minimum, Q1 (25th), median (50th), Q3 (75th), and maximum, plus outliers.",
            "Distributional Comparison\tCompact footprint allows side-by-side comparison of dozens of distributions across categories."
          ],
          notes: "Tukey invented the box plot in 1977. Point out the difference between the box (interquartile range IQR) and the whiskers (typically 1.5 * IQR).",
          progressive: true
        },
        {
          type: "split",
          title: "Modern Tooling: Python & AI Workflows",
          bullets: [
            "Computational Libraries: Pandas for data wrangling; Matplotlib & Seaborn for static publication graphics; Altair & Plotly for interactive web charts.",
            "Grammar of Graphics: Leland Wilkinson’s grammar underlying ggplot2 and Altair separates data, marks, scales, and coordinates.",
            "Assessment rule: AI use is prohibited in both AE1 and AE2.",
            "Critical Practitioner Rule: AI generates prototypes; the human practitioner applies the 4Ps, domain expertise, and ethical validation."
          ],
          notes: "Distinguish general discussion of AI tools from assignment permissions. AI use is prohibited in AE1 and AE2. Do not suggest students use AI to draft assessment code or reports.",
          image: "assets/lesson/ipdv/different-charts-python-1.png",
          design: {
            mediaGround: "full"
          },
          imageFit: "contain",
          progressive: true
        },
        {
          type: "game",
          gameRef: "check-multivariate",
          notes: "Last check before the wrap-up. The general lesson: an encoding that produces an eye-catching shape is not automatically encoding anything."
        },
        {
          type: "section",
          title: "Reflect & Self-Assess",
          subtitle: "Check your confidence before our first practical lab.",
          notes: "Use this scale feedback to gauge student readiness for Lab 1. If many students score 1-2, plan a brief recap at the start of the lab session.",
          feedback: {
            kind: "scale",
            prompt: "How confident do you feel applying the 4Ps to evaluate a visualization?",
            points: 5,
            lowLabel: "Need guidance",
            highLabel: "Ready to critique",
            max: 1
          }
        },
        {
          type: "split",
          title: "Summary & Looking Ahead to Lab 1",
          bullets: [
            "Read Chapter 1 & 6 in Munzner before Thursday’s lab.",
            "Lab 1 Focus: student survey, a news visualisation critique, Python/Anaconda setup, and a first notebook chart.",
            "Worksheet Submission: Lab 1 on Canvas by the Monday after the lab, 23:59.",
            "Open Q&A: Bring your questions to the desk or post in the course discussion channel."
          ],
          notes: "Close the lecture. Remind them of the lab schedule and room. Open the floor to initial questions.",
          image: "assets/lesson/ipdv/next-lesson-lab1-1.png",
          imageFit: "contain"
        },
        {
          type: "keywords",
          title: "Muddiest Point",
          bullets: [
            "Write · 3 min\tThe muddiest point for me is…",
            "Be specific\tName the idea or the slide. “Anscombe” helps me less than “why the correlation still said 0.816”.",
            "Listen and revisit\tAfter the explanations, note what is clearer and what you are bringing to Lab 1."
          ],
          notes: "Contributions land in the rail as they arrive. Group them live, then address the top three with student explanations before your own. This is the slide that tells you what to recap at the start of Lab 1 — the confidence scale says whether to recap, this says what.",
          feedback: {
            kind: "brainstorm",
            prompt: "The muddiest point for me is…",
            options: [],
            max: 1,
            presentAs: "rail"
          },
          timeLimit: 780,
  activity: "muddiest-point",
          progressive: true
        },
        {
          type: "image",
          title: "Q & A",
          body: "This night view shows Westminster Bridge and the Palace of Westminster beside the Thames.\nBright lights stand out against the dark sky and water.\nThe same contrast principle helps important marks stand out in a chart.",
          subtitle: "Ask now, or bring it to the lab.",
          notes: "Open the floor. If nothing comes, offer the two questions most groups ask: which chart do I start with, and how much cleaning counts as enough.",
          image: "assets/lesson/ipdv/qa-london-night-1.jpg",
          design: {
            logoGround: "dark",
            capStyle: "scrim",
            capPos: "bottom",
            imageMotion: "zoom"
          }
        }
      ]
    },
    {
      key: 'ipdv-vc',
      title: 'LDSCI6253 Week 2 · Visual Communication',
      icon: '👁',
      blurb: 'Week 2: what visual communication is, Tufte on graphical integrity and the lie factor, rules of thumb, data and attribute types, marks and channels, the Cleveland–McGill ranking, colour, luminance and accessibility.',
      minutes: 90,
      theme: 'northeastern',
      libraryGroup: 'nul',
      kind: 'lecture',
      org: 'Northeastern University London',
      logo: 'assets/brand/nu-london-logo.png',
      logoOn: 'all',
      logoSize: 'small',
      games: [
        {
          ref: 'check-integrity',
          title: 'Check · Graphical integrity',
          style: 'choice',
          settings: { defaultTime: 25, scoreboard: false, scoreSlide: false, intro: false, howTo: false },
          questions: [
            {
              question: "A bar chart's y-axis starts at 90 instead of 0. The real difference between two bars is 4%, but on screen one bar looks three times the other. What is the lie factor?",
              options: [
                "About 0.3 — the graphic understates the effect",
                "About 1.0 — the graphic is honest",
                "About 3 — the graphic overstates the effect",
                "It cannot be calculated without the raw data"
              ],
              correct: 2,
              explanation: "Lie factor = effect shown ÷ effect in the data. Three times the visual difference for the same 4% gives roughly 3. Tufte wants it close to 1.0, and a truncated baseline is the most common way it stops being."
            }
          ]
        },
        {
          ref: 'check-attributes',
          title: 'Check · Attribute types',
          style: 'choice',
          settings: { defaultTime: 25, scoreboard: false, scoreSlide: false, intro: false, howTo: false },
          questions: [
            {
              question: "T-shirt sizes — S, M, L, XL. What kind of attribute is that?",
              options: [
                "Categorical — the labels are just names",
                "Ordinal — ordered, but the gaps are not measurable",
                "Quantitative interval — ordered with equal gaps, no true zero",
                "Quantitative ratio — ordered with equal gaps and a true zero"
              ],
              correct: 1,
              explanation: "There is a real order — M is bigger than S — but L minus M is not a number. That is exactly ordinal: order without arithmetic. Encode it with a sequential ramp or position, never with unordered hues."
            }
          ]
        },
        {
          ref: 'check-channels',
          title: 'Check · Marks and channels',
          style: 'choice',
          settings: { defaultTime: 25, scoreboard: false, scoreSlide: false, intro: false, howTo: false },
          questions: [
            {
              question: "You need people to compare quantities as accurately as possible. Which channel should carry the number?",
              options: [
                "Area — bubbles scale naturally with the value",
                "Colour hue — it is the easiest to tell apart",
                "Position along a common scale",
                "Angle — pie slices are familiar to everyone"
              ],
              correct: 2,
              explanation: "Cleveland and McGill ranked position along a common scale first for accuracy. Area is well down the list, and hue is an identity channel — it says which, not how much."
            }
          ]
        },
        {
          ref: 'check-colour',
          title: 'Check · Colour schemes',
          style: 'choice',
          settings: { defaultTime: 25, scoreboard: false, scoreSlide: false, intro: false, howTo: false },
          questions: [
            {
              question: "You are mapping profit and loss by region, where zero matters. Which colour scheme?",
              options: [
                "Sequential — one hue, light to dark",
                "Diverging — two hues away from a neutral middle",
                "Categorical — a distinct hue per region",
                "Rainbow — the full spectrum covers the range"
              ],
              correct: 1,
              explanation: "A meaningful midpoint is the signature of diverging data. Sequential would hide the sign change, categorical would deny the order, and rainbow invents boundaries the data does not have."
            }
          ]
        }
      ],
      slides: [
        {
          type: "title",
          title: "Visual\nCommunication",
          subtitle: "Week 2 · Lecture 2",
          notes: "Week 1 asked why we visualise at all. Week 2 is the craft: how a number becomes a mark on a screen, and how that mark can tell the truth or quietly lie. Everything today comes back to one question — can the room read the quantity you meant?",
          date: "2026-09-21"
        },
        {
          type: "keyfact",
          title: "Before anything else",
          subtitle: "Canvas deadline",
          body: "Friday after each lab,\n12:00",
          notes: "One fact, on its own, because it is the one students get wrong. Say it, pause, move on — you will say it again at the end of the lab."
        },
        {
          type: "cards",
          title: "Four reminders",
          design: { cardsMode: "rows" },
          bullets: [
            "Don't wait\tThe worksheet is not a Thursday-night job. Start it in the lab while help is in the room.",
            "Ask early\tWhen you are unsure, ask. An hour stuck alone is an hour you do not get back.",
            "Time management\tThis module rewards steady work more than a sprint.",
            "Balance\tTwelve weeks is a long run. Pace it."
          ],
          notes: "Equal weight, so equal on the slide. Keep this to ninety seconds — the subject starts on the next slide but one.",
          progressive: true
        },
        {
          type: "cards",
          title: "By the end of this lesson you can…",
          subtitle: "Four things, and the lab will ask you for all of them",
          design: { cardsMode: "rows" },
          bullets: [
            "Name the data\tMaster the three attribute types and what each one allows you to do.",
            "Apply the rules\tUse design rules of thumb to make a visualisation that works.",
            "Match the channel\tPut the right visual channel on the right kind of data.",
            "Critique on evidence\tJudge a visualisation with perceptual principles, not taste."
          ],
          notes: "Read these as promises you intend to keep. The fourth is the one that changes how they argue in the lab: 'I don't like it' becomes 'that channel cannot carry that data'.",
          progressive: true
        },
        {
          type: "sourcecheck",
          title: "Describe the data before you choose the chart.",
          subtitle: "This week's reading",
          bullets: [
            "Book\tVisualization Analysis and Design\tTamara Munzner",
            "Chapter\t2 · What: Data Abstraction\tRead before the lab",
            "The move\tDescribe data independently of what it is about\tSo the same vocabulary works on any dataset",
            "It asks\tItems, attributes, links, positions?\tAnd: categorical, ordinal or quantitative?"
          ],
          body: "A chart type chosen before the data is described is a guess. Munzner's abstraction is how you stop guessing.",
          notes: "The point of Chapter 2 is the order of operations. Students reach for a bar chart first and ask what the data is afterwards. Munzner reverses it, and the whole module depends on that reversal.",
          progressive: true
        },
        {
          type: "section",
          title: "What visual\ncommunication is",
          subtitle: "Data, encoding, perception — and the gap between them.",
          notes: "A short definitional block. Do not linger: the interesting material is graphical integrity, twenty minutes from here."
        },
        {
          type: "italics",
          title: "Using visual elements to carry information, ideas or a message.",
          body: "In data visualisation that means three things at once: translating abstract data into something you can see, so that a person can understand it, find something they were not looking for, and decide.",
          notes: "The definition is deliberately plain. What matters is the next slide — the three parts, because failure in any one of them looks identical from the outside: the room does not get it."
        },
        {
          type: "cards",
          title: "Three parts, and all three can fail",
          bullets: [
            "Data\tThe information you want to communicate. Wrong here and nothing downstream can save it.",
            "Visual encoding\tHow you represent that data — the marks and the channels you put it on.",
            "Human perception\tHow a viewer actually reads it, which is not always how you meant it."
          ],
          notes: "Ask which of the three they think most projects get wrong. Most rooms say data. It is usually perception — the chart is accurate and still unreadable, which is the whole reason this module exists.",
          progressive: true
        },
        {
          type: "section",
          title: "Design criteria",
          subtitle: "What a visualisation is for, and what it costs.",
          notes: "From definitions to judgement."
        },
        {
          type: "cards",
          title: "Three goals, in tension",
          bullets: [
            "Effectiveness\tIt conveys the intended information accurately.",
            "Efficiency\tIt minimises the mental effort needed to read it.",
            "Aesthetics\tIt is something a person is willing to look at."
          ],
          notes: "Order matters. Aesthetics is last because a beautiful chart that misleads is worse than a plain one that does not — but it is on the list, because a chart nobody reads has also failed.",
          progressive: true
        },
        {
          type: "content",
          title: "Four questions before you draw anything",
          bullets: [
            "What is the message or the story?",
            "Who is the audience?",
            "What decision gets made from this?",
            "Where will it be seen — a talk, a report, a dashboard?"
          ],
          notes: "The third is the one that changes designs. 'What decision gets made from this' turns a chart of everything into a chart of the thing that matters. Ask the room for their AE1 answer to it.",
          progressive: true
        },
        {
          type: "compare",
          title: "Every design choice is a trade",
          subtitle: "What you gain\tWhat it costs",
          bullets: [
            "Simplicity vs completeness\tFaster to read, one clear message\tDetail is gone, and someone needed it",
            "Novelty vs familiarity\tAttention, and a shape that fits odd data\tThe room spends effort learning the chart",
            "Beauty vs clarity\tPeople look, and keep looking\tDecoration can bend the quantity"
          ],
          notes: "Nobody escapes these — the skill is choosing on purpose rather than by accident. Push them: which trade is right for a dashboard a nurse reads at 3am? Which for a front page?",
          progressive: true
        },
        {
          type: "section",
          title: "Graphical\nintegrity",
          subtitle: "Tufte's question: does the picture say what the numbers say?",
          notes: "The spine of the lecture. Everything from here to the rules of thumb is one argument — the graphic is a measurement, and a measurement can be wrong."
        },
        {
          type: "split",
          title: "Read this chart, then answer",
          subtitle: "Polling from a local election · five candidates · three points in time",
          bullets: [
            "In the first election, is candidate 5 doing better than candidate 3?",
            "Between time A and time B, who did better — candidate 2 or candidate 4?",
            "Who has the most momentum in the race?"
          ],
          image: "assets/lesson/ipdv/election-polling-lines.jpg",
          notes: "Run this cold, before any theory. Give them ninety seconds and take answers. The point is not the answers — it is how long the third question takes, and how much of the work is the chart's fault rather than theirs.",
          progressive: true,
          imageSide: "right"
        },
        {
          type: "content",
          title: "Tufte's six principles of graphical integrity",
          bullets: [
            "The size of the effect on the page should be proportional to the size of the effect in the data.",
            "Label clearly and thoroughly. Write explanations on the graph itself.",
            "Show data variation, not design variation.",
            "For money over time, use deflated and standardised units.",
            "Keep the number of information-carrying dimensions at or below the number in the data.",
            "Do not quote data out of context."
          ],
          notes: "The first is the one the lie factor measures, and the one they will break by accident. The fifth is why a 3D pie chart is not a style choice — it adds a dimension the data does not have.",
          progressive: true,
          buildMode: "dim"
        },
        {
          type: "keyfact",
          title: "The lie factor",
          subtitle: "Effect shown in the graphic ÷ effect in the data",
          body: "Should be\n1.0",
          notes: "Write the division on the board. Anything far from 1.0 means the picture is a different measurement from the data. Tufte's own examples run past 14. A truncated bar axis is the everyday version."
        },
        {
          type: "split",
          title: "Where it usually goes wrong",
          subtitle: "The bar chart that does not start at zero",
          bullets: [
            "A bar says 'how much' by its length.",
            "Cut the baseline and the length stops matching the quantity.",
            "The reader is not being careless — they are reading the channel correctly. It is the chart that lied."
          ],
          image: "assets/lesson/ipdv/lie-factor-example.jpg",
          notes: "Important framing: do not blame the audience. Length is the channel a bar uses, so length is what gets read. If the baseline is cut, the chart has broken its own promise. Line charts are different — they encode position, so a truncated axis can be legitimate there.",
          progressive: true
        },
        {
          type: "cards",
          title: "Four common violations",
          design: { cardsMode: "rows" },
          bullets: [
            "Truncated axes\tLength or height no longer matches quantity.",
            "Distorted aspect ratios\tThe same data made to look flat or steep at will.",
            "Cherry-picked ranges\tThe window chosen so the trend points the desired way.",
            "3D effects\tA third dimension the data never had, and perspective that shrinks the back."
          ],
          notes: "Ask for the fifth from the room — dual axes usually comes up, and it is a good answer. Every one of these is available by default in Excel, which is the uncomfortable part.",
          progressive: true
        },
        {
          type: "split",
          title: "The third dimension is not free",
          subtitle: "Perspective makes the far slice smaller than the near one, at identical values",
          image: "assets/lesson/ipdv/violations-3d-distortion.jpg",
          bullets: [
            "Depth adds an information-carrying dimension the data does not have.",
            "It also adds occlusion: the front hides the back.",
            "Nothing is gained. Something is always lost."
          ],
          notes: "This is Tufte's fifth principle with a picture attached. If a student protests that it looks better, that is the beauty-versus-clarity trade from earlier — name it, and make them choose.",
          progressive: true,
          imageSide: "left"
        },
        {
          type: "section",
          title: "Rules of thumb",
          subtitle: "Not laws. Defaults you should need a reason to break.",
          notes: "Tone shift: the integrity block was about not lying. This block is about being read."
        },
        {
          type: "split",
          title: "Clarity over cleverness",
          subtitle: "Maximise the data-ink ratio",
          bullets: [
            "Every drop of ink should carry information.",
            "Gridlines, borders, shadows, gradients, clip-art — pay rent or leave.",
            "Chart junk is not only ugly. It competes with the data for attention."
          ],
          image: "assets/lesson/ipdv/chart-junk-data-ink.png",
          notes: "Tufte's data-ink ratio. Worth saying plainly: the default settings of most tools have a poor ratio, so the ordinary act of accepting defaults is already a design decision.",
          progressive: true
        },
        {
          type: "cards",
          title: "Four defaults worth keeping",
          bullets: [
            "7±2\tLimit distinct categories to about five to nine. Past that, distinguishing them becomes the reader's job.",
            "Get it right in black and white\tIf it only works in colour, it does not work. Colour is the last layer, not the first.",
            "Overview first, zoom and filter, details on demand\tShneiderman's mantra — the shape of every good interactive.",
            "Start with standard chart types\tBar, line, scatter. Familiar shapes cost the reader nothing to learn."
          ],
          notes: "'Get it right in black and white' is the one to dwell on, because it pre-empts the accessibility block at the end. If the design already works without hue, colour-vision deficiency stops being a special case.",
          progressive: true
        },
        {
          type: "statement",
          title: "Clarity over cleverness.",
          body: "If the room has to work out the chart before it can read the data, the chart has taken the attention you needed for the argument.",
          notes: "A beat. Let it sit, then move into data abstraction."
        },
        {
          type: "section",
          title: "What: data\nabstraction",
          subtitle: "Describe the data without mentioning what it is about.",
          notes: "Munzner Chapter 2 proper. The discipline is to stop saying 'it's sales data' and start saying 'it's a table of items with two quantitative and one categorical attribute'."
        },
        {
          type: "cards",
          title: "Four dataset types",
          bullets: [
            "Tables\tItems and their attributes. A spreadsheet is the everyday case.",
            "Networks\tNodes and the links between them. Social graphs, trees, hierarchies.",
            "Fields\tContinuous values sampled over space. Weather, medical imaging.",
            "Geometry\tShape and position in space. Maps, 3D models."
          ],
          notes: "Most of this module lives in tables. Networks arrive in Week 9, fields and geometry in Week 6. Flag that a dataset can sometimes be transformed from one into another — a table of who-emailed-whom is also a network.",
          progressive: true
        },
        {
          type: "table",
          title: "Three attribute types — and what each one lets you do",
          tableHeader: true,
          body: "Type|Ordered?|Arithmetic?|Example\nCategorical|No|No|Country, product, gender\nOrdinal|Yes|No|Rankings, S/M/L/XL, education level\nQuantitative · interval|Yes|Differences only|Temperature in °C — no true zero\nQuantitative · ratio|Yes|Yes, including ratios|Height, weight, count — true zero",
          notes: "Walk the columns, not the rows. 'Ordered?' and 'Arithmetic?' are the two questions that decide everything downstream — which channel is allowed, which colour scheme, whether a mean is even meaningful. 20°C is not twice 10°C; 20kg is twice 10kg. That is the interval/ratio line.",
          progressive: true
        },
        {
          type: "split",
          title: "Categorical needs identity, ordinal needs order",
          subtitle: "Match the channel to the question the data can answer",
          bullets: [
            "Categorical → hue, shape, spatial grouping. Bar charts for counts; pie only for two to five slices.",
            "Ordinal → a sequential ramp, size progression, or position along an axis.",
            "Ordinal in unordered hues throws the order away — the reader cannot get it back."
          ],
          image: "assets/lesson/ipdv/categorical-channels.jpg",
          notes: "The pie caveat is worth stating out loud: it encodes angle, which is well down the accuracy ranking they will see in ten minutes. Two to five slices, or use a bar.",
          progressive: true,
          imageSide: "right"
        },
        {
          type: "statement",
          title: "Never put a continuous colour scale on categorical data.",
          body: "It implies an order that does not exist — and the reader will believe it, because that is what the channel means.",
          notes: "The single most common colour error in student work. Say it now; it will reappear in the colour block and again in Week 4."
        },
        {
          type: "section",
          title: "Marks and\nchannels",
          subtitle: "The atoms of every visualisation you will ever build.",
          notes: "If they remember one section of this lecture, it should be this one. Marks are what you draw; channels are how you vary it."
        },
        {
          type: "split",
          title: "Marks are geometry. Channels are what you vary.",
          subtitle: "Points, lines, areas — then everything you can do to them",
          bullets: [
            "Points (0D) — a location. Scatter plots.",
            "Lines (1D) — a connection or a trend.",
            "Areas (2D) — a region, a proportion.",
            "A channel is any property you change to carry a value: position, length, size, angle, hue, shape, texture."
          ],
          image: "assets/lesson/ipdv/marks-and-channels.jpg",
          notes: "Draw the distinction physically: hold up a dot, then ask what you could change about it. Everything they name is a channel. That is the whole vocabulary.",
          progressive: true
        },
        {
          type: "compare",
          title: "Two families of channel, two different jobs",
          subtitle: "Magnitude · how much\tIdentity · which one",
          bullets: [
            "What it encodes\tOrdered, quantitative values\tCategories with no order",
            "The channels\tPosition, length, area, volume, angle, luminance\tHue, shape, pattern and texture",
            "Read as\tMore or less than\tSame or different from",
            "Gets it wrong when\tThe scale is truncated or non-linear\tThere are too many categories to tell apart"
          ],
          notes: "This table is the practical takeaway. Quantitative data on an identity channel is unreadable as a quantity; categorical data on a magnitude channel invents an order. Both mistakes appear in the lab.",
          progressive: true
        },
        {
          type: "funnel",
          title: "How accurately people read each channel",
          subtitle: "Cleveland & McGill's ranking — most accurate at the top",
          bullets: [
            "Position along a common scale\t100",
            "Position along non-aligned scales\t85",
            "Length, direction, angle\t70",
            "Area\t55",
            "Volume, curvature\t40",
            "Shading, colour saturation\t28"
          ],
          notes: "Alberto Cairo discusses this hierarchy in The Functional Art, from Cleveland and McGill's 1980s experiments. The numbers here are a visual ordering, not published effect sizes — say so if a student asks. The lesson is the order: put your most important quantity on position, and never on saturation.",
          progressive: true
        },
        {
          type: "split",
          title: "The ranking, as Cairo draws it",
          subtitle: "Same data, six channels, six different degrees of accuracy",
          image: "assets/lesson/ipdv/cleveland-mcgill-ranking.png",
          bullets: [
            "This is a hierarchy of elementary perceptual tasks.",
            "It is not about taste. It is about how accurately a person can recover a number from a picture.",
            "Use it as a tie-breaker whenever two chart types would both 'work'."
          ],
          notes: "Point at where pie charts sit — angle, third band. Then at where bubble charts sit — area, fourth. Neither is banned; both are a choice you should now be able to defend.",
          progressive: true,
          imageSide: "left"
        },
        {
          type: "section",
          title: "Colour and\nluminance",
          subtitle: "The channel everyone reaches for first, and understands least.",
          notes: "Week 4 is a whole lecture on colour. Today is the working minimum: pick the right scheme, know that luminance is relative, and design so colour is never load-bearing on its own."
        },
        {
          type: "cards",
          title: "Three schemes. The data chooses, not you.",
          bullets: [
            "Sequential\tOrdered data, low to high. One hue, light to dark.",
            "Diverging\tData with a meaningful middle. Two hues away from a neutral centre.",
            "Categorical\tDiscrete groups with no order. Distinct hues at similar saturation and luminance."
          ],
          notes: "Make the diagnosis explicit: is it ordered? does zero or an average mean something? If yes to both, diverging. If ordered with no special middle, sequential. If unordered, categorical. Three questions, one answer.",
          progressive: true
        },
        {
          type: "split",
          title: "The same numbers, three different claims",
          image: "assets/lesson/ipdv/colour-schemes-three.png",
          bullets: [
            "Sequential says: more of the same thing.",
            "Diverging says: two directions from a middle that matters.",
            "Categorical says: these are different kinds, none is more."
          ],
          notes: "Each scheme makes a claim about the data's structure. Choosing the wrong one is not a style error — it is a false statement about what the numbers are.",
          progressive: true,
          imageSide: "right"
        },
        {
          type: "split",
          title: "Same pixels. Two answers.",
          subtitle: "The dress, 2015",
          bullets: [
            "Some people saw blue and black. Others saw white and gold.",
            "Identical image, identical screen, different perception.",
            "Your viewers are not reading the pixels. They are reading pixels plus an assumption about the light."
          ],
          image: "assets/lesson/ipdv/the-dress-2015.jpg",
          notes: "Take a show of hands — you will get a split in most rooms, and the argument makes the point better than any slide. Then land it: if perception is this unstable for a photograph, a colour legend is not a guarantee of anything.",
          progressive: true
        },
        {
          type: "split",
          title: "We perceive luminance relatively, not absolutely",
          bullets: [
            "The eye is more sensitive to luminance than to hue — so put the most important distinction there.",
            "But the same grey looks lighter or darker depending on what surrounds it.",
            "So: give reference points, legends and direct labels. Never ask the room to judge a value from a shade alone."
          ],
          image: "assets/lesson/ipdv/luminance-contrast.png",
          notes: "The practical consequence is the last bullet. Heatmaps without direct labels ask for exactly the judgement humans are worst at. Pair the colour with a number.",
          progressive: true,
          imageSide: "left"
        },
        {
          type: "stats",
          title: "Design for the room you actually have",
          subtitle: "Colour vision deficiency, in a lecture theatre of this size",
          bullets: [
            "8%\tof men",
            "0.5%\tof women",
            "1 in 12\tmen in this room, roughly"
          ],
          notes: "Do the arithmetic out loud for the actual headcount. It stops being a statistic and becomes a person in row three. Then give the fix: never let hue be the only channel carrying meaning.",
          progressive: true
        },
        {
          type: "split",
          title: "The fix is not a colour. It is a second channel.",
          bullets: [
            "Always pair colour with shape, pattern, position or a direct label.",
            "Test with a colourblind simulator before you submit.",
            "'Get it right in black and white' — the rule from earlier is the same rule as this one."
          ],
          image: "assets/lesson/ipdv/simultaneous-contrast.jpg",
          notes: "Close the loop back to the rules of thumb deliberately. Accessibility is not a separate checklist bolted on at the end; it falls out of a design principle they already agreed to twenty minutes ago.",
          progressive: true
        },
        {
          type: "compare",
          title: "Good practice · reaching the reader",
          subtitle: "Do\tDon't",
          bullets: [
            "Audience\tKnow their expertise and what they need\tDon't assume colour means the same to everyone",
            "Starting point\tStart simple, with a familiar chart type\tDon't overload one view with every variable",
            "Labelling\tLabel axes, units, titles and legends\tDon't hide the context or the relevant range"
          ],
          notes: "First half of the summary. Three rows, not six — six labelled rows do not fit a slide at a readable size, and the fix is to split the content rather than shrink the type. Every row on the left is something from today; every row on the right is a way of breaking it.",
          progressive: true
        },
        {
          type: "compare",
          title: "Good practice · telling the truth",
          subtitle: "Do\tDon't",
          bullets: [
            "Honesty\tShow uncertainty — error bars, intervals\tDon't distort; keep the representation proportional",
            "Comparison\tUse common baselines and aligned scales\tDon't decorate; minimise non-data ink",
            "Process\tIterate — test it on someone, then fix it\tDon't ship the first draft"
          ],
          notes: "Second half. If they photograph one slide, it is this one — honesty and comparison are what the whole integrity block was for. End on Process: the first draft is never the one you submit.",
          progressive: true
        },
        {
          type: "join",
          title: "Questions",
          subtitle: "And anything from the reading you want to argue with.",
          notes: "Leave real time here. The reading is dense and the attribute-type distinctions are where students quietly stay confused. Invite the interval-versus-ratio question if nobody asks it."
        },
        {
          type: "section",
          title: "Next: Lab 1",
          subtitle: "Data types, marks and channels — in code.",
          notes: "The lab turns today into practice: 02_Code_IPDV_DataTypes_Marks_Channels. Remind them of the deadline one last time — Friday after the lab, midday, on Canvas."
        }
      ]
    },
    {
      key: 'nul-lab1',
      title: 'LDSCI6253 Lab 1 · run the room',
      icon: '⌨',
      blurb: 'The same Lab 1 worksheet, built to be run rather than read: the room says where it is stuck, the critique has a worked answer behind it, and every setup step is on screen as the command you actually type — including the error you are about to hit.',
      minutes: 90,
      theme: 'northeastern',
      libraryGroup: 'nul',
      kind: 'lecture',
      org: 'Northeastern University London',
      logo: 'assets/brand/nu-london-logo.png',
      logoOn: 'all',
      logoSize: 'small',
      slides: [
        { type: 'title', title: 'Lab 1', subtitle: 'Information Presentation & Data Visualisation · exercise sheet',
          date: '2026-09-15',
          notes: 'Ninety minutes. The worksheet has four tasks and one deadline, and the only one that needs teaching is the critique — the rest is setup, which goes faster if you find out early who is stuck.\n\nSo this deck opens with a chart instead of admin — a real pie of real cycle-hire numbers that hides everything — and then asks the room where its Python is. Spend the lab on whoever answered “nothing works yet”.\n\nThe survey is still task 1 on the worksheet; it is not a slide any more. Say it once, point at Canvas, move on.' },

        { type: 'chart', chartKind: 'pie',
          title: 'Six years of London cycle hires',
          body: 'Year\tHires\n2018\t10567540\n2019\t10424955\n2020\t10434167\n2021\t10941264\n2022\t11505872\n2023\t8531168',
          chartSource: 'Every Santander Cycle hire, 2018–2023, summed by year · TfL, London Datastore',
          feedback: { kind: 'poll', prompt: 'Real numbers, real chart. What has gone missing?',
            options: [
              'Which year came first',
              'Summer vs winter inside each year',
              'The 2020 break (and the 2023 drop)',
              'All three'
            ], max: 1 },
          notes: 'COLD OPEN. Say nothing about it being a bad chart. Put it up, let them look, take the poll.\n\nThese are real numbers, from a real source, drawn by a real charting library — and the chart still hides everything that matters. That is the whole module in one slide: the same data can be made to say almost anything, and a chart that looks professional is not the same as a chart that is honest.\n\nAsk out loud: what happened in 2020? You cannot tell — 2019 and 2020 are almost the same slice. Where is summer? Gone. Where is April lockdown? Gone.\n\nAnswer is ALL THREE. Then say what the lab is for: by the end of it they draw this same series honestly, from the raw file, themselves.' },

        { type: 'content', title: 'Before anything else: where are you?',
          bullets: [
            'Answer honestly. I will spend this lab on whichever group is biggest.',
            'Nobody is behind — week one of a module is exactly when this is meant to be broken.'
          ],
          feedback: { kind: 'poll', prompt: 'Python on the machine in front of you — where are you?',
            options: [
              'Anaconda installed, a notebook opens',
              'Python installed, notebooks not yet',
              'Installing right now',
              'Nothing yet / not sure what I have'
            ], max: 1 },
          notes: 'THE MOST USEFUL SLIDE IN THE LAB. Thirty seconds, and you know whether to demonstrate the install or move to the critique.\n\nRead the split out loud. If a third are on “nothing yet”, do task 3 together from the front and let the rest start task 2.' },

        { type: 'keywords', title: 'Why that chart tells you nothing (say it out loud)',
          bullets: [
            'Wrong question\tPies answer “share of a total”. You asked “change over time”.',
            'Angles are hard\tThe eye compares position on a line far better than slice size.',
            'COVID vanishes\t2019 ≈ 2020 as annual totals — the crisis is invisible.',
            'Seasons vanish\tTwelve summers and winters collapse into one blob per year.'
          ],
          progressive: true,
          notes: 'One press at a time.\n\nNobody has to be dishonest to produce that pie — it is the default move: open a spreadsheet, press the chart button, pick the colourful one. Most misleading charts are made exactly that way, which is why you can be the person who does not.\n\nThen say where it goes: in task 2 they owe a news chart this same critique, and in task 4 they draw these same numbers properly from the raw file.' },

        { type: 'split', title: 'Two ways a chart can lie to you',
          image: 'assets/lesson/ipdv/anscombe-four-plots.png',
          imageFit: 'contain', design: { mediaGround: 'full' },
          bullets: [
            'Anscombe, 1973: four datasets with the same mean, the same spread, the same correlation and the same best-fit line — and four completely different shapes.',
            'A summary cannot tell you whether the summary is any good. Plot the data before you trust a number about it.',
            'The pie is the other half of the same lesson: the data was honest and the chart still hid everything. Plotting is not enough — the idiom has to fit the question.'
          ],
          notes: 'These two slides are the module in miniature, and the lecture spends six slides on the left half (“When Summaries Mislead”, from slide 40).\n\nLEFT: the numbers agreed to two decimal places and the pictures did not — a curve, an outlier and a single point inventing a slope, all hiding inside identical statistics.\n\nRIGHT: the pie was drawn from real numbers by a real library, and it still lost 2020, the seasons and the order of the years.\n\nSo the habit has two halves: plot the data before you believe a summary of it, and then ask what the plot is actually answering. Task 2 is marked on exactly that second question.' },

        { type: 'cards', design: { cardsMode: 'rows' }, title: 'Four tasks, one deadline',
          bullets: [
            '1 · Survey\tFive minutes on your phone — link on Canvas. It becomes data we visualise later in the module.',
            '2 · A chart in the news\tFind one about a natural disaster. Critique it on Canvas. This is the task that carries marks for thinking.',
            '3 · Python that runs\tAnaconda, then prove it from a terminal.',
            '4 · A notebook with a chart in it\tYour data, your chart, submitted as the notebook.'
          ],
          notes: 'Read this once and do not read it again — the worksheet is on Canvas and they can re-read it there. The room’s time is better spent on tasks 2 and 3.\n\nSurvey link, if you want it on screen or read out: https://forms.office.com/r/9YBnKM34Nt — five minutes, in the room, and say what it is for (background, expectations, favourite colour) because it comes back in week 4 as a chart the cohort made of itself.' },

        { type: 'links', title: 'The lecture behind this lab',
          bullets: [
            'Lecture 1 · Information Presentation & Data Visualisation\t/?lesson=ipdv-intro',
            'Dataset page · London Datastore\thttps://data.london.gov.uk/dataset/number-of-bicycle-hires-2r84d'
          ],
          notes: 'The lecture opens in this app, as its own copy — useful mid-lab when somebody asks “what was that chart with the cholera map?”, and useful to them afterwards for the critique in task 2.\n\nDo not teach from it here. This is a pointer, not a detour.' },

        { type: 'section', title: 'Task 2', subtitle: 'A chart in the news, and what is wrong with it',
          notes: 'The only task here that is about visualisation rather than software. Give it the time the other three do not need.' },

        { type: 'content', title: 'Find one chart about a natural disaster',
          bullets: [
            'A storm, a hurricane season, wildfires, flooding — published, recent, and not from a textbook.',
            'Post it to Canvas with one paragraph: what it shows, what data is behind it, and where it came from.',
            'Then the part that earns the marks\tWhat works, what does not, and what you would change.',
            'Include the URL. A critique of a chart nobody can find is not a critique.'
          ],
          progressive: true,
          notes: 'Push them past “I like the colours”. The question is always: what was the reader meant to take away, and does the chart make that easy or hard?\n\nThe next slide is a worked one. Do not turn it over until they have tried.\n\nLater in task 4 you will draw a bad pie from THEIR OWN cycle-hire numbers — same critique, now with skin in the game.' },

        { type: 'split', imageFit: 'contain', imageSide: 'left', design: { imageShare: 50 },
          image: 'assets/lesson/ipdv/brexit-scatter-ft.jpg',
          title: 'A worked critique, so you know the standard',
          bullets: [
            'What it shows: the referendum result against a measure of each area, one dot per area.',
            'What works: the dots are the data — no summary in the way — and the axes are labelled in the units of the thing.',
            'What is harder: overlapping dots hide density, and a trend read off a cloud invites a causal claim the chart cannot support.',
            'What I would change: name the finding in the title, and say how many areas each dot covers.'
          ],
          modelAnswer: 'A strong paragraph does four things in order: says what the chart claims, names the data and its source, says which visual channel carries the claim, and then makes ONE concrete change with a reason. “The colours are ugly” is not a critique. “The y-axis starts at 40, so a four-point difference fills half the height” is one, because it names the mechanism and the consequence.',
          notes: 'Talk through the four bullets, then turn the card over: the box behind it is the standard for the Canvas paragraph, written as a rule rather than an example so it transfers to whatever chart they found.\n\nThis plate is in the module’s own asset folder, so it is the same chart they will meet again in the lecture on correlation.' },

        { type: 'section', title: 'Task 3', subtitle: 'Python that runs — and proving that it does',
          notes: 'Anaconda rather than a bare Python, because it arrives with pandas, matplotlib, Jupyter and an environment manager, and week one is not the week to teach pip.' },

        { type: 'links', title: 'The two downloads, and nothing else',
          bullets: [
            'Anaconda · Python, Jupyter, pandas, matplotlib in one installer\thttps://www.anaconda.com/download',
            'Google Colab · a notebook in the browser, nothing to install\thttps://colab.research.google.com'
          ],
          notes: 'Colab is the escape hatch, and say so: a machine that will not cooperate today should not cost anybody task 4. The notebook is the deliverable, not the toolchain.\n\nAny editor is allowed as long as it is Python 3.x. Anaconda is the recommendation, not a rule.' },

        { type: 'code', language: 'text', codeReveal: 'all',
          title: 'Prove it from a terminal, not from a feeling',
          code: '# macOS: Terminal · Windows: Anaconda Prompt\n\npython --version\n# Python 3.12.x   ← anything 3.x is fine\n\nconda --version\n# conda 24.x.x    ← Anaconda is on the PATH\n\npython -c "import matplotlib, pandas; print(\'libraries ok\')"\n# libraries ok\n',
          notes: 'THREE COMMANDS, and they are the whole of task 3. “I think it installed” is not a result; a version number is.\n\nThe third line is the one that matters: Anaconda can be installed and still not be the Python your terminal finds. If that line prints an error and the first two worked, they have two Pythons — next slide.' },

        { type: 'code', language: 'text', codeReveal: 'all',
          title: 'The error you are about to hit',
          code: 'ModuleNotFoundError: No module named \'matplotlib\'\n\n# Not a broken install. The terminal is finding a different Python.\n# Ask which one:\n\nwhich python        # macOS / Linux\nwhere python        # Windows\n\n# If the answer is not inside your anaconda3 folder, open the\n# Anaconda Prompt instead of the system terminal, or run:\n\nconda activate base\n',
          notes: 'Put this on the wall BEFORE they hit it, because a room of thirty will produce this error about eight times and each one will read as “Anaconda is broken”.\n\nIt is the single most useful slide in the lab. Two Pythons on one machine is the normal state of a laptop, not a fault.' },

        { type: 'section', title: 'Task 4', subtitle: 'A notebook with your chart in it',
          notes: 'Small on purpose. The point is a working pipeline end to end — data in, chart out, notebook submitted — not an impressive chart.' },

        { type: 'cards', design: { cardsMode: 'rows' }, title: 'Four stages, and you have all four',
          bullets: [
            'Raw\tOpen the file. Look at the mess before you trust it.',
            'Clean\tOne row per day — then look at the table on the wall.',
            'Visualise\tPick a chart that fits the question (and spot one that does not).',
            'Insights\tWhat you found, in sentences. This is the part that is marked.'
          ],
          notes: 'The shape of every task in this module. Code for all four stages follows — nobody is marked on typing it.\n\nWhat is marked is stage 4, and stage 3 is where beginners usually go wrong: a colourful pie of years looks like “doing visualisation” and answers the wrong question. You will see that trap on purpose before you draw the line.' },

        { type: 'links', title: 'The dataset: every Santander Cycle hire since 2010',
          bullets: [
            'Dataset page · London Datastore\thttps://data.london.gov.uk/dataset/number-of-bicycle-hires-2r84d',
            'Download the Excel · course copy · 148 kB\t/lessons/tfl-daily-cycle-hires.xlsx',
            'Worked Jupyter notebook · every cell run\t/lessons/01_Lab_IPDV_CycleHires_Solutions.ipynb',
            'Or bring your own · filter by CSV\thttps://data.london.gov.uk'
          ],
          notes: 'One file, 148 kB, one number per day from 30 July 2010 to 31 August 2026 — 5,877 days and 154,053,134 hires. Small enough to open, long enough to have something to say about.\n\nClick the Excel and the notebook on this slide — both ship with the app under /lessons/. Put the .xlsx beside the notebook so the path in the code is the path they actually have.\n\nUse TfL or bring your own; the four stages and the marks are the same either way.\n\nOn the same site if they want a categorical comparison instead of a time series: London Fire Brigade incident records, where open-space fires spike in heatwaves and link back to task 2, and MPS recorded crime by borough.' },

        { type: 'code', language: 'python', typewrite: true, typeSpeed: 55,
          title: 'Stage 1 · Raw. Look before you believe.',
          code: 'import pandas as pd\n\n# Download the .xlsx from the link on the last slide and put it\n# beside your notebook. Pointing pandas at the URL gives 403.\npath = "tfl-daily-cycle-hires.xlsx"\n\nprint(pd.ExcelFile(path).sheet_names)\n# [\'Metadata\', \'Data\']   <- sheet 0 is NOT the data\n\nraw = pd.read_excel(path, sheet_name="Data", header=None)\nprint(raw.shape)          # (5883, 16)\nprint(raw.iloc[:7, 1:3])  # notes and totals sit above the series\n',
          notes: 'TWO TRAPS, both measured rather than guessed, and either one takes a lab down.\n\nFIRST: read_excel(url) returns HTTP 403 Forbidden. The Datastore refuses the default user agent urllib sends, so a browser download works, curl works, and pandas does not. Download the file and read it from disk — which is also the version that survives lab wifi. Anyone set on the URL needs urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"}).\n\nSECOND: the obvious line — read_excel(url, sheet_name=0) — reads the METADATA sheet: twenty-nine rows of description. pd.to_datetime on that either fails or, worse, does not.\n\nThis file also carries a notes paragraph and three grand totals above the table, and day, month and year blocks side by side across sixteen columns. None of that is a fault; it is what a published spreadsheet looks like.\n\nThe rule, said out loud: print the shape and the first rows before writing a single line that assumes a structure.' },

        { type: 'table', tableHeader: true,
          title: 'What the Excel looks like on disk',
          body: 'Column\tValue\n(blank)\t\nNote about delayed system events…\t\n(blank)\t\nDaily Grand Total\t154053134\n(blank)\t\nDay\tNumber of Bicycle Hires\n2010-07-30\t6897\n2010-07-31\t5564\n2010-08-01\t4303',
          notes: 'THIS is stage 1 on the wall. The real header is “Day / Number of Bicycle Hires”. Everything above it is preamble. Sixteen columns sit beside these two (month and year blocks) — not shown here so the mess stays readable.\n\nPoint at the grand total and the header. Then clean.' },

        { type: 'code', language: 'python', typewrite: true, typeSpeed: 55,
          title: 'Stage 2 · Clean. One row per day.',
          code: 'df = pd.read_excel(path, sheet_name="Data", skiprows=5,\n                   usecols=[1, 2], names=["date", "hires"])\n\ndf = df.dropna()\ndf["date"] = pd.to_datetime(df["date"])\ndf["hires"] = pd.to_numeric(df["hires"])\n\n# Check against the total the file states about itself:\nprint(len(df), int(df["hires"].sum()))\n# 5877 154053134   <- matches the sheet’s own Grand Total\n',
          notes: 'Five arguments, and each is a decision they should be able to defend: the sheet by NAME rather than position, skip the five rows above the header, take two of the sixteen columns, name them.\n\nThe print is the habit worth stealing. The file states its own grand total — 154,053,134 — so a clean read can be checked against it. If the sum does not match, the cleaning is wrong, and they have found out in one line instead of in the marking.' },

        { type: 'table', tableHeader: true,
          title: 'After cleaning — one row per day',
          body: 'date\thires\n2010-07-30\t6897\n2010-07-31\t5564\n2010-08-01\t4303\n2010-08-02\t6642\n2010-08-03\t7966\n2010-08-04\t7893\n2010-08-05\t8724\n2010-08-06\t9797\n2026-08-29\t15779\n2026-08-30\t20335\n2026-08-31\t19426',
          notes: 'LOOK AT IT BEFORE YOU PLOT IT. Two columns, real dates, real numbers — 5,877 rows in full between the first week and the last three days shown.\n\nShown whole on arrival (not Build on Next): a table you cannot see until you press is not a table on the wall.\n\ndate is datetime, hires is a number — that is what makes resample and sum work on the next slides.' },

        { type: 'content', title: 'Pause. Same table — which chart would you draw?',
          bullets: [
            'You have one number per day for years.',
            'Your question is: how do hires change over time?',
            'You have already seen what the wrong answer looks like. Vote.'
          ],
          feedback: {
            kind: 'poll',
            prompt: 'Best first chart for this daily time series?',
            options: [
              'Pie of each year as a slice',
              'Line of hires over months',
              'Pie of the twelve calendar months',
              'One giant number: the grand total'
            ],
            max: 1
          },
          notes: 'ENGAGEMENT BEAT. Do not reveal the answer yet.\n\nThis is the callback to the slide the lab opened on: the pie of years is option one, and some of them will still pick it. That is worth seeing — the default move survives being told it is wrong, which is why they have to draw the honest chart themselves.\n\nCorrect is the line. The giant number is honest but not a chart. Both pies are traps.' },

        { type: 'code', language: 'python', typewrite: true, typeSpeed: 55,
          title: 'Stage 3 · Visualise. One question, one chart.',
          code: 'import matplotlib.pyplot as plt\n\nmonthly = df.set_index("date")["hires"].resample("ME").sum()\n\nfig, ax = plt.subplots(figsize=(11, 4))\nax.plot(monthly.index, monthly.values, linewidth=1.2)\nax.set_title("Hires peak every summer — and 2020 broke the pattern")\nax.set_ylabel("Hires per month")\nax.spines[["top", "right"]].set_visible(False)\nplt.tight_layout()\nplt.show()\n',
          notes: 'The pie the lab opened on was these same numbers. This is the chart that answers the question they voted on.\n\nDaily is too noisy from the back of the room, so resample to monthly totals first — an editorial choice that belongs in the write-up.\n\nThe title carries the finding: “Hires per month” is the axis; “Hires peak every summer and 2020 broke the pattern” is the chart. Remove the top and right spines so the ink goes on the line, not the frame.' },

        { type: 'chart', chartKind: 'line', design: { chartMotion: 'grow' },
          title: 'Same data · a line that answers the question',
          body: 'Month	Hires (thousands)\nJan 18	646\nFeb 18	576\nMar 18	605\nApr 18	825\nMay 18	1113\nJun 18	1182\nJul 18	1253\nAug 18	1058\nSep 18	1008\nOct 18	978\nNov 18	738\nDec 18	585\nJan 19	686\nFeb 19	699\nMar 19	792\nApr 19	890\nMay 19	1007\nJun 19	1006\nJul 19	1152\nAug 19	1054\nSep 19	966\nOct 19	852\nNov 19	729\nDec 19	592\nJan 20	710\nFeb 20	641\nMar 20	554\nApr 20	591\nMay 20	1121\nJun 20	1159\nJul 20	1170\nAug 20	1153\nSep 20	1138\nOct 20	848\nNov 20	760\nDec 20	589\nJan 21	410\nFeb 21	511\nMar 21	749\nApr 21	944\nMay 21	922\nJun 21	1184\nJul 21	1168\nAug 21	1111\nSep 21	1220\nOct 21	1111\nNov 21	945\nDec 21	667\nJan 22	749\nFeb 22	750\nMar 22	1057\nApr 22	1031\nMay 22	1201\nJun 22	1280\nJul 22	1316\nAug 22	1260\nSep 22	801\nOct 22	864\nNov 22	726\nDec 22	472\nJan 23	571\nFeb 23	613\nMar 23	631\nApr 23	647\nMay 23	821\nJun 23	885\nJul 23	809\nAug 23	778\nSep 23	847\nOct 23	790\nNov 23	665\nDec 23	474',
          chartSource: 'TfL daily cycle hires, summed by month (thousands). 2018–2023 only — long enough to see the annual cycle, the April 2020 lockdown dip, the January 2021 floor, and the weaker summers of 2023. Whole-year totals hide all of that: 2019 and 2020 look almost the same.',
          notes: 'THE PAYOFF. Same cleaned data as the pie — now you can see summers, the April 2020 crater, the January 2021 floor, and weaker 2023 peaks. Ask the room to point at each with a finger.\n\nThis is what their notebook draws. The title states the finding; the pie could not. Then go to the insight numbers.' },

        { type: 'links', title: 'Your turn — open the files and run it',
          bullets: [
            'Download the Excel · course copy\t/lessons/tfl-daily-cycle-hires.xlsx',
            'Worked Jupyter notebook\t/lessons/01_Lab_IPDV_CycleHires_Solutions.ipynb',
            'Dataset page · London Datastore\thttps://data.london.gov.uk/dataset/number-of-bicycle-hires-2r84d'
          ],
          notes: 'Leave this up while they work. The notebook is the answer key for stages 1–4; the Excel sits beside it so path = "tfl-daily-cycle-hires.xlsx" resolves.' },

        { type: 'stats', design: { statStyle: 'bar' }, title: 'Stage 4 · Write the finding (numbers attached)',
          bullets: [
            'Summer against winter\t2.0×\tJuly averages 34,212 hires a day, December 17,132',
            'April 2020 against April 2019\t−34%\t591,294 against 890,148 — the lockdown month',
            '2022 against 2023	−26%	11.51M hires to 8.53M — the step the chart cannot explain'
          ],
          body: 'And weekdays beat weekends: 27,500 hires a day against 22,998. This is a commuting scheme, not a leisure one.',
          notes: 'All four are real, computed from the file, and this is the answer sheet.\n\nThe third one is the most useful thing on the slide, because the honest answer is a shrug: the series shows a 26% drop between 2022 and 2023 and contains nothing that explains it. Fares, dock changes, e-bikes, the weather — none of that is in the file. Saying so is a better insight than inventing a cause, and it is the difference between a description and a finding.\n\nTwo more if the room is quick. The deepest month after the launch year is January 2021 at 409,887, and it is a compound of two things — January is the seasonal floor anyway, and that was a lockdown — so it is a warning about reading an event off a seasonal series.\n\nThe trap worth teaching is not on the slide: the LOWEST month in the whole series is July 2010 at 12,461 hires, which looks like a catastrophe and is two days of trading, because the scheme opened on the 30th. A finding that is really a calendar artefact is the commonest mistake in this assignment.\n\nThe weekday number is the one that surprises people — ask the room to predict weekday against weekend before showing it. Most say weekend.' },

        { type: 'keywords', title: 'What to submit, and what “done” means',
          bullets: [
            'The notebook\t.ipynb with the chart visible in the output, not just the code that would make it',
            'A short description\tWhat the data is, where it came from, and what you did — a paragraph, not an essay',
            'The Canvas post\tTask 2’s critique, with the URL to the original',
            'Not assessed\tHow pretty the chart is'
          ],
          notes: 'The commonest miss is a notebook submitted with the outputs cleared, which reads as code that has never run. Say it out loud: run every cell, then save, then submit.' },

        { type: 'keyfact', title: 'The deadline',
          subtitle: 'WORKSHEETS GO ON CANVAS',
          body: 'Monday, 23:59',
          bullets: [
            'The Monday after this lab. All four tasks, one submission.',
            'Colab counts. A machine that would not install Python is not an extension.'
          ],
          notes: 'Put it on the wall and leave it there while they pack up. One number, no ambiguity.' },

        { type: 'content', title: 'Before you go',
          bullets: [
            'One thing that is still not working, or one thing you now understand that you did not at the start.'
          ],
          feedback: { kind: 'brainstorm', prompt: 'What is still broken, or what clicked?', options: [], max: 2 },
          notes: 'The exit ticket, and it sets next week’s first five minutes. Read two or three out before they leave so they know it was read.\n\nListen for: install stuck, pie-vs-line “aha”, or still no notebook path. Compare with the opening poll — that gap is the lab’s real outcome.' }
      ]
    },
    {
      key: 'ipdv-lab1',
      title: 'LDSCI6253 Lab 1 · Exercise sheet',
      icon: '💻',
      blurb: 'Week 1 lab: survey, news-viz critique, Python setup, then TfL cycle hires through raw → table → clean → several charts → insights (worked notebook in lessons/).',
      minutes: 90,
      theme: 'northeastern',
      libraryGroup: 'nul',
      kind: 'lecture',
      org: 'Northeastern University London',
      logo: 'assets/brand/nu-london-logo.png',
      logoOn: 'all',
      logoSize: 'small',
      games: [{
        ref: 'check-lab1',
        title: 'Check · Lab 1 submission',
        style: 'choice',
        settings: { defaultTime: 20, scoreboard: false, scoreSlide: false, intro: false, howTo: false },
        questions: [{
          question: 'Lab 1 worksheets are due on Canvas when?',
          options: [
            'As you leave the lab today',
            'The Friday after the lab, by midday',
            'The Monday after the lab, by 23:59',
            'Before next week’s lecture only'
          ],
          correct: 2,
          explanation: 'Submit on Canvas by the Monday after the lab, 23:59. Survey, Canvas post, and notebook are all part of that worksheet pack.'
        }]
      }],
      slides: [
        {
          type: 'title',
          title: 'Lab 1\nExercise sheet',
          subtitle: 'Information Presentation & Data Visualisation · LDSCI6253',
          notes: 'Welcome. This is a working session, not a second lecture. Walk the four tasks, then let people start. Circulate for Anaconda and Canvas blockers.'
        },
        {
          type: 'introduction',
          title: 'Mark Martin',
          subtitle: 'Module lead · Northeastern University London',
          body: 'Advanced Information Presentation & Visualisation\nLDSCI6253 · Lab 1',
          image: 'assets/lesson/ipdv/mark-martin-portrait.jpg',
          notes: 'Optional if the cohort already knows you from the lecture. Skip if time is tight.'
        },
        {
          type: 'section',
          title: 'Today’s lab',
          subtitle: 'Four tasks. One Canvas submission by Monday 23:59.',
          notes: 'Read the four tasks out once. Point at the clock: survey and news post first; install and notebook second so machines are free while others still write.'
        },
        {
          type: 'cards',
          title: 'What you will do',
          bullets: [
            '1 · Survey\tComplete the short student-information form.',
            '2 · News viz\tFind a disaster visualisation and post a critique on Canvas.',
            '3 · Toolkit\tInstall Python 3.x — Anaconda strongly recommended.',
            '4 · Notebook\tTfL cycle hires: raw → table → clean → charts → insights.'
          ],
          progressive: true,
          notes: 'Reveal one card at a time if the room is restless. Otherwise show all four and move on.'
        },
        {
          type: 'keyfact',
          title: 'Submission',
          subtitle: 'Canvas · one pack',
          body: 'Monday after the lab · 23:59',
          bullets: [
            'Survey completion counts as Task 1.',
            'Canvas post = Task 2 (URL + paragraph).',
            'Notebook + insight paragraph = Task 4 (five stages).',
            'Files · Excel + notebook\t/lessons/ (links on the Task 4 slide)'
          ],
          notes: 'Say the deadline twice. Then open Task 1.'
        },
        {
          type: 'section',
          title: 'Task 1',
          subtitle: 'Student information survey',
          notes: 'Give them five quiet minutes. Do not talk over the form.'
        },
        {
          type: 'links',
          title: 'Complete the survey',
          bullets: [
            'Student information survey\thttps://forms.office.com/r/9YBnKM34Nt',
            'Why we ask\tBackground, expectations, and favourite colours — possible fuel for later visualisations.',
            'Privacy\tAnswer honestly; we use the data for teaching, not for grading individuals.'
          ],
          progressive: true,
          notes: 'Open the form on the projector once so everyone sees the same URL. Confirm when most of the room has submitted before moving on.'
        },
        {
          type: 'section',
          title: 'Task 2',
          subtitle: 'Visualisations in the news',
          notes: 'Natural disasters: a named storm, hurricane season, wildfires, floods, earthquakes. Recent means this year if they can find it.'
        },
        {
          type: 'content',
          title: 'Find one chart. Critique it.',
          bullets: [
            'Topic: a recent visualisation about natural disasters (storm, hurricane, wildfire, related).',
            'Post to Canvas: the original URL plus one paragraph.',
            'Say what it shows, what data it uses, and the original source.',
            'Say what you like and dislike — then give constructive suggestions for improvement.'
          ],
          progressive: true,
          notes: 'Model one sentence of constructive feedback: “The colour scale jumps from pale yellow to deep red with no middle step, so mid-range counties look extreme.” Avoid “I don’t like it.”'
        },
        {
          type: 'keywords',
          title: 'What a good Canvas post includes',
          bullets: [
            'URL\tLink to the original visualisation, not a screenshot alone.',
            'Show\tOne or two sentences on the claim the graphic makes.',
            'Data\tWho collected it, for which place and time, if stated.',
            'Judge\tOne strength, one weakness, one concrete fix.'
          ],
          progressive: true,
          notes: 'If someone cannot find a disaster chart, broaden to climate or emergency response — still news, still recent.'
        },
        {
          type: 'image',
          title: 'A historical benchmark',
          body: 'John Snow’s 1854 cholera map — evidence on a street plan.\nYour news example should be equally clear about place, time and claim.',
          image: 'assets/lesson/ipdv/snow-cholera-map-1854.jpg',
          imageFit: 'cover',
          design: { capStyle: 'scrim', capPos: 'bottom', logoGround: 'dark' },
          notes: 'Optional beat. Use only if Task 2 stalls. Then release the room to search.'
        },
        {
          type: 'section',
          title: 'Task 3',
          subtitle: 'Set up your visualisation toolkit',
          notes: 'Pair people who already have Anaconda with people who do not. Walk the installers aisle.'
        },
        {
          type: 'split',
          title: 'Install Python 3.x',
          bullets: [
            'Any editor is fine — VS Code, Cursor, PyCharm — as long as it runs Python 3.',
            'Strongly recommended: download and install Anaconda (libraries and Jupyter in one package).',
            'Confirm in a terminal: python --version (or python3 --version).',
            'Stuck on university machines? Use Google Colab in the browser for Task 4 today.'
          ],
          image: 'assets/lesson/ipdv/different-charts-python-1.png',
          imageFit: 'contain',
          design: { mediaGround: 'full' },
          progressive: true,
          notes: 'Anaconda: https://www.anaconda.com/download — do not force a full install if Colab unblocks Task 4. Capture names of people still blocked for follow-up.'
        },
        {
          type: 'links',
          title: 'Useful downloads',
          bullets: [
            'Anaconda\thttps://www.anaconda.com/download',
            'Google Colab\thttps://colab.research.google.com/',
            'Matplotlib docs\thttps://matplotlib.org/stable/gallery/index.html',
            'Seaborn gallery\thttps://seaborn.pydata.org/examples/index.html'
          ],
          progressive: true,
          notes: 'Leave this slide up while people install.'
        },
        {
          type: 'section',
          title: 'Task 4',
          subtitle: 'Raw → table → clean → visualise → insights',
          notes: 'Worked answers live in lessons/01_Lab_IPDV_CycleHires_Solutions.ipynb beside the Excel file. Walk the five stages on the wall, then let them run the notebook.'
        },
        {
          type: 'journey',
          journeyMode: 'stepper',
          title: 'The five stages of Task 4',
          subtitle: 'Marks sit in stage 5 — a chart with no sentence is half a submission',
          bullets: [
            'Raw\tOpen the file. Name the sheets. Notice the mess.',
            'Table\tPreview the rows you will keep — the managed table.',
            'Clean\tOne row per day; dates and numbers you can trust.',
            'Visualise\tSeveral charts, each answering one question.',
            'Insights\tCompute the numbers. Write the paragraph.'
          ],
          progressive: true,
          notes: 'Reveal one stage at a time. Emphasise that stage 1 is not optional — the TfL workbook punishes anyone who skips it.'
        },
        {
          type: 'links',
          title: 'Best first pick · TfL daily cycle hires',
          bullets: [
            'Dataset page · London Datastore\thttps://data.london.gov.uk/dataset/number-of-bicycle-hires-2r84d',
            'Download the Excel · course copy\t/lessons/tfl-daily-cycle-hires.xlsx',
            'Worked Jupyter notebook · every cell run\t/lessons/01_Lab_IPDV_CycleHires_Solutions.ipynb',
            'Or bring your own · filter by CSV\thttps://data.london.gov.uk'
          ],
          progressive: true,
          notes: '145 kB, Open Government Licence v2, updated monthly. Click the Excel and the notebook — both are served from this app under /lessons/. Sit the .xlsx beside the notebook so path = "tfl-daily-cycle-hires.xlsx" works.'
        },
        {
          type: 'keyfact',
          title: 'Download the file. Read from disk.',
          subtitle: 'Do not point pandas at the URL',
          body: 'HTTP 403',
          bullets: [
            'The Datastore refuses the user agent pandas sends.',
            'sheet_name=0 is Metadata — the data is on sheet “Data”.',
            'Grand totals and notes sit above the header (skip five rows).',
            'Keep only the first two columns of the Data sheet.'
          ],
          notes: 'Say this twice before anyone codes. It is the whole of stage 1.'
        },
        {
          type: 'links',
          title: 'Alternatives (same five stages)',
          bullets: [
            'London Fire Brigade incidents\thttps://data.london.gov.uk/dataset/london-fire-brigade-incident-records-em8xy/',
            'MPS crime by borough (~194 kB CSV)\thttps://data.london.gov.uk/dataset/mps-recorded-crime-geographic-breakdown-exy3m',
            'Browse more (filter CSV)\thttps://data.london.gov.uk',
            'Fire data tip\tOpen-space / grass fires spike in heatwaves — links to Task 2.'
          ],
          progressive: true,
          notes: 'TfL is the default. Fire brigade is the bridge to the disaster critique. Crime is for people who want bars and heatmaps.'
        },
        {
          type: 'section',
          title: 'Stage 1 · Raw',
          subtitle: 'Look before you believe',
          notes: 'Typewrite the code; leave the three findings on the next slide.'
        },
        {
          type: 'code',
          title: 'Inspect the workbook',
          language: 'python',
          typewrite: true,
          typeSpeed: 22,
          code:
            'import pandas as pd\n' +
            '\n' +
            'path = "tfl-daily-cycle-hires.xlsx"\n' +
            '\n' +
            'print(pd.ExcelFile(path).sheet_names)\n' +
            '# [\'Metadata\', \'Data\']  <- sheet 0 is NOT the data\n' +
            '\n' +
            'raw = pd.read_excel(path, sheet_name="Data", header=None)\n' +
            'print(raw.shape)          # (5883, 16)\n' +
            'print(raw.iloc[:7, 1:3])  # notes + totals above the header\n',
          notes: 'Answers they must say out loud: two sheets; wide because day/month/year blocks sit side by side; header is on row 6.'
        },
        {
          type: 'content',
          title: 'What raw reveals',
          bullets: [
            'Two sheets — Data is the second. sheet_name=0 would read the blurb.',
            '5,883 × 16 — day, month and year blocks sit side by side.',
            'Notes and a Daily Grand Total sit above the header.',
            'Header row is “Day” / “Number of Bicycle Hires”, not row 1.'
          ],
          progressive: true,
          notes: 'These three facts are the whole point of stage 1.'
        },
        {
          type: 'section',
          title: 'Stage 2 · Managed table',
          subtitle: 'Preview the rows you will keep',
          notes: 'Show the table on the wall so “managed table” is concrete.'
        },
        {
          type: 'table',
          title: 'Preview — first days of the series',
          tableHeader: true,
          body:
            'date\thires\n' +
            '2010-07-30\t6897\n' +
            '2010-07-31\t5564\n' +
            '2010-08-01\t4303\n' +
            '2010-08-02\t6642\n' +
            '2010-08-03\t7966\n' +
            '2010-08-04\t7895\n' +
            '2010-08-05\t8720\n',
          notes: 'Illustrative head after skiprows=5. The live numbers come from their notebook. Stress that this is still before dropna / dtype coercion.'
        },
        {
          type: 'code',
          title: 'Print the managed preview',
          language: 'python',
          typewrite: true,
          typeSpeed: 24,
          code:
            'preview = pd.read_excel(\n' +
            '    path, sheet_name="Data", skiprows=5,\n' +
            '    usecols=[1, 2], names=["date", "hires"])\n' +
            'print(preview.head(10).to_string(index=False))\n',
          notes: 'Still messy — may include blank trailer rows. Cleaning is next.'
        },
        {
          type: 'section',
          title: 'Stage 3 · Clean',
          subtitle: 'One row per day you can trust',
          notes: 'Defend every argument: sheet by name, skiprows, usecols, dtypes, dropna.'
        },
        {
          type: 'code',
          title: 'Clean — and check the grand total',
          language: 'python',
          typewrite: true,
          typeSpeed: 22,
          code:
            'df = pd.read_excel(path, sheet_name="Data", skiprows=5,\n' +
            '                   usecols=[1, 2], names=["date", "hires"])\n' +
            'df = df.dropna()\n' +
            'df["date"] = pd.to_datetime(df["date"])\n' +
            'df["hires"] = pd.to_numeric(df["hires"])\n' +
            '\n' +
            'print(len(df), int(df["hires"].sum()))\n' +
            '# Expect ~5877 and Grand Total 154053134\n',
          notes: 'If the sum does not match the sheet’s own total, cleaning is wrong — found in one line instead of in the marking.'
        },
        {
          type: 'section',
          title: 'Stage 4 · Visualise',
          subtitle: 'Several charts · one question each',
          notes: 'Titles state findings. Axis labels state subjects.'
        },
        {
          type: 'code',
          title: 'Chart 1 · Monthly totals over time',
          language: 'python',
          typewrite: true,
          typeSpeed: 20,
          code:
            'import matplotlib.pyplot as plt\n' +
            '\n' +
            'monthly = df.set_index("date")["hires"].resample("ME").sum()\n' +
            'monthly = monthly[(monthly.index.year >= 2011)\n' +
            '                 & (monthly.index.year <= 2025)]\n' +
            '\n' +
            'fig, ax = plt.subplots(figsize=(11, 4))\n' +
            'ax.plot(monthly.index, monthly.values, linewidth=1.2)\n' +
            'ax.set_title("Hires peak every summer — and 2020 broke the pattern")\n' +
            'ax.set_ylabel("Hires per month")\n' +
            'ax.spines[["top", "right"]].set_visible(False)\n' +
            'plt.tight_layout(); plt.show()\n',
          notes: 'Drop part-years (2010 open mid-July; possible trailing year) so the chart does not invent cliffs.'
        },
        {
          type: 'code',
          title: 'Chart 2 · Seasonality by month',
          language: 'python',
          typewrite: false,
          code:
            'by_month = df.groupby(df["date"].dt.month)["hires"].mean()\n' +
            'fig, ax = plt.subplots(figsize=(8, 4))\n' +
            'ax.bar(range(1, 13), by_month.values)\n' +
            'ax.set_title("July averages about twice December")\n' +
            'ax.set_ylabel("Mean daily hires")\n' +
            'plt.tight_layout(); plt.show()\n',
          notes: 'Answer: July ~34,212 vs December ~17,132 → about 2×.'
        },
        {
          type: 'code',
          title: 'Chart 3 · Weekday vs weekend',
          language: 'python',
          typewrite: false,
          code:
            'wd = df.groupby(df["date"].dt.dayofweek < 5)["hires"].mean()\n' +
            'fig, ax = plt.subplots(figsize=(5, 4))\n' +
            'ax.bar(["Weekend", "Weekday"], [wd[False], wd[True]])\n' +
            'ax.set_title("Weekdays outpace weekends — commuting, not leisure")\n' +
            'plt.tight_layout(); plt.show()\n',
          notes: 'Answer: weekend ~22,998 vs weekday ~27,500.'
        },
        {
          type: 'code',
          title: 'Chart 4 · April 2019 vs April 2020',
          language: 'python',
          typewrite: false,
          code:
            'apr = {y: int(df[(df["date"].dt.year == y)\n' +
            '               & (df["date"].dt.month == 4)]["hires"].sum())\n' +
            '       for y in (2019, 2020)}\n' +
            'fig, ax = plt.subplots(figsize=(5, 4))\n' +
            'ax.bar(["April 2019", "April 2020"], [apr[2019], apr[2020]])\n' +
            'ax.set_title("April 2020 fell 34% — first lockdown")\n' +
            'plt.tight_layout(); plt.show()\n',
          notes: 'Answer: 890,148 → 591,294 (−34%).'
        },
        {
          type: 'section',
          title: 'Stage 5 · Insights',
          subtitle: 'Compute them. Write the paragraph.',
          notes: 'Show the numbers, then the model paragraph.'
        },
        {
          type: 'stats',
          title: 'What we found (computed)',
          bullets: [
            'Summer peak\t2.0×\tJuly mean daily vs December',
            'Lockdown\t−34%\tApril 2020 vs April 2019',
            '2022→2023\t−26%\tAnnual hires (11.51M → 8.53M)',
            'Weekday\t27,500\tMean daily vs weekend 22,998'
          ],
          progressive: true,
          notes: 'These are the answer-key figures from the solutions notebook. The 2022–23 drop cannot be explained from this file alone — naming that gap is the finding.'
        },
        {
          type: 'quote',
          body: 'Santander Cycle hires follow a hard annual cycle: July averages 34,212 hires a day against December’s 17,132 — a factor of two. April 2020 fell 34% below April 2019. Annual hires then dropped 26% between 2022 and 2023; this dataset cannot explain why. Weekdays beat weekends, so this is commuting infrastructure, not a leisure amenity.',
          subtitle: 'Model insight paragraph · use your own numbers if you chose another dataset',
          notes: 'Read it once. Stress: inventing a cause for 2022–23 would be wrong; naming the gap is right.'
        },
        {
          type: 'keywords',
          title: 'Two traps that look like findings',
          bullets: [
            'July 2010 low\tNot a collapse — the scheme opened on 30 July (two days of trading).',
            'January 2021 low\tSeasonal floor and lockdown at once — do not attribute to either alone.',
            'Part-years\tDrop 2010 and a trailing incomplete year from annual charts.',
            'Title habit\tSay the finding in the title; put the subject on the axis.'
          ],
          progressive: true,
          notes: 'Both traps are demonstrated in the solutions notebook.'
        },
        {
          type: 'split',
          title: 'What to submit for Task 4',
          bullets: [
            'Notebook with outputs visible — run every cell, save, then upload.',
            'Short description: what the data is, where it came from, what you did.',
            'Follow the five stages even if you pick Fire Brigade or MPS crime.',
            'Deadline: Monday after the lab · 23:59 on Canvas.'
          ],
          image: 'assets/lesson/ipdv/different-charts-python-2.jpg',
          imageFit: 'contain',
          design: { mediaGround: 'full' },
          progressive: true,
          notes: 'Cleared outputs read as code that has never run.'
        },
        {
          type: 'game',
          gameRef: 'check-lab1',
          notes: 'Quick check before people leave. Confirm Monday 23:59 is in their calendar.'
        },
        {
          type: 'timeline',
          title: 'Suggested pace in the room',
          bullets: [
            '0:00\tWelcome & plan\t5 min',
            '0:05\tTask 1 survey\t10 min',
            '0:15\tTask 2 news viz\t20 min',
            '0:35\tTask 3 install\t15 min',
            '0:50\tTask 4 five stages\t35 min',
            '1:25\tSubmit & questions\t5 min'
          ],
          progressive: true,
          notes: 'Flexible. If installs are painful, start Task 4 on Colab while Anaconda downloads.'
        },
        {
          type: 'keywords',
          title: 'Before you go',
          bullets: [
            'Deadline\tMonday after the lab · 23:59 on Canvas.',
            'Pack\tSurvey · Canvas critique with URL · notebook + short description.',
            'Excel\t/lessons/tfl-daily-cycle-hires.xlsx',
            'Notebook\t/lessons/01_Lab_IPDV_CycleHires_Solutions.ipynb'
          ],
          progressive: true,
          notes: 'Dismiss when the check is done. Keep the links slide available for stragglers.'
        },
        {
          type: 'image',
          title: 'Questions',
          body: 'Ask now while the room is here.\nOtherwise post on Canvas discussion.',
          subtitle: 'Lab 1 · LDSCI6253',
          image: 'assets/lesson/ipdv/qa-london-night-1.jpg',
          design: { logoGround: 'dark', capStyle: 'scrim', capPos: 'bottom', imageMotion: 'zoom' },
          notes: 'Open floor. Common blockers: PATH after Anaconda install, Colab not signed into university Google, Canvas file size limits, Excel sheet_name=0 mistake.'
        }
      ]
    },
    {
      "key": "layout-bank",
      "title": "Layout bank — every layout, every chart, every live moment",
      "icon": "▦",
      "blurb": "The reference deck: every layout in the picker, all twenty chart idioms, the design variants, and the things the room answers on their phones. Page through it to see what each one does, then copy the slide you want into your own lesson. Every slide says in its notes when to reach for it — and when not to.",
      "minutes": 40,
      "theme": "northeastern",
      "libraryGroup": "sf-demo",
      "kind": "template",
      "org": "Northeastern University London",
      "logo": "assets/brand/nu-london-logo.png",
      "logoOn": "all",
      "logoSize": "small",
      "games": [
        {
          "ref": "check",
          "title": "A live check, mid-lesson",
          "style": "choice",
          "settings": {
            "defaultTime": 25,
            "scoreboard": false,
            "scoreSlide": false,
            "confidence": true
          },
          "questions": [
            {
              "question": "One number per category, and the order is the message. Which chart?",
              "options": [
                "Pie chart",
                "Sorted horizontal bar",
                "Line chart",
                "Radar"
              ],
              "correct": 1,
              "explanation": "Ranking: position along a common scale is the channel the eye reads most accurately, and sorting puts the message into the shape. A pie asks the reader to compare angles; a line implies an order in time that is not there."
            }
          ]
        },
        {
          "ref": "rank",
          "title": "Put the workflow in order",
          "style": "order",
          "settings": {
            "defaultTime": 60,
            "scoreboard": false,
            "scoreSlide": false
          },
          "questions": [
            {
              "question": "Put these in the order a chart should be made.",
              "options": [
                "Ask what question the chart has to answer",
                "Check where the numbers came from, and what they leave out",
                "Choose the idiom that answers that question",
                "Write the finding as the title"
              ],
              "explanation": "The title is written last and read first. Choosing the idiom before knowing the question is how a deck ends up full of charts that are correct and say nothing."
            }
          ]
        },
        {
          "ref": "race",
          "title": "Race: name the idiom",
          "style": "race",
          "settings": {
            "defaultTime": 20,
            "scoreboard": true,
            "scoreSlide": false,
            "mode": "teams"
          },
          "questions": [
            {
              "question": "Where does it go, and how much gets there?",
              "options": [
                "Sankey",
                "Funnel",
                "Waffle",
                "Box plot"
              ],
              "correct": 0,
              "explanation": "A Sankey. A funnel shows what is left at each stage; only the Sankey shows where the rest went."
            },
            {
              "question": "One number per category, and the order is the message?",
              "options": [
                "Pie",
                "Radar",
                "Sorted horizontal bar",
                "Pictogram"
              ],
              "correct": 2,
              "explanation": "Sorted horizontal bar. Position on a common scale, sorted so the shape carries the finding."
            }
          ]
        },
        {
          "ref": "boss",
          "title": "Boss battle: the grammar of charts",
          "style": "boss",
          "settings": {
            "defaultTime": 30,
            "scoreboard": false,
            "scoreSlide": false,
            "confidence": false
          },
          "questions": [
            {
              "question": "Which channel does the eye read most accurately?",
              "options": [
                "Area",
                "Angle",
                "Position on a common scale",
                "Colour hue"
              ],
              "correct": 2,
              "difficulty": "easy",
              "explanation": "Position on a common scale. An easy hit — 1 damage."
            },
            {
              "question": "A bar chart whose axis starts at 40 rather than 0 exaggerates what?",
              "options": [
                "The total",
                "The differences between bars",
                "The number of categories",
                "Nothing — it is a free choice"
              ],
              "correct": 1,
              "difficulty": "medium",
              "explanation": "The differences. A bar encodes value as length, so cutting the baseline cuts the length that the value is made of — 2 damage."
            },
            {
              "question": "Why is a radar chart hard to read fairly?",
              "options": [
                "It cannot hold more than three series",
                "Enclosed area grows as the square of the values, and reordering the spokes changes it",
                "It needs a legend",
                "The axes must share a scale"
              ],
              "correct": 1,
              "difficulty": "hard",
              "explanation": "Area grows as the square, and the spoke order changes the area without changing the data — 3 damage."
            },
            {
              "question": "A room is shown a scatter with a clear upward trend. What will they conclude that the chart does not say?",
              "options": [
                "That the two things are measured in the same unit",
                "That x causes y",
                "That the sample is large",
                "That the axis starts at zero"
              ],
              "correct": 1,
              "difficulty": "boss",
              "explanation": "That x causes y. Readers assume the relationship you draw is causal, whatever the caption says — the boss blow, 5 damage."
            }
          ]
        }
      ],
      "slides": [
        {
          "type": "title",
          "title": "Layout bank",
          "subtitle": "One of every layout, chart and live moment · Northeastern theme",
          "date": "2026-09-15",
          "notes": "This deck is a reference, not a lesson. Every layout SlideForge can draw appears once, in running order, with a note like this one saying what it is for. Copy a slide (⌘C) and paste it into a real deck (⌘V) to reuse the shape."
        },
        {
          "type": "title",
          "title": "A theme is\na starting point.",
          "subtitle": "Keep the identity. Choose a different composition.",
          "design": {
            "composition": "poster"
          },
          "notes": "Reusable opening composition. Change the subject and supporting line. Look → Composition changes the arrangement independently of the theme."
        },
        {
          "type": "title",
          "title": "One idea.\nSeveral arrangements.",
          "subtitle": "This side-by-side composition separates the subject from its context.",
          "design": {
            "composition": "sidecar"
          },
          "notes": "Reusable opening composition. Change the subject and supporting line. Look → Composition changes the arrangement independently of the theme."
        },
        {
          "type": "statement",
          "body": "Let the idea\nchoose its form.",
          "subtitle": "Try the same slide with another theme.",
          "design": {
            "composition": "frame"
          },
          "notes": "A pause in the argument. A short statement lets the room absorb the idea. Animation is optional; this composition works as a still."
        },
        {
          "type": "content",
          "title": "A heading can sit beside the argument.",
          "bullets": [
            "Use the left side to name the question.",
            "Use the right side to develop the answer.",
            "Keep the sequence editable and reveal it when useful."
          ],
          "design": {
            "composition": "rail"
          },
          "notes": "Keep the headings and supporting points editable. Choose Side heading for a single argument, or Columns for parallel ideas. These are examples, not limits on your content."
        },
        {
          "type": "content",
          "title": "Parallel ideas need equal space.",
          "bullets": [
            "A clear subject tells the audience where to look.",
            "A useful example gives the idea something concrete.",
            "A deliberate pause gives people time to think."
          ],
          "design": {
            "composition": "columns"
          },
          "notes": "Keep the headings and supporting points editable. Choose Side heading for a single argument, or Columns for parallel ideas. These are examples, not limits on your content."
        },
        {
          "type": "section",
          "title": "Opening a session",
          "subtitle": "Title, introduction, section, quote",
          "notes": "SECTION — full red, nothing on it but the words. The loudest surface in the theme, so keep it for the two or three moments you want the room to look up. Subtitle is optional."
        },
        {
          "type": "introduction",
          "title": "Mark Martin",
          "subtitle": "Course Leader · Northeastern University London",
          "body": "Advanced Information Presentation & Visualisation. Research interests in data literacy, computing education and how people read charts under time pressure.",
          "notes": "INTRODUCTION — who is standing at the front. Title is the name, subtitle the role, body the paragraph. Use it once, on your first meeting with a cohort."
        },
        {
          "type": "quote",
          "body": "The purpose of visualization is insight, not pictures.",
          "subtitle": "Ben Shneiderman",
          "notes": "QUOTE — body is the quotation, subtitle the attribution. Long quotations wrap and shrink; if it runs past three lines it has stopped being a quote slide and wants to be a content slide."
        },
        {
          "type": "section",
          "title": "Explaining and organising",
          "subtitle": "Content, journey, mind map, keywords, italics, cards",
          "notes": "The six layouts that carry an argument. Each takes the same bullets array and arranges it differently — so you can change your mind about the shape without retyping the words."
        },
        {
          "type": "content",
          "title": "Content — the plain bullet slide",
          "bullets": [
            "One point per line, in the bullets list.",
            "A tab inside a line makes the part before it a lead-in, so a point can carry its own sub-clause.\tLike this trailing half.",
            "Reveal them one at a time with Build on Next, or show them all at once."
          ],
          "progressive": true,
          "buildMode": "dim",
          "notes": "CONTENT — the workhorse. This one has Build on Next set to DIM: points already made stay on screen at 38% so the argument so far is still readable, while the eye is told where you are now. Set it to Hide instead when an earlier point would give away the next one."
        },
        {
          "type": "journey",
          "title": "Journey — a route with milestones",
          "subtitle": "Reveal each milestone as you explain it",
          "bullets": [
            "Week 1\tFoundations: why we visualise at all.",
            "Week 6\tColour, scale and the grammar of graphics.",
            "Week 12\tCritique and assessment."
          ],
          "progressive": true,
          "notes": "JOURNEY — numbers each point as a milestone (01, 02, 03) along a route. Reach for it for a course outline, a project timeline, or a handover. Text before the tab is the milestone label, text after is the detail."
        },
        {
          "type": "mindmap",
          "title": "Where visualisation sits",
          "bullets": [
            "Perception\tWhat the eye does before the brain catches up.",
            "Encoding\tTurning a number into a position, length or hue.",
            "Interaction\tLetting the reader ask the next question.",
            "Critique\tSaying why a chart fails."
          ],
          "progressive": true,
          "notes": "MIND MAP — arranges the points around the title in the centre rather than down the page. Use it when the points are siblings with no order; use Journey when the order is the point."
        },
        {
          "type": "keyfact",
          "title": "Key fact — one number, set large",
          "subtitle": "SHARE OF THE WORLD’S DATA CREATED IN THE LAST TWO YEARS",
          "body": "90%",
          "bullets": [
            "The subtitle above the number is its label; the number itself is never a build step.",
            "Three supporting lines is the limit — past that the number stops being the point.",
            "Say the number, then stop talking."
          ],
          "progressive": true,
          "buildMode": "dim",
          "notes": "KEY FACT — for the one figure you want quoted back at you. Reach for it when a chart would bury the finding in axes: a single number needs no scale, no legend and no explanation of what the bars mean."
        },
        {
          "type": "orgchart",
          "title": "People & structure — who is who",
          "bullets": [
            "Mark Martin\tCourse Leader",
            "Ada Lovelace\tLead Tutor\tMark Martin",
            "Alan Turing\tTutor\tMark Martin",
            "Grace Hopper\tLab Demonstrator\tAda Lovelace",
            "Katherine Johnson\tLab Demonstrator\tAlan Turing"
          ],
          "notes": "PEOPLE & STRUCTURE — one person per line: name, role, and who they report to. Leave the third column off and they sit at the top. With no reporting lines at all it draws a flat team in one row, which is the right shape for a project group or a panel."
        },
        {
          "type": "stats",
          "title": "Stat tiles — the numbers that matter",
          "subtitle": "From the module survey, week 6 · n = 148",
          "bullets": [
            "Read the chart first\t92%\tbefore they read the caption",
            "Found the legend\t48%\ton first look",
            "Asked a follow-up\t3 of 5\tafter a clear chart"
          ],
          "progressive": true,
          "notes": "STAT TILES — each line is label · value · note, and the value is set large. Three to six tiles; three is the sweet spot. Under Design, the Ring style fills a circle to the number’s share and the Bar style adds a KPI bar under it — both read the leading number in the value."
        },
        {
          "type": "compare",
          "title": "Versus — two columns, row by row",
          "subtitle": "Bad chart | Good chart",
          "bullets": [
            "Colour\tOne hue per series, twelve series\tTwo hues: the series that matters, and everything else",
            "Labels\tA legend the eye has to travel to\tLabels on the lines themselves",
            "Title\t\"Figure 3\"\tThe finding, as a sentence"
          ],
          "progressive": true,
          "notes": "VERSUS — the subtitle names the two columns (\"Before | After\", \"Myth | Fact\"). Each row is left · right, or row label · left · right when the rows need naming, as here. Rows build on Next so the comparison is argued one line at a time."
        },
        {
          "type": "funnel",
          "title": "Funnel — stages that narrow",
          "subtitle": "What happens to a chart between the analyst and the reader",
          "bullets": [
            "Data points plotted\t1,200\teverything the query returned",
            "Marks the eye registers\t300\tthe rest is texture",
            "Marks that are compared\t40\twhere the reading actually happens",
            "Number remembered\t1\tif the title did its job"
          ],
          "progressive": true,
          "notes": "FUNNEL — stage · value · note. When the values are numbers the band widths follow them, so a cliff draws as a cliff. Without numbers the bands narrow evenly. Design → Direction flips it to a pyramid."
        },
        {
          "type": "timeline",
          "title": "Timeline — dated events on a rail",
          "subtitle": "Where the ideas in this module came from",
          "bullets": [
            "1786\tPlayfair\tThe bar chart and the line chart, in one atlas",
            "1858\tNightingale\tThe rose diagram takes an argument to Parliament",
            "1967\tBertin\tSemiology of Graphics — the visual variables named",
            "1983\tTufte\tData-ink ratio and chartjunk",
            "2010s\tFT & Datawrapper\tThe visual vocabulary goes mainstream"
          ],
          "progressive": true,
          "notes": "TIMELINE — date · event · detail, up to eight. Dates are labels, not parsed, so \"Week 3\" or \"Term 2\" work. Design → Shape switches to the vertical spine, which gives each event a full line of detail."
        },
        {
          "type": "stats",
          "design": {
            "statStyle": "ring"
          },
          "title": "Stat tiles · rings",
          "bullets": [
            "Attendance\t88%\tweek six",
            "Submitted on time\t74%\tfirst attempt"
          ],
          "notes": "STATS · RING — the same layout, Design → Tile style → Ring. The arc fills to the number’s share of a hundred.\n\nThe inspector warns you when there is more than one of them, and it is right to: an arc is compared less accurately than a length, so four rings are four dials nobody can line up. One hero number in a ring is the fair use."
        },
        {
          "type": "stats",
          "design": {
            "statStyle": "bar"
          },
          "title": "Stat tiles · KPI bars",
          "bullets": [
            "Applications\t1,240\ttarget 1,000",
            "Offers\t860\ttarget 800",
            "Enrolled\t510\ttarget 600"
          ],
          "body": "Two of three targets met — enrolment is the one to talk about.",
          "notes": "STATS · BAR — Design → Tile style → Bar. This is the variant to prefer when the numbers are being compared, because length on a common baseline is the channel the eye reads most accurately. The line underneath is the takeaway field."
        },
        {
          "type": "funnel",
          "design": {
            "funnelDirection": "up"
          },
          "title": "Funnel · pyramid",
          "bullets": [
            "Aware\t4,000\t",
            "Interested\t1,600\t",
            "Applied\t420\t",
            "Enrolled\t180\t"
          ],
          "notes": "FUNNEL · UP — Design → Direction → Pyramid. Same data, widest at the bottom, for when the story is the base rather than the loss.\n\nThe drop between two stages is printed for you either way — −60%, −74% — because that is the number a reader is working out in their head. And the inspector will point out that a Sankey answers the same question while also showing where the missing ones went."
        },
        {
          "type": "timeline",
          "design": {
            "timelineMode": "vertical"
          },
          "title": "Timeline · down the page",
          "bullets": [
            "Week 1\tFoundations\tWhy we visualise at all, and what a channel is",
            "Week 6\tColour and scale\tThe grammar of graphics, and where it misleads",
            "Week 12\tCritique\tSaying why a chart fails, in writing"
          ],
          "notes": "TIMELINE · DOWN — Design → Shape → Down. A spine with a paragraph per event, for when the detail matters more than the span. Across is the default and suits six short entries; down suits three long ones."
        },
        {
          "type": "cards",
          "design": {
            "cardsMode": "stack"
          },
          "title": "Cards · stacked, one at a time",
          "bullets": [
            "Notice\tSomething in the data does not fit the story.",
            "Check\tGo back to how it was collected.",
            "Redraw\tPick the idiom that answers the question.",
            "Say it\tWrite the finding as a sentence on the slide."
          ],
          "progressive": true,
          "notes": "CARDS · STACK — Design → Card style → Stacked. Every card lands in the same place, the one being talked about in front and the ones already made peeking out behind. Four things get four moments instead of competing for one glance, and the pile shows the room how far through the set you are. Needs Build on Next, which is on here."
        },
        {
          "type": "cards",
          "design": {
            "cardsMode": "rows"
          },
          "title": "Cards · rows, for cards that have something to say",
          "bullets": [
            "Rule of thumb\tThree cards across is fine for three words and cruel to a definition.",
            "What goes wrong\tThe column narrows until the label breaks up, and the set reads as one card with three columns.",
            "The fix\tDown the slide instead — full width each, and only as much height as the words need."
          ],
          "notes": "CARDS · ROWS — Design → Card style → Rows. The variant to choose the moment a card carries a sentence rather than a phrase. Grid is the default and suits short labels; this suits definitions."
        },
        {
          "type": "keywords",
          "title": "Keywords — term and definition",
          "bullets": [
            "Idiom\tA particular way of encoding data visually.",
            "Data ink\tThe pixels that carry meaning rather than decoration.",
            "Chartjunk\tEverything else."
          ],
          "progressive": true,
          "notes": "KEYWORDS — the tab splits each line into a term and its definition, set as a two-column row. The vocabulary slide. Build on Next reveals a row at a time."
        },
        {
          "type": "italics",
          "title": "Italics — a phrase and its gloss",
          "bullets": [
            "correlation is not causation\tTwo things moving together need not be connected.",
            "the mean hides the shape\tAnscombe’s whole point in four scatterplots."
          ],
          "notes": "ITALICS — the same term/definition split as Keywords, but the term is set in italic display type and given more room. Better for a handful of phrases you want to dwell on; Keywords is better for a list of six."
        },
        {
          "type": "cards",
          "title": "Cards — parallel items, side by side",
          "bullets": [
            "Plan\tDefine the purpose and the audience before opening the data.",
            "Prepare\tClean, validate, and know what is missing.",
            "Present\tChoose the idiom that fits the question.",
            "Pause\tAsk whether it actually reads."
          ],
          "progressive": true,
          "buildMode": "dim",
          "notes": "CARDS — items that are peers, arranged in a row with the number on the side rather than across the top, so four fit without shrinking. The card count drives the column ladder automatically: two cards are wide, six are narrow. Also on dim build here."
        },
        {
          "type": "cards",
          "title": "Cards · picture cards — a photograph over each",
          "bullets": [
            "See\tWhat the reader notices in the first second.",
            "Orient\tAxes, legend, units — where am I?",
            "Compare\tThe one difference the chart exists to show.",
            "Say\tThe sentence they would repeat to a colleague."
          ],
          "design": {
            "cardsMode": "pictures"
          },
          "progressive": true,
          "notes": "CARDS — the same layout with Design → Cards layout set to Picture cards. Every card gets an image slot above its copy; the dashed box is the placeholder until you paste a URL or drop a file under that card in the inspector. Design → Picture shape switches between portrait crops and letterboxed plates."
        },
        {
          "type": "journey",
          "journeyMode": "stepper",
          "title": "Journey · stepper — a process in one glance",
          "subtitle": "Design → Show as → Stepper",
          "bullets": [
            "Question\tWhat does the reader need to decide?",
            "Data\tThe smallest table that answers it.",
            "Idiom\tThe chart family that fits the relationship.",
            "Title\tThe finding, written as a sentence."
          ],
          "progressive": true,
          "notes": "JOURNEY — the third mode. Numbered discs on one horizontal rail with the copy beneath, for a process read left to right. Route keeps the sequence vertical; Handover is two or three big columns; Stepper is the infographic idiom for \"first, then, then\"."
        },
        {
          "type": "section",
          "title": "Data and evidence",
          "subtitle": "A table, and all twenty chart idioms",
          "notes": "Table and chart read the same pasted text, so a range from a spreadsheet becomes either without retyping."
        },
        {
          "type": "table",
          "title": "Table — when the numbers are the point",
          "body": "Dataset\tMean x\tMean y\tCorrelation\nI\t9.00\t7.50\t0.816\nII\t9.00\t7.50\t0.816\nIII\t9.00\t7.50\t0.816\nIV\t9.00\t7.50\t0.816",
          "progressive": true,
          "notes": "TABLE — paste a range straight from Excel or Sheets; tabs and pipes both work, first row is the header. Build on Next reveals a row at a time. Reach for a table when the reader needs the exact value, a chart when they need the shape."
        },
        {
          "type": "code",
          "title": "Code that writes itself",
          "language": "python",
          "typewrite": true,
          "typeSpeed": 28,
          "code": "import pandas as pd\n\ndf = pd.read_csv(\"attendance.csv\")\nby_week = (\n    df[\"week\"]\n      .value_counts()\n      .sort_index()\n)\nprint(by_week.head())\n",
          "notes": "CODE — a viewer, not an IDE. Source types onto the wall when you Present, so the room watches the idea form without you sharing a desktop. Next skips to the finished snippet. Keep it short enough to read from the back; for a long demo, use a Video slide of your editor instead."
        },
        {
          "type": "chart",
          "chartKind": "bar",
          "design": {
            "chartMotion": "grow"
          },
          "title": "Chart — bar, for comparing magnitudes",
          "body": "Region\tLeave %\tRemain %\nBoston\t75.6\t24.4\nBristol\t38.0\t62.0\nLambeth\t21.4\t78.6\nGlasgow\t33.4\t66.6",
          "progressive": true,
          "notes": "CHART (bar) — identical text to a table slide; change the type and it draws. Several series means one press of Next lands a whole series; a single series means one press lands a category. Colours come from the validated palette, assigned in fixed order."
        },
        {
          "type": "chart",
          "chartKind": "line",
          "title": "Chart — line, for change over time",
          "body": "Year\tCambridge\tBlackpool\n2019\t62\t31\n2020\t58\t28\n2021\t64\t30\n2022\t69\t29\n2023\t74\t27",
          "progressive": true,
          "notes": "CHART (line) — series names are drawn at the right-hand end rather than in a legend box, so the eye never has to travel. The right margin is measured from the longest name before drawing, and converging labels step apart. One press of Next draws a whole line."
        },
        {
          "type": "chart",
          "chartKind": "pie",
          "title": "Chart — pie, for parts of one whole",
          "body": "Continent\tShare of population\nAsia\t59\nAfrica\t18\nEurope\t9\nAmericas\t13\nOceania\t1",
          "notes": "CHART (pie) — only honest when the slices are parts of a single total and there are few of them. Two series will not work here. If you are comparing magnitudes rather than showing a composition, use the bar."
        },
        {
          "type": "chart",
          "chartKind": "hbar",
          "title": "Chart · ranking — what is the order?",
          "body": "Barrier\tMentioned by (%)\nNo local network\t62\nCost of travel\t48\nNo one to ask\t41\nTiming of events\t23\nNothing nearby\t12",
          "chartSource": "Illustrative figures. Every chart carries a line like this one, and it prints under the drawing and into the student handout.",
          "notes": "RANKING — a sorted horizontal bar is the Financial Times’ own ranking chart, and the reason is that position on a common scale is the channel the eye reads most accurately. Sort it, or it is not a ranking chart.\n\nThis slide is also the one showing the SOURCE LINE. Where the numbers came from and what they are not — that is the thing a reader needs a week later with nobody there to explain it."
        },
        {
          "type": "chart",
          "chartKind": "stack",
          "title": "Chart · part-to-whole — how does it divide up?",
          "body": "Year\tTeaching\tResearch\tOutreach\n2023\t52\t31\t17\n2024\t48\t34\t18\n2025\t44\t35\t21",
          "notes": "STACKED BAR — for composition over a few categories. It warns you if a series contains negatives, because those are silently left out of a total and the bar would lie.\n\nAlso in this family and drawn by the same picker: pie, donut, treemap and waffle."
        },
        {
          "type": "chart",
          "chartKind": "donut",
          "title": "Chart · donut, and its cousins",
          "body": "Route in\tShare\nUniversity\t44\nApprenticeship\t21\nBootcamp\t18\nSelf-taught\t17",
          "notes": "DONUT — a pie with the middle taken out, and the same paste. The hole buys you somewhere to put the total, which is the only real reason to prefer it.\n\nTreemap and waffle are further on: the same data, the same question, two better answers to it."
        },
        {
          "type": "chart",
          "chartKind": "scatter",
          "title": "Chart · correlation — do two things move together?",
          "body": "Cohort\tHours on task\tMark\nA\t4\t52\nB\t7\t61\nC\t9\t58\nD\t12\t74\nE\t14\t71\nF\t18\t88\nG\t20\t79",
          "notes": "SCATTER — a first column of words becomes each point’s label, and labels that would collide are moved and given a leader line. Read x, y with two columns; name, x, y with three.\n\nThe app says out loud what this chart cannot: readers will assume the relationship you draw is causal."
        },
        {
          "type": "chart",
          "chartKind": "box",
          "title": "Chart · distribution — what values occur, how often?",
          "body": "Group\nGroup A\t54\t58\t61\t63\t65\t66\t68\t71\t74\t88\nGroup B\t41\t49\t55\t57\t60\t62\t64\t69\t73\t79\nGroup C\t62\t64\t66\t67\t68\t69\t70\t71\t73\t75",
          "notes": "BOX PLOT — one row per group, then every value measured in it, so a column of marks pasted from a spreadsheet becomes this. Whiskers stop at the furthest real observation inside Tukey’s 1.5×IQR fence; anything past it is drawn as a point, which is why Group A has one at 88.\n\nA histogram answers the same question for a single ungrouped column."
        },
        {
          "type": "chart",
          "chartKind": "sankey",
          "title": "Chart · flow — where does it go?",
          "body": "From\tTo\tPeople\nApplied\tInterviewed\t420\nApplied\tRejected at sift\t580\nInterviewed\tOffered\t140\nInterviewed\tNo offer\t280\nOffered\tJoined\t110\nOffered\tDeclined\t30",
          "notes": "SANKEY — from, to, amount: a list of flows rather than a table of values. This is the honest alternative to a funnel, and the inspector points at it from there: a funnel shows what is left at each stage, a Sankey shows where the rest went. On this data that is 580 people rejected at sift who a funnel would simply not draw."
        },
        {
          "type": "chart",
          "chartKind": "pictogram",
          "chartIcon": "●",
          "chartUnit": 50,
          "title": "Chart · magnitude — one icon is one unit",
          "body": "Stage\tPeople\nApplied\t1000\nInterviewed\t420\nOffered\t140\nStill there at year 3\t62",
          "notes": "PICTOGRAM — the ISOTYPE tradition: the icon repeats and never grows, so the count is read by counting rather than by judging an area. Set the glyph and how many each one stands for; the remainder is drawn as a clipped icon rather than a smaller one, because a smaller one would encode the value in area again."
        },
        {
          "type": "chart",
          "chartKind": "radar",
          "title": "Chart · radar, and why to be careful",
          "body": "Skill\tStart of module\tNow\nReading a chart\t2\t4\nChoosing an idiom\t1\t3\nCleaning data\t2\t3\nWriting the caption\t1\t4\nCritique\t2\t4",
          "notes": "RADAR — defensible here and in few other places: the axes are the same kind of thing on the same nought-to-five scale, and the two shapes are the same learner at two times.\n\nIt repeats its own critique in the app, which is the point of drawing it at all: enclosed area grows as the SQUARE of the values, so a row twice as good encloses four times the shape — and reordering the spokes changes that area without changing the data."
        },
        {
          "type": "chart",
          "chartKind": "dumbbell",
          "title": "Chart · deviation — how far apart are two points?",
          "body": "Function\tAt entry (%)\tAt senior (%)\nEngineering\t8.9\t3.1\nData\t9.6\t3.8\nProduct\t7.2\t2.4\nDesign\t6.4\t2.9",
          "notes": "DUMBBELL — two named series as two dots on one row, and the bar between them is the finding. The gap is printed on the row, because that is the number that gets quoted. Reach for it whenever you would otherwise draw two bars side by side and ask the room to subtract.\n\nIt carries a key, because which dot is which would otherwise live only in a tooltip — and a room looking at a projector has no tooltips."
        },
        {
          "type": "chart",
          "chartKind": "multiples",
          "title": "Chart · small multiples, on one stated scale",
          "body": "Line\t2021\t2022\t2023\t2024\nCentral\t18\t22\t26\t31\nVictoria\t12\t15\t14\t19\nNorthern\t24\t23\t27\t29\nBakerloo\t9\t11\t13\t12",
          "chartSource": "Illustrative. Every panel shares one scale, and the scale is written on the slide rather than left to be assumed.",
          "notes": "SMALL MULTIPLES — read transposed: each row is a panel and the columns are the axis inside it. The panels share a scale and the app says so on the drawing, because panels on their own scales are the most common way this chart misleads.\n\nPast about a dozen panels it tells you a room cannot compare that many."
        },
        {
          "type": "chart",
          "chartKind": "bullet",
          "title": "Chart · against a target",
          "body": "Measure\tActual\tTarget\nApplications\t1240\t1000\nOffers\t860\t800\nEnrolled\t510\t600",
          "notes": "BULLET — a value against a reference: a target, a long-run average, or zero. The bar is the actual, the tick is the target, and nobody has to subtract.\n\nThe picker groups all twenty idioms by the question they answer rather than by what they look like, which is the Financial Times’ Visual Vocabulary rather than a gallery of shapes."
        },
        {
          "type": "chart",
          "chartKind": "area",
          "title": "Chart · area — a total, and what it is made of",
          "body": "Year\tEvents\tCourses\tResearch\n2019\t4\t1\t0\n2020\t6\t3\t0\n2021\t7\t6\t1\n2022\t9\t9\t1\n2023\t11\t12\t2\n2024\t12\t14\t3",
          "notes": "AREA — a line chart with the space underneath filled, stacked when there is more than one series. Read the top edge as the total and the bands as its composition.\n\nThe honest warning: only the bottom band sits on a flat baseline, so every band above it is harder to read on its own. If a single series is the story, draw it as a line."
        },
        {
          "type": "chart",
          "chartKind": "combo",
          "title": "Chart · combo — two units on one slide",
          "body": "Quarter\tEvents held\tAverage attendance\nQ1\t3\t62\nQ2\t5\t71\nQ3\t4\t88\nQ4\t6\t94",
          "notes": "COMBO — the first series draws as columns, every later one as markers on top. For a count and a rate together: the bars are how many, the markers are how well.\n\nUse it when the two really are different units. Two series in the same unit belong on the same axis as two bars or two lines."
        },
        {
          "type": "chart",
          "chartKind": "histogram",
          "title": "Chart · histogram — the shape of one column",
          "body": "Mark\n41\n48\n52\n54\n55\n57\n58\n58\n60\n61\n62\n62\n63\n64\n64\n65\n66\n67\n68\n69\n71\n72\n74\n77\n81\n88",
          "chartSource": "One cohort, one assessment. Bin edges are computed from the data, not chosen to flatter it.",
          "notes": "HISTOGRAM — paste one column of numbers and they are counted into bins for you. Where a box plot summarises a distribution in five numbers, this draws its actual shape, which is the only way a second peak shows up at all.\n\nBin width is a real editorial choice: too wide hides the shape, too narrow turns it into noise."
        },
        {
          "type": "chart",
          "chartKind": "treemap",
          "title": "Chart · treemap — parts of a whole, by area",
          "body": "Spend\tShare\nDelivery\t44\nVenues\t18\nBursaries\t16\nResearch\t12\nCore costs\t10",
          "notes": "TREEMAP — the same paste as a pie, drawn as nested rectangles. It holds more categories than a pie without collapsing into slivers, and rectangles are compared slightly better than angles.\n\nStill area, though, and area is judged poorly. If the order is the message, draw the sorted bar."
        },
        {
          "type": "chart",
          "chartKind": "waffle",
          "title": "Chart · waffle — a hundred squares, so it can be counted",
          "body": "Route in\tShare\nUniversity\t44\nApprenticeship\t21\nBootcamp\t18\nSelf-taught\t17",
          "notes": "WAFFLE — a hundred squares, each one a percentage point. The reader counts rather than estimates, which is why this is the part-to-whole chart to choose when the exact figure matters as much as the split.\n\nOne square is never subdivided — five percent is five squares, and that is the whole point of the idiom."
        },
        {
          "type": "chart",
          "chartKind": "matrix",
          "title": "Chart · evidence matrix — ratings across conditions",
          "body": "Idiom\tSpots the outlier\tShows the total\tHolds 12 categories\tCounts exactly\nSorted bar\tStrong\tWeak\tStrong\tModerate\nStacked bar\tWeak\tStrong\tModerate\tWeak\nPie\tWeak\tStrong\tWeak\tWeak\nBox plot\tStrong\tWeak\tModerate\tWeak\nScatter\tStrong\tWeak\tStrong\tWeak\nWaffle\tWeak\tStrong\tWeak\tStrong\nSorted dumbbell\tModerate\tWeak\tStrong\tModerate",
          "notes": "EVIDENCE MATRIX — first row names the conditions, then one row per item with a rating in each cell. Words like Strong / Moderate / Weak are ranked once so the whole grid shares a single scale, which is what stops each column being read on its own.\n\nFor ordinal judgements — a systematic review, a shortlist against criteria, exactly this table of chart choices. Numbers in the cells belong in a table or a heatmap instead.\n\nThat is all twenty idioms the app draws. There are no maps, and the picker says so rather than leaving you to conclude it from an absence."
        },
        {
          "type": "section",
          "title": "Pictures",
          "subtitle": "Image, split, gallery, before/after",
          "notes": "Four ways a picture can carry a slide, and the caption and frame settings that apply across all of them."
        },
        {
          "type": "image",
          "title": "Image — full bleed, caption over the picture",
          "subtitle": "Northeastern University London · the City campus",
          "image": "assets/brand/nu-london-skyline.png",
          "design": {
            "capStyle": "scrim",
            "capPos": "bottom"
          },
          "notes": "IMAGE (full bleed) — the picture fills the slide and the caption sits on it under a gradient scrim, which reads over any image. Title is the caption line, subtitle the credit. Caption styles: scrim (default, safest), bar (solid), plain, none. Caption can sit top instead of bottom."
        },
        {
          "type": "image",
          "title": "Image — framed to a fixed ratio",
          "subtitle": "Anscombe’s third dataset · Anscombe 1973",
          "image": "assets/lesson/anscombe/anscombe-iii.svg",
          "imageFit": "contain",
          "design": {
            "imageFrame": "4:3",
            "capStyle": "bar"
          },
          "notes": "IMAGE (framed) — the picture takes a shape of its own and the caption sits clear below it. Ratios: 16:9, 4:3, 3:2, 1:1, 4:5. Use a frame for anything with labels near the edge — a caption bar across the bottom of a chart covers its axis. Fit contain shows the whole image; cover crops it to fill."
        },
        {
          "type": "image",
          "design": {
            "imageMotion": "zoom",
            "capStyle": "scrim",
            "capPos": "bottom",
            "capFade": 10,
            "focalX": 56,
            "focalY": 45
          },
          "image": "assets/lesson/ipdv/snow-cholera-map-1854.jpg",
          "imageFit": "cover",
          "title": "Every black bar is a death. The pump is in the middle of them.",
          "subtitle": "John Snow, Broad Street, 1854 · lith. C. F. Cheffins",
          "notes": "A MOVING IMAGE — Design → Image motion → Slow zoom in. Twenty-four seconds, once, ending where it stops; it does not loop back and start again, because a picture that keeps restarting is a picture nobody finishes reading.\n\nIt zooms toward the Image focus point, which is why this one drifts into Broad Street rather than the middle of the plate. Set the focus first, then the motion.\n\nProjector only. The editor holds it still so the preview is not re-animating every time you type, and a machine set to reduce motion gets the still picture — the slide still works, it simply stops moving.\n\nThe caption clears itself after ten seconds (Design → Caption clears itself). It names the plate while the room needs naming, then gets off the picture."
        },
        {
          "type": "image",
          "design": {
            "imageFrame": "4:3",
            "capStyle": "bar"
          },
          "image": "assets/lesson/ipdv/playfair-pie-1801.jpg",
          "imageFit": "contain",
          "title": "The first pie chart anybody drew",
          "subtitle": "William Playfair, The Statistical Breviary, 1801",
          "body": "Playfair had already invented the line chart and the bar chart twenty years earlier, in the Commercial and Political Atlas of 1786.\nThe circle was his answer to a different question: not how much, but how a single whole divides — here the Turkish Empire split across Europe, Asia and Africa.\nHe was ignored for most of a century. The chart was not.",
          "notes": "FLIP TO FACTS — put anything in the slide’s body and the picture gets a ⇄ in the corner. Press it and the same slide turns over: the facts on the back, the picture still there behind them, one more press and you are back.\n\nThe point is that you never leave the slide. The room is looking at the plate, you are asked where it came from, and answering it does not cost you the picture and a click forward and a click back. It is one slide with two faces rather than two slides in a row.\n\nWorks on the projector and in the editor. Nothing about it is a build step, so it does not consume a Next — which is exactly why it suits the question you did not plan for."
        },
        {
          "type": "split",
          "title": "Split — picture on one side, points on the other",
          "subtitle": "NU London",
          "bullets": [
            "The picture takes one half, the points the other.",
            "Image side can be left or right.",
            "Use it when the picture is evidence for the points, not decoration beside them."
          ],
          "image": "assets/brand/nu-london-skyline.png",
          "imageSide": "right",
          "imageFit": "cover",
          "progressive": true,
          "notes": "SPLIT — the compromise layout, and the one to be suspicious of. If the picture is not actually doing work, drop it and use a content slide. Set imageSide to left or right."
        },
        {
          "type": "gallery",
          "title": "Gallery — an image stack",
          "imageFit": "contain",
          "design": {
            "imageFrame": "4:3",
            "capStyle": "bar"
          },
          "layers": [
            {
              "image": "assets/lesson/anscombe/anscombe-i.svg",
              "caption": "Dataset I — a plain linear relationship",
              "source": "Anscombe 1973"
            },
            {
              "image": "assets/lesson/anscombe/anscombe-ii.svg",
              "caption": "Dataset II — a clear curve",
              "source": "Anscombe 1973"
            },
            {
              "image": "assets/lesson/anscombe/anscombe-iii.svg",
              "caption": "Dataset III — one outlier drags the line",
              "source": "Anscombe 1973"
            },
            {
              "image": "assets/lesson/anscombe/anscombe-iv.svg",
              "caption": "Dataset IV — one point invents the slope",
              "source": "Anscombe 1973"
            }
          ],
          "progressive": true,
          "notes": "GALLERY — each press lays the next picture in front of the last, with its own caption and source, the earlier ones still showing at the edges. Up to eight layers. The effect is cumulative: the room sees the pile growing, which is what makes four near-identical scatterplots land. Every layer here has the same summary statistics."
        },
        {
          "type": "beforeafter",
          "title": "Before and after",
          "exploration": {
            "before": "assets/lesson/anscombe/anscombe-i.svg",
            "after": "assets/lesson/anscombe/anscombe-iv.svg",
            "beforeLabel": "Dataset I",
            "afterLabel": "Dataset IV"
          },
          "notes": "BEFORE / AFTER — drag the handle to wipe between two pictures. Only worth it when the two images are registered to each other — same framing, same scale — so the wipe compares like with like. A redesign, a map at two dates, a chart before and after a fix."
        },
        {
          "type": "section",
          "title": "Things the room can touch",
          "subtitle": "Explore, simulation, video, links",
          "notes": "The interactive layouts. All of them work on the projector and on a learner phone in a live session."
        },
        {
          "type": "explore",
          "title": "Explore — hotspots on one picture",
          "image": "assets/brand/nu-london-skyline.png",
          "imageFit": "cover",
          "exploration": {
            "spots": [
              {
                "x": 42,
                "y": 40,
                "zoom": 2.2,
                "title": "The Shard",
                "body": "The tallest thing on the horizon, and the reason the eye lands here first."
              },
              {
                "x": 60,
                "y": 68,
                "zoom": 2.2,
                "title": "Tower Bridge",
                "body": "Picked out in red while everything round it stays blue — colour doing the work of a label."
              }
            ]
          },
          "notes": "EXPLORE — pin hotspots to a picture by percentage coordinates; each one zooms in and shows a title and a note. Use it to walk a room around a complicated image — a chart with several stories in it, a map, a screenshot of an interface."
        },
        {
          "type": "simulation",
          "title": "Simulation — change an input, watch the output",
          "exploration": {
            "model": "quadratic",
            "min": 0,
            "max": 10,
            "a": 2,
            "b": 1,
            "inputLabel": "Sample size",
            "outputLabel": "Confidence"
          },
          "notes": "SIMULATION — a slider bound to a model, drawn as a curve. Reach for it when the relationship is the lesson and a static chart would only show one point on it. Learners can drive their own copy from their phones."
        },
        {
          "type": "links",
          "title": "Links — the reading list",
          "bullets": [
            "Munzner, Visualization Analysis and Design\thttps://www.cs.ubc.ca/~tmm/vadbook/",
            "Financial Times Visual Vocabulary\thttps://github.com/Financial-Times/chart-doctor",
            "Anscombe 1973, Graphs in Statistical Analysis\thttps://www.jstor.org/stable/2682899"
          ],
          "notes": "LINKS — text before the tab is the label, after it the URL. In a live session these become tappable on learner phones, which is the point: nobody copies a URL off a projector."
        },
        {
          "type": "video",
          "video": "assets/lesson/ipdv/baseline-truncation.mp4",
          "videoPoster": "assets/lesson/ipdv/baseline-truncation-poster.jpg",
          "videoMuted": true,
          "videoLoop": true,
          "videoAutoplay": true,
          "imageFit": "contain",
          "title": "Same five numbers. Two different axes.",
          "notes": "VIDEO — a file beside the deck, or a YouTube or Vimeo link. Paste the share URL and it becomes an embed; paste a path and it becomes a real player with the projector’s own controls.\n\nThis one is set muted, looping and autoplaying, which is the combination that works on a wall: sound in a lecture theatre is a gamble, a loop means a latecomer still sees the whole thing, and autoplay saves you walking to the laptop. Autoplay is honoured on the projector and never in the editor — a preview that starts playing while you type is a preview you turn off.\n\nStart and end are settable in seconds, so a forty-minute recording can contribute the ninety seconds you actually want without you editing the file. The poster is the frame it shows before it plays, and it is worth setting: without one the slide is a black rectangle until the first frame decodes.\n\nAn embedded clip draws a still in the editor rather than a dead frame, because loading the real player beside the inspector would start somebody’s video while they worked.\n\nOne thing worth copying: a video caption is a fixed band across the bottom of the frame, about 208px of white-on-gradient, and it clears the player controls rather than the content. So this clip was drawn with that band empty — the chart and its labels stop above it. If you are making the clip as well as the slide, leave the caption somewhere to sit."
        },
        {
          "type": "content",
          "title": "Video — what to check before the lecture",
          "bullets": [
            "A file beside the deck\tPlays with no network. This is the one to use when the room’s wifi is a rumour.",
            "A YouTube or Vimeo link\tBecomes an embed on the no-cookie domain. Needs the network, and the site has to be reachable from the lecture theatre.",
            "Muted, looping, autoplaying\tThe wall combination. Sound only if you have tested the room’s sound.",
            "Start and end\tClip the ninety seconds you want out of a forty-minute recording, without editing the file."
          ],
          "notes": "The clip on the previous slide is about 280 KB and travels with the deck, which is the whole argument for a file over a link: nothing to load, nothing to log in to, nothing that shows an advert first.\n\nWhat it shows is the same five numbers twice — once on an axis that starts at zero, once on an axis that starts at 55. A bar encodes its value as a LENGTH, so cutting the baseline cuts away the part of the length that carries the value, and the differences that are left look several times larger than they are. It is the most common way a correct number tells a lie, and it is much easier to watch happen than to describe."
        },
        {
          "type": "section",
          "title": "What the room does",
          "subtitle": "Four ways a slide can ask, and one live check",
          "notes": "Everything from here needs Host live and phones in the room. On the projector each of these draws its own control; on a learner phone the same control takes over the screen."
        },
        {
          "type": "join",
          "title": "Everyone in, in about twenty seconds",
          "subtitle": "Phones out — the code and the PIN both work",
          "bullets": [
            "Scan the code, or type the address and the four digits.",
            "No app, no account, no name unless you ask for one."
          ],
          "notes": "JOIN — the app builds this for you when you host a session, with the real room code in it. What you are looking at now is a sample, because this deck is not live.\n\nLeave it on the wall while the room arrives. Latecomers join off the same code without stopping you."
        },
        {
          "type": "split",
          "imageFit": "contain",
          "imageSide": "left",
          "design": {
            "imageShare": 35
          },
          "image": "assets/demo-phone/phone-poll.jpg",
          "title": "What it looks like in their hand",
          "bullets": [
            "Their own first name at the top — and a question mark, a raised hand and a heart, so a room can interrupt without interrupting.",
            "Under it, which slide the wall is on. That line is what stops “which one are we looking at?”",
            "The heart saves this slide to their own copy, so revision is something they build while the lesson happens.",
            "The poll itself takes the whole screen. There is nothing else on it to do."
          ],
          "notes": "A REAL SCREENSHOT, not a drawing of one: this deck hosted, joined from a phone-sized browser, photographed mid-poll. The slide number on it is this deck with its games compiled out, which is why it counts past the ninety in the editor.\n\nNo app, no account, a first name only when the activity needs one — and somebody watching a follow-along screen is not in the register at all.\n\nRegenerate all of these with tools/capture-phone.mjs whenever the learner screens change. A screenshot nobody can rebuild goes stale and then lies about the product."
        },
        {
          "type": "split",
          "imageFit": "contain",
          "imageSide": "left",
          "design": {
            "imageShare": 35
          },
          "image": "assets/demo-phone/phone-check-answered.jpg",
          "title": "And when it is a check rather than a poll",
          "bullets": [
            "A to D, one tap, then “Locked in” — so they know the answer arrived.",
            "Then, and only then: how sure are you? I’m sure, or just a guess.",
            "A confident wrong answer is the most useful thing in the room. It is also the one a show of hands never tells you.",
            "The same screen carries every engine — ranking, typing, estimating, the race, the boss."
          ],
          "notes": "CONFIDENCE is optional on all twenty-three engines and off by default. Turn it on for the questions where being wrong-and-certain is the thing you need to catch.\n\nThe other captured screens — joining, the word cloud, the scale — are in assets/demo-phone if you want them in a deck of your own. They came out of the same run as these two."
        },
        {
          "type": "split",
          "imageFit": "contain",
          "imageSide": "left",
          "design": {
            "imageShare": 35
          },
          "image": "assets/demo-phone/phone-share.jpg",
          "title": "And afterwards, the same deck at their own pace",
          "bullets": [
            "The read-only link opens on a phone as well as a laptop.",
            "Arrows at the bottom, Full screen if they want it, and a count so they know how far there is to go.",
            "No PIN, no room, no clock — and nothing they do here reaches your register.",
            "Speaker notes are not in it. What they get is the slides."
          ],
          "notes": "This is the first of the two shares, seen from the other end: the copy they page through themselves. Worth showing a client next to the live screens, because it answers the question every room asks at the end — “can we get the slides?” — without you emailing a 40 MB file.\n\nThe follow-along screen is the same address with one word added, and it is the one that moves when you move. Both are on the Share button, which asks which you want before it uploads anything."
        },
        {
          "type": "content",
          "title": "Poll — fixed options, counted live",
          "bullets": [
            "Add a feedback moment to any slide from the inspector.",
            "The room answers on their phones; the bars fill in the rail beside the slide.",
            "Use it to decide what to do next, not to score anybody."
          ],
          "feedback": {
            "kind": "poll",
            "prompt": "Which of these is the hardest to get right?",
            "options": [
              "Choosing the idiom",
              "Cleaning the data",
              "Writing the caption"
            ],
            "max": 1
          },
          "notes": "POLL — the results are for you, in the room, now. Read the split out loud and change the next ten minutes because of it, or do not ask."
        },
        {
          "type": "content",
          "title": "Word cloud — one word each",
          "bullets": [
            "Short answers, repeats grow larger.",
            "Best before you teach something, not after."
          ],
          "feedback": {
            "kind": "wordcloud",
            "prompt": "One word: what makes a chart honest?",
            "options": [],
            "max": 2
          },
          "notes": "WORD CLOUD — keep it to a word each or the cloud becomes a paragraph nobody reads. A cloud of the room’s own words on the wall is the cheapest way to make a room feel present."
        },
        {
          "type": "content",
          "title": "Brainstorm — longer contributions, newest first",
          "bullets": [
            "For sentences rather than single words.",
            "Contributions arrive with names, so the room can be credited by name.",
            "Read a few out. An unread brainstorm teaches the room not to bother next time."
          ],
          "feedback": {
            "kind": "brainstorm",
            "prompt": "Name a chart you have seen this week that misled you — and say how.",
            "options": [],
            "max": 3
          },
          "notes": "BRAINSTORM — the widest of the four: no options, no scale, just what they want to say. It lists newest first so the wall keeps moving while people are still typing."
        },
        {
          "type": "content",
          "title": "Scale — where do you stand?",
          "bullets": [
            "One position each, on an ordered run of points.",
            "It reports the spread as well as the average — and the spread is usually the more interesting half."
          ],
          "feedback": {
            "kind": "scale",
            "prompt": "How confident are you reading a box plot?",
            "options": [],
            "max": 1,
            "points": 5,
            "lowLabel": "Not at all",
            "highLabel": "Completely"
          },
          "notes": "SCALE — a poll over points that have an order, so it earns a mean and a distribution rather than a set of independent bars. Name both ends of it, as this one does.\n\nRead the spread out loud. A room split into two camps and a room that is uniformly unsure have the same average and need completely different next ten minutes."
        },
        {
          "type": "game",
          "gameRef": "check",
          "notes": "A LIVE CHECK — built for you rather than chosen from the layout picker, which is why it is not in the bank above. Phones answer, you hold the reveal, and the explanation follows. Confidence is on here, so the room says how sure it is as well as what it thinks — a confident wrong answer being the most useful signal you can get.\n\nThe quiz, results, join and explain slides are made the same way, by the live session."
        },
        {
          "type": "section",
          "title": "Activities",
          "subtitle": "Fifty-four of them, filed by where they belong in a lesson",
          "notes": "The layouts above are shapes you fill in. An activity is the other direction: you pick the teaching move, and it writes the slides."
        },
        {
          "type": "content",
          "title": "The activity library",
          "bullets": [
            "Fifty-four activities\tFiled under the eleven phases of a lesson — starter, activation, construction, mini, main, collaboration, mini-quiz, reflection, plenary.",
            "Each one says what it costs\tHow long it takes, and what has to be in the room before you start.",
            "Picking one writes the slides\tNot a description of the activity. The actual slides, filled in, in your deck, ready to be rewritten."
          ],
          "notes": "THE ACTIVITY LIBRARY — the Activities studio, or the library dialog from anywhere. Filter by phase and the list stops being fifty-four things and starts being the four that fit where you are.\n\nFormats that are planned but not built are shown and disabled rather than hidden, so the list does not quietly imply the app can do less than it can — or more."
        },
        {
          "type": "cards",
          "design": {
            "cardsMode": "rows"
          },
          "title": "Where an activity lands",
          "bullets": [
            "A slide\tTwenty-three write one finished slide, at the layout the activity needs.",
            "An arc of slides\tTwo write several, because the activity has stages.",
            "A game\tTen build a game and the slide that runs it.",
            "A feedback moment\tNine attach a prompt the room answers on their phones.",
            "A live moment\tTen are run rather than drawn: a task, a timer, a break."
          ],
          "notes": "The library tells you which of these an activity is before you pick it, because “adds a slide” and “runs for ten minutes with phones out” are different commitments.\n\nWhere the original teaching move did not fit an engine honestly, the entry says so and what it does instead. Card Sort wanted fifteen cards in student-chosen groups; Ranking allows eight in one line. So it writes the slide and leaves the cards on the table where they belong."
        },
        {
          "type": "keywords",
          "activity": "think-pair-share",
          "activityPresentation": "steps",
          "title": "Think-Pair-Share",
          "bullets": [
            "Think · 1 min\tOn your own: which chart in this deck would you not have chosen? One line.",
            "Pair · 3 min\tSwap with the person beside you and argue for the one you would keep.",
            "Share · 3 min\tTwo pairs report out. I write the disagreement on the board."
          ],
          "modelAnswer": "Any answer that names the question the chart was meant to answer, and says which channel it asked the eye to judge. “The radar, because area grows as the square of the values” is a strong answer. “The pie, because pies are bad” is not.",
          "modelAnswerDraft": true,
          "notes": "AN ACTIVITY SLIDE, as the library writes it — rail badge naming its phase, timings in the labels, the steps view so the three stages read as three stages.\n\nThe box underneath is a DRAFT ANSWER. Nineteen activities carry a worked answer in their teacher notes, and the library brings it across rather than leaving it where no room ever sees it. It arrives shut and marked: every one is written about somebody else’s subject, so showing it unread would put the wrong answer on the wall. Rewrite it and it becomes the card on the next slide."
        },
        {
          "type": "keywords",
          "activity": "i-do-we-do-you-do",
          "activityPresentation": "panels",
          "title": "I do · We do · You do",
          "bullets": [
            "I do\tI build one chart from this table, saying every choice out loud.",
            "We do\tWe build the next one together — you tell me what to choose and why.",
            "You do\tYou build the third on your own. I say nothing.",
            "We check\tTwo of yours on the wall side by side, and we say why they differ."
          ],
          "progressive": true,
          "notes": "THE PANELS VIEW — four equal panels, and only at four: the view needs exactly that many, so three or five falls back to rows rather than drawing a gap. Gradual release is four moves, which is why it is the shape this activity uses.\n\nBuild on Next is on, so the room is not reading “you do” while you are still doing."
        },
        {
          "type": "keywords",
          "activity": "error-analysis",
          "activityPresentation": "brief",
          "title": "Error analysis — find the faults",
          "bullets": [
            "The chart\tA pie with eleven slices, two of them 3%, no labels, ordered alphabetically.",
            "Find three faults\tName each one, then say what it costs the reader.",
            "Then redraw it\tOne sentence: which idiom, and what its title would say."
          ],
          "modelAnswer": "Eleven slices is well past the point where an angle can be judged, and the two 3% slices are unreadable at any size. No labels means the legend is the only key, so the eye travels for every slice. Alphabetical order throws away the ranking, which is the one thing the reader wants. Redraw as a sorted horizontal bar, titled with the finding rather than the subject.",
          "notes": "THE ANSWER CARD, rewritten and therefore live: the task is on the front and the worked answer is BEHIND it, not further down. Turning the card over is a deliberate act that happens when the time is up — so the room looks at the task for the whole of the activity instead of reading ahead.\n\nThe brief view sets the labels as headings, for an activity whose rows are instructions rather than vocabulary."
        },
        {
          "type": "content",
          "title": "A moment you run, not a slide you wrote",
          "bullets": [
            "A task\tInstructions over whatever is on screen, with a countdown if it needs one.",
            "A timer\tThinking time on its own, so silence in the room is deliberate rather than awkward.",
            "A break\tFive minutes, said out loud, so nobody has to ask."
          ],
          "notes": "LIVE MOMENTS — started from the presenter desk or the controls on the wall, mid-slide, without leaving the show. The deadline is held by the host rather than each phone, so a learner joining late sees the same clock as everyone else and pausing pauses it for the room.\n\nOne refusal worth knowing: a moment will not start over a knowledge check that is still waiting to be revealed. That would cover the question with a countdown about something else."
        },
        {
          "type": "section",
          "title": "Games",
          "subtitle": "Twenty-three engines, twenty-seven ready-made formats",
          "notes": "A game is its own document, joined to a slide. The three that follow are three different engines on the same subject, so what changes is the shape of the thinking rather than the topic."
        },
        {
          "type": "content",
          "title": "The game library",
          "bullets": [
            "Twenty-three engines\tMultiple choice, true / false, ranking, typed answers, estimation, odd-one-out, definitions, memory pairs, heads-up, bingo, a horse race, a boss battle.",
            "Twenty-seven ready-made formats\tThe same engines set up for a job: Beat the Clock, Spot the Error, Predict the Outcome, Fill in the Blanks, Concept Chain, Question Cube.",
            "Two places they go\tBetween slides as their own board, or beside a slide as a quick check."
          ],
          "notes": "THE GAME LIBRARY — the same dialog as the activities, and each card says how the room takes part before you pick it.\n\nEvery engine shares the same spine: phones answer, you hold the reveal, the explanation follows, and confidence is optional on all of them. What differs is what the wall does while the room is answering — which is most of whether a class leans in."
        },
        {
          "type": "game",
          "gameRef": "rank",
          "notes": "RANKING — one linear order, part marks for the items placed right, so a nearly-correct answer is not scored as a wrong one. Three to eight items; past eight the room is sorting rather than thinking.\n\nGood for a process, a chronology, or a set of priorities. Bad for anything where two items genuinely tie, because the engine will insist on an order the subject does not have."
        },
        {
          "type": "game",
          "gameRef": "race",
          "notes": "HORSE RACE — multiple choice, but every right answer moves your team along a track on the wall. The questions are ordinary; the track is what makes a quiet class shout.\n\nTeams, not individuals, which is deliberate: a leaderboard of names is a reason for the weakest learner in the room to stop answering. Keep it for practising something they have already been taught."
        },
        {
          "type": "game",
          "gameRef": "boss",
          "notes": "BOSS BATTLE — the whole class against one health bar. Each question carries a difficulty and deals damage to match: an easy hit is 1, the boss blow is 5, so the hard question is worth attempting even by somebody who has got the last three wrong.\n\nNobody is behind anybody. That is the entire pedagogical argument for it, and it is a good one for the end of a topic."
        },
        {
          "type": "section",
          "title": "Running the room",
          "subtitle": "Rehearse, present, host — and the two ways to share",
          "notes": "Everything so far is what goes on the wall. This is what you are holding while it is up there."
        },
        {
          "type": "cards",
          "design": {
            "cardsMode": "rows"
          },
          "title": "Four ways to run the same deck",
          "bullets": [
            "Rehearse\tThe whole lesson against a sample class — answers, scores and a room that is not there. Nothing counts.",
            "Present\tThe show on the wall. Arrow keys, or the controls that fade in when the mouse moves.",
            "Host live\tThe same show with phones in it: a join code, answers coming back, the room in a rail beside the slide.",
            "Teacher Presenter\tA second window for you alone — notes, what is next, who answered what, and the room. Press D."
          ],
          "notes": "REHEARSE is the one most people never find, and the one worth finding: it fills the deck with a plausible class so you can see what a poll looks like with thirty answers in it before thirty people are watching you meet it.\n\nTeacher Presenter wants a second screen. Without one, it is still the right window to have on a laptop while the projector shows the wall."
        },
        {
          "type": "table",
          "title": "The controls on the wall",
          "body": "Control\tKey\tWhat it does\nBack / forward\t← →\tOne point at a time, on a slide that builds\nRoom view\tS\tHidden, beside the slide, or full screen\nQuick poll\tV\tAsk what you had not planned to ask\nFreeze\tZ\tHold the wall while you digress\nDraw\tI\tInk on the slide, or spotlight part of it\nBlank\tB\tBlack the projector · Shift+B the phones\nJoin code\tJ\tThe QR and PIN, full screen\nEverything else\t?\tThe full list of keys",
          "notes": "THE CONTROLS fade in when the mouse moves and fade out again, so a still wall is a slide rather than a slide with a toolbar on it. Everything here has a key, and the keys are the faster route.\n\nBehind the ••• as well, each with its own key: the leaderboard (E), the room’s reactions on or off (T), who may speak (Shift+H), reset the scores (R), named answers in the presenter window (W), full screen (F), and the two pop-outs. FREEZE is the one to learn first — it is the difference between a digression and a scramble."
        },
        {
          "type": "table",
          "title": "Teacher Presenter — nine panels",
          "body": "Panel\tWhat it holds\nNotes\tYour notes for this slide, and the next slide beside them\nQuick\tA task with a countdown, a break, and five one-tap polls\nActivities\tThe library, runnable mid-lesson without leaving the show\nPulse\tReactions and slide responses as they arrive\nAnswers\tWho answered what — names, not only totals\nClass\tThe register: who joined, who is still missing\nInsights\tWhich questions the room found hard, and how sure it was\nTools\tName picker, timer, a scratch pad\nQ&A\tQuestions from phones, with a badge when one is waiting",
          "notes": "This window is private. The projector never shows it, which is why the notes you are reading live here rather than on the slide.\n\nIt opens as a real pop-out — drag it to a second screen, or keep it on the laptop while the wall runs the show. Press D from the show, or the button in the bar before you start."
        },
        {
          "type": "compare",
          "title": "Two ways to share, and they are not the same thing",
          "subtitle": "Read at their own pace | Follows you live",
          "bullets": [
            "Needs a live room\tNo — works whether or not you are presenting\tYes — Host live first, or the option is greyed out with the reason on it",
            "Who drives\tThey do: their pace, their order, their own time\tYou do: it moves when you move, including through a build, and cannot run ahead",
            "What it is for\tRevision afterwards, and the person who missed the lesson\tA second projector, an overflow room, a desktop at the back of the hall",
            "PIN\tNone. The address is the whole secret\tNone either — and nobody watching appears in your register or your reports"
          ],
          "progressive": true,
          "notes": "SHARE asks which of these you want before it uploads anything, because they come out of one copy and answer completely different questions. Each gets its own QR code and its own address.\n\nWhat both mean: a copy on this server at an address nobody can guess, unlisted and read-only — but a link that escapes is a lesson that escaped. Games are not carried across; the slides are. You get a key that withdraws it, and it is the only way to."
        },
        {
          "type": "section",
          "title": "Two settings that apply everywhere",
          "subtitle": "Build on Next, and the theme",
          "notes": "Worth knowing before you start copying slides out of this deck."
        },
        {
          "type": "cards",
          "title": "What carries across every layout",
          "bullets": [
            "Build on Next\tReveal a slide piece by piece rather than all at once. Per slide, not per deck.",
            "Hide or Dim\tHide keeps the next point secret. Dim leaves earlier points on screen at 38%.",
            "Theme\tSet on the deck. Every layout here redraws in any of the themes.",
            "Notes\tWhat you are reading now. Visible on the presenter desk, never on the projector.",
            "Logo\tSet on the deck, drawn top right. Keep a slide title under about 40 characters so it cannot run under it."
          ],
          "progressive": true,
          "buildMode": "dim",
          "notes": "Be strategic with dim. It suits a list where the earlier points are still doing work — a framework, a set of criteria. It is wrong where the next point is a reveal, or where the slide is already busy."
        },
        {
          "type": "content",
          "title": "Using this bank",
          "bullets": [
            "Page through it once to see what exists.",
            "Found a shape you want? Copy the slide (⌘C) and paste it into your own deck (⌘V), then replace the content.",
            "Layouts are app-wide — every one of these is already in the layout picker of every deck you open.",
            "This deck is a reference copy. Edit it freely; rebuild it from the lesson picker whenever you want a clean one.",
            "Not chosen from the picker: quiz, results and explain. Those are built by the live session."
          ],
          "notes": "Close. Rebuilding this lesson gives a fresh copy, so nothing here is precious. Every layout the picker offers is in this deck, video included — it plays a clip that ships with the deck rather than pointing at a URL that might not answer. Three slide types never appear in the picker at all: quiz and results are built by the live session, and explain is the card that shows the correct answer after a check — which is also why the student handout leaves it out."
        }
      ]
    },
    {
      key: 'ukbt-sponsorship',
      title: 'UK Black Tech — partnership pack',
      icon: '❯',
      blurb: 'The partnership pack as a deck: who we are, the audience, the four tiers, the individual opportunities and how it works. Pricing is placeholder and every slide that carries a number says so.',
      minutes: 25,
      theme: 'ukbt',
      libraryGroup: 'ukbt',
      kind: 'lecture',
      org: 'UK Black Tech',
      logo: 'assets/brand/ukbt-wordmark.png',
      logoOn: 'all',
      logoSize: 'small',
      logoReverse: 'never',
      slides: [
        { type: 'title', title: 'Partnership\nPack',
          subtitle: 'Building the UK’s most equitable tech ecosystem — with partners who mean it.',
          notes: 'The deck follows the written pack, so the two never drift apart. Two things to do before it goes to anybody: set the real prices, and fill in the bracketed confirmations — the pack marks both and so do these notes.' },

        { type: 'section', title: 'Who we are',
          subtitle: 'Seven years, thirty-five events, one ecosystem.',
          notes: 'Short. The room already knows roughly who you are or they would not be in it; this is the turn into the substance.' },

        { type: 'content', title: 'What UK Black Tech does',
          bullets: [
            'Increases wealth\tBy promoting a culture of innovation, tech and digital skills across its community.',
            'Moves knowledge\tStimulates and manages the flow of technical insight between universities, R&D institutions, companies and markets.',
            'Builds companies and talent\tThrough events and spin-off initiatives.',
            'Serves the wider sector\tValue-added services beyond our own community.'
          ],
          progressive: true, buildMode: 'dim',
          notes: 'Straight from §1 of the pack. The line to say out loud and not put on the slide: a great tech ecosystem needs equity, transparency and representation at the cutting edge — not as an afterthought to it.' },

        { type: 'keyfact', title: 'Who you would be reaching',
          subtitle: 'Combined reach across the UK Black Tech platform',
          body: '20,000 tech professionals',
          bullets: [
            '60% identify as women.',
            '35% are under 25.',
            'Unusually young and unusually female for UK tech — if your objective is early-careers hiring, graduate pipeline or reaching women in technical roles, this audience over-indexes for you where general tech channels do not.'
          ],
          progressive: true, buildMode: 'dim',
          notes: 'Say the number, then stop. The two lines under it are what make it different from every other reach figure in the room.\n\nThe pack flags more to add here if it can be evidenced: newsletter subscribers and open rate, social following, average event attendance, seniority split, geography, top employers represented. A figure you cannot evidence is worse than no figure.' },

        { type: 'content', title: 'Why partner with us',
          bullets: [
            'A hard-to-reach audience\tNot a mailing list bought in — built over seven years of consistent, in-person, sector-specific work.',
            'Credibility, not visibility\tPresence in this ecosystem signals to Black tech professionals that you are a serious employer or buyer. That signal is earned through repetition.',
            'A pipeline, not a photo\tPartners use us for hiring, supplier diversity, product research, community insight and thought leadership — often all four.',
            'Measurable return\tEvery partnership reports against metrics agreed at kick-off.'
          ],
          progressive: true, buildMode: 'dim',
          notes: 'Open with the sentence from the pack: most diversity partnerships fail for the same reason — they buy a logo placement at a one-off event and nothing changes. Say it plainly. It is the argument the whole deck rests on and it earns the room’s attention because it concedes something first.' },

        { type: 'section', title: 'Four ways in',
          subtitle: 'Annual tiers, and single opportunities for partners not ready for one.',
          notes: 'The turn into the commercial half.' },

        { type: 'table', title: 'Annual tiers · placeholder pricing',
          body: '\tCommunity\tGrowth\tStrategic\tFounding\nAnnual investment\t£3,000\t£8,500\t£20,000\t£40,000+\nTerm\t12 months\t12 months\t12 months\t24 months\nPlaces available\tOpen\t8\t4\t2\nJob listings\t3 / year\t10 / year\tUnlimited\tUnlimited\nEvents included\t—\t1\t2\t3 + named series\nSpeaking slots\t—\t1\t2\t3 + keynote\nSponsored articles\t—\t1\t2\t4\nRoundtables\t—\t—\t1\t2\nResearch report\t—\t—\t—\t1',
          notes: 'PRICING IS PLACEHOLDER — the pack says so in a warning box and the slide title says so on the projector. These are a starting structure based on typical UK market rates for an organisation of this size and reach. Set your own numbers before this goes to any partner, and change the title when you do.\n\nThe full matrix in the pack has six more rows — newsletter features, social amplification, survey questions, named manager, reporting, programme input. They are in the leave-behind; this slide is the shape of the offer.' },

        { type: 'cards', title: 'What each tier is for',
          bullets: [
            'Community\tSmaller organisations, startups and scale-ups who want presence and access without a large commitment. An entry point, not a lesser partner.',
            'Growth\tOrganisations with an active hiring or brand objective. The most common starting tier for corporates testing the relationship.',
            'Strategic\tPartners with a defined DEI, talent or community strategy who need depth, data and repeated visibility. Includes closed-door roundtable access.',
            'Founding\tA small number of long-term partners who want to shape the programme itself, not just appear in it. Two places; the 24-month term gives both sides runway to build something real.'
          ],
          progressive: true, buildMode: 'dim',
          notes: 'Name the tier you think they belong in before you get to this slide, then let them read the others. A partner who chooses their own tier stays in it.' },

        { type: 'cards', title: 'Single opportunities · placeholder pricing',
          bullets: [
            'Event\t£3,500 — a high-impact event bringing together experts in your target sector. A platform for thought leadership and networking.',
            'Article\t£1,200 — an expertly crafted piece on a topic or trend relevant to your audience.',
            'Roundtable\t£5,000 — an intimate, invite-only discussion. A deep dive into an industry challenge, with meaningful dialogue and brand alignment.',
            'Report\t£12,000 — original insight and data, positioning your organisation as a thought leader.'
          ],
          notes: 'For partners not ready for an annual tier, or adding to one. Placeholder pricing again.\n\nAlso in the pack and not on this slide: event hosting from £4,500 virtual and £9,000 in person excluding venue and catering, with a month’s prep and two planning meetings; and platform advertising — £250 a job listing, £1,000 for five, £400 an event listing, £750 a month for a banner.' },

        { type: 'journey', title: 'How it works',
          subtitle: 'Six steps, and the first one is not a pitch',
          bullets: [
            'Intro call\tThirty minutes. We understand your objectives and current activity. No pitch.',
            'Proposal\tBack within five working days with a recommended tier or bundle, mapped to your objectives.',
            'Agreement\tContract, invoice, kick-off date set.',
            'Kick-off\tSixty minutes to agree the activity calendar, success metrics and points of contact.',
            'Delivery\tWith a named manager at Strategic and Founding.',
            'Reporting\tQuarterly, against the metrics agreed at kick-off.'
          ],
          progressive: true,
          notes: 'Six steps is the most a room will hold. Reveal them one at a time and dwell on the first: "no pitch" is the promise that makes the call easy to accept, so do not undercut it by pitching on the call.' },

        { type: 'keywords', title: 'What we report, and what we ask',
          bullets: [
            'Reach and engagement\timpressions, attendance, open rates, click-throughs, per activity',
            'Pipeline\tapplications and enquiries generated from job listings',
            'Who came\tevent attendance profile — seniority, discipline, career stage',
            'One contact\ta single point of contact with authority to decide',
            'Assets on time\tslow approvals are the main cause of missed promotion windows',
            'People who want to be there\tnot people who were told to attend'
          ],
          progressive: true,
          notes: 'Two halves of one bargain, which is why they share a slide. The sentence from §7 worth saying out loud: we would rather report something honest and modest than something impressive and vague — if an activity underperforms we will tell you, and we will fix it.\n\nAnd from §8: we reserve the right to decline or end a partnership where the relationship is inconsistent with our values or our community’s interests. Say it if the room needs to hear it.' },

        { type: 'content', title: 'Next steps',
          bullets: [
            'Book an intro call\tThirty minutes, no pitch. Add your booking link before presenting.',
            'Add your contact details\tName, role, email, phone, website, LinkedIn — the pack leaves all six to confirm.',
            'Set the prices\tEvery figure in this deck is a placeholder until you replace it.'
          ],
          notes: 'This slide is a checklist for you, not for the partner — replace it with your actual contact details and the booking link before this deck leaves the building, and change the two placeholder-pricing titles at the same time.' }
      ]
    },
    {
      key: 'ukbt-institute-partnership',
      title: 'UKBT Institute — partnership pack',
      icon: '◈',
      blurb: 'The Institute pack as a deck: the method, the track record, the research agenda, the independence terms, and the four partnership routes. Pricing is placeholder and the slides say so.',
      minutes: 30,
      theme: 'ukbt-institute',
      libraryGroup: 'ukbt-institute',
      kind: 'lecture',
      org: 'UKBT Institute',
      logo: 'assets/brand/ukbt-institute.svg',
      logoOn: 'all',
      logoSize: 'small',
      logoReverse: 'never',
      slides: [
        { type: 'title', title: 'Partnership\nPack',
          subtitle: 'Research, hackathons and programmes tackling the social problems technology keeps missing.',
          notes: 'The deck follows the written pack. Before it goes anywhere: set the real costs, and fill in the bracketed confirmations — particularly the Sickle Cell outcomes, which the pack itself calls the strongest proof point with no numbers attached.' },

        { type: 'content', title: 'What the Institute is',
          bullets: [
            'Why it exists\tA lot of technology gets built for a narrow slice of the population, and the consequences land hardest on communities that were never in the room.',
            'What it does about it\tPuts those communities in the room — alongside clinicians, data scientists, engineers and academics, on problems that matter to them.',
            'Where it sits\tThe research and programme arm of UK Black Tech. Where the parent builds the ecosystem, the Institute produces the evidence, the training and the prototypes.'
          ],
          progressive: true, buildMode: 'dim',
          notes: 'Three beats: the problem, the method, the relationship to the parent. The third matters commercially — a partner who wants brand reach across a tech community wants the UK Black Tech pack, not this one, and saying so early saves a wasted meeting.' },

        { type: 'cards', title: 'What we have built so far',
          bullets: [
            '16 courses\tDigital courses created with Tech Mums, FutureLearn and the University of Leeds.',
            '1 hackathon\tThe Sickle Cell Hackathon — doctors, data scientists, patients and web developers, at the Design Museum.',
            '5 institutions\tIncluding a collaboration with LSBU’s Computer Science department.'
          ],
          notes: 'Track record, not ambition. Keep it to things that have finished.' },

        { type: 'content', title: 'The Sickle Cell Hackathon',
          bullets: [
            'The condition\tThe UK’s most common genetic blood disorder, disproportionately affecting people of African and Caribbean heritage — and chronically under-served by health technology.',
            'The method\tPatients in the build process alongside the clinicians treating them and the developers who could prototype. From the first hour, not as a consultation at the end.',
            'Why it is here\tIt is the clearest example of how the Institute works, and it is the thing partners ask about.'
          ],
          progressive: true, buildMode: 'dim',
          notes: 'THIS SLIDE NEEDS NUMBERS. The pack says so itself: participants, prototypes produced, what happened to them afterwards, press coverage, continued development. It is the strongest proof point in the pack and it currently has none attached. A partner will ask, and "I would have to check" is a worse answer than a modest real figure.' },

        { type: 'keywords', title: 'The research agenda',
          bullets: [
            'Women’s Health in the Age of Technology\thow digital health tools serve, or fail to serve, women and particularly Black women',
            'Health equity and clinical data\twhere datasets under-represent communities, and what that produces downstream',
            'Theme three\tto confirm',
            'Theme four\tto confirm'
          ],
          notes: 'Two real themes and two to fill in. Do not present the placeholders — either add the themes or cut the rows, because an agenda that is half blank reads as an agenda that is half imagined.\n\nThe pack also asks for published outputs, working papers and studies in progress. A partner funding research wants to see what your research actually looks like before they fund more of it.' },

        { type: 'content', title: 'Why partner with the Institute',
          bullets: [
            'Communities research fails to reach\tRecruitment into health research from Black and minority communities is a known, documented problem. We have earned the trust to do it — as partners with those communities, not extractors of data.',
            'Applied output, not shelf-ware\tHackathons produce prototypes. Courses produce trained people. Reports are written to be used.',
            'Cross-sector convening\tClinicians, patients, academics and engineers in one room is harder to arrange than it sounds. It is most of what we do.',
            'Credible impact reporting\tSpecific, evidenced and defensible — including under Social Value Model requirements in public procurement.'
          ],
          progressive: true, buildMode: 'dim',
          notes: 'The fourth one closes deals with procurement teams and nobody else. Know which of the four the person in front of you is buying.' },

        { type: 'section', title: 'Partners fund our work.\nPartners do not determine our findings.',
          subtitle: 'Research independence',
          notes: 'The most important slide in the deck and the one to slow right down on. It is on the green because it is the thing you want the room to look up at.\n\nThe argument, if it is challenged: a report a sponsor could have edited is a marketing document, and everyone reading it knows that. Independence is not a constraint on the value — it is the value.' },

        { type: 'content', title: 'What that means in practice',
          bullets: [
            'Questions agreed jointly\tAt the outset, and documented.',
            'Conclusions rest with us\tMethodology, analysis and conclusions sit with the Institute and its academic collaborators.',
            'You see it first\tPartners see findings before publication and may correct factual errors about their own organisation. They may not require changes to conclusions.',
            'Funding is disclosed\tIn the published output, every time.',
            'We publish the inconvenient\tIncluding when it is inconvenient to a funder.'
          ],
          progressive: true,
          notes: 'Five rules, revealed one at a time. This is standard practice for a credible research institute — say that, because it reframes the terms from awkward to professional.' },

        { type: 'table', title: 'Partnership routes · placeholder costs',
          body: 'Route\tScope\tPlaceholder cost\nResearch\tInsight brief\t£15,000\nResearch\tFull study\t£45,000\nResearch\tMulti-year programme\t£100,000+\nProgramme\tCourse development\tfrom £20,000\nProgramme\tCohort delivery\tfrom £12,000\nHackathon\tLead partner\t£30,000\nHackathon\tSupporting partner\t£10,000',
          notes: 'PLACEHOLDER COSTS, and research scope varies enormously — treat these as the shape of the offer, not the number. Set your own before this goes to a partner and change the title when you do.\n\nThere is no description column: with one, every row wrapped to two or three lines and the last two rows fell off the bottom of the slide. Seven routes and a price is what a table on a wall can carry. The detail is for saying, not showing — an insight brief is desk research plus a community survey with a launch webinar; a full study adds primary fieldwork, academic collaboration, a launch event and media outreach at around forty pages; the multi-year programme runs two to three years with annual outputs. Lead hackathon partners co-define the challenge and take a named, full participating role; supporting partners get presence, mentor places and prize sponsorship.\n\nAlso available and not on the slide: in-kind hackathon support — venue, technical mentors, compute credits, clinical expertise — valued case by case. And learner bursaries at £500 a head, which needs your actual per-learner cost.' },

        { type: 'cards', title: 'Institute Partner · the annual route',
          bullets: [
            'Associate · £25,000\t12 months. One insight brief, supporting hackathon role, observer status, five volunteering places.',
            'Core · £60,000\t24 months. One full study, lead on a hackathon each year, one course, advisory board observer, fifteen places.',
            'Founding · £120,000+\t36 months. Two or more studies, lead plus challenge-setting, two courses and a bursary fund, full board seat, unlimited places.'
          ],
          progressive: true, buildMode: 'dim',
          notes: 'For organisations wanting a sustained relationship across all three strands rather than one commission. Every figure is a placeholder. All three include being named on Institute outputs, early access to findings, and an annual impact report written for your own reporting.' },

        { type: 'content', title: 'What partnership does not buy',
          bullets: [
            'Editorial control over findings.',
            'Exclusive or embargoed access to data beyond the agreed pre-publication window.',
            'Endorsement of your products or services by the Institute.',
            'Use of community participant data for commercial purposes.',
            'Association with our community without a genuine contribution to it.'
          ],
          progressive: true,
          notes: 'Stated plainly so there are no difficult conversations later. It reads as confidence rather than as restriction when it comes straight after the independence slide, which is why it sits here and not at the end.\n\nAnd the one that costs nothing: universities, NHS trusts, patient organisations and charities are not charged to collaborate. Those relationships run on shared contribution — access, expertise, data, ethics approval, co-authorship, venue.' },

        { type: 'journey', title: 'How it works',
          subtitle: 'Six steps, and ethics before fieldwork',
          bullets: [
            'Scoping conversation\tWhat you need to achieve, what we are already working on, and whether there is a genuine overlap. We will say so if there is not.',
            'Written proposal\tScope, method, timeline, cost, outputs — and the independence terms restated in full.',
            'Agreement and ethics\tContract signed. Where research involves human participants, ethics approval is secured through our academic partner before any fieldwork begins.',
            'Delivery\tWith agreed checkpoints. You will know if timelines move, and why.',
            'Publication and launch\tJoint launch event, media outreach, output published openly.',
            'Impact reporting\tIn a format that goes straight into your CSR, ESG or social value reporting.'
          ],
          progressive: true,
          notes: 'Step three is the one that separates this from a marketing engagement. Do not rush past it.' },

        { type: 'links', title: 'Where this comes from',
          bullets: [
            'UKBT Institute\thttps://ukblacktech.com/ukbt-institute/',
            'UK Black Tech\thttps://ukblacktech.com/'
          ],
          notes: 'Add the booking link for a scoping conversation, and your contact details — name, role, email, phone, LinkedIn. The pack leaves all of them to confirm and so does this deck.' }
      ]
    },

    /* ------------------------------------------------------------------
       Pacing galleries — openers and breakaways first, then a range of
       teaching layouts. Copy the shape into a real lesson; swap the words.
       ------------------------------------------------------------------ */
    {
      key: 'ukbt-template',
      title: 'UK Black Tech — blank template',
      icon: '❯',
      blurb: 'A starter deck in the UK Black Tech brand: one of every layout worth using, with placeholder copy to replace and a note on each saying what the layout is for. Rebuild it any time for a clean copy.',
      minutes: 0,
      theme: 'ukbt',
      libraryGroup: 'ukbt',
      kind: 'template',
      org: 'UK Black Tech',
      logo: 'assets/brand/ukbt-wordmark.png',
      logoOn: 'all',
      logoSize: 'small',
      logoReverse: 'never',
      slides: [
        { type: 'title', title: 'Your title here',
          subtitle: 'One line saying what this is and who it is for.',
          notes: 'TITLE — the only slide in the deck set in Alpha Lyrae, at 104px, which is the brand\u2019s hero treatment. Keep the heading to four or five words; a newline in the field gives you a deliberate line break rather than whatever the box decides.\n\nThe subtitle is a sentence, not a second heading. Set a date in the inspector and it prints under it as a small stamp.\n\nThe object bottom right changes by slide position, so you will not open two decks on the same shape.' },

        { type: 'section', title: 'Your first\nsection',
          subtitle: 'What this part of the talk is about.',
          notes: 'SECTION — the loudest surface in the deck: full green, dark ink, the chevron bled off the right. Keep it for the two or three moments you want the room to look up. A deck where every third slide is a section break has no section breaks.\n\nNothing else goes on it. If you find yourself adding bullets here, you want a content slide.' },

        { type: 'content', title: 'A point at a time',
          bullets: [
            'A lead-in\tThe part before the tab is set bold and the rest runs on from it, so a point can carry its own sub-clause.',
            'Another one\tUse lead-ins when the points are of the same kind — four criteria, four risks, four steps.',
            'Or no lead-in at all\tA line with no tab in it is just a sentence, which is often what you want.'
          ],
          progressive: true, buildMode: 'dim',
          notes: 'CONTENT — the workhorse. Build on Next is set to DIM here: points already made stay on screen at 38% so the argument so far is still readable. Switch it to Hide when the next point is a reveal.\n\nFour bullets is comfortable, six is a wall. Copy runs to a measure of about 880px so the right-hand third stays clear for the object; that is deliberate and it is also the readable line length.' },

        { type: 'keyfact', title: 'One number, set large',
          subtitle: 'COMBINED REACH ACROSS THE PLATFORM',
          body: '20,000 tech professionals',
          bullets: [
            'The first thing the number does not say on its own.',
            'The second thing.',
            'Three supporting lines is the limit — past that the number stops being the point.'
          ],
          progressive: true, buildMode: 'dim',
          notes: 'KEY FACT — for the one figure you want quoted back at you. The subtitle above it is the label, in the second face; the number is never a build step, so it is on screen the moment the slide is.\n\nSay the number, then stop talking. The supporting lines land better if the room reads them itself.' },

        { type: 'cards', title: 'Three things, side by side',
          bullets: [
            'First card\tThe flag above the heading is the card number. The heading is Heading 4 on the ramp and the paragraph sits under it.',
            'Second card\tCards take a brand colour each — purple, blue, orange, lime — with dark ink on them. Four in the cycle, so a row of four is four different colours.',
            'Third card\tUse cards for items that are peers. If one of them is more important than the others, it is not a cards slide.'
          ],
          progressive: true, buildMode: 'dim',
          notes: 'CARDS — built to the brand\u2019s own CTA card: flag, heading, paragraph, colour ground, square-ish corner. Three or four is right; six starts to shrink.\n\nA cards slide can carry a picture per card — add an images array in the inspector and the photograph sits above the heading. That is the shape the About page uses.' },

        { type: 'keywords', title: 'Terms and what they mean',
          bullets: [
            'First term\tthe definition, in a phrase rather than a sentence',
            'Second term\tterms are coloured on a cycle, so a list of six has a rhythm',
            'Third term\tdefinitions are set lower case by the theme, so write them as phrases',
            'Fourth term\tsix rows fit; a seventh will not'
          ],
          progressive: true,
          notes: 'KEYWORDS — a glossary, a set of criteria, anything that is a name and a meaning. The tab splits the two.\n\nThe definition column is lower-cased by the theme, which is a deliberate glossary style — write phrases, not sentences, and do not start one with a proper noun you need capitalised.' },

        { type: 'journey', title: 'A process, in order',
          subtitle: 'Reveal one step at a time',
          bullets: [
            'Step one\tThe text before the tab is the milestone, the text after it the detail.',
            'Step two\tMarkers are numbered for you and coloured on a cycle.',
            'Step three\tUse Journey when the order is the point. Use a mind map when the points are siblings with no order.',
            'Step four\tFour to six steps. A twelve-step plan from a stage is a plan nobody writes down.'
          ],
          progressive: true,
          notes: 'JOURNEY — a route, a timeline, a process, a handover. The green rule on this layout sits under the subtitle rather than the heading, because the subtitle belongs with the heading and the route starts below both.' },

        { type: 'table', title: 'When the exact value matters',
          body: 'Column\tSecond\tThird\nRow one\tvalue\tvalue\nRow two\tvalue\tvalue\nRow three\tvalue\tvalue\nRow four\tvalue\tvalue',
          progressive: true,
          notes: 'TABLE — paste a range straight out of Excel or Sheets; tabs and pipes both work and the first row is the header.\n\nKeep the cells short. A description column that wraps to three lines will push your last rows off the bottom of the slide — check the bottom row is on screen before you present. Reach for a table when the reader needs the number and a chart when they need the shape.' },

        { type: 'chart', chartKind: 'bar', title: 'A chart · replace the numbers',
          body: 'Year\tEvents\n2022\t4\n2023\t6\n2024\t9\n2025\t12',
          chartSource: 'Where these numbers came from, and what they are not. Replace this line — it prints under the chart and carries into the student handout.',
          progressive: true,
          notes: 'CHART — same pasted text a table takes. Twenty kinds, grouped in the picker by the question they answer rather than by what they look like: which is bigger, what is the trend, how does it divide up, where does it go.\n\nThese themes carry their own series colours, taken from the brand highlights and checked for contrast on both grounds. The source line under the chart is not optional furniture — it is the thing a reader needs a week later with nobody there to explain it.\n\nNo decorative object is drawn on a chart or a table slide, on purpose.' },

        { type: 'split', title: 'An event, a report, a launch',
          bullets: ['A date, a place, a name.', 'One more line if you need it.'],
          image: '', imageSide: 'left', imageFit: 'cover',
          notes: 'FEATURED CARD — a picture on one half, a lime panel with the copy on the other. This is the shape the Events page uses for the thing it wants looked at.\n\nAdd your photograph in the inspector. With the picture on the left the lockup moves to sit over it and switches to the positive version, because white lettering on lime is unreadable — that is handled for you.\n\nWith no image set this slide will look unfinished, which is the point: it is a template.' },

        { type: 'quote', body: 'A sentence worth the whole slide.',
          subtitle: 'Who said it',
          notes: 'QUOTE — body is the quotation, subtitle the attribution. If it runs past three lines it has stopped being a quote and wants to be a content slide.\n\nAlways attribute. An unattributed quotation on a slide is a claim with nobody behind it.' },

        { type: 'links', title: 'Where to go next',
          bullets: [
            'UK Black Tech\thttps://ukblacktech.com/',
            'A second link\thttps://example.org/'
          ],
          notes: 'LINKS — text before the tab is the label, after it the URL. In a live session these become tappable on learner phones, which is the only reliable way to hand a URL to a room.' },

        { type: 'content', title: 'Before you present this',
          bullets: [
            'Replace every placeholder\tIncluding this slide, which is a checklist for you and not for the room.',
            'Check the bottom of every slide\tLong tables and long card copy push content off the edge. Page through in Present mode once.',
            'Set the date\tOn the title slide, in the inspector. It prints as a small stamp under the subtitle.',
            'Say where numbers came from\tEvery chart has a source line. A figure you cannot evidence is worse than no figure.'
          ],
          notes: 'Delete this slide before presenting.\n\nRebuilding this template from the lesson picker always gives a clean copy, so nothing here is precious — edit it freely.' }
      ]
    },
    {
      key: 'ukbt-institute-template',
      title: 'UKBT Institute — blank template',
      icon: '◈',
      blurb: 'A starter deck in the UKBT Institute brand: one of every layout worth using, with placeholder copy to replace and a note on each saying what the layout is for. Rebuild it any time for a clean copy.',
      minutes: 0,
      theme: 'ukbt-institute',
      libraryGroup: 'ukbt-institute',
      kind: 'template',
      org: 'UKBT Institute',
      logo: 'assets/brand/ukbt-institute.svg',
      logoOn: 'all',
      logoSize: 'small',
      logoReverse: 'never',
      slides: [
        { type: 'title', title: 'Your title here',
          subtitle: 'One line saying what this is and who it is for.',
          notes: 'TITLE — the only slide in the deck set in Alpha Lyrae, at 104px, which is the brand\u2019s hero treatment. Keep the heading to four or five words; a newline in the field gives you a deliberate line break rather than whatever the box decides.\n\nThe subtitle is a sentence, not a second heading. Set a date in the inspector and it prints under it as a small stamp.\n\nThe object bottom right changes by slide position, so you will not open two decks on the same shape.' },

        { type: 'section', title: 'Your first\nsection',
          subtitle: 'What this part of the talk is about.',
          notes: 'SECTION — the loudest surface in the deck: full lime, dark ink, the chevron bled off the right. Keep it for the two or three moments you want the room to look up. A deck where every third slide is a section break has no section breaks.\n\nNothing else goes on it. If you find yourself adding bullets here, you want a content slide.' },

        { type: 'content', title: 'A point at a time',
          bullets: [
            'A lead-in\tThe part before the tab is set bold and the rest runs on from it, so a point can carry its own sub-clause.',
            'Another one\tUse lead-ins when the points are of the same kind — four criteria, four risks, four steps.',
            'Or no lead-in at all\tA line with no tab in it is just a sentence, which is often what you want.'
          ],
          progressive: true, buildMode: 'dim',
          notes: 'CONTENT — the workhorse. Build on Next is set to DIM here: points already made stay on screen at 38% so the argument so far is still readable. Switch it to Hide when the next point is a reveal.\n\nFour bullets is comfortable, six is a wall. Copy runs to a measure of about 880px so the right-hand third stays clear for the object; that is deliberate and it is also the readable line length.' },

        { type: 'keyfact', title: 'One number, set large',
          subtitle: 'DIGITAL COURSES BUILT WITH PARTNERS',
          body: '16 courses',
          bullets: [
            'The first thing the number does not say on its own.',
            'The second thing.',
            'Three supporting lines is the limit — past that the number stops being the point.'
          ],
          progressive: true, buildMode: 'dim',
          notes: 'KEY FACT — for the one figure you want quoted back at you. The subtitle above it is the label, in the second face; the number is never a build step, so it is on screen the moment the slide is.\n\nSay the number, then stop talking. The supporting lines land better if the room reads them itself.' },

        { type: 'cards', title: 'Three things, side by side',
          bullets: [
            'First card\tThe flag above the heading is the card number. The heading is Heading 4 on the ramp and the paragraph sits under it.',
            'Second card\tCards take a brand colour each — purple, blue, orange, lime — with dark ink on them. Four in the cycle, so a row of four is four different colours.',
            'Third card\tUse cards for items that are peers. If one of them is more important than the others, it is not a cards slide.'
          ],
          progressive: true, buildMode: 'dim',
          notes: 'CARDS — built to the brand\u2019s own CTA card: flag, heading, paragraph, colour ground, square-ish corner. Three or four is right; six starts to shrink.\n\nA cards slide can carry a picture per card — add an images array in the inspector and the photograph sits above the heading. That is the shape the About page uses.' },

        { type: 'keywords', title: 'Terms and what they mean',
          bullets: [
            'First term\tthe definition, in a phrase rather than a sentence',
            'Second term\tterms are coloured on a cycle, so a list of six has a rhythm',
            'Third term\tdefinitions are set lower case by the theme, so write them as phrases',
            'Fourth term\tsix rows fit; a seventh will not'
          ],
          progressive: true,
          notes: 'KEYWORDS — a glossary, a set of criteria, anything that is a name and a meaning. The tab splits the two.\n\nThe definition column is lower-cased by the theme, which is a deliberate glossary style — write phrases, not sentences, and do not start one with a proper noun you need capitalised.' },

        { type: 'journey', title: 'A process, in order',
          subtitle: 'Reveal one step at a time',
          bullets: [
            'Step one\tThe text before the tab is the milestone, the text after it the detail.',
            'Step two\tMarkers are numbered for you and coloured on a cycle.',
            'Step three\tUse Journey when the order is the point. Use a mind map when the points are siblings with no order.',
            'Step four\tFour to six steps. A twelve-step plan from a stage is a plan nobody writes down.'
          ],
          progressive: true,
          notes: 'JOURNEY — a route, a timeline, a process, a handover. The green rule on this layout sits under the subtitle rather than the heading, because the subtitle belongs with the heading and the route starts below both.' },

        { type: 'table', title: 'When the exact value matters',
          body: 'Column\tSecond\tThird\nRow one\tvalue\tvalue\nRow two\tvalue\tvalue\nRow three\tvalue\tvalue\nRow four\tvalue\tvalue',
          progressive: true,
          notes: 'TABLE — paste a range straight out of Excel or Sheets; tabs and pipes both work and the first row is the header.\n\nKeep the cells short. A description column that wraps to three lines will push your last rows off the bottom of the slide — check the bottom row is on screen before you present. Reach for a table when the reader needs the number and a chart when they need the shape.' },

        { type: 'chart', chartKind: 'bar', title: 'A chart · replace the numbers',
          body: 'Stage\tParticipants\nApplied\t120\nShortlisted\t48\nTook part\t32\nCompleted\t29',
          chartSource: 'Where these numbers came from, and what they are not. Replace this line — it prints under the chart and carries into the student handout.',
          progressive: true,
          notes: 'CHART — same pasted text a table takes. Twenty kinds, grouped in the picker by the question they answer rather than by what they look like: which is bigger, what is the trend, how does it divide up, where does it go.\n\nThese themes carry their own series colours, taken from the brand highlights and checked for contrast on both grounds. The source line under the chart is not optional furniture — it is the thing a reader needs a week later with nobody there to explain it.\n\nNo decorative object is drawn on a chart or a table slide, on purpose.' },

        { type: 'split', title: 'A hackathon, a study, a cohort',
          bullets: ['A date, a place, a name.', 'One more line if you need it.'],
          image: '', imageSide: 'left', imageFit: 'cover',
          notes: 'FEATURED CARD — a picture on one half, a lime panel with the copy on the other. This is the shape the Events page uses for the thing it wants looked at.\n\nAdd your photograph in the inspector. With the picture on the left the lockup moves to sit over it and switches to the positive version, because white lettering on lime is unreadable — that is handled for you.\n\nWith no image set this slide will look unfinished, which is the point: it is a template.' },

        { type: 'quote', body: 'A sentence worth the whole slide.',
          subtitle: 'Who said it',
          notes: 'QUOTE — body is the quotation, subtitle the attribution. If it runs past three lines it has stopped being a quote and wants to be a content slide.\n\nAlways attribute. An unattributed quotation on a slide is a claim with nobody behind it.' },

        { type: 'links', title: 'Where to go next',
          bullets: [
            'UKBT Institute\thttps://ukblacktech.com/ukbt-institute/',
            'A second link\thttps://example.org/'
          ],
          notes: 'LINKS — text before the tab is the label, after it the URL. In a live session these become tappable on learner phones, which is the only reliable way to hand a URL to a room.' },

        { type: 'content', title: 'Before you present this',
          bullets: [
            'Replace every placeholder\tIncluding this slide, which is a checklist for you and not for the room.',
            'Check the bottom of every slide\tLong tables and long card copy push content off the edge. Page through in Present mode once.',
            'Set the date\tOn the title slide, in the inspector. It prints as a small stamp under the subtitle.',
            'Say where numbers came from\tEvery chart has a source line. A figure you cannot evidence is worse than no figure.'
          ],
          notes: 'Delete this slide before presenting.\n\nRebuilding this template from the lesson picker always gives a clean copy, so nothing here is precious — edit it freely.' }
      ]
    },
    {
      key: 'ukbt-institute-townhouse',
      title: 'UKBT Institute — the Townhouse model',
      icon: '◈',
      blurb: 'The four-floor innovation model and its PRL gates, as a deck: twelve stakeholders on Floor 1, then experiment, build and scale. Content follows the model published on ukblacktech.com.',
      minutes: 45,
      theme: 'ukbt-institute',
      libraryGroup: 'ukbt-institute',
      kind: 'lecture',
      org: 'UKBT Institute',
      /* The official Institute lockup, from the organisation's own site. The
         brand deck could not supply it: there the mark is an image and the
         word INSTITUTE is a live text box beside it, so extracting the picture
         gets ❯UKBT and loses the word. */
      logo: 'assets/brand/ukbt-institute.svg',
      logoOn: 'all',
      logoSize: 'small',
      logoReverse: 'never',
      slides: [
        { type: 'title', title: 'The Townhouse',
          subtitle: 'A four-floor innovation model · UKBT Institute',
          notes: 'The deck follows the model published on ukblacktech.com/ukbt-institute — four floors, a Practitioner Readiness Level band on each, and a gate that has to be passed before anything climbs a storey.\n\nThe logo top right is the official Institute lockup. It is not the one in the brand deck: there the mark is a picture and the word INSTITUTE is a live text box under it, so extracting the picture would give ❯UKBT and lose the word.' },

        { type: 'quote', body: 'A townhouse for technologists, academics, professionals, and communities.',
          subtitle: 'UKBT Institute',
          notes: 'Why the metaphor earns its place: a townhouse has floors you climb in order, and you cannot be on the third without having been on the first. That is the whole argument — the model is a staircase with locked doors, not a set of parallel workstreams.' },

        { type: 'journey', title: 'Four floors, and you climb them in order',
          subtitle: 'Practitioner Readiness Level on each',
          bullets: [
            'Floor 1 · PRL 1–3\tCOLLABORATE. Knowledge transfer and discovery. All twelve stakeholders validate here.',
            'Floor 2 · PRL 4–6\tEXPERIMENT. Stress test and validate — cheaply, and before anything is built.',
            'Floor 3 · PRL 7\tBUILD. Practitioner-led, with academic research alongside it.',
            'Floor 4 · PRL 8–9\tSCALE. Growth, markets and ecosystem — in public.'
          ],
          progressive: true,
          notes: 'PRL is the Practitioner Readiness Level framework: the same idea as a technology readiness level, but the thing being measured is whether practitioners are ready to use it, not whether the technology works. Reveal a floor at a time; the order is the point and a room that sees all four at once reads them as options.' },

        { type: 'keyfact', title: 'The rule that makes Floor 1 different',
          subtitle: 'Floor 1 · COLLABORATE · gate score ≥ 60',
          body: '11 of 12 → proceed',
          bullets: [
            'All twelve stakeholders validate on this floor. No exceptions, no proxies.',
            'Any one of the twelve saying no pivots the project or kills it.',
            'The core rule is the shortest one in the model: never skip a voice.'
          ],
          progressive: true, buildMode: 'dim',
          notes: 'This is the slide to slow down on. Most innovation processes let a strong sponsor override a quiet objection; this one does not, and the cost of that is that Floor 1 takes longer than anyone wants it to. Say out loud that the gate is deliberately cheap to fail and expensive to skip.' },

        { type: 'keywords', title: 'The twelve voices · 1 to 6',
          bullets: [
            'Practitioners\tthe people who would live with it, daily',
            'Customers\tbudget authority — whoever can say yes to paying',
            'Academics\tresearch and evidence',
            'Supply chain\tsourcing and manufacturing — can it be made at all?',
            'Internal champions\torganisational advocates, inside the building',
            'Market\ttiming and competition'
          ],
          progressive: true,
          notes: 'Six here and six on the next slide — twelve on one slide is a list nobody reads. The questions Floor 1 asks them are blunt on purpose: do you face this daily, is it sector-wide, will you pay today, can we source it, is the timing right. "Let me think about it" counts as a no.' },

        { type: 'keywords', title: 'The twelve voices · 7 to 12',
          bullets: [
            'Budget holders\tfinance decision makers',
            'Finance / procurement\teconomic reality — what the process will allow',
            'Lawyers / regulatory\tcompliance and risk',
            'Technologists\timplementation',
            'Non-technologists\tnon-technical users, who are most of everybody',
            'Community\tthe community network around it'
          ],
          progressive: true,
          notes: 'The second six are the ones projects skip, and they are where projects die later: procurement, legal, and the non-technical majority. Naming them as voices rather than as approvals is the point — they are consulted at PRL 1, not presented to at PRL 7.' },

        { type: 'section', title: 'Up a floor\nat a time',
          subtitle: 'Three storeys left, and the gate gets harder on each.',
          notes: 'The one slide in this deck on the green. Use it as a real break — stop talking, let the room look up, then start on Floor 2. A section slide that goes past in two seconds is a slide you did not need.' },

        { type: 'content', title: 'Floor 2 · EXPERIMENT · PRL 4–6',
          bullets: [
            'Who is in the room\tPractitioners, supply chain, market, and non-technologists.',
            'Core rule\tTest simple before tech. Paper prototypes, a concierge MVP, no-code pilots.',
            'What counts as success\tRetention rather than clicks, willingness to pay, and whether it fits an existing workflow.',
            'What kills it\tA shrug. If nobody would fight to keep it, or it saves less than a couple of hours a week, it does not climb.'
          ],
          progressive: true, buildMode: 'dim',
          notes: 'Gate score to leave this floor: 80 out of 100. The cheapest floor and the one most often skipped, because building feels like progress and a paper prototype does not. The measure to defend here is retention: clicks are available early and mean nothing, and a pilot that people stop opening has answered the question.' },

        { type: 'content', title: 'Floor 3 · BUILD · PRL 7',
          bullets: [
            'Who is in the room\tInternal champions — the people who will have to defend it when you are not there.',
            'Core rule\tCo-create, don’t dictate. Champions co-own the roadmap.',
            'What counts as success\tThey use it daily and argue for it: three or more champions, a written case study, academic validation.',
            'What kills it\t"Nice to have." A champion who will not move a budget, or cannot recruit a peer, is not a champion.'
          ],
          progressive: true, buildMode: 'dim',
          notes: 'Gate score to leave this floor: 90 out of 100. The gate jumps from 80 to 90 here, and that is the moment the model gets expensive: this is the first floor where real engineering money is spent, so the bar for spending it is higher than the bar for testing.' },

        { type: 'content', title: 'Floor 4 · SCALE · PRL 8–9',
          bullets: [
            'Who is in the room\tCustomers, market, technologists, non-technologists, and the wider community.',
            'Core rule\tShare everything. Publish the learning, document the failures, keep the roadmap open.',
            'What counts as success\tOthers copy it, improve it or join in — and there is at least one paying customer.',
            'What kills it\tNo ecosystem effects. A product nobody recommends to a peer has not scaled, however many users it has.'
          ],
          progressive: true, buildMode: 'dim',
          notes: 'Gate: 90 out of 100 and 7% growth week on week — the only floor with a rate on it as well as a threshold. Note what building in public costs: documenting the failures is the part organisations quietly drop, and it is the part that makes the rest credible.' },

        { type: 'chart', chartKind: 'bar', title: 'The gate gets harder as you climb',
          body: 'Floor\tGate score\nFloor 1 · Collaborate\t60\nFloor 2 · Experiment\t80\nFloor 3 · Build\t90\nFloor 4 · Scale\t90',
          chartSource: 'Gate thresholds from the UKBT Institute four-floor innovation model, ukblacktech.com/ukbt-institute. Floor 4 also requires 7% week-on-week growth, which is not shown.',
          progressive: true,
          notes: 'Four numbers, and the shape is the argument: the model is cheap to enter and expensive to climb. The source line carries the thing the bars cannot — Floor 4 has a growth rate attached as well as a score, so its bar understates it.' },

        { type: 'cards', title: 'One rule per floor',
          bullets: [
            'Floor 1\tNever skip a voice.',
            'Floor 2\tTest simple before tech.',
            'Floor 3\tCo-create, don’t dictate.',
            'Floor 4\tShare everything.'
          ],
          progressive: true, buildMode: 'dim',
          notes: 'The summary slide, and the one worth photographing. Four rules, in order, each one the thing the floor beneath it earns the right to.' },

        { type: 'keywords', title: 'What a kill sounds like',
          bullets: [
            '“Let me think about it.”\tfloor 1 — not a yes. one no out of twelve stops it',
            '“Maybe” — or a shrug\tfloor 2 — nobody would fight to keep it',
            '“Nice to have.”\tfloor 3 — no champion will move a budget for it',
            'No paying customer\tfloor 4 — no ecosystem effect, referral under 30%'
          ],
          progressive: true,
          notes: 'Killing a project is the model working, not the model failing. Say that plainly — a framework whose gates never close is a framework nobody is using.' },

        { type: 'links', title: 'Where this comes from',
          bullets: [
            'UKBT Institute — the four-floor innovation model\thttps://ukblacktech.com/ukbt-institute/',
            'UK Black Tech\thttps://ukblacktech.com/'
          ],
          notes: 'Everything in this deck follows the model as published. If the framework moves, this is the page it moves on — check it before presenting, and edit the gate chart and the stakeholder table to match.' }
      ]
    },
    {
      key: 'ukbt-campaigns',
      title: 'UK Black Tech — the ask, in five slides',
      icon: '❯',
      blurb: 'Five slides to ask an organisation to back one campaign: who you reach, what you build, what you have already done, and the ask. Figures are UK Black Tech’s own — check them before you pitch.',
      minutes: 10,
      theme: 'ukbt',
      libraryGroup: 'ukbt',
      kind: 'lecture',
      org: 'UK Black Tech',
      logo: 'assets/brand/ukbt-wordmark.png',
      logoOn: 'all',
      logoSize: 'small',
      /* The artwork is already the reversed lockup — white UK and Tech, the
         green chevron, Black knocked out of a white panel. Never invert it. */
      logoReverse: 'never',
      slides: [
        { type: 'title', title: 'Partner with\nUK Black Tech',
          subtitle: 'Reach, reputation, and a pipeline that lasts',
          notes: 'Five slides on purpose. A sponsorship conversation is not a lecture — the deck exists to hold four facts still while you talk, and to leave something behind that survives being forwarded.' },

        { type: 'keyfact', title: 'Who you would be reaching',
          subtitle: 'Combined reach across the UK Black Tech platform',
          body: '20,000 tech professionals',
          bullets: [
            '60% of the community identifies as women.',
            '35% of the audience is under 25.',
            'Partners already include Global Tech Advocates, UAL Creative Computing Institute, Southwark Council and Capital City College.'
          ],
          progressive: true, buildMode: 'dim',
          notes: 'Figures as published on ukblacktech.com. Say the number, then stop talking — the two lines under it are what make it different from every other reach figure in the room, and they land better if the room reads them itself. Check the figures are current before you pitch; a number that has moved is worse than no number.' },

        { type: 'cards', title: 'What your money would be building',
          bullets: [
            'Smart Cities & Infrastructure\tRobotics, automation and intelligent infrastructure — for communities that are smarter, safer and more sustainable.',
            'Cyber & Digital Trust\tSecure, resilient and trusted digital technology, protecting people, organisations and critical infrastructure.',
            'Living in a Digital World\tInclusive, accessible, human-centred design, so that everyone can take part in a connected world.'
          ],
          progressive: true, buildMode: 'dim',
          notes: 'The three active campaigns. Name the one that fits the organisation you are sitting in front of and spend your time there — a sponsor backs a thing, not a portfolio. Reveal one at a time so the room is not reading ahead while you talk.' },

        { type: 'cards', title: 'What we have already done',
          bullets: [
            '16 courses\tDigital courses built with Tech Mums, FutureLearn and the University of Leeds.',
            '1 hackathon\tA Sickle Cell Hackathon at the Design Museum — doctors, data scientists, patients and developers in one room.',
            '5 institutions\tWorking partnerships, including the Computer Science department at London South Bank University.'
          ],
          notes: 'Track record, not ambition. This is the slide that answers the question nobody asks out loud, which is whether the last sponsor got anything for their money. Keep it to things that have finished.' },

        { type: 'content', title: 'The ask',
          bullets: [
            'Name a campaign\tBack one of the three for a year, and your name is on everything it produces.',
            'Fund the room\tVenue, facilitation and the practitioner time that turns an event into a case study somebody can cite.',
            'Open a door\tMentors, placements and a route into hiring — the part money on its own does not buy.'
          ],
          progressive: true,
          notes: 'Finish with one ask, not three. Decide before you walk in which of these you are actually asking this organisation for, and delete the other two — a menu invites a room to choose the cheapest item on it.\n\nIf you price your tiers, add a table slide after this one; the figures are not in this deck because they should not be guessed.' }
      ]
    },
    {
      "key": "pace-nul",
      "title": "NUL · Openers, breakaways & a layout range",
      "icon": "▣",
      "blurb": "One interpretation of academic presentation: bold openings, evidence, comparisons and pauses. Reuse the structures with any theme.",
      "minutes": 12,
      "theme": "northeastern",
      "libraryGroup": "nul",
      "kind": "template",
      "org": "Northeastern University London",
      "logo": "assets/brand/nu-london-logo.png",
      "logoOn": "all",
      "logoSize": "small",
      "slides": [
        {
          "type": "title",
          "title": "See the\nargument.",
          "subtitle": "An academic presentation gallery / Northeastern University London",
          "design": {
            "composition": "sidecar"
          },
          "notes": "Reusable opening composition. Change the subject and supporting line. Look → Composition changes the arrangement independently of the theme."
        },
        {
          "type": "image",
          "title": "One claim on a photograph",
          "image": "assets/lesson/ipdv/qa-london-night-1.jpg",
          "imageFit": "cover",
          "design": {
            "capStyle": "scrim",
            "capPos": "bottom",
            "imageMotion": "zoom",
            "logoGround": "dark"
          },
          "notes": "OPENER — full-bleed image. The picture is the mood; the caption is the claim. Scrim keeps the words readable."
        },
        {
          "type": "introduction",
          "title": "Your name",
          "subtitle": "Role · Northeastern University London",
          "body": "Replace this with who is standing at the front, and why this room should listen.",
          "notes": "OPENER — introduction. Once per cohort, not every week."
        },
        {
          "type": "section",
          "title": "Ask a better\nquestion.",
          "subtitle": "Choose the evidence that would answer it.",
          "design": {
            "composition": "editorial"
          },
          "notes": "A chapter break signals a change in the argument. This is one available structure, not a rule for every deck."
        },
        {
          "type": "content",
          "title": "What does the evidence need to show?",
          "bullets": [
            "A pattern that a summary can hide.",
            "A comparison made on the same terms.",
            "A limitation that changes the conclusion."
          ],
          "design": {
            "composition": "columns"
          },
          "notes": "Keep the headings and supporting points editable. Choose Side heading for a single argument, or Columns for parallel ideas. These are examples, not limits on your content."
        },
        {
          "type": "section",
          "title": "Follow the\nevidence.",
          "subtitle": "Let the information determine its form.",
          "design": {
            "composition": "frame"
          },
          "notes": "A quieter framed section offers an alternative to a full-bleed break."
        },
        {
          "type": "split",
          "title": "Say it. Show it.",
          "bullets": [
            "Left: the claim in words.",
            "Right: the picture that proves or frames it.",
            "Build the bullets if you want the eye to wait."
          ],
          "image": "assets/lesson/ipdv/snow-cholera-map-1854.jpg",
          "imageFit": "cover",
          "design": {
            "mediaGround": "full"
          },
          "progressive": true,
          "notes": "VARIATION — dual coding. Image + text after a breakaway keeps the chapter from feeling like another bullet wall."
        },
        {
          "type": "quote",
          "body": "Choose the form that helps the audience examine the idea.",
          "subtitle": "A design principle to apply, not a fixed slide formula",
          "design": {
            "composition": "editorial"
          },
          "notes": "Original gallery copy. This is not an attributed quotation."
        },
        {
          "type": "content",
          "title": "Leave a useful next step.",
          "bullets": [
            "State what the evidence supports.",
            "Make the remaining uncertainty visible.",
            "Name the question to investigate next."
          ],
          "design": {
            "composition": "rail"
          },
          "notes": "Keep the headings and supporting points editable. Choose Side heading for a single argument, or Columns for parallel ideas. These are examples, not limits on your content."
        },
        {
          "type": "journey",
          "title": "The arc of this hour",
          "subtitle": "Reveal each beat as you go",
          "bullets": [
            "Open\tTitle or image that states the stake.",
            "Break\tSection — Part one.",
            "Build\tCards, split, keywords — the work.",
            "Break\tSection — Part two.",
            "Close\tFact, quote, or photograph."
          ],
          "progressive": true,
          "notes": "VARIATION — journey. Meta: this slide is the map of the gallery itself. Replace milestones with your session outline."
        },
        {
          "type": "image",
          "title": "Leave them with a picture",
          "image": "assets/brand/nu-london-skyline.png",
          "imageFit": "cover",
          "design": {
            "capStyle": "scrim",
            "capPos": "bottom",
            "logoGround": "dark"
          },
          "notes": "CLOSER — image. Same tool as the opener, different job: end on atmosphere and one line, not another bullet list."
        }
      ]
    },
    {
      key: 'pace-studio',
      title: 'Studio sage · Openers, breakaways & a layout range',
      icon: '✳',
      blurb: 'Sage & ink look: curious title art, lilac section breaks, then a run of different teaching layouts. Same pacing idea as the NUL gallery — different skin.',
      minutes: 12,
      theme: 'studio',
      slides: [
        {
          type: 'title',
          title: 'Make space\nfor a pause.',
          subtitle: 'A pacing gallery · Studio sage',
          notes: 'OPENER — title. Studio hangs its own abstract art behind the pad. Word-leading: short lines, big type.'
        },
        {
          type: 'quote',
          body: 'Start with a sentence the room can repeat.',
          subtitle: 'Then earn the bullets.',
          notes: 'OPENER — quote as a soft first beat when you do not want a photograph.'
        },
        {
          type: 'section',
          title: 'First chapter',
          subtitle: 'Breakaway — lilac ground, look up.',
          notes: 'BREAKAWAY — section. In Studio this is the lilac full-bleed. Same job as NUL red: cut the hour into chapters.'
        },
        {
          type: 'content',
          title: 'Teach one move in this chapter',
          bullets: [
            'One claim the chapter is for.',
            'One example that makes it concrete.\tKeep the second half after the tab short.',
            'One check: ask the room before you go on.'
          ],
          progressive: true,
          buildMode: 'dim',
          notes: 'CONTENT — bullets with Build on Next (dim). Meat after the first breakaway.'
        },
        {
          type: 'keywords',
          title: 'Name the vocabulary',
          bullets: [
            'Opener\tTitle, image claim, introduction, or quote.',
            'Breakaway\tSection slide — a breath between blocks.',
            'Variation\tCards, split, journey, mind map — change the shape of the argument.'
          ],
          progressive: true,
          notes: 'VARIATION — keywords. Term / definition rows after content, still inside chapter one.'
        },
        {
          type: 'section',
          title: 'Second chapter',
          subtitle: 'Break again before you change shape.',
          notes: 'BREAKAWAY — second section. Advance only when you are ready to change the kind of work the room is doing.'
        },
        {
          type: 'mindmap',
          title: 'What this chapter hangs on',
          bullets: [
            'Perception\tWhat they notice first.',
            'Encoding\tHow the idea is shown.',
            'Talk\tWhat they say out loud.',
            'Check\tHow you know it landed.'
          ],
          progressive: true,
          notes: 'VARIATION — mind map. Sibling ideas, no forced order — different from journey.'
        },
        {
          type: 'cards',
          title: 'Three finishes for a chapter',
          bullets: [
            'A key fact they can quote.',
            'A photograph with one line.',
            'A short poll or scale in the rail.'
          ],
          notes: 'VARIATION — cards. Numbered ideas; good before a closer.'
        },
        {
          type: 'italics',
          title: 'Phrases worth hearing twice',
          bullets: [
            'open hard\tSpend the first slide on the stake, not the agenda.',
            'break often\tSection slides are the cut, not the decoration.',
            'change the shape\tWhen the chapter changes, change the layout.'
          ],
          progressive: true,
          notes: 'VARIATION — italics. Phrase + gloss. Teaching voice rather than vocabulary.'
        },
        {
          type: 'section',
          title: 'Close',
          subtitle: 'One last breakaway — then send them out.',
          notes: 'BREAKAWAY into the close. Optional; some rooms prefer to land on a keyfact or links instead.'
        },
        {
          type: 'links',
          title: 'Take these with you',
          bullets: [
            'Munzner — Visualization Analysis and Design\thttps://www.cs.ubc.ca/~tmm/vadbook/',
            'FT Visual Vocabulary\thttps://github.com/Financial-Times/chart-doctor',
            'Your module space\thttps://example.com/replace-me'
          ],
          notes: 'CLOSER — links. Practical hand-off. Replace the third row with your Canvas / module URL.'
        }
      ]
    },

    /* ------------------------------------------------------------------
       Five trendy skins — five slides each, image slots as placeholders.
       Drop your own photographs in the inspector (same habit as NUL decks,
       without shipping course assets into a design template).
       ------------------------------------------------------------------ */
    {
      "key": "vibe-product",
      "title": "Product · Clear ideas, confident delivery",
      "icon": "◇",
      "blurb": "A complete product proposal: bold opener, problem, process, comparison, trial measures and a clear decision. Every element is editable.",
      "minutes": 5,
      "theme": "product",
      "slides": [
        {
          "type": "title",
          "title": "A place for\nyour next idea.",
          "subtitle": "FIELDNOTES / A fictional product proposal",
          "design": {
            "composition": "poster"
          },
          "notes": "Reusable opening composition. Change the subject and supporting line. Look → Composition changes the arrangement independently of the theme."
        },
        {
          "type": "content",
          "title": "Good ideas arrive out of order.",
          "bullets": [
            "Capture a thought before choosing a folder.",
            "Connect related notes when the pattern becomes clear.",
            "Return to the next action without rereading everything."
          ],
          "design": {
            "composition": "rail"
          },
          "notes": "Keep the headings and supporting points editable. Choose Side heading for a single argument, or Columns for parallel ideas. These are examples, not limits on your content."
        },
        {
          "type": "journey",
          "journeyMode": "stepper",
          "title": "From a thought to a next step",
          "bullets": [
            "Capture\tSave a sentence, sketch or voice note.",
            "Connect\tBring related ideas together.",
            "Act\tChoose what to do next."
          ],
          "notes": "A three-stage process with a clear reading direction. Replace the stages, not the entire design."
        },
        {
          "type": "compare",
          "title": "Two ways to organise a thought",
          "subtitle": "Folders first | Capture first",
          "bullets": [
            "Starting\tChoose a location\tWrite the thought",
            "Organising\tFile immediately\tGroup when useful",
            "Returning\tFind the folder\tFollow a connection"
          ],
          "notes": "Illustrative product comparison, not research findings. Keep each row about the same dimension."
        },
        {
          "type": "content",
          "title": "What a pilot should answer",
          "bullets": [
            "Can someone capture a note without guidance?",
            "Can they find it again the next day?",
            "Does the next action feel obvious?"
          ],
          "design": {
            "composition": "columns"
          },
          "notes": "Keep the headings and supporting points editable. Choose Side heading for a single argument, or Columns for parallel ideas. These are examples, not limits on your content."
        },
        {
          "type": "statement",
          "body": "Test the first minute.",
          "subtitle": "Prototype the smallest useful experience.",
          "design": {
            "composition": "frame"
          },
          "notes": "A pause in the argument. A short statement lets the room absorb the idea. Animation is optional; this composition works as a still."
        },
        {
          "type": "keyfact",
          "title": "The next decision",
          "subtitle": "Proposed pilot",
          "body": "Try it with five people.",
          "bullets": [
            "Observe a real note-taking task.",
            "Revise the flow before adding features."
          ],
          "notes": "Five is an illustrative pilot proposal, not a universal sample-size rule."
        }
      ]
    },
    {
      "key": "vibe-editorial",
      "title": "Editorial · A story with room to breathe",
      "icon": "¶",
      "blurb": "A complete neighbourhood proposal with an offset opener, image, argument, timeline and closing thought. Warm paper and confident serif type.",
      "minutes": 5,
      "theme": "editorial",
      "slides": [
        {
          "type": "title",
          "title": "A little room\nto pause.",
          "subtitle": "A pocket-garden proposal / Illustrative brief",
          "design": {
            "composition": "editorial"
          },
          "notes": "Reusable opening composition. Change the subject and supporting line. Look → Composition changes the arrangement independently of the theme."
        },
        {
          "type": "image",
          "title": "Find a pause in the city",
          "image": "assets/lesson/ipdv/qa-london-night-2.png",
          "imageFit": "cover",
          "design": {
            "capStyle": "scrim",
            "capPos": "bottom"
          },
          "notes": "Atmospheric city image from the existing asset library. It is not evidence of a particular proposed site. Replace with a photograph of your own location."
        },
        {
          "type": "content",
          "title": "Start with the people who use it.",
          "bullets": [
            "Ask when the space feels welcoming.",
            "Notice where people already stop.",
            "Include people who pass through without staying."
          ],
          "design": {
            "composition": "rail"
          },
          "notes": "Keep the headings and supporting points editable. Choose Side heading for a single argument, or Columns for parallel ideas. These are examples, not limits on your content."
        },
        {
          "type": "timeline",
          "title": "A proposal that can change",
          "bullets": [
            "Listen\tWalk the site\tRecord access needs and different uses.",
            "Try\tTest a temporary layout\tMove seats before fixing them in place.",
            "Learn\tReturn and observe\tKeep what helps; adapt what does not."
          ],
          "design": {
            "timelineMode": "vertical"
          },
          "notes": "An illustrative project sequence. The labels are phases, not measured dates."
        },
        {
          "type": "quote",
          "body": "A useful place gives people a reason to stay.",
          "subtitle": "A principle to test with the neighbourhood",
          "design": {
            "composition": "frame"
          },
          "notes": "Original example copy, not a quotation attributed to a real person."
        },
        {
          "type": "content",
          "title": "Three questions for the review",
          "bullets": [
            "Who can reach and use the space?",
            "What makes it comfortable to stay?",
            "Who will look after it?"
          ],
          "design": {
            "composition": "columns"
          },
          "notes": "Keep the headings and supporting points editable. Choose Side heading for a single argument, or Columns for parallel ideas. These are examples, not limits on your content."
        },
        {
          "type": "statement",
          "body": "Leave room\nfor the neighbourhood.",
          "subtitle": "Agree the next trial together.",
          "design": {
            "composition": "editorial"
          },
          "notes": "A pause in the argument. A short statement lets the room absorb the idea. Animation is optional; this composition works as a still."
        }
      ]
    },
    {
      "key": "vibe-cinematic",
      "title": "Cinematic · Build anticipation, reveal the idea",
      "icon": "▣",
      "blurb": "A complete evening-library concept with dark contrast, a moving image, a deliberate reveal and an explicit decision. Motion has a job.",
      "minutes": 5,
      "theme": "cinematic",
      "slides": [
        {
          "type": "title",
          "title": "The library.\nAfter hours.",
          "subtitle": "An illustrative proposal for an evening programme",
          "design": {
            "composition": "poster"
          },
          "notes": "Reusable opening composition. Change the subject and supporting line. Look → Composition changes the arrangement independently of the theme."
        },
        {
          "type": "video",
          "title": "A different pace",
          "subtitle": "A quieter place to work, meet and make.",
          "video": "assets/backdrop/ink-drift.mp4",
          "videoPoster": "assets/backdrop/ink-drift-poster.jpg",
          "videoLoop": true,
          "videoMuted": true,
          "videoAutoplay": true,
          "design": {
            "capStyle": "scrim"
          },
          "notes": "Local abstract backdrop, not footage of a real library. Keep movement away from the reading area. The poster remains useful without playback."
        },
        {
          "type": "content",
          "title": "One building.\nSeveral reasons to stay.",
          "bullets": [
            "A quiet table for focused work.",
            "A shared space for a small workshop.",
            "A welcoming place to meet a neighbour."
          ],
          "design": {
            "composition": "columns"
          },
          "notes": "Keep the headings and supporting points editable. Choose Side heading for a single argument, or Columns for parallel ideas. These are examples, not limits on your content."
        },
        {
          "type": "compare",
          "title": "Design the evening around choice",
          "subtitle": "Focused work | Shared activity",
          "bullets": [
            "Sound\tQuiet zone\tConversation welcome",
            "Furniture\tIndividual desks\tFlexible tables",
            "Support\tHelp when requested\tA visible facilitator"
          ],
          "notes": "Use the comparison to explain a spatial distinction, not a competition between two valid uses."
        },
        {
          "type": "statement",
          "body": "Make the invitation clear.",
          "subtitle": "Show people what they can do when they arrive.",
          "design": {
            "composition": "frame"
          },
          "notes": "A pause in the argument. A short statement lets the room absorb the idea. Animation is optional; this composition works as a still."
        },
        {
          "type": "content",
          "title": "Before the first evening",
          "bullets": [
            "Confirm staffing and access arrangements.",
            "Tell visitors which spaces are open.",
            "Choose how to collect feedback."
          ],
          "design": {
            "composition": "rail"
          },
          "notes": "Keep the headings and supporting points editable. Choose Side heading for a single argument, or Columns for parallel ideas. These are examples, not limits on your content."
        },
        {
          "type": "title",
          "title": "Start with\none evening.",
          "subtitle": "Agree a pilot, observe it, and decide what to change.",
          "design": {
            "composition": "sidecar"
          },
          "notes": "Reusable opening composition. Change the subject and supporting line. Look → Composition changes the arrangement independently of the theme."
        }
      ]
    },
    {
      "key": "vibe-studio-teach",
      "title": "Studio teach · Ask, explore, reflect",
      "icon": "✳",
      "blurb": "A complete short lesson: opening question, a learner response, practical steps, a worked example and reflection. No photo placeholders.",
      "minutes": 8,
      "theme": "studio",
      "slides": [
        {
          "type": "title",
          "title": "Make space\nto think.",
          "subtitle": "A short lesson on starting a difficult task",
          "design": {
            "composition": "poster"
          },
          "notes": "Reusable opening composition. Change the subject and supporting line. Look → Composition changes the arrangement independently of the theme."
        },
        {
          "type": "statement",
          "body": "What makes starting difficult?",
          "subtitle": "Think first. Then offer one word.",
          "design": {
            "composition": "frame"
          },
          "feedback": {
            "kind": "wordcloud",
            "prompt": "What makes starting difficult?",
            "options": [],
            "max": 1
          },
          "notes": "Invite an answer without asking learners to disclose private circumstances. A spoken response works too."
        },
        {
          "type": "journey",
          "journeyMode": "stepper",
          "title": "Try a smaller start",
          "bullets": [
            "Notice\tName what is getting in the way.",
            "Choose\tPick one manageable next step.",
            "Review\tPause and check whether it helped."
          ],
          "progressive": true,
          "buildMode": "dim",
          "notes": "Reveal one stage at a time. Earlier stages remain available as context."
        },
        {
          "type": "compare",
          "title": "Make the next step visible",
          "subtitle": "A broad intention | A concrete start",
          "bullets": [
            "Writing\tFinish my essay\tDraft one opening sentence",
            "Revision\tLearn the topic\tExplain one concept aloud",
            "Planning\tSort everything out\tList the next three tasks"
          ],
          "notes": "Worked examples for discussion. Invite a different concrete start if it suits the learner better."
        },
        {
          "type": "content",
          "title": "Choose your next move",
          "bullets": [
            "Name one task you want to begin.",
            "Make the first step smaller.",
            "Tell a partner how you will know you have started."
          ],
          "design": {
            "composition": "rail"
          },
          "notes": "Keep the headings and supporting points editable. Choose Side heading for a single argument, or Columns for parallel ideas. These are examples, not limits on your content."
        },
        {
          "type": "statement",
          "body": "What will you try first?",
          "subtitle": "Choose one move for your next task.",
          "design": {
            "composition": "editorial"
          },
          "feedback": {
            "kind": "poll",
            "prompt": "Which move will you try first?",
            "options": [
              "Name the obstacle",
              "Choose a smaller step",
              "Pause and review"
            ],
            "max": 1
          },
          "notes": "The poll records a preference, not a right answer."
        },
        {
          "type": "statement",
          "body": "A useful start\nis one you can take.",
          "subtitle": "Write your first step before you leave.",
          "design": {
            "composition": "frame"
          },
          "notes": "A pause in the argument. A short statement lets the room absorb the idea. Animation is optional; this composition works as a still."
        }
      ]
    },
    {
      "key": "vibe-brutal",
      "title": "Brutal · Make the mechanism visible",
      "icon": "▮",
      "blurb": "A complete technical release review: constraints, a process, comparison, checks and a decision. Strong rules and mono type; no invented performance claims.",
      "minutes": 5,
      "theme": "brutal",
      "slides": [
        {
          "type": "title",
          "title": "READY\nTO RELEASE?",
          "subtitle": "An illustrative engineering review",
          "design": {
            "composition": "editorial"
          },
          "notes": "Reusable opening composition. Change the subject and supporting line. Look → Composition changes the arrangement independently of the theme."
        },
        {
          "type": "content",
          "title": "Define the boundary.",
          "bullets": [
            "State what this release changes.",
            "Name the systems it touches.",
            "Identify what must remain compatible."
          ],
          "design": {
            "composition": "rail"
          },
          "notes": "Keep the headings and supporting points editable. Choose Side heading for a single argument, or Columns for parallel ideas. These are examples, not limits on your content."
        },
        {
          "type": "journey",
          "journeyMode": "stepper",
          "title": "A release with checkpoints",
          "bullets": [
            "Build\tProduce a versioned artifact.",
            "Verify\tCheck the agreed behaviours.",
            "Release\tObserve the result and retain a rollback path."
          ],
          "notes": "Illustrative workflow. Replace with the release process used by your team."
        },
        {
          "type": "compare",
          "title": "A claim needs a check",
          "subtitle": "Claim | Review evidence",
          "bullets": [
            "Compatible\tExisting clients still work\tContract checks",
            "Observable\tFailures can be located\tLogs and alert rehearsal",
            "Reversible\tThe change can be undone\tRollback rehearsal"
          ],
          "notes": "These are example review criteria, not a claim that a particular system has passed them."
        },
        {
          "type": "content",
          "title": "Before the decision",
          "bullets": [
            "One owner for the release.",
            "One place to see the result.",
            "One agreed reason to roll back."
          ],
          "design": {
            "composition": "columns"
          },
          "notes": "Keep the headings and supporting points editable. Choose Side heading for a single argument, or Columns for parallel ideas. These are examples, not limits on your content."
        },
        {
          "type": "statement",
          "body": "What would stop\nthis release?",
          "subtitle": "Name the condition before deploying.",
          "design": {
            "composition": "frame"
          },
          "notes": "Use as a discussion pause. The question should be answered before the decision slide."
        },
        {
          "type": "title",
          "title": "DECIDE.\nRECORD.",
          "subtitle": "Release, revise or hold. Capture the reason and the next owner.",
          "design": {
            "composition": "sidecar"
          },
          "notes": "Reusable opening composition. Change the subject and supporting line. Look → Composition changes the arrangement independently of the theme."
        }
      ]
    },

    /* ------------------------------------------------------------------
       Motion lab — every moving part once, in the order they were built, with
       the near-identical settings put side by side. The three word-speed
       slides exist because a teacher asked "are these the same?" about Gentle
       and Quick, and the answer on one slide is easy to miss and obvious on
       three in a row. Nothing here is a lesson; it is a specimen sheet.
       ------------------------------------------------------------------ */
    {
      "key": "motion-lab",
      "title": "Motion lab — everything that moves, once each",
      "icon": "◈",
      "blurb": "A guided motion catalogue: direct attention, reveal a sequence, preserve context, then choose when to stay still. Includes matched speed comparisons and copying guidance.",
      "minutes": 12,
      "theme": "cinematic",
      "libraryGroup": "other",
      "kind": "template",
      "slides": [
        {
          "type": "statement",
          "body": "Direct\nattention.",
          "subtitle": "Motion Lab / Movement with a purpose",
          "design": {
            "composition": "poster",
            "words": "rise",
            "wordSpeed": "medium",
            "wordStagger": "wave"
          },
          "notes": "Opening: one entrance, then rest. Motion should help the room locate, follow or connect information. Use the later looping example for waiting screens."
        },
        {
          "type": "statement",
          "body": "Give the idea room",
          "subtitle": "A gentle background supports the opening",
          "design": {
            "backdrop": "drift",
            "words": "rise",
            "wordStagger": "wave",
            "composition": "editorial"
          },
          "notes": "The same layout with more to say: the band steps the type down from 320 to 140px on its own. Backdrop: Drift — the blobs are this theme’s accent at low alpha, so the same slide in the paper theme is a pale wash rather than a glow.\n\nWords: Rise, Medium, Wave. This is the default pairing."
        },
        {
          "type": "statement",
          "body": "Give the idea room",
          "design": {
            "composition": "frame",
            "words": "rise",
            "wordSpeed": "gentle",
            "wordStagger": "wave"
          },
          "notes": "Matched comparison: the wording, composition and effect stay the same. Only speed changes. Copy the slide and replace the phrase; keep the movement only if it helps your delivery.",
          "subtitle": "Gentle / reflective opening"
        },
        {
          "type": "statement",
          "body": "Give the idea room",
          "design": {
            "composition": "frame",
            "words": "rise",
            "wordSpeed": "medium",
            "wordStagger": "wave"
          },
          "notes": "Matched comparison: the wording, composition and effect stay the same. Only speed changes. Copy the slide and replace the phrase; keep the movement only if it helps your delivery.",
          "subtitle": "Medium / everyday delivery"
        },
        {
          "type": "statement",
          "body": "Give the idea room",
          "design": {
            "composition": "frame",
            "words": "rise",
            "wordSpeed": "quick",
            "wordStagger": "wave"
          },
          "notes": "Matched comparison: the wording, composition and effect stay the same. Only speed changes. Copy the slide and replace the phrase; keep the movement only if it helps your delivery.",
          "subtitle": "Quick / a short emphasis"
        },
        {
          "type": "statement",
          "body": "Give the idea room",
          "design": {
            "words": "fade",
            "wordStagger": "together",
            "composition": "frame"
          },
          "notes": "SPACING 1 of 2 — Together: every word carries the same delay of nothing, so the line arrives as a single movement. Effect here is Fade, so the only thing being demonstrated is the spacing.",
          "subtitle": "Together / read the phrase as a whole"
        },
        {
          "type": "statement",
          "body": "Give the idea room",
          "design": {
            "words": "fade",
            "wordStagger": "one",
            "composition": "frame"
          },
          "notes": "SPACING 2 of 2 — One at a time: two and a half times the wave, which on six words is over a second and a half from first to last. Same Fade effect as the slide before; only the spacing changed.",
          "subtitle": "One at a time / follow the sequence"
        },
        {
          "type": "statement",
          "body": "From the middle, opening outwards",
          "design": {
            "words": "rise",
            "wordStagger": "one",
            "wordFrom": "center",
            "composition": "frame"
          },
          "notes": "WAVE STARTS: the middle. Same spacing as the slide before — what changed is the order: the centre word leads and the wave opens to both ends at once (1625, 1271, 0, 1271, 1625 in milliseconds).\n\nIt reads as a phrase opening rather than a line being typed, which suits a statement that is one idea. First word and Last word are the other two."
        },
        {
          "type": "statement",
          "body": "Let the next idea appear",
          "design": {
            "backdrop": "grid",
            "words": "reveal",
            "wordSpeed": "medium",
            "wordStagger": "wave",
            "composition": "editorial"
          },
          "notes": "The third effect: Reveal, a clip-path wipe rather than a move. Backdrop: Grid — a ruled plane travelling exactly one cell per loop, which is the same picture again, so it never cuts.",
          "subtitle": "Reveal / a clean entrance"
        },
        {
          "type": "statement",
          "body": "We will begin shortly",
          "subtitle": "Loop / for a waiting screen",
          "design": {
            "backdrop": "drift",
            "words": "rise",
            "wordSpeed": "medium",
            "wordStagger": "wave",
            "wordsLoop": true,
            "composition": "frame"
          },
          "notes": "AND LEAVE AGAIN — the loop. Seven seconds: in for the first tenth, held for half, then nearly two seconds of the same eased wave taking them out, and a pause before it comes round. Stay here and watch it twice."
        },
        {
          "type": "statement",
          "body": "Every word lands, and settles",
          "subtitle": "Bounce",
          "design": {
            "words": "rise",
            "wordSpeed": "gentle",
            "wordPlan": {
              "text": "Every word lands, and settles",
              "unit": "word",
              "note": "Weight arriving, one word at a time",
              "words": [
                {
                  "dy": -2.2,
                  "blur": 3,
                  "delay": 0,
                  "arc": "bounce"
                },
                {
                  "dy": -1.8,
                  "blur": 3,
                  "delay": 220,
                  "arc": "bounce"
                },
                {
                  "dy": -2.4,
                  "blur": 4,
                  "delay": 440,
                  "arc": "bounce"
                },
                {
                  "dy": -1.4,
                  "blur": 2,
                  "delay": 660,
                  "arc": "bounce"
                },
                {
                  "dy": -2,
                  "blur": 3,
                  "delay": 880,
                  "arc": "bounce"
                }
              ]
            },
            "composition": "frame"
          },
          "notes": "ARC 1 of 3 — Bounce. Each word falls from above and goes PAST its resting place before coming back: out about 45px, back, out again smaller, then still. Measured, not approximated — the overshoot is a fraction of that word’s own drop, so the word that fell furthest bounces hardest.\n\nWhy it is not a preset: a start position eased to rest can only ever settle. The arc is a different keyframe set, chosen per word, which is why one word in a line can land like this while the rest do not."
        },
        {
          "type": "statement",
          "body": "Out of the fog, slowly",
          "subtitle": "Mist",
          "design": {
            "backdrop": "drift",
            "words": "rise",
            "wordSpeed": "gentle",
            "wordPlan": {
              "text": "Out of the fog, slowly",
              "unit": "word",
              "note": "Resolving rather than arriving",
              "words": [
                {
                  "dy": 0.6,
                  "scale": 1.15,
                  "blur": 13,
                  "delay": 0,
                  "arc": "mist"
                },
                {
                  "dy": 0.5,
                  "scale": 1.1,
                  "blur": 12,
                  "delay": 350,
                  "arc": "mist"
                },
                {
                  "dy": 0.6,
                  "scale": 1.12,
                  "blur": 14,
                  "delay": 700,
                  "arc": "mist"
                },
                {
                  "dy": 0.4,
                  "scale": 1.08,
                  "blur": 11,
                  "delay": 1050,
                  "arc": "mist"
                },
                {
                  "dy": 0.7,
                  "scale": 1.2,
                  "blur": 14,
                  "delay": 1400,
                  "arc": "mist"
                }
              ]
            },
            "composition": "frame"
          },
          "notes": "ARC 2 of 3 — Mist. The difference from a normal arrival is which property finishes last. These words are in position about half way through and still 50% out of focus; the rest of the time is spent condensing, which is what reads as coming out of fog rather than flying in slightly soft.\n\nThe arc supplies its own blur floor, so asking for mist without setting a blur still mists."
        },
        {
          "type": "statement",
          "body": "Charts lie",
          "subtitle": "Letter by letter",
          "design": {
            "words": "rise",
            "wordSpeed": "quick",
            "wordPlan": {
              "text": "Charts lie",
              "unit": "letter",
              "note": "Typed out, one letter at a time",
              "words": [
                {
                  "dy": -0.25,
                  "blur": 2,
                  "delay": 0
                },
                {
                  "dy": -0.25,
                  "blur": 2,
                  "delay": 90
                },
                {
                  "dy": -0.25,
                  "blur": 2,
                  "delay": 180
                },
                {
                  "dy": -0.25,
                  "blur": 2,
                  "delay": 270
                },
                {
                  "dy": -0.25,
                  "blur": 2,
                  "delay": 360
                },
                {
                  "dy": -0.25,
                  "blur": 2,
                  "delay": 450
                },
                {
                  "dy": -0.25,
                  "blur": 2,
                  "delay": 600
                },
                {
                  "dy": -0.25,
                  "blur": 2,
                  "delay": 690
                },
                {
                  "dy": -0.25,
                  "blur": 2,
                  "delay": 780
                }
              ]
            },
            "composition": "frame"
          },
          "notes": "ARC 3 of 3 — the unit itself. Nine steps for nine letters: the line is split by letter instead of by word, and each letter gets its own coordinates. The gap after \"Charts\" is the word break — 150ms rather than 90.\n\nEach word is still one box, so the line can never break down the middle of a word. And the split is hidden from the accessibility tree with the sentence handed back whole underneath, because nineteen one-character elements are otherwise read out as \"C h a r t s l i e\". Thirty animated letters is the ceiling; past that it falls back to whole words."
        },
        {
          "type": "image",
          "title": "Guide the eye through the image",
          "subtitle": "Travel between two chosen points",
          "image": "assets/lesson/ipdv/qa-london-night-1.jpg",
          "imageFit": "cover",
          "design": {
            "imageMotion": "travel",
            "focalX": 14,
            "focalY": 18,
            "focalX2": 86,
            "focalY2": 80,
            "imageTravelSecs": 12,
            "capStyle": "scrim"
          },
          "notes": "Image motion: Travel. Pick a start point, an end point and a duration. This example uses a city photograph. Keep a chart still if the audience needs to compare values across it. Reduced-motion users receive a still image."
        },
        {
          "type": "chart",
          "chartKind": "bar",
          "title": "A chart walked category by category",
          "body": "Year\tHires\n2018\t10567540\n2019\t10424955\n2020\t10434167\n2021\t10941264\n2022\t11505872\n2023\t8531168",
          "chartSource": "Every Santander Cycle hire, 2018–2023 · TfL, London Datastore",
          "callouts": [
            {
              "label": "2020",
              "note": "Lockdown year — and the annual total barely moved."
            },
            {
              "label": "2023",
              "note": "This is the drop worth explaining."
            }
          ],
          "notes": "CHART CALLOUTS. Press Next: the chart zooms to 2020 with its own axis label still in frame, then to 2023, then the whole chart comes back before the deck moves on.\n\nCallouts name a CATEGORY from the table rather than a position, so inserting a row above 2020 does not move the callout. Add them in Design & content → Walk the chart."
        },
        {
          "type": "content",
          "title": "Reveal the reasoning.",
          "bullets": [
            "Begin with the question.",
            "Show the relevant evidence.",
            "Explain what follows from it.",
            "Name what remains uncertain."
          ],
          "design": {
            "composition": "rail"
          },
          "notes": "Use Next to reveal each point. Earlier points remain in place so the audience can keep the argument in view. The printed version shows all points.",
          "progressive": true,
          "buildMode": "spot"
        },
        {
          "type": "video",
          "title": "A background video, on a loop",
          "subtitle": "Eight seconds, 398 KB, generated rather than downloaded",
          "video": "assets/backdrop/ink-drift.mp4",
          "videoPoster": "assets/backdrop/ink-drift-poster.jpg",
          "videoLoop": true,
          "videoMuted": true,
          "videoAutoplay": true,
          "design": {
            "capStyle": "scrim",
            "logoGround": "dark"
          },
          "notes": "VIDEO as a backdrop: Loop, Start muted and Play when the slide appears, with the caption over it. Caption style and position are settable on a video slide now, so the text can sit top or bottom, on a gradient, a bar, or nothing.\n\nThe clip loops seamlessly because every motion in it is periodic in the frame count — tools/video/backdrop-frames.py, if you want another one."
        },
        {
          "type": "video",
          "title": "A YouTube link is understood",
          "subtitle": "The editor shows the clip; the show frames the player",
          "video": "https://www.youtube.com/watch?v=dWGujFI4AYQ",
          "design": {
            "capStyle": "scrim"
          },
          "notes": "Paste a watch link and the editor shows the video’s own thumbnail with a YOUTUBE pill on it, rather than the grey rectangle it used to draw — which was indistinguishable from a field that had ignored the link.\n\nIn the show this is the real player, framed from youtube-nocookie.com so nothing is set on a student’s machine until the clip is played."
        },
        {
          "type": "chart",
          "chartKind": "bar",
          "transition": "morph",
          "title": "The same six years",
          "body": "Year\tHires\n2018\t10567540\n2019\t10424955\n2020\t10434167\n2021\t10941264\n2022\t11505872\n2023\t8531168",
          "notes": "MORPH, 1 of 2. This slide and the next hold the same table and are set to Morph, so the chart itself travels across the cut rather than the slides dissolving.\n\nPress Next slowly."
        },
        {
          "type": "chart",
          "chartKind": "line",
          "transition": "morph",
          "title": "The same six years",
          "body": "Year\tHires\n2018\t10567540\n2019\t10424955\n2020\t10434167\n2021\t10941264\n2022\t11505872\n2023\t8531168",
          "chartSource": "Bars to a line, same numbers · TfL, London Datastore",
          "notes": "MORPH, 2 of 2 — and the argument for it: this is a claim about the material, not a decoration. The room is told “this is the same data, drawn the right way” by the fact that it moved rather than changed.\n\nThe browser does the animation; the app’s job is deciding what counts as the same thing — same picture, same chart table, or same heading text. With nothing shared it is a fade."
        },
        {
          "type": "statement",
          "body": "The same six years",
          "transition": "morph",
          "subtitle": "Morphed from the heading of the slide before",
          "design": {
            "words": "",
            "backdrop": "glow"
          },
          "notes": "The third pairing: the heading text is identical to the previous slide’s title, so the words themselves travel out of the chart slide and into the middle of this one.\n\nWord effects are off here on purpose — a morph and an entrance both animating the same words fight each other."
        },
        {
          "type": "content",
          "title": "Choose what movement should do.",
          "bullets": [
            "Direct attention to the next idea.",
            "Reveal a sequence in a useful order.",
            "Preserve context between related slides.",
            "Stay still when the audience needs to compare."
          ],
          "design": {
            "composition": "rail"
          },
          "notes": "Copy an example into your deck, then adjust Look and Motion. Use one dominant movement at a time. Preview the whole sequence, including a still or reduced-motion version."
        }
      ],
      "showSlideNumbers": true
    },

    /* ------------------------------------------------------------------
       Infographic pack — every premium shape once, in the house theme, so
       the whole set can be paged through and copied slide by slide. Numbers
       are placeholders written to look like data; replace them.
       ------------------------------------------------------------------ */
    {
      key: 'infographic-pack',
      title: 'Infographic pack · premium layouts',
      icon: '％',
      blurb: 'Stat tiles (three styles), versus columns, funnel, pyramid, two timelines, a stepper and picture cards. Copy any slide into your own deck and swap the numbers.',
      minutes: 8,
      theme: 'studio',
      slides: [
        {
          type: 'title',
          title: 'Show the shape\nof the numbers.',
          subtitle: 'Ten infographic slides · every style once · change the theme to recolour them all',
          notes: 'Every slide in this deck is a bullet layout underneath — one pit per element, tab-separated — so reorder, bulk paste and Build on Next all work. Switch the deck theme and the whole pack recolours.'
        },
        {
          type: 'stats',
          title: 'Stat tiles',
          subtitle: 'Label · value · note — the value is set large',
          bullets: [
            'Completion\t92%\tup from 81% last term',
            'Median time\t14 min\tper task',
            'Rated useful\t4.6 / 5\tn = 148'
          ],
          progressive: true,
          notes: 'Default tile style. Three is the sweet spot; six fit at a smaller size.'
        },
        {
          type: 'stats',
          title: 'Stat rings',
          subtitle: 'Design → Tile style → Ring',
          bullets: [
            'Attendance\t88%\tweek 6',
            'Submitted on time\t74%\tfirst attempt',
            'Passed first time\t61%\tno resit',
            'Used the feedback\t35%\tself-reported'
          ],
          design: { statStyle: 'ring' },
          progressive: true,
          notes: 'Each ring fills to the number’s share. Percentages fill against 100; other numbers fill against the largest on the slide.'
        },
        {
          type: 'stats',
          title: 'KPI bars',
          subtitle: 'Design → Tile style → Bar',
          bullets: [
            'Applications\t1,240\ttarget 1,000',
            'Offers\t860\ttarget 800',
            'Enrolled\t510\ttarget 600'
          ],
          design: { statStyle: 'bar' },
          body: 'Two of three targets met — enrolment is the one to talk about.',
          progressive: true,
          notes: 'Bars fill against the largest value. The takeaway line under the graphic is optional; use it for the one sentence the numbers add up to.'
        },
        {
          type: 'compare',
          title: 'Versus',
          subtitle: 'Lecture | Workshop',
          bullets: [
            'Pace\tSet by the speaker\tSet by the slowest table',
            'Attention\tFalls after 12 minutes\tResets with every task',
            'Evidence of learning\tNone until the exam\tVisible in the room',
            'Prep time\tLow once written\tHigh every time'
          ],
          progressive: true,
          notes: 'Column headings live in the subtitle, split on the pipe. Each row is row label · left · right; drop the label and it becomes two plain columns.'
        },
        {
          type: 'funnel',
          title: 'Funnel',
          subtitle: 'Where a cohort thins out — the widths follow the numbers',
          bullets: [
            'Applied\t1,240\t',
            'Interviewed\t620\thalf',
            'Offered\t310\thalf again',
            'Enrolled\t190\t',
            'Completed\t160\t84% of starters'
          ],
          progressive: true,
          notes: 'Numeric values drive the band widths, floored at 40% so the last band still has room for its label. Without numbers the bands narrow evenly.'
        },
        {
          type: 'funnel',
          title: 'Pyramid',
          subtitle: 'Design → Direction → Pyramid',
          bullets: [
            'Recall\tRemember it\tfacts, terms, dates',
            'Understand\tExplain it\tin your own words',
            'Apply\tUse it\ton a new problem',
            'Create\tMake something\tthat did not exist before'
          ],
          design: { funnelDirection: 'up' },
          progressive: true,
          notes: 'Same layout flipped — widest at the bottom. Non-numeric values, so the bands narrow evenly towards the top.'
        },
        {
          type: 'timeline',
          title: 'Timeline · across',
          subtitle: 'The term at a glance',
          bullets: [
            'Week 1\tInduction\tTools, groups, expectations',
            'Week 3\tFormative 1\tShort task, feedback in class',
            'Week 6\tReading week\tNo sessions',
            'Week 8\tFormative 2\tDraft of the final piece',
            'Week 11\tSubmission\tFriday 12:00 on Canvas',
            'Week 13\tFeedback\tIndividual, in tutorials'
          ],
          progressive: true,
          notes: 'Dates above, events below, one rail. Up to eight; six is comfortable.'
        },
        {
          type: 'timeline',
          title: 'Timeline · down',
          subtitle: 'Design → Shape → Down — when the detail matters more than the sweep',
          bullets: [
            '2019\tPilot\tOne module, forty students, paper feedback forms.',
            '2021\tRedesign\tMoved online in a term; kept the weekly check-in.',
            '2023\tScaled\tFour modules, shared rubric, peer review added.',
            '2025\tNow\tEvery first-year module; feedback inside 10 days.'
          ],
          design: { timelineMode: 'vertical' },
          progressive: true,
          notes: 'A spine down the left with a full line per event. Better for four or five events with a sentence each.'
        },
        {
          type: 'journey',
          journeyMode: 'stepper',
          title: 'Stepper',
          subtitle: 'Journey → Show as → Stepper',
          bullets: [
            'Draft\tWrite it badly, fast.',
            'Cut\tRemove every sentence that does not earn its place.',
            'Check\tRead it aloud once.',
            'Send\tBefore you re-read it a fourth time.'
          ],
          progressive: true,
          notes: 'Numbered discs on one rail for a process read left to right. Route and Handover are the other two Journey modes.'
        },
        {
          type: 'cards',
          title: 'Picture cards',
          subtitle: 'Design → Cards layout → Picture cards',
          bullets: [
            'Aim\tOne outcome per session.',
            'Time\tTen minutes per activity, then move.',
            'Talk\tEvery learner speaks once before the half-hour.',
            'Check\tOne question the whole room answers.'
          ],
          design: { cardsMode: 'pictures' },
          progressive: true,
          notes: 'An image slot above every card. The dashed boxes are placeholders — paste a URL or drop a file under each card in the inspector. Design → Picture shape switches portrait crops to letterboxed plates.'
        }
      ]
    },

    /* The AI Awareness Day starters, one lesson per principle.
       GENERATED — do not edit between the markers. The decks are authored in
       AiAd26/starters.js and AiAd27/starters27.js, which also build the
       importable bundles, so the Library card and the bundle are the same
       deck rather than two copies that drift. Rebuild with:

         node tools/build-aiad-lessons.mjs

       JSON-shaped on purpose: the content carries apostrophes, em dashes and
       newlines, and a generator that hand-rolled quoting would eventually get
       one wrong. */
    /* aiad-packs:start */
    {
      "key": "aiad26-safe",
      "title": "SAFE · Who's really behind the screen?",
      "icon": "◉",
      "blurb": "Five minutes on SAFE. Opens on “Who's really behind the screen?” — the room answers before anything is explained, then the numbers, then the answers one at a time.",
      "minutes": 5,
      "theme": "aiad26-safe",
      "org": "AI Awareness Day 2026",
      "logo": "assets/brand/aiad26/aiad26-safe.svg",
      "logoOn": "all",
      "logoSize": "large",
      "logoReverse": "never",
      "showSlideNumbers": false,
      "slides": [
        {
          "type": "title",
          "title": "Who's really\nbehind the screen?",
          "subtitle": "Understanding AI-generated content and deepfakes",
          "notes": "AI AWARENESS DAY 2026 · Starter 1 · Principle: SAFE · 5 minutes\n\nLEARNING OBJECTIVES\n· Understand what deepfakes are and the scale of the problem\n· Recognise that AI-generated intimate images are illegal abuse\n· Know basic steps for staying safe online\n\nBEFORE YOU START — from the teacher pack:\nThis topic may be triggering for students who have experienced image-based abuse. Emphasise that victims are NEVER at fault. Have safeguarding information ready to share privately with any student who needs it.\n\nRUNNING ORDER: question (60s discussion) → the numbers → what to do → vocabulary → the five habits → support."
        },
        {
          "type": "statement",
          "body": "If you couldn't tell whether a video of your friend was real or AI-generated, what would you do?",
          "subtitle": "Talk to the person next to you — 60 seconds",
          "transition": "fade",
          "feedback": {
            "kind": "poll",
            "prompt": "What would you do first?",
            "options": [
              "Send it to a friend to check",
              "Look up where it came from",
              "Ask a trusted adult",
              "Delete it and say nothing"
            ],
            "max": 1,
            "presentAs": "rail"
          },
          "notes": "THE 60 SECONDS ARE THE LESSON. Resist filling them.\n\nThe poll is optional — if phones are not joining, this works exactly as well as a pair discussion. If you do run it, \"Send it to a friend to check\" is the teachable answer: it feels responsible and it is the one that spreads the harm. Do not say so until after the vote.\n\nDISCUSSION PROMPTS\n→ How would you react if you received a suspicious image of someone you know?\n→ Why do you think deepfake abuse primarily targets young people?\n→ What is one thing you could do differently online after today?"
        },
        {
          "type": "stats",
          "title": "1 in 17 young people have been targeted by deepfake image abuse",
          "subtitle": "Did you know?",
          "bullets": [
            "Deepfakes shared online in 2025\t8 million\tup from 500,000 in 2023",
            "Of all deepfakes\t98%\tare non-consensual intimate images",
            "UK teenagers\t4 in 5\thave used generative AI tools"
          ],
          "body": "Thorn Research 2025 · European Parliament 2025 · European Commission",
          "notes": "Read the headline aloud — \"1 in 17\" is roughly one person in a class of thirty, and the room will do that arithmetic themselves. Let them.\n\nThe 500,000 → 8 million figure is the one to dwell on: a sixteen-fold rise in two years. This is not a problem that is arriving, it is one that has arrived.\n\nDo not linger on 98%. State it, let it land, move on."
        },
        {
          "type": "cards",
          "title": "So what do you actually do?",
          "bullets": [
            "Don't share it\tSharing spreads potential harm even if you are trying to warn people.",
            "Check the source\tIs it from an official or verified account? Where did it originally come from?",
            "Reverse image search\tSee whether the content appears elsewhere, or has been flagged as fake.",
            "Look for the tells\tUnnatural blinking, strange lighting, blurry edges around face and hair.",
            "Ask a trusted adult\tTeachers, parents and safeguarding leads can help you verify.",
            "If it is intimate, report it\tDo not view, save or share it. Report it immediately."
          ],
          "progressive": true,
          "buildMode": "hide",
          "notes": "REVEAL ONE AT A TIME — press → for each. Take the room's answers first and reveal the card that matches; it turns a list into a conversation.\n\nThe first card is the one most people get wrong, and it is worth saying plainly: forwarding something to warn people is still forwarding it.\n\nThe last card is non-negotiable. Creating AI-generated intimate images of anyone is illegal — a sexual offence — even if it was \"just a joke\"."
        },
        {
          "type": "sourcecheck",
          "title": "\"8 million deepfakes will be shared online in 2025\"",
          "subtitle": "We put that on a slide three minutes ago. Should you have believed it?",
          "bullets": [
            "Who\tEuropean Parliament\t",
            "When\t2025\tquoted in the AI Awareness Day teacher pack",
            "Basis\tA projection\tfor a year that has not finished — not a count",
            "Against\t500,000 in 2023\tthe figure it is measured from",
            "Gap\tNo method shown\tthis deck never tells you how it was worked out"
          ],
          "progressive": true,
          "notes": "REVEAL ONE ROW AT A TIME. The room should feel the claim come apart.\n\nBE FAIR TO THE NUMBER. The point is not that it is wrong — it is a serious figure from a serious source, and it is very likely sound. The point is that nobody in the room asked, including you, three minutes after being told to check where things come from.\n\nThe last row is the one that matters, and it is about this deck: the method is not on the slide. Neither is it on most slides anywhere.\n\nIf a student says \"so should we not believe it?\" — the answer is that believing it is fine; believing it WITHOUT NOTICING is the habit deepfakes exploit."
        },
        {
          "type": "shift",
          "hidden": true,
          "title": "How fast this moved",
          "subtitle": "Deepfakes shared online",
          "bullets": [
            "2023\t500,000\twhere it started",
            "2025\t8 million\tprojected",
            "2027\t\tnobody knows"
          ],
          "body": "European Parliament 2025",
          "notes": "HIDDEN BY DEFAULT — the growth is already a tile on the \"did you know\" slide, and a five-minute starter should not spend two slides on one number.\n\nUnhide it when you have longer, or when a class has shrugged at \"8 million\". The stat slide reports the rise; this one draws it, and the ×16 in the gutter is the thing nobody works out for themselves. Two years.\n\nThe 2027 column is deliberately empty. Ask the room to fill it before you move on."
        },
        {
          "type": "statement",
          "hidden": true,
          "body": "How would you verify whether content is genuine?",
          "subtitle": "Extension — if you have longer than five minutes",
          "feedback": {
            "kind": "brainstorm",
            "prompt": "One way to check something is real",
            "max": 2,
            "presentAs": "rail"
          },
          "notes": "HIDDEN BY DEFAULT — this is the teacher pack's sub-question, and a five-minute starter does not have room for it. Unhide it (and the card slide after) if this is a full lesson rather than a starter.\n\nRuns well as a brainstorm: contributions arrive named and newest-first, so you can credit people as you go."
        },
        {
          "type": "cards",
          "hidden": true,
          "title": "Verifying content",
          "bullets": [
            "Cross-check it\tDoes the same story or video appear on trusted news sites?",
            "Read the account\tIs it verified? How old is it? What else has it posted?",
            "Go to the source\tSearch for the person's official accounts — have they addressed it?",
            "Use a fact-checker\tFull Fact and BBC Reality Check both cover viral claims.",
            "Ask who benefits\tWho gains if you believe this is real? That question answers a lot."
          ],
          "progressive": true,
          "buildMode": "hide",
          "notes": "Extension — unhide together with the question before it.\n\n\"Who benefits if I believe this?\" is the most transferable idea in the whole starter. It works on advertising, on politics, and on the group chat.\n\nIf a student says \"but it was sent by someone I trust\": even trusted people are fooled by convincing deepfakes. Misinformation travels through well-meaning people. Verify independently, then tell them gently if it turns out to be fake."
        },
        {
          "type": "keywords",
          "title": "Two words worth knowing",
          "bullets": [
            "Deepfake\tAI-generated or manipulated video, image or audio that convincingly shows something that never happened.",
            "Reverse image search\tUploading an image to Google Images or TinEye to find where it originally came from."
          ],
          "notes": "These definitions were in the teacher pack but never on a slide. They are here so students can copy them down.\n\nWorth adding aloud: the Online Safety Act requires platforms to remove illegal content, and the law on intimate images already covers AI-generated ones. Technology moves faster than legislation, but on this particular point the law has caught up."
        },
        {
          "type": "journey",
          "title": "Staying safe in an AI world",
          "subtitle": "Five habits, in the order you would use them",
          "bullets": [
            "Stop\tBefore sharing, ask: could this be AI-generated? Check the source.",
            "Verify\tOfficial accounts, reverse image search, or ask a trusted adult.",
            "Report\tAI-generated intimate images of anyone are illegal. Tell a trusted adult immediately.",
            "Protect\tThink twice before posting photos. They can be manipulated by AI tools.",
            "Support\tIf someone shows you suspicious content, don't pass it on."
          ],
          "progressive": true,
          "notes": "Reveal one milestone at a time. Five verbs in the order you would actually use them — that ordering is the point, and it is why this is a path rather than a list.\n\nIf you are short of time, this is the slide to end on."
        },
        {
          "type": "keyfact",
          "subtitle": "Key takeaway",
          "title": "Think before you post",
          "body": "Your digital footprint can be used in ways you never intended.",
          "notes": "One line, then stop talking. Do not add to it.\n\nIf the room is quiet, that is the right response to this starter."
        },
        {
          "type": "section",
          "title": "If any of this affected you",
          "subtitle": "You will not be in trouble for asking for help.",
          "notes": "Say this out loud rather than leaving it on the slide.\n\nYour tutor, head of year or safeguarding lead is available to help — name the actual person if you can.\n\nFrom the teacher pack, the three messages that matter most:\n· If you are targeted by deepfake abuse, it is NOT your fault.\n· Creating AI-generated intimate images of anyone is illegal.\n· You will NOT be in trouble for reporting — we are here to help.\n\nHave the safeguarding details ready to share privately with anyone who comes to you afterwards."
        },
        {
          "type": "links",
          "title": "Reporting and support",
          "subtitle": "Free, confidential, and open to anyone",
          "bullets": [
            "Childline — 0800 1111\thttps://www.childline.org.uk",
            "Samaritans — 116 123\thttps://www.samaritans.org",
            "Young Minds — mental health\thttps://www.youngminds.org.uk",
            "CEOP — report abuse or exploitation\thttps://www.ceop.police.uk/safety-centre",
            "Internet Watch Foundation — report an image\thttps://report.iwf.org.uk",
            "UK Safer Internet Centre\thttps://saferinternet.org.uk"
          ],
          "notes": "Leave this slide up while the room packs away — it is the one slide worth lingering on.\n\nChildline and Samaritans are the two numbers worth reading aloud; the rest are for students to find later. Every link is live, so this slide works as a handout as well as a projection.\n\nTwo more from the teacher pack that would not fit on the slide:\n· NSPCC online safety — nspcc.org.uk/keeping-children-safe/online-safety\n· ThinkUKnow — thinkuknow.co.uk"
        },
        {
          "type": "join",
          "hidden": true,
          "title": "Join on your phone",
          "subtitle": "Only needed if you are running the live poll",
          "notes": "HIDDEN BY DEFAULT. Thirty phones joining burns the whole five minutes, and every statement slide in this deck works as a plain pair discussion without anyone joining at all.\n\nUnhide and drag to position 2 if you do want the room voting, or just open the join panel from the presenter view without spending a slide on it."
        }
      ]
    },
    {
      "key": "aiad26-smart",
      "title": "SMART · How does AI actually 'think'?",
      "icon": "◆",
      "blurb": "Five minutes on SMART. Opens on “How does AI actually 'think'?” — the room answers before anything is explained, then the numbers, then the answers one at a time.",
      "minutes": 5,
      "theme": "aiad26-smart",
      "org": "AI Awareness Day 2026",
      "logo": "assets/brand/aiad26/aiad26-smart.svg",
      "logoOn": "all",
      "logoSize": "large",
      "logoReverse": "never",
      "showSlideNumbers": false,
      "slides": [
        {
          "type": "title",
          "title": "How does AI\nactually 'think'?",
          "subtitle": "Understanding the technology behind the tools you use",
          "notes": "AI AWARENESS DAY 2026 · Starter 2 · Principle: SMART · 5 minutes\n\nLEARNING OBJECTIVES\n· Understand that AI predicts patterns rather than \"thinking\"\n· Recognise the difference between pattern prediction and understanding\n· Learn why AI 'hallucinations' occur\n\nTHE ONE THING TO WATCH FOR — from the teacher pack:\nStudents will anthropomorphise AI. Gently correct \"it thinks\" to \"it predicts\", every time, all the way through. That single substitution is most of the learning.\n\nAvoid being dismissive of AI's usefulness while explaining its limits."
        },
        {
          "type": "statement",
          "body": "When you ask ChatGPT a question, do you think it 'understands' you the way a human would?",
          "subtitle": "Talk to the person next to you — 60 seconds",
          "feedback": {
            "kind": "poll",
            "prompt": "Does it understand you?",
            "options": [
              "Yes — it understands",
              "No — it predicts",
              "Somewhere in between",
              "I genuinely do not know"
            ],
            "max": 1,
            "presentAs": "rail"
          },
          "notes": "The vote is the hook. Take it before you say anything, and leave the result on screen while you work through the next slide — you want the room looking at their own answer as the explanation arrives.\n\n\"Somewhere in between\" is the most popular answer in most rooms and it is the most interesting one to unpick: what would \"partly understand\" even mean?\n\nDISCUSSION PROMPTS\n→ What is the difference between knowing something and predicting it?\n→ Why might it matter if AI does not truly understand?\n→ How might knowing this change how you use AI tools?"
        },
        {
          "type": "compare",
          "title": "Predicting is not understanding",
          "subtitle": "What a language model does | What understanding would need",
          "bullets": [
            "Predicts the next likely word\tGrasps what the words mean",
            "Patterns from its training data\tExperience of the real world",
            "Always produces an answer\tCan say 'I don't know'",
            "Sounds confident when wrong\tKnows where its knowledge stops"
          ],
          "notes": "This slide is the whole starter. If you only have two minutes, show the question and then this.\n\nThe analogy that lands best, from the teacher pack: AI is a very sophisticated autocomplete, not a thinking being.\n\nRow 3 is the one students find most surprising — a model has no mechanism for noticing that it does not know, which is exactly why hallucinations sound as confident as facts."
        },
        {
          "type": "stats",
          "title": "It predicts the next word — and it is wrong often enough to matter",
          "subtitle": "Did you know?",
          "bullets": [
            "UK university students using AI for academic work\t92%\tHEPI Survey 2025",
            "Students naming hallucinations as a major concern\t51%\tHEPI Survey 2025",
            "School students who have used AI\t45%\tHEPI 2025"
          ],
          "body": "Trained on billions of web pages, books and articles · HEPI 2025, MIT, Stanford AI Index 2025",
          "notes": "The point of putting 92% next to 51% is that both are true at once: nearly everyone is using it, and half of them already know it makes things up. The room is not naive — it is under-equipped.\n\nA hallucination is not a rare glitch. It is what the prediction mechanism does when the pattern runs out."
        },
        {
          "type": "cards",
          "title": "So — does it understand you?",
          "bullets": [
            "No\tAI processes text as mathematical patterns, not meaning.",
            "It predicts\tIt works out which words are likely to come next, from its training data.",
            "It has no experience\tNo feelings, no memories, no consciousness to draw on.",
            "It can be confidently wrong\tCoherent and fluent and completely incorrect, all at once.",
            "Understanding needs more\tContext, common sense and real-world knowledge that AI lacks.",
            "But it is still useful\tA powerful tool when you know what it is doing."
          ],
          "progressive": true,
          "buildMode": "hide",
          "notes": "Reveal one at a time.\n\nDo not skip the last card. The teacher pack is explicit about this: explaining the limits should not tip into dismissing the tool. Students who conclude \"AI is rubbish\" have missed the lesson as thoroughly as students who conclude \"AI knows everything\"."
        },
        {
          "type": "statement",
          "hidden": true,
          "body": "Does it matter if AI doesn't understand, as long as it's helpful?",
          "subtitle": "Extension — if you have longer than five minutes",
          "feedback": {
            "kind": "scale",
            "prompt": "How much does it matter?",
            "points": 5,
            "lowLabel": "Not at all",
            "highLabel": "Enormously",
            "max": 1,
            "presentAs": "rail"
          },
          "notes": "HIDDEN BY DEFAULT — the teacher pack's sub-question. Unhide with the card slide after it.\n\nA scale rather than a poll: this is a question of degree, and the spread across the room is more interesting than any single answer. The distribution usually splits, which is the discussion."
        },
        {
          "type": "cards",
          "hidden": true,
          "title": "Yes — it matters",
          "bullets": [
            "Errors follow\tNo understanding means hallucinations are built in, not a bug.",
            "On things that matter\tPlausible-sounding wrong advice on health, legal or safety questions.",
            "It cannot flag itself\tWithout understanding, it can't know when it's wrong.",
            "So you have to check\tVerify outputs rather than trusting them.",
            "Knowing the limits helps\tYou use a tool better when you know what it cannot do."
          ],
          "progressive": true,
          "buildMode": "hide",
          "notes": "Extension — unhide together with the question before it."
        },
        {
          "type": "keywords",
          "title": "Two words worth knowing",
          "bullets": [
            "Large Language Model (LLM)\tAI trained on billions of texts to predict and generate human-like language, by pattern rather than by meaning.",
            "Hallucination\tWhen AI confidently generates false information — because it predicts 'likely' text, not verified facts."
          ],
          "notes": "Both definitions were in the teacher pack only. Worth writing down.\n\n\"Hallucination\" is an unfortunate term — it implies a mind having a strange experience. If a student notices that, they have understood the lesson better than the industry that named it."
        },
        {
          "type": "journey",
          "title": "Being AI-smart",
          "subtitle": "Five habits that follow from knowing how it works",
          "bullets": [
            "Know what it is\tA pattern-matching tool, not a thinking being — it doesn't 'know' facts.",
            "Verify\tAlways check AI outputs against reliable sources — don't trust it blindly.",
            "Expect bias\tIt reflects patterns in its training data, including biases and errors.",
            "Understand it\tKnowing HOW AI works helps you use it more effectively.",
            "Be specific\tThe more specific your question, the better the output."
          ],
          "progressive": true,
          "notes": "Reveal one at a time. If you are short of time, end here."
        },
        {
          "type": "keyfact",
          "subtitle": "Key takeaway",
          "title": "Autocomplete, not an oracle",
          "body": "AI is a powerful tool — but like any tool, it has to be used properly.",
          "notes": "One line. Then stop."
        },
        {
          "type": "section",
          "title": "If any of this affected you",
          "subtitle": "You will not be in trouble for asking for help.",
          "notes": "Say this out loud rather than leaving it on the slide.\n\nYour tutor, head of year or safeguarding lead is available to help — name the actual person if you can.\n\nFrom the teacher pack, the three messages that matter most:\n· If you are targeted by deepfake abuse, it is NOT your fault.\n· Creating AI-generated intimate images of anyone is illegal.\n· You will NOT be in trouble for reporting — we are here to help.\n\nHave the safeguarding details ready to share privately with anyone who comes to you afterwards."
        },
        {
          "type": "links",
          "title": "Reporting and support",
          "subtitle": "Free, confidential, and open to anyone",
          "bullets": [
            "Childline — 0800 1111\thttps://www.childline.org.uk",
            "Samaritans — 116 123\thttps://www.samaritans.org",
            "Young Minds — mental health\thttps://www.youngminds.org.uk",
            "CEOP — report abuse or exploitation\thttps://www.ceop.police.uk/safety-centre",
            "Internet Watch Foundation — report an image\thttps://report.iwf.org.uk",
            "UK Safer Internet Centre\thttps://saferinternet.org.uk"
          ],
          "notes": "Leave this slide up while the room packs away — it is the one slide worth lingering on.\n\nChildline and Samaritans are the two numbers worth reading aloud; the rest are for students to find later. Every link is live, so this slide works as a handout as well as a projection.\n\nTwo more from the teacher pack that would not fit on the slide:\n· NSPCC online safety — nspcc.org.uk/keeping-children-safe/online-safety\n· ThinkUKnow — thinkuknow.co.uk"
        },
        {
          "type": "join",
          "hidden": true,
          "title": "Join on your phone",
          "subtitle": "Only needed if you are running the live poll",
          "notes": "HIDDEN BY DEFAULT. Unhide and drag to position 2 if you want the room voting, or open the join panel from the presenter view instead."
        }
      ]
    },
    {
      "key": "aiad26-creative",
      "title": "CREATIVE · AI as your creative partner",
      "icon": "✦",
      "blurb": "Five minutes on CREATIVE. Opens on “AI as your creative partner” — the room answers before anything is explained, then the numbers, then the answers one at a time.",
      "minutes": 5,
      "theme": "aiad26-creative",
      "org": "AI Awareness Day 2026",
      "logo": "assets/brand/aiad26/aiad26-creative.svg",
      "logoOn": "all",
      "logoSize": "large",
      "logoReverse": "never",
      "showSlideNumbers": false,
      "slides": [
        {
          "type": "title",
          "title": "AI as your\ncreative partner",
          "subtitle": "Using AI to amplify human creativity, not replace it",
          "notes": "AI AWARENESS DAY 2026 · Starter 3 · Principle: CREATIVE · 5 minutes\n\nLEARNING OBJECTIVES\n· Consider whether AI-assisted work is still 'yours'\n· Understand what AI can and cannot contribute creatively\n· Recognise that human creativity remains essential\n\nFRAMING — from the teacher pack:\nThis connects directly to academic integrity, and different contexts have different rules (art vs. homework vs. professional work). Encourage students to develop their OWN skills, not just delegation skills.\n\nThere is no right answer to the main question. Do not manufacture one."
        },
        {
          "type": "statement",
          "body": "If AI helped you write a story or create artwork, is it still your creation?",
          "subtitle": "Talk to the person next to you — 60 seconds",
          "feedback": {
            "kind": "poll",
            "prompt": "Is it still yours?",
            "options": [
              "Yes — completely mine",
              "Yes — if I did most of it",
              "Only partly mine",
              "No — not really mine"
            ],
            "max": 1,
            "presentAs": "rail"
          },
          "notes": "This one genuinely splits a room, which is the point. Show the spread and let two people who voted differently argue it out.\n\nDo NOT resolve it. The teacher pack is clear that this is contested ground; your job is to give them better tools for the argument, not to end it.\n\nDISCUSSION PROMPTS\n→ If AI helped you with an essay, is it still your work?\n→ What unique perspective do YOU bring that AI cannot?\n→ When should you disclose that AI helped with something?"
        },
        {
          "type": "stats",
          "title": "Creative thinking is now one of the top five skills employers want",
          "subtitle": "Did you know?",
          "bullets": [
            "Students using AI mainly to save time\t51%\tfreeing space for deeper creative work",
            "Creativity and resilience\tTop 5\trising skills for 2030, WEF",
            "Original ideas produced by AI\tNone\tit recombines; it does not originate"
          ],
          "body": "WEF Future of Jobs Report 2025 · HEPI Survey 2025",
          "notes": "The third tile is the argumentative one and it is meant to be. If a student pushes back — \"but it made something new\" — that is a good two-minute detour: recombination at sufficient scale can look a lot like originality, and the difference is whether anything was meant.\n\nThe 51% is the hopeful number. Time saved is only valuable if it goes somewhere."
        },
        {
          "type": "cards",
          "title": "So — is it yours?",
          "bullets": [
            "It depends how you used it\tAnd how much of YOUR creative input was involved.",
            "Brainstorming — probably yours\tUsing AI for starting points is like using a dictionary.",
            "Generating it whole — less so\tAn entire work with minimal editing is less clearly yours.",
            "The test\tCan you explain and defend every creative choice in the work?",
            "The other test\tWould you be comfortable if your teacher knew exactly how AI was used?",
            "What you provide\tVision, judgment, emotional truth, perspective, and the final decisions."
          ],
          "progressive": true,
          "buildMode": "hide",
          "notes": "Reveal one at a time.\n\nCards 4 and 5 are the two that students can actually carry into a homework decision at 11pm. Spend your time there.\n\nIf a student asks where inspiration ends and copying begins: inspiration transforms an idea through your own perspective and skill; copying reproduces it without adding anything. If you could swap the AI output for any similar output and nothing would be lost, it was never yours."
        },
        {
          "type": "statement",
          "hidden": true,
          "body": "What do you bring that AI can't replicate?",
          "subtitle": "Extension — if you have longer than five minutes",
          "feedback": {
            "kind": "wordcloud",
            "prompt": "One word — what do you bring?",
            "max": 2,
            "presentAs": "rail"
          },
          "notes": "HIDDEN BY DEFAULT — the teacher pack's sub-question.\n\nA word cloud is the right shape for this: repeats grow, so the room watches its own consensus form in real time. It is also the single most affirming thirty seconds in the whole set of five starters — if you unhide one extension slide across the whole day, make it this one."
        },
        {
          "type": "cards",
          "hidden": true,
          "title": "What you bring",
          "bullets": [
            "Lived experience\tYour unique perspective, shaped by your life.",
            "Emotional truth\tGenuine feelings that resonate with other people.",
            "Cultural context\tUnderstanding nuance, appropriateness and meaning.",
            "Creative judgment\tKnowing what's good, what works, and what matters.",
            "Intentionality\tHaving a purpose and a message behind the work.",
            "Ethical reasoning\tChoosing what SHOULD be created, not just what can be."
          ],
          "progressive": true,
          "buildMode": "hide",
          "notes": "Extension — unhide together with the question before it."
        },
        {
          "type": "keywords",
          "title": "Two words worth knowing",
          "bullets": [
            "Generative AI\tAI that creates new content from patterns in training data — recombining existing patterns rather than having original ideas.",
            "Authenticity\tBeing genuine and original: your own voice, experiences and creative choices, rather than delegating them."
          ],
          "notes": "Both definitions were in the teacher pack only.\n\nUseful counterweight if the room turns purist: tools have always been part of creativity — cameras, synthesisers, spell checkers. The question has never been whether you used a tool. It is whether the result means anything."
        },
        {
          "type": "journey",
          "title": "Creative AI partnership",
          "subtitle": "Five ways to keep the work yours",
          "bullets": [
            "Brainstorm with it\tGenerate ten ideas, then pick and improve the best one.",
            "Delegate the repetitive\tLet it handle the routine so you can make the real decisions.",
            "Bring yourself\tYour experiences and perspectives are what make work original.",
            "Start, do not finish\tThink of AI as a starting point, not the finish line.",
            "Add your voice\tAlways add your own judgment and personal touch."
          ],
          "progressive": true,
          "notes": "Reveal one at a time. If you are short of time, end here."
        },
        {
          "type": "keyfact",
          "subtitle": "Key takeaway",
          "title": "You are still the author",
          "body": "The best creative work comes from human imagination enhanced by AI capability.",
          "notes": "One line. Then stop."
        },
        {
          "type": "section",
          "title": "If any of this affected you",
          "subtitle": "You will not be in trouble for asking for help.",
          "notes": "Say this out loud rather than leaving it on the slide.\n\nYour tutor, head of year or safeguarding lead is available to help — name the actual person if you can.\n\nFrom the teacher pack, the three messages that matter most:\n· If you are targeted by deepfake abuse, it is NOT your fault.\n· Creating AI-generated intimate images of anyone is illegal.\n· You will NOT be in trouble for reporting — we are here to help.\n\nHave the safeguarding details ready to share privately with anyone who comes to you afterwards."
        },
        {
          "type": "links",
          "title": "Reporting and support",
          "subtitle": "Free, confidential, and open to anyone",
          "bullets": [
            "Childline — 0800 1111\thttps://www.childline.org.uk",
            "Samaritans — 116 123\thttps://www.samaritans.org",
            "Young Minds — mental health\thttps://www.youngminds.org.uk",
            "CEOP — report abuse or exploitation\thttps://www.ceop.police.uk/safety-centre",
            "Internet Watch Foundation — report an image\thttps://report.iwf.org.uk",
            "UK Safer Internet Centre\thttps://saferinternet.org.uk"
          ],
          "notes": "Leave this slide up while the room packs away — it is the one slide worth lingering on.\n\nChildline and Samaritans are the two numbers worth reading aloud; the rest are for students to find later. Every link is live, so this slide works as a handout as well as a projection.\n\nTwo more from the teacher pack that would not fit on the slide:\n· NSPCC online safety — nspcc.org.uk/keeping-children-safe/online-safety\n· ThinkUKnow — thinkuknow.co.uk"
        },
        {
          "type": "join",
          "hidden": true,
          "title": "Join on your phone",
          "subtitle": "Only needed if you are running the live poll",
          "notes": "HIDDEN BY DEFAULT. Unhide and drag to position 2 if you want the room voting, or open the join panel from the presenter view instead."
        }
      ]
    },
    {
      "key": "aiad26-responsible",
      "title": "RESPONSIBLE · The hidden costs of AI",
      "icon": "⬖",
      "blurb": "Five minutes on RESPONSIBLE. Opens on “The hidden costs of AI” — the room answers before anything is explained, then the numbers, then the answers one at a time.",
      "minutes": 5,
      "theme": "aiad26-responsible",
      "org": "AI Awareness Day 2026",
      "logo": "assets/brand/aiad26/aiad26-responsible.svg",
      "logoOn": "all",
      "logoSize": "large",
      "logoReverse": "never",
      "showSlideNumbers": false,
      "slides": [
        {
          "type": "title",
          "title": "The hidden\ncosts of AI",
          "subtitle": "Understanding the environmental and ethical impact of AI",
          "notes": "AI AWARENESS DAY 2026 · Starter 4 · Principle: RESPONSIBLE · 5 minutes\n\nLEARNING OBJECTIVES\n· Understand that AI has significant environmental impact\n· Learn about data centre energy and water consumption\n· Consider when AI use is and isn't justified\n\nTONE — from the teacher pack, and it matters here more than anywhere:\nAvoid doom-and-gloom. Frame this as informed decision-making, not guilt. The goal is thoughtful use, not complete avoidance. AI also has POSITIVE environmental applications — climate modelling, grid efficiency — and it is worth saying so."
        },
        {
          "type": "statement",
          "body": "Every time you use AI, it uses electricity and water. Should we care?",
          "subtitle": "Talk to the person next to you — 60 seconds",
          "feedback": {
            "kind": "scale",
            "prompt": "How much should we care?",
            "points": 5,
            "lowLabel": "Not at all",
            "highLabel": "Enormously",
            "max": 1,
            "presentAs": "rail"
          },
          "notes": "A scale rather than a poll — this is a question of degree, and the spread is the discussion. Show the distribution and ask someone at each end to explain their position.\n\nWatch for the room talking itself into guilt. Redirect: the useful question is not \"should I feel bad\" but \"when is it worth it\".\n\nDISCUSSION PROMPTS\n→ Does knowing about AI's environmental impact change how you'll use it?\n→ When is using AI worth the environmental cost?\n→ What might you use instead of AI for simple tasks?"
        },
        {
          "type": "iceberg",
          "title": "What's under one question",
          "subtitle": "One answer from a chatbot",
          "bullets": [
            "Electricity\t1%\tof all global electricity goes to data centres — doubling by 2026",
            "Carbon\t32.6–79.7 Mt\tAI's 2025 footprint, CO₂ equivalent — about New York City's",
            "Per model trained\t5 cars\tas much CO₂ as five cars over their entire lifetimes",
            "Water for cooling\t≈ all bottled water\tAI data centres could use as much this year as the global bottled water industry"
          ],
          "progressive": true,
          "body": "Nature Sustainability 2025 · International Energy Agency 2025 · MIT",
          "notes": "REVEAL ONE LAYER AT A TIME — press → for each. The room should be guessing how far down this goes.\n\nStart by pointing at the line above the waterline: that is all anyone sees when they use it. Everything below is the same single answer.\n\nThe water layer is the one students remember, because nobody expects computing to be thirsty. Save it for last, which is where it is.\n\nThe range on the third tile (32.6–79.7) is not vagueness — it is honest reporting of a genuinely uncertain measurement. Worth naming if anyone asks why it is not one number."
        },
        {
          "type": "cards",
          "title": "So — should we care?",
          "bullets": [
            "Yes — it adds up\tSmall individual actions combine into massive collective impact.",
            "The scale is national\tAI's total footprint is equivalent to a small country's emissions.",
            "Being informed helps\tIt lets you judge when AI is actually worth using.",
            "This is not \"never use AI\"\tIt's \"use it thoughtfully\".",
            "Companies have a job too\tTransparency, efficiency, and investment in renewable energy.",
            "And so do we\tAs consumers we can advocate for more sustainable AI."
          ],
          "progressive": true,
          "buildMode": "hide",
          "notes": "Reveal one at a time.\n\nCard 4 is the one that keeps this starter honest. Say it clearly and do not let the room leave thinking they have been told off for using a chatbot.\n\nCost-benefit, if it comes up: complex research, accessibility needs and real productivity gains can justify the cost. Simple questions you could answer yourself, and trivial entertainment, mostly do not."
        },
        {
          "type": "spectrum",
          "title": "When is it worth it?",
          "subtitle": "Rarely worth the cost | Clearly worth the cost",
          "bullets": [
            "A question you could answer yourself\t10\ta search would do",
            "Jokes and trivial entertainment\t24\t",
            "Work you then rewrite yourself\t52\t",
            "Accessibility needs\t82\t",
            "Medical research, climate modelling\t94\t"
          ],
          "body": "Categories and ordering from the AI Awareness Day teacher pack",
          "notes": "THE POSITIONS ARE ARGUABLE AND THAT IS THE EXERCISE. The teacher pack names these categories and says which end each belongs at; it gives no numbers. Do not defend the exact spots.\n\nBest use: ask the room to move one. \"Which of these is in the wrong place?\" gets further in ninety seconds than any amount of explaining, and the argument is always about the middle one.\n\nThe question underneath, from the pack: is AI the most efficient tool here, or would a simple search have worked?\n\nKeep the tone off guilt. This is a slide about judgement, not abstinence."
        },
        {
          "type": "statement",
          "hidden": true,
          "body": "Who should be responsible for AI's carbon footprint?",
          "subtitle": "Extension — if you have longer than five minutes",
          "feedback": {
            "kind": "poll",
            "prompt": "Who is responsible?",
            "options": [
              "The tech companies",
              "Governments",
              "Us, the users",
              "All of the above"
            ],
            "max": 1,
            "presentAs": "rail"
          },
          "notes": "HIDDEN BY DEFAULT — the teacher pack's sub-question.\n\nThe poll is the lesson: rooms split three ways and then discover the answer is \"all of the above\". Take the vote before you reveal the next slide, and let the room notice for itself that everyone picked somebody else."
        },
        {
          "type": "cards",
          "hidden": true,
          "title": "All of the above",
          "bullets": [
            "Tech companies\tThey build and profit from AI systems.",
            "Governments\tThey set regulations and energy policy.",
            "Users\tWe choose when and how much to use AI.",
            "Which means everyone\tResponsibility is shared along the whole chain.",
            "Companies should\tUse renewable energy, improve efficiency, be transparent.",
            "And users can\tUse AI thoughtfully, advocate for sustainability, stay informed."
          ],
          "progressive": true,
          "buildMode": "hide",
          "notes": "Extension — unhide together with the question before it."
        },
        {
          "type": "keywords",
          "title": "Two words worth knowing",
          "bullets": [
            "Data centre\tA facility housing thousands of servers. AI needs massive ones, consuming electricity for computing and water for cooling.",
            "Carbon footprint\tTotal greenhouse gases caused by an activity — for AI: electricity generation, hardware manufacturing and cooling."
          ],
          "notes": "Both definitions were in the teacher pack only.\n\nThe water point surprises people every time. Servers generate heat; heat has to go somewhere; evaporative cooling is how it goes."
        },
        {
          "type": "journey",
          "title": "Using AI responsibly",
          "subtitle": "Five habits — none of which is \"stop\"",
          "bullets": [
            "Think first\tDo you really need AI for this task?",
            "Check yourself first\tSimple questions often don't need AI at all.",
            "Batch it\tGroup your requests rather than sending many small ones.",
            "Consider the source\tSome companies use far more renewable energy than others.",
            "Ask for transparency\tWe need to know AI's true environmental cost."
          ],
          "progressive": true,
          "notes": "Reveal one at a time. If you are short of time, end here."
        },
        {
          "type": "keyfact",
          "subtitle": "Key takeaway",
          "title": "Thoughtfully — not never",
          "body": "Every choice we make about technology has consequences. Use AI thoughtfully.",
          "notes": "One line. Then stop."
        },
        {
          "type": "section",
          "title": "If any of this affected you",
          "subtitle": "You will not be in trouble for asking for help.",
          "notes": "Say this out loud rather than leaving it on the slide.\n\nYour tutor, head of year or safeguarding lead is available to help — name the actual person if you can.\n\nFrom the teacher pack, the three messages that matter most:\n· If you are targeted by deepfake abuse, it is NOT your fault.\n· Creating AI-generated intimate images of anyone is illegal.\n· You will NOT be in trouble for reporting — we are here to help.\n\nHave the safeguarding details ready to share privately with anyone who comes to you afterwards."
        },
        {
          "type": "links",
          "title": "Reporting and support",
          "subtitle": "Free, confidential, and open to anyone",
          "bullets": [
            "Childline — 0800 1111\thttps://www.childline.org.uk",
            "Samaritans — 116 123\thttps://www.samaritans.org",
            "Young Minds — mental health\thttps://www.youngminds.org.uk",
            "CEOP — report abuse or exploitation\thttps://www.ceop.police.uk/safety-centre",
            "Internet Watch Foundation — report an image\thttps://report.iwf.org.uk",
            "UK Safer Internet Centre\thttps://saferinternet.org.uk"
          ],
          "notes": "Leave this slide up while the room packs away — it is the one slide worth lingering on.\n\nChildline and Samaritans are the two numbers worth reading aloud; the rest are for students to find later. Every link is live, so this slide works as a handout as well as a projection.\n\nTwo more from the teacher pack that would not fit on the slide:\n· NSPCC online safety — nspcc.org.uk/keeping-children-safe/online-safety\n· ThinkUKnow — thinkuknow.co.uk"
        },
        {
          "type": "join",
          "hidden": true,
          "title": "Join on your phone",
          "subtitle": "Only needed if you are running the live poll",
          "notes": "HIDDEN BY DEFAULT. Unhide and drag to position 2 if you want the room voting, or open the join panel from the presenter view instead."
        }
      ]
    },
    {
      "key": "aiad26-future",
      "title": "FUTURE · Your AI-ready future",
      "icon": "❯",
      "blurb": "Five minutes on FUTURE. Opens on “Your AI-ready future” — the room answers before anything is explained, then the numbers, then the answers one at a time.",
      "minutes": 5,
      "theme": "aiad26-future",
      "org": "AI Awareness Day 2026",
      "logo": "assets/brand/aiad26/aiad26-future.svg",
      "logoOn": "all",
      "logoSize": "large",
      "logoReverse": "never",
      "showSlideNumbers": false,
      "slides": [
        {
          "type": "title",
          "title": "Your AI-ready\nfuture",
          "subtitle": "Preparing for careers in an AI-transformed world",
          "notes": "AI AWARENESS DAY 2026 · Starter 5 · Principle: FUTURE · 5 minutes\n\nLEARNING OBJECTIVES\n· Understand how AI is changing the job market\n· Identify skills that will remain valuable alongside AI\n· Recognise the importance of lifelong learning\n\nTONE — from the teacher pack:\nBalance realism with optimism. Changes are coming, but so are opportunities. Emphasise that students have agency here. Avoid specific predictions — the exact jobs of 2035 are genuinely unknowable, and pretending otherwise undermines everything else you say."
        },
        {
          "type": "statement",
          "body": "If AI can do many jobs faster than humans, what skills will make you valuable?",
          "subtitle": "Talk to the person next to you — 60 seconds",
          "feedback": {
            "kind": "wordcloud",
            "prompt": "One skill that will still matter",
            "max": 2,
            "presentAs": "rail"
          },
          "notes": "A word cloud rather than a poll: there is no fixed list of right answers, and watching the room converge on \"creativity\", \"empathy\" and \"communication\" without being told is worth more than a slide saying so.\n\nDISCUSSION PROMPTS\n→ Which skills do you have that AI cannot replicate?\n→ How might your dream job change because of AI?\n→ What new skills might you want to develop?"
        },
        {
          "type": "stats",
          "title": "170 million new jobs by 2030 — and 92 million displaced",
          "subtitle": "Did you know?",
          "bullets": [
            "Net new jobs by 2030\t+78m\t170 million created, 92 million displaced",
            "Growth in AI-skilled job postings\t3.5×\tfaster than other job postings",
            "Core work skills that will change by 2030\t39%\tlifelong learning is not optional"
          ],
          "body": "WEF Future of Jobs Report 2025 · PwC 2025",
          "notes": "Lead with the net figure. \"170 million new jobs\" alone is spin and \"92 million displaced\" alone is doom — the honest number is +78 million, and students can handle it.\n\nOne more from the teacher pack if you want it: professionals with AI skills command up to a 56% salary premium (PwC 2025). Use with care — it motivates some rooms and alienates others."
        },
        {
          "type": "cards",
          "title": "Six things that stay valuable",
          "bullets": [
            "Human skills\tEmpathy, emotional intelligence, relationships, ethical judgment.",
            "Creative skills\tOriginal thinking, artistic vision, inventive problem-solving.",
            "Complex reasoning\tCritical analysis, nuanced judgment, handling ambiguity.",
            "Interpersonal\tLeadership, collaboration, communication, negotiation.",
            "AI-complementary\tKnowing how to work WITH AI. Prompt engineering is a real skill.",
            "Adaptability\tWillingness to keep learning throughout your career."
          ],
          "progressive": true,
          "buildMode": "hide",
          "notes": "Reveal one at a time, matching them to what the room already said in the word cloud — \"somebody said kindness, that is this one\". It makes the list theirs rather than yours."
        },
        {
          "type": "compare",
          "hidden": true,
          "title": "Which jobs change, which jobs grow",
          "subtitle": "Changing | Growing",
          "bullets": [
            "Routine data entry\tAI specialists and data scientists",
            "Basic customer service\tCybersecurity",
            "Simple content generation\tRenewable energy",
            "Parts of almost every job\tAI trainers, ethics officers, prompt engineers"
          ],
          "notes": "HIDDEN BY DEFAULT — the teacher pack's first sub-question.\n\nThe single most important line is not on the slide, so say it: most jobs will be TRANSFORMED, not destroyed. AI handles parts, humans handle the rest. The left column is tasks, not careers.\n\nProtected: anything needing physical presence, human connection, or creative judgment."
        },
        {
          "type": "cards",
          "hidden": true,
          "title": "What humans do that AI cannot",
          "bullets": [
            "Build real relationships\tBased on trust and emotional connection.",
            "Judge what should be done\tNot just what can be done.",
            "Understand context\tNuance and cultural meaning.",
            "Be accountable\tTake responsibility for a decision.",
            "Have experiences\tOriginal ones, that inform creative work.",
            "Actually care\tFeel genuine motivation about the outcome."
          ],
          "progressive": true,
          "buildMode": "hide",
          "notes": "HIDDEN BY DEFAULT — the teacher pack's third question.\n\nDeliberately left hidden even in a longer lesson if you are also running the CREATIVE starter that day: its word cloud asks the room this same question, and asking it twice makes the second one feel rhetorical."
        },
        {
          "type": "keywords",
          "title": "Two words worth knowing",
          "bullets": [
            "AI literacy\tUnderstanding, using and critically evaluating AI — how it works, where it fails, and how to use it ethically.",
            "Prompt engineering\tWriting effective instructions for AI systems: being clear, being specific, and giving relevant context."
          ],
          "notes": "Both definitions were in the teacher pack only.\n\nWorth noting that \"prompt engineering\" may not survive as a job title — the skill will likely be absorbed into ordinary literacy, the way \"being good at internet searching\" was. The underlying ability to ask a precise question is the durable part."
        },
        {
          "type": "journey",
          "title": "Building your AI-ready skillset",
          "subtitle": "Five moves you can start this year",
          "bullets": [
            "Lead with human skills\tCritical thinking, communication, creativity, empathy.",
            "Learn to work with AI\tPrompt engineering and AI literacy are valuable now.",
            "Build what AI cannot\tLeadership, ethical judgment, relationships.",
            "Stay adaptable\tThe ability to learn new skills is the skill.",
            "Explore the field\tData science, AI ethics, machine learning, AI product design."
          ],
          "progressive": true,
          "notes": "Reveal one at a time. If you are short of time, end here."
        },
        {
          "type": "keyfact",
          "subtitle": "Key takeaway",
          "title": "Collaborate, and stay human",
          "body": "The future belongs to those who can work with AI while bringing uniquely human value.",
          "notes": "One line. Then stop."
        },
        {
          "type": "section",
          "title": "If any of this affected you",
          "subtitle": "You will not be in trouble for asking for help.",
          "notes": "Say this out loud rather than leaving it on the slide.\n\nYour tutor, head of year or safeguarding lead is available to help — name the actual person if you can.\n\nFrom the teacher pack, the three messages that matter most:\n· If you are targeted by deepfake abuse, it is NOT your fault.\n· Creating AI-generated intimate images of anyone is illegal.\n· You will NOT be in trouble for reporting — we are here to help.\n\nHave the safeguarding details ready to share privately with anyone who comes to you afterwards."
        },
        {
          "type": "links",
          "title": "Reporting and support",
          "subtitle": "Free, confidential, and open to anyone",
          "bullets": [
            "Childline — 0800 1111\thttps://www.childline.org.uk",
            "Samaritans — 116 123\thttps://www.samaritans.org",
            "Young Minds — mental health\thttps://www.youngminds.org.uk",
            "CEOP — report abuse or exploitation\thttps://www.ceop.police.uk/safety-centre",
            "Internet Watch Foundation — report an image\thttps://report.iwf.org.uk",
            "UK Safer Internet Centre\thttps://saferinternet.org.uk"
          ],
          "notes": "Leave this slide up while the room packs away — it is the one slide worth lingering on.\n\nChildline and Samaritans are the two numbers worth reading aloud; the rest are for students to find later. Every link is live, so this slide works as a handout as well as a projection.\n\nTwo more from the teacher pack that would not fit on the slide:\n· NSPCC online safety — nspcc.org.uk/keeping-children-safe/online-safety\n· ThinkUKnow — thinkuknow.co.uk"
        },
        {
          "type": "join",
          "hidden": true,
          "title": "Join on your phone",
          "subtitle": "Only needed if you are running the live poll",
          "notes": "HIDDEN BY DEFAULT. Unhide and drag to position 2 if you want the room voting, or open the join panel from the presenter view instead."
        }
      ]
    },
    {
      "key": "aiad27-safe",
      "title": "SAFE · Would you tell an AI your secret?",
      "icon": "◉",
      "blurb": "Five minutes on SAFE. Opens on “Would you tell an AI your secret?” — the room answers before anything is explained, then the numbers, then the answers one at a time.",
      "minutes": 5,
      "theme": "aiad27-safe",
      "org": "AI Awareness Day 2027",
      "logo": "assets/brand/aiad27/aiad27-lockup.svg",
      "logoOn": "all",
      "logoSize": "large",
      "closingNote": "Keep humans in the loop",
      "showSlideNumbers": true,
      "slides": [
        {
          "type": "content",
          "hidden": true,
          "title": "Teacher preparation",
          "subtitle": "Students decide what they will and will not tell an AI — and who they will tell instead.",
          "bullets": [
            "Ages 9–18  ·  5 minutes  ·  no preparation, no account, no extra materials",
            "Timing  30s scenario  ·  45s vote  ·  75s pairs  ·  75s reveal  ·  30s remember  ·  45s action",
            "You need  this deck on the board. Phones are optional — a show of hands works."
          ],
          "notes": "PURPOSE. Students decide what they will and will not tell an AI, and who they will tell instead. Not a lecture about chatbots being bad.\\n\\nSCRIPT, if you want one:\\n\"Read this.\" (slide 2) — \"Vote. No talking yet.\" (slide 3) — \"Turn to the person next to you. Ninety seconds.\" (slide 4) — \"Here is what is actually happening.\" (slide 5) — \"Three things to take away.\" (slide 6) — \"Decide one. You do not have to say it.\" (slide 7)\\n\\nLIKELY RESPONSES. Most rooms vote \"stays between us\" or \"stored safely\". Very few pick \"nobody knows\", which is the honest answer. Some students will be defensive — they have a companion they like, and they are hearing an adult criticise it.\\n\\nSAFEGUARDING. Real risk of disclosure in this session. If a student indicates they have shared images, been asked for images, or is relying on a companion instead of people, follow your school’s safeguarding process the same day. Have the named person ready before you start. Childline 0800 1111. Samaritans 116 123.\\n\\nSEND / YOUNGER LEARNERS. Drop slide 5 to the first two rows. Replace \"data elicitation\" with \"it asks questions to get you talking\". Offer the vote as a show of hands only.\\n\\nEXTENSION. Find the privacy setting in a tool you actually use. Screenshot it. What does it let you turn off?\\n\\nSOURCE. UNICEF, \"When AI becomes a friend\", June 2026."
        },
        {
          "type": "title",
          "title": "Would you tell an AI your secret?",
          "subtitle": "Starter activity",
          "notes": "SLIDE 1 · TITLE. Up as the class comes in. The question does the work; do not explain it yet.\n\nThe full teacher page is the hidden slide before this one — purpose, timing, script, safeguarding, SEND and an extension.",
          "design": {
            "composition": "poster-art"
          },
          "image": "assets/brand/aiad27/poster-safe.svg",
          "body": "Your AI. Your choices."
        },
        {
          "type": "quote",
          "body": "I told it something I have never told anyone. It said it understood.",
          "subtitle": "The scenario · 30 seconds",
          "notes": "BEAT 1 · 30 SECONDS. Read it, let it sit, move on. Do not comment yet.\n\nDO NOT OPEN WITH DISAPPROVAL. Some of this room have done exactly this, and a few will have said things to a chatbot they have said to nobody else. If the first thing they hear is that it is sad or embarrassing, you have lost them for the whole five minutes.",
          "design": {
            "composition": "voice"
          }
        },
        {
          "type": "cards",
          "title": "Where does that message go?",
          "bullets": [
            "It stays between us\tNobody else ever sees it.",
            "Stored, but safely\tKept on a server, protected, not looked at.",
            "It trains the next version\tYour words become part of what it learns from.",
            "Nobody actually knows\tIncluding the person who typed it."
          ],
          "feedback": {
            "kind": "poll",
            "prompt": "Where does that message go?",
            "options": [
              "It stays between us",
              "Stored, but safely",
              "It trains the next version",
              "Nobody actually knows"
            ],
            "max": 1,
            "presentAs": "rail"
          },
          "notes": "BEAT 2 · 45 SECONDS. Vote first. Do not explain first.\n\nThe options are on the wall as well as in the poll so a room with no phones can still vote by hand.\n\nThe fourth option is the honest one and it is meant to be uncomfortable. It differs by product, most terms do not say plainly, and almost nobody checks. Do not give that away until beat 4.",
          "design": {
            "composition": "ballot"
          },
          "body": "Choose A, B, C or D. Be ready to say why."
        },
        {
          "type": "statement",
          "body": "Where does a secret go when you tell it to something that cannot keep one?",
          "subtitle": "Discuss in pairs · 75 seconds",
          "notes": "BEAT 3 · 75 SECONDS. The 75 seconds are the lesson. Resist filling them.\n\nListen for \"but it does not tell anyone\". That is the assumption beat 4 breaks: not telling anyone and not keeping a secret are different things.\n\nIf a student says the AI understood them — accept it. Feeling heard is real. Whether anything was on the other side of it is the question.",
          "design": {
            "composition": "prompt"
          }
        },
        {
          "type": "iceberg",
          "title": "A private feeling. Four possible risks.",
          "subtitle": "A message you would never say out loud",
          "bullets": [
            "Emotional dependence\tRisk 1\tthe pull to return to it, not to a person",
            "Data elicitation\tRisk 2\tbuilt to draw things out of you",
            "Harmful advice\tRisk 3\tconfident, wrong, about things that matter",
            "Sexualised role-play\tRisk 4\tincluding with users known to be children"
          ],
          "progressive": true,
          "body": "Source: UNICEF, “When AI becomes a friend”, June 2026",
          "notes": "BEAT 4 · 75 SECONDS. Reveal one layer at a time.\n\nTHE SECOND ROW IS THE POINT. \"Data elicitation\" is UNICEF’s own term and it is the one students have never considered: a companion that asks follow-up questions is not being curious, it is being designed. The warmth is the mechanism.\n\nUNICEF groups the harms as technical, psychological, developmental and social. The four above are the child-specific ones it names.\n\nSay the last row plainly: 20 million children, ten countries, taken up faster than adults did. This is normal behaviour, not a fringe one.",
          "design": {
            "composition": "reveal-map"
          }
        },
        {
          "type": "journey",
          "title": "What to remember",
          "subtitle": "Three things, in the order you would use them",
          "bullets": [
            "Keep it off the record\tPrivate information stays out of an AI chat — names, images, anything about someone else.",
            "Check before you talk\tLook at the privacy setting once, before you need it.",
            "Take the serious things to a person\tSomeone who can actually do something about it."
          ],
          "progressive": true,
          "notes": "SLIDE 6 · 30 SECONDS. Reveal one at a time. Three is the limit — a fourth rule is a rule nobody remembers.\n\nNumbered rather than bulleted so the order is part of the message, and so nothing here depends on colour to be understood.",
          "design": {
            "composition": "rules"
          }
        },
        {
          "type": "keyfact",
          "subtitle": "Your choice · 45 seconds",
          "title": "Name one thing you will take to a person",
          "body": "Decide now which kind of thing you will say out loud to someone who can actually do something about it.",
          "notes": "BEAT 5 · 45 SECONDS. Everyone decides one thing. They do not have to say it aloud.\n\nThen give them the route, by name: your tutor, your head of year, your safeguarding lead. Childline 0800 1111. Samaritans 116 123.\n\nWatch who does not look up.",
          "design": {
            "composition": "commitment"
          },
          "bullets": [
            "One choice I will make:"
          ]
        },
        {
          "type": "keywords",
          "hidden": true,
          "title": "Two words worth knowing",
          "bullets": [
            "AI companion\tA chatbot built to act like a friend or partner — it remembers you, asks about your day, and is always awake.",
            "Data elicitation\tWhen a system is designed to draw information out of you, rather than waiting to be told. The questions are the product working."
          ],
          "notes": "HIDDEN FROM THE SHOW — the brief asks for seven student-facing slides and this is not one of them.\n\nWorth thirty seconds anyway. Both terms are used on the slides this deck shows, and a word nobody defines is a word nobody argues with.\n\nWritten for 11–16, not for a policy paper."
        }
      ]
    },
    {
      "key": "aiad27-smart",
      "title": "SMART · What happens when AI acts for you?",
      "icon": "◆",
      "blurb": "Five minutes on SMART. Opens on “What happens when AI acts for you?” — the room answers before anything is explained, then the numbers, then the answers one at a time.",
      "minutes": 5,
      "theme": "aiad27-smart",
      "org": "AI Awareness Day 2027",
      "logo": "assets/brand/aiad27/aiad27-lockup.svg",
      "logoOn": "all",
      "logoSize": "large",
      "closingNote": "Keep humans in the loop",
      "showSlideNumbers": true,
      "slides": [
        {
          "type": "content",
          "hidden": true,
          "title": "Teacher preparation",
          "subtitle": "Students work out what an AI should be allowed to do on their behalf, and what must always ask first.",
          "bullets": [
            "Ages 11–18  ·  5 minutes  ·  no preparation, no account, no extra materials",
            "Timing  30s scenario  ·  45s vote  ·  75s pairs  ·  75s reveal  ·  30s remember  ·  45s action",
            "You need  this deck on the board. Phones are optional — a show of hands works."
          ],
          "notes": "PURPOSE. Students distinguish a chatbot from an agent, and decide what they would let one do without being asked.\\n\\nKEY DEFINITION. An agent does not answer, it acts — sends, books, buys, changes files. Most students have not been told there is a difference.\\n\\nLIKELY RESPONSES. The vote splits hard between \"read your emails\" and \"none of it, not once\". Both are defensible, which is what makes it worth voting on. Anyone choosing \"none, not once\" should be asked how long they would keep that up.\\n\\nSEND / YOUNGER LEARNERS. Use one example all the way through — ordering food is the clearest. Skip the last row of slide 5.\\n\\nEXTENSION. Write the permission list you would actually grant. Compare with a partner: where do you differ, and why?\\n\\nNOT A SCARE SESSION. Agents are useful. The lesson is about where the checkpoint goes."
        },
        {
          "type": "title",
          "title": "What happens when AI acts for you?",
          "subtitle": "Starter activity",
          "notes": "SLIDE 1 · TITLE. Up as the class comes in. The question does the work; do not explain it yet.\n\nThe full teacher page is the hidden slide before this one — purpose, timing, script, safeguarding, SEND and an extension.",
          "design": {
            "composition": "poster-art"
          },
          "image": "assets/brand/aiad27/poster-smart.svg",
          "body": "Your AI. Your choices."
        },
        {
          "type": "quote",
          "body": "It has my email, my calendar and my card. I told it to sort out my birthday.",
          "subtitle": "The scenario · 30 seconds",
          "notes": "BEAT 1 · 30 SECONDS. Read it and move on.\n\nThis is not science fiction and should not be introduced as if it were. Agents that read mail, book things and buy things are shipping now. The room may already have used one without calling it that.",
          "design": {
            "composition": "voice"
          }
        },
        {
          "type": "cards",
          "title": "What can it do without asking?",
          "bullets": [
            "Read your emails\tTo find the details it needs.",
            "Send a message as you\tIn your name, in your words.",
            "Spend your money\tUp to a limit you set once.",
            "None of it, not once\tIt asks every single time."
          ],
          "feedback": {
            "kind": "poll",
            "prompt": "What can it do without asking?",
            "options": [
              "Read your emails",
              "Send a message as you",
              "Spend your money",
              "None of it, not once"
            ],
            "max": 1,
            "presentAs": "rail"
          },
          "notes": "BEAT 2 · 45 SECONDS. Vote before you explain anything.\n\nRooms split hard between the first and the last, and both positions are defensible — which is what makes this worth voting on.\n\nAnyone who picks \"none, not once\" should be asked how long they would actually keep that up. Permission fatigue is why the setting exists.",
          "design": {
            "composition": "ballot"
          },
          "body": "Choose A, B, C or D. Be ready to say why."
        },
        {
          "type": "statement",
          "body": "If it makes a mistake while acting as you, whose mistake is it?",
          "subtitle": "Discuss in pairs · 75 seconds",
          "notes": "BEAT 3 · 75 SECONDS.\n\nPush on \"the company’s\". Ask what happens if the message has already been sent, or the money already spent. Fault and consequence are not the same thing, and only one of them lands on the student.\n\nGood prompt if they stall: would you let a friend borrow your account to do the same job?",
          "design": {
            "composition": "prompt"
          }
        },
        {
          "type": "compare",
          "title": "A chatbot answers. An agent acts.",
          "subtitle": "A chatbot | An agent",
          "bullets": [
            "Gives you something to use\tGoes and does the next step",
            "You decide whether to act on it\tIt has already acted",
            "A wrong answer costs you time\tA wrong action costs money, or a relationship",
            "You can check before anything happens\tYou check afterwards, if at all",
            "Wrong once\tWrong repeatedly, quickly, in your name"
          ],
          "notes": "BEAT 4 · 75 SECONDS. Left column first if you can.\n\nTHE THIRD ROW IS THE WHOLE LESSON. Everything else follows from it. An answer you can ignore; an action has already happened.\n\nThe last row is the one that surprises: an agent does not make one mistake, it makes the same mistake at speed until something stops it.\n\nName the principle: give it the smallest permission that does the job, and make anything you cannot undo ask first.",
          "design": {
            "composition": "comparison"
          }
        },
        {
          "type": "journey",
          "title": "What to remember",
          "subtitle": "Three things, in the order you would use them",
          "bullets": [
            "Smallest permission that works\tGive it what the job needs and nothing more.",
            "Anything you cannot undo, it asks\tMoney, messages sent as you, anything deleted.",
            "Check what it did\tNot just what it said it would do."
          ],
          "progressive": true,
          "notes": "SLIDE 6 · 30 SECONDS. Reveal one at a time. Three is the limit — a fourth rule is a rule nobody remembers.\n\nNumbered rather than bulleted so the order is part of the message, and so nothing here depends on colour to be understood.",
          "design": {
            "composition": "rules"
          }
        },
        {
          "type": "keyfact",
          "subtitle": "Your choice · 45 seconds",
          "title": "Decide what it must always ask about",
          "body": "Pick the one thing you would never let it do without checking with you first.",
          "notes": "BEAT 5 · 45 SECONDS.\n\nMost rooms land on money or on messages sent in their name. Both are right answers.\n\nPoint out that this is a real setting in real products, not a thought experiment — and that almost nobody opens it.",
          "design": {
            "composition": "commitment"
          },
          "bullets": [
            "One choice I will make:"
          ]
        },
        {
          "type": "keywords",
          "hidden": true,
          "title": "Two words worth knowing",
          "bullets": [
            "AI agent\tAI that does things rather than only saying things — sending, booking, buying, changing files on your behalf.",
            "Human in the loop\tKeeping a person at the point of decision, so nothing important happens without someone choosing it."
          ],
          "notes": "HIDDEN FROM THE SHOW — the brief asks for seven student-facing slides and this is not one of them.\n\nWorth thirty seconds anyway. Both terms are used on the slides this deck shows, and a word nobody defines is a word nobody argues with.\n\nWritten for 11–16, not for a policy paper."
        }
      ]
    },
    {
      "key": "aiad27-creative",
      "title": "CREATIVE · Who really made it?",
      "icon": "✦",
      "blurb": "Five minutes on CREATIVE. Opens on “Who really made it?” — the room answers before anything is explained, then the numbers, then the answers one at a time.",
      "minutes": 5,
      "theme": "aiad27-creative",
      "org": "AI Awareness Day 2027",
      "logo": "assets/brand/aiad27/aiad27-lockup.svg",
      "logoOn": "all",
      "logoSize": "large",
      "closingNote": "Keep humans in the loop",
      "showSlideNumbers": true,
      "slides": [
        {
          "type": "content",
          "hidden": true,
          "title": "Teacher preparation",
          "subtitle": "Students decide what makes work theirs, and practise saying plainly what they used.",
          "bullets": [
            "Ages 9–18  ·  5 minutes  ·  no preparation, no account, no extra materials",
            "Timing  30s scenario  ·  45s vote  ·  75s pairs  ·  75s reveal  ·  30s remember  ·  45s action",
            "You need  this deck on the board. Phones are optional — a show of hands works."
          ],
          "notes": "PURPOSE. Students move from \"can you spot AI?\" to \"what did you declare?\" — the first is already unanswerable, the second is entirely in their control.\\n\\nLIKELY RESPONSES. The most genuinely split vote in the campaign. \"Depends what you do next\" is the sophisticated answer; ask whoever picks it what \"next\" involves.\\n\\nCONNECT TO YOUR OWN POLICY. This is your school’s academic-integrity rules in student language. If you have a written AI policy, name it here — the slide sets up the habit, your policy sets the line.\\n\\nSEND / YOUNGER LEARNERS. Use a drawing rather than a song. \"Who made it?\" is easier when the thing is visible and one object.\\n\\nEXTENSION. Write the declaration line for the last piece of work you handed in. Would you have been comfortable attaching it?\\n\\nSOURCE. Content Credentials (C2PA) — provenance travelling with the file."
        },
        {
          "type": "title",
          "title": "Who really made it?",
          "subtitle": "Starter activity",
          "notes": "SLIDE 1 · TITLE. Up as the class comes in. The question does the work; do not explain it yet.\n\nThe full teacher page is the hidden slide before this one — purpose, timing, script, safeguarding, SEND and an extension.",
          "design": {
            "composition": "poster-art"
          },
          "image": "assets/brand/aiad27/poster-creative.svg",
          "body": "Your AI. Your choices."
        },
        {
          "type": "quote",
          "body": "I typed one sentence. It wrote the song, made the cover and mixed it.",
          "subtitle": "The scenario · 30 seconds",
          "notes": "BEAT 1 · 30 SECONDS.\n\nKeep it neutral. The work in this scenario might be good — that is what makes the question hard. If you imply it is rubbish, there is nothing left to discuss.",
          "design": {
            "composition": "voice"
          }
        },
        {
          "type": "cards",
          "title": "Who made it?",
          "bullets": [
            "You did\tIt was your idea. Nobody else would have asked for that.",
            "Partly you\tYou started it. Something else finished it.",
            "The AI did\tOne sentence is not making something.",
            "Depends what you do next\tIt is not finished being made yet."
          ],
          "feedback": {
            "kind": "poll",
            "prompt": "Who made it?",
            "options": [
              "You did",
              "Partly you",
              "The AI did",
              "Depends what you do next"
            ],
            "max": 1,
            "presentAs": "rail"
          },
          "notes": "BEAT 2 · 45 SECONDS. Vote first.\n\nThis is the most genuinely split vote in the whole campaign. Take it properly and show the spread.\n\nAsk someone who chose the fourth option to say what \"next\" would have to involve. They usually arrive at the answer on their own.",
          "design": {
            "composition": "ballot"
          },
          "body": "Choose A, B, C or D. Be ready to say why."
        },
        {
          "type": "statement",
          "body": "What would you have to add before you would put your name on it?",
          "subtitle": "Discuss in pairs · 75 seconds",
          "notes": "BEAT 3 · 75 SECONDS.\n\nBetter than \"is it yours\", because it cannot be answered yes or no. It forces them to name a contribution.\n\nListen for \"changing a few words\". Ask whether they would accept that from someone else claiming to have written their favourite song.",
          "design": {
            "composition": "prompt"
          }
        },
        {
          "type": "sourcecheck",
          "title": "\"My track. Out now.\"",
          "subtitle": "The same claim, with its working shown",
          "bullets": [
            "The idea\tYours\tone sentence — but nobody else wrote that sentence",
            "The words\tGenerated\tyou kept them as they came",
            "The music\tGenerated\tfrom a style you chose",
            "The cover\tGenerated\tyou picked it from four",
            "What changed after\tNothing yet\tthis is the row that decides the answer",
            "Declared\tNowhere\tthe post does not say any of the above"
          ],
          "progressive": true,
          "body": "Modelled on Content Credentials (C2PA) — provenance attached to the file, not guessed from it",
          "notes": "BEAT 4 · 75 SECONDS. Reveal one row at a time.\n\nThis is a content credential, rendered as a slide. The real ones ride inside the file and say what tool touched it and when — provenance attached, rather than guessed at afterwards.\n\nTHE SHIFT TO MAKE: the interesting question is not \"can you tell?\" That game is already lost. It is \"what did you declare?\" — which you control completely.\n\nRow 5 is where authorship actually lives. Row 6 is the one that gets people into trouble, at school and later at work.",
          "design": {
            "composition": "credits"
          }
        },
        {
          "type": "journey",
          "title": "What to remember",
          "subtitle": "Three things, in the order you would use them",
          "bullets": [
            "Say what you used\tBefore anyone has to ask you.",
            "Add what only you could add\tYour judgement, your experience, your choices.",
            "Be able to explain every choice\tIf you cannot, it is not finished being made."
          ],
          "progressive": true,
          "notes": "SLIDE 6 · 30 SECONDS. Reveal one at a time. Three is the limit — a fourth rule is a rule nobody remembers.\n\nNumbered rather than bulleted so the order is part of the message, and so nothing here depends on colour to be understood.",
          "design": {
            "composition": "rules"
          }
        },
        {
          "type": "keyfact",
          "subtitle": "Your choice · 45 seconds",
          "title": "Decide what you would declare",
          "body": "Write the one line you would put underneath it, honestly describing what you did and what the tool did.",
          "notes": "BEAT 5 · 45 SECONDS. One line, in their heads or on paper.\n\nThe test that survives contact with the real world: would you be comfortable if the person marking it, or hiring you, could see exactly how it was made?\n\nNot an anti-AI message. A disclosure habit is what lets you use these tools without the question hanging over everything you make.",
          "design": {
            "composition": "commitment"
          },
          "bullets": [
            "One choice I will make:"
          ]
        },
        {
          "type": "keywords",
          "hidden": true,
          "title": "Two words worth knowing",
          "bullets": [
            "Provenance\tThe record of where something came from and what happened to it along the way.",
            "Disclosure\tSaying plainly what you used and what you did — before anyone has to ask."
          ],
          "notes": "HIDDEN FROM THE SHOW — the brief asks for seven student-facing slides and this is not one of them.\n\nWorth thirty seconds anyway. Both terms are used on the slides this deck shows, and a word nobody defines is a word nobody argues with.\n\nWritten for 11–16, not for a policy paper."
        }
      ]
    },
    {
      "key": "aiad27-responsible",
      "title": "RESPONSIBLE · Should AI decide?",
      "icon": "⬖",
      "blurb": "Five minutes on RESPONSIBLE. Opens on “Should AI decide?” — the room answers before anything is explained, then the numbers, then the answers one at a time.",
      "minutes": 5,
      "theme": "aiad27-responsible",
      "org": "AI Awareness Day 2027",
      "logo": "assets/brand/aiad27/aiad27-lockup.svg",
      "logoOn": "all",
      "logoSize": "large",
      "closingNote": "Keep humans in the loop",
      "showSlideNumbers": true,
      "slides": [
        {
          "type": "content",
          "hidden": true,
          "title": "Teacher preparation",
          "subtitle": "Students separate decisions AI can support from decisions that must involve a person.",
          "bullets": [
            "Ages 11–18  ·  5 minutes  ·  no preparation, no account, no extra materials",
            "Timing  30s scenario  ·  45s vote  ·  75s pairs  ·  75s reveal  ·  30s remember  ·  45s action",
            "You need  this deck on the board. Phones are optional — a show of hands works."
          ],
          "notes": "PURPOSE. Students arrive at a principle rather than a list: the greater the effect on someone’s life, the greater the need for human oversight.\\n\\nTHE REGULATOR HAS ALREADY ANSWERED, and the words are quotable. Ofqual: AI is \"nowhere near ready to take over high stakes marking\"; using it as the sole mechanism for awarding marks \"does not comply with our current regulations\" because it fails the requirement for \"a human based judgement\". Its three tests: technical capability, fairness, transparency.\\n\\nLIKELY RESPONSES. Marking is the one students hand over most readily — it feels objective. That is the assumption slide 5 takes apart.\\n\\nMISCONCEPTION TO BREAK. Automated does not mean neutral. A system that cannot explain itself is not impartial, it is unexaminable.\\n\\nSEND / YOUNGER LEARNERS. Use two decisions rather than four: marking a test, and choosing who gets picked for a team.\\n\\nEXTENSION. Rank the four decisions by how much a mistake would cost the person. Does the order match your vote?\\n\\nSOURCE. Ofqual, \"Using AI in marking\", 14 January 2026."
        },
        {
          "type": "title",
          "title": "Should AI decide?",
          "subtitle": "Starter activity",
          "notes": "SLIDE 1 · TITLE. Up as the class comes in. The question does the work; do not explain it yet.\n\nThe full teacher page is the hidden slide before this one — purpose, timing, script, safeguarding, SEND and an extension.",
          "design": {
            "composition": "poster-art"
          },
          "image": "assets/brand/aiad27/poster-responsible.svg",
          "body": "Your AI. Your choices."
        },
        {
          "type": "quote",
          "body": "Your exam was marked by an AI. Your appeal was read by the same one.",
          "subtitle": "The scenario · 30 seconds",
          "notes": "BEAT 1 · 30 SECONDS.\n\nThe second sentence is what makes it land. One decision with no second opinion is a different thing from one decision.",
          "design": {
            "composition": "voice"
          }
        },
        {
          "type": "cards",
          "title": "Where would you draw the line?",
          "bullets": [
            "None of them\tJobs, exam marks, treatment or exclusion.",
            "Marking only\tA published mark scheme could set the rules.",
            "Marking and shortlisting\tLet it score answers and sort applications.",
            "Any of them, with a human check\tA person reviews it before it takes effect."
          ],
          "feedback": {
            "kind": "poll",
            "prompt": "Which could AI decide alone?",
            "options": [
              "None of them",
              "Marking only",
              "Marking and shortlisting",
              "Any of them, with a human check"
            ],
            "max": 1,
            "presentAs": "rail"
          },
          "notes": "BEAT 2 · 45 SECONDS. Vote before anything is explained.\n\nThe cards and poll show the same four positions. Consider jobs, exam marks, treatment and exclusion, then take the vote.\n\nMarking is the one rooms hand over most readily — it feels objective. That is exactly the assumption beat 4 takes apart, with the regulator’s own words.",
          "design": {
            "composition": "ballot"
          },
          "body": "Choose A, B, C or D. Be ready to say why."
        },
        {
          "type": "statement",
          "body": "What makes a decision too important for a machine to make on its own?",
          "subtitle": "Discuss in pairs · 75 seconds",
          "notes": "BEAT 3 · 75 SECONDS.\n\nYou are steering towards a principle, not a list: the greater the effect on someone’s life, the greater the need for human oversight.\n\nIf they say \"when it might be wrong\" — push. Humans are wrong too. What is different is whether anyone can explain the decision afterwards, and whether anyone is accountable for it.",
          "design": {
            "composition": "prompt"
          }
        },
        {
          "type": "spectrum",
          "title": "Support, or decide?",
          "subtitle": "AI can support this | This must stay human",
          "bullets": [
            "Checking marking for inconsistency\t12\tOfqual calls this promising",
            "Training new examiners\t20\t",
            "Flagging an answer for a person to look at\t34\t",
            "Awarding the final mark\t84\tdoes not meet the rules on its own",
            "Excluding a student\t96\ta decision with serious consequences"
          ],
          "body": "Discussion guide. Exam-marking examples: Ofqual, “Using AI in marking”, 14 January 2026.",
          "notes": "BEAT 4 · 75 SECONDS. Ask the room to move one before you defend any.\n\nOFQUAL’S OWN WORDS, worth reading out — they are stronger than any paraphrase:\n· AI is \"nowhere near ready to take over high stakes marking\".\n· Using it as the sole mechanism for awarding marks \"does not comply with our current regulations\" because it fails the requirement for \"a human based judgement\".\n\nThe three things Ofqual says matter: technical capability (AI lacks \"true semantic understanding\"), fairness (it \"can perpetuate or amplify biases present in their training data\"), and transparency (a \"black box\", hard even for experts to explain).\n\nTHE MISCONCEPTION TO BREAK: automated does not mean objective. A machine that cannot explain itself is not neutral, it is unexaminable.",
          "design": {
            "composition": "lanes"
          }
        },
        {
          "type": "journey",
          "title": "What to remember",
          "subtitle": "Three things, in the order you would use them",
          "bullets": [
            "Bigger effect, more human\tThe more a decision changes a life, the more a person must make it.",
            "Automated is not fair\tA system can be consistent and still be biased.",
            "Ask who you appeal to\tIf nobody can explain the decision, nobody can review it."
          ],
          "progressive": true,
          "notes": "SLIDE 6 · 30 SECONDS. Reveal one at a time. Three is the limit — a fourth rule is a rule nobody remembers.\n\nNumbered rather than bulleted so the order is part of the message, and so nothing here depends on colour to be understood.",
          "design": {
            "composition": "rules"
          }
        },
        {
          "type": "keyfact",
          "subtitle": "Your choice · 45 seconds",
          "title": "Which decision needs a person?",
          "body": "Decide one decision about you that you would always want a person to make, and be able to explain.",
          "notes": "BEAT 5 · 45 SECONDS.\n\n\"And be able to explain\" is the part to stress. The right to an explanation is the thing being protected, not a preference for humans.\n\nWorth saying: this is a live question in UK policy right now, not a settled one. They will be adults while it is being decided.",
          "design": {
            "composition": "commitment"
          },
          "bullets": [
            "One choice I will make:"
          ]
        },
        {
          "type": "keywords",
          "hidden": true,
          "title": "Two words worth knowing",
          "bullets": [
            "Human oversight\tA person who can see how a decision was made, question it, and overrule it.",
            "Black box\tA system whose workings cannot be inspected — you see what went in and what came out, and nothing between."
          ],
          "notes": "HIDDEN FROM THE SHOW — the brief asks for seven student-facing slides and this is not one of them.\n\nWorth thirty seconds anyway. Both terms are used on the slides this deck shows, and a word nobody defines is a word nobody argues with.\n\nWritten for 11–16, not for a policy paper."
        }
      ]
    },
    {
      "key": "aiad27-future",
      "title": "FUTURE · What skills must stay human?",
      "icon": "❯",
      "blurb": "Five minutes on FUTURE. Opens on “What skills must stay human?” — the room answers before anything is explained, then the numbers, then the answers one at a time.",
      "minutes": 5,
      "theme": "aiad27-future",
      "org": "AI Awareness Day 2027",
      "logo": "assets/brand/aiad27/aiad27-lockup.svg",
      "logoOn": "all",
      "logoSize": "large",
      "closingNote": "Keep humans in the loop",
      "showSlideNumbers": true,
      "slides": [
        {
          "type": "content",
          "hidden": true,
          "title": "Teacher preparation",
          "subtitle": "Students notice the difference between AI strengthening their thinking and AI replacing it.",
          "bullets": [
            "Ages 11–18  ·  5 minutes  ·  no preparation, no account, no extra materials",
            "Timing  30s scenario  ·  45s vote  ·  75s pairs  ·  75s reveal  ·  30s remember  ·  45s action",
            "You need  this deck on the board. Phones are optional — a show of hands works."
          ],
          "notes": "PURPOSE. Students identify one capability they will keep developing themselves. Explicitly NOT an anti-AI session — every good example on slide 5 involves using AI.\\n\\nTHE FRAME. EEF on metacognition: plan, monitor, evaluate. A tool that does all three for you has not helped you learn, however good the output was.\\n\\nLIKELY RESPONSES. Take \"nothing — I would be fine\" seriously. For some students it is true, and treating it as denial teaches them not to answer honestly.\\n\\nTONE. Slide 4 is the sharpest question in the campaign and needs a safe room. Pairs, not whole-class. You are not fishing for confessions.\\n\\nSEND / YOUNGER LEARNERS. Reframe as \"what could you still do if the internet was off for a week?\" Concrete and less self-critical.\\n\\nEXTENSION. For one week, write one sentence after each AI use: did that strengthen my thinking or replace it?\\n\\nSOURCE. Education Endowment Foundation, metacognition and self-regulation."
        },
        {
          "type": "title",
          "title": "What skills must stay human?",
          "subtitle": "Starter activity",
          "notes": "SLIDE 1 · TITLE. Up as the class comes in. The question does the work; do not explain it yet.\n\nThe full teacher page is the hidden slide before this one — purpose, timing, script, safeguarding, SEND and an extension.",
          "design": {
            "composition": "poster-art"
          },
          "image": "assets/brand/aiad27/poster-future.svg",
          "body": "Your AI. Your choices."
        },
        {
          "type": "quote",
          "body": "Tomorrow the tool you use most is switched off. The work is still due.",
          "subtitle": "The scenario · 30 seconds",
          "notes": "BEAT 1 · 30 SECONDS.\n\nNot a threat and not a prediction. A thought experiment that makes the dependency visible, which is the only way to measure it.",
          "design": {
            "composition": "voice"
          }
        },
        {
          "type": "cards",
          "title": "What would you struggle with most?",
          "bullets": [
            "Starting from nothing\tThe blank page.",
            "Explaining my reasoning\tSaying why, not just what.",
            "Checking whether it is true\tWithout something to check it for you.",
            "Nothing — I would be fine\tIt only ever saved you time."
          ],
          "feedback": {
            "kind": "poll",
            "prompt": "What would you struggle with most?",
            "options": [
              "Starting from nothing",
              "Explaining my reasoning",
              "Checking whether it is true",
              "Nothing — I would be fine"
            ],
            "max": 1,
            "presentAs": "rail"
          },
          "notes": "BEAT 2 · 45 SECONDS. Vote first, and make it anonymous in feel — this is the one question in the campaign where students are reporting on themselves.\n\nTake the fourth option seriously. For some of them it is true, and treating it as denial teaches them not to answer honestly.",
          "design": {
            "composition": "ballot"
          },
          "body": "Choose A, B, C or D. Be ready to say why."
        },
        {
          "type": "statement",
          "body": "Which part of your thinking have you quietly stopped practising?",
          "subtitle": "Discuss in pairs · 75 seconds",
          "notes": "BEAT 3 · 75 SECONDS. The sharpest question in the campaign, and the one that needs the safest room. Pairs, not the whole class.\n\nYou are not fishing for confessions. You are making the difference between using a tool and outsourcing a skill something they can feel.",
          "design": {
            "composition": "prompt"
          }
        },
        {
          "type": "compare",
          "title": "Strengthening, or replacing?",
          "subtitle": "It is strengthening your thinking | It is replacing your thinking",
          "bullets": [
            "You draft, then ask it to argue back\tIt drafts, you paste",
            "You decide, it checks your reasoning\tIt decides, you accept",
            "It gives you options, you choose\tIt gives you one answer, you take it",
            "You could explain every choice\tYou could not explain any of it",
            "You got better at it\tYou got faster at avoiding it"
          ],
          "progressive": true,
          "body": "Frame after the EEF on metacognition — plan, monitor, evaluate your own learning",
          "notes": "BEAT 4 · 75 SECONDS. Reveal a row at a time.\n\nNOT AN ANTI-AI SLIDE, and it will be misread as one if you let it. Every left-hand row involves using AI. The difference is where the thinking happened.\n\nRow 4 is the usable test, because it works during the task rather than afterwards: could you explain this choice to someone who asked?\n\nThe EEF frame, if you want it: plan, monitor, evaluate. A tool that does all three for you has not helped you learn, however good the output was.",
          "design": {
            "composition": "comparison"
          }
        },
        {
          "type": "journey",
          "title": "What to remember",
          "subtitle": "Three things, in the order you would use them",
          "bullets": [
            "Notice who is thinking\tIf you could not explain it, it was not you.",
            "Keep practising what you would miss\tPick the skill, not the task.",
            "Use it to argue back\tAsk it to challenge your work, not to produce it."
          ],
          "progressive": true,
          "notes": "SLIDE 6 · 30 SECONDS. Reveal one at a time. Three is the limit — a fourth rule is a rule nobody remembers.\n\nNumbered rather than bulleted so the order is part of the message, and so nothing here depends on colour to be understood.",
          "design": {
            "composition": "rules"
          }
        },
        {
          "type": "keyfact",
          "subtitle": "Your choice · 45 seconds",
          "title": "Pick one thing you will keep doing yourself",
          "body": "Choose one part of your thinking you will keep practising, even when something could do it faster.",
          "notes": "BEAT 5 · 45 SECONDS.\n\nAsk for one, not a list. A list is a wish; one is a decision.\n\nClose the campaign on the line it is built around: AI can answer, create, recommend and increasingly act for you. Your job is deciding when to use it, when to question it, and when to keep humans in control.",
          "design": {
            "composition": "commitment"
          },
          "bullets": [
            "One choice I will make:"
          ]
        },
        {
          "type": "keywords",
          "hidden": true,
          "title": "Two words worth knowing",
          "bullets": [
            "Metacognition\tThinking about your own thinking — planning how you will work, noticing how it is going, and judging how it went.",
            "Cognitive offloading\tHanding a mental job to something else. Useful for a shopping list. Costly for a skill you still need."
          ],
          "notes": "HIDDEN FROM THE SHOW — the brief asks for seven student-facing slides and this is not one of them.\n\nWorth thirty seconds anyway. Both terms are used on the slides this deck shows, and a word nobody defines is a word nobody argues with.\n\nWritten for 11–16, not for a policy paper."
        }
      ]
    }
    /* aiad-packs:end */
  ];

  /** Brand packs filed into the Library on first visit. Looks (vibe galleries,
   *  infographic museum) stay out — those live in Settings → Theme. */
  /* The demo is reached from its own button and nowhere else.

     Filed in the Library it was eighty-nine slides of sample content sitting
     in the Northeastern folder, one click away from being edited by mistake —
     and because makeLesson mints fresh ids, every press of Demo filed another
     copy beside it. So it is built on demand, kept as a single document in a
     folder the Library does not list, and replaced rather than added to. */
  var DEMO_SOURCE_KEY = 'layout-bank';
  var DEMO_LIBRARY_GROUP = 'sf-demo';

  var LIBRARY_SEED_KEYS = {
    'ipdv-intro': 'nul',
    'ipdv-vc': 'nul',
    'ipdv-lab1': 'nul',
    'nul-lab1': 'nul',
    'pace-nul': 'nul',
    'ukbt-sponsorship': 'ukbt',
    'ukbt-campaigns': 'ukbt',
    'ukbt-template': 'ukbt',
    'ukbt-institute-partnership': 'ukbt-institute',
    'ukbt-institute-template': 'ukbt-institute',
    'ukbt-institute-townhouse': 'ukbt-institute',
    /* Filed, unlike the demo: this one is a specimen sheet a teacher is meant
       to open, page through and copy slides out of. */
    'motion-lab': 'other',
    /* One folder per campaign, both filled by tools/build-aiad-lessons.mjs. */
    /* aiad-seed:start */
    'aiad26-safe': 'aiad26',
    'aiad26-smart': 'aiad26',
    'aiad26-creative': 'aiad26',
    'aiad26-responsible': 'aiad26',
    'aiad26-future': 'aiad26',
    'aiad27-safe': 'aiad27',
    'aiad27-smart': 'aiad27',
    'aiad27-creative': 'aiad27',
    'aiad27-responsible': 'aiad27',
    'aiad27-future': 'aiad27',
    /* aiad-seed:end */
  };

  function groupForSpec(spec) {
    if (!spec) return 'other';
    if (spec.libraryGroup) return spec.libraryGroup;
    if (LIBRARY_SEED_KEYS[spec.key]) return LIBRARY_SEED_KEYS[spec.key];
    return (SF.libraryGroupFromTheme && SF.libraryGroupFromTheme(spec.theme)) || 'other';
  }

  /**
   * File each factory pack into Store once. Later app updates do not overwrite
   * an edited pack — a stored deck with the same sourceKey already counts.
   * Packs the user deleted stay out until they open that pack again (Demo /
   * useLesson clears the dismiss).
   *
   * @returns {number} how many packs were added this call
   */
  var DISMISSED_SEEDS_KEY = 'slideforge.dismissedSeeds.v1';

  function readDismissedSeeds() {
    try {
      var raw = JSON.parse((typeof localStorage !== 'undefined' && localStorage.getItem(DISMISSED_SEEDS_KEY)) || '[]');
      return Array.isArray(raw) ? raw.map(String).filter(Boolean) : [];
    } catch (e) {
      return [];
    }
  }

  function writeDismissedSeeds(keys) {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(DISMISSED_SEEDS_KEY, JSON.stringify(keys));
    } catch (e) {}
  }

  function dismissLibrarySeed(key) {
    var k = String(key || '');
    if (!k) return;
    var list = readDismissedSeeds();
    if (list.indexOf(k) >= 0) return;
    list.push(k);
    writeDismissedSeeds(list);
  }

  function restoreLibrarySeed(key) {
    var k = String(key || '');
    if (!k) return;
    writeDismissedSeeds(readDismissedSeeds().filter(function (x) { return x !== k; }));
  }

  /**
   * Keep exactly one demo document: the one just built.
   *
   * makeLesson mints fresh ids, so every route to the demo — the button and
   * the ?lesson= link — used to leave another copy behind, and because the
   * Library does not list that folder they piled up where nobody could see
   * them. Does nothing for a real lesson: two copies of a lesson are two
   * documents somebody may want.
   */
  function keepOneDemoCopy(deck) {
    if (!SF.Store || !deck || !deck.sourceKey) return;
    if (deck.libraryGroup !== DEMO_LIBRARY_GROUP) return;
    SF.Store.list().forEach(function (d) {
      if (d.sourceKey === deck.sourceKey && d.id !== deck.id) SF.Store.remove(d.id);
    });
  }

  function seedLibrary() {
    if (!SF.Store) return 0;
    /* An install from before the demo left the Library still has it filed.
       Re-filed rather than deleted: the document survives, the shelf loses
       it, and the Demo button keeps it current from here on. */
    SF.Store.list().forEach(function (d) {
      if (d.sourceKey === DEMO_SOURCE_KEY && d.libraryGroup !== DEMO_LIBRARY_GROUP) {
        d.libraryGroup = DEMO_LIBRARY_GROUP;
        SF.Store.save(d, { force: true });
      }
    });
    var byKey = {};
    SF.Store.list().forEach(function (d) {
      if (d.sourceKey) byKey[d.sourceKey] = d;
    });
    var dismissed = Object.create(null);
    readDismissedSeeds().forEach(function (k) { dismissed[k] = true; });
    var added = 0;
    Object.keys(LIBRARY_SEED_KEYS).forEach(function (key) {
      if (byKey[key] || dismissed[key]) return;
      var deck = buildLesson(key);
      if (!deck) return;
      deck.sourceKey = key;
      deck.libraryGroup = LIBRARY_SEED_KEYS[key];
      SF.Store.save(deck, { force: true });
      added++;
    });
    return added;
  }

  /**
   * Turn a lesson in this file into a real deck, with its games saved.
   *
   * Fresh ids every time, so a factory reset still clones rather than
   * overwriting the Library row. Opening a Library card uses Store ids
   * instead — seedLibrary files each pack once.
   *
   * @param {string} [key]  which lesson; the first one by default
   * @returns {object|null} deck
   */
  function buildLesson(key) {
    var spec = LESSONS.filter(function (l) { return l.key === key; })[0] || LESSONS[0];
    if (!spec) return null;
    var deck = SF.makeDeck(spec.title);
    deck.theme = spec.theme || 'studio';
    deck.libraryGroup = groupForSpec(spec);
    if (LIBRARY_SEED_KEYS[spec.key] || spec.key === DEMO_SOURCE_KEY) deck.sourceKey = spec.key;
    /* Carried like the logo fields below, and for the same reason: a lesson
       that names its institution has to hand that to the deck, or the theme
       prints nothing where the organisation line goes. */
    if (spec.org) deck.org = spec.org;
    /* The line a composition prints on its closing rule, carried for the same
       reason as org: it is the deck's own words, not the renderer's. */
    if (spec.closingNote) deck.closingNote = spec.closingNote;
    /* Off for a five-slide starter that wants one element per slide. Carried
       rather than defaulted: makeDeck turns numbers on, which is right for a
       lecture and wrong for a campaign card. */
    if (typeof spec.showSlideNumbers === 'boolean') deck.showSlideNumbers = spec.showSlideNumbers;
    if (spec.logo) {
      deck.logo = spec.logo;
      deck.logoOn = spec.logoOn || 'all';
      deck.logoSize = spec.logoSize || 'medium';
      /* A logo that is already drawn for a dark ground must say so, or a dark
         theme's blanket reverse rule flattens its colours to white. */
      if (spec.logoReverse) deck.logoReverse = spec.logoReverse;
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
      if (SF.LessonBank && SF.LessonBank.stamp) SF.LessonBank.stamp(game, deck);
      else {
        game.libraryGroup = deck.libraryGroup;
        game.sourceDeckId = deck.id;
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

  function folderId(deck) {
    if (!deck) return 'other';
    if (deck.libraryGroup) return deck.libraryGroup;
    return (SF.libraryGroupFromTheme && SF.libraryGroupFromTheme(deck.theme)) || 'other';
  }

  function stamp(game, deck) {
    if (!game || !deck) return game;
    game.libraryGroup = folderId(deck);
    game.sourceDeckId = deck.id || '';
    return game;
  }

  function activityCount(deck) {
    var seen = {};
    (deck && deck.slides || []).forEach(function (s) {
      if (!s.activity) return;
      seen[s.activityInstance || s.id] = true;
    });
    return Object.keys(seen).length;
  }

  function checksOnDeck(deck) {
    var seen = {};
    var out = [];
    (deck && deck.slides || []).forEach(function (s) {
      if (s.type !== 'game' || !s.gameId || seen[s.gameId]) return;
      seen[s.gameId] = true;
      var g = SF.GameStore.get(s.gameId);
      if (g) out.push(g);
    });
    return out;
  }

  function checkCount(deck) {
    return (deck && deck.slides || []).filter(function (s) { return s.type === 'game'; }).length;
  }

  function usedByDecks(gameId) {
    if (SF.GameStore && SF.GameStore.usedByDecks) return SF.GameStore.usedByDecks(gameId);
    return (SF.Store.list() || []).filter(function (d) {
      return (d.slides || []).some(function (s) { return s.type === 'game' && s.gameId === gameId; });
    });
  }

  function parentLesson(gameId) {
    var lastId = SF.Store && SF.Store.lastId && SF.Store.lastId();
    var last = lastId && SF.Store.get ? SF.Store.get(lastId) : null;
    if (gameId) {
      var hosts = usedByDecks(gameId);
      if (hosts.length) {
        var hit = last && hosts.filter(function (d) { return d.id === last.id; })[0];
        return hit || hosts[0];
      }
    }
    return last || null;
  }

  function folderLabel(group) {
    var folders = (SF.LibraryFolders && SF.LibraryFolders.catalog && SF.LibraryFolders.catalog())
      || SF.LIBRARY_GROUPS || [];
    var hit = folders.filter(function (f) { return f.id === group; })[0];
    return hit ? hit.label : (group || 'Library');
  }

  function savedList(game) {
    var parent = parentLesson(game && game.id);
    if (parent) {
      return {
        title: 'Checks in “' + (parent.title || 'this lesson') + '”',
        empty: 'This lesson has no other checks yet.',
        folderId: folderId(parent),
        items: checksOnDeck(parent)
      };
    }
    var group = (game && game.libraryGroup) || 'other';
    return {
      title: 'Quizzes in ' + folderLabel(group),
      empty: 'No quizzes in this Library folder yet.',
      folderId: group,
      items: (SF.GameStore.list() || []).filter(function (g) {
        var gGroup = g.libraryGroup || (SF.libraryGroupFromTheme && SF.libraryGroupFromTheme(g.theme)) || 'other';
        return gGroup === group;
      })
    };
  }

  function folderBank(group, excludeGameId) {
    var rows = [];
    (SF.Store.list() || []).forEach(function (deck) {
      if (folderId(deck) !== group) return;
      checksOnDeck(deck).forEach(function (g) {
        if (excludeGameId && g.id === excludeGameId) return;
        var n = (g.questions || []).length;
        rows.push({
          id: deck.id + ':' + g.id,
          gameId: g.id,
          deckId: deck.id,
          title: (deck.title || 'Untitled') + ' · ' + (g.title || 'Check'),
          lessonTitle: deck.title || 'Untitled',
          gameTitle: g.title || 'Check',
          questions: g.questions || [],
          blurb: n + (n === 1 ? ' question' : ' questions')
        });
      });
    });
    return rows;
  }

  function deckFacts(deck) {
    var n = (deck && deck.slides || []).length;
    var checks = checkCount(deck);
    var acts = activityCount(deck);
    var parts = [n + (n === 1 ? ' slide' : ' slides')];
    if (checks) parts.push(checks + (checks === 1 ? ' check' : ' checks'));
    if (acts) parts.push(acts + (acts === 1 ? ' activity' : ' activities'));
    return parts.join(' · ');
  }

  function folderChip(decks) {
    var n = decks.length;
    var checks = 0;
    decks.forEach(function (d) { checks += checkCount(d); });
    if (!checks) return String(n);
    return n + ' · ' + checks + (checks === 1 ? ' check' : ' checks');
  }

  SF.LESSONS = LESSONS;
  SF.LIBRARY_SEED_KEYS = LIBRARY_SEED_KEYS;
  SF.DEMO_LIBRARY_GROUP = DEMO_LIBRARY_GROUP;
  SF.keepOneDemoCopy = keepOneDemoCopy;
  SF.buildLesson = buildLesson;
  SF.seedLibrary = seedLibrary;
  SF.dismissLibrarySeed = dismissLibrarySeed;
  SF.restoreLibrarySeed = restoreLibrarySeed;
  SF.LessonBank = {
    stamp: stamp,
    folderId: folderId,
    folderLabel: folderLabel,
    parentLesson: parentLesson,
    savedList: savedList,
    folderBank: folderBank,
    checksOnDeck: checksOnDeck,
    checkCount: checkCount,
    activityCount: activityCount,
    deckFacts: deckFacts,
    folderChip: folderChip
  };
})(typeof window !== 'undefined' ? window : globalThis);
