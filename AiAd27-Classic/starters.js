'use strict';
/* The 2026 lessons, in the 2027 campaign — five 5-minute starters and the
 * Smart assembly, as published on aiawarenessday.co.uk, restyled and resynced.
 *
 * WHERE THIS CAME FROM. AiAd26/starters.js converted the five 2026 PowerPoint
 * starters into SlideForge, from the decks and their teacher packs. This file
 * takes that copy into the AiAd27 strand themes and the 2027 slide grammar,
 * and adds the assembly ("AI Is Already Here!"), which was never converted.
 * The campaign's words are kept; what changed is listed below, deck by deck.
 *
 * THE 2027 GRAMMAR, which is why some lists got shorter. The AiAd27 themes
 * draw cards as an A–D ballot and takeaways as numbered rules: four cards and
 * three rules fit, and the 2026 decks had six and five, so the extra ones fell
 * off the slide. The two cut from each list are folded into the one beside
 * them or moved to the notes, never dropped.
 *
 * ONE SOURCE FOR THE SLIDES AND THE TEACHER STEPS. Every slide the room sees
 * carries `run`: what the teacher does, how long, what pupils do, and a tip.
 * build.js prints it at the top of that slide's presenter notes, and
 * export.mjs writes the same steps, numbered against the PDF's pages, for the
 * lesson's Instructions on the website. Change a step here and both move.
 * `run` is not a slide field; the build strips it before normalising.
 *
 *   run.step   the teacher's action, one sentence
 *   run.time   seconds — every step has one, so the website can run its clock
 *   run.pupils what the room does, when it is not just watching
 *   run.tip    the one thing worth knowing at that moment
 *   run.with   'previous' folds this slide into the step before it
 *
 * DATED FIGURES. The statistics are the campaign's 2025 ones, re-worded so a
 * projection for 2025 no longer reads as a forecast. Nothing new was added;
 * see README.md for the figures worth refreshing before the day.
 */

const { SUPPORT_SLIDES: SUPPORT_2026 } = require('../AiAd26/starters.js');
const { DEBATES } = require('./debates.js');

const kw = (term, detail) => `${term}\t${detail}`;
const info = (label, value, note) => [label, value, note].join('\t');
const card = (heading, body) => `${heading}\t${body}`;
const versus = (left, right) => `${left}\t${right}`;

const poster = (key) => `assets/brand/aiad27/poster-${key}.svg`;

/* The support pair, unchanged in wording, with its step. Left up while the
   room packs away, so it is one step for both slides. */
const SUPPORT_SLIDES = [
  Object.assign({}, SUPPORT_2026[0], {
    run: {
      step: 'Say, out loud, who pupils can go to if anything today affected them, and leave the support slides up as the room moves on.',
      time: 15,
      tip: 'Name the actual person — tutor, head of year or safeguarding lead — rather than leaving it to the slide.'
    }
  }),
  Object.assign({}, SUPPORT_2026[1], { run: { with: 'previous' } })
];

/* The debate, three slides in every deck, after the key takeaway and before
   the support slides: the Secondary motion with a first vote; its points for
   and against; and the same debate's motion for every age, so a primary or
   post-16 class can run it too. From debates.js, which also writes the lesson
   page's "Set up the debate" on the website, so the two match.

   Optional, so the steps are marked optional: the website leaves them out of
   the starter's five minutes, and they work as well in the next lesson. */
function debateSlides(d) {
  const s = d.secondary;
  return [
    {
      type: 'statement',
      body: s.motion,
      subtitle: 'Debate it · National AI Conversation',
      feedback: { kind: 'poll', prompt: 'Where do you stand?', options: ['For', 'Against', 'Not sure yet'], max: 1, presentAs: 'rail' },
      run: {
        step: 'Debate it (optional — now or next lesson): read the motion and take a first vote — for, against or not sure yet.',
        time: 60,
        pupils: 'Vote',
        tip: s.prompt,
        optional: true
      },
      notes:
        'THE DEBATE FOR THIS LESSON — the Secondary motion. Take the vote before anyone ' +
        'argues, and keep the numbers: you will vote again at the end.\n\n' +
        'A primary or post-16 class? Their motion is two slides on, and the lesson page on ' +
        'the website has the prompt and three points each way for every age.'
    },
    {
      type: 'compare',
      title: 'Build both sides',
      subtitle: 'For | Against',
      bullets: s.for.map((f, i) => versus(f, s.against[i] || '')),
      body: s.prompt,
      run: {
        step: 'Split the class for and against. Each side builds its case from the three points, then hear two speakers a side and vote again.',
        time: 300,
        pupils: 'Prepare, speak, vote again',
        tip: 'Ask who changed their mind, and what changed it.',
        optional: true
      },
      notes:
        'Three points each way to start from, not to read out. Ask each side for one piece ' +
        'of evidence from the lesson, and use the challenge card under the table to test ' +
        'whichever side is winning.'
    },
    {
      type: 'cards',
      title: 'The same debate, at every age',
      bullets: [
        card('Primary · Years 5 and 6', d.primary.motion),
        card('Secondary · Years 7 to 11', s.motion),
        card('Post-16', d.post16.motion)
      ],
      run: { with: 'previous' },
      notes:
        'For a different year group, use its motion. Primary: hands up or move to a corner, ' +
        'then tell a talk partner why. Post-16: a formal debate with points of information.'
    }
  ];
}

const JOIN = {
  type: 'join',
  hidden: true,
  title: 'Join on your phone',
  subtitle: 'Only needed if you are running the live poll',
  notes:
    'HIDDEN BY DEFAULT. Every question in this deck works as a pair discussion or a show ' +
    'of hands without anyone joining. Unhide and drag to position 2 if you want the room voting.'
};

