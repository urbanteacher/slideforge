/**
 * Activity-Specific Guidance Builders
 * Provides detailed guidance for different activity types in slide generation
 */

import { TechnicalTerm } from '../types';

// ============================================================================
// USER-DEFINED TERMS GUIDANCE
// ============================================================================

export function buildUserTermsGuidance(userTerms: TechnicalTerm[], recommendedSlideCount: number): string {
  return `

**🚨 CRITICAL PEDAGOGICAL REQUIREMENT: TEACHING CONTENT NEEDED**

**The teacher has specified key terms that students need to learn first.**

You MUST include **${recommendedSlideCount} TEACHING CONTENT SLIDES** before any discussion/activity slides.

**📚 TERMS TO TEACH:**

${userTerms.map((term, i) => `
${i + 1}. **${term.term}**${term.definition ? `
   → ${term.definition}` : `
   → Provide clear definition with examples`}${term.importance === 'critical' ? `
   ⚠️ CRITICAL - Essential knowledge for this lesson` : term.importance === 'important' ? `
   ⭐ IMPORTANT - Students should understand this well` : term.importance === 'helpful' ? `
   💡 HELPFUL - Useful context but not essential` : ''}`).join('\n')}

**REQUIRED SLIDE STRUCTURE:**

1. **Title Slide** - Activity name and clear learning objective

2-${recommendedSlideCount + 1}. **Content Teaching Slides** - ONE SLIDE PER TERM:
   For each term, create a dedicated slide that includes:
   • Clear, simple definition in student-friendly language
   • 2-3 concrete examples students can relate to
   • Real-world application or everyday analogy
   • Why it matters / How it connects to their lives

${recommendedSlideCount + 2}+. **Activity/Discussion Slides** - THEN the thinking/discussion questions

**TEACHING SLIDE TEMPLATE:**

{
  "type": "content",
  "heading": "[Term Name]: What You Need to Know",
  "bullets": [
    "Definition: [Simple, clear explanation]",
    "Example 1: [Concrete, relatable example]",
    "Example 2: [Another practical example]",
    "Why it matters: [Connection to student life]"
  ]
}

**THE PEDAGOGICAL FLOW MUST BE:**
✅ Teach (definitions/examples) → Apply (discussion/activities)

❌ NOT: Discuss unfamiliar terms → Confusion

**Remember:** Students cannot meaningfully discuss concepts they haven't learned yet!`;
}

// ============================================================================
// WORKED EXAMPLE GUIDANCE
// ============================================================================

export function buildWorkedExampleGuidance(activityName: string): string {
  return `

**🚨 CRITICAL: THIS IS A WORKED EXAMPLE ACTIVITY**

**"${activityName}" requires students to analyze an example.**

You MUST provide the actual example before asking students to analyze it!

**REQUIRED STRUCTURE:**

**Slides 2-3: THE WORKED EXAMPLE ITSELF**
- Show the complete, detailed example or scenario
- Walk through step-by-step with explanations
- Include all relevant details and data
- Use specific, concrete information (not placeholders)

**Slides 4-5: KEY CONCEPTS & DEFINITIONS**
- Define all technical terms used in the example
- Explain principles the example demonstrates
- Clarify any vocabulary students need

**Slides 6+: ANALYSIS QUESTIONS**
- NOW ask students to analyze what they just saw
- Questions should directly reference the example
- Guide students to identify patterns, key features

**YOU CANNOT ASK STUDENTS TO ANALYZE AN EXAMPLE WITHOUT PROVIDING IT FIRST!**`;
}

// ============================================================================
// ERROR ANALYSIS GUIDANCE
// ============================================================================

