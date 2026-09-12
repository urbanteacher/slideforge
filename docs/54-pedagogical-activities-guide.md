# The 54 Pedagogical Activities: Plain-English Reference Guide

**Audience:** AI Agents, Developers, and System Prompts  
**Tone:** Plain-English, step-by-step, no assumed pedagogical jargon ("Explain Like I'm a Baby")  
**Purpose:** Ensure any AI model or agent knows exactly how to construct, prompt, structure, and generate slides and classroom mechanics for every single one of the 54 activities across all 11 phases.

---

## Quick Reference: The 4 Runtime Archetypes in SlideForge

Whenever an activity is generated, it maps to one of four runtime engines:

1. **Archetype A (Authored Slides)**: Uses `SF.makeSlide(layout)`. Generates presentation slides (`split`, `cards`, `keywords`, `table`, `content`).
2. **Archetype B (Audience Relay / Feedback)**: Uses `SF.makeFeedback(kind)`. Attaches live audience phone responses (`poll`, `wordcloud`, `brainstorm`, `scale`).
3. **Archetype C (Check / Game Engines)**: Uses `SF.makeGame(style)`. Standalone interactive gamified checks (`choice`, `truefalse`, `type`, `order`, `oddone`, `compare`, `conceptchain`, `lowstakes`).
4. **Archetype D (Live Moments / Timers)**: Uses `SF.LessonMoments.broadcast()`. Classroom management micro-protocols showing countdown timers and instructions on the projector.

---

## Phase 1: Starter Activities (Beginnings of Lessons)

### 1. Quick Retrieval Quiz
* **Duration:** 7 minutes
* **Baby Explanation:** Instead of re-reading yesterday's notes, students close their notebooks and answer 3–5 short questions from memory without looking. Then they immediately grade themselves with a green pen.
* **Why It Works:** Trying to pull information out of your brain (retrieval) strengthens memory pathways much more than just looking at the answer.
* **Classroom Steps:**
  1. Teacher puts 3–5 questions on screen (30s).
  2. Students write answers silently from memory—no notes allowed (3m).
  3. Students compare with their desk partner (2m).
  4. Teacher reveals answer key; students self-mark with green pen (1.5m).
* **SlideForge Engine:** **Archetype C (Check/Game)** (`style: 'lowstakes'`) OR **Archetype A (Slide Starter)** (`layout: 'cards'`).
* **Slide Generation Output:**
  - Slide 1: Questions 1–4 numbered on a single slide.
  - Slide 2: Timer slide (180s silent recall).
  - Slide 3: Complete Answer Key with explanations.
* **Example:** Topic = *Photosynthesis*. Questions: (1) What gas goes in? (2) What gas comes out? (3) Which organelle does this happen in?

---

### 2. Think-Pair-Share
* **Duration:** 7 minutes
* **Baby Explanation:** Teacher asks a thought-provoking question. First, you think alone in silence. Next, you talk to your partner. Finally, the teacher picks a few pairs to share their ideas with the whole room.
* **Why It Works:** Shy students get to test their ideas with one friendly person before having to speak in front of 30 people. Everyone has to think, not just the kid who raises their hand first.
* **Classroom Steps:**
  1. Teacher presents a juicy question (1m).
  2. **Think:** Silent individual thinking / jotting notes (2m).
  3. **Pair:** Turn to neighbor and explain your thinking (2m).
  4. **Share:** Teacher calls on 2–3 pairs to share what their partner said (2m).
* **SlideForge Engine:** **Archetype D (Live Moment)** with countdown timer or **Archetype A** (`layout: 'split'`).
* **Slide Generation Output:**
  - Slide 1: Big Discussion Question with sentence stems ("I think... because...", "My partner pointed out...").
  - Slide 2: Timer HUD (2m Think → 2m Pair → 2m Share).
* **Example:** Topic = *History*. Question: "Was the treaty of Versailles fair or too harsh on Germany? Prepare one argument for your position."

---

### 3. Hook & Predict
* **Duration:** 7 minutes
* **Baby Explanation:** Show students something weird, surprising, or mysterious (a video, a weird photo, a paradox). Ask: *"What do you notice? What do you wonder? What will happen next?"*
* **Why It Works:** Creates an "information gap" in the brain. When curiosity is triggered, students pay attention because they want to know the answer.
* **Classroom Steps:**
  1. Show a mysterious stimulus/image on screen (30s).
  2. Students write 2 things they *notice* (1m).
  3. Students write 1 thing they *wonder* (1m).
  4. Class shares observations and predictions (3m).
  5. Teacher connects predictions to today's learning objective (1m).
* **SlideForge Engine:** **Archetype A (Slide Starter)** (`layout: 'split'`) with image stimulus on left, prompts on right.
* **Slide Generation Output:**
  - Slide 1: Large image/stimulus with two prominent boxes: "2 Things You Notice" and "1 Thing You Wonder".
  - Slide 2: "What We Predict" discussion summary.
* **Example:** Topic = *Physics*. Image: A heavy bowling ball and a light feather dropped inside a vacuum chamber falling at the exact same speed.

---

### 4. Word Splash
* **Duration:** 7 minutes
* **Baby Explanation:** Put 6–8 important vocabulary words splashed across the screen. Students rate how well they know each word (traffic light: Green = can explain it, Yellow = heard it, Red = never seen it), then talk to a partner.
* **Why It Works:** Connects new words to what students already know and exposes who is lost before the lecture begins.
* **Classroom Steps:**
  1. Display 6–8 key vocabulary terms on the screen (1m).
  2. Students privately self-rate each word: Circle = know well, Underline = seen before, Blank = brand new (1m).
  3. Pairs teach each other the words they circled (2m).
  4. Class creates quick working definitions together (3m).
* **SlideForge Engine:** **Archetype B (Audience Relay)** (`feedback: 'wordcloud'`) or **Archetype A** (`layout: 'keywords'`).
* **Slide Generation Output:**
  - Slide 1: Vocabulary splash with 6 key terms styled in colored badges.
  - Slide 2: Word cloud audience relay prompt where phones submit word definitions.
* **Example:** Topic = *Computer Architecture*. Words: CPU, ALU, Cache, Clock Speed, Registers, Bus.

---

### 5. Daily Review Routine
* **Duration:** 8 minutes
* **Baby Explanation:** The first 8 minutes of class every single day: check last night's homework, clear up the top 2 mistakes students made, and do 1 quick practice problem together.
* **Why It Works:** (Rosenshine Principle 1). Daily review prevents forgetting and quickly fixes misunderstandings before they turn into bad habits.
* **Classroom Steps:**
  1. Quick visual homework check (2m).
  2. Address top 2 common mistakes from yesterday's work (3m).
  3. Guided practice: Solve 1 problem together on the board (2.5m).
  4. Connect yesterday's concept to today's new topic (30s).
* **SlideForge Engine:** **Archetype A (Slide Starter)** (`layout: 'cards'`) with 3 sections: *Homework Check*, *Common Misconception*, *Bridge to Today*.
* **Slide Generation Output:**
  - Slide 1: 3-column card slide displaying Common Error vs Correct Method vs Practice Problem.
* **Example:** Topic = *Math: Fractions*. Reviewing why adding $\frac{1}{2} + \frac{1}{4}$ is not $\frac{2}{6}$.

---

