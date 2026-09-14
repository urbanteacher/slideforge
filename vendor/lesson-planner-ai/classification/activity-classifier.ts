/**
 * Activity Classification System
 * Detects activity types and provides contextual guidance
 */

import { ActivityClassification } from '../types';

// ============================================================================
// ACTIVITY KEYWORDS
// ============================================================================

const DISCUSSION_ACTIVITIES = [
  'think-pair-share', 'think pair share',
  'hook & predict', 'hook and predict',
  'word splash', 'socratic seminar',
  'fishbowl discussion', 'jigsaw',
  'turn and talk', 'brainstorm',
  'class discussion', 'group discussion',
  'dialogue chain', 'think-pair-square',
];

const REVIEW_ACTIVITIES = [
  'review', 'revisit', 'recall', 'remember', 'recap',
  'summarize previous', 'check understanding', 'exit ticket',
  'formative assessment', 'quick retrieval', 'retrieval practice',
];

const WORKED_EXAMPLE_ACTIVITIES = [
  'worked example', 'example analysis',
  'analyze example', 'case study',
  'examine example', 'study example',
];

const ERROR_ANALYSIS_ACTIVITIES = [
  'error analysis',
  'find and fix',
  'spot the error',
  'spot the mistake',
  'identify mistakes',
  'find the error',
  'debug',
  'misconception',
];

const SORTING_ACTIVITIES = [
  'card sort',
  'concept card sort',
  'categorization',
  'organize information',
  'sort into categories',
  'classify',
  'group',
];

const COMPARISON_ACTIVITIES = [
  'compare and contrast',
  'venn diagram',
  'venn activity',
  'similarities and differences',
  'benefits vs limitations',
  'benefits and limitations',
  'pros and cons',
  'advantages disadvantages',
];

const PRACTICE_STATIONS = [
  'practice stations',
  'quick practice stations',
  'rotation',
  'stations rotation',
  'carousel',
];

const QUESTION_CUBE_ACTIVITIES = [
  'question cube',
  'six question types',
  'rosenshine questions',
];

const HOOK_PREDICT_ACTIVITIES = [
  'hook & predict',
  'hook and predict',
  'notice and wonder',
  'notice wonder',
  'what do you notice',
];

// ============================================================================
// ACTIVITY DETECTION
// ============================================================================

export function isDiscussionActivity(activityName: string, activityDescription: string): boolean {
  const searchText = `${activityName} ${activityDescription}`.toLowerCase();
  return DISCUSSION_ACTIVITIES.some(keyword => searchText.includes(keyword));
}

export function isReviewActivity(activityName: string, activityDescription: string): boolean {
  const searchText = `${activityName} ${activityDescription}`.toLowerCase();
  return REVIEW_ACTIVITIES.some(keyword => searchText.includes(keyword));
}

export function isWorkedExampleActivity(activityName: string, activityDescription: string): boolean {
  const searchText = `${activityName} ${activityDescription}`.toLowerCase();
  return WORKED_EXAMPLE_ACTIVITIES.some(keyword => searchText.includes(keyword));
}

export function isErrorAnalysisActivity(activityName: string, activityDescription: string): boolean {
  const searchText = `${activityName} ${activityDescription}`.toLowerCase();
  return ERROR_ANALYSIS_ACTIVITIES.some(keyword => searchText.includes(keyword));
}

export function isSortingActivity(activityName: string, activityDescription: string): boolean {
  const searchText = `${activityName} ${activityDescription}`.toLowerCase();
  return SORTING_ACTIVITIES.some(keyword => searchText.includes(keyword));
}

export function isComparisonActivity(activityName: string, activityDescription: string): boolean {
  const searchText = `${activityName} ${activityDescription}`.toLowerCase();
  return COMPARISON_ACTIVITIES.some(keyword => searchText.includes(keyword));
}

export function isPracticeStationsActivity(activityName: string, activityDescription: string): boolean {
  const searchText = `${activityName} ${activityDescription}`.toLowerCase();
  return PRACTICE_STATIONS.some(keyword => searchText.includes(keyword));
}

export function isQuestionCubeActivity(activityName: string, activityDescription: string): boolean {
  const searchText = `${activityName} ${activityDescription}`.toLowerCase();
  return QUESTION_CUBE_ACTIVITIES.some(keyword => searchText.includes(keyword));
}

export function isHookPredictActivity(activityName: string, activityDescription: string): boolean {
  const searchText = `${activityName} ${activityDescription}`.toLowerCase();
  return HOOK_PREDICT_ACTIVITIES.some(keyword => searchText.includes(keyword));
}

export function requiresProvidedContent(
  activityName: string,
  activityDescription: string,
  steps?: string[]
): boolean {
  const searchText = `${activityName} ${activityDescription} ${steps?.join(' ')}`.toLowerCase();
  
  const analysisPatterns = [
    /analyze (the |this )?(example|case|scenario|problem)/i,
    /examine (the |this )?(example|case|diagram)/i,
    /study (the |this )?(example|model)/i,
    /deconstruct (the |this )?(process|example)/i,
    /what does (this|the) example (show|demonstrate|illustrate)/i,
    /spot the difference/i,
    /compare (the )?(example|approaches)/i,
  ];
  
  return analysisPatterns.some(pattern => pattern.test(searchText));
}

// ============================================================================
// ACTIVITY CLASSIFICATION
// ============================================================================

