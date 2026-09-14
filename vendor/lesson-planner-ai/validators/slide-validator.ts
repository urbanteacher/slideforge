/**
 * Slide Validation
 * Validates generated presentation slides for completeness and quality
 */

import { Slide } from '../types';

// ============================================================================
// SLIDE VALIDATION
// ============================================================================

export function validateSlides(slides: Slide[]): void {
  if (!Array.isArray(slides) || slides.length === 0) {
    throw new Error('No slides generated');
  }

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];

    if (!slide.type) {
      throw new Error(`Slide ${i + 1} is missing required "type" field`);
    }

    // Question slides should be followed by answer slides (unless it's the last slide)
    if (slide.type === 'question') {
      const nextSlide = slides[i + 1];
      const isLastSlide = i === slides.length - 1;
      
      // Only enforce answer slide rule if not the last slide
      if (!isLastSlide && (!nextSlide || nextSlide.type !== 'content')) {
        throw new Error(
          `Slide ${i + 1} is a question but has no answer slide following it. ` +
          `Every question slide must be followed by a content slide with the answer.`
        );
      }
    }

    // Content slides need heading and bullets
    if (slide.type === 'content') {
      if (!slide.heading || slide.heading.trim().length === 0) {
        throw new Error(`Content slide ${i + 1} is missing a heading`);
      }
      if (!slide.bullets || slide.bullets.length === 0) {
        throw new Error(`Content slide ${i + 1} has no content bullets`);
      }
    }

    // Title slides need a title
    if (slide.type === 'title') {
      if (!slide.title || slide.title.trim().length === 0) {
        throw new Error(`Title slide ${i + 1} is missing a title`);
      }
    }

    // Timer slides need a duration
    if (slide.type === 'timer') {
      if (!slide.timerDuration || slide.timerDuration <= 0) {
        throw new Error(`Timer slide ${i + 1} has invalid timer duration`);
      }
    }
  }
}

