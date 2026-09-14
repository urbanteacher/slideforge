/**
 * JSON Parsing Utilities
 * Robust parsing and validation of AI-generated JSON responses
 */

// ============================================================================
// JSON PARSING
// ============================================================================

export function parseJSONResponse<T>(
  content: string,
  validator: (data: unknown) => T,
  errorContext: string
): T {
  try {
    let cleanContent = content.trim();
    
    // Remove markdown code blocks if present
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      cleanContent = codeBlockMatch[1].trim();
    }
    
    // Extract JSON object/array
    const jsonMatch = cleanContent.match(/[\{\[][\s\S]*[\}\]]/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    
    // Clean up common AI formatting mistakes
    let jsonString = jsonMatch[0];
    
    // Strategy 1: Basic cleanup (but NOT touching single quotes yet)
    jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1'); // Remove trailing commas
    jsonString = jsonString.replace(/[\u0000-\u001F\u007F-\u009F]/g, ''); // Remove control characters
    
    // Strategy 2: Try parsing first (in case it's already valid)
    try {
      const parsed = JSON.parse(jsonString);
      return validator(parsed);
    } catch (firstError) {
      // Strategy 3: Smart single-quote handling
      console.warn(`[${errorContext}] First parse failed, applying smart cleanup...`);
      
      // Fix single quotes ONLY when they're used as string delimiters, not apostrophes
      // This regex finds single-quoted strings and converts them to double-quoted
      jsonString = jsonString.replace(
        /'([^'\\]*(?:\\.[^'\\]*)*)'/g, 
        (match, content) => {
          // Escape any double quotes inside the content
          const escaped = content.replace(/"/g, '\\"');
          return `"${escaped}"`;
        }
      );
      
      // Fix common array/object formatting issues
      jsonString = jsonString
        // Fix missing commas between array/object elements
        .replace(/"\s*\n\s*"/g, '",\n"')
        .replace(/}\s*\n\s*{/g, '},\n{')
        .replace(/]\s*\n\s*\[/g, '],\n[')
        // Fix unescaped newlines in strings
        .replace(/"([^"\\]*(?:\\.[^"\\]*)*)\n([^"]*)"/g, (match, p1, p2) => `"${p1}\\n${p2}"`)
        // Normalize whitespace
        .replace(/\s+/g, ' ')
        // Ensure proper spacing
        .replace(/"\s*:\s*/g, '": ')
        .replace(/,\s*/g, ', ');
      
      // Try parsing again
      try {
        const parsed = JSON.parse(jsonString);
        return validator(parsed);
      } catch (secondError) {
        // Strategy 4: Ultra-aggressive cleanup
        console.warn(`[${errorContext}] Second parse failed, trying ultra-aggressive cleanup...`);
        
        try {
          // Remove all newlines and normalize whitespace
          let ultraClean = jsonString
            .replace(/\r\n|\n|\r/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          
          // Fix common issues more aggressively
          ultraClean = ultraClean
            // Remove trailing commas more thoroughly
            .replace(/,\s*([}\]])/g, '$1')
            .replace(/,\s*,+/g, ',')
            // Fix multiple consecutive commas
            .replace(/,{2,}/g, ',')
            // Remove trailing commas at start of objects/arrays
            .replace(/([{\[])\s*,/g, '$1')
            // Fix object/array spacing
            .replace(/{\s*/g, '{')
            .replace(/\s*}/g, '}')
            .replace(/\[\s*/g, '[')
            .replace(/\s*]/g, ']')
            // Fix key-value spacing
            .replace(/"\s*:\s*/g, '":')
            .replace(/:\s*/g, ':')
            .replace(/,\s*"/g, ',"')
            // Fix spacing around array commas
            .replace(/"\s*,\s*"/g, '","')
            // Remove any zero-width or invisible characters
            .replace(/[\u200B-\u200D\uFEFF]/g, '')
            // Remove unicode replacement characters
            .replace(/\uFFFD/g, '');
          
          const parsed = JSON.parse(ultraClean);
          return validator(parsed);
        } catch (thirdError) {
          // Strategy 5: Try to salvage partial data
          console.warn(`[${errorContext}] Ultra-aggressive cleanup failed, attempting partial recovery...`);
          
          try {
            // Look for a slides array specifically
            const slidesMatch = jsonString.match(/"slides"\s*:\s*\[([\s\S]*?)\](?=\s*[,}])/);
            if (slidesMatch) {
              const slidesArrayContent = slidesMatch[1];
              const reconstructed = `{"slides":[${slidesArrayContent}]}`;
              
              // Apply aggressive cleanup to reconstructed JSON
              const cleaned = reconstructed
                .replace(/,\s*([}\]])/g, '$1')
                .replace(/\r\n|\n|\r/g, ' ')
                .replace(/\s+/g, ' ');
              
              const parsed = JSON.parse(cleaned);
              return validator(parsed);
            }
          } catch (fourthError) {
            // All strategies failed - provide detailed error
            console.error(`[${errorContext}] All parsing strategies failed`);
            console.error('Strategy 1 error:', firstError);
            console.error('Strategy 2 error:', secondError);
            console.error('Strategy 3 error:', thirdError);
            console.error('Strategy 4 error:', fourthError);
            console.error('Original content (first 1000 chars):', content.substring(0, 1000));
            console.error('Final cleaned JSON (first 1000 chars):', jsonString.substring(0, 1000));
            
            // Try to find the exact error position
            if (secondError instanceof Error) {
              const errorMatch = secondError.message.match(/position (\d+)/);
              if (errorMatch) {
                const pos = parseInt(errorMatch[1]);
                const start = Math.max(0, pos - 100);
                const end = Math.min(jsonString.length, pos + 100);
                console.error(`Context around error position ${pos}:`, jsonString.substring(start, end));
                console.error(`Character at position ${pos}:`, jsonString.charAt(pos), `(code: ${jsonString.charCodeAt(pos)})`);
              }
            }
            
            throw new Error(`Failed to parse AI response after 5 attempts. The AI may have returned invalid JSON. Please try generating again.`);
          }
          
          // If partial recovery didn't throw, thirdError is the cause
          throw thirdError;
        }
      }
    }
    
  } catch (error) {
    console.error(`[${errorContext}] Parse error:`, error);
    console.error('Raw response (first 1000 chars):', content.substring(0, 1000));
    throw new Error(`${errorContext}: Failed to parse AI response. Please try again.`);
  }
}

export function parseJSONArray<T>(
  content: string,
  requiredFields: string[],
  maxCount: number,
  errorContext: string
): T[] {
  return parseJSONResponse<T[]>(
    content,
    (data) => {
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Response is not a valid array or is empty');
      }
      
      // Validate that items have required fields
      const valid = data.filter(item => {
        if (!item || typeof item !== 'object') return false;
        return requiredFields.every(field => field in item);
      });
      
      if (valid.length === 0) {
        throw new Error('No valid items in response');
      }
      
      return valid.slice(0, maxCount);
    },
    errorContext
  );
}

