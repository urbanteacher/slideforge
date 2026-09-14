/**
 * Term Validation
 * Validates user-defined technical terms for slide generation
 */

import { TechnicalTerm } from '../types';

// ============================================================================
// TERM VALIDATION
// ============================================================================

export function validateUserDefinedTerms(terms: TechnicalTerm[]): void {
  if (!Array.isArray(terms)) {
    throw new Error('User defined terms must be an array');
  }

  const seenTerms = new Set<string>();

  for (const term of terms) {
    if (!term.term || term.term.trim().length === 0) {
      throw new Error('Term cannot be empty');
    }

    if (term.term.length > 100) {
      throw new Error(`Term "${term.term}" is too long (max 100 characters)`);
    }

    const normalizedTerm = term.term.toLowerCase().trim();
    if (seenTerms.has(normalizedTerm)) {
      throw new Error(`Duplicate term found: "${term.term}"`);
    }
    seenTerms.add(normalizedTerm);

    if (term.definition && term.definition.length > 500) {
      throw new Error(`Definition for "${term.term}" is too long (max 500 characters)`);
    }

    if (term.importance && !['critical', 'important', 'helpful'].includes(term.importance)) {
      throw new Error(
        `Invalid importance level for "${term.term}". Must be: critical, important, or helpful`
      );
    }
  }
}

