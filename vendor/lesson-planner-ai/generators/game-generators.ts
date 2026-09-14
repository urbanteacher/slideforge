/**
 * Game Content Generators
 * AI-powered content generation for various educational games
 */

import { GeminiClient } from '../core/gemini-client';
import { parseJSONResponse, parseJSONArray } from '../core/json-parser';
import { TOKEN_LIMITS, TEMPERATURES } from '../types';

// ============================================================================
// GAME GENERATORS CLASS
// ============================================================================

export class GameGenerators {
  constructor(private client: GeminiClient) {}

  // ============================================================================
  // KEYWORD GENERATION
  // ============================================================================

  async generateKeywords(topic: string, count: number = 8): Promise<Array<{ term: string; definition: string }>> {
    const prompt = `Generate exactly ${count} educational keywords for: "${topic}".

**CRITICAL REQUIREMENTS:**
1. Return ONLY a JSON array - NO markdown, NO code blocks, NO explanations
2. Keep definitions VERY SHORT (maximum 8 words)
3. Use simple, clear language

**JSON FORMAT:**
[{"term":"CPU","definition":"Brain of computer - processes instructions"},{"term":"RAM","definition":"Temporary memory for running programs"}]

**RULES:**
- Use double quotes " only
- NO trailing commas: [...}] NOT [...},]
- NO line breaks in strings
- Keep definitions under 8 words
- Each definition must fit on ONE line

**BAD (TOO LONG):**
"The Central Processing Unit is the electronic circuitry that executes instructions..."

**GOOD (SHORT):**
"Brain of computer - processes instructions"

Return ONLY the JSON array, starting with [ and ending with ]:`;

    const content = await this.client.makeRequest(prompt, TOKEN_LIMITS.KEYWORD_GENERATION, TEMPERATURES.BALANCED);
    return parseJSONArray<{ term: string; definition: string }>(content, ['term', 'definition'], count, 'Keyword Generation');
  }

  // ============================================================================
  // TRUE/FALSE GENERATION
  // ============================================================================

  async generateTrueFalseQuestions(topic: string, count: number = 10): Promise<Array<{ statement: string; isTrue: boolean; explanation: string }>> {
    const prompt = `Generate ${count} true/false statements for: "${topic}".

**CRITICAL: Return ONLY a JSON array.**

Mix true and false (roughly 50/50). Format: [{"statement": "...", "isTrue": true, "explanation": "..."}]`;

    const content = await this.client.makeRequest(prompt, TOKEN_LIMITS.QUIZ_GENERATION, TEMPERATURES.BALANCED);
    return parseJSONArray<{ statement: string; isTrue: boolean; explanation: string }>(
      content,
      ['statement', 'isTrue', 'explanation'],
      count,
      'True/False Generation'
    );
  }

  // ============================================================================
  // RETRIEVAL QUESTIONS
  // ============================================================================

  async generateRetrievalQuestions(topic: string, count: number = 5): Promise<Array<{ question: string; answer: string }>> {
    const prompt = `Generate ${count} LOW-STAKES retrieval practice questions for: "${topic}".

**CRITICAL: Return ONLY a JSON array.**

**REQUIREMENTS FOR LOW-STAKES QUESTIONS:**
- Keep questions STRAIGHTFORWARD and DIRECT
- Focus on basic recall and understanding (not complex analysis)
- Use simple, clear language
- Avoid trick questions or overly complex scenarios
- Make answers concise (1-3 words or short phrases)
- Questions should build confidence, not create anxiety

**GOOD EXAMPLES:**
- "What does CPU stand for?" → "Central Processing Unit"
- "Which organ pumps blood around the body?" → "Heart"
- "What is the capital of France?" → "Paris"

**AVOID:**
- Complex multi-step problems
- Questions requiring deep analysis
- Ambiguous or confusing wording
- Very long answers

Format: [{"question": "...", "answer": "..."}]`;

    const content = await this.client.makeRequest(prompt, TOKEN_LIMITS.QUIZ_GENERATION, TEMPERATURES.BALANCED);
    return parseJSONArray<{ question: string; answer: string }>(content, ['question', 'answer'], count, 'Retrieval Questions');
  }

  // ============================================================================
  // MULTIPLE CHOICE QUESTIONS
  // ============================================================================

  async generateMultipleChoiceQuestions(topic: string, count: number = 20): Promise<Array<{ question: string; answer: string; options: string[] }>> {
    const prompt = `Generate ${count} multiple choice questions for: "${topic}".

**CRITICAL: Return ONLY a JSON array.**

Each question needs 4 options. Format: [{"question": "...", "answer": "...", "options": ["...", "...", "...", "..."]}]`;

    const content = await this.client.makeRequest(prompt, TOKEN_LIMITS.GAME_GENERATION, TEMPERATURES.BALANCED);
    return parseJSONArray<{ question: string; answer: string; options: string[] }>(
      content,
      ['question', 'answer', 'options'],
      count,
      'Multiple Choice Generation'
    );
  }

