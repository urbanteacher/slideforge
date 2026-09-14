/**
 * Activity Tailoring Prompt Builder
 * Generates prompts for AI to customize activities to specific classroom contexts
 */

import { TailoredActivityRequest } from '../types';

// ============================================================================
// TAILORING PROMPT BUILDER
// ============================================================================

export function buildTailoringPrompt(request: TailoredActivityRequest): string {
  return `You are an expert teacher helping to customize a teaching activity for a specific classroom context.

**Activity Name:** ${request.activityName}
**Activity Description:** ${request.activityDescription}

**Original Steps:**
${request.originalSteps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

${request.originalMaterials ? `**Original Materials:**
${request.originalMaterials.map(m => `• ${m}`).join('\n')}` : ''}

**Teacher's Context:**
"${request.userContext}"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 YOUR MISSION: BRING THIS ACTIVITY TO LIFE!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Transform the generic template into a VIVID, SPECIFIC, READY-TO-USE activity that a teacher can implement tomorrow without any additional preparation.

**WHAT "BRINGING IT TO LIFE" MEANS:**

❌ GENERIC (TOO VAGUE):
"Students discuss the topic in pairs"

✅ VIVID (SPECIFIC & ENGAGING):
"Students examine 3 case studies: (1) Rosa Parks (Montgomery, 1955), (2) Greensboro Four (lunch counter, 1960), (3) John Lewis (Selma, 1965). In pairs, identify which protest tactics were used and debate: Which approach would you have taken?"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 HOW TO WRITE VIVID STEPS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. **NAME SPECIFIC CONTENT:**
   ❌ "Analyze primary sources"
   ✅ "Analyze 3 letters: Lincoln's Emancipation draft, a plantation owner's diary entry, and Frederick Douglass' speech excerpt"

2. **INCLUDE CONCRETE EXAMPLES:**
   ❌ "Identify patterns"
   ✅ "Notice patterns: How does the water cycle in the Amazon differ from the Sahara? Mark regions on your map."

3. **ADD PRECISE NUMBERS & DETAILS - INCLUDE THE ACTUAL CONTENT:**
   ❌ "Students answer questions"
   ❌ "Students complete the 'Photosynthesis Quiz' with 5 questions" (Don't just NAME a quiz - PROVIDE the questions!)
   ✅ "Answer 5 retrieval questions: (1) Define photosynthesis, (2) Name the reactants, (3) Where does it occur?, (4) What energy is needed?, (5) What is produced?"

4. **USE ENGAGING VERBS & SPECIFIC ACTIONS:**
   ❌ "Look at examples"
   ✅ "Compare side-by-side: a healthy cell vs. a cancerous cell—sketch 3 visible differences"

5. **EMBED TIMINGS & STRUCTURES:**
   ❌ "Pair discussion"
   ✅ "Think alone (2 mins): List 3 causes. Then pair-share (3 mins): Agree on top 2 causes and find 1 supporting fact"

6. **MAKE IT TOPIC-SPECIFIC:**
   - Extract key terms from the teacher's context and weave them throughout

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 CRITICAL RULE: PROVIDE CONTENT, DON'T JUST NAME IT!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When writing steps that involve questions, activities, or scenarios:

❌ WRONG: "Students complete the 'Photosynthesis Quick Quiz' with 4 questions"
✅ CORRECT: "Students answer 4 questions: (1) What is photosynthesis? (2) Where does it occur? (3) What are the inputs? (4) What are the outputs?"

**The teacher should NOT need to create any additional materials. Give them the ACTUAL questions, scenarios, data points, and examples in the step itself.**

**IMPORTANT: Respond with ONLY valid JSON. Do not include any markdown formatting, explanations, or code blocks.**

Provide your response in this exact JSON format:
{
  "tailoredSteps": ["step 1", "step 2", ...],
  "tailoredMaterials": ["material 1", "material 2", ...],
  "teachingTips": ["tip 1", "tip 2", "tip 3"],
  "adaptations": "Brief paragraph explaining the key adaptations made for this context"
}

**STEP REQUIREMENTS:**
- Each step must be VIVID and SPECIFIC (use concrete examples, named content, precise numbers)
- Include exact timings where relevant (e.g., "Think alone: 2 mins")
- **PROVIDE ACTUAL QUESTIONS/CONTENT inline - don't reference worksheets that don't exist**
- If students need to answer questions, LIST THE QUESTIONS in the step itself
- Keep each step as a SINGLE STRING without line breaks

**MATERIALS REQUIREMENTS:**
- Materials should only list PHYSICAL items needed (paper, markers, timers, projectors)
- Or EXISTING named resources (specific video titles, textbook pages, real websites)
- **DO NOT list hypothetical worksheets or quiz sheets that don't exist**
- If content is needed (questions, scenarios), put it IN THE STEPS, not as a "material"
- Keep each material as a SINGLE STRING without line breaks

**FORMATTING RULES:**
- Each array item MUST be a single continuous string
- NO line breaks within strings
- NO markdown bold/italic markers (**, *, etc.)
- Write in plain text only

**🚨 CRITICAL JSON FORMATTING:**
- Return ONLY valid JSON - no extra text before or after
- Use double quotes (") for all strings, never single quotes (')
- For apostrophes in contractions (it's, don't, can't): use straight apostrophes without escaping
- For emphasis, DO NOT use quotes around words - just write the word normally
  ❌ WRONG: "think about 'copyright' when using images"
  ✅ CORRECT: "think about copyright when using images"
- Escape any double quotes inside strings with backslash: \"
- NO line breaks inside string values
- Separate array items with commas
- NO trailing commas before closing brackets
- Ensure ALL brackets/braces are properly closed

**Example of CORRECT formatting:**
{
  "tailoredSteps": ["It's important to understand copyright when you're using images", "Don't forget to cite your sources"],
  "tailoredMaterials": ["Material 1", "Material 2"],
  "teachingTips": ["Tip 1", "Tip 2"],
  "adaptations": "Single paragraph of text"
}

Make this activity so vivid and specific that a substitute teacher could run it successfully tomorrow!`;
}

// ============================================================================
// MARKDOWN CLEANUP
// ============================================================================

export function cleanMarkdownFormatting(text: string): string {
  if (!text) return text;
  
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/^[•\-\*]\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

