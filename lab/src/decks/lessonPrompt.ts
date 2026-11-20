// The prompt a teacher copies into ChatGPT, Claude or another AI to have it write a lesson file (the starter screen's
// "Write it with an AI"). It is built from the format's own list of layouts and fields, so it never names a layout the
// studio cannot build. What comes back is pasted in and read like any lesson file (readLesson); `cleanPasted` takes off
// what chat tools wrap round it.
import { BUILD_LAYOUTS, LESSON_CAPS, LESSON_FORMAT, LESSON_LAYOUTS, LESSON_THEME_IDS } from './lessonFormat';

const SHAPES: Record<string, string> = {
  cards: '[["Heading", "One sentence."], …]', keywords: 'terms: [["Term", "Meaning."], …]', stats: 'stats: [["[__]", "what it counts"], …]',
  compare: 'heads: ["A", "B"], rows: [["Row", "A says", "B says"], …]', table: 'rows: [["Header", "Header"], ["cell", "cell"], …]',
  timeline: 'events: [["when", "who or what", "detail"], …]', icons: 'items: [["icon-name", "Label", "What it means"], …]',
  quiz: 'questions: [{ "question": "…", "options": ["…", "…"], "answer": 1, "explanation": "…" }]',
  pictures: 'pictures: [["picture address", "caption"], …]', chart: 'chart: "column", data: [["label", 3], …]',
  diagram: 'diagram: "loop" or "flowchart", steps: ["…", "…"]', journey: 'steps: [["Step", "What happens."], …]',
  funnel: 'stages: [["Stage", "[__]", "what it counts"], …]', mindmap: 'ideas: [["Idea", "A line on it."], …]',
  orgchart: 'people: [["Name", "Role", "who they report to, or \\"\\""], …]',
};

/** The prompt, with the teacher's topic and audience filled in where given. */
export function lessonPrompt(topic = '', audience = '', minutes = ''): string {
  const layouts = Object.entries(LESSON_LAYOUTS).filter(([k]) => k !== 'widget').map(([k, v]) => {
    const fields = [...v.needs.map((f) => `"${f}"`), ...v.may.map((f) => `"${f}" (optional)`)].join(', ');
    const cap = LESSON_CAPS[k as keyof typeof LESSON_CAPS];
    return `- ${k}: ${fields}${SHAPES[k] ? `. Shape: ${SHAPES[k]}` : ''}${cap ? `. Up to ${cap.cap} per slide` : ''}`;
  }).join('\n');
  return `Write a lesson for SlideForge as one JSON object. Reply with the JSON only, no other words.

Topic: ${topic || '[the topic]'}
Who it is for: ${audience || '[the class or audience]'}
Length: ${minutes || '[how many minutes]'}

The file:
{ "format": "${LESSON_FORMAT}", "title": "…", "theme": "${LESSON_THEME_IDS[0]}", "slides": [ … ] }

"theme" is optional: one of ${LESSON_THEME_IDS.join(', ')}.

Each slide is an object with a "layout" and that layout's fields:
${layouts}

Every slide may also have:
- "notes": what the teacher says (never shown to the class);
- "build": "click", "dim" or "spot", to reveal the items one click at a time. Only on ${BUILD_LAYOUTS.join(', ')};
- "audience": "teacher", for a slide the students' copy should leave out;
- "factCheck": the words to check, for any fact you are not sure of.

Rules:
1. One idea per slide. Prefer a statement, key fact, cards or a diagram to a long list of bullets. Use "build" to reveal a list or cards one at a time, rather than repeating a slide.
2. Never invent a fact. Where a number, name, date or source is not given, write a blank like [__], [€__] or [source __]. Put anything you recall but have not checked in "factCheck".
3. Short words on slides; the detail goes in "notes".
4. Vary the layouts, and start with a "title" slide.`;
}

/** What chat tools wrap a JSON reply in, taken off: a ```json fence, words before the first { or after the last },
 *  smart quotes and trailing commas. Inside strings nothing is changed but the quotes a chat tool curls. */
export function cleanPasted(text: string): string {
  let t = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a >= 0 && b > a) t = t.slice(a, b + 1);
  t = t.replace(/[“”]/g, '"');
  return t.replace(/,(\s*[}\]])/g, '$1');
}