  // ============================================================================
  // SPOT THE ERROR
  // ============================================================================

  async generateSpotTheErrorStatements(topic: string, count: number = 5): Promise<Array<{ sentence: string; errorLocation: string; wrongPart: string; correctPart: string; explanation: string }>> {
    const prompt = `Generate ${count} sentences with deliberate errors for: "${topic}".

**CRITICAL: Return ONLY a JSON array.**

Format: [{"sentence": "...", "errorLocation": "...", "wrongPart": "...", "correctPart": "...", "explanation": "..."}]`;

    const content = await this.client.makeRequest(prompt, TOKEN_LIMITS.QUIZ_GENERATION, TEMPERATURES.BALANCED);
    return parseJSONArray<{ sentence: string; errorLocation: string; wrongPart: string; correctPart: string; explanation: string }>(
      content,
      ['sentence', 'errorLocation', 'wrongPart', 'correctPart', 'explanation'],
      count,
      'Spot The Error Generation'
    );
  }

  // ============================================================================
  // FILL IN THE BLANKS
  // ============================================================================

  async generateFillInTheBlanks(topic: string, count: number = 5): Promise<Array<{ sentence: string; blanks: string[]; explanation?: string }>> {
    const prompt = `Generate ${count} fill-in-the-blank sentences for: "${topic}".

**CRITICAL: Return ONLY a JSON array.**

Use _____ for blanks. Format: [{"sentence": "...", "blanks": ["...", "..."], "explanation": "..."}]`;

    const content = await this.client.makeRequest(prompt, TOKEN_LIMITS.QUIZ_GENERATION, TEMPERATURES.BALANCED);
    return parseJSONArray<{ sentence: string; blanks: string[]; explanation?: string }>(
      content,
      ['sentence', 'blanks'],
      count,
      'Fill in the Blanks Generation'
    );
  }

  // ============================================================================
  // ODD ONE OUT
  // ============================================================================

  async generateOddOneOut(topic: string, count: number = 5): Promise<Array<{ items: string[]; oddOneIndex: number; reason: string; category?: string }>> {
    const prompt = `Generate ${count} "odd one out" challenges for: "${topic}".

**CRITICAL: Return ONLY a JSON array.**

4-5 items per challenge. Format: [{"items": ["...", "...", "...", "..."], "oddOneIndex": 3, "reason": "...", "category": "..."}]`;

    const content = await this.client.makeRequest(prompt, TOKEN_LIMITS.QUIZ_GENERATION, TEMPERATURES.BALANCED);
    return parseJSONArray<{ items: string[]; oddOneIndex: number; reason: string; category?: string }>(
      content,
      ['items', 'oddOneIndex', 'reason'],
      count,
      'Odd One Out Generation'
    );
  }

  // ============================================================================
  // WORD REVEAL
  // ============================================================================

  async generateWordReveal(topic: string, count: number = 5): Promise<Array<{ word: string; clue: string; category?: string }>> {
    const prompt = `Generate ${count} key vocabulary words for: "${topic}".

**CRITICAL: Return ONLY a JSON array.**

6-15 letters each. Format: [{"word": "PHOTOSYNTHESIS", "clue": "...", "category": "..."}]`;

    const content = await this.client.makeRequest(prompt, TOKEN_LIMITS.KEYWORD_GENERATION, TEMPERATURES.BALANCED);
    return parseJSONArray<{ word: string; clue: string; category?: string }>(
      content,
      ['word', 'clue'],
      count,
      'Word Reveal Generation'
    );
  }

  // ============================================================================
  // COMPARE & CONTRAST
  // ============================================================================

  async generateCompareContrast(topic: string): Promise<{ conceptA: string; conceptB: string; statements: Array<{ text: string; correctAnswer: 'A' | 'B' | 'BOTH' }> }> {
    const prompt = `Generate a comparison between two concepts for: "${topic}".

**CRITICAL: Return ONLY a JSON object.**

Format: {"conceptA": "...", "conceptB": "...", "statements": [{"text": "...", "correctAnswer": "A"}]}`;

    const content = await this.client.makeRequest(prompt, TOKEN_LIMITS.QUIZ_GENERATION, TEMPERATURES.BALANCED);
    
    return parseJSONResponse<{ conceptA: string; conceptB: string; statements: Array<{ text: string; correctAnswer: 'A' | 'B' | 'BOTH' }> }>(
      content,
      (data) => {
        if (!data.conceptA || !data.conceptB || !Array.isArray(data.statements)) {
          throw new Error('Invalid comparison format');
        }
        return data;
      },
      'Compare Contrast Generation'
    );
  }