### 6. Establish Talk Ground Rules
* **Duration:** 10 minutes
* **Baby Explanation:** Before doing group work or class discussions, the class agrees on 5 simple rules for how to talk respectfully (e.g., "Listen when someone speaks", "Say *I agree with X because...*").
* **Why It Works:** (Voice 21 Oracy). Kids don't automatically know how to have an academic debate without arguing or being shy. Setting ground rules makes everyone feel safe to contribute.
* **Classroom Steps:**
  1. Ask: *"What makes group talk go really well?"* (2m).
  2. Ask: *"What ruins group talk?"* (2m).
  3. Pairs brainstorm and propose 1 rule (3m).
  4. Teacher types up 5 official class ground rules on the board (2m).
  5. Read them aloud and confirm consensus (1m).
* **SlideForge Engine:** **Archetype A (Slide Starter)** (`layout: 'keywords'`).
* **Slide Generation Output:**
  - Slide 1: "Our Talk Ground Rules" featuring 5 bulleted or card-based norms (Listening, Respect, Building on Ideas, Evidence, Equal Airtime).
* **Example:** Rule 1: Only one person talks at a time. Rule 2: Challenge the idea, not the person. Rule 3: Use sentence starters.

---

## Phase 2: Starter Slides (Visual Opening Slides)

### 7. Clear Objectives Slide
* **Duration:** 2 minutes
* **Baby Explanation:** A clean slide that clearly tells students three things: (1) What we are learning today, (2) How we know we succeeded ("I can..."), and (3) The 3 key vocabulary words.
* **Why It Works:** When students know the destination before the journey starts, their brain organizes incoming information much more efficiently.
* **Classroom Steps:**
  1. Display slide as students sit down.
  2. Teacher reads the learning objective aloud and explains the "I can" statement.
  3. Highlight the 3 key vocabulary terms for 30 seconds.
* **SlideForge Engine:** **Archetype A** (`layout: 'keywords'`).
* **Slide Generation Output:**
  - Slide 1: Heading = Learning Objective, Box 1 = Success Criteria ("I can explain..."), Box 2 = Key Vocabulary badges.
* **Example:** Objective: *Understand how computer RAM works*. Success Criteria: *I can explain why RAM loses its data when powered off*.

---

### 8. Hook + Objectives Slide
* **Duration:** 2 minutes
* **Baby Explanation:** Combines a shocking picture or big real-world problem on the left side with today's 3 lesson objectives on the right side.
* **Why It Works:** Gives students emotional engagement (why should I care?) right next to the academic plan (what am I doing today?).
* **Classroom Steps:**
  1. Display side-by-side image and objectives.
  2. Teacher points to image: *"By the end of today, you will be able to explain how this works."*
* **SlideForge Engine:** **Archetype A** (`layout: 'split'`).
* **Slide Generation Output:**
  - Slide 1: Left column = Big Graphic / Stimulus Question; Right column = 3 bulleted lesson milestones.
* **Example:** Left: Photo of a sunken ship. Big Question: *"Why do steel ships float if steel nails sink?"* Right: Objectives on Density & Buoyancy.

---