const LESSONS = [

  /* ===================================================================== SAFE
     Changes from 2026: six answer cards to four ("Look for the tells" is gone
     from the slide, because current fakes no longer blink oddly — said in the
     notes instead; reverse image search joins "Check the source"). Five habits
     to three. The 2025 figure is worded as the projection it was, and the
     source check now says so too. */
  {
    key: 'safe',
    wp: 'whos-really-behind-the-screen',
    principle: 'SAFE',
    kind: 'starter',
    title: "Who's really behind the screen?",
    prep: [
      'Open the PDF (or the SlideForge deck) on the board before the class arrives.',
      'This topic can be distressing for students who have experienced image-based abuse: have your safeguarding lead\'s name ready to say, and details to share privately.',
      'Optional: be ready to show a reverse image search (Google Lens or TinEye).'
    ],
    slides: [
      {
        type: 'title',
        title: "Who's really\nbehind the screen?",
        subtitle: 'Five-minute starter · Safe',
        body: 'AI-generated content, deepfakes and how to check what is real',
        image: poster('safe'),
        run: {
          step: 'Have the title up as the class comes in.',
          time: 15,
          tip: 'Frame it sensitively — some students may have personal experience of this.'
        },
        notes:
          'LEARNING OBJECTIVES\n' +
          '· Understand what deepfakes are and the scale of the problem\n' +
          '· Recognise that AI-generated intimate images are illegal abuse\n' +
          '· Know basic steps for staying safe online\n\n' +
          'BEFORE YOU START. This topic may be triggering for students who have experienced ' +
          'image-based abuse. Emphasise that victims are NEVER at fault.'
      },
      {
        type: 'statement',
        body: "If you couldn't tell whether a video of your friend was real or AI-generated, what would you do?",
        subtitle: 'Talk to the person next to you · 60 seconds',
        feedback: {
          kind: 'poll',
          prompt: 'What would you do first?',
          options: ['Send it to a friend to check', 'Look up where it came from', 'Ask a trusted adult', 'Delete it and say nothing'],
          max: 1,
          presentAs: 'rail'
        },
        run: {
          step: 'Ask the question and give pairs 60 seconds. Take a vote on the four options by hands or phones.',
          time: 60,
          pupils: 'Pair discussion, then vote',
          tip: '"Send it to a friend to check" is the teachable answer: it feels responsible and it is the one that spreads the harm. Do not say so until after the vote.'
        },
        notes:
          'THE 60 SECONDS ARE THE LESSON. Resist filling them.\n\n' +
          'DISCUSSION PROMPTS\n' +
          '→ How would you react if you received a suspicious image of someone you know?\n' +
          '→ What is one thing you could do differently online after today?'
      },
      {
        type: 'stats',
        title: '1 in 17 young people have been targeted by deepfake image abuse',
        subtitle: 'Did you know?',
        bullets: [
          info('Deepfakes projected to be shared online in 2025', '8 million', 'up from 500,000 in 2023'),
          info('Of all deepfakes', '98%', 'are non-consensual intimate images'),
          info('UK teenagers', '4 in 5', 'have used generative AI tools')
        ],
        body: 'Thorn Research 2025 · European Parliament 2025 · European Commission',
        run: {
          step: 'Read the headline aloud and let the room work out what "1 in 17" means for a class of thirty.',
          time: 45,
          tip: 'Pause after "1 in 17" and say that support is always available. State 98% once and move on.'
        },
        notes:
          'The 500,000 → 8 million rise is the one to dwell on: a sixteen-fold rise in two years, ' +
          'by the European Parliament\'s projection.'
      },
      {
        type: 'cards',
        title: 'So what do you actually do?',
        bullets: [
          card("Don't share it", 'Sharing spreads the harm, even if you are trying to warn people.'),
          card('Check the source', 'Is it from a verified account? A reverse image search shows where it came from.'),
          card('Ask a trusted adult', 'Teachers, parents and safeguarding leads can help you check.'),
          card('If it is intimate, report it', 'Do not view, save or share it. Tell a trusted adult straight away.')
        ],
        progressive: true,
        buildMode: 'hide',
        run: {
          step: 'Take the room\'s answers first, then go through the four cards, matching them to what was said.',
          time: 60,
          pupils: 'Share answers',
          tip: 'Say plainly that forwarding something to warn people is still forwarding it, and that creating AI-generated intimate images of anyone is illegal.'
        },
        notes:
          'REVEAL ONE AT A TIME — press → for each, matching the room\'s answers as you go.\n\n' +
          'Looking for "tells" — odd blinking, strange lighting — was on the 2026 slide and is ' +
          'not here, because current fakes rarely show them. If a student suggests it, say that ' +
          'the source is a better check than the picture.'
      },
      {
        type: 'sourcecheck',
        title: '"8 million deepfakes will be shared online in 2025"',
        subtitle: 'We put that on a slide two minutes ago. Should you have believed it?',
        bullets: [
          info('Who', 'European Parliament', ''),
          info('When', '2025', 'quoted in the AI Awareness Day teacher pack'),
          info('Basis', 'A projection', 'made before the year was over — not a count'),
          info('Against', '500,000 in 2023', 'the figure it is measured from'),
          info('Gap', 'No method shown', 'this deck never tells you how it was worked out')
        ],
        progressive: true,
        run: {
          step: 'Turn the lesson back on the deck: go through the source check row by row.',
          time: 45,
          tip: 'Be fair to the number — it is a serious figure from a serious source. The point is that nobody asked.'
        },
        notes:
          'If a student says "so should we not believe it?" — believing it is fine; believing it ' +
          'WITHOUT NOTICING is the habit deepfakes exploit.'
      },
      {
        type: 'keywords',
        title: 'Two words worth knowing',
        bullets: [
          kw('Deepfake', 'AI-generated or manipulated video, image or audio that convincingly shows something that never happened.'),
          kw('Reverse image search', 'Uploading an image to Google Lens or TinEye to find where it originally came from.')
        ],
        run: {
          step: 'Leave the two definitions up for pupils to copy.',
          time: 20,
          pupils: 'Copy the definitions'
        },
        notes:
          'Worth adding aloud: the Online Safety Act requires platforms to remove illegal content, ' +
          'and the law on intimate images covers AI-generated ones.'
      },
      {
        type: 'journey',
        title: 'Staying safe in an AI world',
        subtitle: 'Three habits, in the order you would use them',
        bullets: [
          card('Stop', 'Before sharing, ask: could this be AI-generated?'),
          card('Verify', 'Check the source, search the image, or ask a trusted adult.'),
          card('Report', 'AI-generated intimate images of anyone are illegal. Tell a trusted adult.')
        ],
        progressive: true,
        run: {
          step: 'Go through the three habits.',
          time: 30,
          tip: 'If you are short of time, end here.'
        },
        notes:
          'The 2026 deck had five. The other two belong in what you say: think twice before posting ' +
          'photos, because they can be manipulated; and if someone shows you suspicious content, ' +
          'do not pass it on.'
      },
      {
        type: 'keyfact',
        subtitle: 'Key takeaway',
        title: 'Think before you post',
        body: 'Your digital footprint can be used in ways you never intended.',
        run: { step: 'Read the takeaway, then stop talking.', time: 15 },
        notes: 'If the room is quiet, that is the right response to this starter.'
      },
      ...SUPPORT_SLIDES,
      {
        type: 'statement',
        hidden: true,
        body: 'How would you verify whether content is genuine?',
        subtitle: 'Extension — if you have longer than five minutes',
        feedback: { kind: 'brainstorm', prompt: 'One way to check something is real', max: 2, presentAs: 'rail' },
        notes: 'HIDDEN BY DEFAULT — unhide with the card slide after it for a longer lesson.'
      },
      {
        type: 'cards',
        hidden: true,
        title: 'Verifying content',
        bullets: [
          card('Cross-check it', 'Does the same story appear on trusted news sites?'),
          card('Read the account', 'Is it verified? How old is it? What else has it posted?'),
          card('Use a fact-checker', 'Full Fact and BBC Verify both cover viral claims.'),
          card('Ask who benefits', 'Who gains if you believe this is real?')
        ],
        progressive: true,
        buildMode: 'hide',
        notes: 'Extension. "Who benefits if I believe this?" works on advertising, politics and the group chat.'
      },
      JOIN
    ]
  },

  /* ==================================================================== SMART
     Changes from 2026: six answer cards to four ("No" and "It predicts" are one
     card; "Understanding needs more" moves to the notes). Five habits to three
     ("Expect bias" and "Understand it" move to the notes). */
  {
    key: 'smart',
    wp: 'how-does-ai-actually-think',
    principle: 'SMART',
    kind: 'starter',
    title: "How does AI actually 'think'?",
    prep: [
      'Open the PDF (or the SlideForge deck) on the board before the class arrives.',
      'Arrange students into pairs.',
      'Optional: have ChatGPT or a similar tool ready to show one answer live.'
    ],
    slides: [
      {
        type: 'title',
        title: "How does AI\nactually 'think'?",
        subtitle: 'Five-minute starter · Smart',
        body: 'Understanding the technology behind the tools you use',
        image: poster('smart'),
        run: {
          step: 'Have the title up as the class comes in.',
          time: 15,
          tip: 'Frame it as curious exploration: how does a tool they already use actually work?'
        },
        notes:
          'LEARNING OBJECTIVES\n' +
          '· Understand that AI predicts patterns rather than "thinking"\n' +
          '· Recognise the difference between pattern prediction and understanding\n' +
          "· Learn why AI 'hallucinations' occur\n\n" +
          'Students will anthropomorphise AI. Gently correct "it thinks" to "it predicts", every time.'
      },
      {
        type: 'statement',
        body: "When you ask ChatGPT a question, do you think it 'understands' you the way a human would?",
        subtitle: 'Talk to the person next to you · 60 seconds',
        feedback: {
          kind: 'poll',
          prompt: 'Does it understand you?',
          options: ['Yes — it understands', 'No — it predicts', 'Somewhere in between', 'I genuinely do not know'],
          max: 1,
          presentAs: 'rail'
        },
        run: {
          step: 'Ask the question, give pairs 60 seconds, then take the vote.',
          time: 60,
          pupils: 'Pair discussion, then vote',
          tip: 'Note who says AI "thinks" for gentle correction later. "Somewhere in between" is the most interesting answer to unpick.'
        },
        notes:
          'DISCUSSION PROMPTS\n' +
          '→ What is the difference between knowing something and predicting it?\n' +
          '→ How might knowing this change how you use AI tools?'
      },
      {
        type: 'compare',
        title: 'Predicting is not understanding',
        subtitle: 'What a language model does | What understanding would need',
        bullets: [
          versus('Predicts the next likely word', 'Grasps what the words mean'),
          versus('Patterns from its training data', 'Experience of the real world'),
          versus('Always produces an answer', "Can say 'I don't know'"),
          versus('Sounds confident when wrong', 'Knows where its knowledge stops')
        ],
        run: {
          step: 'Walk through the four rows: what a language model does, against what understanding would need.',
          time: 45,
          tip: 'This slide is the whole starter. If you only have two minutes, show the question and then this.'
        },
        notes:
          'The analogy that lands best: AI is a very sophisticated autocomplete, not a thinking being. ' +
          'Row 3 surprises students most — a model has no way of noticing that it does not know.'
      },
      {
        type: 'stats',
        title: 'It predicts the next word — and it is wrong often enough to matter',
        subtitle: 'Did you know?',
        bullets: [
          info('UK university students using AI for academic work', '92%', 'HEPI Survey 2025'),
          info('Students naming hallucinations as a major concern', '51%', 'HEPI Survey 2025'),
          info('School students who have used AI', '45%', 'HEPI 2025')
        ],
        body: 'Trained on billions of web pages, books and articles · HEPI 2025, MIT, Stanford AI Index 2025',
        run: {
          step: 'Read the three figures: nearly everyone uses it, and half already know it makes things up.',
          time: 45,
          tip: 'A hallucination is not a rare glitch. It is what prediction does when the pattern runs out.'
        },
        notes: 'The room is not naive — it is under-equipped.'
      },
      {
        type: 'cards',
        title: 'So — does it understand you?',
        bullets: [
          card('No — it predicts', 'It works out which words are likely to come next, from its training data.'),
          card('It has no experience', 'No feelings, no memories, no consciousness to draw on.'),
          card('It can be confidently wrong', 'Fluent, coherent and completely incorrect, all at once.'),
          card('But it is still useful', 'A powerful tool when you know what it is doing.')
        ],
        progressive: true,
        buildMode: 'hide',
        run: {
          step: 'Go through the four answer cards, matching them to what pairs said.',
          time: 60,
          pupils: 'Share answers',
          tip: 'Do not skip the last card: explaining the limits should not tip into "AI is rubbish".'
        },
        notes: 'Understanding needs context, common sense and real-world knowledge that AI lacks — worth saying with card 1.'
      },
      {
        type: 'keywords',
        title: 'Two words worth knowing',
        bullets: [
          kw('Large Language Model (LLM)', 'AI trained on billions of texts to predict and generate human-like language, by pattern rather than by meaning.'),
          kw('Hallucination', "When AI confidently generates false information, because it predicts 'likely' text rather than checking facts.")
        ],
        run: { step: 'Leave the two definitions up for pupils to copy.', time: 20, pupils: 'Copy the definitions' },
        notes: '"Hallucination" implies a mind having a strange experience. If a student notices that, they have understood the lesson.'
      },
      {
        type: 'journey',
        title: 'Being AI-smart',
        subtitle: 'Three habits that follow from knowing how it works',
        bullets: [
          card('Know what it is', "A pattern-matching tool, not a thinking being. It doesn't 'know' facts."),
          card('Verify', 'Check what matters against reliable sources before you trust or share it.'),
          card('Be specific', 'The more specific your question, the better the output.')
        ],
        progressive: true,
        run: {
          step: 'Go through the three habits and invite pupils to name one they will change.',
          time: 30,
          pupils: 'Name one habit',
          tip: 'Emphasise "Verify". If you are short of time, end here.'
        },
        notes: 'The 2026 deck had five; the other two are worth saying: it reflects the biases and errors in its training data, and knowing HOW it works helps you use it well.'
      },
      {
        type: 'keyfact',
        subtitle: 'Key takeaway',
        title: 'Autocomplete, not an oracle',
        body: 'AI is a powerful tool — but like any tool, it has to be used properly.',
        run: { step: 'Read the takeaway, then stop.', time: 15 },
        notes: 'One line. Then stop.'
      },
      ...SUPPORT_SLIDES,
      {
        type: 'statement',
        hidden: true,
        body: "Does it matter if AI doesn't understand, as long as it's helpful?",
        subtitle: 'Extension — if you have longer than five minutes',
        feedback: { kind: 'scale', prompt: 'How much does it matter?', points: 5, lowLabel: 'Not at all', highLabel: 'Enormously', max: 1, presentAs: 'rail' },
        notes: 'HIDDEN BY DEFAULT. Push towards real-world consequences: health advice, legal questions, safety information.'
      },
      JOIN
    ]
  },

  /* ================================================================ CREATIVE
     Changes from 2026: six answer cards to four ("The other test" and "What you
     provide" move to the notes). Five ways to three. */
  {
    key: 'creative',
    wp: 'ai-as-your-creative-partner',
    principle: 'CREATIVE',
    kind: 'starter',
    title: 'AI as your creative partner',
    prep: [
      'Open the PDF (or the SlideForge deck) on the board before the class arrives.',
      'Optional: have one example of a student creative task to refer to when discussing AI\'s role.'
    ],
    slides: [
      {
        type: 'title',
        title: 'AI as your\ncreative partner',
        subtitle: 'Five-minute starter · Creative',
        body: 'Using AI to amplify human creativity, not replace it',
        image: poster('creative'),
        run: {
          step: 'Have the title up and introduce AI as a creative partner, not a replacement.',
          time: 15,
          tip: 'Frame it positively: this is about enhancing creativity, not threatening it.'
        },
        notes:
          'LEARNING OBJECTIVES\n' +
          "· Consider whether AI-assisted work is still 'yours'\n" +
          '· Understand what AI can and cannot contribute creatively\n' +
          '· Recognise that human creativity remains essential\n\n' +
          'There is no right answer to the main question. Do not manufacture one.'
      },
      {
        type: 'statement',
        body: 'If AI helped you write a story or create artwork, is it still your creation?',
        subtitle: 'Talk to the person next to you · 60 seconds',
        feedback: {
          kind: 'poll',
          prompt: 'Is it still yours?',
          options: ['Yes — completely mine', 'Yes — if I did most of it', 'Only partly mine', 'No — not really mine'],
          max: 1,
          presentAs: 'rail'
        },
        run: {
          step: 'Ask the question, give pairs 60 seconds, then take the vote.',
          time: 60,
          pupils: 'Pair discussion, then vote',
          tip: 'Accept a range of answers and let two people who voted differently argue it out. Do not resolve it.'
        },
        notes:
          'DISCUSSION PROMPTS\n' +
          '→ When should you say that AI helped with something?\n' +
          '→ What unique perspective do YOU bring that AI cannot?'
      },
      {
        type: 'stats',
        title: 'Creative thinking is one of the top five skills employers want',
        subtitle: 'Did you know?',
        bullets: [
          info('Students using AI mainly to save time', '51%', 'freeing space for deeper creative work'),
          info('Creativity and resilience', 'Top 5', 'rising skills for 2030, WEF'),
          info('Original ideas produced by AI', 'None', 'it recombines; it does not originate')
        ],
        body: 'WEF Future of Jobs Report 2025 · HEPI Survey 2025',
        run: {
          step: 'Read the three figures aloud.',
          time: 45,
          tip: 'The "None" tile often surprises students — let it land, and take the pushback.'
        },
        notes:
          'If a student says "but it made something new": recombination at scale can look like ' +
          'originality, and the difference is whether anything was meant.'
      },
      {
        type: 'cards',
        title: 'So — is it yours?',
        bullets: [
          card('It depends how you used it', 'And how much of YOUR creative input went in.'),
          card('Brainstorming — probably yours', 'Using AI for starting points is like using a dictionary.'),
          card('Generating it whole — less so', 'A whole work with little editing is less clearly yours.'),
          card('The test', 'Can you explain and defend every creative choice in the work?')
        ],
        progressive: true,
        buildMode: 'hide',
        run: {
          step: 'Go through the four cards.',
          time: 60,
          pupils: 'Share answers',
          tip: 'The answer depends on how much human creative input was involved. Spend your time on "The test".'
        },
        notes:
          'Two more from the 2026 deck worth saying: would you be comfortable if your teacher knew ' +
          'exactly how AI was used? And what you provide: vision, judgement, emotional truth, perspective.'
      },
      {
        type: 'keywords',
        title: 'Two words worth knowing',
        bullets: [
          kw('Generative AI', 'AI that creates new content from patterns in training data, recombining existing patterns rather than having original ideas.'),
          kw('Authenticity', 'Being genuine and original: your own voice, experiences and creative choices, rather than delegating them.')
        ],
        run: { step: 'Leave the two definitions up for pupils to copy.', time: 20, pupils: 'Copy the definitions' },
        notes: 'Tools have always been part of creativity — cameras, synthesisers, spell checkers. The question is whether the result means anything.'
      },
      {
        type: 'journey',
        title: 'Creative AI partnership',
        subtitle: 'Three ways to keep the work yours',
        bullets: [
          card('Brainstorm with it', 'Generate ten ideas, then pick and improve the best one.'),
          card('Bring yourself', 'Your experiences and perspective are what make work original.'),
          card('Start, do not finish', 'AI is a starting point, not the finish line.')
        ],
        progressive: true,
        run: {
          step: 'Go through the three ways, then ask pupils to name one project where they would use AI as a starting point, not a shortcut.',
          time: 30,
          pupils: 'Name one project'
        },
        notes: 'The 2026 deck had five; the other two: let AI handle the repetitive parts, and always add your own voice.'
      },
      {
        type: 'keyfact',
        subtitle: 'Key takeaway',
        title: 'You are still the author',
        body: 'The best creative work comes from human imagination enhanced by AI.',
        run: { step: 'Read the takeaway, then stop.', time: 15 },
        notes: 'One line. Then stop.'
      },
      ...SUPPORT_SLIDES,
      {
        type: 'statement',
        hidden: true,
        body: "What do you bring that AI can't replicate?",
        subtitle: 'Extension — if you have longer than five minutes',
        feedback: { kind: 'wordcloud', prompt: 'One word — what do you bring?', max: 2, presentAs: 'rail' },
        notes: 'HIDDEN BY DEFAULT. Push past obvious answers: lived experience, emotional truth, intention.'
      },
      JOIN
    ]
  },

  /* ============================================================= RESPONSIBLE
     Changes from 2026: the iceberg's four figures are worded as the 2025
     estimates and projections they were. Six answer cards to four. Five habits
     to three. The spectrum stays in the show; the "who is responsible?"
     question, the old deck's second question, is the hidden extension and
     the lesson's debate. */
  {
    key: 'responsible',
    wp: 'the-hidden-costs-of-ai',
    principle: 'RESPONSIBLE',
    kind: 'starter',
    title: 'The hidden costs of AI',
    prep: [
      'Open the PDF (or the SlideForge deck) on the board before the class arrives.',
      'Optional: have one short article or graphic ready about AI energy use or data centres.'
    ],
    slides: [
      {
        type: 'title',
        title: 'The hidden\ncosts of AI',
        subtitle: 'Five-minute starter · Responsible',
        body: 'The environmental footprint of AI and the data centres that power it',
        image: poster('responsible'),
        run: {
          step: 'Have the title up and introduce the idea that AI has hidden environmental costs.',
          time: 15,
          tip: 'Keep the tone curious rather than alarming.'
        },
        notes:
          'LEARNING OBJECTIVES\n' +
          '· Understand that AI runs in physical data centres that use electricity and water\n' +
          '· Recognise that AI has a carbon footprint\n' +
          '· Consider how to balance the benefits of AI with its environmental costs\n\n' +
          'TONE. Avoid doom-and-gloom. Frame this as informed decision-making, not guilt. AI also ' +
          'has positive environmental uses — climate modelling, grid efficiency — and it is worth saying so.'
      },
      {
        type: 'statement',
        body: 'Every time you use AI, it uses electricity and water. Should we care?',
        subtitle: 'Talk to the person next to you · 60 seconds',
        feedback: { kind: 'scale', prompt: 'How much should we care?', points: 5, lowLabel: 'Not at all', highLabel: 'Enormously', max: 1, presentAs: 'rail' },
        run: {
          step: 'Ask the question, give pairs 60 seconds, then ask pupils to place themselves from 1 (not at all) to 5 (enormously).',
          time: 60,
          pupils: 'Pair discussion, then vote',
          tip: 'Listen for students who assume online activity is "free" for the planet. Redirect guilt to "when is it worth it?".'
        },
        notes:
          'DISCUSSION PROMPTS\n' +
          '→ When is using AI worth the environmental cost?\n' +
          '→ What might you use instead of AI for simple tasks?'
      },
      {
        type: 'iceberg',
        title: "What's under one question",
        subtitle: 'One answer from a chatbot',
        bullets: [
          info('Electricity', '1%', 'of global electricity, projected to double by 2026'),
          info('Carbon', '32.6–79.7 Mt', "AI's estimated 2025 footprint — about New York City's"),
          info('Per model trained', '5 cars', 'of CO₂ over their entire lifetimes'),
          info('Water for cooling', '≈ bottled water', 'projected 2025 use, about the whole bottled water industry')
        ],
        progressive: true,
        body: 'Nature Sustainability 2025 · International Energy Agency 2025 · MIT',
        run: {
          step: 'Go through the four layers: everything under one chatbot answer.',
          time: 45,
          tip: 'The water layer is the one students remember, because nobody expects computing to be thirsty.'
        },
        notes:
          'The range on the carbon layer is honest reporting of an uncertain measurement, not vagueness.'
      },
      {
        type: 'cards',
        title: 'So — should we care?',
        bullets: [
          card('Yes — it adds up', 'Small individual actions combine into a large collective impact.'),
          card('This is not "never use AI"', 'It is "use it thoughtfully".'),
          card('Companies have a job too', 'Transparency, efficiency and renewable energy.'),
          card('And so do we', 'We can choose when AI is worth it, and ask for sustainable AI.')
        ],
        progressive: true,
        buildMode: 'hide',
        run: {
          step: 'Go through the four cards.',
          time: 60,
          pupils: 'Share answers',
          tip: 'Say card B clearly: nobody should leave thinking they have been told off for using a chatbot.'
        },
        notes: 'Responsibility is shared — companies, governments and users all play a role.'
      },
      {
        type: 'spectrum',
        title: 'When is it worth it?',
        subtitle: 'Rarely worth the cost | Clearly worth the cost',
        bullets: [
          info('A question you could answer yourself', '10', 'a search would do'),
          info('Jokes and trivial entertainment', '24', ''),
          info('Work you then rewrite yourself', '52', ''),
          info('Accessibility needs', '82', ''),
          info('Medical research, climate modelling', '94', '')
        ],
        body: 'Categories and ordering from the AI Awareness Day teacher pack',
        run: {
          step: 'Ask the room which of the five uses is in the wrong place.',
          time: 45,
          pupils: 'Argue one position',
          tip: 'The positions are arguable, and that is the exercise. Do not defend the exact spots.'
        },
        notes: 'Keep the tone off guilt. This is a slide about judgement, not abstinence.'
      },
      {
        type: 'keywords',
        title: 'Two words worth knowing',
        bullets: [
          kw('Data centre', 'A building full of servers. AI needs large ones, using electricity for computing and water for cooling.'),
          kw('Carbon footprint', 'The total greenhouse gases caused by an activity: for AI, electricity, hardware and cooling.')
        ],
        run: { step: 'Leave the two definitions up for pupils to copy.', time: 20, pupils: 'Copy the definitions' },
        notes: 'Servers generate heat; heat has to go somewhere; evaporative cooling is how it goes.'
      },
      {
        type: 'journey',
        title: 'Using AI responsibly',
        subtitle: 'Three habits — none of which is "stop"',
        bullets: [
          card('Think first', 'Do you really need AI for this task?'),
          card('Check yourself first', "Simple questions often don't need AI at all."),
          card('Ask for transparency', "We need to know AI's true environmental cost.")
        ],
        progressive: true,
        run: {
          step: 'Go through the three habits.',
          time: 30,
          tip: 'Keep it balanced: the goal is thoughtful use, not fear of AI.'
        },
        notes: 'The 2026 deck had five; the other two: batch your requests, and consider which companies use renewable energy.'
      },
      {
        type: 'keyfact',
        subtitle: 'Key takeaway',
        title: 'Thoughtfully — not never',
        body: 'Every choice we make about technology has consequences. Use AI thoughtfully.',
        run: { step: 'Read the takeaway, then stop.', time: 15 },
        notes: 'One line. Then stop.'
      },
      ...SUPPORT_SLIDES,
      {
        type: 'statement',
        hidden: true,
        body: "Who should be responsible for AI's environmental impact?",
        subtitle: 'Extension — if you have longer than five minutes',
        feedback: { kind: 'poll', prompt: 'Who is responsible?', options: ['The tech companies', 'Governments', 'Us, the users', 'All of the above'], max: 1, presentAs: 'rail' },
        notes: 'HIDDEN BY DEFAULT. Rooms split three ways and then notice that everyone picked somebody else.'
      },
      JOIN
    ]
  },

  /* =================================================================== FUTURE
     Changes from 2026: six cards to four (interpersonal skills join human
     skills; working with AI joins adaptability). Five moves to three. The old
     deck's third question stays out of the show, as it did in 2026. */
  {
    key: 'future',
    wp: 'your-ai-ready-future',
    principle: 'FUTURE',
    kind: 'starter',
    title: 'Your AI-ready future',
    prep: [
      'Open the PDF (or the SlideForge deck) on the board before the class arrives.',
      'Optional: have the WEF Future of Jobs Report 2025 figures to hand in case students ask.'
    ],
    slides: [
      {
        type: 'title',
        title: 'Your AI-ready\nfuture',
        subtitle: 'Five-minute starter · Future',
        body: 'Preparing for careers in an AI-transformed world',
        image: poster('future'),
        run: {
          step: 'Have the title up and introduce the idea that AI is changing careers and work.',
          time: 15,
          tip: 'Set a positive tone: this is about opportunity, not fear.'
        },
        notes:
          'LEARNING OBJECTIVES\n' +
          '· Understand how AI is reshaping the jobs market\n' +
          '· Identify skills that will remain valuable alongside AI\n' +
          '· Recognise new career opportunities emerging from AI\n\n' +
          'Avoid specific predictions — the exact jobs of 2035 are genuinely unknowable.'
      },
      {
        type: 'statement',
        body: 'If AI can do many jobs faster than humans, what skills will make you valuable?',
        subtitle: 'Talk to the person next to you · 60 seconds',
        feedback: { kind: 'wordcloud', prompt: 'One skill that will still matter', max: 2, presentAs: 'rail' },
        run: {
          step: 'Ask the question and give pairs 60 seconds. Collect one skill from each pair.',
          time: 60,
          pupils: 'Pair discussion',
          tip: 'Listen for students who focus only on job loss, and draw out the opportunities too.'
        },
        notes:
          'DISCUSSION PROMPTS\n' +
          '→ How might your dream job change because of AI?\n' +
          '→ What new skills might you want to develop?'
      },
      {
        type: 'stats',
        title: '170 million new jobs by 2030 — and 92 million displaced',
        subtitle: 'Did you know?',
        bullets: [
          info('Net new jobs by 2030', '+78m', '170 million created, 92 million displaced'),
          info('Growth in AI-skilled job postings', '3.5×', 'faster than other job postings'),
          info('Core work skills that will change by 2030', '39%', 'lifelong learning is not optional')
        ],
        body: 'WEF Future of Jobs Report 2025 · PwC 2025',
        run: {
          step: 'Read the three figures, leading with the net number.',
          time: 45,
          tip: 'Pause after each figure. "Transformed, not disappeared": most jobs will change rather than vanish.'
        },
        notes: '"170 million" alone is spin and "92 million" alone is doom — the honest figure is +78 million.'
      },
      {
        type: 'cards',
        title: 'Four things that stay valuable',
        bullets: [
          card('Human skills', 'Empathy, communication, collaboration and ethical judgement.'),
          card('Creative skills', 'Original thinking and inventive problem-solving.'),
          card('Complex reasoning', 'Critical analysis, nuance and handling ambiguity.'),
          card('Adaptability', 'Keep learning — including how to work WITH AI.')
        ],
        progressive: true,
        buildMode: 'hide',
        run: {
          step: 'Go through the four cards, matching them to the skills pairs suggested.',
          time: 60,
          pupils: 'Share answers',
          tip: '"Somebody said kindness — that is this one" makes the list theirs rather than yours.'
        },
        notes: 'Leadership and prompting skills sat on their own cards in 2026; they belong under human skills and adaptability.'
      },
      {
        type: 'keywords',
        title: 'Two words worth knowing',
        bullets: [
          kw('AI literacy', 'Understanding, using and critically evaluating AI: how it works, where it fails, and how to use it ethically.'),
          kw('Job displacement', 'When jobs shrink or disappear because AI can do the same tasks faster or more cheaply.')
        ],
        run: { step: 'Leave the two definitions up for pupils to copy.', time: 20, pupils: 'Copy the definitions' },
        notes: '"Prompt engineering" was the 2026 word here; it may not survive as a job title, but asking a precise question will.'
      },
      {
        type: 'journey',
        title: 'Building your AI-ready skillset',
        subtitle: 'Three moves you can start this year',
        bullets: [
          card('Lead with human skills', 'Critical thinking, communication, creativity and empathy.'),
          card('Learn to work with AI', 'AI literacy is valuable now, in almost every job.'),
          card('Stay adaptable', 'The ability to learn new skills is the skill.')
        ],
        progressive: true,
        run: {
          step: 'Go through the three moves and invite pupils to name one habit they will try.',
          time: 30,
          pupils: 'Name one habit',
          tip: 'End on an empowering note.'
        },
        notes: 'Also worth naming: AI-related careers such as data science, AI ethics and AI product design.'
      },
      {
        type: 'keyfact',
        subtitle: 'Key takeaway',
        title: 'Collaborate, and stay human',
        body: 'The future belongs to those who can work with AI while bringing uniquely human value.',
        run: { step: 'Read the takeaway, then stop.', time: 15 },
        notes: 'One line. Then stop.'
      },
      ...SUPPORT_SLIDES,
      {
        type: 'compare',
        hidden: true,
        title: 'Which jobs change, which jobs grow',
        subtitle: 'Changing | Growing',
        bullets: [
          versus('Routine data entry', 'AI specialists and data scientists'),
          versus('Basic customer service', 'Cybersecurity'),
          versus('Simple content generation', 'Renewable energy'),
          versus('Parts of almost every job', 'AI trainers and ethics officers')
        ],
        notes: 'HIDDEN BY DEFAULT — the old second question. Most jobs will be TRANSFORMED, not destroyed: the left column is tasks, not careers.'
      },
      JOIN
    ]
  },

  /* ================================================================ ASSEMBLY
     "AI Is Already Here!" — the 20-minute Smart assembly. New to SlideForge.
     The 2026 deck had seven slides for twenty minutes and none for three of
     its seven steps (the discussion, hallucinations and the exit check), and
     opened on "Did you know?" while the steps opened on the hook. This deck
     follows the steps: one slide each, in their order, with their timings. */
  {
    key: 'smart',
    slug: 'assembly',
    wp: 'ai-is-already-here',
    principle: 'SMART',
    kind: 'assembly',
    title: 'AI is already here!',
    prep: [
      'Open the PDF (or the SlideForge deck) and check the BBC Ideas film plays with sound in the hall: youtube.com/watch?v=E4bvQZRC6Bo',
      'Have the video open in a browser tab, so you can switch to it on slide 5.',
      'Optional: prepare one live AI prompt and one fact-check example to show.'
    ],
    slides: [
      {
        type: 'title',
        title: 'AI is\nalready here!',
        subtitle: 'Assembly · Smart',
        body: 'What AI is actually doing when it gives you a confident answer',
        image: poster('smart'),
        run: { step: 'Have the title up as students come in.', time: 60 }
      },
      {
        type: 'statement',
        body: 'Have you used AI today?',
        subtitle: 'Hands up',
        feedback: { kind: 'poll', prompt: 'Have you used AI today?', options: ['Yes', 'No', 'Not sure'], max: 1, presentAs: 'rail' },
        run: {
          step: 'Hook: ask for a show of hands — has anyone used AI today? Then ask whether AI "understands" what it writes.',
          time: 60,
          pupils: 'Show of hands',
          tip: 'Most hands stay down at first. The next slide changes that.'
        }
      },
      {
        type: 'cards',
        title: 'You probably have',
        bullets: [
          card('Unlocked your phone', 'Face ID recognises your face.'),
          card('Got a recommendation', 'YouTube, Spotify and TikTok choose what comes next.'),
          card('Typed a message', 'Autocomplete and spell check predict your next word.'),
          card('Asked a question', 'ChatGPT, Siri and Google Assistant answer you.')
        ],
        progressive: true,
        buildMode: 'hide',
        run: {
          step: 'Go through the four everyday uses, then ask again who has used AI today.',
          time: 60,
          pupils: 'Show of hands',
          tip: 'Card C is the bridge to the film: a chatbot is autocomplete at enormous scale.'
        }
      },
      {
        type: 'video',
        title: 'How AI actually works',
        subtitle: 'BBC Ideas',
        video: 'https://www.youtube.com/watch?v=E4bvQZRC6Bo',
        run: {
          step: 'Play the BBC Ideas film "How AI actually works".',
          time: 300,
          pupils: 'Watch',
          tip: 'Ask them to listen for one thing the AI does NOT do.'
        }
      },
      {
        type: 'compare',
        title: 'Predicting is not understanding',
        subtitle: 'What a language model does | What understanding would need',
        bullets: [
          versus('Predicts the next likely word', 'Grasps what the words mean'),
          versus('Patterns from its training data', 'Experience of the real world'),
          versus('Always produces an answer', "Can say 'I don't know'"),
          versus('Sounds confident when wrong', 'Knows where its knowledge stops')
        ],
        run: {
          step: 'Discuss: AI as pattern prediction — advanced autocomplete — against genuine understanding. Take two or three answers from the hall.',
          time: 240,
          pupils: 'Turn to a neighbour, then answers from the hall',
          tip: 'Row 3 is the surprise: a model has no way of noticing that it does not know.'
        }
      },
      {
        type: 'keyfact',
        subtitle: 'Hallucinations',
        title: 'Fluent is not the same as true',
        body: 'AI can give a confident, well-written answer that is wrong. Always check the facts that matter.',
        run: {
          step: 'Explain hallucinations: plausible wording can still be wrong, so verify important facts.',
          time: 120,
          tip: 'If you prepared a fact-check example, show it here.'
        }
      },
      {
        type: 'journey',
        title: 'Being AI-smart',
        subtitle: 'Three habits that follow from knowing how it works',
        bullets: [
          card('Know what it is', "A pattern-matching tool, not a thinking being. It doesn't 'know' facts."),
          card('Verify', 'Check what matters against reliable sources before you trust or share it.'),
          card('Be specific', 'The more specific your question, the better the output.')
        ],
        progressive: true,
        run: {
          step: 'Present the three Being AI-smart habits and invite responses from the hall.',
          time: 180,
          pupils: 'Respond'
        },
        notes: 'Two more worth saying: it reflects the biases and errors in its training data, and knowing HOW it works helps you use it well.'
      },
      {
        type: 'statement',
        body: 'One safe use of AI — and one use you would always fact-check.',
        subtitle: 'Exit check',
        feedback: { kind: 'brainstorm', prompt: 'One safe use, one to fact-check', max: 2, presentAs: 'rail' },
        run: {
          step: 'Exit check: ask students for one safe use of AI and one use that must be fact-checked.',
          time: 120,
          pupils: 'Answer as they leave, or tell a tutor'
        }
      },
      Object.assign({}, SUPPORT_SLIDES[0], {
        run: Object.assign({}, SUPPORT_SLIDES[0].run, {
          step: 'Signpost reporting and support resources, and leave them up as the hall empties.',
          time: 60
        })
      }),
      SUPPORT_SLIDES[1],
      JOIN
    ]
  }
];

/* The debate goes in after the key takeaway, before the support slides. */
LESSONS.forEach((lesson) => {
  lesson.debate = DEBATES[lesson.slug || lesson.key];
  const at = lesson.slides.findIndex((slide) => slide.type === 'section');
  lesson.slides.splice(at, 0, ...debateSlides(lesson.debate));
});

module.exports = { LESSONS };
