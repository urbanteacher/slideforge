/**
 * Slide Generation Prompt Builders
 * Constructs prompts for AI slide generation with activity-specific guidance
 */

import { TechnicalTerm, ContentSlideRequirement } from '../types';
import { validateUserDefinedTerms } from '../validators/term-validator';
import { classifyActivity } from '../classification/activity-classifier';
import {
  buildUserTermsGuidance,
  buildWorkedExampleGuidance,
  buildErrorAnalysisGuidance,
  buildSortingGuidance,
  buildComparisonGuidance,
  buildPracticeStationsGuidance,
  buildQuestionCubeGuidance,
  buildHookPredictGuidance,
} from './activity-guidance';

// ============================================================================
// CONTENT SLIDE REQUIREMENT DETECTION
// ============================================================================

export function detectContentSlideRequirement(
  activityName: string,
  activityDescription: string,
  userDefinedTerms?: TechnicalTerm[]
): ContentSlideRequirement {
  if (userDefinedTerms && userDefinedTerms.length > 0) {
    validateUserDefinedTerms(userDefinedTerms);
    
    return {
      needed: true,
      reason: 'user_specified',
      recommendedSlideCount: Math.min(userDefinedTerms.length + 1, 6),
    };
  }

  const classification = classifyActivity(activityName, activityDescription);

  if (classification.isReview) {
    return {
      needed: false,
      reason: 'review_activity',
      recommendedSlideCount: 0,
    };
  }

  if (classification.type === 'worked_example') {
    return {
      needed: false,
      reason: 'worked_example_warning',
      warning: classification.warning,
      recommendedSlideCount: 0,
    };
  }

  if (classification.type === 'error_analysis') {
    return {
      needed: false,
      reason: 'error_analysis_warning',
      warning: classification.warning,
      recommendedSlideCount: 0,
    };
  }

  if (classification.requiresContent) {
    return {
      needed: false,
      reason: 'analysis_warning',
      warning: classification.warning,
      recommendedSlideCount: 0,
    };
  }

  if (classification.type === 'discussion') {
    return {
      needed: false,
      reason: 'discussion_warning',
      warning: classification.warning,
      recommendedSlideCount: 0,
    };
  }

  return {
    needed: false,
    reason: 'none',
    recommendedSlideCount: 0,
  };
}

// ============================================================================
// SLIDE PROMPT BUILDER (MAIN FUNCTION)
// ============================================================================

export function buildSlidePrompt(params: {
  activityName: string;
  activityDescription: string;
  context?: string;
  slideCount: number;
  tailoredSteps?: string[];
  tailoredMaterials?: string[];
  teachingTips?: string[];
  adaptations?: string;
  userDefinedTerms?: TechnicalTerm[];
}): string {
  const detection = detectContentSlideRequirement(
    params.activityName,
    params.activityDescription,
    params.userDefinedTerms
  );

  const sections = [
    buildBaseInstructions(),
    buildActivityContext(params),
    buildTailoredContentSection(params),
    buildContentGuidanceSection(params, detection),
    buildSlideFormatSection(params, detection),
    buildDesignPrinciples(),
    buildCriticalRequirements(params, detection),
  ].filter(section => section.trim().length > 0);

  return sections.join('\n\n');
}

// ============================================================================
// PROMPT SECTION BUILDERS
// ============================================================================

function buildBaseInstructions(): string {
  return `You are an expert teacher creating presentation slides for a classroom activity.`;
}

function buildActivityContext(params: {
  activityName: string;
  activityDescription: string;
  context?: string;
  slideCount: number;
}): string {
  return `**ACTIVITY:** ${params.activityName}
**DESCRIPTION:** ${params.activityDescription}
${params.context && params.context.trim() ? `**CONTEXT:** ${params.context}` : ''}
**TARGET SLIDE COUNT:** ${params.slideCount}`;
}

function buildTailoredContentSection(params: {
  tailoredSteps?: string[];
  tailoredMaterials?: string[];
  teachingTips?: string[];
  adaptations?: string;
}): string {
  if (!params.tailoredSteps || params.tailoredSteps.length === 0) {
    return '';
  }

  const parts = [
    '\n**AI-TAILORED CONTENT FOR THIS ACTIVITY:**',
    '\n📋 Customized Steps:',
    params.tailoredSteps.map((step, i) => `${i + 1}. ${step}`).join('\n'),
  ];

  if (params.tailoredMaterials && params.tailoredMaterials.length > 0) {
    parts.push('\n📦 Specific Materials:');
    parts.push(params.tailoredMaterials.join('\n'));
  }

  if (params.teachingTips && params.teachingTips.length > 0) {
    parts.push('\n💡 Teaching Tips:');
    parts.push(params.teachingTips.map(tip => `• ${tip}`).join('\n'));
  }

  if (params.adaptations) {
    parts.push('\n🎯 Key Adaptations:');
    parts.push(params.adaptations);
  }

  parts.push('\n**IMPORTANT:** Use this tailored content to create slides that match the teacher\'s specific context and adaptations!');

  return parts.join('\n');
}

function buildContentGuidanceSection(
  params: { activityName: string; activityDescription: string; userDefinedTerms?: TechnicalTerm[] },
  detection: ContentSlideRequirement
): string {
  if (detection.needed && params.userDefinedTerms) {
    return buildUserTermsGuidance(params.userDefinedTerms, detection.recommendedSlideCount);
  }

  const classification = classifyActivity(params.activityName, params.activityDescription);

  switch (classification.specificGuidance) {
    case 'worked_example':
      return buildWorkedExampleGuidance(params.activityName);
    
    case 'error_analysis':
      return buildErrorAnalysisGuidance(params.activityName);
    
    case 'sorting':
      return buildSortingGuidance();
    
    case 'comparison':
      return buildComparisonGuidance(params.userDefinedTerms);
    
    case 'practice_stations':
      return buildPracticeStationsGuidance();
    
    case 'question_cube':
      return buildQuestionCubeGuidance();
    
    case 'hook_predict':
      return buildHookPredictGuidance();
    
    default:
      return '';
  }
}