  // ============================================================================
  // QUIZ BOWL
  // ============================================================================

  async generateQuizBowl(topic: string): Promise<{ topic: string; categories: Array<{ name: string; questions: Array<{ question: string; answer: string; options: string[] }> }> }> {
    const prompt = `Generate a Quiz Bowl game board for: "${topic}".

**CRITICAL: Return ONLY a JSON object. Follow JSON formatting rules strictly.**

4 categories, 5 questions each (100-500 points). Each question needs 4 options.

Format: {"topic": "...", "categories": [{"name": "...", "questions": [{"question": "...", "answer": "...", "options": ["...", "...", "...", "..."]}]}]}`;

    const content = await this.client.makeRequest(prompt, TOKEN_LIMITS.GAME_GENERATION, TEMPERATURES.BALANCED);
    
    return parseJSONResponse<{ topic: string; categories: Array<{ name: string; questions: Array<{ question: string; answer: string; options: string[] }> }> }>(
      content,
      (data) => {
        if (!data.categories || !Array.isArray(data.categories)) {
          throw new Error('Invalid Quiz Bowl format');
        }
        return { topic: data.topic || topic, categories: data.categories };
      },
      'Quiz Bowl Generation'
    );
  }

  // ============================================================================
  // CONNECTION MAKER
  // ============================================================================

  async generateConnectionMaker(topic: string): Promise<{ topic: string; keywords: string[]; connections: Array<{ keywords: string[]; explanation: string }> }> {
    const prompt = `Generate a Connection Maker set for: "${topic}".

**CRITICAL: Return ONLY a JSON object.**

6 keywords and 3+ connections. Format:
{"topic": "...", "keywords": ["...", "...", "..."], "connections": [{"keywords": ["...", "..."], "explanation": "..."}]}`;

    const content = await this.client.makeRequest(prompt, TOKEN_LIMITS.QUIZ_GENERATION, TEMPERATURES.BALANCED);
    
    return parseJSONResponse<{ topic: string; keywords: string[]; connections: Array<{ keywords: string[]; explanation: string }> }>(
      content,
      (data) => {
        if (!data.keywords || !Array.isArray(data.keywords) || !data.connections || !Array.isArray(data.connections)) {
          throw new Error('Invalid Connection Maker format');
        }
        
        for (const conn of data.connections) {
          if (!conn.keywords || !Array.isArray(conn.keywords) || conn.keywords.length !== 2) {
            throw new Error('Each connection must have exactly 2 keywords');
          }
        }
        
        return { topic: data.topic || topic.toUpperCase(), keywords: data.keywords, connections: data.connections };
      },
      'Connection Maker Generation'
    );
  }

  // ============================================================================
  // QUESTION CUBE
  // ============================================================================

  async generateQuestionCube(topic: string): Promise<{ topic: string; define: string; compare: string; why: string; example: string; whatIf: string; conditions: string }> {
    const prompt = `Create Rosenshine's 6 question types for: "${topic}".

**CRITICAL: Return ONLY a JSON object.**

Format: {"topic": "...", "define": "...", "compare": "...", "why": "...", "example": "...", "whatIf": "...", "conditions": "..."}`;

    const content = await this.client.makeRequest(prompt, TOKEN_LIMITS.QUIZ_GENERATION, TEMPERATURES.BALANCED);
    
    return parseJSONResponse<{ topic: string; define: string; compare: string; why: string; example: string; whatIf: string; conditions: string }>(
      content,
      (data) => {
        if (!data.define || !data.compare || !data.why || !data.example || !data.whatIf || !data.conditions) {
          throw new Error('Missing required fields');
        }
        return { ...data, topic: data.topic || topic.toUpperCase() };
      },
      'Question Cube Generation'
    );
  }

  // ============================================================================
  // RANDOM CHALLENGE
  // ============================================================================

  async generateRandomChallenge(topic: string): Promise<{ topic: string; questions: Array<{ type: string; question: string; answer: string; options?: string[]; correctAnswer?: number }> }> {
    const prompt = `Generate 6 diverse challenge questions for: "${topic}".

**CRITICAL: Return ONLY a JSON object.**

2 TRUE_FALSE, 2 MULTIPLE_CHOICE, 2 FILL_BLANK. Format:
{"topic": "...", "questions": [{"type": "TRUE_FALSE", "question": "...", "answer": "TRUE"}]}`;

    const content = await this.client.makeRequest(prompt, TOKEN_LIMITS.QUIZ_GENERATION, TEMPERATURES.BALANCED);
    
    return parseJSONResponse<{ topic: string; questions: Array<{ type: string; question: string; answer: string; options?: string[]; correctAnswer?: number }> }>(
      content,
      (data) => {
        if (!data.questions || !Array.isArray(data.questions)) {
          throw new Error('Invalid Random Challenge format');
        }
        return { topic: data.topic || topic, questions: data.questions };
      },
      'Random Challenge Generation'
    );
  }

