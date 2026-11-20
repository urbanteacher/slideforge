// Starters: neutral decks to begin from, written as lesson files (docs/lesson-format.md) and built with the studio's
// own layouts and themes, so everything in them is something a teacher can pick, change and remake. They hold
// guidance, not facts: where a figure, name or date would go, a placeholder blank stands in ([__]), as AGENTS.md asks.
import type { Deck } from '../core';
import { deckFromLesson } from './fromLesson';
import type { Lesson } from './lessonFormat';

export interface Starter { id: string; name: string; blurb: string; lesson: Lesson }

const F = 'slideforge-lesson/1' as const;

export const STARTERS: Starter[] = [
  {
    id: 'lesson', name: 'Lesson', blurb: 'Hook, new ideas, a check, and a close. The shape of most classes.',
    lesson: { format: F, title: 'Lesson', theme: 'paper', slides: [
      { layout: 'title', title: 'Your lesson title', subtitle: 'Your name · the course' },
      { layout: 'statement', text: 'A question that makes them want to know.', credit: 'Ask it, then wait.', notes: 'The hook. Give the room ten seconds before anyone answers.' },
      { layout: 'bullets', title: 'By the end you can', points: ['Explain the first idea in your own words', 'Use it on an example you have not seen', 'Say where it does not work'] },
      { layout: 'keywords', title: 'Words we will use', terms: [['Term one', 'What it means, in one line.'], ['Term two', 'What it means, in one line.'], ['Term three', 'What it means, in one line.']] },
      { layout: 'cards', title: 'The big idea in three parts', cards: [['First', 'One sentence on the first part.'], ['Then', 'One sentence on what follows from it.'], ['So', 'One sentence on why it matters.']] },
      { layout: 'split', title: 'See it in an example', points: ['What to look at first', 'What it shows', 'What it leaves out'], side: 'right' },
      { layout: 'compare', title: 'Common mix-up', heads: ['It is', 'It is not'], rows: [['Meaning', 'The right reading', 'The usual mistake'], ['Example', 'A case that fits', 'A case that looks like it but does not']] },
      { layout: 'statement', text: 'Check: explain it to the person next to you.', credit: 'Two minutes, then three of you share.', notes: 'Listen for the mix-up on the slide before.' },
      { layout: 'bullets', title: 'Before you go', points: ['One thing you can now do', 'One thing still unclear', 'What we do next time'], notes: 'Exit ticket. Collect the unclear ones.' },
    ] },
  },
  {
    id: 'lecture', name: 'Lecture', blurb: 'Sections with a pause between each, evidence, and a summary at the end.',
    lesson: { format: F, title: 'Lecture', theme: 'navy', slides: [
      { layout: 'title', title: 'Lecture title', subtitle: 'Week [__] · your name' },
      { layout: 'bullets', title: 'Today', points: ['Part one: the question', 'Part two: the evidence', 'Part three: what it means'] },
      { layout: 'section', title: 'Part one', subtitle: 'The question we are asking' },
      { layout: 'keyfact', title: 'The number to remember', fact: '[__]', caption: 'What it counts, and where it is from', details: ['[source __]'], factCheck: 'Fill in the figure and its source' },
      { layout: 'quote', quote: 'A short line from someone who shaped the field.', who: '[name __], [year __]' },
      { layout: 'section', title: 'Part two', subtitle: 'What the evidence says' },
      { layout: 'stats', title: 'What the studies found', stats: [['[__]', 'First finding'], ['[__]', 'Second finding'], ['[__]', 'Third finding']], takeaway: 'One line on what the numbers add up to.', factCheck: 'Fill in each figure with its source' },
      { layout: 'timeline', title: 'How the idea developed', events: [['[year __]', 'First step', 'What changed'], ['[year __]', 'Second step', 'What changed'], ['[year __]', 'Where it is now', 'What is still open']] },
      { layout: 'section', title: 'Part three', subtitle: 'What it means for us' },
      { layout: 'bullets', title: 'Summary', points: ['The question, in one line', 'What the evidence says', 'What to read before next week'] },
    ] },
  },
  {
    id: 'workshop', name: 'Workshop', blurb: 'A brief, the steps, timed tasks and a share-back. For practicals and studio time.',
    lesson: { format: F, title: 'Workshop', theme: 'mono', slides: [
      { layout: 'title', title: 'Workshop title', subtitle: 'What you will make today' },
      { layout: 'statement', text: 'Today you will make one thing that works.', credit: 'Finished beats perfect.' },
      { layout: 'icons', title: 'You will need', items: [['laptop', 'A laptop', 'Charged, with the files open'], ['book-open', 'The brief', 'On the shared drive'], ['users', 'A partner', 'Someone you have not worked with']] },
      { layout: 'timeline', title: 'The steps', events: [['10 min', 'Plan', 'Sketch it on paper first'], ['30 min', 'Build', 'Get one part working'], ['10 min', 'Test', 'Swap with another pair'], ['10 min', 'Share', 'Show what you found']] },
      { layout: 'cards', title: 'What good looks like', cards: [['Works', 'It does the one job it is for.'], ['Clear', 'Someone else can follow it.'], ['Honest', 'You say what it cannot do.']] },
      { layout: 'statement', text: 'Stuck? Ask two people before you ask me.', credit: 'Then put your hand up.' },
      { layout: 'bullets', title: 'Share back', points: ['What you made', 'What went wrong, and how you fixed it', 'What you would do with another hour'] },
    ] },
  },
  {
    id: 'talk', name: 'Talk', blurb: 'Big lines, few words, one idea a slide. For keynotes, assemblies and conference talks.',
    lesson: { format: F, title: 'Talk', theme: 'midnight', slides: [
      { layout: 'title', title: 'The title of your talk', subtitle: 'Your name · where and when' },
      { layout: 'statement', text: 'Start with the thing they will remember.', notes: 'Say it. Pause. Then tell them why.' },
      { layout: 'keyfact', title: 'Why this matters now', fact: '[__]', caption: 'The one number that frames the talk', factCheck: 'Fill in the figure and its source' },
      { layout: 'statement', text: 'Here is what most people get wrong.' },
      { layout: 'cards', title: 'Three things to take away', cards: [['One', 'The first idea, in a sentence.'], ['Two', 'The second, in a sentence.'], ['Three', 'The third, in a sentence.']] },
      { layout: 'quote', quote: 'A line from someone you spoke to, in their words.', who: '[name __]' },
      { layout: 'statement', text: 'End with what you want them to do tomorrow.', credit: 'Thank you' },
    ] },
  },
  {
    id: 'revision', name: 'Revision', blurb: 'Key terms, a summary table, worked contrasts and questions to try.',
    lesson: { format: F, title: 'Revision', theme: 'paper', slides: [
      { layout: 'title', title: 'Revision: the topic', subtitle: 'What the exam will ask' },
      { layout: 'keywords', title: 'Key terms', terms: [['Term one', 'The definition you must know.'], ['Term two', 'The definition you must know.'], ['Term three', 'The definition you must know.'], ['Term four', 'The definition you must know.']] },
      { layout: 'table', title: 'The topic on one page', rows: [['Idea', 'What it says', 'An example'], ['First', 'In a line', 'A case'], ['Second', 'In a line', 'A case'], ['Third', 'In a line', 'A case']] },
      { layout: 'compare', title: 'Easy to confuse', heads: ['This', 'That'], rows: [['What it is', 'One line', 'One line'], ['When you use it', 'One line', 'One line'], ['Watch out for', 'One line', 'One line']] },
      { layout: 'bullets', title: 'How to answer a long question', points: ['Underline the command word', 'Plan three points before you write', 'Use one example for each', 'Finish with a judgement'] },
      { layout: 'statement', text: 'Try one question in ten minutes.', credit: 'Then mark it with the person next to you.' },
    ] },
  },
  {
    id: 'brief', name: 'Project brief', blurb: 'The task, what to hand in, the deadlines and how it is marked.',
    lesson: { format: F, title: 'Project brief', theme: 'navy', slides: [
      { layout: 'title', title: 'Project title', subtitle: 'Set [date __] · due [date __]' },
      { layout: 'statement', text: 'The task in one sentence.', credit: 'Everything else on these slides is detail.' },
      { layout: 'bullets', title: 'What to hand in', points: ['The main piece of work', 'A short write-up of how you made it', 'Your sources'] },
      { layout: 'timeline', title: 'Key dates', events: [['[date __]', 'Brief set', 'Today'], ['[date __]', 'Plan due', 'One page'], ['[date __]', 'Draft feedback', 'In class'], ['[date __]', 'Final deadline', 'Online, by [time __]']] },
      { layout: 'table', title: 'How it is marked', rows: [['Criterion', 'Weight', 'What earns top marks'], ['Idea', '[__]%', 'Clear, original, well argued'], ['Making', '[__]%', 'Careful, finished, works'], ['Reflection', '[__]%', 'Honest about what you would change']] },
      { layout: 'bullets', title: 'Getting help', points: ['Office hours: [day and time __]', 'Questions on the course page', 'Extensions: ask before the deadline'] },
    ] },
  },
  {
    id: 'briefing', name: 'Team briefing', blurb: 'Where things stand, what changed, decisions needed, next steps.',
    lesson: { format: F, title: 'Team briefing', theme: 'paper', slides: [
      { layout: 'title', title: 'Briefing', subtitle: '[date __] · your team' },
      { layout: 'stats', title: 'Where we are', stats: [['[__]', 'First measure'], ['[__]', 'Second measure'], ['[__]', 'Third measure']], takeaway: 'One line on the trend.' },
      { layout: 'compare', title: 'What changed', heads: ['Before', 'Now'], rows: [['Plan', 'What we said', 'What we are doing'], ['Timing', 'The old date', 'The new date']] },
      { layout: 'cards', title: 'Decisions needed', cards: [['First', 'What we need to decide, and by when.'], ['Second', 'What we need to decide, and by when.']] },
      { layout: 'table', title: 'Next steps', rows: [['Action', 'Who', 'By'], ['First action', '[name __]', '[date __]'], ['Second action', '[name __]', '[date __]']] },
    ] },
  },
  {
    id: 'case', name: 'Case study', blurb: 'The situation, what happened, what we can learn. For discussion-led sessions.',
    lesson: { format: F, title: 'Case study', theme: 'cinematic', slides: [
      { layout: 'title', title: 'Case study: the name', subtitle: 'A real situation to think through' },
      { layout: 'split', title: 'The situation', points: ['Who was involved', 'What they wanted', 'What stood in the way'], side: 'left' },
      { layout: 'timeline', title: 'What happened', events: [['[date __]', 'It began', 'The first decision'], ['[date __]', 'It turned', 'What changed'], ['[date __]', 'It ended', 'The outcome']], factCheck: 'Fill in the dates from your source' },
      { layout: 'statement', text: 'What would you have done?', credit: 'Five minutes in groups.' },
      { layout: 'compare', title: 'Two readings', heads: ['It worked because', 'It failed because'], rows: [['People', 'One line', 'One line'], ['Timing', 'One line', 'One line'], ['Choices', 'One line', 'One line']] },
      { layout: 'bullets', title: 'What we can learn', points: ['One lesson that travels', 'One that only fits this case', 'One question still open'] },
    ] },
  },
];

/** A starter as a deck of its own, in its theme, ready to edit. */
export function starterDeck(id: string): Deck | null {
  const s = STARTERS.find((x) => x.id === id);
  if (!s) return null;
  const d = deckFromLesson(structuredClone(s.lesson));
  d.title = s.name;
  return d;
}
