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
        "The Monday after the lab",
        "Before the next lecture"
            ],
            correct: 1,
            explanation: "Friday after each lab, 12:00. It is the one deadline that repeats every week of the term."
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
            "Lab 1 Focus: Setting up your Python environment, importing datasets with Pandas, and building your first clean visualisations.",
            "Worksheet Submission: Complete and submit Lab 1 worksheets on Canvas by Friday midday.",
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
      key: 'layout-bank',
      title: 'Layout bank — every layout, every chart, every live moment',
      icon: '▦',
      blurb: 'The reference deck: every layout in the picker, all twenty chart idioms, the design variants, and the things the room answers on their phones. Page through it to see what each one does, then copy the slide you want into your own lesson. Every slide says in its notes when to reach for it — and when not to.',
      minutes: 40,
      theme: 'northeastern',
      libraryGroup: 'nul',
      kind: 'template',
      org: 'Northeastern University London',
      logo: 'assets/brand/nu-london-logo.png',
      logoOn: 'all',
      logoSize: 'small',
      games: [{
        ref: 'check',
        title: 'A live check, mid-lesson',
        style: 'choice',
        settings: { defaultTime: 25, scoreboard: false, scoreSlide: false, confidence: true },
        questions: [{
          question: 'One number per category, and the order is the message. Which chart?',
          options: ['Pie chart', 'Sorted horizontal bar', 'Line chart', 'Radar'],
          correct: 1,
          explanation: 'Ranking: position along a common scale is the channel the eye reads most accurately, and sorting puts the message into the shape. A pie asks the reader to compare angles; a line implies an order in time that is not there.'
        }]
      }, {
        ref: 'rank',
        title: 'Put the workflow in order',
        style: 'order',
        settings: { defaultTime: 60, scoreboard: false, scoreSlide: false },
        questions: [{
          question: 'Put these in the order a chart should be made.',
          options: [
            'Ask what question the chart has to answer',
            'Check where the numbers came from, and what they leave out',
            'Choose the idiom that answers that question',
            'Write the finding as the title'
          ],
          explanation: 'The title is written last and read first. Choosing the idiom before knowing the question is how a deck ends up full of charts that are correct and say nothing.'
        }]
      }, {
        ref: 'race',
        title: 'Race: name the idiom',
        style: 'race',
        settings: { defaultTime: 20, scoreboard: true, scoreSlide: false, mode: 'teams' },
        questions: [{
          question: 'Where does it go, and how much gets there?',
          options: ['Sankey', 'Funnel', 'Waffle', 'Box plot'],
          correct: 0,
          explanation: 'A Sankey. A funnel shows what is left at each stage; only the Sankey shows where the rest went.'
        }, {
          question: 'One number per category, and the order is the message?',
          options: ['Pie', 'Radar', 'Sorted horizontal bar', 'Pictogram'],
          correct: 2,
          explanation: 'Sorted horizontal bar. Position on a common scale, sorted so the shape carries the finding.'
        }]
      }, {
        ref: 'boss',
        title: 'Boss battle: the grammar of charts',
        style: 'boss',
        settings: { defaultTime: 30, scoreboard: false, scoreSlide: false, confidence: false },
        questions: [{
          question: 'Which channel does the eye read most accurately?',
          options: ['Area', 'Angle', 'Position on a common scale', 'Colour hue'],
          correct: 2, difficulty: 'easy',
          explanation: 'Position on a common scale. An easy hit — 1 damage.'
        }, {
          question: 'A bar chart whose axis starts at 40 rather than 0 exaggerates what?',
          options: ['The total', 'The differences between bars', 'The number of categories', 'Nothing — it is a free choice'],
          correct: 1, difficulty: 'medium',
          explanation: 'The differences. A bar encodes value as length, so cutting the baseline cuts the length that the value is made of — 2 damage.'
        }, {
          question: 'Why is a radar chart hard to read fairly?',
          options: [
            'It cannot hold more than three series',
            'Enclosed area grows as the square of the values, and reordering the spokes changes it',
            'It needs a legend',
            'The axes must share a scale'
          ],
          correct: 1, difficulty: 'hard',
          explanation: 'Area grows as the square, and the spoke order changes the area without changing the data — 3 damage.'
        }, {
          question: 'A room is shown a scatter with a clear upward trend. What will they conclude that the chart does not say?',
          options: [
            'That the two things are measured in the same unit',
            'That x causes y',
            'That the sample is large',
            'That the axis starts at zero'
          ],
          correct: 1, difficulty: 'boss',
          explanation: 'That x causes y. Readers assume the relationship you draw is causal, whatever the caption says — the boss blow, 5 damage.'
        }]
      }],
      slides: [
        { type: 'title', title: 'Layout bank', subtitle: 'One of every layout, chart and live moment · Northeastern theme',
          date: '2026-09-15',
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
        { type: 'keyfact', title: 'Key fact — one number, set large',
          subtitle: 'SHARE OF THE WORLD’S DATA CREATED IN THE LAST TWO YEARS',
          body: '90%',
          bullets: [
            'The subtitle above the number is its label; the number itself is never a build step.',
            'Three supporting lines is the limit — past that the number stops being the point.',
            'Say the number, then stop talking.'
          ],
          progressive: true, buildMode: 'dim',
          notes: 'KEY FACT — for the one figure you want quoted back at you. Reach for it when a chart would bury the finding in axes: a single number needs no scale, no legend and no explanation of what the bars mean.' },

        { type: 'orgchart', title: 'People & structure — who is who',
          bullets: [
            'Mark Martin\tCourse Leader',
            'Ada Lovelace\tLead Tutor\tMark Martin',
            'Alan Turing\tTutor\tMark Martin',
            'Grace Hopper\tLab Demonstrator\tAda Lovelace',
            'Katherine Johnson\tLab Demonstrator\tAlan Turing'
          ],
          notes: 'PEOPLE & STRUCTURE — one person per line: name, role, and who they report to. Leave the third column off and they sit at the top. With no reporting lines at all it draws a flat team in one row, which is the right shape for a project group or a panel.' },

        { type: 'stats', title: 'Stat tiles — the numbers that matter',
          subtitle: 'From the module survey, week 6 · n = 148',
          bullets: [
            'Read the chart first\t92%\tbefore they read the caption',
            'Found the legend\t48%\ton first look',
            'Asked a follow-up\t3 of 5\tafter a clear chart'
          ],
          progressive: true,
          notes: 'STAT TILES — each line is label · value · note, and the value is set large. Three to six tiles; three is the sweet spot. Under Design, the Ring style fills a circle to the number’s share and the Bar style adds a KPI bar under it — both read the leading number in the value.' },

        { type: 'compare', title: 'Versus — two columns, row by row',
          subtitle: 'Bad chart | Good chart',
          bullets: [
            'Colour\tOne hue per series, twelve series\tTwo hues: the series that matters, and everything else',
            'Labels\tA legend the eye has to travel to\tLabels on the lines themselves',
            'Title\t"Figure 3"\tThe finding, as a sentence'
          ],
          progressive: true,
          notes: 'VERSUS — the subtitle names the two columns ("Before | After", "Myth | Fact"). Each row is left · right, or row label · left · right when the rows need naming, as here. Rows build on Next so the comparison is argued one line at a time.' },

        { type: 'funnel', title: 'Funnel — stages that narrow',
          subtitle: 'What happens to a chart between the analyst and the reader',
          bullets: [
            'Data points plotted\t1,200\teverything the query returned',
            'Marks the eye registers\t300\tthe rest is texture',
            'Marks that are compared\t40\twhere the reading actually happens',
            'Number remembered\t1\tif the title did its job'
          ],
          progressive: true,
          notes: 'FUNNEL — stage · value · note. When the values are numbers the band widths follow them, so a cliff draws as a cliff. Without numbers the bands narrow evenly. Design → Direction flips it to a pyramid.' },

        { type: 'timeline', title: 'Timeline — dated events on a rail',
          subtitle: 'Where the ideas in this module came from',
          bullets: [
            '1786\tPlayfair\tThe bar chart and the line chart, in one atlas',
            '1858\tNightingale\tThe rose diagram takes an argument to Parliament',
            '1967\tBertin\tSemiology of Graphics — the visual variables named',
            '1983\tTufte\tData-ink ratio and chartjunk',
            '2010s\tFT & Datawrapper\tThe visual vocabulary goes mainstream'
          ],
          progressive: true,
          notes: 'TIMELINE — date · event · detail, up to eight. Dates are labels, not parsed, so "Week 3" or "Term 2" work. Design → Shape switches to the vertical spine, which gives each event a full line of detail.' },
        { type: 'stats', design: { statStyle: 'ring' }, title: 'Stat tiles · rings',
          bullets: [
            'Attendance\t88%\tweek six',
            'Submitted on time\t74%\tfirst attempt'
          ],
          notes: 'STATS · RING — the same layout, Design → Tile style → Ring. The arc fills to the number’s share of a hundred.\n\nThe inspector warns you when there is more than one of them, and it is right to: an arc is compared less accurately than a length, so four rings are four dials nobody can line up. One hero number in a ring is the fair use.' },

        { type: 'stats', design: { statStyle: 'bar' }, title: 'Stat tiles · KPI bars',
          bullets: [
            'Applications\t1,240\ttarget 1,000',
            'Offers\t860\ttarget 800',
            'Enrolled\t510\ttarget 600'
          ],
          body: 'Two of three targets met — enrolment is the one to talk about.',
          notes: 'STATS · BAR — Design → Tile style → Bar. This is the variant to prefer when the numbers are being compared, because length on a common baseline is the channel the eye reads most accurately. The line underneath is the takeaway field.' },

        { type: 'funnel', design: { funnelDirection: 'up' }, title: 'Funnel · pyramid',
          bullets: [
            'Aware\t4,000\t',
            'Interested\t1,600\t',
            'Applied\t420\t',
            'Enrolled\t180\t'
          ],
          notes: 'FUNNEL · UP — Design → Direction → Pyramid. Same data, widest at the bottom, for when the story is the base rather than the loss.\n\nThe drop between two stages is printed for you either way — −60%, −74% — because that is the number a reader is working out in their head. And the inspector will point out that a Sankey answers the same question while also showing where the missing ones went.' },

        { type: 'timeline', design: { timelineMode: 'vertical' }, title: 'Timeline · down the page',
          bullets: [
            'Week 1\tFoundations\tWhy we visualise at all, and what a channel is',
            'Week 6\tColour and scale\tThe grammar of graphics, and where it misleads',
            'Week 12\tCritique\tSaying why a chart fails, in writing'
          ],
          notes: 'TIMELINE · DOWN — Design → Shape → Down. A spine with a paragraph per event, for when the detail matters more than the span. Across is the default and suits six short entries; down suits three long ones.' },

        { type: 'cards', design: { cardsMode: 'stack' }, title: 'Cards · stacked, one at a time',
          bullets: [
            'Notice\tSomething in the data does not fit the story.',
            'Check\tGo back to how it was collected.',
            'Redraw\tPick the idiom that answers the question.',
            'Say it\tWrite the finding as a sentence on the slide.'
          ],
          progressive: true,
          notes: 'CARDS · STACK — Design → Card style → Stacked. Every card lands in the same place, the one being talked about in front and the ones already made peeking out behind. Four things get four moments instead of competing for one glance, and the pile shows the room how far through the set you are. Needs Build on Next, which is on here.' },

        { type: 'cards', design: { cardsMode: 'rows' }, title: 'Cards · rows, for cards that have something to say',
          bullets: [
            'Rule of thumb\tThree cards across is fine for three words and cruel to a definition.',
            'What goes wrong\tThe column narrows until the label breaks up, and the set reads as one card with three columns.',
            'The fix\tDown the slide instead — full width each, and only as much height as the words need.'
          ],
          notes: 'CARDS · ROWS — Design → Card style → Rows. The variant to choose the moment a card carries a sentence rather than a phrase. Grid is the default and suits short labels; this suits definitions.' },

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

        { type: 'cards', title: 'Cards · picture cards — a photograph over each',
          bullets: [
            'See\tWhat the reader notices in the first second.',
            'Orient\tAxes, legend, units — where am I?',
            'Compare\tThe one difference the chart exists to show.',
            'Say\tThe sentence they would repeat to a colleague.'
          ],
          design: { cardsMode: 'pictures' },
          progressive: true,
          notes: 'CARDS — the same layout with Design → Cards layout set to Picture cards. Every card gets an image slot above its copy; the dashed box is the placeholder until you paste a URL or drop a file under that card in the inspector. Design → Picture shape switches between portrait crops and letterboxed plates.' },

        { type: 'journey', journeyMode: 'stepper', title: 'Journey · stepper — a process in one glance',
          subtitle: 'Design → Show as → Stepper',
          bullets: [
            'Question\tWhat does the reader need to decide?',
            'Data\tThe smallest table that answers it.',
            'Idiom\tThe chart family that fits the relationship.',
            'Title\tThe finding, written as a sentence.'
          ],
          progressive: true,
          notes: 'JOURNEY — the third mode. Numbered discs on one horizontal rail with the copy beneath, for a process read left to right. Route keeps the sequence vertical; Handover is two or three big columns; Stepper is the infographic idiom for "first, then, then".' },

        { type: 'section', title: 'Data and evidence', subtitle: 'A table, and all twenty chart idioms',
          notes: 'Table and chart read the same pasted text, so a range from a spreadsheet becomes either without retyping.' },

        { type: 'table', title: 'Table — when the numbers are the point',
          body: 'Dataset\tMean x\tMean y\tCorrelation\nI\t9.00\t7.50\t0.816\nII\t9.00\t7.50\t0.816\nIII\t9.00\t7.50\t0.816\nIV\t9.00\t7.50\t0.816',
          progressive: true,
          notes: 'TABLE — paste a range straight from Excel or Sheets; tabs and pipes both work, first row is the header. Build on Next reveals a row at a time. Reach for a table when the reader needs the exact value, a chart when they need the shape.' },

        { type: 'chart', chartKind: 'bar', design: { chartMotion: 'grow' },
          title: 'Chart — bar, for comparing magnitudes',
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
        { type: 'chart', chartKind: 'hbar', title: 'Chart · ranking — what is the order?',
          body: 'Barrier\tMentioned by (%)\nNo local network\t62\nCost of travel\t48\nNo one to ask\t41\nTiming of events\t23\nNothing nearby\t12',
          chartSource: 'Illustrative figures. Every chart carries a line like this one, and it prints under the drawing and into the student handout.',
          notes: 'RANKING — a sorted horizontal bar is the Financial Times’ own ranking chart, and the reason is that position on a common scale is the channel the eye reads most accurately. Sort it, or it is not a ranking chart.\n\nThis slide is also the one showing the SOURCE LINE. Where the numbers came from and what they are not — that is the thing a reader needs a week later with nobody there to explain it.' },

        { type: 'chart', chartKind: 'stack', title: 'Chart · part-to-whole — how does it divide up?',
          body: 'Year\tTeaching\tResearch\tOutreach\n2023\t52\t31\t17\n2024\t48\t34\t18\n2025\t44\t35\t21',
          notes: 'STACKED BAR — for composition over a few categories. It warns you if a series contains negatives, because those are silently left out of a total and the bar would lie.\n\nAlso in this family and drawn by the same picker: pie, donut, treemap and waffle.' },

        { type: 'chart', chartKind: 'donut', title: 'Chart · donut, and its cousins',
          body: 'Route in\tShare\nUniversity\t44\nApprenticeship\t21\nBootcamp\t18\nSelf-taught\t17',
          notes: 'DONUT — a pie with the middle taken out, and the same paste. The hole buys you somewhere to put the total, which is the only real reason to prefer it.\n\nTreemap and waffle are further on: the same data, the same question, two better answers to it.' },

        { type: 'chart', chartKind: 'scatter', title: 'Chart · correlation — do two things move together?',
          body: 'Cohort\tHours on task\tMark\nA\t4\t52\nB\t7\t61\nC\t9\t58\nD\t12\t74\nE\t14\t71\nF\t18\t88\nG\t20\t79',
          notes: 'SCATTER — a first column of words becomes each point’s label, and labels that would collide are moved and given a leader line. Read x, y with two columns; name, x, y with three.\n\nThe app says out loud what this chart cannot: readers will assume the relationship you draw is causal.' },

        { type: 'chart', chartKind: 'box', title: 'Chart · distribution — what values occur, how often?',
          body: 'Group\nGroup A\t54\t58\t61\t63\t65\t66\t68\t71\t74\t88\nGroup B\t41\t49\t55\t57\t60\t62\t64\t69\t73\t79\nGroup C\t62\t64\t66\t67\t68\t69\t70\t71\t73\t75',
          notes: 'BOX PLOT — one row per group, then every value measured in it, so a column of marks pasted from a spreadsheet becomes this. Whiskers stop at the furthest real observation inside Tukey’s 1.5×IQR fence; anything past it is drawn as a point, which is why Group A has one at 88.\n\nA histogram answers the same question for a single ungrouped column.' },

        { type: 'chart', chartKind: 'sankey', title: 'Chart · flow — where does it go?',
          body: 'From\tTo\tPeople\nApplied\tInterviewed\t420\nApplied\tRejected at sift\t580\nInterviewed\tOffered\t140\nInterviewed\tNo offer\t280\nOffered\tJoined\t110\nOffered\tDeclined\t30',
          notes: 'SANKEY — from, to, amount: a list of flows rather than a table of values. This is the honest alternative to a funnel, and the inspector points at it from there: a funnel shows what is left at each stage, a Sankey shows where the rest went. On this data that is 580 people rejected at sift who a funnel would simply not draw.' },

        { type: 'chart', chartKind: 'pictogram', chartIcon: '●', chartUnit: 50, title: 'Chart · magnitude — one icon is one unit',
          body: 'Stage\tPeople\nApplied\t1000\nInterviewed\t420\nOffered\t140\nStill there at year 3\t62',
          notes: 'PICTOGRAM — the ISOTYPE tradition: the icon repeats and never grows, so the count is read by counting rather than by judging an area. Set the glyph and how many each one stands for; the remainder is drawn as a clipped icon rather than a smaller one, because a smaller one would encode the value in area again.' },

        { type: 'chart', chartKind: 'radar', title: 'Chart · radar, and why to be careful',
          body: 'Skill\tStart of module\tNow\nReading a chart\t2\t4\nChoosing an idiom\t1\t3\nCleaning data\t2\t3\nWriting the caption\t1\t4\nCritique\t2\t4',
          notes: 'RADAR — defensible here and in few other places: the axes are the same kind of thing on the same nought-to-five scale, and the two shapes are the same learner at two times.\n\nIt repeats its own critique in the app, which is the point of drawing it at all: enclosed area grows as the SQUARE of the values, so a row twice as good encloses four times the shape — and reordering the spokes changes that area without changing the data.' },

        { type: 'chart', chartKind: 'dumbbell', title: 'Chart · deviation — how far apart are two points?',
          body: 'Function\tAt entry (%)\tAt senior (%)\nEngineering\t8.9\t3.1\nData\t9.6\t3.8\nProduct\t7.2\t2.4\nDesign\t6.4\t2.9',
          notes: 'DUMBBELL — two named series as two dots on one row, and the bar between them is the finding. The gap is printed on the row, because that is the number that gets quoted. Reach for it whenever you would otherwise draw two bars side by side and ask the room to subtract.\n\nIt carries a key, because which dot is which would otherwise live only in a tooltip — and a room looking at a projector has no tooltips.' },

        { type: 'chart', chartKind: 'multiples', title: 'Chart · small multiples, on one stated scale',
          body: 'Line\t2021\t2022\t2023\t2024\nCentral\t18\t22\t26\t31\nVictoria\t12\t15\t14\t19\nNorthern\t24\t23\t27\t29\nBakerloo\t9\t11\t13\t12',
          chartSource: 'Illustrative. Every panel shares one scale, and the scale is written on the slide rather than left to be assumed.',
          notes: 'SMALL MULTIPLES — read transposed: each row is a panel and the columns are the axis inside it. The panels share a scale and the app says so on the drawing, because panels on their own scales are the most common way this chart misleads.\n\nPast about a dozen panels it tells you a room cannot compare that many.' },

        { type: 'chart', chartKind: 'bullet', title: 'Chart · against a target',
          body: 'Measure\tActual\tTarget\nApplications\t1240\t1000\nOffers\t860\t800\nEnrolled\t510\t600',
          notes: 'BULLET — a value against a reference: a target, a long-run average, or zero. The bar is the actual, the tick is the target, and nobody has to subtract.\n\nThe picker groups all twenty idioms by the question they answer rather than by what they look like, which is the Financial Times’ Visual Vocabulary rather than a gallery of shapes.' },
        { type: 'chart', chartKind: 'area', title: 'Chart · area — a total, and what it is made of',
          body: 'Year\tEvents\tCourses\tResearch\n2019\t4\t1\t0\n2020\t6\t3\t0\n2021\t7\t6\t1\n2022\t9\t9\t1\n2023\t11\t12\t2\n2024\t12\t14\t3',
          notes: 'AREA — a line chart with the space underneath filled, stacked when there is more than one series. Read the top edge as the total and the bands as its composition.\n\nThe honest warning: only the bottom band sits on a flat baseline, so every band above it is harder to read on its own. If a single series is the story, draw it as a line.' },

        { type: 'chart', chartKind: 'combo', title: 'Chart · combo — two units on one slide',
          body: 'Quarter\tEvents held\tAverage attendance\nQ1\t3\t62\nQ2\t5\t71\nQ3\t4\t88\nQ4\t6\t94',
          notes: 'COMBO — the first series draws as columns, every later one as markers on top. For a count and a rate together: the bars are how many, the markers are how well.\n\nUse it when the two really are different units. Two series in the same unit belong on the same axis as two bars or two lines.' },

        { type: 'chart', chartKind: 'histogram', title: 'Chart · histogram — the shape of one column',
          body: 'Mark\n41\n48\n52\n54\n55\n57\n58\n58\n60\n61\n62\n62\n63\n64\n64\n65\n66\n67\n68\n69\n71\n72\n74\n77\n81\n88',
          chartSource: 'One cohort, one assessment. Bin edges are computed from the data, not chosen to flatter it.',
          notes: 'HISTOGRAM — paste one column of numbers and they are counted into bins for you. Where a box plot summarises a distribution in five numbers, this draws its actual shape, which is the only way a second peak shows up at all.\n\nBin width is a real editorial choice: too wide hides the shape, too narrow turns it into noise.' },

        { type: 'chart', chartKind: 'treemap', title: 'Chart · treemap — parts of a whole, by area',
          body: 'Spend\tShare\nDelivery\t44\nVenues\t18\nBursaries\t16\nResearch\t12\nCore costs\t10',
          notes: 'TREEMAP — the same paste as a pie, drawn as nested rectangles. It holds more categories than a pie without collapsing into slivers, and rectangles are compared slightly better than angles.\n\nStill area, though, and area is judged poorly. If the order is the message, draw the sorted bar.' },

        { type: 'chart', chartKind: 'waffle', title: 'Chart · waffle — a hundred squares, so it can be counted',
          body: 'Route in\tShare\nUniversity\t44\nApprenticeship\t21\nBootcamp\t18\nSelf-taught\t17',
          notes: 'WAFFLE — a hundred squares, each one a percentage point. The reader counts rather than estimates, which is why this is the part-to-whole chart to choose when the exact figure matters as much as the split.\n\nOne square is never subdivided — five percent is five squares, and that is the whole point of the idiom.' },

        { type: 'chart', chartKind: 'matrix', title: 'Chart · evidence matrix — ratings across conditions',
          body: 'Idiom\tSpots the outlier\tShows the total\tHolds 12 categories\tCounts exactly\nSorted bar\tStrong\tWeak\tStrong\tModerate\nStacked bar\tWeak\tStrong\tModerate\tWeak\nPie\tWeak\tStrong\tWeak\tWeak\nBox plot\tStrong\tWeak\tModerate\tWeak\nScatter\tStrong\tWeak\tStrong\tWeak\nWaffle\tWeak\tStrong\tWeak\tStrong\nSorted dumbbell\tModerate\tWeak\tStrong\tModerate',
          notes: 'EVIDENCE MATRIX — first row names the conditions, then one row per item with a rating in each cell. Words like Strong / Moderate / Weak are ranked once so the whole grid shares a single scale, which is what stops each column being read on its own.\n\nFor ordinal judgements — a systematic review, a shortlist against criteria, exactly this table of chart choices. Numbers in the cells belong in a table or a heatmap instead.\n\nThat is all twenty idioms the app draws. There are no maps, and the picker says so rather than leaving you to conclude it from an absence.' },

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

        { type: 'image',
          design: { imageMotion: 'zoom', capStyle: 'scrim', capPos: 'bottom', capFade: 10, focalX: 56, focalY: 45 },
          image: 'assets/lesson/ipdv/snow-cholera-map-1854.jpg', imageFit: 'cover',
          title: 'Every black bar is a death. The pump is in the middle of them.',
          subtitle: 'John Snow, Broad Street, 1854 · lith. C. F. Cheffins',
          notes: 'A MOVING IMAGE — Design → Image motion → Slow zoom in. Twenty-four seconds, once, ending where it stops; it does not loop back and start again, because a picture that keeps restarting is a picture nobody finishes reading.\n\nIt zooms toward the Image focus point, which is why this one drifts into Broad Street rather than the middle of the plate. Set the focus first, then the motion.\n\nProjector only. The editor holds it still so the preview is not re-animating every time you type, and a machine set to reduce motion gets the still picture — the slide still works, it simply stops moving.\n\nThe caption clears itself after ten seconds (Design → Caption clears itself). It names the plate while the room needs naming, then gets off the picture.' },

        { type: 'image',
          design: { imageFrame: '4:3', capStyle: 'bar' },
          image: 'assets/lesson/ipdv/playfair-pie-1801.jpg', imageFit: 'contain',
          title: 'The first pie chart anybody drew',
          subtitle: 'William Playfair, The Statistical Breviary, 1801',
          body: 'Playfair had already invented the line chart and the bar chart twenty years earlier, in the Commercial and Political Atlas of 1786.\nThe circle was his answer to a different question: not how much, but how a single whole divides — here the Turkish Empire split across Europe, Asia and Africa.\nHe was ignored for most of a century. The chart was not.',
          notes: 'FLIP TO FACTS — put anything in the slide’s body and the picture gets a ⇄ in the corner. Press it and the same slide turns over: the facts on the back, the picture still there behind them, one more press and you are back.\n\nThe point is that you never leave the slide. The room is looking at the plate, you are asked where it came from, and answering it does not cost you the picture and a click forward and a click back. It is one slide with two faces rather than two slides in a row.\n\nWorks on the projector and in the editor. Nothing about it is a build step, so it does not consume a Next — which is exactly why it suits the question you did not plan for.' },

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

        { type: 'video',
          video: 'assets/lesson/ipdv/baseline-truncation.mp4',
          videoPoster: 'assets/lesson/ipdv/baseline-truncation-poster.jpg',
          videoMuted: true, videoLoop: true, videoAutoplay: true,
          imageFit: 'contain',
          title: 'Same five numbers. Two different axes.',
          notes: 'VIDEO — a file beside the deck, or a YouTube or Vimeo link. Paste the share URL and it becomes an embed; paste a path and it becomes a real player with the projector’s own controls.\n\nThis one is set muted, looping and autoplaying, which is the combination that works on a wall: sound in a lecture theatre is a gamble, a loop means a latecomer still sees the whole thing, and autoplay saves you walking to the laptop. Autoplay is honoured on the projector and never in the editor — a preview that starts playing while you type is a preview you turn off.\n\nStart and end are settable in seconds, so a forty-minute recording can contribute the ninety seconds you actually want without you editing the file. The poster is the frame it shows before it plays, and it is worth setting: without one the slide is a black rectangle until the first frame decodes.\n\nAn embedded clip draws a still in the editor rather than a dead frame, because loading the real player beside the inspector would start somebody’s video while they worked.\n\nOne thing worth copying: a video caption is a fixed band across the bottom of the frame, about 208px of white-on-gradient, and it clears the player controls rather than the content. So this clip was drawn with that band empty — the chart and its labels stop above it. If you are making the clip as well as the slide, leave the caption somewhere to sit.' },

        { type: 'content', title: 'Video — what to check before the lecture',
          bullets: [
            'A file beside the deck\tPlays with no network. This is the one to use when the room’s wifi is a rumour.',
            'A YouTube or Vimeo link\tBecomes an embed on the no-cookie domain. Needs the network, and the site has to be reachable from the lecture theatre.',
            'Muted, looping, autoplaying\tThe wall combination. Sound only if you have tested the room’s sound.',
            'Start and end\tClip the ninety seconds you want out of a forty-minute recording, without editing the file.'
          ],
          notes: 'The clip on the previous slide is about 280 KB and travels with the deck, which is the whole argument for a file over a link: nothing to load, nothing to log in to, nothing that shows an advert first.\n\nWhat it shows is the same five numbers twice — once on an axis that starts at zero, once on an axis that starts at 55. A bar encodes its value as a LENGTH, so cutting the baseline cuts away the part of the length that carries the value, and the differences that are left look several times larger than they are. It is the most common way a correct number tells a lie, and it is much easier to watch happen than to describe.' },

        { type: 'section', title: 'What the room does', subtitle: 'Four ways a slide can ask, and one live check',
          notes: 'Everything from here needs Host live and phones in the room. On the projector each of these draws its own control; on a learner phone the same control takes over the screen.' },

        { type: 'join', title: 'Everyone in, in about twenty seconds',
          subtitle: 'Phones out — the code and the PIN both work',
          bullets: [
            'Scan the code, or type the address and the four digits.',
            'No app, no account, no name unless you ask for one.'
          ],
          notes: 'JOIN — the app builds this for you when you host a session, with the real room code in it. What you are looking at now is a sample, because this deck is not live.\n\nLeave it on the wall while the room arrives. Latecomers join off the same code without stopping you.' },

        { type: 'split', imageFit: 'contain', imageSide: 'left', design: { imageShare: 35 },
          image: 'assets/demo-phone/phone-poll.jpg',
          title: 'What it looks like in their hand',
          bullets: [
            'Their own first name at the top — and a question mark, a raised hand and a heart, so a room can interrupt without interrupting.',
            'Under it, which slide the wall is on. That line is what stops “which one are we looking at?”',
            'The heart saves this slide to their own copy, so revision is something they build while the lesson happens.',
            'The poll itself takes the whole screen. There is nothing else on it to do.'
          ],
          notes: 'A REAL SCREENSHOT, not a drawing of one: this deck hosted, joined from a phone-sized browser, photographed mid-poll. The slide number on it is this deck with its games compiled out, which is why it counts past the ninety in the editor.\n\nNo app, no account, a first name only when the activity needs one — and somebody watching a follow-along screen is not in the register at all.\n\nRegenerate all of these with tools/capture-phone.mjs whenever the learner screens change. A screenshot nobody can rebuild goes stale and then lies about the product.' },

        { type: 'split', imageFit: 'contain', imageSide: 'left', design: { imageShare: 35 },
          image: 'assets/demo-phone/phone-check-answered.jpg',
          title: 'And when it is a check rather than a poll',
          bullets: [
            'A to D, one tap, then “Locked in” — so they know the answer arrived.',
            'Then, and only then: how sure are you? I’m sure, or just a guess.',
            'A confident wrong answer is the most useful thing in the room. It is also the one a show of hands never tells you.',
            'The same screen carries every engine — ranking, typing, estimating, the race, the boss.'
          ],
          notes: 'CONFIDENCE is optional on all twenty-three engines and off by default. Turn it on for the questions where being wrong-and-certain is the thing you need to catch.\n\nThe other captured screens — joining, the word cloud, the scale — are in assets/demo-phone if you want them in a deck of your own. They came out of the same run as these two.' },


        { type: 'split', imageFit: 'contain', imageSide: 'left', design: { imageShare: 35 },
          image: 'assets/demo-phone/phone-share.jpg',
          title: 'And afterwards, the same deck at their own pace',
          bullets: [
            'The read-only link opens on a phone as well as a laptop.',
            'Arrows at the bottom, Full screen if they want it, and a count so they know how far there is to go.',
            'No PIN, no room, no clock — and nothing they do here reaches your register.',
            'Speaker notes are not in it. What they get is the slides.'
          ],
          notes: 'This is the first of the two shares, seen from the other end: the copy they page through themselves. Worth showing a client next to the live screens, because it answers the question every room asks at the end — “can we get the slides?” — without you emailing a 40 MB file.\n\nThe follow-along screen is the same address with one word added, and it is the one that moves when you move. Both are on the Share button, which asks which you want before it uploads anything.' },

        { type: 'content', title: 'Poll — fixed options, counted live',
          bullets: [
            'Add a feedback moment to any slide from the inspector.',
            'The room answers on their phones; the bars fill in the rail beside the slide.',
            'Use it to decide what to do next, not to score anybody.'
          ],
          feedback: { kind: 'poll', prompt: 'Which of these is the hardest to get right?',
            options: ['Choosing the idiom', 'Cleaning the data', 'Writing the caption'], max: 1 },
          notes: 'POLL — the results are for you, in the room, now. Read the split out loud and change the next ten minutes because of it, or do not ask.' },

        { type: 'content', title: 'Word cloud — one word each',
          bullets: [
            'Short answers, repeats grow larger.',
            'Best before you teach something, not after.'
          ],
          feedback: { kind: 'wordcloud', prompt: 'One word: what makes a chart honest?', options: [], max: 2 },
          notes: 'WORD CLOUD — keep it to a word each or the cloud becomes a paragraph nobody reads. A cloud of the room’s own words on the wall is the cheapest way to make a room feel present.' },

        { type: 'content', title: 'Brainstorm — longer contributions, newest first',
          bullets: [
            'For sentences rather than single words.',
            'Contributions arrive with names, so the room can be credited by name.',
            'Read a few out. An unread brainstorm teaches the room not to bother next time.'
          ],
          feedback: { kind: 'brainstorm', prompt: 'Name a chart you have seen this week that misled you — and say how.', options: [], max: 3 },
          notes: 'BRAINSTORM — the widest of the four: no options, no scale, just what they want to say. It lists newest first so the wall keeps moving while people are still typing.' },

        { type: 'content', title: 'Scale — where do you stand?',
          bullets: [
            'One position each, on an ordered run of points.',
            'It reports the spread as well as the average — and the spread is usually the more interesting half.'
          ],
          feedback: { kind: 'scale', prompt: 'How confident are you reading a box plot?', options: [], max: 1,
            points: 5, lowLabel: 'Not at all', highLabel: 'Completely' },
          notes: 'SCALE — a poll over points that have an order, so it earns a mean and a distribution rather than a set of independent bars. Name both ends of it, as this one does.\n\nRead the spread out loud. A room split into two camps and a room that is uniformly unsure have the same average and need completely different next ten minutes.' },

        { type: 'game', gameRef: 'check',
          notes: 'A LIVE CHECK — built for you rather than chosen from the layout picker, which is why it is not in the bank above. Phones answer, you hold the reveal, and the explanation follows. Confidence is on here, so the room says how sure it is as well as what it thinks — a confident wrong answer being the most useful signal you can get.\n\nThe quiz, results, join and explain slides are made the same way, by the live session.' },

        { type: 'section', title: 'Activities', subtitle: 'Fifty-four of them, filed by where they belong in a lesson',
          notes: 'The layouts above are shapes you fill in. An activity is the other direction: you pick the teaching move, and it writes the slides.' },

        { type: 'content', title: 'The activity library',
          bullets: [
            'Fifty-four activities\tFiled under the eleven phases of a lesson — starter, activation, construction, mini, main, collaboration, mini-quiz, reflection, plenary.',
            'Each one says what it costs\tHow long it takes, and what has to be in the room before you start.',
            'Picking one writes the slides\tNot a description of the activity. The actual slides, filled in, in your deck, ready to be rewritten.'
          ],
          notes: 'THE ACTIVITY LIBRARY — the Activities studio, or the library dialog from anywhere. Filter by phase and the list stops being fifty-four things and starts being the four that fit where you are.\n\nFormats that are planned but not built are shown and disabled rather than hidden, so the list does not quietly imply the app can do less than it can — or more.' },

        { type: 'cards', design: { cardsMode: 'rows' }, title: 'Where an activity lands',
          bullets: [
            'A slide\tTwenty-three write one finished slide, at the layout the activity needs.',
            'An arc of slides\tTwo write several, because the activity has stages.',
            'A game\tTen build a game and the slide that runs it.',
            'A feedback moment\tNine attach a prompt the room answers on their phones.',
            'A live moment\tTen are run rather than drawn: a task, a timer, a break.'
          ],
          notes: 'The library tells you which of these an activity is before you pick it, because “adds a slide” and “runs for ten minutes with phones out” are different commitments.\n\nWhere the original teaching move did not fit an engine honestly, the entry says so and what it does instead. Card Sort wanted fifteen cards in student-chosen groups; Ranking allows eight in one line. So it writes the slide and leaves the cards on the table where they belong.' },

        { type: 'keywords', activity: 'think-pair-share', activityPresentation: 'steps',
          title: 'Think-Pair-Share',
          bullets: [
            'Think · 1 min\tOn your own: which chart in this deck would you not have chosen? One line.',
            'Pair · 3 min\tSwap with the person beside you and argue for the one you would keep.',
            'Share · 3 min\tTwo pairs report out. I write the disagreement on the board.'
          ],
          modelAnswer: 'Any answer that names the question the chart was meant to answer, and says which channel it asked the eye to judge. “The radar, because area grows as the square of the values” is a strong answer. “The pie, because pies are bad” is not.',
          modelAnswerDraft: true,
          notes: 'AN ACTIVITY SLIDE, as the library writes it — rail badge naming its phase, timings in the labels, the steps view so the three stages read as three stages.\n\nThe box underneath is a DRAFT ANSWER. Nineteen activities carry a worked answer in their teacher notes, and the library brings it across rather than leaving it where no room ever sees it. It arrives shut and marked: every one is written about somebody else’s subject, so showing it unread would put the wrong answer on the wall. Rewrite it and it becomes the card on the next slide.' },

        { type: 'keywords', activity: 'i-do-we-do-you-do', activityPresentation: 'panels',
          title: 'I do · We do · You do',
          bullets: [
            'I do\tI build one chart from this table, saying every choice out loud.',
            'We do\tWe build the next one together — you tell me what to choose and why.',
            'You do\tYou build the third on your own. I say nothing.',
            'We check\tTwo of yours on the wall side by side, and we say why they differ.'
          ],
          progressive: true,
          notes: 'THE PANELS VIEW — four equal panels, and only at four: the view needs exactly that many, so three or five falls back to rows rather than drawing a gap. Gradual release is four moves, which is why it is the shape this activity uses.\n\nBuild on Next is on, so the room is not reading “you do” while you are still doing.' },

        { type: 'keywords', activity: 'error-analysis', activityPresentation: 'brief',
          title: 'Error analysis — find the faults',
          bullets: [
            'The chart\tA pie with eleven slices, two of them 3%, no labels, ordered alphabetically.',
            'Find three faults\tName each one, then say what it costs the reader.',
            'Then redraw it\tOne sentence: which idiom, and what its title would say.'
          ],
          modelAnswer: 'Eleven slices is well past the point where an angle can be judged, and the two 3% slices are unreadable at any size. No labels means the legend is the only key, so the eye travels for every slice. Alphabetical order throws away the ranking, which is the one thing the reader wants. Redraw as a sorted horizontal bar, titled with the finding rather than the subject.',
          notes: 'THE ANSWER CARD, rewritten and therefore live: the task is on the front and the worked answer is BEHIND it, not further down. Turning the card over is a deliberate act that happens when the time is up — so the room looks at the task for the whole of the activity instead of reading ahead.\n\nThe brief view sets the labels as headings, for an activity whose rows are instructions rather than vocabulary.' },

        { type: 'content', title: 'A moment you run, not a slide you wrote',
          bullets: [
            'A task\tInstructions over whatever is on screen, with a countdown if it needs one.',
            'A timer\tThinking time on its own, so silence in the room is deliberate rather than awkward.',
            'A break\tFive minutes, said out loud, so nobody has to ask.'
          ],
          notes: 'LIVE MOMENTS — started from the presenter desk or the controls on the wall, mid-slide, without leaving the show. The deadline is held by the host rather than each phone, so a learner joining late sees the same clock as everyone else and pausing pauses it for the room.\n\nOne refusal worth knowing: a moment will not start over a knowledge check that is still waiting to be revealed. That would cover the question with a countdown about something else.' },

        { type: 'section', title: 'Games', subtitle: 'Twenty-three engines, twenty-seven ready-made formats',
          notes: 'A game is its own document, joined to a slide. The three that follow are three different engines on the same subject, so what changes is the shape of the thinking rather than the topic.' },

        { type: 'content', title: 'The game library',
          bullets: [
            'Twenty-three engines\tMultiple choice, true / false, ranking, typed answers, estimation, odd-one-out, definitions, memory pairs, heads-up, bingo, a horse race, a boss battle.',
            'Twenty-seven ready-made formats\tThe same engines set up for a job: Beat the Clock, Spot the Error, Predict the Outcome, Fill in the Blanks, Concept Chain, Question Cube.',
            'Two places they go\tBetween slides as their own board, or beside a slide as a quick check.'
          ],
          notes: 'THE GAME LIBRARY — the same dialog as the activities, and each card says how the room takes part before you pick it.\n\nEvery engine shares the same spine: phones answer, you hold the reveal, the explanation follows, and confidence is optional on all of them. What differs is what the wall does while the room is answering — which is most of whether a class leans in.' },

        { type: 'game', gameRef: 'rank',
          notes: 'RANKING — one linear order, part marks for the items placed right, so a nearly-correct answer is not scored as a wrong one. Three to eight items; past eight the room is sorting rather than thinking.\n\nGood for a process, a chronology, or a set of priorities. Bad for anything where two items genuinely tie, because the engine will insist on an order the subject does not have.' },

        { type: 'game', gameRef: 'race',
          notes: 'HORSE RACE — multiple choice, but every right answer moves your team along a track on the wall. The questions are ordinary; the track is what makes a quiet class shout.\n\nTeams, not individuals, which is deliberate: a leaderboard of names is a reason for the weakest learner in the room to stop answering. Keep it for practising something they have already been taught.' },

        { type: 'game', gameRef: 'boss',
          notes: 'BOSS BATTLE — the whole class against one health bar. Each question carries a difficulty and deals damage to match: an easy hit is 1, the boss blow is 5, so the hard question is worth attempting even by somebody who has got the last three wrong.\n\nNobody is behind anybody. That is the entire pedagogical argument for it, and it is a good one for the end of a topic.' },

        { type: 'section', title: 'Running the room', subtitle: 'Rehearse, present, host — and the two ways to share',
          notes: 'Everything so far is what goes on the wall. This is what you are holding while it is up there.' },

        { type: 'cards', design: { cardsMode: 'rows' }, title: 'Four ways to run the same deck',
          bullets: [
            'Rehearse\tThe whole lesson against a sample class — answers, scores and a room that is not there. Nothing counts.',
            'Present\tThe show on the wall. Arrow keys, or the controls that fade in when the mouse moves.',
            'Host live\tThe same show with phones in it: a join code, answers coming back, the room in a rail beside the slide.',
            'Teacher Presenter\tA second window for you alone — notes, what is next, who answered what, and the room. Press D.'
          ],
          notes: 'REHEARSE is the one most people never find, and the one worth finding: it fills the deck with a plausible class so you can see what a poll looks like with thirty answers in it before thirty people are watching you meet it.\n\nTeacher Presenter wants a second screen. Without one, it is still the right window to have on a laptop while the projector shows the wall.' },

        { type: 'table', title: 'The controls on the wall',
          body: 'Control\tKey\tWhat it does\nBack / forward\t← →\tOne point at a time, on a slide that builds\nRoom view\tS\tHidden, beside the slide, or full screen\nQuick poll\tV\tAsk what you had not planned to ask\nFreeze\tZ\tHold the wall while you digress\nDraw\tI\tInk on the slide, or spotlight part of it\nBlank\tB\tBlack the projector · Shift+B the phones\nJoin code\tJ\tThe QR and PIN, full screen\nEverything else\t?\tThe full list of keys',
          notes: 'THE CONTROLS fade in when the mouse moves and fade out again, so a still wall is a slide rather than a slide with a toolbar on it. Everything here has a key, and the keys are the faster route.\n\nBehind the ••• as well, each with its own key: the leaderboard (E), the room’s reactions on or off (T), who may speak (Shift+H), reset the scores (R), named answers in the presenter window (W), full screen (F), and the two pop-outs. FREEZE is the one to learn first — it is the difference between a digression and a scramble.' },

        { type: 'table', title: 'Teacher Presenter — nine panels',
          body: 'Panel\tWhat it holds\nNotes\tYour notes for this slide, and the next slide beside them\nQuick\tA task with a countdown, a break, and five one-tap polls\nActivities\tThe library, runnable mid-lesson without leaving the show\nPulse\tReactions and slide responses as they arrive\nAnswers\tWho answered what — names, not only totals\nClass\tThe register: who joined, who is still missing\nInsights\tWhich questions the room found hard, and how sure it was\nTools\tName picker, timer, a scratch pad\nQ&A\tQuestions from phones, with a badge when one is waiting',
          notes: 'This window is private. The projector never shows it, which is why the notes you are reading live here rather than on the slide.\n\nIt opens as a real pop-out — drag it to a second screen, or keep it on the laptop while the wall runs the show. Press D from the show, or the button in the bar before you start.' },

        { type: 'compare', title: 'Two ways to share, and they are not the same thing',
          subtitle: 'Read at their own pace | Follows you live',
          bullets: [
            'Needs a live room\tNo — works whether or not you are presenting\tYes — Host live first, or the option is greyed out with the reason on it',
            'Who drives\tThey do: their pace, their order, their own time\tYou do: it moves when you move, including through a build, and cannot run ahead',
            'What it is for\tRevision afterwards, and the person who missed the lesson\tA second projector, an overflow room, a desktop at the back of the hall',
            'PIN\tNone. The address is the whole secret\tNone either — and nobody watching appears in your register or your reports'
          ],
          progressive: true,
          notes: 'SHARE asks which of these you want before it uploads anything, because they come out of one copy and answer completely different questions. Each gets its own QR code and its own address.\n\nWhat both mean: a copy on this server at an address nobody can guess, unlisted and read-only — but a link that escapes is a lesson that escaped. Games are not carried across; the slides are. You get a key that withdraws it, and it is the only way to.' },

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
            'Not chosen from the picker: quiz, results and explain. Those are built by the live session.'
          ],
          notes: 'Close. Rebuilding this lesson gives a fresh copy, so nothing here is precious. Every layout the picker offers is in this deck, video included — it plays a clip that ships with the deck rather than pointing at a URL that might not answer. Three slide types never appear in the picker at all: quiz and results are built by the live session, and explain is the card that shows the correct answer after a check — which is also why the student handout leaves it out.' }
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
      key: 'pace-nul',
      title: 'NUL · Openers, breakaways & a layout range',
      icon: '▣',
      blurb: 'Northeastern look: big word-leading openers, full-bleed image beats, and red section breaks that cut the argument into chapters. Use it as a pacing template.',
      minutes: 12,
      theme: 'northeastern',
      libraryGroup: 'nul',
      kind: 'template',
      org: 'Northeastern University London',
      logo: 'assets/brand/nu-london-logo.png',
      logoOn: 'all',
      logoSize: 'small',
      slides: [
        {
          type: 'title',
          title: 'Open hard.\nBreak often.',
          subtitle: 'A pacing gallery · Northeastern London',
          notes: 'OPENER — title. Short line breaks, big type, almost nothing else. Say the idea out loud before you advance.'
        },
        {
          type: 'image',
          title: 'One claim on a photograph',
          image: 'assets/lesson/ipdv/qa-london-night-1.jpg',
          imageFit: 'cover',
          design: { capStyle: 'scrim', capPos: 'bottom', imageMotion: 'zoom', logoGround: 'dark' },
          notes: 'OPENER — full-bleed image. The picture is the mood; the caption is the claim. Scrim keeps the words readable.'
        },
        {
          type: 'introduction',
          title: 'Your name',
          subtitle: 'Role · Northeastern University London',
          body: 'Replace this with who is standing at the front, and why this room should listen.',
          notes: 'OPENER — introduction. Once per cohort, not every week.'
        },
        {
          type: 'section',
          title: 'Part one',
          subtitle: 'A breakaway — look up before the next block of content.',
          notes: 'BREAKAWAY — section. Full red (or theme ground). Use these to cut a long argument into chapters the room can feel.'
        },
        {
          type: 'cards',
          title: 'Three ideas in this block',
          bullets: [
            'Name the question the room is here to answer.',
            'Show one example that makes the question real.',
            'Leave one thing unfinished so the next block has work to do.'
          ],
          notes: 'CONTENT — cards. Teaching meat after a breakaway. Keep to three.'
        },
        {
          type: 'section',
          title: 'Part two',
          subtitle: 'Another breath. Then a different layout.',
          notes: 'BREAKAWAY again. Two or three section slides per hour is usually enough; more and they stop meaning “look up”.'
        },
        {
          type: 'split',
          title: 'Say it. Show it.',
          bullets: [
            'Left: the claim in words.',
            'Right: the picture that proves or frames it.',
            'Build the bullets if you want the eye to wait.'
          ],
          image: 'assets/lesson/ipdv/snow-cholera-map-1854.jpg',
          imageFit: 'cover',
          design: { mediaGround: 'full' },
          progressive: true,
          notes: 'VARIATION — dual coding. Image + text after a breakaway keeps the chapter from feeling like another bullet wall.'
        },
        {
          type: 'quote',
          body: 'A section break is not decoration. It is where the room breathes.',
          subtitle: 'SlideForge pacing note',
          notes: 'VARIATION — quote. Soft landing inside a chapter, or a third kind of opener if the photograph is wrong for the day.'
        },
        {
          type: 'keyfact',
          title: 'What they must leave with',
          subtitle: 'One number or rule',
          body: 'Two breakaways beat twelve busy slides.',
          bullets: [
            'Open with words or a photograph.',
            'Cut chapters with section slides.',
            'Change layout when the chapter changes.'
          ],
          notes: 'VARIATION — key fact. Large claim, short support. Good mid-lesson or close.'
        },
        {
          type: 'journey',
          title: 'The arc of this hour',
          subtitle: 'Reveal each beat as you go',
          bullets: [
            'Open\tTitle or image that states the stake.',
            'Break\tSection — Part one.',
            'Build\tCards, split, keywords — the work.',
            'Break\tSection — Part two.',
            'Close\tFact, quote, or photograph.'
          ],
          progressive: true,
          notes: 'VARIATION — journey. Meta: this slide is the map of the gallery itself. Replace milestones with your session outline.'
        },
        {
          type: 'image',
          title: 'Leave them with a picture',
          image: 'assets/brand/nu-london-skyline.png',
          imageFit: 'cover',
          design: { capStyle: 'scrim', capPos: 'bottom', logoGround: 'dark' },
          notes: 'CLOSER — image. Same tool as the opener, different job: end on atmosphere and one line, not another bullet list.'
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
      key: 'vibe-product',
      title: 'Product · Keynote minimal',
      icon: '◇',
      blurb: 'Apple-style minimal with empty image slots ready for your photos. Title → photo statement → stat tiles → picture cards → photo close.',
      minutes: 5,
      theme: 'product',
      slides: [
        {
          type: 'title',
          title: 'Clarity.',
          subtitle: 'One idea. One slide. Drop your photos on the next four.',
          notes: 'PRODUCT opener — words first. Image slides below show the built-in placeholder until you add a file or URL.'
        },
        {
          type: 'image',
          title: 'Say less. Mean more.',
          subtitle: 'Your photograph · statement caption',
          notes: 'Statement beat as a full-bleed image slot. Paste a URL or drop a file in the inspector.'
        },
        {
          type: 'stats',
          title: 'By the numbers.',
          bullets: [
            'idea per slide\t1\tIf you have three messages, make three slides.',
            'words in a title\t≤ 6\tThe picture carries mood; the words carry the rule.',
            'accent colour\t1\tUsed once per slide, not on everything.'
          ],
          progressive: true,
          notes: 'STAT TILES — the fact beat as three big numbers. Each line is label · value · note. Try Design → Tile style → Ring or Bar.'
        },
        {
          type: 'cards',
          title: 'Two points. Done.',
          bullets: [
            'Whitespace\tLeave empty space alone — it is part of the design.',
            'One accent\tUse the accent colour once per slide, not on everything.'
          ],
          design: { cardsMode: 'pictures' },
          notes: 'CARDS as picture cards — two photo slots over two points. Drop your own images in the inspector; the dashed boxes are placeholders.'
        },
        {
          type: 'image',
          title: 'That’s it.',
          subtitle: 'Your closing photograph',
          notes: 'Close on a picture + one line — drop your own image here.'
        }
      ]
    },
    {
      key: 'vibe-editorial',
      title: 'Editorial · Paper & narrative',
      icon: '¶',
      blurb: 'Warm paper and serif type with placeholder photo slots. Title → dual-coding → photo claim → timeline → photo close.',
      minutes: 5,
      theme: 'editorial',
      slides: [
        {
          type: 'title',
          title: 'A story\nin five frames.',
          subtitle: 'Editorial · add your own pictures',
          notes: 'Editorial opener — cream and serif. Placeholders start on the next slide.'
        },
        {
          type: 'split',
          title: 'The picture is the mood.',
          bullets: [
            'The caption is the claim.',
            'Read the claim once — do not paraphrase it.',
            'Then advance to the photograph that earns it.'
          ],
          imageSide: 'left',
          notes: 'Quote-energy as dual coding — empty media slot until you add a cover or plate.'
        },
        {
          type: 'image',
          title: 'Look first. Then decide.',
          body: 'Replace this body with one or two facts that sit behind the photograph.',
          subtitle: 'Your photograph · the claim sits on the picture',
          notes: 'Full-bleed photo slot + claim. Scrim appears once an image is set.'
        },
        {
          type: 'timeline',
          title: 'What the eye did',
          subtitle: 'The first three seconds with a photograph',
          bullets: [
            '0.3 s\tCluster\tIt found the pattern before it found the legend.',
            '1 s\tTrust\tIt believed the picture faster than a paragraph.',
            '3 s\tNext step\tIt still needed one sentence for what to do.'
          ],
          design: { timelineMode: 'vertical' },
          progressive: true,
          notes: 'TIMELINE in the vertical shape — a spine with serif dates, one paragraph per beat. Switch to Across under Design when the sweep matters more than the detail.'
        },
        {
          type: 'image',
          title: 'End on a breath.',
          subtitle: 'Your closing photograph',
          notes: 'Photo close — placeholder until you drop a quiet image in.'
        }
      ]
    },
    {
      key: 'vibe-cinematic',
      title: 'Cinematic · Dark pitch',
      icon: '▣',
      blurb: 'Dark pitch energy with empty photo slots. Title → stake image → dual-coding → before/after versus → cut image.',
      minutes: 5,
      theme: 'cinematic',
      slides: [
        {
          type: 'title',
          title: 'Make it\nunmissable.',
          subtitle: 'Cinematic · drop your own night / product stills',
          notes: 'Gradient title. Image placeholders follow.'
        },
        {
          type: 'image',
          title: 'The stake',
          subtitle: 'Your photograph · why this room should care',
          notes: 'Stake as full-bleed image slot — same job as a section breakaway, with a picture behind it once you add one.'
        },
        {
          type: 'split',
          title: '3×',
          bullets: [
            'Spotlight — clearer slides get more of the questions that matter.',
            'And fewer of the ones that do not.',
            'Keep the support line short; the number is the slide.'
          ],
          imageSide: 'right',
          notes: 'Spotlight as dual coding — empty plate until you add a chart or still.'
        },
        {
          type: 'compare',
          title: 'Before / after',
          subtitle: 'Before | After',
          bullets: [
            'Text\tTwelve bullets, one font size\tOne claim',
            'Evidence\tA table nobody reads\tOne number',
            'Ask\tNothing\tOne next step'
          ],
          progressive: true,
          notes: 'VERSUS — two glass columns compared row by row. The subtitle names the columns; each line is row label · left · right. Rows land one per press.'
        },
        {
          type: 'image',
          title: 'Cut.',
          subtitle: 'Your closing still',
          notes: 'Hard close on a photograph slot. One word in the caption is enough.'
        }
      ]
    },
    {
      key: 'vibe-studio-teach',
      title: 'Studio teach · Warm classroom',
      icon: '✳',
      blurb: 'Sage Studio teaching arc with empty image slots. Title → hook photo → three-step stepper → check cards → reflect photo.',
      minutes: 8,
      theme: 'studio',
      slides: [
        {
          type: 'title',
          title: 'Stay curious.',
          subtitle: 'Studio teach · add classroom photographs on the next beats',
          notes: 'Studio opener. Placeholders carry the rest of the arc until you drop images in.'
        },
        {
          type: 'image',
          title: 'Hook',
          subtitle: 'Your hook photograph',
          feedback: {
            kind: 'wordcloud',
            prompt: 'One word — what distracts you most when you try to focus?',
            options: [],
            max: 2
          },
          notes: 'HOOK — image slot + word cloud. Add a photo, then let the room answer.'
        },
        {
          type: 'journey',
          journeyMode: 'stepper',
          title: 'Three moves that help',
          subtitle: 'In this order — each one makes the next easier',
          bullets: [
            'Remove\tOne distraction, before you start. Phone in the bag counts.',
            'Name\tA finish line you can see from here — not the whole essay, the next paragraph.',
            'Pause\tOnce. Then adjust — do not restart.'
          ],
          progressive: true,
          buildMode: 'dim',
          notes: 'JOURNEY in Stepper mode — numbered discs on one rail, a process read left to right. Dim build keeps earlier moves visible at 38% while the next arrives.'
        },
        {
          type: 'cards',
          title: 'Quick check',
          bullets: [
            'Tomorrow\tWhich move will you try first?',
            'Neighbour\tTell them in one sentence.'
          ],
          feedback: {
            kind: 'poll',
            prompt: 'Which move are you trying first?',
            options: ['Remove a distraction', 'Name a finish line', 'Pause once'],
            max: 1
          },
          notes: 'CHECK — cards + poll. Optional card photos later.'
        },
        {
          type: 'image',
          title: 'Reflect',
          subtitle: 'Your closing photograph',
          feedback: {
            kind: 'scale',
            prompt: 'How ready do you feel to try one move this week?',
            points: 5,
            lowLabel: 'Not yet',
            highLabel: 'Ready',
            max: 1
          },
          notes: 'REFLECT — photo slot + confidence scale.'
        }
      ]
    },
    {
      key: 'vibe-brutal',
      title: 'Brutal · Mono technical',
      icon: '▮',
      blurb: 'Hard mono edges with empty plate slots. Title → agenda image → funnel → claim split → end image.',
      minutes: 5,
      theme: 'brutal',
      slides: [
        {
          type: 'title',
          title: 'No chrome.\nJust signal.',
          subtitle: 'BRUTAL / MONO · drop technical plates below',
          notes: 'Uppercase opener. Image placeholders start on the next slide.'
        },
        {
          type: 'image',
          title: 'Agenda',
          body: '01 Name the constraint.\n02 Show the mechanism.\n03 Ship the rule.',
          subtitle: 'Your diagram or still · three beats',
          notes: 'AGENDA as an image slot + numbered caption — add a grid or schematic in the inspector.'
        },
        {
          type: 'funnel',
          title: 'Mechanism',
          subtitle: 'Everything above the rule is scaffolding',
          bullets: [
            'Constraint\tI\tWhat must stay true, whatever else changes.',
            'Mechanism\tII\tThe one move that enforces it.',
            'Rule\tIII\tShort enough for a README.'
          ],
          progressive: true,
          notes: 'FUNNEL — three squared bands narrowing to the rule. Values here are roman numerals, not numbers, so the bands narrow evenly; give them real counts and the widths follow the data instead.'
        },
        {
          type: 'split',
          title: 'If it needs a paragraph,',
          bullets: [
            'it is not the rule yet.',
            '// end of mechanism'
          ],
          imageSide: 'right',
          notes: 'QUOTE energy as split — claim beside an empty plate slot.'
        },
        {
          type: 'image',
          title: 'END',
          subtitle: 'Your closing plate',
          notes: 'Acid close — drop a stark chart or still, then walk off.'
        }
      ]
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
    }
  ];

  /** Brand packs filed into the Library on first visit. Looks (vibe galleries,
   *  infographic museum) stay out — those live in Settings → Theme. */
  var LIBRARY_SEED_KEYS = {
    'ipdv-intro': 'nul',
    'layout-bank': 'nul',
    'pace-nul': 'nul',
    'ukbt-sponsorship': 'ukbt',
    'ukbt-campaigns': 'ukbt',
    'ukbt-template': 'ukbt',
    'ukbt-institute-partnership': 'ukbt-institute',
    'ukbt-institute-template': 'ukbt-institute',
    'ukbt-institute-townhouse': 'ukbt-institute'
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
   *
   * @returns {number} how many packs were added this call
   */
  function seedLibrary() {
    if (!SF.Store) return 0;
    var byKey = {};
    SF.Store.list().forEach(function (d) {
      if (d.sourceKey) byKey[d.sourceKey] = d;
    });
    var added = 0;
    Object.keys(LIBRARY_SEED_KEYS).forEach(function (key) {
      if (byKey[key]) return;
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
    if (LIBRARY_SEED_KEYS[spec.key]) deck.sourceKey = spec.key;
    /* Carried like the logo fields below, and for the same reason: a lesson
       that names its institution has to hand that to the deck, or the theme
       prints nothing where the organisation line goes. */
    if (spec.org) deck.org = spec.org;
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
  SF.LIBRARY_SEED_KEYS = LIBRARY_SEED_KEYS;
  SF.buildLesson = buildLesson;
  SF.seedLibrary = seedLibrary;
})(typeof window !== 'undefined' ? window : globalThis);
