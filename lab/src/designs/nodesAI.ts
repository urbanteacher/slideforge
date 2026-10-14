// Write a Nodes format with AI: a topic, and who it is for. One request per challenge — the format's
// content, as JSON in its own shape — and the slides are drawn again from what comes back, so a
// Framework's 19 slides cost one answer, not 19. Inside SlideForge the request goes through its AI
// (js/ai.js generateJson, the server's key); the Nodes stage data (each stage's question, outcome and
// backbone) is never rewritten, only the topic-specific words. Sources, examiner quotes and statistics
// are never invented.
import type { Audience } from './activityAI';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Host = { AI: { generateJson: (system: string, user: string, maxTokens?: number) => Promise<any> } };
function host(): Host | null {
  const ok = (w: any) => (w?.SF?.AI?.generateJson ? (w.SF as Host) : null);
  try { return ok(window) ?? (window.parent !== window ? ok(window.parent) : null); } catch { return null; }
}
export const canWriteNodes = () => !!host();

const BASE = 'You write one Nodes challenge for a class. Reply with only a JSON object in exactly the shape given, no markdown. UK English, plain words, accurate subject content a teacher can trust. Never invent sources, examiner quotes, mark-scheme references, board names or statistics.';

interface Spec { shape: string; rules: string; tokens: number; check: (v: any) => boolean; merge: (cur: any, v: any) => any }
const str = (x: unknown) => typeof x === 'string' && x.trim().length > 0;
const arr = (x: unknown, min = 1) => Array.isArray(x) && x.length >= min;