  // ============================================================================
  // QUIZ QUESTIONS (FOR ACTIVITIES)
  // ============================================================================

  async generateQuizQuestions(params: {
    activityName: string;
    activityDescription: string;
    tailoredSteps?: string[];
    slideContent?: string;
    questionCount?: number;
  }): Promise<Array<{ question: string; options: string[]; correctAnswer: number }>> {
    const questionCount = params.questionCount || 5;
    const contentContext = params.tailoredSteps
      ? `Key content:\n${params.tailoredSteps.map((step, i) => `${i + 1}. ${step}`).join('\n')}`
      : params.slideContent || params.activityDescription;

    const prompt = `Generate ${questionCount} multiple-choice quiz questions based on this activity.

**Activity:** ${params.activityName}
**Description:** ${params.activityDescription}

${contentContext}

Create ${questionCount} questions that test KEY CONCEPTS (not just facts). 4 options each.

Return ONLY valid JSON: {"questions": [{"question": "...", "options": ["...", "...", "...", "..."], "correctAnswer": 0}]}

correctAnswer is the index (0-3) of the correct option.`;

    const content = await this.client.makeRequest(prompt, TOKEN_LIMITS.QUIZ_GENERATION, TEMPERATURES.BALANCED);

    return parseJSONResponse<{ questions: Array<{ question: string; options: string[]; correctAnswer: number }> }>(
      content,
      (data) => {
        if (!data.questions || !Array.isArray(data.questions)) {
          throw new Error('No questions generated');
        }
        return data;
      },
      'Quiz Generation'
    ).questions;
  }

  // ============================================================================
  // RANKING GENERATION
  // ============================================================================

  async generateRanking(topic: string): Promise<{
    title: string;
    description: string;
    items: string[];
  }> {
    const prompt = `Generate a ranking challenge for the topic: "${topic}".

Create 4-6 items that can be ranked from best to worst, highest to lowest, or most to least important.

**CRITICAL JSON FORMATTING REQUIREMENTS:**
- Return ONLY valid JSON - NO markdown code blocks (no \`\`\`json)
- Use double quotes " for all strings (not single quotes ')
- NO trailing commas after last item
- NO line breaks or newlines inside string values

Format: {"title": "Renewable Energy Sources", "description": "Rank by environmental sustainability - best to worst", "items": ["Solar Power", "Wind Energy", "Hydroelectric", "Biomass", "Geothermal"]}

The items array should be in the CORRECT order (1st item is best/highest, last item is worst/lowest).
Make sure items are specific enough to be meaningfully ranked.`;

    const content = await this.client.makeRequest(prompt, TOKEN_LIMITS.GAME_GENERATION, TEMPERATURES.CREATIVE);

    return parseJSONResponse<{ title: string; description: string; items: string[] }>(
      content,
      (data) => {
        if (!data.title || !data.description || !Array.isArray(data.items) || data.items.length < 3) {
          throw new Error('Invalid ranking data generated');
        }
        return data;
      },
      'Ranking Generation'
    );
  }

  // ============================================================================
  // EMOJI PUZZLES GENERATION
  // ============================================================================

  async generateEmojiPuzzles(topic: string, count: number = 10): Promise<Array<{
    emojis: string;
    answer: string;
    hint?: string;
  }>> {
    const prompt = `Generate ${count} emoji puzzles for the topic: "${topic}".

Each puzzle should use 2-4 emojis that represent a concept, term, or idea.

**CRITICAL JSON FORMATTING REQUIREMENTS:**
- Return ONLY valid JSON - NO markdown code blocks (no \`\`\`json)
- Use double quotes " for all strings (not single quotes ')
- NO trailing commas after last item
- NO line breaks or newlines inside string values
- Start with [ and end with ]

Format: [{"emojis": "💻🧠", "answer": "CPU", "hint": "Computer part"}, {"emojis": "📝💾", "answer": "RAM", "hint": "Memory type"}]

**IMPORTANT FOR HINTS:**
- Hints should be CATEGORIES or TYPES (e.g., "Computer part", "Science concept", "Historical event")
- NOT definitions (e.g., NOT "Computer brain" or "Processes data")
- Keep hints to 2-3 words maximum
- Hints are used for Easy mode difficulty

Make emojis creative and educational.`;

    const content = await this.client.makeRequest(prompt, TOKEN_LIMITS.GAME_GENERATION, TEMPERATURES.CREATIVE);

    return parseJSONArray<{ emojis: string; answer: string; hint?: string }>(
      content,
      ['emojis', 'answer'],
      count,
      'Emoji Puzzle Generation'
    );
  }
}

