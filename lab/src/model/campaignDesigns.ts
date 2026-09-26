import { aiad27Slide, themeLook } from './aiad27';
import { deckFromSlideForge, type SFSlide, type SlideDesign } from './fromSlideForge';
import type { LayoutStyle } from './layouts';

// The campaign designs in the left panel. Each is SlideForge's own slide for the campaign, built by the
// converter as a lesson of the campaign would be (so it carries the campaign's frame, labels and type),
// with the words its Safe lesson has, ready to be written over. The nine 2027 structures are also
// Layouts: the same composition, in the deck's own theme (compositionLayouts).

/** AI Awareness Day 2027's compositions, with Safe's words (AiAd27/starters27.js). */
const SLIDES_2027: (SFSlide & { name: string; blurb: string })[] = [
  { name: 'Poster cover', blurb: 'The question beside the strand’s poster, the label over it, the tagline under it.', type: 'title', title: 'Would you tell an AI your secret?', subtitle: 'Starter activity', body: 'Your AI. Your choices.', image: 'assets/brand/aiad27/poster-safe.svg' },
  { name: 'Scenario', blurb: 'One human voice on ink, the mark hung in the corner.', type: 'quote', subtitle: 'The scenario · 30 seconds', body: 'I told it something I have never told anyone. It said it understood.' },
  { name: 'A–D ballot', blurb: 'Four choices two by two, lettered as the room votes on the wall and on the phones.', type: 'cards', title: 'Where does that message go?', body: 'Choose A, B, C or D. Be ready to say why.', bullets: ['It stays between us\tNobody else ever sees it.', 'Stored, but safely\tKept on a server, protected, not looked at.', 'It trains the next version\tYour words become part of what it learns from.', 'Nobody actually knows\tIncluding the person who typed it.'] },
  { name: 'Discussion', blurb: 'One question for pairs, on the strand’s colour, beside the two-way arrow.', type: 'statement', subtitle: 'Discuss in pairs · 75 seconds', body: 'Where does a secret go when you tell it to something that cannot keep one?' },
  { name: 'Risk map', blurb: 'Four risks two by two, each numbered and named, with its source under them.', type: 'iceberg', title: 'A private feeling. Four possible risks.', subtitle: 'A message you would never say out loud', body: 'Source: UNICEF, “When AI becomes a friend”, June 2026', bullets: ['Emotional dependence\tRisk 1\tthe pull to return to it, not to a person', 'Data elicitation\tRisk 2\tbuilt to draw things out of you', 'Harmful advice\tRisk 3\tconfident, wrong, about things that matter', 'Sexualised role-play\tRisk 4\tincluding with users known to be children'] },
  { name: 'Comparison', blurb: 'Two columns, row by row: what one does, what the other does.', type: 'compare', title: 'A chatbot answers. An agent acts.', subtitle: 'A chatbot | An agent', bullets: ['Gives you something to use\tGoes and does the next step', 'You decide whether to act on it\tIt has already acted', 'A wrong answer costs you time\tA wrong action costs money, or a relationship', 'You can check before anything happens\tYou check afterwards, if at all'] },
  { name: 'Credits', blurb: 'A claim with its working shown: each part, whose it was, and what that means.', type: 'sourcecheck', title: '“My track. Out now.”', subtitle: 'The same claim, with its working shown', bullets: ['The idea\tYours\tone sentence — but nobody else wrote that sentence', 'The words\tGenerated\tyou kept them as they came', 'The music\tGenerated\tfrom a style you chose', 'Declared\tNowhere\tthe post does not say any of the above'] },
  { name: 'Lanes', blurb: 'Two lanes, each thing in the one its position puts it in.', type: 'spectrum', title: 'Who decides?', subtitle: 'You decide | It decides', bullets: ['What you search for\t20', 'Which result comes first\t70', 'What you read next\t45', 'What you are shown next\t85'] },
  { name: 'Numbered rules', blurb: 'Three numbered rows, the line that sums them up under the last. Press + to add a point.', type: 'journey', title: 'What to remember', subtitle: 'Three things, in the order you would use them', bullets: ['Keep it off the record\tPrivate information stays out of an AI chat — names, images, anything about someone else.', 'Check before you talk\tLook at the privacy setting once, before you need it.', 'Take the serious things to a person\tSomeone who can actually do something about it.'] },
  { name: 'Commitment', blurb: 'The rising mark beside one decision, and the line to write it on.', type: 'keyfact', title: 'Name one thing you will take to a person', subtitle: 'Your choice · 45 seconds', body: 'Decide now which kind of thing you will say out loud to someone who can actually do something about it.', bullets: ['One choice I will make:'] },
];

