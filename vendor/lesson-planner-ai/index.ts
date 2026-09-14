/**
 * Gemini AI Service - Main Export
 * Orchestrates all AI-powered features for the activity catalog
 * 
 * @version 3.0.0
 * @architecture Modular, testable, scalable 7-file architecture
 */

import { GeminiClient } from './core/gemini-client';
import { GameGenerators } from './generators/game-generators';
import { StepEnricher } from './generators/step-enricher';
import { SlideGenerator } from './generators/slide-generator';
import { buildTailoringPrompt, cleanMarkdownFormatting } from './prompts/tailoring-prompts';
import { detectContentSlideRequirement } from './prompts/slide-prompts';
import { parseJSONResponse } from './core/json-parser';
import {
  classifyActivity,
  shouldSuggestAddingTerms,
  getTermSuggestionText,
} from './classification/activity-classifier';

import type {
  TailoredActivityRequest,
  TailoredActivityResponse,
  Slide,
  TechnicalTerm,
  ActivityClassification,
  StepEnrichmentResult,
} from './types';

export type {
  TailoredActivityRequest,
  TailoredActivityResponse,
  Slide,
  TechnicalTerm,
  ActivityClassification,
  StepEnrichmentResult,
};

// Re-export constants
export { TOKEN_LIMITS, TEMPERATURES } from './types';

// ============================================================================
// MAIN AI SERVICE CLASS
// ============================================================================

class GeminiAIService {
  private client: GeminiClient;
  private gameGenerators: GameGenerators;
  private stepEnricher: StepEnricher;
  private slideGenerator: SlideGenerator;

  constructor() {
    this.client = new GeminiClient();
    this.gameGenerators = new GameGenerators(this.client);
    this.stepEnricher = new StepEnricher(this.client);
    this.slideGenerator = new SlideGenerator(this.client);
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  public initialize(apiKey: string): void {
    this.client.initialize(apiKey);
  }

  public isInitialized(): boolean {
    return this.client.isInitialized();
  }

  public async testConnection(): Promise<{ success: boolean; message: string }> {
    return this.client.testConnection();
  }

  // ============================================================================
  // ACTIVITY CLASSIFICATION (PUBLIC API)
  // ============================================================================

  public classifyActivity(activityName: string, activityDescription: string): ActivityClassification {
    return classifyActivity(activityName, activityDescription);
  }

  public shouldSuggestAddingTerms(activityName: string, activityDescription: string): boolean {
    return shouldSuggestAddingTerms(activityName, activityDescription);
  }

  public getTermSuggestionText(activityName: string): string {
    return getTermSuggestionText(activityName);
  }

  // ============================================================================
  // ACTIVITY TAILORING
  // ============================================================================

  public async tailorActivity(request: TailoredActivityRequest): Promise<TailoredActivityResponse> {
    const prompt = buildTailoringPrompt(request);
    const content = await this.client.makeRequest(prompt, 8000, 0.7);
    
    return parseJSONResponse<TailoredActivityResponse>(
      content,
      (data) => {
        if (!data.tailoredSteps && !data.tailoredMaterials && !data.teachingTips) {
          throw new Error('Response missing required fields');
        }

        const cleanArray = (arr: string[]) => arr.map(item => cleanMarkdownFormatting(item));

        return {
          tailoredSteps: cleanArray(data.tailoredSteps || []),
          tailoredMaterials: cleanArray(data.tailoredMaterials || []),
          teachingTips: cleanArray(data.teachingTips || []),
          adaptations: cleanMarkdownFormatting(data.adaptations) || 'Activity tailored to your context.',
        };
      },
      'Activity Tailoring'
    );
  }

  // ============================================================================
  // SLIDE GENERATION
  // ============================================================================

  public async generateSlides(params: {
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
    return this.slideGenerator.generateSlides(params);
  }

  // Helper for UI to determine if content slides are needed
  public detectContentSlideRequirement(
    activityName: string,
    activityDescription: string,
    userDefinedTerms?: TechnicalTerm[]
  ) {
    return detectContentSlideRequirement(activityName, activityDescription, userDefinedTerms);
  }

  // ============================================================================
  // STEP ENRICHMENT
  // ============================================================================

  public async enrichStep(
    topic: string,
    currentStep: string,
    previousSteps: string[] = [],
    activityName?: string,
    activityDescription?: string,
    additionalContext?: string
  ): Promise<StepEnrichmentResult> {
    return this.stepEnricher.enrichStep(
      topic,
      currentStep,
      previousSteps,
      activityName,
      activityDescription,
      additionalContext
    );
  }

  // ============================================================================
  // GAME GENERATORS (DELEGATED)
  // ============================================================================

  public async generateKeywords(topic: string, count: number = 8) {
    return this.gameGenerators.generateKeywords(topic, count);
  }

  public async generateTrueFalseQuestions(topic: string, count: number = 10) {
    return this.gameGenerators.generateTrueFalseQuestions(topic, count);
  }

  public async generateRetrievalQuestions(topic: string, count: number = 5) {
    return this.gameGenerators.generateRetrievalQuestions(topic, count);
  }

  public async generateMultipleChoiceQuestions(topic: string, count: number = 20) {
    return this.gameGenerators.generateMultipleChoiceQuestions(topic, count);
  }

  public async generateSpotTheErrorStatements(topic: string, count: number = 5) {
    return this.gameGenerators.generateSpotTheErrorStatements(topic, count);
  }

  public async generateFillInTheBlanks(topic: string, count: number = 5) {
    return this.gameGenerators.generateFillInTheBlanks(topic, count);
  }

  public async generateOddOneOut(topic: string, count: number = 5) {
    return this.gameGenerators.generateOddOneOut(topic, count);
  }

  public async generateWordReveal(topic: string, count: number = 5) {
    return this.gameGenerators.generateWordReveal(topic, count);
  }

  public async generateCompareContrast(topic: string) {
    return this.gameGenerators.generateCompareContrast(topic);
  }

  public async generateQuizBowl(topic: string) {
    return this.gameGenerators.generateQuizBowl(topic);
  }

  public async generateConnectionMaker(topic: string) {
    return this.gameGenerators.generateConnectionMaker(topic);
  }

  public async generateQuestionCube(topic: string) {
    return this.gameGenerators.generateQuestionCube(topic);
  }

  public async generateRandomChallenge(topic: string) {
    return this.gameGenerators.generateRandomChallenge(topic);
  }

  public async generateQuizQuestions(params: {
    activityName: string;
    activityDescription: string;
    tailoredSteps?: string[];
    slideContent?: string;
    questionCount?: number;
  }) {
    return this.gameGenerators.generateQuizQuestions(params);
  }

  public async generateRanking(topic: string) {
    return this.gameGenerators.generateRanking(topic);
  }

  public async generateEmojiPuzzles(topic: string, count?: number) {
    return this.gameGenerators.generateEmojiPuzzles(topic, count);
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const aiService = new GeminiAIService();

export function isAIServiceInitialized(): boolean {
  return aiService.isInitialized();
}

export default aiService;

