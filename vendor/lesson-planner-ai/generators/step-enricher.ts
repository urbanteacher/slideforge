/**
 * Step Enrichment Generator
 * Enriches individual activity steps with specific classroom content
 */

import { GeminiClient } from '../core/gemini-client';
import { parseJSONResponse } from '../core/json-parser';
import { TOKEN_LIMITS, TEMPERATURES, StepEnrichmentResult } from '../types';

// ============================================================================
// STEP ENRICHER
// ============================================================================

export class StepEnricher {
  constructor(private client: GeminiClient) {}

  async enrichStep(
    topic: string,
    currentStep: string,
    previousSteps: string[] = [],
    activityName?: string,
    activityDescription?: string,
    additionalContext?: string
  ): Promise<StepEnrichmentResult> {
    const previousContext = previousSteps.length > 0
      ? `\n\nPrevious steps:\n${previousSteps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`
      : '';

    const activityContext = activityName && activityDescription
      ? `\n\nActivity: "${activityName}" - ${activityDescription}`
      : '';

    const contextInfo = additionalContext && additionalContext.trim()
      ? `\n\n📌 Focus: ${additionalContext}`
      : '';

    const prompt = `You are a classroom teaching assistant. Help enrich this lesson step with specific, actionable classroom instructions.

**CRITICAL: Return ONLY a JSON object. No markdown, no explanations.**

Topic: "${topic}"${contextInfo}
Current Step: "${currentStep}"${previousContext}${activityContext}

Generate:
1. **teacherContext**: What the teacher will actually do in the classroom (2-3 sentences)
2. **subSteps**: 3-5 items of ACTUAL CONTENT students will engage with, NOT procedural instructions

**ACTIVITY-SPECIFIC CONTENT RULES:**

📝 **Quick Retrieval Quiz / Recall Questions:**
- subSteps = Actual recall questions about "${topic}"
- Example: "What does CPU stand for?", "Name two components of a CPU"

🔍 **Hook & Predict / Notice & Wonder:**
- subSteps = MUST include "What do you notice?" and "What do you wonder?" questions
- Make them specific to "${topic}"
- Example: "What do you notice about how the CPU processes data?", "What do you wonder about CPU speed?"

❌ **Error Analysis / Spot the Error:**
- subSteps = Error statements WITH corrections
- Format: "[WRONG STATEMENT] → CORRECT: [RIGHT STATEMENT]"
- Example: "CPU stores data (ERROR) → CORRECT: CPU processes data, RAM/storage stores it"

🗂️ **Card Sort / Categorization:**
- subSteps = List of items TO BE SORTED (not the categories)
- Include 12-20 items that students will organize
- Example: "Mitochondria", "Nucleus", "Cell Wall", "Ribosomes", "Chloroplast"...

⚖️ **Compare & Contrast / Venn:**
- subSteps = Key comparison points between two concepts
- Format: "Aspect: [Concept A] vs [Concept B]"
- Example: "Speed: RAM is fast, ROM is slow", "Data retention: RAM is volatile, ROM is non-volatile"

🎯 **Practice Stations:**
- subSteps = Provide actual tasks for Recall, Apply, and Create stations
- Label each: "Station 1 - Recall: [tasks]", "Station 2 - Apply: [tasks]", "Station 3 - Create: [task]"

❓ **Question Cube:**
- subSteps = Provide the 6 question types with specific questions
- Format: "Define: [question]", "Compare: [question]", "Why: [question]", "Example: [question]", "What If: [question]", "Conditions: [question]"

💬 **Think-Pair-Share / Discussion:**
- subSteps = Discussion prompts or scenarios
- Example: "How would a slower CPU affect gaming performance?", "Compare single-core vs multi-core processors"

📚 **Word Splash / Vocabulary:**
- subSteps = Key vocabulary terms (not questions)
- Example: "Processor", "Clock Speed", "Cache Memory", "Cores"

**GENERAL RULES:**
- DO NOT invent specific resources that don't exist
- Use generic descriptions: "Show a video about...", "Display an image of...", "Find a diagram showing..."
- If specific content needed, suggest where to find it (YouTube, textbook, school resources)
- Tailor to the Focus if provided

Return JSON: {"teacherContext": "...", "subSteps": ["...", "..."]}`;

    const content = await this.client.makeRequest(prompt, TOKEN_LIMITS.STEP_ENRICHMENT, TEMPERATURES.BALANCED);

    return parseJSONResponse<StepEnrichmentResult>(
      content,
      (data) => {
        if (!data.teacherContext || !data.subSteps) {
          throw new Error('Missing required fields');
        }
        return {
          teacherContext: data.teacherContext,
          subSteps: Array.isArray(data.subSteps) ? data.subSteps : [],
        };
      },
      'Step Enrichment'
    );
  }
}