export function buildErrorAnalysisGuidance(activityName: string): string {
  return `

**🚨 CRITICAL: THIS IS AN ERROR ANALYSIS ACTIVITY**

**"${activityName}" requires students to find and fix mistakes.**

You MUST provide sample work with deliberate errors!

**REQUIRED STRUCTURE:**

**Slides 2-3: SAMPLE WORK WITH ERRORS**
- Show 3-5 worked problems/statements with deliberate mistakes
- Make errors realistic (common student misconceptions)
- Include variety: conceptual errors, procedural errors, calculation errors
- Label as "Error Version" or "Find the Mistake"

**Slide 4: ANSWER KEY WITH EXPLANATIONS**
- Show correct versions side-by-side
- Explain what was wrong and why
- Format: "Error: [what was wrong] → Correct: [what should be] → Why: [explanation]"

**Slides 5+: ANALYSIS DISCUSSION**
- Why might students make this mistake?
- How can you spot this type of error?
- What strategy prevents this error?

**EXAMPLE FOR MATH:**

Slide 2:
{
  "type": "content",
  "heading": "Find the Errors - Fractions",
  "bullets": [
    "Problem 1: 3/4 + 1/4 = 4/8",
    "Problem 2: 2/3 × 3/4 = 6/12 = 1/2",
    "Problem 3: 5/6 - 1/3 = 4/3",
    "Work in pairs: Find what's wrong in each problem"
  ]
}

Slide 3:
{
  "type": "content",
  "heading": "Answers & Why They're Wrong",
  "bullets": [
    "Error 1: Added numerators AND denominators. Correct: 3/4 + 1/4 = 4/4 = 1. Why: Same denominator, only add numerators",
    "Error 2: Correct answer but wrong method (cancelled before multiplying). Correct: 2/3 × 3/4 = 6/12 = 1/2. Why: Multiply first, then simplify",
    "Error 3: Didn't find common denominator. Correct: 5/6 - 2/6 = 3/6 = 1/2. Why: Need same denominator to subtract"
  ]
}

**YOU CANNOT ASK STUDENTS TO FIND ERRORS WITHOUT PROVIDING THE ERRONEOUS WORK!**`;
}

// ============================================================================
// SORTING GUIDANCE
// ============================================================================

export function buildSortingGuidance(): string {
  return `

**💡 SORTING/CATEGORIZATION ACTIVITY GUIDANCE**

This activity requires categories and items to sort.

**RECOMMENDED STRUCTURE:**

**Slide 2: THE CATEGORIES**
- Show 3-5 clear category headings
- Brief description of each category
- Example: "Living Things | Non-Living Things | Once-Living Things"

**Slide 3: THE ITEMS TO SORT**
- List 12-20 items that students will categorize
- Mix difficulty levels
- Include some tricky/debatable items for discussion

**Slide 4: ANSWER KEY (after sorting)**
- Show correct categorization
- Explain tricky cases
- Discuss why certain items fit certain categories

**EXAMPLE FOR CELL ORGANELLES:**

Slide 2:
{
  "type": "content",
  "heading": "Sort Into 3 Categories",
  "bullets": [
    "ENERGY: Organelles that produce or store energy",
    "TRANSPORT: Organelles that move materials in/out",
    "CONTROL: Organelles that manage cell activities",
    "You'll sort 15 organelles into these categories"
  ]
}

Slide 3:
{
  "type": "content",
  "heading": "Items to Sort (Work in pairs)",
  "bullets": [
    "Mitochondria, Chloroplast, Nucleus, Ribosome, Golgi Body",
    "Cell Membrane, ER, Vacuole, Lysosome, Cell Wall",
    "Cytoplasm, ATP, DNA, Vesicle, Centriole",
    "Discuss: Some fit multiple categories - pick the MAIN function"
  ]
}`;
}

// ============================================================================
// COMPARISON GUIDANCE
// ============================================================================

