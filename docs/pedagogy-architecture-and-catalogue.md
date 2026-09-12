# SlideForge Pedagogy Architecture & Activity Catalogue

**Status:** Living Design Specification  
**Scope:** Transforming SlideForge into a high-premium, evidence-based pedagogy presentation application  
**Future Capability:** Context-aware "Select Element → Generate Pedagogical Slide/Activity" workflow  
**Related Specs:** [`54-pedagogical-activities-guide.md`](54-pedagogical-activities-guide.md) (Complete Plain-English Guide) · [`codebase-modernization.md`](codebase-modernization.md) · [`game-adaptation.md`](game-adaptation.md) · [`game-playbook.md`](game-playbook.md)

---

## 1. Executive Summary & Vision

SlideForge bridges static slide decks with live interactive audience engagement. By embedding structured pedagogical approaches directly into the authoring workflow, presentations shift from passive lectures to active, cognitive learning cycles: **Activate → Construct → Collaborate → Check → Reflect**.

This specification documents:
1. **The 54 Pedagogical Activities** spanning 11 instructional phases, grounded in premier research frameworks (**Rosenshine's Principles of Instruction**, **EEF - Education Endowment Foundation**, **Voice 21 Oracy**, **AFT**, **CIRL**, and **Franklin Sixth Form visible thinking**).
2. **The 4 Unified Execution Archetypes** that execute these 54 activities on top of SlideForge's existing, verified runtimes without engine bloat.
3. **The "Select Element → Generate Pedagogical Slide" Model**, allowing an educator to highlight any keyword, bullet point, formula, or statement and immediately generate an aligned interactive teaching moment.

---

## 2. The "Select Element → Generate Activity" Interaction Model

In upcoming versions, authors can highlight or select any content node on the canvas (a heading, keyword definition, bullet point, table row, or quote) and trigger a context-sensitive **Pedagogical Action Menu**:

```
Selected Content Element (e.g. "Mitochondria: site of aerobic respiration")
                     │
                     ▼
       ┌───────────────────────────┐
       │ Pedagogical Action Menu   │
       ├───────────────────────────┤
       │ ⚡ Check Misconception    │ ──► Generates 'True/False Showdown' or 'Spot the Error'
       │ ✳ Activate Schema         │ ──► Generates 'Word Splash' (Word Cloud) or 'Think-Pair-Share'
       │ ↺ Retrieval Practice     │ ──► Generates 'Quick Retrieval Quiz' (Low-Stakes)
       │ ⇄ Compare & Contrast      │ ──► Generates 'Venn Compare' with paired concept
       │ 💬 Oracy / Discussion     │ ──► Generates 'Question Cube' or 'Whiteboards on Walls'
       │ ⏱ Timed Wait Protocol    │ ──► Injects Rosenshine 5-second Strategic Wait Time moment
       └───────────────────────────┘
```

### Context-Aware Heuristics:
- **Key Term / Definition Node**: Recommends *Word Splash* (wordcloud), *Definition Challenge* (passage recall), *Concept Card Sort* (order), or *Emoji Guess*.
- **Factual Statement / Bullet**: Recommends *True/False Showdown*, *Spot the Error*, or *Diagnostic Question*.
- **Complex Process / Mechanism**: Recommends *Worked Example Analysis* (dual-coding split), *I Do, We Do, You Do* (scaffolded cards), or *Concept Chain* (relational linking).
- **Controversial / Multi-Perspective Statement**: Recommends *Think-Pair-Share*, *Socratic Seminar*, *Benefits vs Limitations Battle*, or *Four-Corner Reflection*.
- **Lesson Section End**: Recommends *3-2-1 Exit Ticket* (poll/brainstorm), *Reflection Ladder* (1–5 scale), *Muddiest Point*, or *Plus-Minus-Interesting (PMI)*.

---

## 3. Touchpoints & Existing Architecture

SlideForge already possesses the underlying engines required for this suite:

| File Path | Lines | Architectural Role |
|---|---|---|
| `js/studio.js` | 464–560 | **Activity Modal & Catalogue**: `activities` registry and `drawLibrary(filter)` rendering cards, tags, and category tabs. |
| `js/studio.js` | 53–170 | **Slide Starters**: `starters` array defining one-click structural slide shapes (`keywords`, `cards`, `split`, `steps`, `quote`). |
| `js/studio.js` | 204–461 | **Content Seeds & Presets**: `presets` delivering worked content examples rather than empty, unhelpful blanks. |
| `js/playbook.js` | 16–120+ | **Pedagogical Playbook**: Rules, aims, participant groupings, and timing guidelines. |
| `index.html` | 110–125 | **Learning Loop Toolbar**: The `01 Teach → 02 Check → 03 Discuss → 04 Adapt` stage bar. |
| `js/lesson-moments.js` | 4–55 | **Live Teaching Protocols**: `SF.LessonMoments` broadcasting timed micro-activities (Wait Time, Think-Pair-Share, Breaks) to the projector. |
| `presenter.html` / `js/presenter-live.js` | 50–90 / 5–35 | **Presenter Desk**: Displays pedagogical teacher notes, research rationales, stage countdowns, and room pulse. |
| `css/studio.css` | 55–65 | **Card & Modal Styling**: `.activity-modal`, `.activity-card`, and badge rules. |
| `js/lessons.js` | 15–95 | **Full Lesson Archetypes**: Multi-slide pedagogical sequences demonstrating research-backed arcs. |

---

## 4. The 4 Unified Execution Archetypes

All 54 activities resolve into four underlying runtime primitives:

### Archetype A: Slide Starters & Structured Layouts
- **Output**: Generates authored presentation slides (`SF.makeSlide(layout)`).
- **Layouts**: `cards` (3-column comparison), `split` (dual-coding graphic/text), `keywords` (vocabulary/definitions), `table` (rubrics/matrices), `content` (numbered steps).
- **Examples**: Clear Objectives Slide, Worked Example Analysis, I Do We Do You Do, Plus-Minus-Interesting (PMI), Daily Review Routine, Dialogue Chain Discussion.

### Archetype B: Audience Relay / Real-Time Feedback
- **Output**: Attaches a real-time audience response prompt to a slide (`slide.feedback = SF.makeFeedback(kind)`).
- **Engines**: `poll` (multiple options / Four Corners), `wordcloud` (word splash / schema web), `brainstorm` (open suggestions / muddiest point), `scale` (confidence ladder).
- **Examples**: Word Splash, Exit Ticket (3-2-1), Reflection Ladder, Muddiest Point, Question Cube.

### Archetype C: Interactive Check & Game Engines
- **Output**: Inserts a standalone interactive check slide (`type: 'game'`) or board engine.
- **Engines**: `choice` (MCQ / diagnostic), `truefalse` (showdown), `type` (cued recall / fill-in-blanks), `order` (ranking / card sort), `oddone` (misconceptions), `compare` (Venn comparisons), `conceptchain` (concept connections), `lowstakes` (paper retrieval board).
- **Examples**: Quick Retrieval Quiz, Diagnostic Question, Rapid Fire T/F, Concept Card Sort, Compare & Contrast Venn, Connect Four.

### Archetype D: Live Teaching Protocols & Lesson Moments
- **Output**: Injects a timed presentation moment or slide carrying structured speaker notes and automated HUD timers via `SF.LessonMoments`.
- **Mechanics**: Time-boxed countdowns (e.g. 3–5s wait time, 2m think, 3m pair, 12m whiteboard), stage prompts, and private presenter guidance.
- **Examples**: Think-Pair-Share, Strategic Wait Time Questioning, Whiteboards on Walls, Socratic Seminar, Jigsaw Groups.

---

## 5. Data Architecture (`src/types.d.ts`)

```typescript
export type PedagogyPhase =
  | 'starter'       // Starter Activity & Starter Slide
  | 'activation'    // Activation Phase
  | 'construction'  // Construction Phase & Mini Activity
  | 'collaboration' // Collaboration Phase & Main Activity
  | 'check'         // Mini Quiz & Formative Checks
  | 'reflection';   // Reflection Phase & Plenary

export type PedagogyTargetType = 'starter-slide' | 'feedback' | 'game' | 'moment';

export interface PedagogyActivity {
  id: string;
  title: string;
  category: string;             // e.g. "🎯 Starter Activity", "👥 Collaboration Phase"
  phase: PedagogyPhase;
  blurb: string;
  durationMinutes: number;
  research?: string;            // e.g. "Rosenshine", "EEF", "Voice 21", "AFT"
  tags: string[];               // e.g. ['retrieval', 'recall', 'memory']
  targetType: PedagogyTargetType;
  engineStyle?: string;         // 'choice', 'truefalse', 'lowstakes', 'conceptchain', etc.
  feedbackKind?: string;        // 'poll', 'wordcloud', 'brainstorm', 'scale'
  slideLayout?: string;         // 'cards', 'split', 'keywords', 'table', 'content'
  seedContent?: any;
  presenterGuidance?: string;   // Pedagogical cues displayed in speaker notes
}

export interface PedagogyRecommendationContext {
  elementType: 'heading' | 'keyword' | 'bullet' | 'table-row' | 'quote' | 'image';
  text: string;
  surroundingContext?: string[];
}
```

---

## 6. Complete 54-Activity Master Catalogue

| Category | Activity Name | Time | Research Foundation | Target Type | Engine / Layout Primitive | Element Trigger Context |
|---|---|---|---|---|---|---|
| 🎯 Starter | Quick Retrieval Quiz | 7m | Spaced Retrieval (EEF) | Game | `style: 'lowstakes'` | Selection of 3+ prior key terms |
| 🎯 Starter | Think-Pair-Share | 7m | Oracy (Voice 21) | Moment | Timed 2m/3m/2m moment protocol | Open prompt or discussion question |
| 🎯 Starter | Hook & Predict | 7m | Inquiry-Based Learning | Slide | `layout: 'split'` (Stimulus + Wonder) | Image, chart, or intriguing statistic |
| 🎯 Starter | Word Splash | 7m | Schema Activation (AFT) | Feedback | `feedback: 'wordcloud'` | Core unit keyword or topic title |
| 🎯 Starter | Daily Review Routine | 8m | Rosenshine (Prin. 1), EEF | Slide | `layout: 'cards'` (Homework/Reteach/Recall) | Homework recap or prior error note |
| 🎯 Starter | Establish Talk Ground Rules | 10m | Voice 21 Accountable Talk | Slide | `layout: 'keywords'` (Oracy norms) | Start of unit or group project |
| ⚡ Mini | Worked Example Analysis | 10m | Cognitive Load (Sweller) | Slide | `layout: 'split'` (Example + Steps) | Completed problem, code, or formula |
| ⚡ Mini | Error Analysis | 10m | Misconception Remediation | Game | `style: 'oddone'` or `spot-the-error` | Common mistake or student error sample |
| ⚡ Mini | Quick Practice Stations | 10m | Rotation Learning | Slide | `layout: 'cards'` (Recall, Apply, Create) | Multi-tiered task description |
| ⚡ Mini | Concept Card Sort | 10m | Categorization & Structure | Game | `style: 'order'` (Categorical sort) | List of terms, categories, or steps |
| ⚡ Mini | Interleaving Mixed Practice | 15m | CIRL, EEF Spaced Learning | Game | `style: 'choice'` (Spaced pool) | Multi-week review problem set |
| ⚡ Mini | Strategic Wait Time Questioning | 10m | Rosenshine (Prin. 3, 6) | Moment | Micro-timer (3–5s wait protocol) | High-order diagnostic question |
| 📚 Main | Guided Inquiry Investigation | 30m | 5E Instructional Model | Slide Arc | 4 slides: Explore → Explain → Elaborate → Share | Open research inquiry or lab prompt |
| 📚 Main | Jigsaw Expert Groups | 29m | Aronson Jigsaw Technique | Moment | 3-stage timer (5m Home, 15m Expert, 9m Return) | Multi-part text or complex case study |
| 📚 Main | Problem-Based Learning | 35m | Authentic Inquiry Task | Slide | `layout: 'split'` (Problem + Scaffolding) | Real-world scenario or dilemma |
| 📚 Main | Differentiated Practice Menu | 25m | Tomlinson Differentiation | Slide | `layout: 'cards'` (Consolidate/Apply/Extend) | Leveled problem options |
| 📚 Main | Design & Create Task | 35m | Constructionism (Papert) | Slide | `layout: 'cards'` (Criteria + Deliverables) | Artifact brief (poster, model, pitch) |
| 🎓 Plenary | Exit Ticket | 5m | Dylan Wiliam, EEF | Feedback | `feedback: 'poll'` or `feedback: 'brainstorm'` | 3-2-1 prompt or closing slide |
| 🎓 Plenary | Recap Quiz Game | 6m | Gamified Review Fluency | Game | `style: 'speed'` or `race` | Review question battery |
| 🎓 Plenary | Teach Someone | 8m | Protégé Effect / Peer Tutoring | Moment | Timed partner explanation (4m each) | Key concept summary or synthesis |
| 🎓 Plenary | Visual Summary | 8m | Dual Coding (Paivio) | Slide | `layout: 'cards'` (Mind map / sketch stems) | Summary takeaways |
| 🎓 Plenary | Reflection Ladder | 9m | Metacognition (EEF) | Feedback | `feedback: 'scale'` (1: Help → 5: Teach) | Self-assessment confidence rating |
| 🚀 Activation | Do Now / Bell Ringer | 8m | Classroom Routine (Lemov) | Moment | Silent countdown on entry | Opening problem on board |
| 🚀 Activation | Knowledge Activation Web | 7m | Schema Building | Feedback | `feedback: 'wordcloud'` | Central brainstorming theme |
| 🚀 Activation | Pre-Assessment Quickfire | 8m | Diagnostic Baseline | Game | `style: 'truefalse'` (8 rapid statements) | Baseline diagnostic assertions |
| 🏗️ Construction | I Do, We Do, You Do | 20m | Gradual Release of Responsibility | Slide | `layout: 'cards'` (Model, Guided, Independent) | Multi-step technique or algorithm |
| 🏗️ Construction | Concept Development | 20m | Direct Instruction (Rosenshine) | Slide | `layout: 'keywords'` (Concept, Non-Examples) | Formal definition and boundaries |
| 🏗️ Construction | Flipped Instruction | 25m | Flipped Classroom | Slide Arc | Review → Deep Dive → Application | Pre-assigned reading or video note |
| 🏗️ Construction | Question Cube - Six Types | 20m | Rosenshine Questioning Matrix | Feedback | `feedback: 'brainstorm'` (Define, Why, What If) | Core topic under deep interrogation |
| 👥 Collaboration | Think-Pair-Square-Share | 13m | Progressive Oracy (Voice 21) | Moment | 2m Think → 4m Pair → 4m Square → 3m Share | Complex ethical or strategic dilemma |
| 👥 Collaboration | Jigsaw Collaboration | 20m | Cooperative Peer Learning | Moment | Home → Expert → Return loop | Multi-source historical/scientific texts |
| 👥 Collaboration | Peer Teaching Carousel | 20m | Gallery Walk / Station Rotation | Moment | 4 × 5m station rotation timer | 4 distinct problems posted in room |
| 👥 Collaboration | Socratic Seminar (Simple) | 20m | Socratic Dialogue | Moment | 10m Inner circle / 10m Outer critique | Ambiguous text, policy, or case study |
| 👥 Collaboration | Dialogue Chain Discussion | 15m | Accountable Talk Connectors | Slide | `layout: 'cards'` (Sentence stems) | Class debate or structured discussion |
| 👥 Collaboration | Real-World Connection Hunt | 15m | Knowledge Transfer | Feedback | `feedback: 'brainstorm'` | Abstract scientific or mathematical rule |
| 👥 Collaboration | Explanation Champion | 15m | Precise Articulation | Game | `style: 'headsup'` (Banned-words challenge) | Key technical vocabulary term |
| 👥 Collaboration | Compare & Contrast Venn | 15m | Graphic Organizer (Marzano) | Game | `style: 'compare'` (Alike vs Differ) | Two related theories, systems, or terms |
| 👥 Collaboration | Benefits vs Limits Battle | 15m | Balanced Critical Thinking | Slide | `layout: 'split'` (Pros team vs Cons team) | Proposed policy, technology, or method |
| 👥 Collaboration | Scenario Analysis Discussion | 18m | Situated Cognition | Slide | `layout: 'split'` (Scenario + Guiding Questions) | Realistic case study vignette |
| 👥 Collaboration | Whiteboards on Walls | 12m | Franklin 6th Form / Voice 21 | Moment | 12m visible thinking timer (1 pen / trio) | High-order synthesis problem |
| 👥 Collaboration | Connect Four - Concept | 20m | Relational Association | Game | `style: 'conceptchain'` | Vocabulary pool with hidden connections |
| 🤔 Reflection | Four-Corner Reflection | 12m | Kinesthetic Survey | Feedback | `feedback: 'poll'` (4 confidence corners) | Stance on a thesis or mastery level |
| 🤔 Reflection | Learning Log Entry | 10m | Reflective Journaling | Slide | `layout: 'content'` (New Learning/Challenges) | End-of-class reflective writing |
| 🤔 Reflection | Muddiest Point | 13m | Formative Assessment (Angelo/Cross) | Feedback | `feedback: 'brainstorm'` | Complex technical lecture summary |
| 🤔 Reflection | Plus-Minus-Interesting (PMI) | 10m | Edward de Bono Thinking Hats | Slide | `layout: 'cards'` (Plus [+], Minus [−], Interesting [?]) | Evaluation of an experiment or proposal |
| 🎬 Plenary Phase | Exit Ticket (Plenary) | 5m | Hinge-Point Verification | Feedback | `feedback: 'poll'` | Final check before departure |
| 🎬 Plenary Phase | Preview Next Lesson | 7m | Cognitive Bridging | Slide | `layout: 'section'` (Next Inquiry + Prep Task) | Forward-looking teaser and homework |
| 🖼️ Starter Slide | Clear Objectives Slide | 2m | Goal Intentionality | Slide | `layout: 'keywords'` (Objectives + Criteria) | Lesson learning outcomes |
| 🖼️ Starter Slide | Hook + Objectives | 2m | Attention & Relevance | Slide | `layout: 'split'` (Hook stimulus + Big Question) | Driving question and lesson plan |
| 🖼️ Starter Slide | Connection Slide | 2m | Spiral Curriculum (Bruner) | Slide | `layout: 'cards'` (Yesterday → Today → Tomorrow) | Curriculum roadmap |
| ❓ Mini Quiz | Multiple Choice Quiz | 6m | Retrieval Practice | Game | `style: 'choice'` | Mid-lesson check question |
| ❓ Mini Quiz | True/False Rapid Fire | 5m | Fluency Under Time Pressure | Game | `style: 'truefalse'` | Misconception check |
| ❓ Mini Quiz | Short Answer Check | 8m | Unassisted Recall | Game | `style: 'type'` | Key definition or value |
| ❓ Mini Quiz | Diagnostic Question | 7m | Hinge-Point Misconception | Game | `style: 'choice'` (Research distractor analysis) | Hinge question deciding next path |

---

## 7. Implementation Blueprint for Contextual Element Generation

When a user selects text or a block element in the editor and chooses a pedagogical approach, the transformation pipeline executes:

```javascript
/**
 * Ingests a selected element and transforms it into the requested pedagogical activity.
 * @param {PedagogyActivity} act - Chosen pedagogical activity template
 * @param {PedagogyRecommendationContext} ctx - Selected element and content
 */
function generateSlideFromSelection(act, ctx) {
  var term = ctx.text.trim();
  
  switch (act.targetType) {
    case 'starter-slide': {
      var s = SF.makeSlide(act.slideLayout || 'content');
      s.title = act.title + ': ' + term;
      if (act.slideLayout === 'split') {
        s.bullets = ['Key Feature: ' + term, 'What do you notice?', 'What do you wonder?'];
      } else if (act.slideLayout === 'cards') {
        s.bullets = [
          'Recall: What is the core definition of ' + term + '?',
          'Apply: Where do we see ' + term + ' in action?',
          'Evaluate: What are the limitations or edge cases?'
        ];
      }
      s.notes = '【PEDAGOGICAL APPROACH: ' + act.title + '】\n' +
                (act.research ? 'Research Foundation: ' + act.research + '\n\n' : '\n') +
                (act.presenterGuidance || 'Encourage students to justify their thinking.');
      SF.Editor.insertStarter(s);
      break;
    }

    case 'feedback': {
      var targetSlide = SF.Editor.selectedSlide();
      if (!targetSlide || targetSlide.type === 'game') targetSlide = SF.Editor.addSlide('section');
      SF.Editor.attachFeedback(act.feedbackKind, {
        prompt: act.feedbackKind === 'wordcloud'
          ? 'In one word, what connects to ' + term + '?'
          : 'Reflect on: ' + term,
        options: act.feedbackKind === 'poll'
          ? ['Confident', 'Need Practice', 'Unsure']
          : undefined
      });
      break;
    }

    case 'game': {
      SF.Editor.insertNewGame(act.engineStyle, {
        title: act.title + ' · ' + term,
        seed: {
          question: 'Regarding ' + term + ', which statement is accurate?',
          options: ['Core principle holds', 'Alternative distractor'],
          correct: 0,
          explanation: 'Evidence-based rationale for ' + term + '.'
        },
        settings: { defaultTime: act.durationMinutes * 60 }
      });
      break;
    }

    case 'moment': {
      var momentSlide = SF.makeSlide('section');
      momentSlide.title = act.title;
      momentSlide.subtitle = term + ' (' + act.durationMinutes + ' mins)';
      momentSlide.notes = '【TIMED CLASSROOM PROTOCOL】\n' +
                          'Duration: ' + act.durationMinutes + ' minutes\n' +
                          (act.research ? 'Evidence: ' + act.research + '\n\n' : '\n') +
                          (act.presenterGuidance || '');
      SF.Editor.insertStarter(momentSlide);
      break;
    }
  }
}
```

---

## 8. Reference Code Implementation: How the 54 Activities & AI Engine are Constructed

The source implementation originates from `/Users/m.martin/Desktop/My Applications/activity-catalog-app copy`. Below are concrete code samples illustrating how the catalogue, deterministic generator, AI orchestration (Google Gemini), prompt guardrails, and slide rendering are built.

### 8.1 Activity Template Schema (`lib/templates/types.ts`)

Every activity is declared as a strongly typed data object containing instructional steps, resources, success criteria, and metacognitive questioning stems:

```typescript
export interface ActivityTemplate {
  name: string;
  duration: number;                  // Classroom duration in minutes
  description: string;               // Concise pedagogical summary
  steps: string[];                   // Chronological teacher & student steps
  materials?: string[];              // Physical and digital requisites
  successCriteria?: string;          // Formative observable criteria
  keywords?: string[];               // Primary conceptual tags
  keywordDrivenPrompts?: string[];   // Dynamic discussion questions
  aiActivities?: string[];           // Prompts for AI extension
  learningOutcome?: string;          // Target capability
  metacognitivePrompts?: {           // EEF Metacognition Framework
    planning?: string[];             // "What is my goal? What strategy will I use?"
    monitoring?: string[];           // "Is my explanation working? Am I stuck?"
    evaluating?: string[];           // "What did I learn? What would I change next time?"
  };
}

export interface PhaseTemplateLibrary {
  [phaseKey: string]: ActivityTemplate[];
}
```

### 8.2 Real Template Samples (`lib/templates/starter-activity.ts` & `collaboration.ts`)

#### Starter: Quick Retrieval Quiz (Rosenshine Prin. 1 / Spaced Retrieval)
```typescript
{
  name: "Quick Retrieval Quiz",
  duration: 7,
  description: "Answer 3-5 questions from memory, self-check immediately",
  keywords: ["retrieval", "recall", "memory", "spaced practice", "self-assessment"],
  steps: [
    "Display 3-5 retrieval questions on board (30 secs)",
    "Individual silent recall - no notes (3 mins)",
    "Pair check & discuss differences (2 mins)",
    "Self-mark with green pen using teacher answer key (1.5 mins)"
  ],
  materials: ["Retrieval question bank", "Green pens for self-marking"],
  successCriteria: "Students identify areas of strong recall and topics requiring review",
  learningOutcome: "Students reinforce memory pathways for key concepts",
  metacognitivePrompts: {
    planning: ["Which questions do I feel most confident about?"],
    monitoring: ["Am I retrieving from memory or guessing?"],
    evaluating: ["Which concepts need further revision?"]
  }
}
```

#### Collaboration: Whiteboards on Walls (Franklin Sixth Form / Visible Thinking)
```typescript
{
  name: "Whiteboards on Walls",
  duration: 12,
  description: "Small groups solve a multi-step problem standing at vertical whiteboards; 1 pen per trio",
  keywords: ["visible thinking", "vertical whiteboards", "collaboration", "accountable talk"],
  steps: [
    "Assign trios to vertical whiteboard stations with exactly 1 marker pen (1 min)",
    "Display challenging synthesis problem (1 min)",
    "Trios collaborate: 1 scribe, 2 directors/challengers, rotating pen every 3 mins (8 mins)",
    "Gallery walk: Rotate and view neighboring board solutions (2 mins)"
  ],
  materials: ["Dry-erase wall whiteboards", "Whiteboard markers (1 per group)", "Synthesis prompt"],
  successCriteria: "All 3 students actively vocalize reasoning; solution demonstrated visually",
  learningOutcome: "Students externalize reasoning and co-construct problem solutions"
}
```

---

### 8.3 Deterministic Keyword Content Generator (`lib/activity-content-generator.ts`)

When running offline or without an active AI key, the application uses a deterministic slot-filling engine seeded by keyword hashes:

```typescript
const STEP_TEMPLATES = {
  retrieval: [
    "Students recall 3 key facts about {k1}",
    "Quick quiz: 5 questions about {k1} and {k2}",
    "Think-pair-share: What is {k1}?"
  ],
  explanation: [
    "Teacher explains the concept of {k1}",
    "Show diagram/visual of {k1}",
    "Compare {k1} with {k2}"
  ],
  practice: [
    "Students work through examples of {k1}",
    "Pairs practice explaining {k1} to each other",
    "Apply {k1} to solve 3 problems"
  ]
};

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function generateActivitySteps(templateName: string, keywords: string[]): string[] {
  const seed = hashString(keywords.join('-') || templateName);
  const k1 = keywords[0] || 'the core concept';
  const k2 = keywords[1] || 'related principles';

  return STEP_TEMPLATES.retrieval.map(tpl =>
    tpl.replace(/{k1}/g, k1).replace(/{k2}/g, k2)
  );
}
```

---

### 8.4 AI Engine Architecture: Google Gemini Client (`lib/ai-service/core/gemini-client.ts`)

The AI service utilizes Google Gemini (`gemini-2.5-flash`) via direct REST streaming with burst rate limiting and fallback queues:

```typescript
export class GeminiClient {
  private apiKey: string | null = null;
  private readonly geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/';
  private readonly geminiModel = 'gemini-2.5-flash';
  private requestQueue: Map<string, number[]> = new Map();

  public async makeRequest(prompt: string, maxTokens: number = 4000, temperature: number = 0.7): Promise<string> {
    await this.rateLimit();
    const endpoint = `${this.geminiUrl}${this.geminiModel}:generateContent?key=${this.apiKey}`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  }
}
```

#### Token Limits and Temperatures Config (`lib/ai-service/types.ts`)
```typescript
export const TOKEN_LIMITS = {
  ACTIVITY_TAILORING: 8000,
  SLIDE_GENERATION: 4000,
  QUIZ_GENERATION: 3000,
  KEYWORD_GENERATION: 5000,
  STEP_ENRICHMENT: 2000,
  GAME_GENERATION: 6000
} as const;

export const TEMPERATURES = {
  CREATIVE: 0.8,  // Used for brainstorming and slide prose
  BALANCED: 0.7,  // Used for step tailoring and discussions
  PRECISE: 0.5   // Used for true/false quizzes and multiple choice
} as const;
```

---

### 8.5 Pedagogical Classification Engine (`lib/ai-service/classification/activity-classifier.ts`)

Before prompting the LLM, the system classifies the selected activity to apply specific pedagogical guardrails:

```typescript
export function classifyActivity(activityName: string, activityDescription: string): ActivityClassification {
  const text = `${activityName} ${activityDescription}`.toLowerCase();

  if (text.includes('worked example') || text.includes('example analysis')) {
    return { type: 'worked_example', requiresContent: true, isReview: false, needsTeaching: true, suggestTermsField: false };
  }
  if (text.includes('error analysis') || text.includes('spot the error')) {
    return { type: 'error_analysis', requiresContent: true, isReview: false, needsTeaching: true, suggestTermsField: false };
  }
  if (text.includes('retrieval') || text.includes('quiz') || text.includes('review') || text.includes('exit ticket')) {
    return { type: 'review', requiresContent: false, isReview: true, needsTeaching: false, suggestTermsField: false };
  }
  if (text.includes('think-pair-share') || text.includes('socratic') || text.includes('jigsaw')) {
    return { type: 'discussion', requiresContent: false, isReview: false, needsTeaching: true, suggestTermsField: true };
  }
  return { type: 'standard', requiresContent: false, isReview: false, needsTeaching: false, suggestTermsField: false };
}
```

---

### 8.6 Pedagogical Prompt Guardrails (`lib/ai-service/prompts/activity-guidance.ts`)

The AI engine injects mandatory structural rules into the prompt to guarantee rigorous classroom pedagogy:

#### 1. The "Teach First, Apply Second" Rule (User-Defined Terms)
```typescript
export function buildUserTermsGuidance(userTerms: TechnicalTerm[], count: number): string {
  return `
**CRITICAL PEDAGOGICAL REQUIREMENT: TEACHING CONTENT NEEDED FIRST**
The teacher specified terms that students must learn before discussion.
You MUST include ${count} TEACHING CONTENT SLIDES before any activity slides.

TERMS TO TEACH:
${userTerms.map((t, i) => `${i + 1}. ${t.term}: ${t.definition || 'Provide definition and relatable examples'}`).join('\n')}

REQUIRED FLOW:
1. Title Slide (Lesson Objectives)
2-${count + 1}. Content Teaching Slides (1 slide per term: Definition + 2 Real-World Examples)
${count + 2}+. Activity / Discussion Slides (NOW students can apply the concepts)

Pedagogical principle: Students cannot meaningfully discuss concepts they haven't learned yet!`;
}
```

#### 2. The "Error Artifact First" Rule (Error Analysis)
```typescript
export function buildErrorAnalysisGuidance(activityName: string): string {
  return `
**CRITICAL: THIS IS AN ERROR ANALYSIS ACTIVITY**
You MUST provide concrete sample work containing realistic student errors before asking for analysis!

Slide 2: Sample work with 3 deliberate errors (conceptual, procedural, calculation).
Slide 3: Side-by-side Answer Key: "Error → Correct Version → Why it occurred".
Slide 4+: Metacognitive Discussion: "What misconception caused this error? How can we spot it?"`;
}
```

---

### 8.7 Step Enrichment Generator (`lib/ai-service/generators/step-enricher.ts`)

Enriches a high-level step (e.g. "Step 2: Students analyze misconceptions") into concrete, actionable classroom content:

```typescript
export async function enrichStep(
  topic: string,
  currentStep: string,
  activityName: string
): Promise<{ teacherContext: string; subSteps: string[] }> {
  const prompt = `You are a classroom teaching assistant. Enrich this step with concrete classroom material:
Topic: "${topic}"
Activity: "${activityName}"
Current Step: "${currentStep}"

Generate a JSON object with:
1. "teacherContext": What the teacher says and executes in 2 sentences.
2. "subSteps": 3-5 specific questions, error statements, or items students engage with.

Example output for Error Analysis:
{
  "teacherContext": "Display the 3 statements on the projector and give students 2 minutes of silent think time.",
  "subSteps": [
    "Statement 1: 'The CPU stores files permanently when power is off' (ERROR) → CORRECT: CPU processes; SSD/HDD stores.",
    "Statement 2: 'RAM is volatile memory' (CORRECT) → Reinforce why RAM clears on power loss."
  ]
}`;

  const jsonStr = await geminiClient.makeRequest(prompt, TOKEN_LIMITS.STEP_ENRICHMENT, TEMPERATURES.BALANCED);
  return JSON.parse(jsonStr);
}
```

---

### 8.8 Slide Presentation Schema (`components/slides/SlideGenerator.tsx`)

The generated lesson slides conform to a clean JSON structure that renders directly in SlideForge:

```typescript
export interface Slide {
  type: 'title' | 'question' | 'content' | 'image' | 'timer';
  title?: string;
  subtitle?: string;
  question?: string;
  hint?: string;
  heading?: string;
  bullets?: string[];
  backgroundColor?: string;
  textColor?: string;
  fontSize?: 'small' | 'medium' | 'large' | 'xlarge';
  timerDuration?: number; // e.g. 180 seconds for individual think time
}
```

---

## 9. Summary of Benefits

1. **Evidence-Based Instruction**: SlideForge transitions from a standard slideshow maker into a curriculum-delivery system aligned with accredited teaching standards (EEF, Rosenshine, Voice 21).
2. **Zero Runtime Bloat**: All 54 activities reuse the 4 existing primitives (`slide`, `game`, `feedback`, `moment`).
3. **Low Authoring Friction**: Selecting a single word or sentence instantly yields a complete, structured interactive lesson sequence.
4. **Deterministic + AI Hybrid**: Fully functional offline via deterministic keyword slotting, with optional Google Gemini (`gemini-2.5-flash`) enrichment bounded by strict pedagogical guardrails.