function buildSlideFormatSection(
  params: { slideCount: number },
  detection: ContentSlideRequirement
): string {
  const totalSlides = detection.needed ? params.slideCount + detection.recommendedSlideCount : params.slideCount;

  return `

**SLIDE FORMAT:**
Generate exactly ${totalSlides} slides in this JSON array format:

{
  "slides": [
    {
      "type": "title",
      "title": "Activity Name",
      "subtitle": "Engaging subtitle"
    },
    {
      "type": "content",
      "heading": "Clear Heading",
      "bullets": [
        "Concise bullet point 1",
        "Concise bullet point 2",
        "Concise bullet point 3"
      ]
    },
    {
      "type": "question",
      "question": "Question text (large, clear)",
      "hint": "Optional hint for students"
    },
    {
      "type": "timer",
      "title": "Think Time",
      "subtitle": "What do you already know?",
      "timerDuration": 60
    }
  ]
}

**WHEN TO USE EACH SLIDE TYPE:**

- **"title"**: First slide only - activity name and subtitle
- **"content"**: Most slides - information, instructions, questions as bullets, answers
- **"question"**: Single big question for class discussion (MUST be followed by "content" answer slide)
- **"timer"**: When students need timed independent work

**IMPORTANT FOR RETRIEVAL QUIZZES / QUESTION LISTS:**
- Use "content" type slides with questions as numbered bullets (1., 2., 3.)
- Do NOT use "question" type for lists of questions
- Example: Slide with heading "Your Turn: Recall & Write!" and bullets "1. What is...", "2. Name three..."`;
}

function buildDesignPrinciples(): string {
  return `

**GENERAL SLIDE DESIGN PRINCIPLES:**
- Keep text concise and scannable
- Use clear, descriptive headings
- Bullets should be complete thoughts but brief (one line each)
- Include examples and real-world connections
- Maximum 4 bullets per slide (3 is ideal)
- Use parallel structure in bullet points
- Avoid walls of text - break into multiple slides if needed
- Text must be LARGE and readable from back of classroom

**🚨 CRITICAL: NOVICE TEACHER SUPPORT**
**NEVER leave teachers without answers or scaffolding!**

- If you create a "question" type slide → MUST follow with a "content" type answer slide
- Discussion prompts → Include example responses or talking points
- Analysis tasks → Provide the key insights students should discover
- Comparison activities → Give the actual comparison, not just "compare X and Y"

**🚨 RETRIEVAL QUIZ / RECALL ACTIVITIES - ANSWER SLIDES REQUIRED:**

If the activity involves students answering questions from memory (retrieval quiz, recall questions, quick review):
1. **Questions slide**: All questions numbered on ONE content slide (1., 2., 3., 4.)
2. **Timer/Discussion slides**: Independent work and pair sharing
3. **ANSWER SLIDE REQUIRED**: A dedicated content slide with heading "Let's Review the Answers!" or similar
   - Must include answers to ALL questions asked
   - Format: "1. [Topic]: [Complete answer]"
   - Answers must be COMPLETE - no truncation mid-sentence
   - Example: "4. Resolution: The detail an image has, measured by pixels (e.g., 1920x1080 means 1920 pixels wide by 1080 pixels tall)"

**WITHOUT an answer slide, students have no way to check their understanding!**

**VOICE AND AUDIENCE:**
Slides are for STUDENTS to view during class. Use DIRECT, STUDENT-FACING language.

❌ WRONG (Teacher-centric): "Students will discuss the causes"
✅ CORRECT (Student-facing): "What causes these patterns? Discuss with your partner."`;
}

function buildCriticalRequirements(
  params: { tailoredSteps?: string[]; activityName: string },
  detection: ContentSlideRequirement
): string {
  const parts = ['\n**CRITICAL REQUIREMENTS:**'];
  
  parts.push('1. First slide MUST be type "title" with activity name and learning objective');
  
  if (detection.needed) {
    parts.push(`2. After title, add ${detection.recommendedSlideCount} TEACHING CONTENT slides that explain the concepts, THEN add discussion/activity slides`);
  } else if (params.tailoredSteps && params.tailoredSteps.length > 0) {
    parts.push(`2. Create ${params.tailoredSteps.length} slides (one per tailored step) after the title slide`);
  }

  // Check if this is a retrieval quiz activity
  const isRetrievalQuiz = params.activityName.toLowerCase().includes('quiz') || 
                          params.activityName.toLowerCase().includes('recall') ||
                          params.activityName.toLowerCase().includes('retrieval');
  
  if (isRetrievalQuiz) {
    parts.push('3. **ANSWER SLIDE MANDATORY**: This is a retrieval/quiz activity - you MUST include a final slide with complete answers to all questions');
  }

  parts.push('4. Age-appropriate language for students');
  parts.push('5. Questions should promote thinking, not just recall');
  parts.push('\n**🚨 CRITICAL JSON FORMATTING REQUIREMENTS:**');
  parts.push('- Return ONLY raw JSON - NO markdown code blocks (no ```json```)');
  parts.push('- Use DOUBLE QUOTES for all strings (not single quotes)');
  parts.push('- NO trailing commas before ] or }');
  parts.push('- NO newlines inside string values');
  parts.push('- NO special characters that need escaping');
  parts.push('- Validate your JSON is parseable before returning');
  parts.push('- Start with { and end with } - nothing else');
  
  parts.push('\nGenerate slides now as valid JSON.');

  return parts.join('\n');
}

