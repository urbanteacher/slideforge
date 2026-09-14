# 🎨 AI Service - Modular Architecture

**Version 3.0.0** - Refactored from single 1989-line monolith into clean 7-file architecture

---

## 📁 Directory Structure

```
lib/ai-service/
├── index.ts                          # Main export & singleton (235 lines)
├── types.ts                          # Type definitions (95 lines)
├── core/
│   ├── gemini-client.ts             # API communication + rate limiting (174 lines)
│   └── json-parser.ts               # JSON parsing utilities (70 lines)
├── classification/
│   └── activity-classifier.ts       # Activity detection (284 lines)
├── prompts/
│   ├── tailoring-prompts.ts         # Activity tailoring (134 lines)
│   ├── slide-prompts.ts             # Slide generation (331 lines)
│   └── activity-guidance.ts         # Special guidance (714 lines)
├── validators/
│   ├── term-validator.ts            # Term validation (46 lines)
│   └── slide-validator.ts           # Slide validation (63 lines)
└── generators/
    ├── game-generators.ts           # Game content (409 lines)
    ├── step-enricher.ts             # Step enrichment (115 lines)
    └── slide-generator.ts           # Slide orchestrator (47 lines)
```

**Total:** 11 files, ~2,717 lines (properly distributed)

---

## 🎯 Benefits of New Architecture

### 1. **Single Responsibility Principle**
- Each file has one clear, focused purpose
- Easy to understand what each module does

### 2. **Better Maintainability**
- Changes to game generators don't affect slide prompts
- Activity classification logic is isolated
- Validators are reusable

### 3. **Improved Testability**
- Can unit test classifiers independently
- Mock validators for testing
- Test prompt builders without API calls

### 4. **Scalability**
- Easy to add new activity types in `activity-classifier.ts`
- New game generators in `game-generators.ts`
- New prompt types in `prompts/` directory

### 5. **Code Navigation**
- Find specific logic quickly
- No scrolling through 2000 lines
- Clear file names indicate purpose

---

## 🔧 How to Use

### Import the Service

```typescript
import { aiService } from '@/lib/ai-service';
```

### All Previous Functionality Preserved

```typescript
// Activity Tailoring
const result = await aiService.tailorActivity({...});

// Slide Generation
const slides = await aiService.generateSlides({...});

// Step Enrichment
const enriched = await aiService.enrichStep('CPU', 'Step 1', []);

// Game Generators
const keywords = await aiService.generateKeywords('CPU', 8);
const quiz = await aiService.generateTrueFalseQuestions('CPU', 10);

// Classification
const classification = aiService.classifyActivity('Think-Pair-Share', 'Discussion activity');
const shouldSuggest = aiService.shouldSuggestAddingTerms('Word Splash', 'Vocabulary');
```

**✅ All existing components work without changes** (except import path updates)

---

## 📦 Module Responsibilities

### **index.ts**
- Main service class orchestration
- Delegates to specialized modules
- Public API for all AI features
- Singleton pattern

### **types.ts**
- Centralized type definitions
- Constants (TOKEN_LIMITS, TEMPERATURES, RATE_LIMIT)
- Interfaces for requests/responses

### **core/gemini-client.ts**
- API communication with Gemini
- Rate limiting logic
- Request queue management
- Error handling

### **core/json-parser.ts**
- Robust JSON parsing
- Handles markdown code blocks
- Cleans common AI formatting errors
- Array validation

### **classification/activity-classifier.ts**
- Detects activity types (discussion, review, worked example, etc.)
- Keyword-based classification
- UI helper functions for suggestions

### **prompts/tailoring-prompts.ts**
- Builds activity tailoring prompts
- Markdown formatting cleanup
- Vivid content generation rules

### **prompts/slide-prompts.ts**
- Main slide prompt orchestration
- Content slide requirement detection
- Prompt section builders

### **prompts/activity-guidance.ts**
- Activity-specific guidance (600+ lines)
- 8 different activity types
- Detailed examples and templates

### **validators/term-validator.ts**
- Validates user-defined technical terms
- Checks for duplicates, length limits
- Importance level validation

### **validators/slide-validator.ts**
- Validates generated slides
- Ensures question slides have answers
- Checks required fields

### **generators/game-generators.ts**
- 13 different game content generators
- Keywords, True/False, Quiz Bowl, etc.
- Consistent error handling

### **generators/step-enricher.ts**
- Enriches individual activity steps
- Context-aware content generation
- Activity-specific rules

### **generators/slide-generator.ts**
- Orchestrates slide generation
- Calls prompt builders
- Validates output

---

## 🔄 Migration Complete

✅ All 17 component files updated  
✅ All imports changed from `@/lib/gemini-ai-service` to `@/lib/ai-service`  
✅ Application compiles successfully  
✅ All functionality preserved  
✅ Old 1989-line file removed  

---

## 🎓 Code Quality Improvements

**Before:**
- ❌ 1989 lines in one file
- ❌ Hard to find specific logic
- ❌ Difficult to test individual concerns
- ❌ Cognitive overload

**After:**
- ✅ 11 focused files (~250 lines average)
- ✅ Clear file names indicate purpose
- ✅ Easy to unit test each module
- ✅ Follows SOLID principles

---

## 📝 Notes

- All existing components continue to work
- No breaking changes to the API
- Backward compatible
- Linter warnings (unescaped quotes) can be fixed incrementally

---

**Architecture implemented:** October 2025  
**Original request:** User-proposed 7-file split  
**Result:** Clean, maintainable, scalable AI service