const SPECS: Record<string, Spec> = {
  'join-it-up': {
    shape: '{"command":"Explain","question":"…","size":"Explain: a point, the reason, and what follows from it","links":[{"name":"Point","text":"…"},{"name":"Because","text":"…"},{"name":"So","text":"…"},{"name":"In this case","text":"…"}],"refused":"…"}',
    rules: 'The question uses the command word. 3 to 5 links, read in order as one complete answer; each link short (under 12 words). "refused" says what an answer without the links is refused for, in lower case.',
    tokens: 900, check: (v) => str(v.question) && arr(v.links, 2) && v.links.every((l: any) => str(l.name) && str(l.text)), merge: (c, v) => ({ ...c, ...v }),
  },
  'three-answers': {
    shape: '{"question":"…","answers":[{"label":"A","verdict":"weak","text":"…","why":"…","feedback":"…","elements":0,"of":5},{"label":"B","verdict":"stable","text":"…","why":"…","feedback":"…","elements":2,"of":5},{"label":"C","verdict":"excellent","text":"…","why":"…","feedback":"…","elements":5,"of":5}]}',
    rules: 'A misses the point; B has points but not the links or precision; C is complete and precise. "elements" counts the useful elements each has, out of "of". "feedback" is one short question or task for that answer.',
    tokens: 1300, check: (v) => str(v.question) && arr(v.answers, 3) && v.answers.every((a: any) => str(a.text) && ['weak', 'stable', 'excellent'].includes(a.verdict)), merge: (c, v) => ({ ...c, ...v }),
  },
  'which-step': {
    shape: '{"question":"…","answer":"…","broke":1,"why":"…","fix":"…"}',
    rules: 'A realistic wrong answer to the question. "broke" is where it broke: 0 Decode (misread the command word, marks or scenario), 1 Retrieve (wrong or confused knowledge), 2 Reason (ideas not joined), 3 Refine (not precise: no technical term where accuracy depends on it), 4 Review (endpoints, units, or does not answer everything). "fix" is what to write instead.',
    tokens: 600, check: (v) => str(v.question) && str(v.answer) && Number.isInteger(v.broke) && v.broke >= 0 && v.broke <= 4, merge: (c, v) => ({ ...c, ...v, steps: c.steps }),
  },
  'label-parts': {
    shape: '{"question":"…","parts":[{"role":"Point","text":"…"},{"role":"Explained","text":"…"},{"role":"So","text":"…"},{"role":"Point","text":"…"},{"role":"Because","text":"…"}]}',
    rules: '4 to 6 parts of one strong answer, in order. Each role is Point, Explained, So or Because. Each part under 14 words.',
    tokens: 800, check: (v) => str(v.question) && arr(v.parts, 3) && v.parts.every((p: any) => str(p.text) && str(p.role)), merge: (c, v) => ({ ...c, ...v, shown: undefined }),
  },
  'same-word': {
    shape: '{"command":"Explain","questions":[{"question":"…","kind":"Definition","from":"a term","to":"its precise meaning"},{"question":"…","kind":"Explanation","from":"a claim","to":"the mechanism that explains it"},{"question":"…","kind":"Evaluation","from":"evidence and criteria","to":"a judgement"}]}',
    rules: 'Three questions on the topic, all starting with the same command word, each needing a different relationship. "kind" is Definition, Description, Explanation or Evaluation.',
    tokens: 800, check: (v) => str(v.command) && arr(v.questions, 2) && v.questions.every((q: any) => str(q.question) && str(q.kind)), merge: (c, v) => ({ ...c, ...v }),
  },
  'before-during-after': {
    shape: '{"task":"…"}', rules: 'One exam-style task on the topic for students to attempt.',
    tokens: 300, check: (v) => str(v.task), merge: (c, v) => ({ ...c, task: v.task }),
  },
  'ladder': {
    shape: '{"question":"…","relation":"… → …","rungs":[{"name":"Unaided","text":"Have a go on your own first."},{"name":"Neutral prompt","text":"“…”"},{"name":"Partial hint","text":"“…”"},{"name":"Model","text":"…"},{"name":"New task","text":"“…”"}],"repair":"…","later":"“…”"}',
    rules: 'The relation is the link the answer must make, as "a → b". The neutral prompt names no answer; the partial hint gives one piece; the model is a short correct answer; the new task is a near case. "later" is a far case for another lesson; "repair" says what an unasked correct answer looks like.',
    tokens: 1000, check: (v) => str(v.question) && str(v.relation) && arr(v.rungs, 4) && str(v.later), merge: (c, v) => ({ ...c, ...v }),
  },
  'new-case': {
    shape: '{"relation":"… → … → …","near":"…","far":"…","same":"…","worked":{"near":"…","far":"…"}}',
    rules: 'The relation is the link, as "a → b → c". "near": the same topic, a new case. "far": another context entirely that needs the same link. "same": what stays the same, in one sentence. "worked": each case\'s worked answer, the link applied step by step, under 30 words each.',
    // New cases need their own worked answers: the old ones answered the old cases.
    tokens: 700, check: (v) => str(v.relation) && str(v.near) && str(v.far), merge: (c, v) => ({ ...c, ...v, worked: str(v.worked?.near) && str(v.worked?.far) ? v.worked : undefined }),
  },
  'keep-apart': {
    shape: '{"a":{"term":"…","is":"…"},"b":{"term":"…","is":"…"},"test":"…","statements":[{"text":"…","side":"a"},{"text":"…","side":"b"},{"text":"…","side":"a"},{"text":"…","side":"b"},{"text":"…","side":"a"},{"text":"…","side":"b"}]}',
    rules: 'Two ideas on the topic that students often treat as one. "test" is one question that tells them apart. Six short statements, three true of each.',
    tokens: 800, check: (v) => str(v.a?.term) && str(v.b?.term) && str(v.test) && arr(v.statements, 4), merge: (c, v) => ({ ...c, ...v }),
  },
  'size-answer': {
    shape: '{"questions":[{"question":"…","command":"State","marks":1,"needs":["one precise point"]},{"question":"…","command":"Describe","marks":2,"needs":["a point","its expansion"]},{"question":"…","command":"Explain","marks":2,"needs":["a point","because…"]}]}',
    rules: 'Three exam-style questions on the topic with different command words and marks. "needs" is what the answer must contain, one part per mark, in a few words each.',
    tokens: 700, check: (v) => arr(v.questions, 2) && v.questions.every((q: any) => str(q.question) && Number.isInteger(q.marks) && arr(q.needs)), merge: (c, v) => ({ ...c, ...v }),
  },
  'model-marks': {
    shape: '{"question":"… [4 marks]","outOf":4,"scheme":[{"marks":"1","needs":"…","falls":"…"},{"marks":"2","needs":"…","falls":"…"},{"marks":"3–4","needs":"…","falls":"…"}],"answers":[{"label":"A","text":"…","marks":0,"why":"…"},{"label":"B","text":"…","marks":2,"why":"…"},{"label":"C","text":"…","marks":4,"why":"…"}]}',
    rules: 'A planning aid in the style of a points-based mark scheme, not any board’s own. Each scheme row says what EARNS that mark: "needs" is what the answer must contain (e.g. "Two points"), "falls" is what is credited, with a short example of a creditworthy point — never a description of a weak answer. Three model answers at different marks, each with a one-line reason for its mark.',
    tokens: 1400, check: (v) => str(v.question) && arr(v.scheme, 2) && arr(v.answers, 2), merge: (c, v) => ({ ...c, ...v }),
  },
};