export function buildComparisonGuidance(userTerms?: TechnicalTerm[]): string {
  const term1 = userTerms?.[0]?.term || '[Concept A]';
  const term2 = userTerms?.[1]?.term || '[Concept B]';

  return `

**💡 COMPARISON ACTIVITY GUIDANCE**

This activity requires two concepts to compare.

**RECOMMENDED STRUCTURE:**

**Slide 2: CONCEPT A Explained**
- Clear definition
- Key features
- Examples
- When/why it's used

**Slide 3: CONCEPT B Explained**
- Clear definition
- Key features  
- Examples
- When/why it's used

**Slide 4: SIDE-BY-SIDE COMPARISON**
- Use table format in bullets: "Aspect | ${term1} | ${term2}"
- Show 3-5 comparison points
- Highlight key differences

**Slide 5: SIMILARITIES (Venn Overlap)**
- What do they have in common?
- Shared characteristics
- Related concepts

**Slide 6: DISCUSSION PROMPTS**
- When would you choose one over the other?
- What are advantages/disadvantages of each?
- Real-world application scenarios

**EXAMPLE FOR RAM vs ROM:**

Slide 2:
{
  "type": "content",
  "heading": "RAM (Random Access Memory)",
  "bullets": [
    "Definition: Temporary storage for active programs and data",
    "Fast read/write speed - constantly accessed by CPU",
    "Volatile - loses all data when power turns off",
    "Example: Running multiple apps on your phone uses RAM"
  ]
}

Slide 3:
{
  "type": "content",
  "heading": "ROM (Read-Only Memory)",
  "bullets": [
    "Definition: Permanent storage for essential startup instructions",
    "Slower than RAM - accessed only during boot",
    "Non-volatile - keeps data even when power is off",
    "Example: BIOS/UEFI firmware stored in ROM"
  ]
}

Slide 4:
{
  "type": "content",
  "heading": "RAM vs ROM: Key Differences",
  "bullets": [
    "Purpose | RAM: Active workspace | ROM: Permanent instructions",
    "Speed | RAM: Very fast | ROM: Slower",
    "Data persistence | RAM: Erases when off (volatile) | ROM: Keeps data (non-volatile)",
    "Can modify? | RAM: Yes (read/write) | ROM: No (read-only)"
  ]
}`;
}

// ============================================================================
// PRACTICE STATIONS GUIDANCE
// ============================================================================

export function buildPracticeStationsGuidance(): string {
  return `

**💡 PRACTICE STATIONS ACTIVITY GUIDANCE**

This activity requires 3 distinct tasks: Recall, Apply, Create.

**REQUIRED STRUCTURE:**

**Slide 2: OVERVIEW**
- Explain 3 stations and rotation timing
- Each station = 3-4 minutes
- Small groups rotate through all stations

**Slide 3: STATION 1 - RECALL**
- 4-6 quick retrieval questions
- Test memory of key facts/concepts
- Can be done individually or in pairs
- Format: "Answer these questions from memory"

**Slide 4: STATION 2 - APPLY**
- 2-3 problems that use the concepts
- Require students to apply knowledge to new situations
- Provide worked example if needed
- Format: "Use what you learned to solve these problems"

**Slide 5: STATION 3 - CREATE**
- 1 creative task that demonstrates understanding
- Could be: diagram, analogy, real-world example, explanation
- More open-ended than other stations
- Format: "Create something that shows your understanding"

**EXAMPLE FOR PHOTOSYNTHESIS:**

Slide 3:
{
  "type": "content",
  "heading": "Station 1: Recall (3 mins)",
  "bullets": [
    "1. What are the reactants of photosynthesis?",
    "2. Where in the cell does photosynthesis occur?",
    "3. What is the primary product of photosynthesis?",
    "4. What color light does chlorophyll absorb best?",
    "5. Name the two stages of photosynthesis"
  ]
}

Slide 4:
{
  "type": "content",
  "heading": "Station 2: Apply (3 mins)",
  "bullets": [
    "Problem 1: A plant is kept in a dark room for 2 days. What happens to photosynthesis? Why?",
    "Problem 2: Why do leaves turn yellow in fall? Connect to photosynthesis.",
    "Problem 3: How would photosynthesis change on a cloudy day vs sunny day?"
  ]
}

Slide 5:
{
  "type": "content",
  "heading": "Station 3: Create (4 mins)",
  "bullets": [
    "Create an analogy: If photosynthesis were a factory, what would each part do?",
    "Draw and label: The journey of one carbon atom through photosynthesis",
    "Real-world connection: Find 3 ways photosynthesis affects your daily life"
  ]
}`;
}

// ============================================================================
// QUESTION CUBE GUIDANCE
// ============================================================================