/** AI Awareness Day 2026's slides with their labels, with Safe's words (AiAd26/starters.js). */
const SLIDES_2026: (SFSlide & { name: string; blurb: string })[] = [
  { name: 'Cover', blurb: 'The question, the badge top left and the campaign line along the foot.', type: 'title', title: 'Who’s really behind the screen?', subtitle: 'Understanding AI-generated content and deepfakes' },
  { name: 'Think & discuss', blurb: 'The discussion question in the frame, labelled THINK & DISCUSS.', type: 'statement', subtitle: 'Talk to the person next to you — 60 seconds', body: 'If you couldn’t tell whether a video of your friend was real or AI-generated, what would you do?' },
  { name: 'Did you know?', blurb: 'Three numbers under the claim, labelled DID YOU KNOW?, with their sources.', type: 'stats', title: '1 in 17 young people have been targeted by deepfake image abuse', subtitle: 'Did you know?', bullets: ['Deepfakes shared online\t8 million\tin 2025 — up from 500,000 in 2023', 'Of all deepfakes\t98%\tare non-consensual intimate images', 'UK teenagers\t4 in 5\thave used generative AI tools'], body: 'Thorn Research 2025 · European Parliament 2025' },
  { name: 'Answer', blurb: 'The answers as cards, labelled ANSWER after the question.', type: 'cards', title: 'So what do you actually do?', bullets: ['Don’t share it\tSharing spreads potential harm even if you are trying to warn people.', 'Check the source\tIs it from an official or verified account? Where did it originally come from?', 'Reverse image search\tSee whether the content appears elsewhere, or has been flagged as fake.', 'Look for the tells\tUnnatural blinking, strange lighting, blurry edges around face and hair.'] },
];

/** A lesson's slides built as the converter builds them in the campaign's strand, one design each. */
/** The composition SlideForge sets each 2027 slide type in (AiAd27/starters27.js COMPOSITION_DEFAULTS). */
const COMPOSITION: Record<string, string> = { title: 'poster-art', quote: 'voice', cards: 'ballot', statement: 'prompt', iceberg: 'reveal-map', compare: 'comparison', sourcecheck: 'credits', spectrum: 'lanes', journey: 'rules', keyfact: 'commitment' };
for (const s of SLIDES_2027) s.design = { composition: COMPOSITION[s.type] };

function built(theme: string, palette: string, slides: (SFSlide & { name: string; blurb: string })[], group: string): SlideDesign[] {
  // Two slides where a label needs the slide before it (the ANSWER after THINK & DISCUSS): built in order.
  const deck = deckFromSlideForge({ title: 'AI Awareness Day', theme, slides: slides.map(({ name, blurb, ...s }, i) => ({ ...s, id: `${palette}-${i}` })), images: new Proxy({}, { get: (_, k) => `../${String(k)}` }) } as never, palette, { frame: false, set: '1' });
  return slides.map((s, i) => {
    const slide = deck.slides.find((x) => x.sourceSlideId === `${palette}-${i}`);
    return slide ? { id: `${palette}-${s.type}-${i}`, name: s.name, group, blurb: s.blurb, slide } : null;
  }).filter((x): x is SlideDesign => !!x);
}

export const CAMPAIGN_GROUPS = ['AI Awareness Day 2027', 'AI Awareness Day 2026'];

/** The campaigns' own slides, in their own look, for the Slide designs panel. */
export function campaignDesigns(): SlideDesign[] {
  return [...built('aiad27-safe', 'aiad27', SLIDES_2027, CAMPAIGN_GROUPS[0]), ...built('aiad26-safe', 'aiad26', SLIDES_2026, CAMPAIGN_GROUPS[1])];
}

/** The 2027 compositions as layouts: the same structure, in the deck's theme, for any lesson. */
export function compositionLayouts(st: LayoutStyle): { id: string; name: string; blurb: string; make: () => ReturnType<typeof aiad27Slide>['slide'] }[] {
  return SLIDES_2027.filter((s) => s.type !== 'title').map((s) => ({
    id: `composition-${s.type}`, name: s.name, blurb: s.blurb,
    make: () => { const { slide } = aiad27Slide(s, 'aiad27-safe', themeLook(st)); slide.name = s.name; return slide; },
  }));
}