export function classifyActivity(activityName: string, activityDescription: string): ActivityClassification {
  const isDiscussion = isDiscussionActivity(activityName, activityDescription);
  const isReview = isReviewActivity(activityName, activityDescription);
  const isWorkedExample = isWorkedExampleActivity(activityName, activityDescription);
  const isErrorAnalysis = isErrorAnalysisActivity(activityName, activityDescription);
  const isSorting = isSortingActivity(activityName, activityDescription);
  const isComparison = isComparisonActivity(activityName, activityDescription);
  const isPracticeStations = isPracticeStationsActivity(activityName, activityDescription);
  const isQuestionCube = isQuestionCubeActivity(activityName, activityDescription);
  const isHookPredict = isHookPredictActivity(activityName, activityDescription);
  const requiresContent = requiresProvidedContent(activityName, activityDescription);

  let type: ActivityClassification['type'] = 'standard';
  let warning: string | undefined;
  let specificGuidance: string | undefined;

  if (isReview) {
    type = 'review';
  } else if (isWorkedExample) {
    type = 'worked_example';
    warning = '⚠️ CRITICAL: This activity requires a completed example. Add the worked example content or use "Key Terms to Teach".';
    specificGuidance = 'worked_example';
  } else if (isErrorAnalysis) {
    type = 'error_analysis';
    warning = '⚠️ CRITICAL: This activity requires sample work with deliberate errors. Add the error examples or use "Key Terms to Teach".';
    specificGuidance = 'error_analysis';
  } else if (isQuestionCube) {
    type = 'standard';
    specificGuidance = 'question_cube';
  } else if (isHookPredict) {
    type = 'discussion';
    specificGuidance = 'hook_predict';
  } else if (isPracticeStations) {
    type = 'practice_stations';
    warning = '💡 This activity requires 3 specific tasks (Recall, Apply, Create). Consider adding key content as "Key Terms to Teach".';
    specificGuidance = 'practice_stations';
  } else if (isSorting) {
    type = 'sorting';
    warning = '💡 This activity requires categories and items to sort. Add key concepts as "Key Terms to Teach".';
    specificGuidance = 'sorting';
  } else if (isComparison) {
    type = 'comparison';
    warning = '💡 This activity requires two concepts to compare. Add them as "Key Terms to Teach" to get comparison slides.';
    specificGuidance = 'comparison';
  } else if (requiresContent) {
    type = 'analysis';
    warning = '💡 This activity asks students to analyze something. Consider adding content as "Key Terms to Teach".';
  } else if (isDiscussion) {
    type = 'discussion';
    warning = 'This discussion activity may benefit from teaching slides. Consider adding key terms students need to learn first.';
  }

  return {
    type,
    requiresContent: isWorkedExample || requiresContent || isErrorAnalysis || isPracticeStations,
    isReview,
    needsTeaching: false,
    suggestTermsField: (isDiscussion || isWorkedExample || requiresContent || isErrorAnalysis || 
                       isSorting || isComparison || isPracticeStations || isQuestionCube) && !isReview,
    warning,
    specificGuidance,
  };
}

// ============================================================================
// UI HELPER FUNCTIONS
// ============================================================================

export function shouldSuggestAddingTerms(activityName: string, activityDescription: string): boolean {
  const classification = classifyActivity(activityName, activityDescription);
  return classification.suggestTermsField;
}

export function getTermSuggestionText(activityName: string): string {
  const name = activityName.toLowerCase();
  
  if (name.includes('think-pair-share') || name.includes('think pair share')) {
    return '💡 Tip: If students will discuss unfamiliar concepts, add them as "Key Terms to Teach" so they learn definitions first.';
  }
  
  if (name.includes('socratic') || name.includes('discussion') || name.includes('fishbowl')) {
    return '💡 Tip: Add any unfamiliar vocabulary as "Key Terms to Teach" to ensure students understand them before discussion.';
  }

  if (name.includes('worked example') || name.includes('case study')) {
    return '⚠️ Important: Add the key concepts from the example as "Key Terms to Teach" so students understand the terminology.';
  }

  if (name.includes('error analysis') || name.includes('find and fix') || name.includes('spot the error')) {
    return '⚠️ Important: Add the concepts being tested as "Key Terms to Teach" so students understand what makes the errors wrong.';
  }

  if (name.includes('card sort') || name.includes('categorization')) {
    return '💡 Tip: Add the main categories or concepts as "Key Terms to Teach" to provide definitions before sorting.';
  }

  if (name.includes('compare') || name.includes('venn') || name.includes('benefits') || name.includes('limitations')) {
    return '💡 Tip: Add the two concepts being compared as "Key Terms to Teach" to get slides explaining each one first.';
  }

  if (name.includes('practice stations') || name.includes('rotation')) {
    return '💡 Tip: Add key concepts for each station (Recall, Apply, Create) as "Key Terms to Teach".';
  }

  if (name.includes('question cube') || name.includes('six question')) {
    return '💡 Tip: Add the main concept as a "Key Term to Teach" to ensure students understand it before questioning.';
  }

  if (name.includes('hook') || name.includes('predict') || name.includes('notice') || name.includes('wonder')) {
    return '💡 Tip: If students need background knowledge first, add key concepts as "Key Terms to Teach".';
  }

  if (name.includes('word splash')) {
    return '💡 Tip: Add key vocabulary words as "Key Terms to Teach" to get dedicated teaching slides with definitions.';
  }

  return '💡 Tip: Add any key concepts students need to learn as "Key Terms to Teach" to get dedicated teaching slides.';
}

