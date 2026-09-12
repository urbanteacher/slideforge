/* Generated from src/model.js. Do not edit; run npm run build. */
"use strict";
(() => {
  // src/boards/runtime.js
  function createBoardRuntime(namespace, styles, clock = {
    now: () => Date.now(),
    every: (callback, milliseconds) => setInterval(callback, milliseconds),
    cancel: (timer) => clearInterval(timer)
  }) {
    function definitions() {
      const unique = /* @__PURE__ */ new Map();
      for (const style of Object.values(styles)) {
        if (style.boardEngine) unique.set(style.boardEngine.key, style.boardEngine);
      }
      return [...unique.values()];
    }
    function forSlide(slide) {
      return slide && definitions().find((board5) => slide[board5.field]) || null;
    }
    function current(host, slide) {
      const board5 = forSlide(slide);
      return board5 && host[board5.states] && host[board5.states][slide.id] || null;
    }
    function unmountAll() {
      for (const board5 of definitions()) namespace()[board5.runtime]?.unmount();
    }
    function reset(host) {
      unmountAll();
      for (const board5 of definitions()) host[board5.states] = {};
    }
    function mount(host, slide, node) {
      const board5 = forSlide(slide);
      if (board5) namespace()[board5.runtime]?.mount(host, slide, node);
    }
    function render(pad, slide, options, root) {
      const board5 = forSlide(slide);
      const engine = board5 && namespace()[board5.runtime];
      if (!engine) return false;
      root.classList.add(board5.className);
      engine.render(pad, slide, options);
      return true;
    }
    function snapshot(host) {
      return Object.fromEntries(
        definitions().map((board5) => [board5.states, host[board5.states] || {}])
      );
    }
    function renderOptions(host, slide, sendCommand) {
      const options = {};
      for (const board5 of definitions()) {
        options[board5.state] = host && host[board5.states] && host[board5.states][slide.id];
        options[board5.command] = sendCommand ? (action, card) => {
          const payload = { action };
          if (card !== void 0) payload.card = card;
          sendCommand(board5.key, payload);
        } : null;
      }
      return options;
    }
    function command(key, action, card) {
      const board5 = definitions().find((board6) => board6.key === key);
      const engine = board5 && namespace()[board5.runtime];
      if (!engine) return false;
      engine.command(action, card);
      return true;
    }
    function stamp(host, slide, theme) {
      const state = current(host, slide);
      return state ? JSON.stringify([slide.id, theme, { ...state, elapsed: 0, remaining: 0 }]) : null;
    }
    function refreshClock(box, host, slide) {
      const board5 = forSlide(slide);
      const state = current(host, slide);
      const clock2 = board5?.clock && box.querySelector(board5.clock.selector);
      if (!clock2 || !state) return false;
      clock2.textContent = board5.clock.text(state, namespace()[board5.runtime]);
      return true;
    }
    function restoreFocus(node, slide) {
      const board5 = forSlide(slide);
      if (!board5) return;
      const target = node.querySelector(board5.focusPrimary) || node.querySelector(board5.focusFallback);
      target?.focus({ preventScroll: true });
    }
    function onVerdict(report) {
      for (const board5 of definitions()) {
        const engine = namespace()[board5.runtime];
        if (engine)
          engine[board5.reportEvent || "onVerdict"] = board5.reportValue ? (value) => report(board5.reportValue(value)) : report;
      }
    }
    function createSession(key, { player, slide, node, create, render: render2, command: command2, tick, interval = 1e3 }) {
      const board5 = definitions().find((board6) => board6.key === key);
      player[board5.states] = player[board5.states] || {};
      if (!player[board5.states][slide.id])
        player[board5.states][slide.id] = create(slide[board5.field]);
      let last = clock.now();
      let stopped = false;
      const session = { player, slide, node };
      const sync = () => {
        if (player.syncPresenter) player.syncPresenter();
      };
      session.paint = (focus) => {
        render2(node.querySelector(".pad"), slide, {
          [board5.state]: player[board5.states][slide.id],
          [board5.command]: command2
        });
        if (focus) restoreFocus(node, slide);
        sync();
      };
      session.tick = () => {
        if (stopped) return;
        const now = clock.now();
        const dt = Math.max(0, (now - last) / 1e3);
        last = now;
        const state = player[board5.states][slide.id];
        if (state.paused || player.blank) return;
        if (tick(session, dt)) {
          refreshClock(node, player, slide);
          sync();
        }
      };
      session.start = () => {
        session.paint(false);
        session.timer = clock.every(session.tick, interval);
      };
      session.stop = () => {
        if (stopped) return;
        session.tick();
        clock.cancel(session.timer);
        stopped = true;
      };
      return session;
    }
    return {
      forSlide,
      current,
      unmountAll,
      reset,
      mount,
      render,
      snapshot,
      renderOptions,
      command,
      stamp,
      refreshClock,
      restoreFocus,
      onVerdict,
      createSession
    };
  }

  // src/activities/catalogue.js
  var PHASES = [
    { key: "starter-slide", label: "Starter Slide", icon: "▤", blurb: "Put the destination on the wall before anything else." },
    { key: "starter-activity", label: "Starter Activity", icon: "◎", blurb: "Settle the room and pull back what they already know." },
    { key: "activation", label: "Activation", icon: "✦", blurb: "Surface prior thinking, including the wrong kind." },
    { key: "construction", label: "Construction", icon: "◧", blurb: "Build the idea: model it, name its edges." },
    { key: "mini-activity", label: "Mini Activity", icon: "⚡", blurb: "A short go at it while the modelling is still warm." },
    { key: "main-activity", label: "Main Activity", icon: "▣", blurb: "The long piece of work the lesson is for." },
    { key: "collaboration", label: "Collaboration", icon: "▦", blurb: "Make them say it out loud to somebody." },
    { key: "mini-quiz", label: "Mini Quiz", icon: "?", blurb: "Find out who has it, while there is time to act." },
    { key: "reflection", label: "Reflection", icon: "↺", blurb: "What stuck, what did not, and what to do about it." },
    { key: "plenary", label: "Plenary", icon: "⚑", blurb: "Close it, and point at what comes next." },
    { key: "activity-plenary", label: "Activity Plenary", icon: "⚐", blurb: "Close on the work rather than on the clock." }
  ];
  var ACTIVITIES = [
    {
      key: "clear-objectives-slide",
      icon: "▤",
      title: "Clear Objectives Slide",
      blurb: "Display learning objectives, success criteria, and key words",
      phase: "starter-slide",
      minutes: 2,
      target: "slide",
      layout: "keywords",
      steps: [
        "Display slide with: Title, Learning Objectives (3), Success Criteria (I can...), Key Words",
        "Teacher reads objectives aloud",
        "Get started with active learning"
      ]
    },
    {
      key: "hook-objectives",
      icon: "▤",
      title: "Hook + Objectives",
      blurb: "Engaging stimulus + big question + today's activities",
      phase: "starter-slide",
      minutes: 2,
      target: "slide",
      layout: "split",
      steps: [
        "Show engaging image/video/question",
        "Present Big Question that will be answered",
        "Show: Today we will... (3 activities)",
        "Show: By the end you'll be able to..."
      ]
    },
    {
      key: "connection-slide",
      icon: "▤",
      title: "Connection Slide",
      blurb: "Last lesson → Today → Next lesson + Why it matters",
      phase: "starter-slide",
      minutes: 2,
      target: "slide",
      layout: "cards",
      steps: [
        "Show: Last Lesson (brief recap)",
        "Show: Today (what we're learning)",
        "Show: Next Lesson (where we're going)",
        "Show: Why This Matters (real-world connection)",
        "Show: What You'll Do (3 activities)"
      ]
    },
    {
      key: "quick-retrieval-quiz",
      icon: "◎",
      title: "Quick Retrieval Quiz",
      blurb: "Answer 3-5 questions from memory to recall prior learning",
      phase: "starter-activity",
      minutes: 7,
      target: "game",
      style: "lowstakes",
      steps: [
        "Students answer 3-5 recall questions individually",
        "Pair check answers (2 mins)",
        "Whole class review and discussion (3 mins)",
        "Link to today's objective"
      ]
    },
    {
      key: "think-pair-share",
      icon: "◎",
      title: "Think-Pair-Share",
      blurb: "Individual thinking → Partner discussion → Share out",
      phase: "starter-activity",
      minutes: 7,
      target: "moment",
      steps: [
        "Think alone (1 min) - jot down ideas about [topic]",
        "Share with partner (2 mins) - compare notes",
        "Pairs share best ideas (3 mins) - class discussion",
        "Teacher synthesizes (1 min) - connect to today's goal"
      ]
    },
    {
      key: "hook-and-predict",
      icon: "◎",
      title: "Hook & Predict",
      blurb: "Present intriguing stimulus and ask 'What do you notice? What do you wonder?'",
      phase: "starter-activity",
      minutes: 7,
      target: "slide",
      layout: "split",
      steps: [
        "Show attention-grabbing stimulus (30 secs)",
        "Students write 2 things they notice (1 min)",
        "Students write 1 thing they wonder (1 min)",
        "Share out observations and questions (3 mins)",
        "Link to today's learning objective (1 min)"
      ]
    },
    {
      key: "word-splash",
      icon: "◎",
      title: "Word Splash",
      blurb: "Connect key vocabulary to prior knowledge through self-assessment",
      phase: "starter-activity",
      minutes: 7,
      target: "feedback",
      feedbackKind: "wordcloud",
      steps: [
        "Display 5-8 key terms for today's lesson",
        "Students circle terms they know well",
        "Underline terms they've heard but unsure",
        "Leave blank terms they don't know",
        "Partner discussion (2 mins): Explain circled terms",
        "Class creates working definitions (3 mins)",
        "Self-assess confidence: 🟢🟡🔴"
      ]
    },
    {
      key: "daily-review-routine",
      icon: "◎",
      title: "Daily Review Routine",
      blurb: "Check homework, address common errors, reteach concepts - daily routine for retention",
      phase: "starter-activity",
      minutes: 8,
      target: "slide",
      layout: "cards",
      steps: [
        "Quick homework check (2 mins) - scan for completion, spot common issues",
        "Address common errors (3 mins) - whole class discussion of 2-3 frequent mistakes",
        "Guided practice (3 mins) - reteach tricky concept with worked example",
        "Link to today's lesson (30 secs) - 'Today we'll build on this by...'"
      ]
    },
    {
      key: "establish-talk-ground-rules",
      icon: "◎",
      title: "Establish Talk Ground Rules",
      blurb: "Co-create class ground rules for quality dialogue and oracy (use at start of year/unit)",
      phase: "starter-activity",
      minutes: 10,
      target: "slide",
      layout: "keywords",
      steps: [
        "Ask: 'What makes group discussions go well?' (2 mins) - brainstorm ideas",
        "Ask: 'What makes them go badly?' (2 mins) - identify problems",
        "Students pair-discuss and share ideas (3 mins) - synthesize thinking",
        "Co-create list of 5-7 ground rules together (2 mins) - write on chart paper",
        "Display rules prominently in classroom (1 min)",
        "Note: Revisit these before each oracy activity throughout year"
      ]
    },
    {
      key: "do-now-bell-ringer",
      icon: "✦",
      title: "Do Now / Bell Ringer",
      blurb: "Silent individual work on board when students enter",
      phase: "activation",
      minutes: 8,
      target: "moment",
      steps: [
        "On board: 3 questions (recall from last lesson, connection, preview)",
        "Silent individual work (5 mins)",
        "Quick pair check (2 mins)",
        "Whole class review (3 mins)",
        "Link to today's objective"
      ]
    },
    {
      key: "knowledge-activation-web",
      icon: "✦",
      title: "Knowledge Activation Web",
      blurb: "Build a web of connected ideas on the board",
      phase: "activation",
      minutes: 7,
      target: "feedback",
      feedbackKind: "wordcloud",
      steps: [
        "Write topic in center of board (1 min)",
        "Students call out anything they know (3 mins)",
        "Teacher writes and draws connecting lines",
        "Look for patterns and gaps (2 mins)",
        "Set today's learning goal (1 min)"
      ]
    },
    {
      key: "pre-assessment-quickfire",
      icon: "✦",
      title: "Pre-Assessment Quickfire",
      blurb: "Thumbs up/down/sideways for 8-10 true/false statements",
      phase: "activation",
      minutes: 8,
      target: "game",
      style: "truefalse",
      steps: [
        "Teacher reads 8-10 statements",
        "Students show: 👍 True / 👎 False / 👉 Unsure",
        "Teacher notes misconceptions",
        "Clarify key terms",
        "Set learning goals based on gaps"
      ]
    },
    {
      key: "i-do-we-do-you-do",
      icon: "◧",
      title: "I Do, We Do, You Do",
      blurb: "Gradual release: Teacher models → Guided practice → Independent practice",
      phase: "construction",
      minutes: 20,
      target: "slide",
      layout: "cards",
      steps: [
        "I DO (5 mins): Teacher models with think-aloud",
        "WE DO (8 mins): Class solves together, teacher guides",
        "YOU DO Together (5 mins): Partner practice with support",
        "YOU DO Alone (7 mins): Independent practice, quick check"
      ]
    },
    {
      key: "concept-development",
      icon: "◧",
      title: "Concept Development",
      blurb: "Build understanding: Show → Explain → Examples/Non-Examples → Apply",
      phase: "construction",
      minutes: 20,
      target: "slide",
      layout: "keywords",
      steps: [
        "SHOW: Present concept with clear example (3 mins)",
        "EXPLAIN: Break down - what, why, how (5 mins)",
        "EXAMPLES & NON-EXAMPLES: Identify features (5 mins)",
        "GUIDED APPLICATION: Apply concept (7 mins)",
        "INDEPENDENT PRACTICE: Create own examples (5 mins)"
      ]
    },
    {
      key: "flipped-instruction",
      icon: "◧",
      title: "Flipped Instruction",
      blurb: "Deepen understanding after home learning (Review → Deep Dive → Application)",
      phase: "construction",
      minutes: 25,
      target: "slide-arc",
      steps: [
        "Home Learning Review (3 mins): Poll understanding, address questions",
        "Deep Dive (10 mins): Focus on hardest parts, work complex examples",
        "Application Practice (12 mins): Apply to challenging problems, differentiated support"
      ]
    },
    {
      key: "question-cube-six-question-types",
      icon: "◧",
      title: "Question Cube - Six Question Types",
      blurb: "Deep questioning using Rosenshine's six question templates: Define, Compare, Why, Example, What If, Benefits/Limits",
      phase: "construction",
      minutes: 20,
      target: "feedback",
      feedbackKind: "brainstorm",
      steps: [
        "Present topic/concept (e.g., 'Photosynthesis') (1 min)",
        "Explain the 6 question types (2 mins):",
        "🔵 DEFINE: What is [concept]?",
        "🟢 COMPARE: How is it different from [related concept]?",
        "🟡 WHY: Why is [concept] important/how does it work?",
        "🟣 EXAMPLE: Give a real-world example",
        "🔴 WHAT IF: What would happen if...?",
        "🟠 BENEFITS/LIMITS: What conditions are needed? What are the limitations?",
        "Round 1 (12 mins): Teacher or student picks question type, student answers (30s thinking, 30s response), rotate through all 6 types with 2-3 students per type",
        "Round 2 (optional): Students generate their own questions for each type",
        "Debrief (5 mins): Which questions were hardest? Which helped you understand most?"
      ]
    },
    {
      key: "worked-example-analysis",
      icon: "⚡",
      title: "Worked Example Analysis",
      blurb: "Analyze a completed example together to understand the process",
      phase: "mini-activity",
      minutes: 10,
      target: "slide",
      layout: "split",
      steps: [
        "Display completed example (1 min)",
        "Students identify each step (3 mins) - What happened? Why?",
        "Pairs create a 'recipe' for solving similar problems (3 mins)",
        "Test recipe on new problem (3 mins)",
        "Compare approaches (2 mins)"
      ]
    },
    {
      key: "error-analysis",
      icon: "⚡",
      title: "Error Analysis",
      blurb: "Find and fix mistakes in sample work to identify misconceptions",
      phase: "mini-activity",
      minutes: 10,
      target: "game",
      style: "oddone",
      steps: [
        "Show work with 3-4 deliberate errors (1 min)",
        "Individual: Spot the errors (3 mins)",
        "Pairs: Discuss and correct errors (3 mins)",
        "Share: What were the errors? (2 mins)",
        "Reflect: Why might someone make these mistakes? (1 min)"
      ]
    },
    {
      key: "quick-practice-stations",
      icon: "⚡",
      title: "Quick Practice Stations",
      blurb: "Rotate through 3 quick tasks: Recall, Apply, Create",
      phase: "mini-activity",
      minutes: 10,
      target: "slide",
      layout: "cards",
      steps: [
        "Station 1: Recall task (3 mins)",
        "Station 2: Apply task (3 mins)",
        "Station 3: Create task (3 mins)",
        "Brief share out (1 min)"
      ]
    },
    {
      key: "concept-card-sort",
      icon: "⚡",
      title: "Concept Card Sort",
      blurb: "Organize information into categories to understand relationships",
      phase: "mini-activity",
      minutes: 10,
      target: "game",
      style: "order",
      steps: [
        "Give each group 12-15 cards with terms/images/examples (1 min)",
        "Sort into categories (4 mins) - choose or create categories",
        "Groups walk around to see others' sorts (2 mins)",
        "Discuss: Different ways to organize (2 mins)",
        "Reflect: Which organization is most useful? Why? (1 min)"
      ]
    },
    {
      key: "interleaving-mixed-practice",
      icon: "⚡",
      title: "Interleaving Mixed Practice",
      blurb: "Mix problems from today AND previous weeks for long-term retention (spaced learning)",
      phase: "mini-activity",
      minutes: 15,
      target: "game",
      style: "choice",
      steps: [
        "Present 10 problems: 6 from today's topic, 4 from previous weeks (1 min)",
        "Students solve independently (8 mins) - mix of old and new",
        "Pair-check answers (3 mins) - discuss strategies used",
        "Whole class: 'How did previous learning help today?' (3 mins)",
        "Reflect: Which problems were harder - new or old? Why?"
      ]
    },
    {
      key: "strategic-wait-time-questioning",
      icon: "⚡",
      title: "Strategic Wait Time Questioning",
      blurb: "Questioning with explicit 3-5 second wait time for deeper thinking and participation",
      phase: "mini-activity",
      minutes: 10,
      target: "moment",
      steps: [
        "Pose question to whole class clearly",
        "⏱️ WAIT 3-5 seconds (no hands up yet) - give thinking time",
        "Call on student randomly (use name sticks/cards)",
        "⏱️ WAIT 3 seconds for student to formulate answer",
        "Student responds",
        "⏱️ WAIT 2 seconds before responding or asking follow-up",
        "Repeat 5-7 times with different students (10 mins total)",
        "Note: Increased wait time = better answers + more participation"
      ]
    },
    {
      key: "guided-inquiry-investigation",
      icon: "▣",
      title: "Guided Inquiry Investigation",
      blurb: "Students discover concepts through structured exploration (Explore → Explain → Elaborate → Share)",
      phase: "main-activity",
      minutes: 30,
      target: "slide-arc",
      steps: [
        "EXPLORE (10 mins): Investigate stimulus - What patterns? What happens when you change X?",
        "EXPLAIN (8 mins): Develop explanation - Why? What's the rule?",
        "ELABORATE (7 mins): Apply to new situation - Use understanding to solve problems",
        "SHARE & REFINE (5 mins): Present findings and build shared understanding"
      ]
    },
    {
      key: "jigsaw-expert-groups",
      icon: "▣",
      title: "Jigsaw Expert Groups",
      blurb: "Students become experts and teach peers (Home → Expert → Home)",
      phase: "main-activity",
      minutes: 29,
      target: "moment",
      steps: [
        "Home Groups (5 mins): Groups of 4, assign each person a sub-topic",
        "Expert Groups (12 mins): All 1s together, become experts, create teaching plan",
        "Home Groups Return (12 mins): Each expert teaches their part (3 mins each), create complete picture"
      ]
    },
    {
      key: "problem-based-learning",
      icon: "▣",
      title: "Problem-Based Learning",
      blurb: "Solve authentic, complex problem through structured inquiry",
      phase: "main-activity",
      minutes: 35,
      target: "slide",
      layout: "split",
      steps: [
        "Present Problem: Real-world scenario (3 mins)",
        "What do we KNOW? List given information (5 mins)",
        "What do we NEED to know? Identify gaps (5 mins)",
        "Research & Plan: Find information, develop strategy (10 mins)",
        "Solve: Implement solution, show working (10 mins)",
        "Present & Justify: Share solution and reasoning (7 mins)"
      ]
    },
    {
      key: "differentiated-practice-menu",
      icon: "▣",
      title: "Differentiated Practice Menu",
      blurb: "Must-do task plus choice board (Consolidate/Apply/Extend)",
      phase: "main-activity",
      minutes: 25,
      target: "slide",
      layout: "cards",
      steps: [
        "Must Do: Core practice task - everyone (10 mins)",
        "Choose Your Challenge (15 mins):",
        "🟢 Consolidate: Easier version with scaffolding",
        "🟡 Apply: Standard problem-solving",
        "🔴 Extend: Complex multi-step challenge"
      ]
    },
    {
      key: "design-and-create-task",
      icon: "▣",
      title: "Design & Create Task",
      blurb: "Create something that demonstrates understanding (poster/model/presentation/video)",
      phase: "main-activity",
      minutes: 35,
      target: "slide",
      layout: "cards",
      steps: [
        "Brief: Design/create [product] that shows understanding (2 mins)",
        "Planning: Sketch ideas, gather resources (5 mins)",
        "Creating: Make your product (20 mins)",
        "Self-assessment: Check against criteria (3 mins)",
        "Gallery walk: View and learn from others (5 mins)"
      ]
    },
    {
      key: "think-pair-square-share",
      icon: "▦",
      title: "Think-Pair-Square-Share",
      blurb: "Progressive sharing: Individual → Pair → Group of 4 → Class",
      phase: "collaboration",
      minutes: 13,
      target: "moment",
      steps: [
        "THINK (2 mins): Individual reflection",
        "PAIR (3 mins): Share with partner",
        "SQUARE (4 mins): Join another pair, synthesize",
        "SHARE (4 mins): Groups present to class"
      ]
    },
    {
      key: "jigsaw-collaboration",
      icon: "▦",
      title: "Jigsaw Collaboration",
      blurb: "Home groups → Expert groups → Return to teach (see Main Activity for full version)",
      phase: "collaboration",
      minutes: 20,
      target: "moment",
      steps: [
        "Home groups split (2 mins)",
        "Expert groups learn one piece (10 mins)",
        "Return to home groups to teach (8 mins)"
      ]
    },
    {
      key: "peer-teaching-carousel",
      icon: "▦",
      title: "Peer Teaching Carousel",
      blurb: "Rotate through stations, adding to and building on previous groups' work",
      phase: "collaboration",
      minutes: 20,
      target: "moment",
      steps: [
        "Setup: 4-5 stations with different tasks",
        "Groups rotate every 4 minutes",
        "At each station: Read previous work, add thinking, correct errors",
        "Final Round (5 mins): Return to starting station, review, synthesize",
        "Present to class"
      ]
    },
    {
      key: "socratic-seminar",
      icon: "▦",
      title: "Socratic Seminar (Simple)",
      blurb: "Student-led discussion: Inner circle discusses, outer circle observes",
      phase: "collaboration",
      minutes: 20,
      target: "moment",
      steps: [
        "Round 1 (8 mins): Inner circle discusses prompt with evidence",
        "Round 2 (8 mins): Switch circles, new discussion",
        "Debrief (4 mins): What strong arguments? What was convincing?"
      ]
    },
    {
      key: "dialogue-chain-discussion",
      icon: "▦",
      title: "Dialogue Chain Discussion",
      blurb: "Structured student-led discussion where each student builds on previous responses using academic connectors",
      phase: "collaboration",
      minutes: 15,
      target: "slide",
      layout: "cards",
      steps: [
        "Present discussion question to class (1 min)",
        "Student 1: Gives initial answer (30 seconds)",
        "Student 2: 'I agree/disagree because...' OR 'Building on that idea...' (30 seconds)",
        "Student 3: Continues chain using academic language (30 seconds)",
        "Continue for 8-10 students (10 mins)",
        "Teacher synthesizes key insights (2 mins)"
      ]
    },
    {
      key: "real-world-connection-hunt",
      icon: "▦",
      title: "Real-World Connection Hunt",
      blurb: "Students identify real-world examples of concepts in their classroom, school, home, and community",
      phase: "collaboration",
      minutes: 15,
      target: "feedback",
      feedbackKind: "brainstorm",
      steps: [
        "Present concept (e.g., 'Friction' or 'Democracy') (2 mins)",
        "Challenge 1 (3 mins): Find examples in THIS ROOM",
        "Challenge 2 (3 mins): Think of examples AT HOME",
        "Challenge 3 (3 mins): Identify examples IN YOUR COMMUNITY",
        "Share out (3 mins): Students explain their connections",
        "Reflect (1 min): 'Why does this concept matter in real life?'"
      ]
    },
    {
      key: "explanation-champion-challenge",
      icon: "▦",
      title: "Explanation Champion Challenge",
      blurb: "Students explain concepts without using banned words, forcing deeper articulation of understanding",
      phase: "collaboration",
      minutes: 15,
      target: "game",
      style: "headsup",
      steps: [
        "Display concept word (e.g., 'Photosynthesis') (1 min)",
        "Show 4-5 BANNED WORDS students can't use (e.g., 'sunlight', 'oxygen', 'plants') (1 min)",
        "Think time (2 mins): Students plan their explanation",
        "Volunteer explains to class (60 seconds)",
        "Class votes: Clear (2 pts), Okay (1 pt), Unclear (0 pts)",
        "Repeat with 3-4 more students and concepts (8 mins)",
        "Debrief (2 mins): What made explanations clear?"
      ]
    },
    {
      key: "compare-and-contrast-venn-activity",
      icon: "▦",
      title: "Compare & Contrast Venn Activity",
      blurb: "Visual comparison of two concepts using Venn diagram, focusing on similarities and differences",
      phase: "collaboration",
      minutes: 15,
      target: "game",
      style: "compare",
      steps: [
        "Present two concepts (e.g., 'Photosynthesis' vs 'Respiration') (1 min)",
        "Individual thinking (3 mins): List characteristics of each",
        "Pair work (5 mins): Create Venn diagram together",
        "Gallery walk (4 mins): View other pairs' work",
        "Class synthesis (2 mins): What patterns? What connections?"
      ]
    },
    {
      key: "benefits-vs-limitations-battle",
      icon: "▦",
      title: "Benefits vs Limitations Battle",
      blurb: "Two teams take turns stating benefits and limitations of a concept, practicing balanced analysis",
      phase: "collaboration",
      minutes: 15,
      target: "slide",
      layout: "split",
      steps: [
        "Present topic (e.g., 'Renewable Energy' or 'Social Media') (1 min)",
        "Team setup: Benefits Team vs Limitations Team (1 min)",
        "30-second think time before each round",
        "Teams alternate stating points (10 mins)",
        "Scoring: Valid point = 1 point, Repeat = no points",
        "Switch sides and continue (optional)",
        "Debrief (2 mins): Balanced view discussion"
      ]
    },
    {
      key: "scenario-analysis-discussion",
      icon: "▦",
      title: "Scenario Analysis Discussion",
      blurb: "Analyze real-world scenarios to identify concepts, explain applications, and predict outcomes",
      phase: "collaboration",
      minutes: 18,
      target: "slide",
      layout: "split",
      steps: [
        "Present concept (e.g., 'Supply and Demand') (2 mins)",
        "Show 3 scenarios (e.g., concert tickets, crop harvest, iPhone release) (3 mins)",
        "Question 1 (4 mins): Which scenarios show the concept? (All/Some/One)",
        "Question 2 (4 mins): Pick one and explain HOW",
        "Question 3 (3 mins): Predict what happens next",
        "Question 4 (2 mins): Compare - which is most extreme?"
      ]
    },
    {
      key: "whiteboards-on-walls",
      icon: "▦",
      title: "Whiteboards on Walls",
      blurb: "Students discuss and write thinking on wall whiteboards - visible thinking and peer learning (Franklin Sixth Form approach)",
      phase: "collaboration",
      minutes: 12,
      target: "moment",
      steps: [
        "Students move to wall whiteboards in pairs/groups (30 secs)",
        "Teacher poses problem/question (30 secs)",
        "Groups discuss and write their thinking on whiteboards (5 mins)",
        "Gallery walk - observe and learn from other groups' work (3 mins)",
        "Return to own board and refine thinking based on what you saw (2 mins)",
        "Whole class debrief of key ideas and strongest arguments (1 min)",
        "Note: Arrive early to start, revisit at lesson end for consolidation"
      ]
    },
    {
      key: "connect-four-concept-edition",
      icon: "▦",
      title: "Connect Four - Concept Edition",
      blurb: "Competitive matching game where students connect related concepts (definitions/terms, causes/effects, questions/answers)",
      phase: "collaboration",
      minutes: 20,
      target: "game",
      style: "conceptchain",
      steps: [
        "MODE A - Match Pairs (20 mins):",
        "Setup (2 mins): Create 4x4 grid with paired cards (definitions/terms, causes/effects, questions/answers, benefits/limitations)",
        "Teams take turns (15 mins): Claim two cards that match and explain the connection",
        "If correct: Cards disappear, team scores a connection",
        "If incorrect: Cards stay, next team's turn",
        "Win condition: First team to make 4 valid connections wins",
        "Debrief (3 mins): Discuss strongest connections and misconceptions",
        "MODE B - Category Conquest (Alternative):",
        "Setup: 4 columns, 4 rows of questions (Define, Compare, Example, Why)",
        "Students answer questions to 'claim' spaces",
        "First to get 4 in a row (vertical, horizontal, diagonal) wins"
      ]
    },
    {
      key: "multiple-choice-quiz",
      icon: "?",
      title: "Multiple Choice Quiz",
      blurb: "5-8 multiple choice questions with immediate feedback",
      phase: "mini-quiz",
      minutes: 6,
      target: "game",
      style: "choice",
      steps: [
        "Present 5-8 multiple choice questions",
        "Students respond (paper/whiteboard/digital/fingers)",
        "Show correct answer after each (30-45 secs per question)",
        "Quick explanation if needed",
        "Move on - don't dwell"
      ]
    },
    {
      key: "true-false-rapid-fire",
      icon: "?",
      title: "True/False Rapid Fire",
      blurb: "10-12 true/false statements with thumbs up/down/sideways",
      phase: "mini-quiz",
      minutes: 5,
      target: "game",
      style: "truefalse",
      steps: [
        "Teacher reads 10-12 true/false statements",
        "Students show: 👍 True / 👎 False / 👉 Unsure",
        "Statements mix easy, challenging, and misconceptions",
        "Tally scores, address misconceptions"
      ]
    },
    {
      key: "short-answer-check",
      icon: "?",
      title: "Short Answer Check",
      blurb: "3-5 short answer questions, pair mark with answer key",
      phase: "mini-quiz",
      minutes: 8,
      target: "game",
      style: "type",
      steps: [
        "Students write answers to 3-5 questions (4 mins)",
        "Swap with partner (1 min)",
        "Mark using answer key (2 mins)",
        "Discuss any disagreements (1 min)",
        "Self-assess: ___ / 5"
      ]
    },
    {
      key: "diagnostic-question",
      icon: "?",
      title: "Diagnostic Question",
      blurb: "1-2 carefully designed questions that reveal thinking and misconceptions",
      phase: "mini-quiz",
      minutes: 7,
      target: "game",
      style: "choice",
      steps: [
        "Present 1-2 diagnostic questions (3 mins)",
        "Students answer with explanation",
        "Teacher analyzes common answers (2 mins)",
        "Address misconception immediately (2 mins)",
        "Group students by need if necessary"
      ]
    },
    {
      key: "structured-reflection-protocol",
      icon: "↺",
      title: "Structured Reflection Protocol (Four-Corner)",
      blurb: "Students move to corners based on confidence level",
      phase: "reflection",
      minutes: 12,
      target: "feedback",
      feedbackKind: "poll",
      steps: [
        "Explain corners: Got it / Mostly understand / Getting there / Need help",
        "Students move to their corner (2 mins)",
        "Each corner completes specific task (6 mins)",
        "Teacher visits each corner, addresses needs (4 mins)"
      ]
    },
    {
      key: "learning-log-entry",
      icon: "↺",
      title: "Learning Log Entry",
      blurb: "Structured journal: New Learning / Connections / Challenges / Strategies / Next Steps",
      phase: "reflection",
      minutes: 10,
      target: "slide",
      layout: "content",
      steps: [
        "Students complete structured reflection (8 mins):",
        "1. NEW LEARNING: What's one new thing?",
        "2. CONNECTIONS: How does this connect?",
        "3. CHALLENGES: What was difficult?",
        "4. STRATEGIES: What helped me learn?",
        "5. NEXT STEPS: What do I want to work on?",
        "Optional: Share one insight with partner (2 mins)"
      ]
    },
    {
      key: "muddiest-point",
      icon: "↺",
      title: "Muddiest Point",
      blurb: "Identify what's unclear, teacher addresses top confusions",
      phase: "reflection",
      minutes: 13,
      target: "feedback",
      feedbackKind: "brainstorm",
      steps: [
        "Individual (3 mins): Write 'The muddiest point for me is...' on sticky note",
        "Teacher collects & groups (2 mins): Sort by common themes",
        "Address Top 3 (8 mins): Clear up biggest confusions with student explanations"
      ]
    },
    {
      key: "plus-minus-interesting",
      icon: "↺",
      title: "Plus-Minus-Interesting (PMI)",
      blurb: "Edward de Bono thinking: What worked (+) / What was challenging (−) / What surprised (?)",
      phase: "reflection",
      minutes: 10,
      target: "slide",
      layout: "cards",
      steps: [
        "Individual Reflection (5 mins):",
        "PLUS: What worked well?",
        "MINUS: What was challenging?",
        "INTERESTING: What surprised me?",
        "Share (5 mins): Pairs compare, class discusses themes"
      ]
    },
    {
      key: "exit-ticket",
      icon: "⚑",
      title: "Exit Ticket (Plenary)",
      blurb: "Quick written reflection before leaving (same as Activity Plenary #4)",
      phase: "plenary",
      minutes: 5,
      target: "feedback",
      feedbackKind: "poll",
      steps: [
        "Choose format: 3-2-1 / Traffic Light / What-So What-Now What",
        "Students write responses (3 mins)",
        "Submit on way out",
        "Teacher reviews for planning"
      ]
    },
    {
      key: "preview-next-lesson",
      icon: "⚑",
      title: "Preview Next Lesson",
      blurb: "Recap today, preview tomorrow, set preparation task",
      phase: "plenary",
      minutes: 7,
      target: "slide",
      layout: "section",
      steps: [
        "Today We Learned (2 mins): Quick recap",
        "Next Lesson We Will (2 mins): Preview and connect",
        "Preparation Task (1 min): Quick homework/prep",
        "Closing Question (2 mins): Leave them thinking"
      ]
    },
    {
      key: "exit-ticket-2",
      icon: "⚐",
      title: "Exit Ticket",
      blurb: "Quick written reflection: 3-2-1 or Traffic Light or What-So What-Now What",
      phase: "activity-plenary",
      minutes: 5,
      target: "feedback",
      feedbackKind: "poll",
      steps: [
        "Choose format: 3-2-1 / Traffic Light / What-So What-Now What",
        "Students write individual responses (3 mins)",
        "Submit on way out",
        "Teacher reviews for next lesson planning"
      ]
    },
    {
      key: "recap-quiz-game",
      icon: "⚐",
      title: "Recap Quiz Game",
      blurb: "Fun, competitive review (Quiz-Quiz-Trade / Stand Up If / Quick-Fire)",
      phase: "activity-plenary",
      minutes: 6,
      target: "game",
      style: "speed",
      steps: [
        "Choose format (Quiz-Quiz-Trade / Stand Up If / Quick-Fire)",
        "Play game with review questions (4 mins)",
        "Celebrate correct answers",
        "Address common errors (2 mins)"
      ]
    },
    {
      key: "teach-someone",
      icon: "⚐",
      title: "Teach Someone",
      blurb: "Explain today's learning to a partner",
      phase: "activity-plenary",
      minutes: 8,
      target: "moment",
      steps: [
        "Partner A teaches (2 mins): Today I learned...",
        "Partner B asks 2 questions (1 min)",
        "Switch roles (3 mins)",
        "Together: What would we tell someone who missed today? (2 mins)"
      ]
    },
    {
      key: "visual-summary",
      icon: "⚐",
      title: "Visual Summary",
      blurb: "Create visual showing learning (Mind Map / Comic Strip / Sketch Note / One-Pager)",
      phase: "activity-plenary",
      minutes: 8,
      target: "slide",
      layout: "cards",
      steps: [
        "Choose visual format (Mind Map / Comic Strip / Sketch Note / One-Pager)",
        "Create visual summary (6 mins)",
        "Optional: Share with partner (2 mins)"
      ]
    },
    {
      key: "reflection-ladder",
      icon: "⚐",
      title: "Reflection Ladder",
      blurb: "Self-assess learning journey from 'need help' to 'can teach others'",
      phase: "activity-plenary",
      minutes: 9,
      target: "feedback",
      feedbackKind: "scale",
      steps: [
        "Show ladder: Bottom (need help) → Top (can teach others)",
        "Students draw themselves on their level (1 min)",
        "Write: 'I'm here because...' (2 mins)",
        "Write: 'To move up I need to...' (2 mins)",
        "Share with partner (2 mins)",
        "Teacher notes who needs support (2 mins)"
      ]
    }
  ];
  function activity(key) {
    return ACTIVITIES.find((a) => a.key === key) || null;
  }
  function activitiesInPhase(phase) {
    return ACTIVITIES.filter((a) => a.phase === phase && a.enabled !== false);
  }
  function phaseCounts() {
    return Object.fromEntries(PHASES.map((p) => [p.key, activitiesInPhase(p.key).length]));
  }
  function totalMinutes(keys) {
    return keys.reduce((sum, key) => sum + ((activity(key) || {}).minutes || 0), 0);
  }

  // src/core/identity.js
  function uid() {
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  }

  // src/activities/plan.js
  function makePlan(title) {
    var plan = {
      id: uid(),
      kind: "plan",
      title: title || "Untitled lesson plan",
      theme: "studio",
      created: Date.now(),
      modified: Date.now(),
      items: []
    };
    return plan;
  }
  function normalizePlan(raw) {
    if (!raw || typeof raw !== "object") return null;
    var plan = Object.assign(makePlan(), raw);
    plan.id = plan.id || uid();
    plan.kind = "plan";
    plan.title = String(plan.title || "Untitled lesson plan");
    plan.items = (Array.isArray(raw.items) ? raw.items : []).map(function(item) {
      var key = String(item && item.key || "");
      return activity(key) ? { id: item && item.id || uid(), key } : null;
    }).filter(Boolean);
    return plan;
  }
  function planMinutes(plan) {
    return (plan.items || []).reduce(function(sum, item) {
      var a = activity(item.key);
      return sum + (a && a.minutes || 0);
    }, 0);
  }
  function planByPhase(plan, phases) {
    return phases.map(function(phase) {
      var items = (plan.items || []).filter(function(item) {
        var a = activity(item.key);
        return a && a.phase === phase.key;
      });
      return { phase, items };
    }).filter(function(group) {
      return group.items.length;
    });
  }
  function describePlan(plan) {
    var n = (plan.items || []).length;
    var mins = planMinutes(plan);
    return n + (n === 1 ? " activity" : " activities") + (mins ? " · about " + mins + " min" : "") + " · " + new Date(plan.modified).toLocaleString();
  }

  // src/deck/content.js
  var TABLE_MAX_COLS = 6;
  var TABLE_MAX_ROWS = 12;
  function parseTable(text) {
    var lines = String(text == null ? "" : text).split(/\r?\n/).filter(function(l) {
      return l.trim();
    }).slice(0, TABLE_MAX_ROWS);
    var rows = lines.map(function(line) {
      var cells = line.indexOf("	") !== -1 ? line.split("	") : line.split("|");
      return cells.map(function(c) {
        return c.trim();
      }).slice(0, TABLE_MAX_COLS);
    });
    var cols = rows.reduce(function(n, r) {
      return Math.max(n, r.length);
    }, 0);
    rows.forEach(function(r) {
      while (r.length < cols) r.push("");
    });
    return rows;
  }
  function parseKeywordLine(line) {
    var s = String(line == null ? "" : line);
    var tab = s.indexOf("	");
    if (tab !== -1) {
      return { term: s.slice(0, tab).trim(), def: s.slice(tab + 1).trim() };
    }
    var m = s.match(/^(.+?)\s*[—–:\-|]\s+(.+)$/);
    if (m) return { term: m[1].trim(), def: m[2].trim() };
    return { term: s.trim(), def: "" };
  }
  function formatKeywordLine(term, def) {
    return String(term || "").trim() + "	" + String(def || "").trim();
  }
  function safeHref(url) {
    var u = String(url || "").trim();
    if (!u) return "";
    if (/^https?:\/\//i.test(u)) return u;
    if (/^\/\//.test(u)) return "https:" + u;
    if (/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}([\/?#][^\s]*)?$/i.test(u)) return "https://" + u;
    return "";
  }
  function safeMedia(url) {
    var u = String(url == null ? "" : url).replace(/[\u0000-\u001f\u007f]/g, "").trim();
    if (!u) return "";
    if (/^data:/i.test(u)) return /^data:(image|video|audio)\//i.test(u) ? u : "";
    if (/^[a-z][a-z0-9+.-]*:/i.test(u)) {
      return /^(https?|file|blob):/i.test(u) ? u : "";
    }
    return u;
  }
  var DECK_TYPES = [
    "title",
    "section",
    "content",
    "keywords",
    "italics",
    "links",
    "split",
    "cards",
    "table",
    "image",
    "video",
    "quote",
    "join"
  ];
  var BULLET_LAYOUTS = ["content", "cards", "split", "keywords", "italics", "links"];
  function prepareLayout(slide, type2) {
    if (DECK_TYPES.indexOf(type2) < 0) return slide;
    slide.type = type2;
    if (!Array.isArray(slide.bullets)) slide.bullets = [];
    if (BULLET_LAYOUTS.indexOf(type2) >= 0 && !slide.bullets.length) slide.bullets = ["", "", ""];
    if (BULLET_LAYOUTS.indexOf(type2) < 0 && slide.bullets.every(function(b) {
      return !String(b).trim();
    })) slide.bullets = [];
    if (type2 === "table" && !String(slide.body || "").trim()) slide.body = "Term | What it means\nFirst | \nSecond | ";
    return slide;
  }
  function imagePlacement(slide) {
    var p = slide.design && slide.design.placement;
    return p === "top" || p === "bottom" ? p : slide.imageSide === "left" ? "left" : "right";
  }
  function setImagePlacement(slide, placement) {
    if (!["left", "right", "top", "bottom"].includes(placement)) return;
    if (!slide.design || typeof slide.design !== "object") slide.design = {};
    slide.design.placement = placement === "top" || placement === "bottom" ? placement : "side";
    if (placement === "left" || placement === "right") slide.imageSide = placement;
  }
  function swapImagePlacement(slide) {
    setImagePlacement(slide, { left: "right", right: "left", top: "bottom", bottom: "top" }[imagePlacement(slide)]);
  }
  function slideSteps(slide) {
    if (slide.type === "table") {
      var rows = parseTable(slide.body), start = slide.tableHeader !== false && rows.length > 1 ? 1 : 0;
      return rows.slice(start).map(function(r) {
        return r.join(" · ");
      });
    }
    if (slide.type === "quote") {
      return String(slide.body || "").split(/\n/).map(function(l) {
        return l.trim();
      }).filter(Boolean);
    }
    if (slide.type === "explain") {
      return String(slide.body || "").split(/\n{2,}/).map(function(l) {
        return l.trim();
      }).filter(Boolean);
    }
    if (["content", "cards", "split", "keywords", "italics"].indexOf(slide.type) < 0) return [];
    return (slide.bullets || []).filter(function(b) {
      return String(b).trim();
    }).map(function(b) {
      if (slide.type === "keywords" || slide.type === "italics") {
        var p = parseKeywordLine(b);
        return [p.term, p.def].filter(Boolean).join(" — ");
      }
      return String(b).replace(/^(\s{2,}|\t|- )+/, "").trim();
    });
  }
  function slideExcerpt(slide, revealed) {
    if (slide.type === "quiz") return slide.question || "";
    var steps = slideSteps(slide);
    if (steps.length || ["content", "cards", "split", "keywords", "italics", "table", "quote", "explain"].includes(slide.type)) {
      var n = slide.progressive === true && Number.isFinite(revealed) ? Math.max(0, revealed) : steps.length;
      var visible = steps.slice(0, n);
      if (slide.type === "table") {
        var rows = parseTable(slide.body);
        if (slide.tableHeader !== false && rows.length > 1) visible.unshift(rows[0].join(" · "));
      }
      return visible.join("\n");
    }
    if (slide.type === "links") return (slide.bullets || []).map(function(b) {
      var p = parseKeywordLine(b);
      return [p.term, p.def].filter(Boolean).join(" — ");
    }).join("\n");
    if (slide.type === "title" || slide.type === "section") return slide.subtitle || "";
    return "";
  }
  function questionTimeLimit(slide, teacherEntry) {
    return teacherEntry ? 0 : Math.max(0, Number(slide.timeLimit) || 0);
  }
  function correctAnswerLabel(slide) {
    if (slide.input === "text" || slide.input === "number") return String(slide.answer || "");
    return ("ABCDEF"[slide.correct] || "?") + " — " + ((slide.options || [])[slide.correct] || "");
  }

  // src/deck/feedback.js
  var FEEDBACK_KINDS = {
    poll: {
      key: "poll",
      label: "Poll",
      icon: "▤",
      blurb: "Fixed options. Results appear as bars in the rail.",
      needsOptions: true
    },
    wordcloud: {
      key: "wordcloud",
      label: "Word cloud",
      icon: "❋",
      blurb: "A word or short phrase each. Repeats grow larger.",
      needsOptions: false
    },
    brainstorm: {
      key: "brainstorm",
      label: "Brainstorm",
      icon: "✎",
      blurb: "Longer contributions, listed newest first with names.",
      needsOptions: false
    },
    /* A scale is a poll over a fixed run of points, so on the wire it is one:
       the room picks an index and the relay counts indices, unchanged. What
       makes it a scale is that the points are ordered, which is why it gets a
       mean and a distribution rather than a set of independent bars. */
    scale: {
      key: "scale",
      label: "Scale",
      icon: "≋",
      blurb: "One end to the other. Shows the spread and the average.",
      needsOptions: false,
      graded: true
    }
  };
  var SCALE_POINTS = [3, 4, 5, 6, 7];
  function scaleLabels(f) {
    var n = Math.max(3, Math.min(7, Number(f.points) || 5));
    var out = [];
    for (var i = 0; i < n; i++) out.push(String(i + 1));
    return out;
  }
  function isFeedbackKind(value) {
    return typeof value === "string" && Object.prototype.hasOwnProperty.call(FEEDBACK_KINDS, value);
  }
  function makeFeedback(kind) {
    var f = {
      kind: isFeedbackKind(kind) ? kind : "poll",
      prompt: "",
      options: kind === "poll" || !kind ? ["Yes", "No", "Not sure"] : [],
      max: 1,
      // submissions allowed per person
      presentAs: "rail"
      // 'rail' beside the slide · 'focus' full screen when presenting
    };
    if (f.kind === "scale") {
      f.points = 5;
      f.lowLabel = "Not at all";
      f.highLabel = "Completely";
    }
    return f;
  }
  function normalizeFeedback(raw) {
    if (!raw || !raw.kind || !FEEDBACK_KINDS[raw.kind]) return null;
    var f = {
      kind: raw.kind,
      prompt: String(raw.prompt || ""),
      options: (
        /** @type {string[]} */
        []
      ),
      max: Math.max(1, Math.min(5, Number(raw.max) || 1)),
      presentAs: raw.presentAs === "focus" ? "focus" : "rail"
    };
    if (FEEDBACK_KINDS[f.kind].needsOptions) {
      f.options = (Array.isArray(raw.options) ? raw.options : []).map(function(o) {
        return String(o == null ? "" : o);
      }).slice(0, 6);
      while (f.options.length < 2) f.options.push("");
      f.max = 1;
    }
    if (f.kind === "scale") {
      f.points = SCALE_POINTS.indexOf(Number(raw.points)) > -1 ? Number(raw.points) : 5;
      f.lowLabel = String(raw.lowLabel == null ? "Not at all" : raw.lowLabel).slice(0, 40);
      f.highLabel = String(raw.highLabel == null ? "Completely" : raw.highLabel).slice(0, 40);
      f.max = 1;
    }
    return f;
  }
  function slideFeedback(slide) {
    var f = slide && slide.feedback;
    if (!f || !f.kind) return null;
    if (!String(f.prompt || "").trim()) return null;
    if (FEEDBACK_KINDS[f.kind].needsOptions && f.options.filter(function(o) {
      return String(o).trim();
    }).length < 2) {
      return null;
    }
    if (f.kind === "scale" && !(String(f.lowLabel || "").trim() && String(f.highLabel || "").trim())) {
      return null;
    }
    return f;
  }

  // src/games/choice.js
  var coreStyles = {
    choice: {
      key: "choice",
      label: "Multiple choice",
      icon: "?",
      blurb: "Two to six answers, one of them correct.",
      mechanic: "points",
      input: "choice",
      minOptions: 2,
      maxOptions: 6,
      fixedOptions: null,
      make: function() {
        return {
          question: "Which of these is correct?",
          options: ["Option A", "Option B", "Option C", "Option D"],
          correct: 0
        };
      },
      normalize: function(q) {
        if (!Array.isArray(q.options)) q.options = [];
        q.options = q.options.map(function(o) {
          return typeof o === "string" ? o : o && o.text || "";
        }).slice(0, 6);
        while (q.options.length < 2) q.options.push("");
        q.correct = Math.max(0, Math.min(q.options.length - 1, Number(q.correct) || 0));
        return q;
      },
      problems: function(q, n) {
        var live = q.options.filter(function(o) {
          return String(o).trim();
        });
        if (!String(q.question).trim()) return "Q" + n + " has no question text";
        if (live.length < 2) return "Q" + n + " needs at least two answers";
        if (!String(q.options[q.correct] || "").trim()) {
          return "Q" + n + " has no correct answer marked";
        }
        return null;
      },
      /* Everything a question of this style contributes to its slide. */
      compile: function(q, settings, s) {
        s.question = q.question;
        s.options = q.options.filter(function(o) {
          return String(o).trim();
        });
        s.correct = Math.max(0, Math.min(s.options.length - 1, q.correct));
      },
      mark: function(s, response) {
        return Number.isInteger(response) && response === s.correct;
      },
      /* One line about the question, for the editor's list of them. */
      summary: function(q) {
        var live = (q.options || []).filter(function(o) {
          return String(o).trim();
        });
        return live.length + " answers";
      }
    },
    truefalse: {
      key: "truefalse",
      label: "True or false",
      icon: "½",
      blurb: "A statement the room marks true or false.",
      mechanic: "points",
      input: "choice",
      minOptions: 2,
      maxOptions: 2,
      fixedOptions: ["True", "False"],
      make: function() {
        return {
          question: "A statement that is either true or false.",
          options: ["True", "False"],
          correct: 0
        };
      },
      normalize: function(q) {
        q.options = ["True", "False"];
        q.correct = Number(q.correct) === 1 ? 1 : 0;
        return q;
      },
      problems: function(q, n) {
        if (!String(q.question).trim()) return "Q" + n + " has no statement";
        return null;
      },
      compile: function(q, settings, s) {
        s.options = ["True", "False"];
        s.correct = q.correct === 1 ? 1 : 0;
        s.question = q.question;
      },
      mark: function(s, response) {
        return Number.isInteger(response) && response === s.correct;
      },
      summary: function(q) {
        return q.correct === 1 ? "False" : "True";
      }
    }
  };
  var choice = coreStyles.choice;
  var truefalse = coreStyles.truefalse;

  // src/games/race.js
  var race = {
    key: "race",
    label: "Horse race",
    icon: "🏇",
    blurb: "Multiple choice, but every right answer moves your team a step along the track. First past the post wins.",
    mechanic: "race",
    input: "choice",
    minOptions: 2,
    maxOptions: 6,
    fixedOptions: null,
    make: function() {
      return choice.make();
    },
    normalize: function(q) {
      return choice.normalize(q);
    },
    problems: function(q, n) {
      return choice.problems(q, n);
    },
    compile: function(q, st, s) {
      choice.compile(q, st, s);
    },
    mark: function(s, response) {
      return choice.mark(s, response);
    },
    summary: function(q) {
      return choice.summary(q);
    }
  };

  // src/games/speed.js
  var speed = {
    defaults: {
      "defaultTime": 60,
      "defaultPoints": 0,
      "confidence": false
    },
    key: "speed",
    label: "Beat the clock",
    icon: "◷",
    blurb: "Multiple choice against the countdown. Faster correct answers score more; wrong answers cost points.",
    mechanic: "speed",
    input: "choice",
    minOptions: 2,
    maxOptions: 6,
    fixedOptions: null,
    make: function() {
      var q = choice.make();
      q.question = "Which answer is right — and fast?";
      return q;
    },
    normalize: function(q) {
      return choice.normalize(q);
    },
    problems: function(q, n) {
      return choice.problems(q, n);
    },
    compile: function(q, st, s) {
      choice.compile(q, st, s);
    },
    mark: function(s, response) {
      return choice.mark(s, response);
    },
    summary: function(q) {
      return choice.summary(q);
    }
  };
  function speedPoints(right, remainingSec) {
    if (right) return 10 + Math.floor(Math.max(0, Number(remainingSec) || 0) / 10);
    return -5;
  }

  // src/games/boss.js
  var BOSS_DAMAGE = { easy: 1, medium: 2, hard: 3, boss: 5 };
  var BOSS_LEVELS = ["easy", "medium", "hard", "boss"];
  function bossDamage(difficulty) {
    return BOSS_DAMAGE[difficulty] || BOSS_DAMAGE.medium;
  }
  function bossMaxHp(questions) {
    return (questions || []).reduce(function(n, q) {
      return n + bossDamage(q && q.difficulty);
    }, 0);
  }
  var boss = {
    defaults: {
      "defaultTime": 30,
      "confidence": false
    },
    key: "boss",
    label: "Boss battle",
    icon: "▲",
    blurb: "Multiple choice against a shared boss. Correct hits deal damage; bring HP to zero before the questions run out.",
    mechanic: "boss",
    input: "choice",
    minOptions: 2,
    maxOptions: 6,
    fixedOptions: null,
    make: function() {
      var q = choice.make();
      q.question = "Strike the boss — which answer is right?";
      q.difficulty = "medium";
      return q;
    },
    normalize: function(q) {
      choice.normalize(q);
      q.difficulty = BOSS_LEVELS.indexOf(q.difficulty) > -1 ? q.difficulty : "medium";
      return q;
    },
    problems: function(q, n) {
      return choice.problems(q, n);
    },
    compile: function(q, st, s) {
      choice.compile(q, st, s);
      s.difficulty = q.difficulty;
      s.bossDamage = bossDamage(q.difficulty);
    },
    mark: function(s, response) {
      return choice.mark(s, response);
    },
    summary: function(q) {
      return choice.summary(q) + " · " + (q.difficulty || "medium") + " (" + bossDamage(q.difficulty) + " dmg)";
    }
  };

  // src/games/marking.js
  function normalizeAnswer(text) {
    var t = String(text == null ? "" : text);
    if (t.normalize) t = t.normalize("NFD").replace(/[̀-ͯ]/g, "");
    t = t.toLowerCase().replace(/[‘’‛]/g, "'").replace(/[^a-z0-9'\s]+/g, " ").replace(/'/g, "").replace(/\s+/g, " ").trim();
    return t.replace(/^(?:the|a|an)\s+/, "");
  }
  function numeric(text) {
    var t = String(text == null ? "" : text).trim().replace(/[,\s]/g, "");
    if (!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(t)) return null;
    var n = Number(t);
    return Number.isFinite(n) ? n : null;
  }
  function withUnit(text, unit) {
    unit = String(unit == null ? "" : unit).trim();
    if (!unit) return text;
    return /^[%°]/.test(unit) ? text + unit : text + " " + unit;
  }
  function formatValue(value, unit) {
    var n = Number(value);
    if (!Number.isFinite(n)) return "";
    return withUnit(String(Math.round(n * 1e3) / 1e3), unit);
  }
  function editDistance(a, b) {
    if (a === b) return 0;
    if (!a.length || !b.length) return Math.max(a.length, b.length);
    if (Math.abs(a.length - b.length) > 2) return 3;
    var prev = [], row = [], i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      row[0] = i;
      for (j = 1; j <= b.length; j++) {
        row[j] = Math.min(
          prev[j] + 1,
          row[j - 1] + 1,
          prev[j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1)
        );
      }
      prev = row.slice();
    }
    return prev[b.length];
  }
  function typoAllowance(normalized, raw) {
    if (numeric(raw) != null || /\d/.test(normalized)) return 0;
    if (normalized.length >= 8) return 2;
    if (normalized.length >= 5) return 1;
    return 0;
  }
  function markTyped(accept, response, allowTypos) {
    var given = normalizeAnswer(response);
    var givenNum = numeric(response);
    var miss = (
      /** @type {{ right: boolean, matched: string | null, distance: number | null }} */
      {
        right: false,
        matched: null,
        distance: null
      }
    );
    if (!given) return miss;
    var list = (Array.isArray(accept) ? accept : [accept]).filter(function(a) {
      return String(a == null ? "" : a).trim();
    });
    var best = miss;
    for (var i = 0; i < list.length; i++) {
      var raw = String(list[i]);
      var want = normalizeAnswer(raw);
      if (!want) continue;
      if (given === want) return { right: true, matched: raw, distance: 0 };
      var wantNum = numeric(raw);
      if (givenNum != null && wantNum != null && givenNum === wantNum) {
        return { right: true, matched: raw, distance: 0 };
      }
      if (allowTypos === false) continue;
      var allowed = typoAllowance(want, raw);
      if (!allowed) continue;
      var d = editDistance(given, want);
      if (d <= allowed && (best.distance == null || d < best.distance)) {
        best = { right: true, matched: raw, distance: d };
      }
    }
    return best;
  }

  // src/games/slider.js
  var slider = {
    key: "slider",
    label: "Slider",
    icon: "↔",
    blurb: "Estimate a value on a line. Near enough counts.",
    mechanic: "points",
    input: "number",
    minOptions: 0,
    maxOptions: 0,
    fixedOptions: null,
    make: function() {
      return {
        question: "Estimate the value.",
        min: 0,
        max: 100,
        step: 1,
        target: 50,
        tolerance: 5,
        unit: ""
      };
    },
    normalize: function(q) {
      var num = function(v, fallback) {
        var n = Number(v);
        return Number.isFinite(n) ? n : fallback;
      };
      q.min = num(q.min, 0);
      q.max = num(q.max, 100);
      if (q.max <= q.min) q.max = q.min + 100;
      q.step = Math.max(0, num(q.step, 1));
      if (!q.step) q.step = 1;
      q.target = Math.min(q.max, Math.max(q.min, num(q.target, (q.min + q.max) / 2)));
      q.tolerance = Math.min(q.max - q.min, Math.max(0, num(q.tolerance, 0)));
      q.unit = String(q.unit == null ? "" : q.unit).slice(0, 12);
      delete q.options;
      delete q.correct;
      return q;
    },
    problems: function(q, n) {
      if (!String(q.question).trim()) return "Q" + n + " has no question text";
      if (q.tolerance >= q.max - q.min) {
        return "Q" + n + " accepts the whole line — narrow the tolerance";
      }
      return null;
    },
    compile: function(q, settings, s) {
      s.question = q.question;
      s.min = q.min;
      s.max = q.max;
      s.step = q.step;
      s.target = q.target;
      s.tolerance = q.tolerance;
      s.unit = q.unit;
      s.answer = formatValue(q.target, q.unit);
      s.options = [];
      s.correct = -1;
    },
    mark: function(s, response) {
      if (typeof response !== "number" || !Number.isFinite(response)) return false;
      if (typeof s.target !== "number" || typeof s.tolerance !== "number") return false;
      return Math.abs(response - s.target) <= s.tolerance;
    },
    summary: function(q) {
      var band = q.tolerance ? formatValue(q.target) + " ± " + formatValue(q.tolerance) : formatValue(q.target) + " exactly";
      return withUnit(band, q.unit);
    },
    describe: function(s, response) {
      return formatValue(response, s.unit);
    }
  };

  // src/games/type.js
  var type = {
    key: "type",
    label: "Type answer",
    icon: "Aa",
    blurb: "No options to choose from — the room types the answer from memory.",
    mechanic: "points",
    input: "text",
    minOptions: 0,
    maxOptions: 0,
    fixedOptions: null,
    make: function() {
      return {
        question: "What is the answer?",
        accept: [""],
        allowTypos: true
      };
    },
    normalize: function(q) {
      if (!Array.isArray(q.accept)) q.accept = [];
      q.accept = q.accept.map(function(a) {
        return String(a == null ? "" : a).slice(0, 200);
      }).slice(0, 8);
      if (!q.accept.some(function(a) {
        return a.trim();
      }) && Array.isArray(q.options)) {
        var carried = q.options[Number(q.correct) || 0];
        if (carried && String(carried).trim()) q.accept = [String(carried)];
      }
      if (!q.accept.length) q.accept = [""];
      q.allowTypos = q.allowTypos !== false;
      delete q.options;
      delete q.correct;
      return q;
    },
    problems: function(q, n) {
      if (!String(q.question).trim()) return "Q" + n + " has no question text";
      if (!q.accept.some(function(a) {
        return String(a).trim();
      })) {
        return "Q" + n + " has no accepted answer";
      }
      return null;
    },
    compile: function(q, settings, s) {
      s.question = q.question;
      s.accept = q.accept.filter(function(a) {
        return String(a).trim();
      });
      s.allowTypos = q.allowTypos !== false;
      s.answer = s.accept[0] || "";
      s.options = [];
      s.correct = -1;
    },
    mark: function(s, response) {
      if (typeof response !== "string") return false;
      return markTyped(s.accept, response, s.allowTypos).right;
    },
    summary: function(q) {
      var live = (q.accept || []).filter(function(a) {
        return String(a).trim();
      });
      if (!live.length) return "no answer set";
      return live.length > 1 ? live[0] + " +" + (live.length - 1) : live[0];
    },
    describe: function(s, response) {
      var hit = markTyped(s.accept, response, s.allowTypos);
      return hit.right ? hit.matched : String(response == null ? "" : response);
    }
  };

  // src/games/order.js
  var order = {
    defaults: {
      "defaultPoints": 10
    },
    key: "order",
    label: "Ranking",
    icon: "↕",
    blurb: "Put items in the right order. Part marks for the ones placed correctly.",
    mechanic: "points",
    input: "order",
    minOptions: 3,
    maxOptions: 8,
    make: function() {
      return {
        question: "Put these in order, first to last.",
        /* Authored in the correct order; the room is shown a shuffle. */
        options: ["First", "Second", "Third", "Fourth"],
        correct: 0
      };
    },
    normalize: function(q) {
      if (!Array.isArray(q.options)) q.options = [];
      q.options = q.options.map(function(o) {
        return typeof o === "string" ? o : o && o.text || "";
      }).slice(0, 8);
      while (q.options.length < 3) q.options.push("");
      return q;
    },
    problems: function(q, n) {
      var live = (q.options || []).filter(function(o) {
        return String(o).trim();
      });
      if (!String(q.question).trim()) return "Q" + n + " has no question text";
      if (live.length < 3) return "Q" + n + " needs at least three items to order";
      var seen = {};
      for (var i = 0; i < live.length; i++) {
        var k = live[i].trim().toLowerCase();
        if (seen[k]) return "Q" + n + ' has two items reading "' + live[i].trim() + '"';
        seen[k] = 1;
      }
      return null;
    },
    compile: function(q, settings, s) {
      s.question = q.question;
      s.options = q.options.filter(function(o) {
        return String(o).trim();
      });
      s.correct = 0;
    },
    /* A response is an array of indices into s.options, in the learner's
       order. Right means every item in its authored place. */
    mark: function(s, response) {
      return orderScore(s, response) === 1;
    },
    summary: function(q) {
      var live = (q.options || []).filter(function(o) {
        return String(o).trim();
      });
      return live.length + " to order";
    },
    describe: function(s, response) {
      if (!Array.isArray(response)) return "";
      return response.map(function(i) {
        return (s.options || [])[i];
      }).filter(Boolean).join(" → ");
    }
  };
  function orderScore(slide, response) {
    var n = (slide.options || []).length;
    if (!n || !Array.isArray(response) || response.length !== n) return 0;
    var seen = {}, exact = 0;
    for (var i = 0; i < n; i++) {
      var v = response[i];
      if (!Number.isInteger(v) || v < 0 || v >= n || seen[v]) return 0;
      seen[v] = 1;
      if (v === i) exact++;
    }
    return exact / n;
  }
  function orderPoints(fractionOrSlide, response) {
    var frac = typeof fractionOrSlide === "number" ? fractionOrSlide : orderScore(fractionOrSlide, response);
    return Math.round(10 * Math.max(0, Math.min(1, Number(frac) || 0)));
  }

  // src/games/emoji.js
  function emojiCluePieces(text) {
    var clueText = String(text || "");
    if (typeof Intl !== "undefined" && Intl.Segmenter) {
      return Array.from(
        new Intl.Segmenter(void 0, { granularity: "grapheme" }).segment(clueText),
        function(part) {
          return part.segment;
        }
      ).filter(function(part) {
        return part.trim();
      });
    }
    return Array.from(clueText).filter(function(part) {
      return part.trim();
    });
  }
  function emojiClueLayout(text) {
    var clueText = String(text || "");
    var pieces = emojiCluePieces(clueText);
    var tiled = pieces.length > 0 && pieces.length <= 10 && !/[a-zA-Z0-9]/.test(clueText);
    return { tiled, pieces, text: clueText };
  }
  var EMOJI_LEVELS = ["easy", "medium", "hard"];
  function emojiHelp(slide) {
    var level = EMOJI_LEVELS.indexOf(slide.difficulty) > -1 ? slide.difficulty : "medium";
    return {
      hint: String(slide.hint == null ? "" : slide.hint).trim(),
      pattern: level === "easy" ? "shown" : level === "medium" ? "step" : "none"
    };
  }
  var emoji = {
    key: "emoji",
    label: "Emoji guess",
    icon: "☺",
    blurb: "Decode a concept from symbols. Release the letter pattern, then a hint, as the room gets stuck.",
    mechanic: "points",
    input: "text",
    minOptions: 0,
    maxOptions: 0,
    fixedOptions: null,
    make: function() {
      return {
        question: "🌱 ☀️ 💧 → 🌿",
        accept: ["photosynthesis"],
        hint: "How a plant makes its own food",
        difficulty: "medium",
        allowTypos: true
      };
    },
    normalize: function(q) {
      q.clues = String(q.clues == null ? q.question : q.clues).slice(0, 80);
      q.question = q.clues || "Emoji puzzle";
      q.hint = String(q.hint == null ? "" : q.hint).slice(0, 160);
      q.difficulty = EMOJI_LEVELS.indexOf(q.difficulty) > -1 ? q.difficulty : "medium";
      if (!Array.isArray(q.accept)) q.accept = [];
      q.accept = q.accept.map(function(a) {
        return String(a == null ? "" : a).slice(0, 200);
      }).slice(0, 8);
      if (!q.accept.length) q.accept = [""];
      q.allowTypos = q.allowTypos !== false;
      delete q.options;
      delete q.correct;
      return q;
    },
    problems: function(q, n) {
      if (!String(q.clues || "").trim()) return "Q" + n + " has no emoji clues";
      if (!q.accept.some(function(a) {
        return String(a).trim();
      })) {
        return "Q" + n + " has no accepted answer";
      }
      return null;
    },
    compile: function(q, settings, s) {
      s.clues = q.clues;
      s.question = q.clues;
      s.headPrompt = "What do these clues point to?";
      s.hint = q.hint;
      s.difficulty = q.difficulty;
      s.accept = q.accept.filter(function(a) {
        return String(a).trim();
      });
      s.allowTypos = q.allowTypos !== false;
      s.answer = s.accept[0] || "";
      s.options = [];
      s.correct = -1;
      s.hideAnswerUntilReveal = true;
    },
    mark: function(s, response) {
      if (typeof response !== "string") return false;
      return markTyped(s.accept, response, s.allowTypos).right;
    },
    summary: function(q) {
      var live = (q.accept || []).filter(function(a) {
        return String(a).trim();
      });
      var help = { easy: "pattern shown", medium: "pattern on request", hard: "no pattern" }[q.difficulty] || "pattern on request";
      return (live[0] || "no answer set") + " · " + help;
    },
    describe: type.describe
  };

  // src/samples/definition.json
  var definition_default = [
    {
      passage: "A catalyst speeds up a reaction by lowering the activation energy. It is not consumed, so the same catalyst can work again and again.",
      question: "What is not used up in the reaction?",
      accept: [
        "the catalyst",
        "catalyst"
      ],
      explanation: "Not being consumed is the defining property — it is why a small amount goes a long way."
    },
    {
      passage: "Osmosis is the diffusion of water across a partially permeable membrane, from a dilute solution to a more concentrated one.",
      question: "What substance moves in osmosis?",
      accept: [
        "water"
      ],
      explanation: "Only water moves through the membrane in osmosis."
    },
    {
      passage: "RAM is volatile memory: it stores data the CPU is using right now, and that data is lost when power is removed.",
      question: "What happens to data in RAM when the computer is switched off?",
      accept: [
        "it is lost",
        "lost",
        "it disappears",
        "cleared",
        "it is cleared"
      ],
      explanation: "Volatile means the contents vanish without power."
    }
  ];

  // src/games/definition.js
  var DEFINITION_TIMES = [20, 30, 45, 60];
  function clampDefinitionSeconds(n) {
    n = Number(n);
    return DEFINITION_TIMES.indexOf(n) > -1 ? n : 30;
  }
  function splitDefinitionPassage(text) {
    var t = String(text || "").trim();
    if (!t) return { passage: "", question: "" };
    var quoted = t.match(/"([^"]+)"/);
    if (quoted) {
      var after = t.slice(t.indexOf(quoted[0]) + quoted[0].length).replace(/^\s+/, "");
      return {
        passage: quoted[1].trim(),
        question: after.replace(/^[\s\n]+/, "") || "What did you just read?"
      };
    }
    var parts = t.split(/\n\n+/).map(function(p) {
      return p.trim();
    }).filter(Boolean);
    if (parts.length >= 2) {
      var last = parts[parts.length - 1];
      var body = parts.slice(0, -1);
      if (/^read this/i.test(body[0]) && body.length > 1) body = body.slice(1);
      return { passage: body.join("\n\n"), question: last };
    }
    return { passage: t, question: "What did you just read?" };
  }
  function definitionCreate(seconds) {
    return { phase: "reading", seconds: clampDefinitionSeconds(seconds) };
  }
  function definitionTransition(state, action) {
    var s = Object.assign({}, state || definitionCreate(30));
    if (action === "restart") return definitionCreate(s.seconds);
    if ((action === "ask" || action === "expire") && s.phase === "reading") {
      s.phase = "asking";
    }
    return s;
  }
  var definition = {
    defaults: {
      "defaultTime": 30,
      "defaultPoints": 1,
      "confidence": false
    },
    starters: definition_default,
    key: "definition",
    label: "Definition challenge",
    icon: "¶",
    blurb: "Read a short passage, then answer from memory once it clears.",
    mechanic: "points",
    input: "text",
    minOptions: 0,
    maxOptions: 0,
    fixedOptions: null,
    make: function() {
      return {
        passage: "A catalyst speeds up a reaction by lowering the activation energy. It is not consumed, so the same catalyst can work again and again.",
        question: "What is not used up in the reaction?",
        accept: ["the catalyst", "catalyst"],
        allowTypos: true
      };
    },
    normalize: function(q) {
      var passage = String(q.passage == null ? "" : q.passage).slice(0, 1200);
      var question = String(q.question == null ? "" : q.question).slice(0, 400);
      if (!String(passage).trim() && String(question).trim()) {
        var split = splitDefinitionPassage(question);
        passage = split.passage;
        question = split.question;
      }
      q.passage = passage;
      q.question = question || "What did you just read?";
      if (!Array.isArray(q.accept)) q.accept = [];
      q.accept = q.accept.map(function(a) {
        return String(a == null ? "" : a).slice(0, 200);
      }).slice(0, 8);
      if (!q.accept.some(function(a) {
        return a.trim();
      }) && Array.isArray(q.options)) {
        var carried = q.options[Number(q.correct) || 0];
        if (carried && String(carried).trim()) q.accept = [String(carried)];
      }
      if (!q.accept.length) q.accept = [""];
      q.allowTypos = q.allowTypos !== false;
      delete q.options;
      delete q.correct;
      return q;
    },
    problems: function(q, n) {
      if (!String(q.passage || "").trim()) return "Q" + n + " has no passage to read";
      if (!String(q.question || "").trim()) return "Q" + n + " has no recall question";
      if (!q.accept.some(function(a) {
        return String(a).trim();
      })) {
        return "Q" + n + " has no accepted answer";
      }
      return null;
    },
    board: function(game) {
      var n = (game.questions || []).length;
      if (n < 3) return "needs at least 3 challenges and this has " + n;
      if (n > 20) return "can have at most 20 challenges and this has " + n;
      return null;
    },
    compile: function(q, settings, s) {
      s.passage = String(q.passage || "").trim();
      s.question = String(q.question || "").trim();
      s.headPrompt = s.question;
      s.accept = q.accept.filter(function(a) {
        return String(a).trim();
      });
      s.allowTypos = q.allowTypos !== false;
      s.answer = s.accept[0] || "";
      s.options = [];
      s.correct = -1;
      s.hideAnswerUntilReveal = true;
      s.definitionChallenge = true;
    },
    mark: function(s, response) {
      if (typeof response !== "string") return false;
      return markTyped(s.accept, response, s.allowTypos).right;
    },
    summary: function(q) {
      var live = (q.accept || []).filter(function(a) {
        return String(a).trim();
      });
      var tip = (String(q.passage || "").trim().slice(0, 40) || "passage") + (String(q.passage || "").trim().length > 40 ? "…" : "");
      return tip + " · " + (live[0] || "no answer set");
    },
    describe: type.describe
  };

  // src/samples/compare.json
  var compare_default = [
    {
      itemA: "Photosynthesis",
      itemB: "Respiration",
      similarities: "Both involve energy and gases moving in living cells.",
      differences: "Photosynthesis stores energy in glucose; respiration releases it.",
      category: "Science"
    },
    {
      itemA: "RAM",
      itemB: "SSD",
      similarities: "Both store data the computer uses.",
      differences: "RAM is volatile and fast for working memory; an SSD keeps files when power is off.",
      category: "ICT"
    },
    {
      itemA: "Democracy",
      itemB: "Dictatorship",
      similarities: "Both are ways a state can be governed.",
      differences: "In a democracy power is shared through voting; in a dictatorship one person or clique holds it.",
      category: "History"
    },
    {
      itemA: "Metaphor",
      itemB: "Simile",
      similarities: "Both compare one thing to another in writing.",
      differences: "A simile uses like or as; a metaphor says something is something else.",
      category: "Literature"
    }
  ];

  // src/games/compare.js
  var compare = {
    defaults: {
      "scoreboard": false,
      "defaultTime": 0,
      "defaultPoints": 0,
      "scoreSlide": false,
      "confidence": false
    },
    starters: compare_default,
    key: "compare",
    label: "Compare & contrast",
    icon: "⇄",
    blurb: "Two items side by side. Discuss similarities and differences — then reveal the prepared points. No score.",
    mechanic: "points",
    input: "choice",
    minOptions: 0,
    maxOptions: 0,
    fixedOptions: null,
    make: function() {
      return {
        question: "Compare these two — how are they alike, and how do they differ?",
        itemA: "Photosynthesis",
        itemB: "Respiration",
        similarities: "Both involve energy and gases moving in living cells.",
        differences: "Photosynthesis stores energy in glucose; respiration releases it.",
        category: "",
        options: [],
        correct: -1
      };
    },
    normalize: function(q) {
      q.itemA = String(q.itemA == null ? "" : q.itemA).slice(0, 80);
      q.itemB = String(q.itemB == null ? "" : q.itemB).slice(0, 80);
      q.similarities = String(q.similarities == null ? "" : q.similarities).slice(0, 600);
      q.differences = String(q.differences == null ? "" : q.differences).slice(0, 600);
      q.category = String(q.category == null ? "" : q.category).slice(0, 40);
      if (!String(q.question || "").trim()) {
        q.question = "Compare these two — how are they alike, and how do they differ?";
      }
      q.question = String(q.question).slice(0, 280);
      q.options = [];
      q.correct = -1;
      return q;
    },
    problems: function(q, n) {
      if (!String(q.itemA || "").trim() || !String(q.itemB || "").trim()) {
        return "Q" + n + " needs Item A and Item B";
      }
      if (String(q.itemA).trim().toLowerCase() === String(q.itemB).trim().toLowerCase()) {
        return "Q" + n + " needs two different items";
      }
      if (!String(q.similarities || "").trim()) {
        return "Q" + n + " needs similarities for the reveal";
      }
      if (!String(q.differences || "").trim()) {
        return "Q" + n + " needs differences for the reveal";
      }
      return null;
    },
    board: function(game) {
      var n = (game.questions || []).length;
      if (n < 3) return "needs at least 3 comparisons and this has " + n;
      if (n > 10) return "can have at most 10 comparisons and this has " + n;
      return null;
    },
    compile: function(q, settings, s) {
      s.question = q.question || "Compare these two — how are they alike, and how do they differ?";
      s.headPrompt = s.question;
      s.itemA = String(q.itemA || "").trim();
      s.itemB = String(q.itemB || "").trim();
      s.similarities = String(q.similarities || "").trim();
      s.differences = String(q.differences || "").trim();
      s.category = String(q.category || "").trim();
      s.options = [];
      s.correct = -1;
      s.points = 0;
      s.voteOnly = true;
      s.hideAnswerUntilReveal = true;
      s.compareDiscuss = true;
      s.timeLimit = 0;
    },
    mark: function() {
      return false;
    },
    summary: function(q) {
      return (q.itemA || "?") + " · " + (q.itemB || "?");
    }
  };

  // src/samples/oddone.json
  var oddone_default = [
    {
      options: [
        "Iron",
        "Copper",
        "Oxygen",
        "Zinc"
      ],
      correct: 2,
      explanation: "Oxygen is a non-metal. Accept any defensible rule a learner can argue for — the reasoning is the point."
    },
    {
      options: [
        "Mitochondrion",
        "Chloroplast",
        "Nucleus",
        "Ribosome"
      ],
      correct: 1,
      explanation: "Chloroplasts are for photosynthesis; the others appear in typical animal cells too. Other rules may also work."
    },
    {
      options: [
        "Photosynthesis",
        "Respiration",
        "Diffusion",
        "Osmosis"
      ],
      correct: 0,
      explanation: "Photosynthesis builds glucose; the others move substances or release energy. Defend another grouping if you can."
    },
    {
      options: [
        "CPU",
        "RAM",
        "SSD",
        "HDMI"
      ],
      correct: 3,
      explanation: "HDMI is a display connection; the others are core computer components. Other rules welcome."
    }
  ];

  // src/games/oddone.js
  var oddone = {
    defaults: {
      "scoreboard": false,
      "defaultTime": 0,
      "defaultPoints": 0,
      "scoreSlide": false,
      "confidence": false
    },
    starters: oddone_default,
    key: "oddone",
    label: "Odd one out",
    icon: "◇",
    blurb: "Four equal items. Discuss which does not belong and why — then reveal the prepared rationale. No score.",
    mechanic: "points",
    input: "choice",
    minOptions: 4,
    maxOptions: 4,
    fixedOptions: null,
    make: function() {
      return {
        question: "Which is the odd one out — and what is the rule?",
        options: ["Iron", "Copper", "Oxygen", "Zinc"],
        correct: 2,
        explanation: "Oxygen is a non-metal. Accept any defensible rule a learner can argue for — the reasoning is the point."
      };
    },
    normalize: function(q) {
      if (!Array.isArray(q.options)) q.options = [];
      q.options = q.options.map(function(o) {
        return typeof o === "string" ? o : o && o.text || "";
      }).slice(0, 4);
      while (q.options.length < 4) q.options.push("");
      q.correct = Math.max(0, Math.min(3, Number(q.correct) || 0));
      if (!String(q.question || "").trim()) {
        q.question = "Which is the odd one out — and what is the rule?";
      }
      q.question = String(q.question).slice(0, 280);
      return q;
    },
    problems: function(q, n) {
      var live = (q.options || []).filter(function(o) {
        return String(o).trim();
      });
      if (live.length < 4) return "Q" + n + " needs four items";
      if (!String(q.options[q.correct] || "").trim()) {
        return "Q" + n + " has no odd one marked";
      }
      var seen = {};
      for (var i = 0; i < 4; i++) {
        var k = String(q.options[i] || "").trim().toLowerCase();
        if (!k) return "Q" + n + " needs four items";
        if (seen[k]) return "Q" + n + ' has two items reading "' + q.options[i].trim() + '"';
        seen[k] = 1;
      }
      if (!String(q.explanation || "").trim()) {
        return "Q" + n + " needs an explanation for the reveal";
      }
      return null;
    },
    board: function(game) {
      var n = (game.questions || []).length;
      if (n < 3) return "needs at least 3 sets and this has " + n;
      if (n > 10) return "can have at most 10 sets and this has " + n;
      return null;
    },
    compile: function(q, settings, s) {
      s.question = q.question || "Which is the odd one out — and what is the rule?";
      s.headPrompt = s.question;
      s.options = q.options.map(function(o) {
        return String(o).trim();
      }).slice(0, 4);
      s.correct = Math.max(0, Math.min(3, Number(q.correct) || 0));
      s.points = 0;
      s.voteOnly = true;
      s.hideAnswerUntilReveal = true;
      s.oddoneDiscuss = true;
      s.timeLimit = 0;
    },
    mark: function(s, response) {
      return Number.isInteger(response) && response === s.correct;
    },
    summary: function(q) {
      var odd = String((q.options || [])[q.correct] || "").trim();
      return (odd || "odd one") + " · discuss";
    }
  };

  // src/games/wordreveal.js
  var WR_LEVELS = ["easy", "medium", "hard"];
  var WR_DRIP = [3, 5, 10, 15];
  function wordRevealPreFraction(difficulty) {
    if (difficulty === "easy") return 0.6;
    if (difficulty === "medium") return 0.4;
    return 0;
  }
  function wordRevealPoints(fractionRevealed) {
    var f = Math.max(0, Math.min(1, Number(fractionRevealed) || 0));
    if (f < 0.5) return 100;
    if (f < 0.75) return 75;
    return 50;
  }
  function wordRevealMask(word, shownCount) {
    var chars = String(word || "").split("");
    var letterIdx = [];
    chars.forEach(function(ch, i2) {
      if (/\S/.test(ch)) letterIdx.push(i2);
    });
    var n = Math.max(0, Math.min(letterIdx.length, Number(shownCount) || 0));
    var open = {};
    for (var i = 0; i < n; i++) open[letterIdx[i]] = 1;
    return chars.map(function(ch, i2) {
      if (!/\S/.test(ch)) return ch;
      return open[i2] ? ch : "_";
    }).join("");
  }
  function wordRevealLetterCount(word) {
    return String(word || "").replace(/\s/g, "").length;
  }
  var wordreveal = {
    defaults: {
      "defaultTime": 0,
      "defaultPoints": 0,
      "confidence": false
    },
    key: "wordreveal",
    label: "Word reveal",
    icon: "…",
    blurb: "Guess the word as letters drip in. Earlier guesses score more.",
    mechanic: "wordreveal",
    input: "text",
    minOptions: 0,
    maxOptions: 0,
    fixedOptions: null,
    make: function() {
      return {
        question: "What word is being revealed?",
        word: "PHOTOSYNTHESIS",
        hint: "How plants make food",
        accept: ["photosynthesis"],
        allowTypos: true,
        difficulty: "medium",
        dripInterval: 5
      };
    },
    normalize: function(q) {
      q.word = String(q.word == null ? "" : q.word).slice(0, 40);
      q.hint = String(q.hint == null ? "" : q.hint).slice(0, 120);
      q.difficulty = WR_LEVELS.indexOf(q.difficulty) > -1 ? q.difficulty : "medium";
      var drip = Number(q.dripInterval);
      q.dripInterval = WR_DRIP.indexOf(drip) > -1 ? drip : 5;
      if (!Array.isArray(q.accept)) q.accept = [];
      q.accept = q.accept.map(function(a) {
        return String(a == null ? "" : a).slice(0, 200);
      }).slice(0, 8);
      if (!q.accept.some(function(a) {
        return String(a).trim();
      }) && q.word.trim()) {
        q.accept = [q.word.trim()];
      }
      if (!q.accept.length) q.accept = [""];
      q.allowTypos = q.allowTypos !== false;
      if (!String(q.question || "").trim()) {
        q.question = q.hint ? q.hint : "What word is being revealed?";
      }
      delete q.options;
      delete q.correct;
      return q;
    },
    problems: function(q, n) {
      if (!String(q.word || "").trim()) return "Q" + n + " needs a word to reveal";
      if (!q.accept.some(function(a) {
        return String(a).trim();
      })) {
        return "Q" + n + " has no accepted answer";
      }
      return null;
    },
    compile: function(q, settings, s) {
      s.question = q.question;
      s.word = q.word.trim();
      s.hint = q.hint;
      s.accept = q.accept.filter(function(a) {
        return String(a).trim();
      });
      if (!s.accept.length && s.word) s.accept = [s.word];
      s.answer = s.accept[0] || s.word;
      s.allowTypos = q.allowTypos !== false;
      s.difficulty = q.difficulty;
      s.dripInterval = q.dripInterval;
      s.preReveal = wordRevealPreFraction(q.difficulty);
      s.options = [];
      s.correct = -1;
      s.hideAnswerUntilReveal = true;
    },
    mark: function(s, response) {
      return markTyped(s.accept, response, s.allowTypos).right;
    },
    summary: function(q) {
      return (q.word || "word") + " · drip " + (q.dripInterval || 5) + "s";
    },
    describe: function(s, response) {
      var hit = markTyped(s.accept, response, s.allowTypos);
      return hit.right ? hit.matched || s.answer : String(response == null ? "" : response);
    }
  };

  // src/boards/memory.js
  function createMemoryBoard() {
    function compile(game, { makeSlide: makeSlide2 }) {
      const st = game.settings;
      const out = [];
      for (var first = 0; first < game.questions.length; first += 8) {
        var pairs = game.questions.slice(first, first + 8);
        var board5 = makeSlide2("content");
        board5.id = game.id + ":memory:" + pairs[0].id;
        board5.gameId = game.id;
        board5.gameTitle = game.title;
        board5.title = game.title;
        board5.bullets = [
          "Look at the shared board. Explain your answer aloud; your teacher checks each claim."
        ];
        board5.notes = pairs.map(function(q) {
          return q.notes || "";
        }).filter(Boolean).join("\n\n");
        board5.memoryBoard = {
          kind: game.style,
          set: Math.floor(first / 8) + 1,
          sets: Math.ceil(game.questions.length / 8),
          studySeconds: Math.max(0, Math.min(60, Number(pairs[0].studySeconds) || 0)),
          participants: game.style === "memoryflip" || st.mode !== "teams" ? ["Class"] : st.teams.map(function(t, i) {
            return String(t.name || "").trim() || "Team " + (i + 1);
          }),
          pairs: pairs.map(function(q) {
            return { id: q.id, term: q.term || q.question || "", definition: q.definition || "" };
          })
        };
        out.push(board5);
      }
      return out;
    }
    function decorateIntro(intro, game) {
      const st = game.settings;
      intro.subtitle = game.style === "knowledgeflip" ? game.questions.length + " keywords · explain aloud · no study timer" : game.questions.length + " cards · explain aloud · teacher checks";
      intro.notes = game.style === "knowledgeflip" ? "Open the board when ready. Keywords stay visible — choose, explain, reveal, claim." : "Start the board when the room is ready. Learners recall aloud; the teacher checks each claim.";
    }
    function authorQuestion(insp, question, context) {
      const { UI, game, touched, repaint } = context;
      if (game.style === "knowledgeflip") {
        insp.appendChild(
          UI.field(
            "Keyword",
            UI.text(question.term || "", function(v) {
              question.term = v.slice(0, 80);
              question.question = question.term;
              touched();
              repaint();
            })
          )
        );
        insp.appendChild(
          UI.field(
            "Definition (host only)",
            UI.area(
              question.definition || "",
              function(v) {
                question.definition = v.slice(0, 240);
                touched();
                repaint();
              },
              3
            ),
            "Stays off the board until you reveal it in the check panel. Learners explain from the keyword alone."
          )
        );
      } else {
        insp.appendChild(
          UI.field(
            "Term",
            UI.text(question.term || "", function(v) {
              question.term = v.slice(0, 80);
              question.question = question.term;
              touched();
              repaint();
            })
          )
        );
        insp.appendChild(
          UI.field(
            "Definition",
            UI.area(
              question.definition || "",
              function(v) {
                question.definition = v.slice(0, 240);
                touched();
                repaint();
              },
              3
            )
          )
        );
      }
    }
    function authorInspector(insp, question, context) {
      const { el, game, boardSettingLink, questionOps } = context;
      var boardHint = game.style === "knowledgeflip" ? "Keywords stay visible — there is no study timer. Learners choose a card, explain aloud, then you reveal and claim (+1). Edit each keyword in the rail; the preview shows the shared board." : game.style === "memoryflip" ? "Pairs become a shared board in sets of up to eight. Study, then recall. One class collection — teacher checks each claim." : "Pairs become a shared board in sets of up to eight. Study, then recall with rotating turns. Play the game (or use presenter view) to run the board.";
      if (game.style !== "knowledgeflip") {
        var study = Number(game.questions[0].studySeconds) || 0;
        insp.appendChild(
          boardSettingLink("Study time", study ? study + " seconds" : "no study phase")
        );
      }
      insp.appendChild(el("p", "hint", boardHint));
      insp.appendChild(questionOps());
      return;
    }
    function authorSettings(body, context) {
      const { UI, el, game, touched, drawRail, drawPreview, st, draw2 } = context;
      var classOnly = game.style === "memoryflip";
      body.appendChild(
        UI.field(
          "Play together",
          UI.segmented(
            [
              { value: "individual", label: "Whole class" },
              { value: "teams", label: "Rotating teams" }
            ],
            classOnly ? "individual" : st.mode,
            function(v) {
              st.mode = classOnly ? "individual" : v;
              touched();
              draw2();
              drawPreview();
            }
          ),
          classOnly ? "Memory Flip uses one shared class collection." : game.style === "knowledgeflip" ? "Keywords stay on the board. One card per turn — whole class or rotating teams after a claim or pass." : "One card per turn. Teams rotate after a claim or pass."
        )
      );
      if (st.mode === "teams" && !classOnly) {
        body.appendChild(
          UI.field(
            "Team names — one per line",
            UI.area(
              st.teams.map(function(t) {
                return t.name;
              }).join("\n"),
              function(v) {
                var names = v.split("\n").map(function(n) {
                  return n.trim().slice(0, 20);
                }).filter(Boolean).slice(0, 6);
                st.teams = names.length ? names.map(function(name) {
                  return { name };
                }) : [{ name: "Class" }];
                touched();
                drawPreview();
              },
              4
            )
          )
        );
      }
      if (game.style !== "knowledgeflip") {
        body.appendChild(
          UI.field(
            "Study time for the whole board (seconds)",
            UI.num(
              game.questions[0].studySeconds,
              function(v) {
                game.questions.forEach(function(pair) {
                  pair.studySeconds = Math.max(0, Math.min(60, v == null ? 10 : v));
                });
                touched();
                draw2();
                drawPreview();
                drawRail();
              },
              0,
              60
            ),
            "The whole set is visible during study, then the cards hide. Recall is untimed; 0 skips study."
          )
        );
      }
      body.appendChild(
        el(
          "p",
          "hint",
          game.style === "knowledgeflip" ? "No study phase. Open the board → choose a keyword → explain → reveal → claim. Collection scores stay on this board; they do not feed the live quiz leaderboard." : "Each accepted claim collects one card. The board shows collection scores and recognises ties. Learners answer aloud; the teacher controls the board or uses presenter view. These collection scores are local to this playthrough and do not change the live quiz leaderboard."
        )
      );
      return;
    }
    return {
      clock: {
        selector: ".mem-time",
        text: (state) => state.phase === "study" ? Math.ceil(state.remaining) + "s" : Math.floor(state.elapsed / 60) + ":" + String(Math.floor(state.elapsed % 60)).padStart(2, "0")
      },
      focusPrimary: ".mem-check button:not(:disabled)",
      focusFallback: ".mem-card:not(:disabled), .mem-actions button:not(:disabled)",
      key: "memory",
      runtime: "Memory",
      field: "memoryBoard",
      states: "memoryStates",
      state: "memoryState",
      command: "memoryCommand",
      className: "memory-board-slide",
      setSize: 8,
      showsQuestion: false,
      compile,
      decorateIntro,
      authorQuestion,
      authorInspector,
      authorSettings
    };
  }

  // src/samples/memory.json
  var memory_default = [
    {
      term: "Mitochondrion",
      question: "Mitochondrion",
      definition: "Where respiration releases energy"
    },
    {
      term: "Nucleus",
      question: "Nucleus",
      definition: "Contains the genetic instructions for the cell"
    },
    {
      term: "Cell membrane",
      question: "Cell membrane",
      definition: "Controls what enters and leaves the cell"
    },
    {
      term: "Chloroplast",
      question: "Chloroplast",
      definition: "Contains chlorophyll and absorbs light for photosynthesis"
    }
  ];

  // src/games/memory.js
  function normalizePairQuestion(q) {
    q.term = String(q.term == null ? "" : q.term).slice(0, 80);
    q.definition = String(q.definition == null ? "" : q.definition).slice(0, 240);
    if (!String(q.question || "").trim()) q.question = q.term || "Claim this pair";
    var study = Number(q.studySeconds);
    q.studySeconds = Number.isFinite(study) ? Math.max(0, Math.min(60, Math.round(study))) : 10;
    delete q.options;
    delete q.correct;
    return q;
  }
  function pairProblems(q, n) {
    if (!String(q.term || "").trim()) return "Q" + n + " needs a term";
    if (!String(q.definition || "").trim()) return "Q" + n + " needs a definition";
    return null;
  }
  function compilePairClaim(q, settings, s, hideAfterStudy) {
    s.question = q.question || q.term;
    s.term = q.term.trim();
    s.definition = q.definition.trim();
    s.answer = s.definition;
    s.accept = [s.definition];
    s.allowTypos = true;
    s.studySeconds = q.studySeconds;
    s.hideAfterStudy = !!hideAfterStudy;
    s.options = ["Claimed", "Not yet"];
    s.correct = 0;
  }
  var board = createMemoryBoard();
  var memoryflip = {
    boardEngine: board,
    defaults: {
      "scoreboard": false,
      "defaultTime": 0,
      "defaultPoints": 1,
      "scoreSlide": false,
      "confidence": false
    },
    starters: memory_default,
    key: "memoryflip",
    label: "Memory flip",
    icon: "🂠",
    blurb: "Study term↔definition pairs, then claim them. Host marks each claim.",
    mechanic: "claim",
    input: "choice",
    minOptions: 2,
    maxOptions: 2,
    fixedOptions: ["Claimed", "Not yet"],
    make: function() {
      return {
        question: "Chloroplast",
        term: "Chloroplast",
        definition: "Organelle where photosynthesis happens",
        studySeconds: 10
      };
    },
    normalize: normalizePairQuestion,
    problems: pairProblems,
    compile: function(q, st, s) {
      compilePairClaim(q, st, s, true);
    },
    mark: function(s, response) {
      return Number.isInteger(response) && response === s.correct;
    },
    summary: function(q) {
      return (q.term || "pair") + " · study " + (q.studySeconds || 10) + "s";
    }
  };
  var memorymatch = {
    boardEngine: board,
    defaults: {
      "mode": "teams",
      "scoreboard": false,
      "defaultTime": 0,
      "defaultPoints": 1,
      "scoreSlide": false,
      "confidence": false
    },
    starters: memory_default,
    key: "memorymatch",
    label: "Memory match",
    icon: "⧉",
    blurb: "Study the whole board, choose a hidden card and explain its meaning. Claim it for your team, or pass and retry.",
    mechanic: "claim",
    input: "choice",
    minOptions: 2,
    maxOptions: 2,
    fixedOptions: ["Claimed", "Not yet"],
    make: function() {
      return {
        question: "Mitochondrion",
        term: "Mitochondrion",
        definition: "Where respiration releases energy",
        studySeconds: 10,
        rotateClaims: true
      };
    },
    normalize: function(q) {
      normalizePairQuestion(q);
      q.rotateClaims = q.rotateClaims !== false;
      return q;
    },
    problems: pairProblems,
    compile: function(q, st, s) {
      compilePairClaim(q, st, s, true);
      s.rotateClaims = q.rotateClaims !== false;
    },
    mark: function(s, response) {
      return Number.isInteger(response) && response === s.correct;
    },
    summary: function(q) {
      return (q.term || "pair") + " · rotate claims";
    }
  };
  var knowledgeflip = {
    boardEngine: board,
    defaults: {
      "scoreboard": false,
      "defaultTime": 0,
      "defaultPoints": 1,
      "scoreSlide": false,
      "confidence": false
    },
    starters: memory_default,
    key: "knowledgeflip",
    label: "Knowledge flip",
    icon: "↺",
    blurb: "Keywords stay on the board. Choose one, explain aloud, then claim. No study timer.",
    mechanic: "claim",
    input: "choice",
    minOptions: 2,
    maxOptions: 2,
    fixedOptions: ["Claimed", "Not yet"],
    make: function() {
      return {
        question: "Osmosis",
        term: "Osmosis",
        definition: "Diffusion of water across a partially permeable membrane",
        studySeconds: 0
      };
    },
    normalize: function(q) {
      normalizePairQuestion(q);
      q.studySeconds = 0;
      return q;
    },
    problems: pairProblems,
    compile: function(q, st, s) {
      compilePairClaim(q, st, s, false);
    },
    mark: function(s, response) {
      return Number.isInteger(response) && response === s.correct;
    },
    summary: function(q) {
      return (q.term || "keyword") + " · always visible";
    }
  };

  // src/games/headsup.js
  var headsup = {
    defaults: {
      "defaultTime": 60,
      "defaultPoints": 1,
      "confidence": false
    },
    key: "headsup",
    label: "Heads up",
    icon: "↑",
    blurb: "Describe the term; peers retrieve it. Host marks Correct or Pass.",
    mechanic: "judge",
    input: "choice",
    minOptions: 2,
    maxOptions: 2,
    fixedOptions: ["Correct", "Pass"],
    make: function() {
      return {
        question: "Photosynthesis",
        term: "Photosynthesis",
        category: "Biology",
        hint: "",
        options: ["Correct", "Pass"],
        correct: 0
      };
    },
    normalize: function(q) {
      q.term = String(q.term == null ? q.question : q.term).slice(0, 80);
      q.category = String(q.category == null ? "" : q.category).slice(0, 40);
      q.hint = String(q.hint == null ? "" : q.hint).slice(0, 120);
      q.question = q.term || q.question || "Term";
      q.options = ["Correct", "Pass"];
      q.correct = 0;
      return q;
    },
    problems: function(q, n) {
      if (!String(q.term || q.question || "").trim()) return "Q" + n + " needs a term";
      return null;
    },
    compile: function(q, st, s) {
      s.question = q.term || q.question;
      s.term = q.term || q.question;
      s.category = q.category;
      s.hint = q.hint;
      s.options = ["Correct", "Pass"];
      s.correct = 0;
      s.answer = "Correct";
      s.judgeKind = "headsup";
    },
    mark: function(s, response) {
      return Number.isInteger(response) && response === 0;
    },
    summary: function(q) {
      return q.term || q.question || "term";
    }
  };

  // src/games/spinexplain.js
  function spinExplainPoints(verdict) {
    if (verdict === "clear" || verdict === 0) return 2;
    if (verdict === "hint" || verdict === 1) return 1;
    return 0;
  }
  var spinexplain = {
    defaults: {
      "defaultPoints": 2,
      "confidence": false
    },
    key: "spinexplain",
    label: "Spin & explain",
    icon: "◉",
    blurb: "Spin a concept; explain it aloud. Host scores Clear, With hint, or Reject.",
    mechanic: "judge",
    input: "choice",
    minOptions: 3,
    maxOptions: 3,
    fixedOptions: ["Clear", "With hint", "Reject"],
    make: function() {
      return {
        question: "Respiration",
        term: "Respiration",
        hint: "Energy from glucose",
        category: "",
        options: ["Clear", "With hint", "Reject"],
        correct: 0
      };
    },
    normalize: function(q) {
      q.term = String(q.term == null ? q.question : q.term).slice(0, 80);
      q.hint = String(q.hint == null ? "" : q.hint).slice(0, 120);
      q.category = String(q.category == null ? "" : q.category).slice(0, 40);
      q.question = q.term || q.question || "Concept";
      q.options = ["Clear", "With hint", "Reject"];
      q.correct = 0;
      return q;
    },
    problems: function(q, n) {
      if (!String(q.term || q.question || "").trim()) return "Q" + n + " needs a term";
      return null;
    },
    compile: function(q, st, s) {
      s.question = q.term || q.question;
      s.term = q.term || q.question;
      s.hint = q.hint;
      s.category = q.category;
      s.options = ["Clear", "With hint", "Reject"];
      s.correct = 0;
      s.answer = "Clear";
      s.judgeKind = "spinexplain";
    },
    mark: function(s, response) {
      return Number.isInteger(response) && response === 0;
    },
    summary: function(q) {
      return q.term || "concept";
    }
  };

  // src/games/connection.js
  var connection = {
    defaults: {
      "defaultTime": 0,
      "defaultPoints": 1,
      "confidence": false
    },
    key: "connection",
    label: "Connection maker",
    icon: "⚭",
    blurb: "Pick two ideas and explain the bridge. Host Accepts for +1.",
    mechanic: "judge",
    input: "choice",
    minOptions: 2,
    maxOptions: 2,
    fixedOptions: ["Accept", "Reject"],
    make: function() {
      return {
        question: "Link these two ideas",
        itemA: "Photosynthesis",
        itemB: "Respiration",
        options: ["Accept", "Reject"],
        correct: 0
      };
    },
    normalize: function(q) {
      q.itemA = String(q.itemA == null ? "" : q.itemA).slice(0, 80);
      q.itemB = String(q.itemB == null ? "" : q.itemB).slice(0, 80);
      q.question = q.question || "How do " + (q.itemA || "A") + " and " + (q.itemB || "B") + " connect?";
      q.options = ["Accept", "Reject"];
      q.correct = 0;
      return q;
    },
    problems: function(q, n) {
      if (!String(q.itemA || "").trim() || !String(q.itemB || "").trim()) {
        return "Q" + n + " needs two items to connect";
      }
      return null;
    },
    compile: function(q, st, s) {
      s.question = q.question;
      s.itemA = q.itemA.trim();
      s.itemB = q.itemB.trim();
      s.options = ["Accept", "Reject"];
      s.correct = 0;
      s.answer = "Accept";
      s.judgeKind = "accept";
    },
    mark: function(s, response) {
      return Number.isInteger(response) && response === 0;
    },
    summary: function(q) {
      return (q.itemA || "?") + " ↔ " + (q.itemB || "?");
    }
  };

  // src/samples/conceptchain.json
  var conceptchain_default = [
    {
      term: "Cell",
      prompt: "The basic unit of living things — what connects next?",
      question: "Chain from: Cell"
    },
    {
      term: "Tissue",
      prompt: "Groups of similar cells — how does this link onward?",
      question: "Chain from: Tissue"
    },
    {
      term: "Organ",
      prompt: "Tissues working together — what comes after?",
      question: "Chain from: Organ"
    },
    {
      term: "System",
      prompt: "Organs cooperating — how does this reach the organism?",
      question: "Chain from: System"
    }
  ];

  // src/games/conceptchain.js
  var CHAIN_TIMES = [30, 45, 60, 90];
  function clampChainSeconds(n) {
    n = Number(n);
    return CHAIN_TIMES.indexOf(n) > -1 ? n : 45;
  }
  var conceptchain = {
    defaults: {
      "defaultTime": 45,
      "defaultPoints": 1,
      "confidence": false
    },
    starters: conceptchain_default,
    key: "conceptchain",
    label: "Concept chain",
    icon: "⛓",
    blurb: "Start from a term; add a justified link. Host Accepts to grow the chain (+1).",
    mechanic: "judge",
    input: "choice",
    minOptions: 2,
    maxOptions: 2,
    fixedOptions: ["Accept", "Reject"],
    make: function() {
      return {
        question: "Add the next justified link",
        term: "Cell",
        prompt: "The basic unit of living things — what connects next?",
        options: ["Accept", "Reject"],
        correct: 0
      };
    },
    normalize: function(q) {
      q.term = String(q.term == null ? "" : q.term).slice(0, 80);
      if (q.definition != null && String(q.definition).trim()) {
        q.prompt = q.definition;
      }
      q.prompt = String(q.prompt == null ? "" : q.prompt).slice(0, 280);
      delete q.definition;
      q.question = q.question || "Chain from: " + (q.term || "…");
      q.options = ["Accept", "Reject"];
      q.correct = 0;
      return q;
    },
    problems: function(q, n) {
      if (!String(q.term || "").trim()) return "Q" + n + " needs a starting term";
      return null;
    },
    board: function(game) {
      var n = (game.questions || []).length;
      if (n < 3) return "needs at least 3 starting concepts and this has " + n;
      if (n > 10) return "can have at most 10 starting concepts and this has " + n;
      return null;
    },
    compile: function(q, st, s) {
      s.question = q.question;
      s.term = String(q.term || "").trim();
      s.prompt = String(q.prompt || "").trim();
      s.options = ["Accept", "Reject"];
      s.correct = 0;
      s.answer = "Accept";
      s.judgeKind = "accept";
      s.conceptChain = true;
      s.timeLimit = clampChainSeconds(
        q.timeLimit == null ? st.defaultTime : q.timeLimit
      );
      s.points = 1;
    },
    mark: function(s, response) {
      return Number.isInteger(response) && response === 0;
    },
    summary: function(q) {
      return "Chain · " + (q.term || "term");
    }
  };

  // src/games/randomchallenge.js
  var randomchallenge = {
    defaults: {
      "scoreboard": false,
      "defaultTime": 0,
      "defaultPoints": 0,
      "scoreSlide": false,
      "confidence": false
    },
    key: "randomchallenge",
    label: "Random challenge",
    icon: "✦",
    blurb: "Draw a challenge; host marks Complete. Count only — no competitive score.",
    mechanic: "count",
    input: "choice",
    minOptions: 2,
    maxOptions: 2,
    fixedOptions: ["Complete", "Skip"],
    make: function() {
      return {
        question: "Draw and take the challenge",
        challenge: "Explain this idea to someone who missed the last lesson.",
        options: ["Complete", "Skip"],
        correct: 0
      };
    },
    normalize: function(q) {
      q.challenge = String(q.challenge == null ? q.question : q.challenge).slice(0, 280);
      q.question = q.challenge || q.question || "Challenge";
      q.options = ["Complete", "Skip"];
      q.correct = 0;
      return q;
    },
    problems: function(q, n) {
      if (!String(q.challenge || q.question || "").trim()) return "Q" + n + " needs a challenge";
      return null;
    },
    compile: function(q, st, s) {
      s.question = q.challenge || q.question;
      s.challenge = q.challenge || q.question;
      s.options = ["Complete", "Skip"];
      s.correct = 0;
      s.answer = "Complete";
      s.judgeKind = "count";
    },
    mark: function(s, response) {
      return Number.isInteger(response) && response === 0;
    },
    summary: function(q) {
      return "Challenge";
    }
  };

  // src/boards/bingo.js
  function createBingoBoard() {
    function compile(game, { makeSlide: makeSlide2 }) {
      const st = game.settings;
      const out = [];
      var card = makeSlide2("content");
      card.id = game.id + ":bingo";
      card.gameId = game.id;
      card.gameTitle = game.title;
      card.title = game.title;
      card.bullets = [
        "Your teacher reads a definition. If the term is on your card, say what it means to claim the square."
      ];
      card.notes = game.questions.map(function(q) {
        return q.notes || "";
      }).filter(Boolean).join("\n\n");
      card.bingoBoard = {
        gridSize: Number(game.questions[0].gridSize) || 3,
        /* Teams only, capped at six — six 4×4 cards is already the most a
           projector can hold. On an individual game the room plays one card
           together, which is the shape a single-card class game takes. */
        participants: st.mode === "teams" ? st.teams.slice(0, 6).map(function(t, i) {
          return String(t.name || "").trim() || "Team " + (i + 1);
        }) : ["The class"],
        pool: game.questions.map(function(q) {
          return {
            id: q.id,
            term: String(q.term || "").trim(),
            definition: String(q.definition || "").trim()
          };
        }).filter(function(pair) {
          return pair.term && pair.definition;
        })
      };
      out.push(card);
      return out;
    }
    function decorateIntro(intro, game) {
      const st = game.settings;
      var gsz = Number(game.questions[0].gridSize) || 3;
      intro.subtitle = gsz + "×" + gsz + " cards · " + game.questions.length + " terms in the pool" + (st.mode === "teams" ? " · a card each" : " · one class card");
      intro.notes = "Call a definition, then ask the team that claims it to explain the term. A row, column or diagonal wins.";
    }
    function poolNote(size, game) {
      var need = size * size;
      var seen = {}, n = 0;
      game.questions.forEach(function(q) {
        var key = String(q.term || "").trim().toLowerCase();
        if (key && !seen[key]) {
          seen[key] = 1;
          n++;
        }
      });
      if (n < need)
        return need + " different terms needed · " + n + " so far · add " + (need - n) + " more";
      return n + " terms in the pool · every card is a different " + size + "×" + size + " deal · a row, column or diagonal wins";
    }
    function authorQuestion(insp, question, context) {
      const { UI, touched, repaint, drawRail } = context;
      insp.appendChild(
        UI.field(
          "Term (on the cards)",
          UI.text(question.term || "", function(v) {
            question.term = v.slice(0, 40);
            question.question = question.term;
            touched();
            repaint();
            drawRail();
          }),
          "One square. Every term in this game goes in the pool the cards are dealt from."
        )
      );
      insp.appendChild(
        UI.field(
          "Definition (what you read out)",
          UI.area(
            question.definition || "",
            function(v) {
              question.definition = v.slice(0, 240);
              touched();
              repaint();
            },
            3
          ),
          "Stays off the wall until you reveal it. The room hears the definition and finds the term."
        )
      );
    }
    function authorInspector(insp, question, context) {
      const { el, game, boardSettingLink, questionOps } = context;
      var size = Number(question.gridSize) || 3;
      insp.appendChild(boardSettingLink("Card size", size + " × " + size));
      insp.appendChild(el("p", "hint", poolNote(size, game)));
      insp.appendChild(
        el(
          "p",
          "hint",
          "Every team is dealt a different card from these terms, so the pool wants more terms than a card has squares. There is no countdown and no points: you call a definition, a team explains the term, and you mark the square. Play the game (or use presenter view) to run it."
        )
      );
      insp.appendChild(questionOps());
      return;
    }
    function authorSettings(body, context) {
      const { SF, UI, el, game, touched, drawRail, drawPreview, st, draw2 } = context;
      body.appendChild(
        UI.field(
          "Play as",
          UI.segmented(
            [
              { value: "individual", label: "One class card" },
              { value: "teams", label: "A card each" }
            ],
            st.mode,
            function(v) {
              st.mode = v;
              if (v === "teams" && st.teams.length < 2) {
                st.teams = SF.makeGame().settings.teams.slice(0, 2);
              }
              touched();
              draw2();
              drawPreview();
            }
          ),
          st.mode === "teams" ? "Every team is dealt a different card from the same pool, so the same call is on some cards and not others." : "The room plays one card together. Nobody competes; the class is trying to finish a line."
        )
      );
      if (st.mode === "teams") {
        body.appendChild(
          UI.field(
            "Team names — one per line",
            UI.area(
              st.teams.map(function(t) {
                return t.name;
              }).join("\n"),
              function(v) {
                var names = v.split("\n").map(function(n) {
                  return n.trim().slice(0, 20);
                }).filter(Boolean).slice(0, 6);
                st.teams = names.length ? names.map(function(name) {
                  return { name };
                }) : [{ name: "Class" }];
                touched();
                drawPreview();
              },
              4
            ),
            "Six at most — six cards is already as much as a projector holds."
          )
        );
      }
      body.appendChild(
        UI.field(
          "Card size",
          UI.segmented(
            [
              { value: "2", label: "2 × 2" },
              { value: "3", label: "3 × 3" },
              { value: "4", label: "4 × 4" }
            ],
            String(game.questions[0].gridSize || 3),
            function(v) {
              game.questions.forEach(function(pair) {
                pair.gridSize = Number(v);
              });
              touched();
              draw2();
              drawPreview();
              drawRail();
            }
          ),
          poolNote(Number(game.questions[0].gridSize) || 3, game)
        )
      );
      body.appendChild(
        el(
          "p",
          "hint",
          "No timer and no points: a row, column or diagonal wins. Each term is called once, so a square nobody could explain is gone. Claims are recorded in the session report as a spoken round, credited to the team — not to a learner, because a spoken answer has no name on it."
        )
      );
      return;
    }
    return {
      focusPrimary: ".bingo-verdicts button:not(:disabled)",
      focusFallback: ".bingo-actions button:not(:disabled)",
      key: "bingo",
      runtime: "Bingo",
      field: "bingoBoard",
      states: "bingoStates",
      state: "bingoState",
      command: "bingoCommand",
      className: "bingo-board-slide",
      setSize: Infinity,
      showsQuestion: false,
      compile,
      decorateIntro,
      authorQuestion,
      authorInspector,
      authorSettings
    };
  }

  // src/games/bingo.js
  function bingoHasLine(marked, size) {
    size = Math.max(2, Math.min(4, Number(size) || 3));
    var n = size * size;
    var cells = [];
    for (var i = 0; i < n; i++) cells[i] = !!marked[i];
    var r, c, ok;
    for (r = 0; r < size; r++) {
      ok = true;
      for (c = 0; c < size; c++) if (!cells[r * size + c]) {
        ok = false;
        break;
      }
      if (ok) return true;
    }
    for (c = 0; c < size; c++) {
      ok = true;
      for (r = 0; r < size; r++) if (!cells[r * size + c]) {
        ok = false;
        break;
      }
      if (ok) return true;
    }
    ok = true;
    for (i = 0; i < size; i++) if (!cells[i * size + i]) {
      ok = false;
      break;
    }
    if (ok) return true;
    ok = true;
    for (i = 0; i < size; i++) if (!cells[i * size + (size - 1 - i)]) {
      ok = false;
      break;
    }
    return ok;
  }
  var board2 = createBingoBoard();
  var bingo = {
    boardEngine: board2,
    defaults: {
      "scoreboard": false,
      "defaultTime": 0,
      "defaultPoints": 0,
      "scoreSlide": false,
      "confidence": false
    },
    key: "bingo",
    label: "Bingo",
    icon: "▣",
    blurb: "Every team gets a different card. Call a definition; the team holding that term explains it to claim the square. A line wins — no points.",
    mechanic: "bingo",
    input: "choice",
    minOptions: 0,
    maxOptions: 0,
    fixedOptions: null,
    /* One pair per question, like the memory boards: the questions are the
       pool the cards are dealt from, not a run of slides. */
    make: function() {
      return {
        question: "Nucleus",
        term: "Nucleus",
        definition: "Holds the cell’s DNA",
        gridSize: 3
      };
    },
    normalize: function(q) {
      if (Array.isArray(q.terms)) {
        q.term = String(q.terms[0] || "");
        q.question = q.term;
        q.definition = "";
      }
      delete q.terms;
      normalizePairQuestion(q);
      q.studySeconds = 0;
      var size = Number(q.gridSize);
      q.gridSize = [2, 3, 4].indexOf(size) > -1 ? size : 3;
      return q;
    },
    problems: pairProblems,
    /* A card cannot be dealt from a pool smaller than itself, and duplicate
       terms would put the same square on a card twice. Neither is visible
       one question at a time, so it is asked of the whole game. */
    board: function(game) {
      var size = Number((game.questions[0] || {}).gridSize) || 3;
      var seen = {}, n = 0;
      game.questions.forEach(function(q) {
        var key = String(q.term || "").trim().toLowerCase();
        if (key && !seen[key]) {
          seen[key] = 1;
          n++;
        }
      });
      if (n < size * size) {
        return "a " + size + "×" + size + " card needs " + size * size + " different terms and this has " + n;
      }
      return null;
    },
    /* Never reached when running — compileGame builds one board slide for the
       whole game. This is for the editor preview, which compiles a single
       question to show what one square holds. */
    compile: function(q, st, s) {
      s.question = q.question || q.term;
      s.term = String(q.term || "").trim();
      s.definition = String(q.definition || "").trim();
      s.gridSize = q.gridSize || 3;
      s.options = [];
      s.correct = -1;
      s.points = 0;
    },
    mark: function() {
      return false;
    },
    // squares are claimed, not answered
    summary: function(q) {
      return (q.gridSize || 3) + "×" + (q.gridSize || 3) + " card · one square";
    }
  };

  // src/boards/lowstakes.js
  function createLowstakesBoard({ clampLowstakesSeconds: clampLowstakesSeconds2 }) {
    function compile(game, { makeSlide: makeSlide2 }) {
      const st = game.settings;
      const out = [];
      var sheet = makeSlide2("content");
      sheet.id = game.id + ":lowstakes";
      sheet.gameId = game.id;
      sheet.gameTitle = game.title;
      sheet.title = game.title;
      sheet.bullets = ["Write your answers on paper. No notes — this is retrieval practice."];
      sheet.notes = game.questions.map(function(q) {
        return q.notes || "";
      }).filter(Boolean).join("\n\n");
      sheet.lowstakesBoard = {
        kind: "lowstakes",
        timeLimit: clampLowstakesSeconds2(st.defaultTime),
        items: game.questions.map(function(q) {
          var question = String(q.question || "").trim();
          var answer = String(q.answer || "").trim();
          return {
            id: q.id,
            question,
            answer,
            gap: !question ? "question" : !answer ? "answer" : null
          };
        })
      };
      out.push(sheet);
      return out;
    }
    function decorateIntro(intro, game) {
      const st = game.settings;
      intro.subtitle = game.questions.length + " questions · write on paper · " + clampLowstakesSeconds2(st.defaultTime) + "s then reveal";
      intro.notes = "Start the quiz when ready. Learners write answers on paper. When time is up (or you reveal early), discuss the answers together.";
    }
    function authorQuestion(insp, question, context) {
      const { UI, touched, repaint } = context;
      insp.appendChild(
        UI.field(
          "Question",
          UI.area(
            question.question || "",
            function(v) {
              question.question = v.slice(0, 280);
              touched();
              repaint();
            },
            3
          )
        )
      );
      insp.appendChild(
        UI.field(
          "Answer (revealed after the quiz)",
          UI.area(
            question.answer || "",
            function(v) {
              question.answer = v.slice(0, 280);
              touched();
              repaint();
            },
            3
          ),
          "Hidden on the board while the class writes. Shown when time is up or you reveal early."
        )
      );
    }
    function authorInspector(insp, question, context) {
      const { el, questionOps } = context;
      insp.appendChild(
        el(
          "p",
          "hint",
          "The whole set is one worksheet (3–10 pairs). Learners write on paper during the quiz clock — no notes, this is retrieval. Answers appear together for discussion. Incomplete rows stay on the board as gaps. No phone scoring and no points. Set the quiz length under Game settings."
        )
      );
      insp.appendChild(questionOps());
      return;
    }
    function authorSettings(body, context) {
      const { UI, el, touched, drawRail, drawPreview, st, draw2 } = context;
      if ([120, 180, 240].indexOf(Number(st.defaultTime)) < 0) st.defaultTime = 180;
      body.appendChild(
        UI.field(
          "Quiz time limit",
          UI.segmented(
            [
              { value: "120", label: "2m" },
              { value: "180", label: "3m" },
              { value: "240", label: "4m" }
            ],
            String(st.defaultTime),
            function(v) {
              st.defaultTime = Number(v);
              touched();
              draw2();
              drawPreview();
              drawRail();
            }
          ),
          "Whole-quiz countdown. When it ends, answers are revealed for discussion."
        )
      );
      body.appendChild(
        el(
          "p",
          "hint",
          "Use 3–10 question–answer pairs. No scoreboard and no phone answers. The class writes on paper (no notes), then you reveal and discuss. A reveal leaves a session-report trace — not phone scores."
        )
      );
      return;
    }
    return {
      clock: {
        selector: ".lsq-time",
        text: (state, engine) => engine.formatClock(state.phase === "quiz" ? state.remaining : state.elapsed || 0)
      },
      focusPrimary: ".lsq-actions button:not(:disabled)",
      focusFallback: ".lsq-actions button:not(:disabled)",
      reportEvent: "onReveal",
      reportValue: (value) => ({
        slideId: value.slideId,
        title: value.title,
        kind: "lowstakes",
        set: 1,
        card: 0,
        term: (value.count || 0) + " questions" + (value.early ? " · early reveal" : " · time up"),
        participant: "The class",
        right: true,
        value: 0
      }),
      key: "lowstakes",
      runtime: "LowStakes",
      field: "lowstakesBoard",
      states: "lowstakesStates",
      state: "lowstakesState",
      command: "lowstakesCommand",
      className: "lowstakes-board-slide",
      setSize: Infinity,
      showsQuestion: false,
      compile,
      decorateIntro,
      authorQuestion,
      authorInspector,
      authorSettings
    };
  }

  // src/samples/lowstakes.json
  var lowstakes_default = [
    {
      question: "What does RAM stand for?",
      answer: "Random Access Memory"
    },
    {
      question: "What is the function of the CPU?",
      answer: "To process instructions and perform calculations"
    },
    {
      question: "What type of storage is an SSD?",
      answer: "Solid State Drive / Flash storage"
    },
    {
      question: "What does ROM contain?",
      answer: "Read Only Memory / Boot instructions / BIOS"
    },
    {
      question: "What is cache memory used for?",
      answer: "Storing frequently accessed data for quick retrieval"
    }
  ];

  // src/games/lowstakes.js
  var LOWSTAKES_TIMES = [120, 180, 240];
  function clampLowstakesSeconds(n) {
    n = Number(n);
    if (LOWSTAKES_TIMES.indexOf(n) > -1) return n;
    if (!Number.isFinite(n) || n <= 0) return 180;
    if (n <= 150) return 120;
    if (n <= 210) return 180;
    return 240;
  }
  var board3 = createLowstakesBoard({ clampLowstakesSeconds });
  var lowstakes = {
    boardEngine: board3,
    defaults: {
      "scoreboard": false,
      "defaultTime": 180,
      "defaultPoints": 0,
      "scoreSlide": false,
      "confidence": false
    },
    starters: lowstakes_default,
    key: "lowstakes",
    label: "Low-stakes quiz",
    icon: "◎",
    blurb: "Timed retrieval on paper. When time is up, answers are revealed for discussion — no scoreboard.",
    mechanic: "count",
    input: "choice",
    minOptions: 0,
    maxOptions: 0,
    fixedOptions: null,
    make: function() {
      return {
        question: "What does RAM stand for?",
        answer: "Random Access Memory"
      };
    },
    normalize: function(q) {
      q.question = String(q.question == null ? "" : q.question).slice(0, 280);
      var ans = q.answer;
      if (ans == null || ans === "") ans = q.explanation;
      if ((ans == null || ans === "") && Array.isArray(q.options) && q.options.length) {
        ans = q.options[q.correct] || q.options[0];
      }
      q.answer = String(ans == null ? "" : ans).slice(0, 280);
      delete q.options;
      delete q.correct;
      delete q.accept;
      return q;
    },
    problems: function(q, n) {
      if (!String(q.question).trim()) return "Q" + n + " has no question text";
      if (!String(q.answer).trim()) return "Q" + n + " needs an answer for the reveal";
      return null;
    },
    /* Audit: 3–10 questions. Incomplete slots stay on the board as named gaps
       rather than vanishing, so the count here is every authored row. */
    board: function(game) {
      var n = (game.questions || []).length;
      if (n < 3) {
        return "needs at least 3 questions and this has " + n;
      }
      if (n > 10) {
        return "can have at most 10 questions and this has " + n;
      }
      return null;
    },
    compile: function(q, st, s) {
      s.question = q.question;
      s.answer = q.answer;
      s.options = [];
      s.correct = -1;
      s.points = 0;
    },
    mark: function() {
      return false;
    },
    summary: function(q) {
      return (String(q.question || "").trim() || "question") + " · retrieval";
    }
  };

  // src/boards/bowl.js
  function createBowlBoard({ bowlGrid: bowlGrid2 }) {
    function compile(game, { makeSlide: makeSlide2 }) {
      const st = game.settings;
      const out = [];
      var grid = bowlGrid2(game.questions);
      var bowl2 = makeSlide2("content");
      bowl2.id = game.id + ":bowl";
      bowl2.gameId = game.id;
      bowl2.gameTitle = game.title;
      bowl2.title = game.title;
      bowl2.bullets = [
        "Choose a category and a value. Answer aloud — your teacher checks it and awards the cell."
      ];
      bowl2.notes = game.questions.map(function(q) {
        return q.notes || "";
      }).filter(Boolean).join("\n\n");
      bowl2.bowlBoard = {
        categories: grid.categories,
        values: grid.values,
        cells: grid.cells,
        target: Number(game.questions[0].targetScore) || 1e3,
        participants: st.mode === "teams" ? st.teams.slice(0, 6).map(function(t, i) {
          return String(t.name || "").trim() || "Team " + (i + 1);
        }) : ["The class"]
      };
      out.push(bowl2);
      return out;
    }
    function decorateIntro(intro, game) {
      const st = game.settings;
      var bg = bowlGrid2(game.questions);
      intro.subtitle = bg.categories.length + (bg.categories.length === 1 ? " category · " : " categories · ") + game.questions.length + " cells · first to " + (Number(game.questions[0].targetScore) || 1e3);
      intro.notes = "Pick an unused cell, hear the answer, then reveal and award it. The board ends when it empties or a team reaches the target.";
    }
    function bowlNote(game, SF) {
      var grid = SF.bowlGrid(game.questions);
      var total = game.questions.reduce(function(n, q) {
        return n + (q.pointValue || 0);
      }, 0);
      var target = Number(game.questions[0] && game.questions[0].targetScore) || 1e3;
      var shape = grid.categories.length + (grid.categories.length === 1 ? " category · " : " categories · ") + game.questions.length + (game.questions.length === 1 ? " cell · " : " cells · ") + total + " points on the board";
      if (total < target) {
        return shape + " — less than the " + target + " target, so the board will empty first";
      }
      return shape + " · the board ends when someone reaches " + target;
    }
    function authorQuestion(insp, question, context) {
      const { UI, touched, drawRail } = context;
      insp.appendChild(
        UI.field(
          "Category",
          UI.text(question.category || "", function(v) {
            question.category = v.slice(0, 40);
            touched();
            drawRail();
          })
        )
      );
      insp.appendChild(
        UI.field(
          "Point value",
          UI.select(
            [100, 200, 300, 400, 500].map(function(n) {
              return { value: String(n), label: String(n) };
            }),
            String(question.pointValue || 200),
            function(v) {
              question.pointValue = Number(v);
              touched();
              drawRail();
            }
          )
        )
      );
      insp.appendChild(
        UI.field(
          "Answer (host only)",
          UI.text(question.answer || "", function(v) {
            question.answer = v.slice(0, 120);
            touched();
          }),
          "Off the wall until you reveal it. Then award the cell to a team."
        )
      );
    }
    function authorInspector(insp, question, context) {
      const { SF, el, game, boardSettingLink, questionOps } = context;
      insp.appendChild(
        boardSettingLink("Target score", String(Number(question.targetScore) || 1e3))
      );
      insp.appendChild(el("p", "hint", bowlNote(game, SF)));
      insp.appendChild(
        el(
          "p",
          "hint",
          "This question is one cell. Questions sharing a category and a value stack in the same cell and are asked one at a time. The answer is for you — it goes up only when you reveal it, and then you award the cell to whoever answered."
        )
      );
      insp.appendChild(questionOps());
      return;
    }
    function authorSettings(body, context) {
      const { SF, UI, el, game, touched, drawRail, drawPreview, st, draw2 } = context;
      body.appendChild(
        UI.field(
          "Play as",
          UI.segmented(
            [
              { value: "individual", label: "One class score" },
              { value: "teams", label: "Teams compete" }
            ],
            st.mode,
            function(v) {
              st.mode = v;
              if (v === "teams" && st.teams.length < 2) {
                st.teams = SF.makeGame().settings.teams.slice(0, 2);
              }
              touched();
              draw2();
              drawPreview();
            }
          ),
          st.mode === "teams" ? "Teams choose cells and you award each one to whoever answered it." : "The room plays one score against the target rather than each other."
        )
      );
      if (st.mode === "teams") {
        body.appendChild(
          UI.field(
            "Team names — one per line",
            UI.area(
              st.teams.map(function(t) {
                return t.name;
              }).join("\n"),
              function(v) {
                var names = v.split("\n").map(function(n) {
                  return n.trim().slice(0, 20);
                }).filter(Boolean).slice(0, 6);
                st.teams = names.length ? names.map(function(name) {
                  return { name };
                }) : [{ name: "Class" }];
                touched();
                drawPreview();
              },
              4
            ),
            "Six at most — six scores is as much as the board carries."
          )
        );
      }
      body.appendChild(
        UI.field(
          "Target score",
          UI.segmented(
            (SF.BOWL_TARGETS || [500, 1e3, 1500, 2e3]).map(function(n) {
              return { value: String(n), label: String(n) };
            }),
            String(game.questions[0].targetScore || 1e3),
            function(v) {
              game.questions.forEach(function(cell) {
                cell.targetScore = Number(v);
              });
              touched();
              draw2();
              drawPreview();
              drawRail();
            }
          ),
          bowlNote(game, SF)
        )
      );
      body.appendChild(
        el(
          "p",
          "hint",
          "Cells are worth what they say and are spent whether or not anyone answers them, which is what makes reaching for the five hundred a decision. The board ends when it empties or someone reaches the target; ties are named. Awards are recorded in the session report as a spoken round, credited to the team."
        )
      );
      return;
    }
    return {
      focusPrimary: ".bowl-team button:not(:disabled)",
      focusFallback: ".bowl-actions button:not(:disabled), .bowl-cell:not(:disabled)",
      key: "bowl",
      runtime: "Bowl",
      field: "bowlBoard",
      states: "bowlStates",
      state: "bowlState",
      command: "bowlCommand",
      className: "bowl-board-slide",
      setSize: Infinity,
      showsQuestion: true,
      compile,
      decorateIntro,
      authorQuestion,
      authorInspector,
      authorSettings
    };
  }

  // src/games/bowl.js
  var BOWL_VALUES = [100, 200, 300, 400, 500];
  var BOWL_TARGETS = [500, 1e3, 1500, 2e3];
  function bowlGrid(questions) {
    var categories = [], values = [], byKey = {};
    (questions || []).forEach(function(q) {
      var name = String(q.category || "").trim();
      var value = BOWL_VALUES.indexOf(Number(q.pointValue)) > -1 ? Number(q.pointValue) : 200;
      if (!name || !String(q.question || "").trim()) return;
      if (categories.indexOf(name) === -1) categories.push(name);
      if (values.indexOf(value) === -1) values.push(value);
      var key = name + "\0" + value;
      (byKey[key] || (byKey[key] = [])).push({
        id: q.id,
        question: q.question,
        answer: String(q.answer || "").trim(),
        value
      });
    });
    values.sort(function(a, b) {
      return a - b;
    });
    var cells = [];
    values.forEach(function(value, row) {
      categories.forEach(function(name, col) {
        cells.push({
          category: name,
          value,
          row,
          col,
          questions: (byKey[name + "\0" + value] || []).slice()
        });
      });
    });
    return { categories, values, cells };
  }
  var board4 = createBowlBoard({ bowlGrid });
  var bowl = {
    boardEngine: board4,
    defaults: {
      "defaultTime": 0,
      "confidence": false
    },
    key: "bowl",
    label: "Quiz bowl",
    icon: "▦",
    blurb: "A category and value board. Pick an unused cell, answer aloud, and the teacher awards the cell value.",
    mechanic: "bowl",
    input: "choice",
    minOptions: 0,
    maxOptions: 0,
    fixedOptions: null,
    make: function() {
      return {
        question: "What molecule carries genetic information?",
        category: "Cells",
        pointValue: 200,
        targetScore: 1e3,
        answer: "DNA"
      };
    },
    normalize: function(q) {
      q.category = String(q.category == null ? "" : q.category).slice(0, 40);
      q.answer = String(q.answer == null ? "" : q.answer).slice(0, 120);
      var v = Number(q.pointValue);
      q.pointValue = BOWL_VALUES.indexOf(v) > -1 ? v : 200;
      var t = Number(q.targetScore);
      q.targetScore = BOWL_TARGETS.indexOf(t) > -1 ? t : 1e3;
      if (!String(q.question || "").trim()) q.question = "Bowl question";
      delete q.options;
      delete q.correct;
      return q;
    },
    problems: function(q, n) {
      if (!String(q.question || "").trim()) return "Q" + n + " has no question text";
      if (!String(q.category || "").trim()) return "Q" + n + " needs a category";
      if (!String(q.answer || "").trim()) return "Q" + n + " needs an answer for the host";
      return null;
    },
    board: function(game) {
      var grid = bowlGrid(game.questions);
      if (!grid.categories.length) return "no question has a category to sit under";
      if (grid.categories.length > 6) {
        return grid.categories.length + " categories is wider than a board reads — six columns is the most a projector holds";
      }
      return null;
    },
    /* Never reached when running: compileGame emits one board for the game.
       Kept so a bowl question rendered as a slide anywhere still says what it
       is rather than throwing. */
    compile: function(q, st, s) {
      s.question = q.question;
      s.category = q.category.trim();
      s.pointValue = q.pointValue;
      s.answer = q.answer.trim();
      s.options = [];
      s.correct = -1;
      s.points = q.pointValue;
      s.judgeKind = "bowl";
    },
    mark: function() {
      return false;
    },
    // cells are awarded, not answered
    summary: function(q) {
      return (q.category || "Category") + " · " + (q.pointValue || 200);
    }
  };

  // src/games/registry.js
  function markResponse(slide, response) {
    var style = gameStyle(slide.style);
    if (typeof style.mark === "function") return !!style.mark(slide, response);
    return false;
  }
  function answerLabel(slide, response) {
    var style = gameStyle(slide.style);
    if (typeof style.describe === "function") return style.describe(slide, response);
    return String(response == null ? "" : response);
  }
  function gameStyle(key) {
    return GAME_STYLES[key] || GAME_STYLES.choice;
  }
  var GAME_STYLES = { choice, truefalse, race, speed, boss, slider, type, order, emoji, definition, compare, oddone, wordreveal, memoryflip, memorymatch, knowledgeflip, headsup, spinexplain, connection, conceptchain, randomchallenge, bingo, lowstakes, bowl };

  // src/deck/markdown.js
  function renderMarkdown(deck, lookupGame = (
    /** @type {(id: string) => any} */
    ((_id) => null)
  )) {
    var letters = ["A", "B", "C", "D", "E", "F"];
    var out = [];
    function line(s) {
      out.push(s == null ? "" : String(s));
    }
    function blank() {
      if (out.length && out[out.length - 1] !== "") line("");
    }
    line("# " + (deck.title || "Untitled lesson"));
    line("");
    line("_Practice notes from SlideForge. Live polls, games and scoring stay in the classroom room._");
    line("");
    (deck.slides || []).forEach(function(s, idx) {
      var n = idx + 1;
      blank();
      if (s.type === "game") {
        var g = s.gameId ? lookupGame(s.gameId) : null;
        line("## " + n + ". Knowledge check" + (g || s.gameTitle ? ": " + (g ? g.title : s.gameTitle) : ""));
        line("");
        if (!g) {
          line("*Game not found in this browser — open the lesson in SlideForge to review the questions.*");
          return;
        }
        line("*" + (GAME_STYLES[g.style] ? GAME_STYLES[g.style].label : g.style) + "*");
        line("");
        (g.questions || []).forEach(function(q, qi) {
          line("### Q" + (qi + 1) + ". " + (q.question || "Question"));
          line("");
          if (g.style === "truefalse") {
            line("- True");
            line("- False");
          } else if (Array.isArray(q.options) && q.options.length) {
            q.options.forEach(function(opt, oi) {
              var mark = q.correct === oi ? " *(answer)*" : "";
              line("- " + (letters[oi] || String(oi + 1)) + ". " + opt + mark);
            });
          } else if (q.answer) {
            line("Answer key: `" + q.answer + "`");
          }
          if (q.explanation) {
            line("");
            line("> " + String(q.explanation).replace(/\n+/g, " "));
          }
          line("");
        });
        return;
      }
      if (s.type === "title") {
        line("## " + n + ". " + (s.title || "Title").replace(/\n/g, " "));
        if (s.subtitle) {
          line("");
          line(s.subtitle);
        }
      } else if (s.type === "section") {
        line("## " + n + ". " + (s.title || "Section").replace(/\n/g, " "));
        if (s.subtitle) {
          line("");
          line(s.subtitle);
        }
      } else if (s.type === "quote") {
        line("## " + n + ". Quote");
        line("");
        line("> " + String(s.body || "").replace(/\n/g, " "));
        if (s.subtitle) {
          line("");
          line("— " + s.subtitle);
        }
      } else if (s.type === "image") {
        line("## " + n + ". " + (s.title || "Image").replace(/\n/g, " "));
        line("");
        line(s.image && String(s.image).indexOf("data:") === 0 ? "*Embedded image (open in SlideForge to view).*" : s.image ? "![](" + s.image + ")" : "*No image set.*");
      } else if (s.type === "cards") {
        line("## " + n + ". " + (s.title || "Cards").replace(/\n/g, " "));
        line("");
        (s.bullets || []).filter(function(b) {
          return String(b).trim();
        }).forEach(function(b, i) {
          line(i + 1 + ". " + String(b).replace(/^(\s{2,}|\t|- )+/, "").trim());
        });
      } else if (s.type === "keywords") {
        line("## " + n + ". " + (s.title || "Keywords").replace(/\n/g, " "));
        line("");
        (s.bullets || []).map(parseKeywordLine).filter(function(p) {
          return p.term || p.def;
        }).forEach(function(p) {
          line("- **" + p.term + "** — " + (p.def || ""));
        });
      } else if (s.type === "italics") {
        line("## " + n + ". " + (s.title || "Italics").replace(/\n/g, " "));
        line("");
        (s.bullets || []).map(parseKeywordLine).filter(function(p) {
          return p.term || p.def;
        }).forEach(function(p) {
          line("- *" + p.term + "* — " + (p.def || ""));
        });
      } else if (s.type === "links") {
        line("## " + n + ". " + (s.title || "Links").replace(/\n/g, " "));
        line("");
        (s.bullets || []).map(parseKeywordLine).filter(function(p) {
          return p.term || p.def;
        }).forEach(function(p) {
          var href = safeHref(p.def);
          if (href) line("- [" + (p.term || href) + "](" + href + ")");
          else line("- " + (p.term || "Link") + (p.def ? " — " + p.def : ""));
        });
      } else if (s.type === "split") {
        line("## " + n + ". " + (s.title || "Dual coding").replace(/\n/g, " "));
        line("");
        (s.bullets || []).filter(function(b) {
          return String(b).trim();
        }).forEach(function(b) {
          var tier = /^(\s{2,}|\t|- )/.test(b);
          var text = String(b).replace(/^(\s{2,}|\t|- )+/, "").trim();
          line((tier ? "  - " : "- ") + text);
        });
        line("");
        line(s.image && String(s.image).indexOf("data:") === 0 ? "*Accompanying image (open in SlideForge to view).*" : s.image ? "![](" + s.image + ")" : "*Add an accompanying image for dual coding.*");
      } else {
        line("## " + n + ". " + (s.title || "Slide").replace(/\n/g, " "));
        line("");
        (s.bullets || []).filter(function(b) {
          return String(b).trim();
        }).forEach(function(b) {
          var tier = /^(\s{2,}|\t|- )/.test(b);
          var text = String(b).replace(/^(\s{2,}|\t|- )+/, "").trim();
          line((tier ? "  - " : "- ") + text);
        });
      }
      var fb = slideFeedback(s);
      if (fb) {
        blank();
        line("### In-class activity · " + (FEEDBACK_KINDS[fb.kind] ? FEEDBACK_KINDS[fb.kind].label : fb.kind));
        line("");
        line("**Prompt:** " + (fb.prompt || ""));
        if (fb.kind === "poll" && fb.options && fb.options.length) {
          line("");
          fb.options.forEach(function(o) {
            line("- [ ] " + o);
          });
        } else {
          line("");
          line("*Respond in the live room (or jot a note here for practice).*");
        }
      }
      if (s.notes) {
        blank();
        line("<details><summary>Speaker notes</summary>");
        line("");
        line(s.notes);
        line("");
        line("</details>");
      }
    });
    blank();
    line("---");
    line("");
    line("_Exported for Canvas / Colab practice. Re-open the `.sfdeck.json` in SlideForge to host live._");
    return out.join("\n");
  }

  // src/samples/deck.json
  var deck_default = {
    title: "Sample deck & quiz",
    slides: [
      {
        type: "title",
        title: "SlideForge",
        subtitle: "Presentations and quizzes, straight from the browser",
        notes: "Press the right arrow or space to advance. Press ? during the show for all shortcuts."
      },
      {
        type: "content",
        title: "What this does",
        bullets: [
          "Build slides in the editor on the left",
          "Present full screen in 16:9, like a PowerPoint show",
          "Drop quiz slides anywhere in the deck",
          "Score the room live, or click through answers yourself"
        ]
      },
      {
        type: "section",
        title: "Quiz time",
        subtitle: "Three questions"
      },
      {
        type: "quiz",
        question: "What aspect ratio is a modern widescreen slide?",
        options: [
          "4:3",
          "16:9",
          "1:1",
          "21:9"
        ],
        correct: 1,
        timeLimit: 20
      },
      {
        type: "quiz",
        question: "Which key blanks the screen mid-presentation?",
        options: [
          "B",
          "Q",
          "X",
          "M"
        ],
        correct: 0,
        timeLimit: 15
      },
      {
        type: "results",
        title: "How did you do?"
      }
    ]
  };

  // src/samples/quiz.json
  var quiz_default = [
    {
      question: "What aspect ratio is a modern widescreen slide?",
      options: [
        "4:3",
        "16:9",
        "1:1",
        "21:9"
      ],
      correct: 1,
      timeLimit: 20,
      points: null,
      image: "",
      notes: ""
    },
    {
      question: "Which key blanks the screen mid-presentation?",
      options: [
        "B",
        "Q",
        "X",
        "M"
      ],
      correct: 0,
      timeLimit: 15,
      points: null,
      image: "",
      notes: ""
    },
    {
      question: "How many teams can a SlideForge game have?",
      options: [
        "Two",
        "Four",
        "Six",
        "Unlimited"
      ],
      correct: 2,
      timeLimit: 15,
      points: null,
      image: "",
      notes: ""
    }
  ];

  // src/games/factories.js
  function makeQuestion(style) {
    var base = {
      id: uid(),
      timeLimit: null,
      // null = inherit the game default
      points: null,
      // null = inherit the game default
      image: "",
      imageAlt: "",
      // described to the phones and any screen reader
      /* 'band'    question above, image below it, answers under
         'first'   image first, question in its own box beneath it
         'overlay' image leads, question sits on it behind a gradient */
      imageLayout: "band",
      notes: "",
      /* What kind of thinking this question asks for. Per question, not per
         game: a quiz that checks recall and then application is exactly the
         shape the Adapt report can say something useful about, and it cannot
         if every question in the game shares one level. */
      bloom: "",
      /* Collect the vote and never show the answer.
         For peer instruction: the room commits, the split goes up, nobody is
         told who was right, they argue, and the *second* question of the pair
         is the one that resolves. Without this the app reveals as soon as
         everyone has answered and there is nothing left to discuss. */
      voteOnly: false,
      /* Shown after the answer is revealed. A multiple-choice answer is often
         one or two words, which teaches very little on its own. */
      explanation: "",
      source: ""
      // optional "where to read more"
    };
    return Object.assign(base, gameStyle(style).make());
  }
  function makeGame(title, style) {
    style = style && GAME_STYLES[style] ? style : "choice";
    var g = {
      id: uid(),
      kind: "game",
      style,
      title: title || "Untitled game",
      theme: "studio",
      created: Date.now(),
      modified: Date.now(),
      settings: {
        mode: "individual",
        teams: [{ name: "Red" }, { name: "Blue" }, { name: "Green" }, { name: "Yellow" }],
        scoreboard: true,
        defaultTime: 20,
        defaultPoints: 1e3,
        intro: true,
        // opening "get ready" slide
        /* The rules of the format, on the wall. The old app kept these in a
           sidebar the room never saw, so a class met a new game by being
           talked through it while the teacher read from their own screen. */
        howTo: true,
        // "how to play" slide before the first question
        scoreSlide: true,
        // closing score slide
        /* 'inline'  expand it inside the correct answer's box on reveal
           'slide'   a dedicated full-screen slide after the question
           'both'    inline first, then the slide for the detail */
        explainStyle: "inline",
        /* Horse race only: steps to the finish line. */
        trackLength: 5,
        /* Ask each player how sure they were, after their answer is in. Never
           scored — it tells the teacher which wrong answers were confident. */
        confidence: true,
        /* A bed under the thinking time. Referenced, not embedded, for the
           same reason as video — and it plays on the projector only. Sending
           it to the phones would be twenty speakers a beat apart. */
        music: "",
        musicVolume: 55
      },
      questions: [makeQuestion(style)]
    };
    const engine = gameStyle(style);
    Object.assign(g.settings, engine.defaults || {});
    if (engine.starters) {
      g.questions = JSON.parse(JSON.stringify(engine.starters)).map(
        (row) => Object.assign(makeQuestion(style), row)
      );
    }
    return g;
  }
  function starterGame() {
    var g = makeGame("Sample quiz");
    g.settings.mode = "teams";
    g.settings.teams = [{ name: "Red" }, { name: "Blue" }];
    g.questions = JSON.parse(JSON.stringify(quiz_default)).map(
      (question) => Object.assign({ id: uid() }, question)
    );
    return g;
  }

  // src/games/catalogue.js
  var FORMATS = {
    "predict-outcome": {
      label: "Predict the outcome",
      answersLabel: "Possible outcomes — mark the likely one",
      answersHint: "Three futures reads better than four. The value is in committing before you know."
    },
    "spot-the-error": {
      label: "Spot the error",
      answersLabel: "Candidate phrases — mark the wrong one",
      answersHint: 'Quote the phrases from the sentence in the question, and include a "nothing is wrong" option so agreeing is a choice too.'
    },
    "odd-one-out": {
      label: "Odd one out",
      answersLabel: "The four items — mark the prepared odd one",
      answersHint: "Four equal tiles for discussion. The marked odd one and explanation are for the reveal — accept other defensible rules."
    },
    "low-stakes-quiz": {
      label: "Low-stakes quiz",
      answersHint: "Questions stay on the board; answers stay hidden until the quiz clock ends. Learners write on paper — no phone scoring."
    },
    "beat-the-clock": {
      label: "Beat the clock",
      answersHint: "Short countdown. Correct answers score 10 plus remaining seconds ÷ 10; wrong answers cost 5."
    },
    "true-false": {
      label: "True / false showdown",
      answersHint: "Fast retrieval. Use a short countdown — 10 to 30 seconds — not a Beat the Clock round."
    },
    "truefalse": {
      label: "True or false",
      answersHint: "A statement and two pads. Mark whether it is true or false."
    },
    "horse-race": { label: "Horse race" },
    "boss-battle": {
      label: "Boss battle",
      answersHint: "Set difficulty on each question — that is the damage a hit deals to the shared boss."
    },
    "definition-challenge": {
      label: "Definition challenge",
      answersHint: "Passage for reading, then a recall question. Accepted spellings mark the typed answer."
    },
    "emoji-guess": {
      label: "Emoji guess",
      answersHint: "The symbols go in the question. Accept the spellings a learner will actually type."
    },
    "fill-in-the-blanks": {
      label: "Fill in the blanks",
      answersHint: "Write the sentence with ______ where the word goes."
    },
    "time-traveler": {
      label: "Time traveler",
      answersHint: "A clue and a date in the question; the event is the answer."
    },
    "ranking": {
      label: "Ranking challenge",
      answersHint: "Part marks: each item in the right place scores. Full set is 10 points."
    },
    "word-reveal": {
      label: "Word reveal",
      answersHint: "Letters drip onto the wall. Guessing with fewer letters shown scores more."
    },
    "memory-flip": {
      label: "Memory flip",
      answersHint: "Study the pairs, then claim. Host marks each claim for +1."
    },
    "memory-match": {
      label: "Memory match",
      answersHint: "Same pairs as Memory Flip; claims rotate between teams."
    },
    "knowledge-flip": {
      label: "Knowledge flip",
      answersHint: "Keywords stay visible. Explain, then claim for +1."
    },
    "heads-up": {
      label: "Heads up",
      answersHint: "Describe the term without saying it. Host marks Correct (+1) or Pass."
    },
    "spin-explain": {
      label: "Spin & explain",
      answersHint: "Clear explanation +2, with a hint +1, reject 0."
    },
    "connection-maker": {
      label: "Connection maker",
      answersHint: "Two ideas and a spoken bridge. Host Accepts for +1."
    },
    "concept-chain": {
      label: "Concept chain",
      answersHint: "Grow a justified chain from each start term. Type the spoken link, then Accept (+1) — the chain grows on the wall."
    },
    "quiz-bowl": {
      label: "Quiz bowl",
      answersHint: "Category and point value on each cell. Correct scores that value."
    },
    "bingo": {
      label: "Bingo",
      answersHint: "Fill the term bank. A complete line wins — no points."
    },
    "random-challenge": {
      label: "Random challenge",
      answersHint: "Draw varied open challenges. Count attempts — no competitive scoreboard."
    },
    "compare-contrast": {
      label: "Compare & contrast",
      answersHint: "Two equal items for discussion. Similarities and differences are for the reveal — no score."
    },
    "question-cube": {
      label: "Question cube",
      answersHint: "Roll a prompt; open class discussion. No score."
    }
  };
  function gameFormat(key) {
    return FORMATS[key] || null;
  }
  var FORMAT_STYLE = {
    "choice": "choice",
    "truefalse": "truefalse",
    "type": "type",
    "slider": "slider",
    "true-false": "truefalse",
    "low-stakes-quiz": "lowstakes",
    "quiz-bowl": "bowl",
    "beat-the-clock": "speed",
    "boss-battle": "boss",
    "horse-race": "race",
    "memory-flip": "memoryflip",
    "memory-match": "memorymatch",
    "knowledge-flip": "knowledgeflip",
    "definition-challenge": "definition",
    "emoji-guess": "emoji",
    "word-reveal": "wordreveal",
    "fill-in-the-blanks": "type",
    "heads-up": "headsup",
    "spin-explain": "spinexplain",
    "spot-the-error": "choice",
    "ranking": "order",
    "odd-one-out": "oddone",
    "predict-outcome": "choice",
    "time-traveler": "type",
    "connection-maker": "connection",
    "random-challenge": "randomchallenge",
    "concept-chain": "conceptchain",
    "bingo": "bingo",
    "compare-contrast": "compare",
    "question-cube": "choice"
  };
  var CORE_STYLES = ["choice", "type", "slider", "order"];
  var SPECIAL_STYLES = [
    "truefalse",
    "race",
    "speed",
    "boss",
    "wordreveal",
    "memoryflip",
    "memorymatch",
    "knowledgeflip",
    "headsup",
    "spinexplain",
    "connection",
    "conceptchain",
    "randomchallenge",
    "bingo",
    "bowl",
    "lowstakes",
    "emoji",
    "definition",
    "oddone",
    "compare"
  ];
  function formatStyle(formatKey) {
    var s = FORMAT_STYLE[formatKey];
    return s && GAME_STYLES[s] ? s : null;
  }
  function isSpecialStyle(styleKey) {
    return SPECIAL_STYLES.indexOf(styleKey) > -1;
  }
  var INPUTS = ["choice", "text", "number", "order"];

  // src/storage.js
  function createStores({ normalizeDeck: normalizeDeck2, normalizeGame: normalizeGame2, normalizePlan: normalizePlan2, storage, warn = console.warn }) {
    function documents(kind, key, lastKey, normalize) {
      function read() {
        try {
          const raw = JSON.parse(storage().getItem(key) || "[]");
          return Array.isArray(raw) ? raw.map(normalize).filter(Boolean) : [];
        } catch (error) {
          warn("Could not read saved " + kind + ":", error);
          return [];
        }
      }
      function write(items) {
        try {
          storage().setItem(key, JSON.stringify(items));
          return true;
        } catch (error) {
          warn("Could not save " + kind + ":", error);
          return false;
        }
      }
      return {
        list() {
          return read().sort((a, b) => b.modified - a.modified);
        },
        save(document) {
          document.modified = Date.now();
          const all = read();
          const index = all.findIndex((item) => item.id === document.id);
          if (index === -1) all.push(document);
          else all[index] = document;
          const ok = write(all);
          try {
            storage().setItem(lastKey, document.id);
          } catch (error) {
          }
          return ok;
        },
        remove(id) {
          write(read().filter((item) => item.id !== id));
        },
        clear() {
          write([]);
        },
        get(id) {
          return read().find((item) => item.id === id) || null;
        },
        lastId() {
          try {
            return storage().getItem(lastKey);
          } catch (error) {
            return null;
          }
        },
        read
      };
    }
    const decks = documents("decks", "slideforge.decks.v1", "slideforge.lastDeckId", normalizeDeck2);
    const plans = documents("plans", "slideforge.plans.v1", "slideforge.lastPlanId", normalizePlan2);
    const games = documents("games", "slideforge.games.v1", "slideforge.lastGameId", normalizeGame2);
    const { read: readDecks, ...Store2 } = decks;
    const { read: readGames, ...GameStoreBase } = games;
    const GameStore2 = Object.assign(GameStoreBase, {
      usedBy: (id) => readDecks().filter(
        (deck) => deck.slides.some((slide) => slide.type === "game" && slide.gameId === id)
      ).map((deck) => deck.title)
    });
    const { read: readPlans, ...PlanStore2 } = plans;
    return { Store: Store2, GameStore: GameStore2, PlanStore: PlanStore2 };
  }

  // src/games/scoring.js
  function claimPoints(accepted) {
    return accepted ? 1 : 0;
  }

  // src/model.js
  var runtime = window;
  var SLIDE_W = 1280;
  var SLIDE_H = 720;
  var THEMES = {
    studio: { name: "Studio · Sage & ink", swatch: "#dce8cc" },
    midnight: { name: "Midnight", swatch: "#1b2a4a" },
    paper: { name: "Paper", swatch: "#f4f1ea" },
    ocean: { name: "Ocean", swatch: "#0d5c63" },
    ember: { name: "Ember", swatch: "#3d1b2a" },
    mono: { name: "Mono", swatch: "#111111" }
  };
  var TRANSITIONS = ["none", "fade", "push", "zoom", "wipe"];
  var TEAM_COLORS = ["#e8474f", "#2b7ce9", "#e8a020", "#29a86b", "#8b5cf0", "#d4477f"];
  var MAX_TEAMS = 6;
  function teamColor(i) {
    return TEAM_COLORS[i % TEAM_COLORS.length];
  }
  function makeQuizConfig() {
    var config = {
      mode: "individual",
      // 'individual' | 'teams'
      teams: [{ name: "Red" }, { name: "Blue" }, { name: "Green" }, { name: "Yellow" }],
      scoreboard: true
      // keep the running score on screen
    };
    return config;
  }
  function normalizeQuizConfig(raw) {
    var q = Object.assign(makeQuizConfig(), raw || {});
    if (q.mode !== "teams") q.mode = "individual";
    q.teams = (Array.isArray(q.teams) ? q.teams : []).map(function(t) {
      return { name: String((typeof t === "string" ? t : t && t.name) || "").trim().slice(0, 20) };
    }).filter(function(t) {
      return t.name;
    }).slice(0, MAX_TEAMS);
    var seen = {};
    q.teams = q.teams.filter(function(t) {
      var k = t.name.toLowerCase();
      if (seen[k]) return false;
      seen[k] = true;
      return true;
    });
    if (q.mode === "teams" && q.teams.length < 2) {
      q.teams = makeQuizConfig().teams.slice(0, 2);
    }
    q.scoreboard = q.scoreboard !== false;
    return q;
  }
  var SLIDE_TYPES = {
    title: { label: "Title", icon: "T" },
    section: { label: "Section", icon: "S" },
    content: { label: "Bullets", icon: "•" },
    keywords: { label: "Keywords", icon: "K" },
    italics: { label: "Phrase + explanation", icon: "I" },
    links: { label: "Links", icon: "↗" },
    split: { label: "Image + text", icon: "◫" },
    cards: { label: "Cards", icon: "▦" },
    table: { label: "Table", icon: "⊞" },
    image: { label: "Image", icon: "▣" },
    video: { label: "Video", icon: "▶" },
    quote: { label: "Quote", icon: "“" },
    game: { label: "Game", icon: "◈" },
    quiz: { label: "Quiz", icon: "?" },
    explain: { label: "Explanation", icon: "💡" },
    results: { label: "Score", icon: "⚑" },
    join: { label: "Join QR & PIN", icon: "⌗" }
  };
  function isSlideType(value) {
    return typeof value === "string" && Object.prototype.hasOwnProperty.call(SLIDE_TYPES, value);
  }
  function makeSlide(type2) {
    var s = {
      id: uid(),
      type: type2 || "content",
      title: "",
      subtitle: "",
      body: "",
      bullets: (
        /** @type {string[]} */
        []
      ),
      notes: "",
      image: "",
      imageFit: "cover",
      imageSide: "right",
      video: "",
      videoPoster: "",
      videoStart: 0,
      // seconds in, for a clip inside a longer file
      videoLoop: false,
      videoMuted: false,
      videoAutoplay: false,
      // honoured on the projector, never in a preview
      tableHeader: true,
      transition: "fade",
      // quiz fields
      question: "",
      options: (
        /** @type {string[]} */
        []
      ),
      correct: 0,
      timeLimit: 0,
      points: 1e3,
      // game embed
      gameId: "",
      gameTitle: "",
      // audience feedback attached to this slide (null = none)
      feedback: null
    };
    switch (s.type) {
      case "title":
        s.title = "Presentation title";
        s.subtitle = "Your name · " + (/* @__PURE__ */ new Date()).toLocaleDateString();
        break;
      case "section":
        s.title = "Section heading";
        break;
      case "cards":
      case "content":
        s.title = "Slide title";
        s.bullets = ["First point", "Second point", "Third point"];
        break;
      case "keywords":
        s.title = "Key vocabulary";
        s.bullets = [
          formatKeywordLine("Keyword", "a short plain-language definition"),
          formatKeywordLine("", ""),
          formatKeywordLine("", "")
        ];
        break;
      case "italics":
        s.title = "Phrases to notice";
        s.bullets = [
          formatKeywordLine("key phrase", "why this wording matters"),
          formatKeywordLine("", ""),
          formatKeywordLine("", "")
        ];
        break;
      case "links":
        s.title = "Further reading";
        s.bullets = [
          formatKeywordLine("Resource title", "https://"),
          formatKeywordLine("", ""),
          formatKeywordLine("", "")
        ];
        break;
      case "split":
        s.title = "Say it. Show it.";
        s.bullets = ["First point", "Second point", "Third point"];
        s.imageSide = "right";
        break;
      case "image":
        s.title = "Image slide";
        break;
      case "quote":
        s.body = "A quotation that makes the point better than a bullet list would.";
        s.subtitle = "Attribution";
        break;
      case "quiz":
        s.question = "Which of these is correct?";
        s.options = ["Option A", "Option B", "Option C", "Option D"];
        s.correct = 0;
        s.timeLimit = 20;
        break;
      case "results":
        s.title = "Results";
        break;
      case "game":
        s.title = "Game";
        s.transition = "zoom";
        break;
    }
    return s;
  }
  function makeDeck(title) {
    var deck = {
      id: uid(),
      title: title || "Untitled deck",
      /* The house theme. This was midnight, so New blank document handed back
         a navy deck inside a sage app — and makeLesson had to override it to
         studio to get the default anyone actually sees. */
      theme: "studio",
      /* Which catalogue format this game was created as.
         The engine is how it plays; the format is what it is for. Without
         this, every preset over `choice` authored as "Multiple choice" and a
         teacher who picked "Predict the Outcome" lost the name, the wording
         and the reason the moment the game existed. Free text rather than an
         enum: a format that is retired should leave old games readable. */
      format: "",
      showSlideNumbers: true,
      /* Close the lesson on the scores. An embedded game puts its own board up
         the moment that game ends — which is mid-lesson, and gone by the time
         anyone leaves. Off by default: a deck that ends on a reflection slide
         should keep ending there unless the teacher asks otherwise. */
      finalScores: false,
      logo: "",
      logoOn: "none",
      // 'none' | 'title' | 'all'
      quiz: makeQuizConfig(),
      created: Date.now(),
      modified: Date.now(),
      slides: (
        /** @type {any[]} */
        []
      )
    };
    deck.slides.push(makeSlide("title"));
    return deck;
  }
  function starterDeck() {
    const deck = makeDeck(deck_default.title);
    deck.slides = deck_default.slides.map(
      (template) => Object.assign(
        makeSlide(isSlideType(template.type) ? template.type : "content"),
        JSON.parse(JSON.stringify(template))
      )
    );
    return deck;
  }
  function normalizeSlide(raw) {
    var base = makeSlide(isSlideType(raw && raw.type) ? raw.type : "content");
    var s = Object.assign(base, raw || {});
    s.id = s.id || uid();
    if (!SLIDE_TYPES[s.type]) s.type = "content";
    if (!Array.isArray(s.bullets)) s.bullets = [];
    var rawOptions = raw && Array.isArray(raw.options) ? raw.options : [];
    s.options = rawOptions.map(function(o) {
      return typeof o === "string" ? o : o && o.text || "";
    });
    s.correct = Math.max(0, Math.min(s.options.length - 1, Number(s.correct) || 0));
    s.timeLimit = Math.max(0, Number(s.timeLimit) || 0);
    s.points = Number(s.points) || 1e3;
    if (TRANSITIONS.indexOf(s.transition) === -1) s.transition = "fade";
    s.gameId = String(s.gameId || "");
    s.gameTitle = String(s.gameTitle || "");
    s.imageSide = s.imageSide === "left" ? "left" : "right";
    s.video = safeMedia(s.video);
    s.videoPoster = safeMedia(s.videoPoster);
    s.videoStart = Math.max(0, Number(s.videoStart) || 0);
    s.videoLoop = s.videoLoop === true;
    s.videoMuted = s.videoMuted === true;
    s.videoAutoplay = s.videoAutoplay === true;
    s.tableHeader = s.tableHeader !== false;
    if (s.imageFit !== "contain") s.imageFit = "cover";
    s.feedback = normalizeFeedback(s.feedback);
    return s;
  }
  function normalizeDeck(raw) {
    if (!raw || typeof raw !== "object") return null;
    var d = Object.assign(makeDeck(), raw);
    d.id = d.id || uid();
    d.title = String(d.title || "Untitled deck");
    if (!THEMES[d.theme]) d.theme = "studio";
    d.quiz = normalizeQuizConfig(raw.quiz);
    d.slides = (Array.isArray(raw.slides) ? raw.slides : []).map(normalizeSlide);
    if (!d.slides.length) d.slides = [makeSlide("title")];
    d.showSlideNumbers = d.showSlideNumbers !== false;
    d.finalScores = d.finalScores === true;
    d.logo = String(d.logo || "");
    d.logoSize = ["small", "medium", "large"].includes(raw.logoSize) ? raw.logoSize : "medium";
    if (d.logoOn !== "all" && d.logoOn !== "title" && d.logoOn !== "none") {
      d.logoOn = d.logo ? "all" : "none";
    }
    if (!d.logo) d.logoOn = "none";
    return d;
  }
  function deckShowsLogo(deck, slide, index) {
    if (!deck || !String(deck.logo || "").trim()) return false;
    if (deck.logoOn === "all") return true;
    if (deck.logoOn !== "title") return false;
    if (typeof index === "number") return index === 0;
    return !!(slide && (slide.type === "title" || slide.type === "section"));
  }
  function normalizeQuestion(raw, style) {
    var q = Object.assign(makeQuestion(style), raw || {});
    q.id = q.id || uid();
    q.question = String(q.question || "");
    gameStyle(style).normalize(q);
    var rawTime = raw ? raw.timeLimit : null;
    var rawPoints = raw ? raw.points : null;
    q.timeLimit = rawTime == null || rawTime === "" ? null : Math.max(0, Number(rawTime) || 0);
    q.points = rawPoints == null || rawPoints === "" ? null : Math.max(0, Number(rawPoints) || 0);
    q.bloom = "";
    q.voteOnly = q.voteOnly === true;
    q.explanation = String(q.explanation || "");
    q.source = String(q.source || "");
    q.image = String(q.image || "");
    q.imageAlt = String(q.imageAlt || "");
    if (["band", "first", "overlay"].indexOf(q.imageLayout) === -1) q.imageLayout = "band";
    return q;
  }
  function normalizeGameSettings(raw) {
    var base = makeGame().settings;
    var g = Object.assign(base, raw || {});
    var q = normalizeQuizConfig({ mode: g.mode, teams: g.teams, scoreboard: g.scoreboard });
    g.mode = q.mode;
    g.teams = q.teams;
    g.scoreboard = q.scoreboard;
    g.defaultTime = Math.max(0, Number(g.defaultTime) || 0);
    g.defaultPoints = Math.max(0, Number(g.defaultPoints) || 1e3);
    g.intro = g.intro !== false;
    g.scoreSlide = g.scoreSlide !== false;
    if (["inline", "slide", "both"].indexOf(g.explainStyle) === -1) g.explainStyle = "inline";
    g.trackLength = Math.max(3, Math.min(12, Number(g.trackLength) || 5));
    g.music = safeMedia(g.music);
    g.musicVolume = Math.max(0, Math.min(
      100,
      g.musicVolume == null ? 55 : Number(g.musicVolume) || 0
    ));
    g.confidence = g.confidence !== false;
    return g;
  }
  function normalizeGame(raw) {
    if (!raw || typeof raw !== "object") return null;
    var rawStyle = GAME_STYLES[raw.style] ? raw.style : "choice";
    var format = String(raw.format || "").slice(0, 40);
    var mapped = formatStyle(format);
    var style = mapped || rawStyle;
    var remapped = !!(mapped && mapped !== rawStyle);
    var g = Object.assign(makeGame(void 0, style), raw);
    g.id = g.id || uid();
    g.kind = "game";
    g.style = style;
    g.title = String(g.title || "Untitled game");
    if (!format && isSpecialStyle(style) && FORMATS[style]) format = style;
    g.format = format;
    if (!THEMES[g.theme]) g.theme = "midnight";
    g.settings = normalizeGameSettings(raw.settings);
    g.questions = (Array.isArray(raw.questions) ? raw.questions : []).map(function(q) {
      if (!remapped) return normalizeQuestion(q, style);
      var fresh = makeQuestion(style);
      [
        "question",
        "answer",
        "explanation",
        "image",
        "imageAlt",
        "imageLayout",
        "notes",
        "bloom",
        "source",
        "timeLimit",
        "points",
        "voteOnly",
        "passage",
        "accept",
        "allowTypos",
        "itemA",
        "itemB",
        "similarities",
        "differences",
        "category",
        "term",
        "prompt",
        "definition"
      ].forEach(function(k) {
        if (q && q[k] != null && q[k] !== "") fresh[k] = q[k];
      });
      if (q && q.id) fresh.id = q.id;
      if (q && Array.isArray(q.options) && q.options.length) {
        var head = String(q.options[0] || "");
        if (head !== "Claimed" && head !== "Accept" && head !== "Complete" && head !== "Clear") {
          fresh.options = q.options.slice();
          if (q.correct != null) fresh.correct = q.correct;
        }
      }
      if (style === "lowstakes" && !(q && String(q.answer || "").trim()) && q && String(q.explanation || "").trim()) {
        fresh.answer = q.explanation;
      }
      if (style === "compare" && !(String(fresh.itemA || "").trim() && String(fresh.itemB || "").trim()) && q && Array.isArray(q.options) && q.options.length >= 2) {
        fresh.itemA = String(q.options[0] || "").trim();
        fresh.itemB = String(q.options[1] || "").trim();
      }
      if (style === "compare" && !String(fresh.similarities || "").trim() && q && String(q.explanation || "").trim()) {
        fresh.similarities = q.explanation;
      }
      return normalizeQuestion(fresh, style);
    });
    if (!g.questions.length) g.questions = [makeQuestion(style)];
    return g;
  }
  function fillQuestionSlide(q, styleKey, settings, s) {
    var style = gameStyle(styleKey);
    style.compile(q, settings, s);
    s.style = styleKey;
    s.input = INPUTS.indexOf(style.input) > -1 ? style.input : "choice";
    if ((styleKey === "memoryflip" || styleKey === "memorymatch") && s.hideAfterStudy) {
      s.timeLimit = Number(s.studySeconds) || 0;
    } else if (styleKey === "definition") {
      s.timeLimit = clampDefinitionSeconds(
        q.timeLimit == null ? settings.defaultTime : q.timeLimit
      );
    } else if (styleKey === "oddone" || styleKey === "compare") {
      s.timeLimit = 0;
    } else if (styleKey === "conceptchain") {
      s.timeLimit = clampChainSeconds(
        q.timeLimit == null ? settings.defaultTime : q.timeLimit
      );
    } else {
      s.timeLimit = q.timeLimit == null ? settings.defaultTime : q.timeLimit;
    }
    s.points = q.points == null ? settings.defaultPoints : q.points;
    if (style.mechanic === "boss" || q.difficulty) {
      s.difficulty = BOSS_LEVELS.indexOf(q.difficulty) > -1 ? q.difficulty : "medium";
      s.bossDamage = bossDamage(s.difficulty);
    }
    QUESTION_SLIDE_FIELDS.forEach(function(k) {
      if (q[k] != null && q[k] !== "") s[k] = q[k];
    });
    s.explainStyle = settings.explainStyle;
    s.confidence = settings.confidence !== false;
    if (styleKey === "oddone") {
      s.points = 0;
      s.timeLimit = 0;
      s.voteOnly = true;
      s.confidence = false;
      s.hideAnswerUntilReveal = true;
      s.oddoneDiscuss = true;
    }
    if (styleKey === "compare") {
      s.points = 0;
      s.timeLimit = 0;
      s.voteOnly = true;
      s.confidence = false;
      s.hideAnswerUntilReveal = true;
      s.compareDiscuss = true;
      s.itemA = String(q.itemA || "").trim();
      s.itemB = String(q.itemB || "").trim();
      s.similarities = String(q.similarities || "").trim();
      s.differences = String(q.differences || "").trim();
      s.category = String(q.category || "").trim();
      s.options = [];
      s.correct = -1;
    }
    if (styleKey === "conceptchain") {
      s.conceptChain = true;
      s.term = String(q.term || "").trim();
      s.prompt = String(q.prompt || "").trim();
      s.confidence = false;
      s.options = ["Accept", "Reject"];
      s.correct = 0;
      s.judgeKind = "accept";
    }
    return s;
  }
  var QUESTION_SLIDE_FIELDS = [
    "image",
    "imageAlt",
    "imageLayout",
    "explanation",
    "source",
    "notes",
    "bloom",
    "voteOnly"
  ];
  function compileGame(game, opts = {}) {
    opts = opts || {};
    var st = game.settings;
    var engine = gameStyle(game.style);
    var out = [];
    if (opts.intro !== false && st.intro) {
      var intro = makeSlide("section");
      intro.title = game.title;
      intro.subtitle = game.questions.length + (game.questions.length === 1 ? " question" : " questions") + (st.mode === "teams" ? " · " + st.teams.length + " teams" : "");
      intro.transition = "zoom";
      intro.notes = "Game intro. The next " + game.questions.length + " slides are its questions.";
      if (engine.boardEngine) engine.boardEngine.decorateIntro(intro, game);
      intro.gameId = game.id;
      out.push(intro);
    }
    if (st.howTo !== false && runtime.SF && runtime.SF.Playbook) {
      var book = runtime.SF.Playbook.forGame(game);
      var steps = book && book.howToPlay ? book.howToPlay.slice(0, 6) : [];
      if (book && steps.length) {
        var rules = makeSlide("content");
        rules.id = game.id + ":howto";
        rules.gameId = game.id;
        rules.gameTitle = game.title;
        rules.title = "How to play — " + (book.title || game.title);
        rules.bullets = steps;
        rules.transition = "fade";
        rules.notes = [book.aim, runtime.SF.Playbook.engineSummary(book)].filter(Boolean).join("\n\n");
        out.push(rules);
      }
    }
    if (engine.boardEngine) return out.concat(engine.boardEngine.compile(game, { makeSlide }));
    var playQuestions = game.questions.slice();
    if (game.style === "spinexplain") {
      for (var draw = playQuestions.length - 1; draw > 0; draw--) {
        var pick = Math.floor(Math.random() * (draw + 1));
        var swap = playQuestions[draw];
        playQuestions[draw] = playQuestions[pick];
        playQuestions[pick] = swap;
      }
    }
    playQuestions.forEach(function(q, i) {
      var s = makeSlide("quiz");
      s.id = game.id + ":" + q.id;
      fillQuestionSlide(q, game.style, st, s);
      s.format = game.format || "";
      s.notes = q.notes || "";
      s.transition = "fade";
      s.gameId = game.id;
      s.gameTitle = game.title;
      s.questionNumber = i + 1;
      if (game.style === "spinexplain") {
        s.spinDraw = i + 1;
        s.spinTotal = playQuestions.length;
        s.headPrompt = "Spin & explain";
      }
      out.push(s);
      if (String(q.explanation || "").trim() && (st.explainStyle === "slide" || st.explainStyle === "both")) {
        var why = makeSlide("explain");
        why.id = game.id + ":" + q.id + ":why";
        why.question = q.question;
        why.body = q.explanation;
        why.subtitle = q.source || "";
        why.options = s.options;
        why.correct = s.correct;
        why.input = s.input;
        why.answer = s.answer || "";
        why.questionNumber = i + 1;
        why.gameId = game.id;
        why.gameTitle = game.title;
        why.transition = "fade";
        why.notes = "Explanation for Q" + (i + 1) + ".";
        out.push(why);
      }
    });
    if (opts.scoreSlide !== false && st.scoreSlide) {
      var res = makeSlide("results");
      res.id = game.id + ":scores";
      res.title = game.title + " — scores";
      res.gameId = game.id;
      out.push(res);
    }
    return out;
  }
  function buildRunDeck(deck, lookupGame) {
    const run = (
      /** @type {RunDeck} */
      Object.assign({}, deck)
    );
    run.slides = [];
    run.missingGames = [];
    run.games = [];
    deck.slides.forEach(function(s) {
      if (s.type !== "game") {
        run.slides.push(s);
        return;
      }
      var game = lookupGame(s.gameId);
      if (!game) {
        run.missingGames.push(s.gameTitle || s.gameId);
        var gone = makeSlide("section");
        gone.id = s.id;
        gone.title = "Game not found";
        gone.subtitle = s.gameTitle ? '"' + s.gameTitle + '" has been deleted' : "";
        run.slides.push(gone);
        return;
      }
      run.games.push(game);
      compileGame(game, { theme: deck.theme }).forEach(function(cs) {
        cs.sourceSlideId = s.id;
        cs.bloom = cs.bloom || s.bloom || "";
        run.slides.push(cs);
      });
    });
    if (deck.finalScores && run.games.length) {
      var closing = makeSlide("results");
      closing.id = deck.id + ":final-scores";
      closing.title = "Final scores";
      closing.subtitle = run.games.length === 1 ? run.games[0].title : run.games.length + " games this lesson";
      closing.transition = "zoom";
      closing.notes = "Everything scored in this lesson, added up.";
      run.slides.push(closing);
    }
    run.feedbackSlides = run.slides.filter(slideFeedback).length;
    var lead = run.games[0];
    run.mechanic = lead ? gameStyle(lead.style).mechanic : "points";
    run.trackLength = lead ? lead.settings.trackLength : 5;
    run.music = lead ? lead.settings.music : "";
    run.musicVolume = lead ? lead.settings.musicVolume : 55;
    run.quiz = normalizeQuizConfig(lead ? {
      mode: lead.settings.mode,
      teams: lead.settings.teams,
      scoreboard: lead.settings.scoreboard
    } : { mode: "individual", scoreboard: true });
    if (!run.slides.length) run.slides = [makeSlide("title")];
    return run;
  }
  function externalMedia(url) {
    var u = String(url || "").trim();
    if (!u || /^data:/i.test(u)) return null;
    if (/^https?:\/\//i.test(u)) return "internet";
    return "file";
  }
  function readiness(deck, lookupGame) {
    var items = [];
    var slides = deck && deck.slides || [];
    var seenExternal = {};
    function add(level, index, title, detail) {
      items.push({ level, slide: index, title, detail });
    }
    function media(index, label, url, what) {
      var kind = externalMedia(url);
      if (!kind) return;
      var key = kind + "|" + url;
      if (seenExternal[key]) return;
      seenExternal[key] = 1;
      add(
        "check",
        index,
        label,
        kind === "internet" ? what + " is loaded from the internet, so it will not play offline." : what + " is a file beside the app, not inside the deck. Move the deck without it and nothing plays."
      );
    }
    slides.forEach(function(s, i) {
      var label = "Slide " + (i + 1);
      if (s.type === "game") {
        var g = s.gameId && lookupGame ? lookupGame(s.gameId) : null;
        if (!g) {
          add("stop", i, label, s.gameId ? "The game on this slide has been deleted, so the slide is skipped." : "No game chosen, so the slide is skipped.");
          return;
        }
        if (!g.questions.length) {
          add("stop", i, label, '"' + g.title + '" has no questions.');
        }
        g.questions.forEach(function(q, n) {
          var bad = gameStyle(q.style || g.style).problems(q, n + 1);
          if (bad) add("stop", i, label, '"' + g.title + '" — ' + bad + ".");
          media(i, label, q.image, "A question image");
        });
        var boardCheck = gameStyle(g.style).board;
        var boardBad = boardCheck ? boardCheck(g) : null;
        if (boardBad) add("stop", i, label, '"' + g.title + '" — ' + boardBad + ".");
        media(i, label, g.settings.music, "The music bed");
        return;
      }
      if (s.type === "video") {
        if (!String(s.video || "").trim()) {
          add("stop", i, label, "A video slide with no video on it.");
        } else {
          media(i, label, s.video, "This clip");
          media(i, label, s.videoPoster, "The poster image");
        }
        return;
      }
      if (s.type === "image" || s.type === "split") {
        if (!String(s.image || "").trim()) {
          add("stop", i, label, "An image slide with no image on it.");
        } else {
          media(i, label, s.image, "This image");
          if (!String(s.imageAlt || "").trim()) {
            add("check", i, label, "The image has no description for anyone who cannot see it.");
          }
        }
        if (s.type === "image") return;
      }
      if (s.type === "table" && !parseTable(s.body).length) {
        add("stop", i, label, "A table slide with no rows.");
        return;
      }
      var words = [s.title, s.subtitle, s.body, s.question].concat(s.bullets || []).join(" ").replace(/\t/g, " ").trim();
      if (!words && !String(s.image || "").trim() && !String(s.video || "").trim()) {
        add("check", i, label, "This slide is empty.");
      }
    });
    if (!slides.length) add("stop", null, "The deck", "There are no slides.");
    var stop = items.filter(function(f) {
      return f.level === "stop";
    }).length;
    return { stop, check: items.length - stop, items };
  }
  function gameToRunDeck(game) {
    return {
      id: game.id,
      title: game.title,
      theme: game.theme,
      showSlideNumbers: false,
      quiz: normalizeQuizConfig({
        mode: game.settings.mode,
        teams: game.settings.teams,
        scoreboard: game.settings.scoreboard
      }),
      games: [game],
      missingGames: [],
      mechanic: gameStyle(game.style).mechanic,
      trackLength: game.settings.trackLength,
      music: game.settings.music,
      musicVolume: game.settings.musicVolume,
      slides: compileGame(game)
    };
  }
  function migrateDeckQuizzes(deck, saveGame) {
    var quizzes = deck.slides.filter(function(s) {
      return s.type === "quiz";
    });
    if (!quizzes.length) {
      deck.slides = deck.slides.filter(function(s) {
        return s.type !== "results";
      });
      if (!deck.slides.length) deck.slides = [makeSlide("title")];
      return null;
    }
    var game = makeGame(deck.title + " — quiz");
    game.theme = deck.theme;
    game.settings = normalizeGameSettings({
      mode: deck.quiz ? deck.quiz.mode : "individual",
      teams: deck.quiz ? deck.quiz.teams : null,
      scoreboard: deck.quiz ? deck.quiz.scoreboard : true,
      defaultTime: quizzes[0].timeLimit || 20,
      defaultPoints: quizzes[0].points || 1e3,
      intro: false,
      scoreSlide: deck.slides.some(function(s) {
        return s.type === "results";
      })
    });
    game.questions = quizzes.map(function(s) {
      return normalizeQuestion({
        question: s.question,
        options: s.options,
        correct: s.correct,
        timeLimit: s.timeLimit,
        points: s.points,
        notes: s.notes
      });
    });
    saveGame(game);
    var at = deck.slides.findIndex(function(s) {
      return s.type === "quiz";
    });
    var embed = makeSlide("game");
    embed.gameId = game.id;
    embed.gameTitle = game.title;
    embed.title = game.title;
    deck.slides = deck.slides.filter(function(s) {
      return s.type !== "quiz" && s.type !== "results";
    });
    deck.slides.splice(Math.min(at, deck.slides.length), 0, embed);
    if (!deck.slides.length) deck.slides = [embed];
    return game;
  }
  function deckToMarkdown(deck) {
    return renderMarkdown(normalizeDeck(deck || {}), (id) => GameStore.get(id));
  }
  var { Store, GameStore, PlanStore } = createStores({ normalizeDeck, normalizeGame, normalizePlan, storage: () => localStorage });
  runtime.SF = Object.assign(runtime.SF || {}, {
    Boards: createBoardRuntime(() => runtime.SF, GAME_STYLES),
    /* The activity catalogue. Data only — studio.js reads target and builds. */
    Activities: {
      PHASES,
      ACTIVITIES,
      activity,
      activitiesInPhase,
      phaseCounts,
      totalMinutes,
      makePlan,
      normalizePlan,
      planMinutes,
      planByPhase,
      describePlan
    },
    PlanStore,
    SLIDE_W,
    SLIDE_H,
    THEMES,
    TRANSITIONS,
    TEAM_COLORS,
    MAX_TEAMS,
    teamColor,
    makeQuizConfig,
    normalizeQuizConfig,
    SLIDE_TYPES,
    uid,
    makeSlide,
    makeDeck,
    starterDeck,
    normalizeDeck,
    deckShowsLogo,
    normalizeSlide,
    prepareLayout,
    imagePlacement,
    setImagePlacement,
    swapImagePlacement,
    slideSteps,
    slideExcerpt,
    correctAnswerLabel,
    questionTimeLimit,
    parseTable,
    readiness,
    safeMedia,
    parseKeywordLine,
    formatKeywordLine,
    safeHref,
    deckToMarkdown,
    DECK_TYPES,
    FEEDBACK_KINDS,
    SCALE_POINTS,
    scaleLabels,
    makeFeedback,
    normalizeFeedback,
    slideFeedback,
    // games
    makeGame,
    makeQuestion,
    GAME_STYLES,
    gameStyle,
    markResponse,
    answerLabel,
    markTyped,
    normalizeAnswer,
    formatValue,
    starterGame,
    normalizeGame,
    normalizeQuestion,
    FORMATS,
    FORMAT_STYLE,
    CORE_STYLES,
    SPECIAL_STYLES,
    isSpecialStyle,
    gameFormat,
    formatStyle,
    orderScore,
    orderPoints,
    wordRevealPoints,
    wordRevealPreFraction,
    wordRevealMask,
    emojiHelp,
    emojiCluePieces,
    emojiClueLayout,
    clampDefinitionSeconds,
    clampChainSeconds,
    splitDefinitionPassage,
    definitionCreate,
    definitionTransition,
    DEFINITION_TIMES,
    CHAIN_TIMES,
    EMOJI_LEVELS,
    wordRevealLetterCount,
    spinExplainPoints,
    claimPoints,
    bingoHasLine,
    bowlGrid,
    BOWL_TARGETS,
    bossDamage,
    bossMaxHp,
    speedPoints,
    BOSS_LEVELS,
    WR_LEVELS,
    BOWL_VALUES,
    compileGame,
    INPUTS,
    QUESTION_SLIDE_FIELDS,
    fillQuestionSlide,
    buildRunDeck,
    gameToRunDeck,
    migrateDeckQuizzes,
    Store,
    GameStore
  });
})();
