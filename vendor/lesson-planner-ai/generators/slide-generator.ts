/**
 * Slide Generation Orchestrator
 * Coordinates slide generation with validation
 */

import { GeminiClient } from '../core/gemini-client';
import { parseJSONResponse } from '../core/json-parser';
import { validateSlides } from '../validators/slide-validator';
import { buildSlidePrompt } from '../prompts/slide-prompts';
import { cleanMarkdownFormatting } from '../prompts/tailoring-prompts';
import { TOKEN_LIMITS, TEMPERATURES, Slide, TechnicalTerm } from '../types';

// ============================================================================
// SLIDE GENERATOR
// ============================================================================

/**
 * REFERENCE: Correct Structure for Retrieval Quiz Activities
 * 
 * CRITICAL RULES:
 * 1. ALL questions must appear on ONE slide (not split across multiple slides)
 * 2. Questions should be numbered 1, 2, 3, 4 (never start at 3!)
 * 3. If there are 4+ questions, they ALL go on slide 2 (after title)
 * 4. Timer slide comes after questions
 * 5. Answer slide must include answers to ALL questions asked
 * 6. Never use "(Continued)" - put all questions together
 * 7. Ensure all answer text is COMPLETE (no truncation mid-sentence)
 * 
 * Example Structure:
 * Slide 1: Title - "Quick Retrieval Quiz"
 * Slide 2: Questions - All 4 questions numbered 1-4
 * Slide 3: Timer - Individual recall time
 * Slide 4: Discussion - Pair work
 * Slide 5: Answers - Complete answers for all 4 questions
 * 
 * Validation Reference (implement if issues persist):
 * ```
 * private validateRetrievalQuizSlides(slides: Slide[]): void {
 *   const questionSlides = slides.filter(s => 
 *     s.bullets?.some(b => /^\d+\./.test(b))
 *   );
 *   
 *   const answerSlides = slides.filter(s =>
 *     s.bullets?.some(b => /^\*\*\d+\./.test(b))
 *   );
 *   
 *   if (questionSlides.length > 1) {
 *     throw new Error(
 *       'Retrieval quiz questions should be on ONE slide, not split. ' +
 *       `Found questions on ${questionSlides.length} slides.`
 *     );
 *   }
 *   
 *   if (questionSlides.length > 0 && answerSlides.length === 0) {
 *     throw new Error('Must include an answer slide after questions.');
 *   }
 *   
 *   // Check for incomplete answers
 *   for (const slide of answerSlides) {
 *     for (const bullet of slide.bullets || []) {
 *       if (bullet.endsWith('e.g') || bullet.endsWith('(e.g')) {
 *         throw new Error(`Incomplete answer detected: "${bullet}"`);
 *       }
 *     }
 *   }
 * }
 * ```
 */

export class SlideGenerator {
  constructor(private client: GeminiClient) {}

  async generateSlides(params: {
    activityName: string;
    activityDescription: string;
    context?: string;
    slideCount: number;
    tailoredSteps?: string[];
    tailoredMaterials?: string[];
    teachingTips?: string[];
    adaptations?: string;
    userDefinedTerms?: TechnicalTerm[];
  }): Promise<Slide[]> {
    const prompt = buildSlidePrompt(params);
    const content = await this.client.makeRequest(prompt, TOKEN_LIMITS.SLIDE_GENERATION, TEMPERATURES.CREATIVE);

    const slides = parseJSONResponse<{ slides: Slide[] }>(
      content,
      (data) => {
        const parsedData = data as { slides: Slide[] };
        if (!parsedData.slides || !Array.isArray(parsedData.slides) || parsedData.slides.length === 0) {
          throw new Error('No slides generated');
        }
        return parsedData;
      },
      'Slide Generation'
    ).slides;

    validateSlides(slides);
    
    // Clean markdown formatting from all slide content
    const cleanedSlides = slides.map(slide => ({
      ...slide,
      title: slide.title ? cleanMarkdownFormatting(slide.title) : slide.title,
      subtitle: slide.subtitle ? cleanMarkdownFormatting(slide.subtitle) : slide.subtitle,
      heading: slide.heading ? cleanMarkdownFormatting(slide.heading) : slide.heading,
      question: slide.question ? cleanMarkdownFormatting(slide.question) : slide.question,
      hint: slide.hint ? cleanMarkdownFormatting(slide.hint) : slide.hint,
      bullets: slide.bullets ? slide.bullets.map(b => cleanMarkdownFormatting(b)) : slide.bullets,
    }));
    
    return cleanedSlides;
  }
}