### 9. Connection Slide (Past → Present → Future)
* **Duration:** 2 minutes
* **Baby Explanation:** A 3-step timeline slide showing: What we learned *yesterday*, what we are doing *today*, and where this leads *tomorrow*.
* **Why It Works:** (Bruner's Spiral Curriculum). Human knowledge is not isolated files; it is a connected web. Showing the timeline connects new learning to existing memories.
* **Classroom Steps:**
  1. Teacher clicks through 3 steps: *"Last lesson we mastered X... today we use X to build Y... next lesson Y becomes Z."*
* **SlideForge Engine:** **Archetype A** (`layout: 'cards'`).
* **Slide Generation Output:**
  - Slide 1: 3 timeline cards: (1) Last Lesson (recap), (2) Today (core focus), (3) Next Lesson (preview).
* **Example:** (1) Yesterday: Single-cell organisms → (2) Today: Specialized human cells → (3) Next week: Organ systems.

---

## Phase 3: Activation Phase (Waking Up Prior Knowledge)

### 10. Do Now / Bell Ringer
* **Duration:** 8 minutes
* **Baby Explanation:** The instant students walk through the door, a task is already on the board. They sit down and start writing in complete silence without waiting for the teacher to speak.
* **Why It Works:** Eliminates chaotic transition time at the start of class and gets brains working immediately (Lemov's Teach Like a Champion routine).
* **Classroom Steps:**
  1. Slide displayed at classroom door: 3 tiered questions (Easy recall, Medium application, Challenge question).
  2. 5 minutes of silent independent work.
  3. 2 minutes quick neighbor check.
  4. 1 minute teacher review.
* **SlideForge Engine:** **Archetype D (Live Moment)** with silent countdown clock + **Archetype A** (`layout: 'content'`).
* **Slide Generation Output:**
  - Slide 1: "DO NOW" header with 3 numbered challenge levels + 5:00 countdown timer.
* **Example:** Level 1: What is a noun? Level 2: Find the 3 nouns in this sentence. Level 3: Why is "freedom" an abstract noun?

---

### 11. Knowledge Activation Web
* **Duration:** 7 minutes
* **Baby Explanation:** Teacher writes a central word on the board. Students shout out everything they know about it, and the teacher connects the ideas with branching lines like a spider web.
* **Why It Works:** Externalizes students' mental models so everyone can see connections, patterns, and missing knowledge.
* **Classroom Steps:**
  1. Center of board displays the core topic word (1m).
  2. Students call out related facts, terms, and ideas (3m).
  3. Teacher draws connecting lines and groups related ideas (2m).
  4. Teacher highlights the gaps: *"Notice how we know a lot about X, but nothing about Y? That's what we learn today!"* (1m).
* **SlideForge Engine:** **Archetype B (Audience Relay)** (`feedback: 'wordcloud'`) or `feedback: 'brainstorm'`.
* **Slide Generation Output:**
  - Slide 1: Center node graphic with prompt. Phones submit associations to populate a live visual web.
* **Example:** Topic = *The Roman Empire*. Student call-outs: Gladiators, Julius Caesar, Aqueducts, Latin, Roads, Colosseum.

---

### 12. Pre-Assessment Quickfire
* **Duration:** 8 minutes
* **Baby Explanation:** Teacher reads 8 quick statements. Students show their vote with thumbs: 👍 True, 👎 False, or 👉 Unsure. Teacher counts to see what students already know and where they have misconceptions.
* **Why It Works:** Zero grading pressure. Gives the teacher instant data on whether to skip the basics or reteach them before starting the lecture.
* **Classroom Steps:**
  1. Teacher presents 8 rapid-fire statements one-by-one.
  2. On "3-2-1 Show!", every student signals simultaneously.
  3. Teacher counts the thumbs and notes surprises.
* **SlideForge Engine:** **Archetype C (Check/Game)** (`style: 'truefalse'`) or **Archetype B** (`feedback: 'poll'`).
* **Slide Generation Output:**
  - 8 sequential True/False slides or a single summary dashboard with answer breakdown.
* **Example:** Statement: *"Spiders are insects."* (False - 8 legs vs 6 legs, arachnid).

---

## Phase 4: Construction Phase (Building New Knowledge)

### 13. I Do, We Do, You Do
* **Duration:** 20 minutes
* **Baby Explanation:** The classic 3-step teaching method:
  1. **I Do:** Teacher works through a problem while talking out loud. Students watch and listen.
  2. **We Do:** Teacher and class solve a second problem together as a team.
  3. **You Do:** Students solve a third problem completely by themselves.
* **Why It Works:** (Gradual Release of Responsibility). Prevents cognitive overload by scaffolding the skill step-by-step until the student has independent competence.
* **Classroom Steps:**
  1. **I Do (5m):** Teacher models with "think aloud" (explaining *why* decisions are made).
  2. **We Do (8m):** Teacher asks students to supply each step of the next problem.
  3. **You Do Together (4m):** Desk pairs try one.
  4. **You Do Alone (3m):** Individual independent practice.
* **SlideForge Engine:** **Archetype A (Slide Starter)** (`layout: 'cards'`) with 3 distinct panels: *Model (I Do)*, *Guided (We Do)*, *Independent (You Do)*.
* **Slide Generation Output:**
  - 3 sequential slides or a 3-column comparative view with step-by-step worked breakdowns.
* **Example:** Solving a two-step algebra equation: $2x + 4 = 12$.

---

### 14. Concept Development
* **Duration:** 20 minutes
* **Baby Explanation:** Teaching a concept by clearly explaining its rules, showing a great example of it, and then showing a **non-example** (something that looks like it but isn't).
* **Why It Works:** Brains define things by their boundaries. You don't truly understand what a "mammal" is until you know why a dolphin *is* one and a shark *is not*.
* **Classroom Steps:**
  1. **Show (3m):** Present the concept with a definition.
  2. **Explain (5m):** Break down its essential features.
  3. **Examples vs Non-Examples (5m):** Compare side-by-side items.
  4. **Guided Check (7m):** Students classify new test cases.
* **SlideForge Engine:** **Archetype A** (`layout: 'split'`) or **Archetype C** (`style: 'compare'`).
* **Slide Generation Output:**
  - Slide 1: Formal Definition + 3 Essential Characteristics.
  - Slide 2: Two-column table: *Examples* (and why they fit) vs *Non-Examples* (and what rule they break).
* **Example:** Concept = *Simile*. Example: "He runs like a cheetah." Non-Example: "He is a cheetah" (Metaphor, not simile!).

---

### 15. Flipped Instruction Review
* **Duration:** 25 minutes
* **Baby Explanation:** Students watched a video or did reading at home before coming to class. Classroom time is spent discussing the hardest questions and doing challenging projects rather than listening to a lecture.
* **Why It Works:** Moves passive listening to the bedroom and active problem-solving to the classroom where the teacher can actually help when someone gets stuck.
* **Classroom Steps:**
  1. Quick 3-minute poll to check who understood the home prep.
  2. 10 minutes deep dive into the hardest 2 questions students flagged.
  3. 12 minutes high-level application practice.
* **SlideForge Engine:** **Archetype A** (`layout: 'cards'`) + **Archetype B** (`feedback: 'poll'`).
* **Slide Generation Output:**
  - Slide 1: Home prep recap & confusion check.
  - Slide 2: Deep-dive worked example on the most challenging concept.
* **Example:** Chemistry: Students watched a video on balancing chemical equations at home; class starts immediately with tricky combustion problems.

---

### 16. Question Cube - Six Question Types
* **Duration:** 20 minutes
* **Baby Explanation:** Take a topic and roll a 6-sided dice (or answer 6 levels of questions):
  1. **Define** it.
  2. **Compare** it to something else.
  3. **Give an example** of it.
  4. Explain **why** it happens.
  5. What if conditions change? (**What if?**)
  6. Under what **conditions** does it fail?
* **Why It Works:** (Rosenshine Questioning Matrix / Bloom's Taxonomy). Forces students to think about a concept from shallow memory to deep evaluation.
* **Classroom Steps:**
  1. Display the 6 question types on screen.
  2. Assign pairs different numbers or roll a digital dice.
  3. Students prepare responses for their assigned question type.
* **SlideForge Engine:** **Archetype C (Check/Game)** (`style: 'cube'`) or **Archetype A** (`layout: 'cards'`).
* **Slide Generation Output:**
  - Slide 1: 6-card grid with the 6 cognitive question types populated with topic-specific questions.
* **Example:** Topic = *Democracy*. (1) Define it. (2) Compare to Monarchy. (3) Real-world example. (4) Why does it exist? (5) What if voting was mandatory? (6) When does democracy break down?

---

## Phase 5: Mini Activities (10-Minute Skill Builders)

### 17. Worked Example Analysis
* **Duration:** 10 minutes
* **Baby Explanation:** Don't ask students to solve a problem right away. First, give them a problem that has *already been solved perfectly*. Have them analyze it step-by-step and write down the "recipe" used to solve it.
* **Why It Works:** (Sweller's Cognitive Load Theory). Looking at a finished solution frees up working memory so students can understand the *strategy* instead of getting bogged down in arithmetic errors.
* **Classroom Steps:**
  1. Display complete, annotated worked example on screen (1m).
  2. Students annotate each step: *"What was done here? Why did they do that?"* (3m).
  3. Pairs draft a general 3-step checklist/recipe (3m).
  4. Apply the recipe to 1 new practice problem (3m).
* **SlideForge Engine:** **Archetype A (Slide Starter)** (`layout: 'split'`) with completed solution on left and step-by-step annotation blanks on right.
* **Slide Generation Output:**
  - Slide 1: Fully worked problem with highlighted callout arrows explaining each transition.
  - Slide 2: Empty twin problem for students to test the recipe.
* **Example:** A completed physics calculation finding kinetic energy ($E_k = \frac{1}{2}mv^2$) with units labeled at every step.

---

### 18. Error Analysis (Spot the Mistake)
* **Duration:** 10 minutes
* **Baby Explanation:** Show students a piece of work done by an imaginary student ("Student Bob") that has 3 realistic, sneaky mistakes in it. Ask: *"Find Bob's errors, explain why he made them, and fix them."*
* **Why It Works:** Finding mistakes requires much deeper analytical understanding than just doing a problem yourself. It directly targets and dismantles common misconceptions.
* **Classroom Steps:**
  1. Display the flawed sample work (1m).
  2. Silent independent search: students circle the mistakes (3m).
  3. Pairs discuss: *"Why would someone make that mistake?"* (3m).
  4. Whole-class reveal of the correct version and prevention rule (3m).
* **SlideForge Engine:** **Archetype C (Check/Game)** (`style: 'oddone'`) or **Archetype A** (`layout: 'split'`).
* **Slide Generation Output:**
  - Slide 1: "Spot the Error" slide with flawed student work.
  - Slide 2: Side-by-side corrected answer key with "Why this error happens" notes.
* **Example:** In English grammar: *"Their going to there house over they're."* (Fixing homophones: *They're*, *their*, *there*).

---

### 19. Quick Practice Stations
* **Duration:** 10 minutes
* **Baby Explanation:** 3 mini-challenges set up around the room or on screen:
  - Station 1: **Recall** (remember a fact).
  - Station 2: **Apply** (use the fact to solve a simple problem).
  - Station 3: **Create** (invent your own example or explain why).
  Students spend 3 minutes at each station.
* **Why It Works:** Fast pacing keeps attention high and ensures students don't get stuck doing only easy recall tasks.
* **Classroom Steps:**
  1. Display 3 stations simultaneously.
  2. 3 minutes at Station 1.
  3. 3 minutes at Station 2.
  4. 3 minutes at Station 3.
  5. 1 minute final check.
* **SlideForge Engine:** **Archetype A (Slide Starter)** (`layout: 'cards'`) with 3 tiered columns: *Recall*, *Apply*, *Create*.
* **Slide Generation Output:**
  - Slide 1: 3-column station view with synchronized countdown timer.
* **Example:** Topic = *Electrical Circuits*. Station 1: Draw circuit symbols. Station 2: Calculate voltage with Ohm's law. Station 3: Design a circuit where one bulb stays on if the other breaks.

---

### 20. Concept Card Sort
* **Duration:** 10 minutes
* **Baby Explanation:** Give pairs 12 cards with words, diagrams, or scenarios. Students have to sort them into 3 distinct category piles (e.g. Solid / Liquid / Gas).
* **Why It Works:** Physical or digital grouping forces the brain to compare items, recognize shared characteristics, and organize mental categories.
* **Classroom Steps:**
  1. Distribute cards or display cards on interactive screen (1m).
  2. Pairs sort cards into categories and justify their choices (4m).
  3. Quick gallery walk: look at how other teams sorted theirs (2m).
  4. Discuss tricky cards that could belong to multiple categories (3m).
* **SlideForge Engine:** **Archetype C (Check/Game)** (`style: 'order'`) or draggable cards layout.
* **Slide Generation Output:**
  - Slide 1: Category boxes at top with 12 draggable/tiled cards below.
* **Example:** Cards = *Ice, Steam, Orange Juice, Helium, Sand, Honey*. Categories: Solid, Liquid, Gas (Sand and Honey spark great debate!).

---

### 21. Interleaving Mixed Practice
* **Duration:** 15 minutes
* **Baby Explanation:** Instead of doing 10 math problems that are all the exact same type, mix them up: 5 from today's lesson, 3 from last week, and 2 from last month.
* **Why It Works:** (EEF / Spaced Learning). When all problems are the same, students stop thinking and just follow a robotic pattern. Mixing them up forces the brain to first ask: *"Which strategy do I even need to use here?"*
* **Classroom Steps:**
  1. Present 6–8 mixed problems without telling students which topic each belongs to (1m).
  2. Students work independently (8m).
  3. Partner check: compare which formula/method was chosen (3m).
  4. Class reflection: *"How did you know which method to use?"* (3m).
* **SlideForge Engine:** **Archetype C (Check/Game)** (`style: 'choice'`) or **Archetype A** (`layout: 'content'`).
* **Slide Generation Output:**
  - Slide 1: Mixed problem bank with category labels hidden.
  - Slide 2: Reveal slide showing which topic each problem tested and how to identify it.
* **Example:** Math test containing a mix of Area, Perimeter, and Volume problems without headings.

---

### 22. Strategic Wait Time Questioning
* **Duration:** 10 minutes
* **Baby Explanation:** When the teacher asks a question, **nobody is allowed to raise their hand or speak for 5 full seconds**. Everyone must just sit and think. Then the teacher picks a student randomly (using name sticks).
* **Why It Works:** (Rosenshine Principle 3 & 6 / Mary Budd Rowe research). If teachers call on the first hand that goes up (usually after 1 second), only the fastest kid thinks. Forcing a 5-second silence allows slower, deeper thinkers to formulate high-quality answers.
* **Classroom Steps:**
  1. Teacher asks a high-level question.
  2. ⏱️ 5 seconds of complete silence (timer visible on screen).
  3. Teacher draws a random student name.
  4. Student answers.
  5. ⏱️ Teacher waits 3 more seconds before responding to let the class process the answer.
* **SlideForge Engine:** **Archetype D (Live Moment)** with built-in 5-second silence HUD timer.
* **Slide Generation Output:**
  - Slide 1: Big Question with an animated 5-second countdown progress bar: *"Wait Time: Think silently... no hands."*
* **Example:** *"Why did the Industrial Revolution start in Britain rather than France? Think silently for 5 seconds."*

---

## Phase 6: Main Activities (Deep Instructional Blocks)

### 23. Guided Inquiry Investigation
* **Duration:** 30 minutes
* **Baby Explanation:** The 4-step discovery process:
  1. **Explore:** Play with a simulator, data set, or experiment.
  2. **Explain:** Come up with a theory for why it works.
  3. **Elaborate:** Test the theory on a new problem.
  4. **Share:** Present conclusions to the class.
* **Why It Works:** (5E Instructional Model). Students remember ideas they figured out for themselves far longer than facts that were simply spoon-fed to them.
* **Classroom Steps:**
  1. Explore stimulus (10m).
  2. Formulate rules/explanations in groups (8m).
  3. Apply to new scenario (7m).
  4. Class synthesis (5m).
* **SlideForge Engine:** **Archetype A** (Multi-slide lesson arc across 4 slides: *Explore → Explain → Elaborate → Share*).
* **Slide Generation Output:**
  - 4 interconnected slides tracking the inquiry progression with milestones.
* **Example:** Testing ramp heights with toy cars to discover the relationship between height and velocity.

---

### 24. Jigsaw Expert Groups
* **Duration:** 29 minutes
* **Baby Explanation:**
  1. Break the class into "Home Groups" of 4 students (Person A, B, C, D).
  2. All the Person A's meet together in an "Expert Group" to master Topic 1.
  3. Person B's master Topic 2, C's master Topic 3, D's master Topic 4.
  4. Everyone returns to their Home Group and takes turns teaching their teammates what they learned.
* **Why It Works:** (Aronson Jigsaw). Every single student is personally responsible for teaching one quarter of the lesson. No one can hide or daydream.
* **Classroom Steps:**
  1. Home groups assign letters A, B, C, D (5m).
  2. Expert groups study their specific text/topic and plan how to teach it (12m).
  3. Return to Home Groups: each student has 3 minutes to teach their section (12m).
* **SlideForge Engine:** **Archetype D (Live Moment)** with automated 3-stage phase timers.
* **Slide Generation Output:**
  - Slide 1: Home Group assignment matrix.
  - Slide 2: Expert Group mission cards (A, B, C, D).
  - Slide 3: Return & Teach countdown timer (3m per expert).
* **Example:** Causes of World War 1: Group A = Militarism, Group B = Alliances, Group C = Imperialism, Group D = Nationalism (MAIN).

---

### 25. Problem-Based Learning
* **Duration:** 35 minutes
* **Baby Explanation:** Give students a messy, real-world crisis (e.g. *"Our city's river is polluted and fish are dying"*). Students must figure out what information they already have, what they need to research, and propose a viable solution.
* **Why It Works:** Authentic real-world relevance motivates students and develops critical thinking, research skills, and teamwork.
* **Classroom Steps:**
  1. Present the scenario/crisis (3m).
  2. Teams list: *What do we KNOW?* vs *What do we NEED to find out?* (10m).
  3. Investigation and solution design (15m).
  4. 1-minute elevator pitch of solutions (7m).
* **SlideForge Engine:** **Archetype A** (`layout: 'split'`) with problem scenario and inquiry scaffolding.
* **Slide Generation Output:**
  - Slide 1: Crisis Dossier.
  - Slide 2: Two-column organizer ("Known Facts" vs "Information Gaps").
  - Slide 3: Solution criteria rubric.
* **Example:** Designing an eco-friendly packaging container that keeps ice cream frozen for 2 hours without electricity.

---

### 26. Differentiated Practice Menu
* **Duration:** 25 minutes
* **Baby Explanation:** Like a restaurant menu:
  - **Must-Do (Appetizer):** Core practice that everyone must complete (10m).
  - **Choose Your Challenge (Main Course):**
    - 🟢 *Consolidate:* Guided version with hints for students who feel shaky.
    - 🟡 *Apply:* Standard grade-level problem.
    - 🔴 *Extend:* Brain-teaser challenge for students ready to fly.
* **Why It Works:** (Tomlinson Differentiation). Fast finishers don't get bored, and struggling students get the support they need without feeling ashamed.
* **Classroom Steps:**
  1. Whole class completes core task (10m).
  2. Students select their challenge tier (15m).
* **SlideForge Engine:** **Archetype A (Slide Starter)** (`layout: 'cards'`) showing Green, Yellow, and Red tiers side-by-side.
* **Slide Generation Output:**
  - Slide 1: 3-column leveled menu with clear color-coded icons.
* **Example:** Computer Coding: Green = Fix bugs in existing code; Yellow = Write code from scratch; Red = Optimize code for minimum memory.

---

### 27. Design & Create Task
* **Duration:** 35 minutes
* **Baby Explanation:** Instead of answering a worksheet, students demonstrate their understanding by building something real: an infographic poster, a 30-second video script, a physical model, or a mini-pitch.
* **Why It Works:** (Papert's Constructionism). Constructing an artifact requires synthesizing knowledge and shows whether a student truly understands how principles apply.
* **Classroom Steps:**
  1. Teacher reveals design brief and success criteria rubric (5m).
  2. Student planning and drafting (10m).
  3. Construction and creation (15m).
  4. Peer review and feedback (5m).
* **SlideForge Engine:** **Archetype A** (`layout: 'cards'`) displaying the Brief, Constraints, and Rubric.
* **Slide Generation Output:**
  - Slide 1: Mission Brief & Deliverable specifications.
  - Slide 2: Rubric criteria and progress timer.
* **Example:** Create a warning poster for medieval peasants explaining how the Black Death spreads and how to avoid it.

---

## Phase 7: Collaboration Phase (Peer Learning & Oracy)

### 28. Think-Pair-Square-Share
* **Duration:** 13 minutes
* **Baby Explanation:** Progressive snowball discussion:
  - **Think (2m):** Alone.
  - **Pair (3m):** Talk to 1 person.
  - **Square (4m):** Merge with another pair to form a group of 4. Combine your best ideas.
  - **Share (4m):** Group of 4 presents their synthesized answer to the class.
* **Why It Works:** Ideas get tested and polished 3 times before ever reaching the whole room, dramatically raising the quality of discussion.
* **Classroom Steps:**
  1. Reveal prompt.
  2. 2m Individual → 3m Pair → 4m Group of 4 → 4m Class Share.
* **SlideForge Engine:** **Archetype D (Live Moment)** with automated multi-stage progress bar.
* **Slide Generation Output:**
  - Slide 1: Core Prompt + 4-stage visual timeline indicator.
* **Example:** *"Which renewable energy source is most practical for our town: Solar, Wind, or Hydroelectric?"*

---

### 29. Jigsaw Collaboration
* **Duration:** 20 minutes
* **Baby Explanation:** A streamlined, rapid 20-minute version of the Jigsaw technique specifically designed for pair-to-pair peer tutoring on two paired texts.
* **Why It Works:** Cuts reading time in half while doubling peer explanation time.
* **Classroom Steps:**
  1. Partner A reads Text 1; Partner B reads Text 2 (8m).
  2. Partner A teaches Text 1 to Partner B (5m).
  3. Partner B teaches Text 2 to Partner A (5m).
  4. Joint synthesis (2m).
* **SlideForge Engine:** **Archetype D (Live Moment)** with 5m/5m speaker rotation timer.
* **Slide Generation Output:**
  - Slide 1: Split texts / tasks with paired coaching cues.
* **Example:** Comparing the Northern vs Southern economies prior to the American Civil War.

---

### 30. Peer Teaching Carousel (Gallery Walk)
* **Duration:** 20 minutes
* **Baby Explanation:** Big sheets of poster paper are hung on the 4 walls of the room. Small groups spend 4 minutes at each poster, read what the previous group wrote, add new ideas, and correct mistakes with a colored pen.
* **Why It Works:** Kinesthetic movement wakes up tired students, and building on others' work teaches collaborative editing and critical thinking.
* **Classroom Steps:**
  1. 4 stations set up around room.
  2. Groups rotate every 4 minutes (4 stations × 4 mins = 16 mins).
  3. Final return to starting station to review all comments (4 mins).
* **SlideForge Engine:** **Archetype D (Live Moment)** with rotational buzzer timer.
* **Slide Generation Output:**
  - Slide 1: 4 station prompts displayed on screen + rotation countdown.
* **Example:** Literature: 4 stations, each exploring a different theme in *Macbeth* (Ambition, Guilt, Fate, Kingship).

---

### 31. Socratic Seminar (Simple)
* **Duration:** 20 minutes
* **Baby Explanation:**
  - Arrange chairs in two concentric circles: an **Inner Circle** and an **Outer Circle**.
  - Inner circle has an open discussion using evidence. Outer circle sits in silence, takes notes, and tracks who spoke and what evidence was used.
  - Halfway through, they switch places!
* **Why It Works:** Completely removes the teacher as the middleman. Students learn to talk *to each other*, ask for proof, and listen actively.
* **Classroom Steps:**
  1. Round 1 (8m): Inner circle discusses, Outer circle observes.
  2. Debrief (2m): Outer circle gives feedback on discussion quality.
  3. Switch circles! Round 2 (8m).
  4. Final synthesis (2m).
* **SlideForge Engine:** **Archetype D (Live Moment)** with Inner/Outer stage management.
* **Slide Generation Output:**
  - Slide 1: Essential Socratic Question + Academic sentence stems ("What evidence in the text supports that?", "I see your point, but consider...").
* **Example:** *"Was Frankenstein the true monster, or was his creation the victim?"*

---

### 32. Dialogue Chain Discussion
* **Duration:** 15 minutes
* **Baby Explanation:** A discussion game where nobody can speak unless they start their sentence by connecting to what the previous student just said:
  - *"I agree with Sarah because..."*
  - *"Building on what David said, I also noticed..."*
  - *"I see Sarah's point, but I disagree because..."*
* **Why It Works:** (Voice 21 Accountable Talk). Forces kids to actually listen to their peers instead of just waiting for their own turn to talk.
* **Classroom Steps:**
  1. Pose discussion question.
  2. Student 1 gives a starting response (30s).
  3. Student 2 must use a connecting phrase to link back to Student 1.
  4. Continue the chain through 8–10 students without breaking the chain.
* **SlideForge Engine:** **Archetype A** (`layout: 'cards'`) featuring the 3 Sentence Connector stems prominently.
* **Slide Generation Output:**
  - Slide 1: Big Discussion Question with large visual cards: *Agreement Connector*, *Add-On Connector*, *Respectful Disagreement Connector*.
* **Example:** *"Should artificial intelligence be allowed to generate school art submissions?"*

---

### 33. Real-World Connection Hunt
* **Duration:** 15 minutes
* **Baby Explanation:** A scavenger hunt where students must find real examples of an abstract concept in 3 places:
  1. Right here in this classroom.
  2. At home in their kitchen or bedroom.
  3. Out in their city or community.
* **Why It Works:** Bridges abstract academic theory to concrete everyday reality (Situated Cognition).
* **Classroom Steps:**
  1. Reveal concept (e.g. *Friction*).
  2. Challenge 1: Find an example in this room (3m).
  3. Challenge 2: Example at home (3m).
  4. Challenge 3: Example in the community (3m).
  5. Share out and reflect (5m).
* **SlideForge Engine:** **Archetype B (Audience Relay)** (`feedback: 'brainstorm'`) or **Archetype A** (`layout: 'cards'`).
* **Slide Generation Output:**
  - Slide 1: 3-column target board: *Room*, *Home*, *Community*.
* **Example:** Concept = *Thermal Insulation*. Room = thermos flask; Home = refrigerator door gasket; Community = double-glazed hospital windows.

---

### 34. Explanation Champion Challenge (Taboo)
* **Duration:** 15 minutes
* **Baby Explanation:** Like the game *Taboo*. A student must explain a technical concept to the class in 60 seconds **without saying 4 "banned" words**.
  - Example: Explain *Photosynthesis* without saying *Plant*, *Sun*, *Light*, or *Leaf*!
* **Why It Works:** When you cannot use common shortcut words, you are forced to explain the underlying mechanics from first principles, demonstrating true mastery.
* **Classroom Steps:**
  1. Display concept and 4 Banned Words on screen (1m).
  2. 2 minutes thinking time: students draft alternative metaphors.
  3. Volunteer attempts 60-second explanation.
  4. Class votes: Clear (2 pts), Okay (1 pt), Banned word used! (0 pts).
* **SlideForge Engine:** **Archetype C (Check/Game)** (`style: 'headsup'`) with 60s buzzer.
* **Slide Generation Output:**
  - Slide 1: Main Concept at top; 4 large red "BANNED WORDS" badges below; 60s live countdown clock.
* **Example:** Concept = *Gravity*. Banned Words: *Fall, Down, Earth, Heavy*.

---

### 35. Compare & Contrast Venn Activity
* **Duration:** 15 minutes
* **Baby Explanation:** A side-by-side comparison of two concepts using two overlapping circles (a Venn diagram). Left circle = unique to Concept A; Right circle = unique to Concept B; Middle overlap = shared by both.
* **Why It Works:** (Marzano High-Yield Strategy). Identifying similarities and differences is one of the most effective cognitive techniques for organizing new knowledge.
* **Classroom Steps:**
  1. Introduce Concept A and Concept B (1m).
  2. Individual listing: unique features vs shared features (3m).
  3. Pairs combine into a complete Venn diagram (5m).
  4. Class debrief on key distinctions (4m).
* **SlideForge Engine:** **Archetype C (Check/Game)** (`style: 'compare'`) or **Archetype A** (`layout: 'split'`).
* **Slide Generation Output:**
  - Slide 1: Interactive two-column/Venn layout with categorized bullet cards for *Concept A*, *Shared*, and *Concept B*.
* **Example:** Comparing *Mitosis* vs *Meiosis* in Biology.

---

### 36. Benefits vs Limitations Battle
* **Duration:** 15 minutes
* **Baby Explanation:** Split the classroom into two teams:
  - Team 1: Must argue every **Benefit / Advantage** of an idea.
  - Team 2: Must argue every **Limitation / Drawback** of the idea.
  Teams take turns firing one point at a time.
* **Why It Works:** Prevents one-sided bias and trains students in balanced, critical evaluation.
* **Classroom Steps:**
  1. Reveal topic (e.g. *Nuclear Power*).
  2. Team 1 (Pros) vs Team 2 (Cons) prepare points (3m).
  3. Alternating point rally (8m): each valid non-repeated point earns a tally.
  4. Debrief: What is the nuanced, balanced verdict? (4m).
* **SlideForge Engine:** **Archetype A** (`layout: 'split'`) with two team scoreboard tallies.
* **Slide Generation Output:**
  - Slide 1: Split stadium layout: Green "Benefits" column vs Red "Limitations" column.
* **Example:** *"Should our country transition to 100% Cashless Digital Currency?"*

---

### 37. Scenario Analysis Discussion
* **Duration:** 18 minutes
* **Baby Explanation:** Present a short, realistic mini-story (a vignette). Students diagnose what concept is happening in the story and predict what will happen next.
* **Why It Works:** (Situated Cognition). Theory is hard to memorize; stories and realistic scenarios are easy to remember.
* **Classroom Steps:**
  1. Read scenario story together (3m).
  2. Question 1: What core concept is taking place here? (4m).
  3. Question 2: Which character made the right decision? (4m).
  4. Question 3: Predict what happens next (4m).
  5. Whole-class debrief (3m).
* **SlideForge Engine:** **Archetype A** (`layout: 'split'`) with Story Vignette on left and 3 Investigative Questions on right.
* **Slide Generation Output:**
  - Slide 1: Scenario narrative block with highlighted clue terms and discussion prompts.
* **Example:** Business Studies: A bakery doubles its cake prices and sales plunge by 80% (Price Elasticity of Demand).

---

### 38. Whiteboards on Walls
* **Duration:** 12 minutes
* **Baby Explanation:** Students get out of their seats and stand at large vertical whiteboards on the classroom walls in groups of 3. **The group is given only 1 marker pen**, so they have to talk out loud and agree before writing anything down!
* **Why It Works:** (Franklin Sixth Form / Peter Liljedahl's Building Thinking Classrooms). Standing up keeps students alert. Vertical boards make thinking visible across the room. One pen forces teamwork.
* **Classroom Steps:**
  1. Trios assemble at wall whiteboards; 1 dry-erase pen per trio (1m).
  2. Teacher displays a complex multi-step problem (1m).
  3. Trios solve on the wall, passing the pen every 3 minutes (7m).
  4. 2-minute Gallery Walk: look around the room at neighboring boards.
  5. 1-minute recap of best methods.
* **SlideForge Engine:** **Archetype D (Live Moment)** with 12m visible thinking countdown.
* **Slide Generation Output:**
  - Slide 1: Synthesis challenge problem with rules card ("1 Pen per Trio", "Pass pen when chime sounds").
* **Example:** High-level calculus problem or complex balance-sheet reconciliation.

---

### 39. Connect Four - Concept Edition
* **Duration:** 20 minutes
* **Baby Explanation:** A 4×4 grid of 16 cards is displayed on screen. Teams take turns picking two cards and must explain the hidden academic connection between them to "claim" the squares and try to get 4 in a row.
* **Why It Works:** Gamification makes relational thinking exciting. Students look for deep conceptual relationships rather than isolated facts.
* **Classroom Steps:**
  1. Display 4×4 grid with 16 concepts (2m).
  2. Team Red vs Team Blue take turns picking 2 cards and explaining their link (15m).
  3. Teacher judges if the explanation is valid. If yes, team claims the squares.
  4. First team to get 4 connected spaces wins! (3m).
* **SlideForge Engine:** **Archetype C (Check/Game)** (`style: 'conceptchain'`).
* **Slide Generation Output:**
  - Slide 1: 4×4 interactive claim grid with team turn indicator.
* **Example:** Connecting *Stomata* with *Transpiration* by explaining water loss in plants.

---

## Phase 8: Mini Quizzes (Formative Checks)

### 40. Multiple Choice Quiz
* **Duration:** 6 minutes
* **Baby Explanation:** 5 quick multiple choice questions with 4 options each (A, B, C, D). Students click their answer on their phone; the correct answer is shown immediately.
* **Why It Works:** Delivers rapid, painless feedback to both student and teacher with zero time spent manual grading.
* **Classroom Steps:**
  1. 5 questions presented sequentially (45s each = ~4 mins).
  2. Instant reveal of answer and 1-sentence explanation after each.
* **SlideForge Engine:** **Archetype C (Check/Game)** (`style: 'choice'`).
* **Slide Generation Output:**
  - 5 interactive question slides with 1 correct option and 3 plausible distractors.
* **Example:** *"What is the main function of red blood cells? A) Fight bacteria, B) Carry oxygen, C) Clot wounds, D) Digest food."*

---

### 41. True/False Rapid Fire
* **Duration:** 5 minutes
* **Baby Explanation:** 10 fast statements in 5 minutes. Students tap True or False as quickly as possible.
* **Why It Works:** Tests fluency and automatic recall under gentle time pressure.
* **Classroom Steps:**
  1. Rapid display of 10 statements (30s each).
  2. Real-time streak multipliers reward consistent accuracy.
* **SlideForge Engine:** **Archetype C (Check/Game)** (`style: 'truefalse'`).
* **Slide Generation Output:**
  - 10 fast True/False prompt cards with instant score tally.
* **Example:** *"Sound travels faster through air than through steel."* (False! It travels much faster through solids).

---

### 42. Short Answer Check
* **Duration:** 8 minutes
* **Baby Explanation:** Students type or write a 1-to-3 word exact answer (e.g. naming a specific organelle, city, or date). Then they swap with a peer and mark it against a rubric.
* **Why It Works:** Multiple choice lets students guess; short answer requires pure unassisted recall from memory.
* **Classroom Steps:**
  1. 3–5 short questions displayed (4m).
  2. Swap with partner (1m).
  3. Mark against teacher criteria (2m).
  4. Self-report score (1m).
* **SlideForge Engine:** **Archetype C (Check/Game)** (`style: 'type'`).
* **Slide Generation Output:**
  - Slide 1: 3 typed-response questions with character limits.
  - Slide 2: Strict keyword mark scheme.
* **Example:** *"Name the treaty signed in 1919 that formally ended World War I."* → Answer: *Treaty of Versailles*.

---

### 43. Diagnostic Question (Hinge-Point)
* **Duration:** 7 minutes
* **Baby Explanation:** **One single, masterfully crafted multiple-choice question**. Every wrong answer (distractor) represents one specific, common misunderstanding.
  - If a student picks B, the teacher knows *exactly* which misconception they have without asking!
* **Why It Works:** (Dylan Wiliam's Hinge-Point Questions). Instantly shows the teacher whether the room understands the concept or if the lesson must stop and reteach.
* **Classroom Steps:**
  1. Display the single diagnostic question (2m).
  2. Students vote simultaneously (1m).
  3. Teacher checks the response distribution:
     - If >80% correct: Move forward to next topic!
     - If <80% correct: Stop and address the specific distractor students picked (4m).
* **SlideForge Engine:** **Archetype C (Check/Game)** (`style: 'choice'`) with distractor analysis tags.
* **Slide Generation Output:**
  - Slide 1: Diagnostic question with 4 options.
  - Slide 2: Teacher Diagnostic Guide explaining what misunderstanding causes each wrong choice.
* **Example:** Math: Which is larger: $0.4$ or $0.15$? Students picking $0.15$ mistakenly think "15 is bigger than 4" (ignoring place value!).

---

## Phase 9: Reflection Phase (Closing Metacognition)

### 44. Structured Reflection Protocol (Four Corners)
* **Duration:** 12 minutes
* **Baby Explanation:** The 4 corners of the room represent 4 levels of understanding:
  - Corner 1: *"I've got this and could teach it!"*
  - Corner 2: *"I mostly understand it, but need practice."*
  - Corner 3: *"I'm getting there, but feeling shaky."*
  - Corner 4: *"I'm completely lost and need help."*
  Students walk to their corner and work with peers at their level.
* **Why It Works:** Physical movement makes self-assessment honest and groups students by readiness so the teacher can sit with Corner 4 while Corner 1 helps Corner 2.
* **Classroom Steps:**
  1. Announce the 4 corners (1m).
  2. Students walk to their chosen corner (2m).
  3. Differentiated task assigned to each corner (6m).
  4. Teacher supports Corner 4 (3m).
* **SlideForge Engine:** **Archetype B (Audience Relay)** (`feedback: 'poll'`) with 4 choices, or **Archetype D (Live Moment)**.
* **Slide Generation Output:**
  - Slide 1: 4-Corner self-assessment poll showing live classroom distribution.
* **Example:** Self-assessing confidence in writing balanced redox equations.

---

### 45. Learning Log Entry
* **Duration:** 10 minutes
* **Baby Explanation:** Students spend 8 quiet minutes writing in their personal learning journal answering 4 specific prompts:
  1. **New Learning:** What is one new thing I learned today?
  2. **Connection:** How does this connect to something I already knew?
  3. **Challenge:** What was difficult or confusing?
  4. **Next Step:** What will I do to master this?
* **Why It Works:** (EEF Metacognition). Thinking about *how* you learn turns passive listeners into self-regulated, independent students.
* **Classroom Steps:**
  1. Display the 4 journal prompts (1m).
  2. Silent independent reflective writing (7m).
  3. Optional: Share one takeaway with partner (2m).
* **SlideForge Engine:** **Archetype A (Slide Starter)** (`layout: 'content'`) displaying the 4 journal prompt stems.
* **Slide Generation Output:**
  - Slide 1: 4-card structured reflective framework.
* **Example:** Reflection at the end of a unit on Shakespearean Sonnets.

---

### 46. Muddiest Point
* **Duration:** 13 minutes
* **Baby Explanation:** Give every student a sticky note (or phone prompt). Ask one question: *"What was the most confusing, muddy, or unclear part of today's lesson?"*
  Teacher collects them, groups them into the top 2 confusions, and clarifies them on the spot!
* **Why It Works:** (Angelo & Cross Formative Assessment). It normalizes being confused. Students don't feel embarrassed because everyone admits their "muddy point."
* **Classroom Steps:**
  1. Students write their muddiest point (3m).
  2. Teacher scans and clusters the responses (2m).
  3. Teacher addresses the top 2 common confusions directly on the board (8m).
* **SlideForge Engine:** **Archetype B (Audience Relay)** (`feedback: 'brainstorm'`).
* **Slide Generation Output:**
  - Slide 1: Live anonymous submission wall: *"What was the muddiest point today?"*
* **Example:** After a lesson on Electricity: *"I don't understand the difference between Current and Voltage."*

---

### 47. Plus-Minus-Interesting (PMI)
* **Duration:** 10 minutes
* **Baby Explanation:** Draw a 3-column table on paper:
  - **Plus (+):** What went well or what positive thing did we learn?
  - **Minus (−):** What was frustrating, hard, or a negative consequence?
  - **Interesting (?):** What surprised you or made you wonder?
* **Why It Works:** (Edward de Bono's Thinking Tools). Forces students to evaluate a topic from multiple angles rather than jumping to a quick, emotional judgment.
* **Classroom Steps:**
  1. Silent individual PMI reflection (5m).
  2. Pair comparison and class share-out (5m).
* **SlideForge Engine:** **Archetype A (Slide Starter)** (`layout: 'cards'`) with 3 columns: *Plus*, *Minus*, *Interesting*.
* **Slide Generation Output:**
  - Slide 1: 3-column card view labeled with `(+)`, `(−)`, and `(?)`.
* **Example:** Evaluating the impact of the Industrial Revolution (Plus: faster production; Minus: child labor and pollution; Interesting: rise of clock time).

---

## Phase 10: Activity Plenaries (End-of-Lesson Closers)

### 48. Exit Ticket (3-2-1)
* **Duration:** 5 minutes
* **Baby Explanation:** Before any student is allowed to walk out the classroom door, they must submit a slip with:
  - **3** things they learned today.
  - **2** things they found interesting.
  - **1** question they still have.
* **Why It Works:** Guarantees 100% participation data every single lesson so the teacher knows exactly what to teach tomorrow.
* **Classroom Steps:**
  1. Students complete the 3-2-1 prompt (3m).
  2. Hand in paper or submit digitally on phone as their "ticket out the door" (2m).
* **SlideForge Engine:** **Archetype B (Audience Relay)** (`feedback: 'brainstorm'`) or **Archetype A** (`layout: 'cards'`).
* **Slide Generation Output:**
  - Slide 1: 3-2-1 Exit Ticket layout with 3 clear input boxes.
* **Example:** End of lesson on Cell Biology.

---

### 49. Recap Quiz Game
* **Duration:** 6 minutes
* **Baby Explanation:** A high-energy, fast-paced team review game (like a pub quiz or game show) at the end of class testing everything covered today.
* **Why It Works:** Finishes the lesson on an exciting, positive emotional peak while locking in key memories.
* **Classroom Steps:**
  1. 5–8 rapid quiz questions (4m).
  2. Reveal winner and review the trickiest question (2m).
* **SlideForge Engine:** **Archetype C (Check/Game)** (`style: 'speed'` or `style: 'race'`).
* **Slide Generation Output:**
  - Gamified speed quiz with leaderboard countdown.
* **Example:** End of class French vocabulary showdown.

---

### 50. Teach Someone (The Protégé Effect)
* **Duration:** 8 minutes
* **Baby Explanation:** Turn to your desk neighbor:
  - **Partner A:** Spends 2 minutes explaining today's lesson as if they were the teacher.
  - **Partner B:** Listens and asks 2 clarifying questions.
  - Then switch roles!
* **Why It Works:** (The Protégé Effect). When you have to teach an idea to someone else, your brain organizes information far more deeply than when you just study for yourself.
* **Classroom Steps:**
  1. Partner A teaches Partner B (2m).
  2. Partner B asks 2 questions (1m).
  3. Switch roles: Partner B teaches Partner A (3m).
  4. Final question: *"What would we tell someone who was absent today?"* (2m).
* **SlideForge Engine:** **Archetype D (Live Moment)** with 2m/2m alternating speaker timer.
* **Slide Generation Output:**
  - Slide 1: "Teach Your Partner" slide with role instructions and timer.
* **Example:** Explaining how vaccines trigger immune antibody production.

---

### 51. Visual Summary (Dual Coding)
* **Duration:** 8 minutes
* **Baby Explanation:** Students summarize the whole lesson without writing long paragraphs: they create a mind map, a 3-panel comic strip, or a labeled sketch.
* **Why It Works:** (Paivio's Dual Coding Theory). Combining words with visual diagrams doubles the number of memory traces in the brain.
* **Classroom Steps:**
  1. Choose visual format: Mind Map, Comic Strip, or Diagram (1m).
  2. Students sketch their visual summary (5m).
  3. Share and compare with neighbor (2m).
* **SlideForge Engine:** **Archetype A (Slide Starter)** (`layout: 'cards'`) or sketch prompt.
* **Slide Generation Output:**
  - Slide 1: Visual layout templates with mind map stems.
* **Example:** Drawing the water cycle showing Evaporation, Condensation, and Precipitation.

---

### 52. Reflection Ladder
* **Duration:** 9 minutes
* **Baby Explanation:** A visual 5-rung ladder:
  - Rung 1: *"I need lots of help."*
  - Rung 2: *"I can do it with hints."*
  - Rung 3: *"I can do it on my own."*
  - Rung 4: *"I understand why it works."*
  - Rung 5: *"I can teach this to anyone!"*
  Students place themselves on a rung and write what they need to do to climb up one step.
* **Why It Works:** Shifts student mindsets from "I'm dumb" to a growth mindset: *"I am at Rung 2 right now, and here is how I get to Rung 3."*
* **Classroom Steps:**
  1. Display the 5-rung ladder (1m).
  2. Students vote or draw their current rung (2m).
  3. Students write: *"To move up one rung, I need to..."* (3m).
  4. Teacher records who needs targeted support (3m).
* **SlideForge Engine:** **Archetype B (Audience Relay)** (`feedback: 'scale'`) with 1–5 confidence levels.
* **Slide Generation Output:**
  - Slide 1: 5-step ladder confidence scale with audience slider response.
* **Example:** Rating confidence in factoring quadratic equations.

---

## Phase 11: Plenary Phase (Formal Lesson Closure)

### 53. Exit Ticket (Plenary Formal)
* **Duration:** 5 minutes
* **Baby Explanation:** The formal end-of-lesson departure check verifying that the core objective was achieved before students dismiss.
* **Why It Works:** Provides administrative and teaching records of classroom mastery percentage.
* **Classroom Steps:**
  1. Single summary question on screen (3m).
  2. Digital or paper collection (2m).
* **SlideForge Engine:** **Archetype B (Audience Relay)** (`feedback: 'poll'`).
* **Slide Generation Output:**
  - Slide 1: Formal departure hinge prompt.
* **Example:** Diagnostic check confirming whether students can calculate speed from distance and time.

---

### 54. Preview Next Lesson
* **Duration:** 7 minutes
* **Baby Explanation:**
  1. **Today we mastered:** 1-minute recap of what we just achieved.
  2. **Next lesson we will:** Sneak peek at tomorrow's exciting challenge.
  3. **Homework / Prep:** 1 small task to do tonight.
  4. **Cliffhanger Question:** Leave students with a mystery to ponder until tomorrow!
* **Why It Works:** (Zeigarnik Effect). Leaving a story or puzzle unfinished keeps the brain thinking about it between classes.
* **Classroom Steps:**
  1. Quick recap of today's victory (2m).
  2. Teaser of next lesson's challenge (2m).
  3. Explain home preparation task (1m).
  4. Pose cliffhanger mystery question (2m).
* **SlideForge Engine:** **Archetype A (Slide Starter)** (`layout: 'cards'`) with 3 panels: *Today's Milestone*, *Tomorrow's Teaser*, *Cliffhanger*.
* **Slide Generation Output:**
  - Slide 1: 3-panel bridge card: Today → Tomorrow → Cliffhanger Question.
* **Example:** Today: *"We learned that white light is made of all colors."* Cliffhanger: *"If that's true, why is the sky blue and not violet?"*

---

## Summary Checklist for AI Agents & Developers

When creating a slide or activity from any of the 54 activities above:

1. **Check the Duration**: Don't build a 30-minute inquiry for a 5-minute starter. Respect the timing.
2. **Apply the "Teach First, Apply Second" Guardrail**: If the activity is a discussion (e.g. *Think-Pair-Share*), never generate discussion slides without dedicated teaching slides first if new terms are involved.
3. **Always Include Model Answers**: For all quizzes (*Quick Retrieval*, *Diagnostic*, *Low Stakes*), the system must generate a corresponding answer key slide with explanations.
4. **Select the Right Archetype**:
   - Needs student phones / audience voting? $\rightarrow$ **Archetype B (Feedback)**.
   - Self-contained competitive check? $\rightarrow$ **Archetype C (Game)**.
   - Classroom management / protocol / timer? $\rightarrow$ **Archetype D (Live Moment)**.
   - Content presentation / structure? $\rightarrow$ **Archetype A (Authored Slide)**.