/** A framework sends only its stages' names and questions (the request is small); AI writes the topic's recall and a task per stage. */
function frameworkSpec(cur: any): Spec {
  const stages = (cur.stages ?? []).map((s: any, i: number) => `${i + 1}. ${s.name}: ${s.ask}`).join('\n');
  return {
    shape: '{"topic":"…","recall":[{"term":"…","meaning":"…"},{"term":"…","meaning":"…"},{"term":"…","meaning":"…"},{"term":"…","meaning":"…"},{"term":"…","meaning":"…"},{"term":"…","meaning":"…"}],"tasks":["…"],"models":["…"]}',
    rules: `The framework is ${cur.framework}. Its stages, in order (keep this order; one task per stage, ${cur.stages?.length ?? 0} tasks):\n${stages}\nEach task is one short classroom task on the topic that does what its stage asks. "models" has one model answer per task, in the same order: what a secure student answer says, under 35 words, accurate and specific to the topic. Six recall terms the class must know first, each meaning in one sentence.`,
    tokens: 2400,
    check: (v) => str(v.topic) && arr(v.recall, 3) && arr(v.tasks, Math.max(1, (cur.stages?.length ?? 1) - 1)),
    merge: (c, v) => ({ ...c, topic: v.topic, recall: v.recall.slice(0, 6), stages: c.stages.map((s: any, i: number) => {
      const task = str(v.tasks[i]) ? v.tasks[i] : s.task, model = Array.isArray(v.models) && str(v.models[i]) ? v.models[i] : undefined;
      // A new task needs its own model answer: the old one answered the old task.
      return { ...s, task, model: model ?? (task === s.task ? s.model : undefined) };
    }) }),
  };
}

const who = (a: Audience) => [a.yearGroup ? `For ${a.yearGroup}.` : '', a.misconceptions ? `They often get wrong: ${a.misconceptions}.` : '', a.constraints?.length ? `Constraints: ${a.constraints.join(', ')}.` : ''].filter(Boolean).join(' ');

/** What the teacher gives the writer: the subject, the topic, its technical terms and the course overview. */
export interface NodesBrief { subject?: string; topic: string; terms?: string; overview?: string }

/** The brief as the request's words, kept inside the request's size (the relay takes 1,800 characters). */
function briefText(b: NodesBrief): string {
  return [
    b.subject?.trim() ? `Subject: ${b.subject.trim().slice(0, 80)}.` : '',
    `Topic: ${b.topic.trim().slice(0, 160)}.`,
    b.terms?.trim() ? `Technical terms to use, accurately (and as the recall terms where there are any): ${b.terms.trim().slice(0, 300)}.` : '',
    b.overview?.trim() ? `Course overview, what students should learn: ${b.overview.trim().slice(0, 900)}` : '',
  ].filter(Boolean).join('\n');
}

/** The format's content written from the brief, or why not. */
export async function writeNodes(format: string, current: any, brief: NodesBrief, aud: Audience): Promise<{ content?: any; error?: string }> {
  const h = host();
  if (!h) return { error: 'Writing with AI works when the studio is open inside SlideForge, which holds the AI key.' };
  const spec = format === 'framework' ? frameworkSpec(current) : SPECS[format];
  if (!spec) return { error: 'This format cannot be written with AI yet.' };
  const system = `${BASE}\nShape: ${spec.shape}\nRules: ${spec.rules}`;
  const user = `${briefText(brief)}\n${who(aud)}`.trim();
  try {
    const v = await h.AI.generateJson(system, user, spec.tokens);
    if (!v || typeof v !== 'object' || !spec.check(v)) return { error: 'The AI’s answer was not in the right shape. Try again.' };
    return { content: spec.merge(current, v) };
  } catch (e) {
    return { error: (e as Error)?.message || 'The AI could not be reached. Try again in a moment.' };
  }
}