export function buildQuestionCubeGuidance(): string {
  return `

**💡 QUESTION CUBE (ROSENSHINE) GUIDANCE**

This activity uses 6 specific question types. Provide questions for each type.

**REQUIRED STRUCTURE:**

**Slide 2: THE 6 QUESTION TYPES**
- Show the 6 types students will explore
- Define: Compare, Why, Example, What-if, Benefits, Conditions

**Slides 3-8: ONE SLIDE PER QUESTION TYPE**

**DEFINE:** What is [concept]? Define it clearly.
**COMPARE:** How is [concept] similar to or different from [related concept]?
**WHY:** Why is [concept] important? Why does it work this way?
**EXAMPLE:** What are examples of [concept] in real life?
**WHAT IF:** What if [concept] didn't exist? What would happen?
**CONDITIONS:** What conditions are needed for [concept] to work?

**EXAMPLE FOR GRAVITY:**

Slide 3:
{
  "type": "content",
  "heading": "Define: What is Gravity?",
  "bullets": [
    "Gravity is the force that attracts objects with mass toward each other",
    "On Earth: Gravity pulls everything toward the planet's center",
    "Measured in Newtons (N) or as acceleration (9.8 m/s²)",
    "The more mass an object has, the stronger its gravitational pull"
  ]
}

Slide 4:
{
  "type": "content",
  "heading": "Compare: Gravity vs Magnetism",
  "bullets": [
    "Similarities: Both are invisible forces, both attract objects, both get weaker with distance",
    "Differences: Gravity works on all objects with mass, magnetism only on certain materials",
    "Difference: Gravity only attracts, magnetism can attract or repel",
    "Difference: Gravity is much weaker than magnetism at close range"
  ]
}

Slide 5:
{
  "type": "content",
  "heading": "Why: Why is Gravity Important?",
  "bullets": [
    "Keeps us on Earth's surface - we'd float away without it",
    "Keeps atmosphere in place - without it, no breathable air",
    "Keeps Moon orbiting Earth and Earth orbiting Sun",
    "Enables formation of planets, stars, and galaxies"
  ]
}`;
}

// ============================================================================
// HOOK & PREDICT GUIDANCE
// ============================================================================

export function buildHookPredictGuidance(): string {
  return `

**💡 HOOK & PREDICT ACTIVITY GUIDANCE**

This activity MUST include "What do you notice?" and "What do you wonder?" questions.

**REQUIRED STRUCTURE:**

**Slide 2: THE STIMULUS**
- Describe or show the intriguing image/video/demonstration
- Could be: surprising fact, puzzling image, short video clip, unexpected data
- Make it visually interesting and thought-provoking
- Note: If you can't embed images, describe what to show

**Slide 3: NOTICE & WONDER QUESTIONS**
- ALWAYS include these exact prompts:
  - "What do you notice?"
  - "What do you wonder?"
- These are the core of this activity type
- Students discuss in pairs, then share with class

**Slide 4: PREDICTIONS**
- Based on what they noticed and wondered
- "What do you predict will happen?"
- "Why do you think...?"
- Connect to today's learning objective

**EXAMPLE FOR DENSITY:**

Slide 2:
{
  "type": "content",
  "heading": "Watch This Surprising Demo",
  "bullets": [
    "Demo: Drop a can of regular Coke and a can of Diet Coke in water",
    "Regular Coke sinks to the bottom",
    "Diet Coke floats at the top",
    "Both cans are the same size and shape. Why different results?"
  ]
}

Slide 3:
{
  "type": "content",
  "heading": "Notice & Wonder (2 mins with partner)",
  "bullets": [
    "What do you notice? (Observations about what happened)",
    "What do you wonder? (Questions this raises for you)",
    "Share your observations: What patterns or details did you see?",
    "Share your questions: What are you curious about?"
  ]
}

Slide 4:
{
  "type": "content",
  "heading": "Make a Prediction",
  "bullets": [
    "What do you predict causes this difference?",
    "Why might one can float and the other sink?",
    "What property of the liquids might explain this?",
    "Today we'll explore DENSITY to answer this mystery"
  ]
}

**CRITICAL: Always include "What do you notice?" and "What do you wonder?" explicitly!**`;
}

