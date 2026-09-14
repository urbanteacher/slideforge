/**
 * Type Definitions for AI Service
 * Centralized type definitions used across all AI service modules
 */

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

export interface TailoredActivityRequest {
  activityName: string;
  activityDescription: string;
  originalSteps: string[];
  originalMaterials?: string[];
  userContext: string;
}

export interface TailoredActivityResponse {
  tailoredSteps: string[];
  tailoredMaterials: string[];
  teachingTips: string[];
  adaptations: string;
}

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
  timerDuration?: number;
}

export interface TechnicalTerm {
  term: string;
  definition?: string;
  importance?: 'critical' | 'important' | 'helpful';
}

export interface ActivityClassification {
  type: 'discussion' | 'review' | 'worked_example' | 'error_analysis' | 'sorting' | 'comparison' | 'practice_stations' | 'analysis' | 'standard';
  requiresContent: boolean;
  isReview: boolean;
  needsTeaching: boolean;
  suggestTermsField: boolean;
  warning?: string;
  specificGuidance?: string;
}

export interface ContentSlideRequirement {
  needed: boolean;
  reason: string;
  warning?: string;
  recommendedSlideCount: number;
}

export interface StepEnrichmentResult {
  teacherContext: string;
  subSteps: string[];
}

// ============================================================================
// CONFIGURATION CONSTANTS
// ============================================================================

export const TOKEN_LIMITS = {
  ACTIVITY_TAILORING: 8000,
  SLIDE_GENERATION: 4000,
  QUIZ_GENERATION: 3000,
  KEYWORD_GENERATION: 5000, // Increased for larger Bingo term sets (up to 50 terms)
  STEP_ENRICHMENT: 2000,
  GAME_GENERATION: 6000,
} as const;

export const TEMPERATURES = {
  CREATIVE: 0.8,
  BALANCED: 0.7,
  PRECISE: 0.5,
} as const;

export const RATE_LIMIT = {
  DEFAULT_MS: 1000,
  BURST_LIMIT: 5,
  BURST_WINDOW_MS: 5000,
} as const;

