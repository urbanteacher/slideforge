'use strict';
/* AI Awareness Day 2026 — the five 5-minute lesson starters.
 *
 * Content source: the five `5min <Principle>.pptx` decks and their matching
 * `Teacher Instructions.docx`, under
 *   ~/Desktop/Ai Awareness Day/Starter Acivities/Lesson Starter - <Principle>/
 *
 * WHERE THE WORDS CAME FROM. Every statistic, definition, discussion question
 * and answer below is the campaign's own. Two rules were followed throughout:
 *
 *   1. Where the .pptx and the .docx disagree, the .docx wins. The slides were
 *      built from the teacher pack and lost punctuation on the way — the Safe
 *      answer slide reads "Don't share it with others sharing spreads
 *      potential harm", which is the teacher pack's "Don't share it with
 *      others — sharing spreads potential harm" with the em dash eaten. The
 *      dashes are restored here.
 *   2. Nothing is invented. The definitions, discussion prompts and teacher
 *      notes existed only in the Word document — a teacher had to hold a
 *      separate file open to run the starter. They are on the slides and in
 *      the presenter notes now, but they are still the campaign's text.
 *
 * WHAT CHANGED IN THE MOVE. The source decks answer their own questions on a
 * single slide: six ticks at 18pt, all visible the instant the slide appears,
 * which ends the discussion it just started. Here each answer set is a
 * progressive reveal, so the room commits before it sees the list. The three
 * "did you know" bullet bars become stat tiles, the five takeaways become a
 * journey, and the two questions that the teacher pack calls "sub-questions"
 * are marked hidden — they are extension, and a five-minute starter does not
 * have room for them by default.
 *
 * See README.md for the full account, slide by slide.
 */

/* ------------------------------------------------------------------ helpers
 *
 * SlideForge stores a two- or three-part line as one tab-separated string.
 * These three name the three shapes so the content below reads as content. */

/** Keyword / definition row — used by `keywords`, `italics` and `links`. */
const kw = (term, detail) => `${term}\t${detail}`;

/** Label · value · note — used by `stats`, `timeline` and `funnel`. */
const info = (label, value, note) => [label, value, note].join('\t');

/** Heading · body — used by `cards`, and by `journey` for its milestones. */
const card = (heading, body) => `${heading}\t${body}`;

/** Two columns — used by `compare`. */
const versus = (left, right) => `${left}\t${right}`;

/* The support resources, identical in all five teacher packs, so they are
   written once. Two slides: the human being in the building first, because
   that is who a student in trouble should reach for, and the national
   services after. */
const SUPPORT_SLIDES = [
  {
    type: 'section',
    title: 'If any of this affected you',
    subtitle: 'You will not be in trouble for asking for help.',
    notes:
      'Say this out loud rather than leaving it on the slide.\n\n' +
      'Your tutor, head of year or safeguarding lead is available to help — name ' +
      'the actual person if you can.\n\n' +
      'From the teacher pack, the three messages that matter most:\n' +
      '· If you are targeted by deepfake abuse, it is NOT your fault.\n' +
      '· Creating AI-generated intimate images of anyone is illegal.\n' +
      '· You will NOT be in trouble for reporting — we are here to help.\n\n' +
      'Have the safeguarding details ready to share privately with anyone who ' +
      'comes to you afterwards.'
  },
  {
    type: 'links',
    title: 'Reporting and support',
    subtitle: 'Free, confidential, and open to anyone',
    /* Six, not the teacher pack's eight. A links slide holds eight pits but
       each entry here runs to two lines, and at eight the last two fall off
       the bottom of a 16:9 slide — Young Minds and Samaritans, which are the
       two a student in difficulty most needs. NSPCC and ThinkUKnow are the
       two that are reference rather than help, so they move into the notes. */
    bullets: [
      kw('Childline — 0800 1111', 'https://www.childline.org.uk'),
      kw('Samaritans — 116 123', 'https://www.samaritans.org'),
      kw('Young Minds — mental health', 'https://www.youngminds.org.uk'),
      kw('CEOP — report abuse or exploitation', 'https://www.ceop.police.uk/safety-centre'),
      kw('Internet Watch Foundation — report an image', 'https://report.iwf.org.uk'),
      kw('UK Safer Internet Centre', 'https://saferinternet.org.uk')
    ],
    notes:
      'Leave this slide up while the room packs away — it is the one slide worth ' +
      'lingering on.\n\n' +
      'Childline and Samaritans are the two numbers worth reading aloud; the rest ' +
      'are for students to find later. Every link is live, so this slide works as ' +
      'a handout as well as a projection.\n\n' +
      'Two more from the teacher pack that would not fit on the slide:\n' +
      '· NSPCC online safety — nspcc.org.uk/keeping-children-safe/online-safety\n' +
      '· ThinkUKnow — thinkuknow.co.uk'
  }
];

/* --------------------------------------------------------------- the starters
 *
 * Each entry becomes one deck. `theme` picks the principle colour — see the
 * THEMES block in src/model.js and css/aiad26.css. */

const STARTERS = [

  /* ===================================================================== SAFE
     Starter 1 in the teacher pack. The heaviest of the five: it covers
     image-based abuse, and the teacher notes flag it as potentially
     triggering. The running order puts the room's own answer first and the
     statistics second, so nobody is handed "1 in 17" cold. */
  {
    key: 'safe',
    principle: 'SAFE',
    title: "Who's really behind the screen?",
    theme: 'aiad26-safe',
    slides: [
      {
        type: 'title',
        title: "Who's really\nbehind the screen?",
        subtitle: 'Understanding AI-generated content and deepfakes',
        notes:
          'AI AWARENESS DAY 2026 · Starter 1 · Principle: SAFE · 5 minutes\n\n' +
          'LEARNING OBJECTIVES\n' +
          '· Understand what deepfakes are and the scale of the problem\n' +
          '· Recognise that AI-generated intimate images are illegal abuse\n' +
          '· Know basic steps for staying safe online\n\n' +
          'BEFORE YOU START — from the teacher pack:\n' +
          'This topic may be triggering for students who have experienced ' +
          'image-based abuse. Emphasise that victims are NEVER at fault. Have ' +
          'safeguarding information ready to share privately with any student ' +
          'who needs it.\n\n' +
          'RUNNING ORDER: question (60s discussion) → the numbers → what to do → ' +
          'vocabulary → the five habits → support.'
      },
      {
        type: 'statement',
        body: "If you couldn't tell whether a video of your friend was real or AI-generated, what would you do?",
        subtitle: 'Talk to the person next to you — 60 seconds',
        transition: 'fade',
        feedback: {
          kind: 'poll',
          prompt: 'What would you do first?',
          options: [
            'Send it to a friend to check',
            'Look up where it came from',
            'Ask a trusted adult',
            'Delete it and say nothing'
          ],
          max: 1,
          presentAs: 'rail'
        },
        notes:
          'THE 60 SECONDS ARE THE LESSON. Resist filling them.\n\n' +
          'The poll is optional — if phones are not joining, this works exactly as ' +
          'well as a pair discussion. If you do run it, "Send it to a friend to ' +
          'check" is the teachable answer: it feels responsible and it is the one ' +
          'that spreads the harm. Do not say so until after the vote.\n\n' +
          'DISCUSSION PROMPTS\n' +
          '→ How would you react if you received a suspicious image of someone you know?\n' +
          '→ Why do you think deepfake abuse primarily targets young people?\n' +
          '→ What is one thing you could do differently online after today?'
      },
      {
        type: 'stats',
        title: '1 in 17 young people have been targeted by deepfake image abuse',
        subtitle: 'Did you know?',
        bullets: [
          info('Deepfakes shared online in 2025', '8 million', 'up from 500,000 in 2023'),
          info('Of all deepfakes', '98%', 'are non-consensual intimate images'),
          info('UK teenagers', '4 in 5', 'have used generative AI tools')
        ],
        body: 'Thorn Research 2025 · European Parliament 2025 · European Commission',
        notes:
          'Read the headline aloud — "1 in 17" is roughly one person in a class ' +
          'of thirty, and the room will do that arithmetic themselves. Let them.\n\n' +
          'The 500,000 → 8 million figure is the one to dwell on: a sixteen-fold ' +
          'rise in two years. This is not a problem that is arriving, it is one ' +
          'that has arrived.\n\n' +
          'Do not linger on 98%. State it, let it land, move on.'
      },
      {
        type: 'cards',
        title: 'So what do you actually do?',
        bullets: [
          card("Don't share it", 'Sharing spreads potential harm even if you are trying to warn people.'),
          card('Check the source', 'Is it from an official or verified account? Where did it originally come from?'),
          card('Reverse image search', 'See whether the content appears elsewhere, or has been flagged as fake.'),
          card('Look for the tells', 'Unnatural blinking, strange lighting, blurry edges around face and hair.'),
          card('Ask a trusted adult', 'Teachers, parents and safeguarding leads can help you verify.'),
          card('If it is intimate, report it', 'Do not view, save or share it. Report it immediately.')
        ],
        progressive: true,
        buildMode: 'hide',
        notes:
          'REVEAL ONE AT A TIME — press → for each. Take the room\'s answers first ' +
          'and reveal the card that matches; it turns a list into a conversation.\n\n' +
          'The first card is the one most people get wrong, and it is worth saying ' +
          'plainly: forwarding something to warn people is still forwarding it.\n\n' +
          'The last card is non-negotiable. Creating AI-generated intimate images ' +
          'of anyone is illegal — a sexual offence — even if it was "just a joke".'
      },
      {
        /* The deck marks its own homework.

           Slide 3 asserted "8 million" and the room took it, three minutes
           after being told to check where things come from. Turning the
           starter's own lesson back on the starter is the strongest version
           of it available, and it costs one slide. */
        type: 'sourcecheck',
        title: '"8 million deepfakes will be shared online in 2025"',
        subtitle: 'We put that on a slide three minutes ago. Should you have believed it?',
        bullets: [
          info('Who', 'European Parliament', ''),
          info('When', '2025', 'quoted in the AI Awareness Day teacher pack'),
          info('Basis', 'A projection', 'for a year that has not finished — not a count'),
          info('Against', '500,000 in 2023', 'the figure it is measured from'),
          info('Gap', 'No method shown', 'this deck never tells you how it was worked out')
        ],
        progressive: true,
        notes:
          'REVEAL ONE ROW AT A TIME. The room should feel the claim come apart.\n\n' +
          'BE FAIR TO THE NUMBER. The point is not that it is wrong — it is a ' +
          'serious figure from a serious source, and it is very likely sound. ' +
          'The point is that nobody in the room asked, including you, three ' +
          'minutes after being told to check where things come from.\n\n' +
          'The last row is the one that matters, and it is about this deck: the ' +
          'method is not on the slide. Neither is it on most slides anywhere.\n\n' +
          'If a student says "so should we not believe it?" — the answer is that ' +
          'believing it is fine; believing it WITHOUT NOTICING is the habit ' +
          'deepfakes exploit.'
      },
      {
        type: 'shift',
        hidden: true,
        title: 'How fast this moved',
        subtitle: 'Deepfakes shared online',
        bullets: [
          info('2023', '500,000', 'where it started'),
          info('2025', '8 million', 'projected'),
          info('2027', '', 'nobody knows')
        ],
        body: 'European Parliament 2025',
        notes:
          'HIDDEN BY DEFAULT — the growth is already a tile on the "did you ' +
          'know" slide, and a five-minute starter should not spend two slides ' +
          'on one number.\n\n' +
          'Unhide it when you have longer, or when a class has shrugged at "8 ' +
          'million". The stat slide reports the rise; this one draws it, and ' +
          'the ×16 in the gutter is the thing nobody works out for themselves. ' +
          'Two years.\n\n' +
          'The 2027 column is deliberately empty. Ask the room to fill it before ' +
          'you move on.'
      },
      {
        type: 'statement',
        hidden: true,
        body: 'How would you verify whether content is genuine?',
        subtitle: 'Extension — if you have longer than five minutes',
        feedback: {
          kind: 'brainstorm',
          prompt: 'One way to check something is real',
          max: 2,
          presentAs: 'rail'
        },
        notes:
          'HIDDEN BY DEFAULT — this is the teacher pack\'s sub-question, and a ' +
          'five-minute starter does not have room for it. Unhide it (and the card ' +
          'slide after) if this is a full lesson rather than a starter.\n\n' +
          'Runs well as a brainstorm: contributions arrive named and newest-first, ' +
          'so you can credit people as you go.'
      },
      {
        type: 'cards',
        hidden: true,
        title: 'Verifying content',
        bullets: [
          card('Cross-check it', 'Does the same story or video appear on trusted news sites?'),
          card('Read the account', 'Is it verified? How old is it? What else has it posted?'),
          card('Go to the source', "Search for the person's official accounts — have they addressed it?"),
          card('Use a fact-checker', 'Full Fact and BBC Reality Check both cover viral claims.'),
          card('Ask who benefits', 'Who gains if you believe this is real? That question answers a lot.')
        ],
        progressive: true,
        buildMode: 'hide',
        notes:
          'Extension — unhide together with the question before it.\n\n' +
          '"Who benefits if I believe this?" is the most transferable idea in the ' +
          'whole starter. It works on advertising, on politics, and on the group ' +
          'chat.\n\n' +
          'If a student says "but it was sent by someone I trust": even trusted ' +
          'people are fooled by convincing deepfakes. Misinformation travels ' +
          'through well-meaning people. Verify independently, then tell them ' +
          'gently if it turns out to be fake.'
      },
      {
        type: 'keywords',
        title: 'Two words worth knowing',
        bullets: [
          kw('Deepfake',
            'AI-generated or manipulated video, image or audio that convincingly shows something that never happened.'),
          kw('Reverse image search',
            'Uploading an image to Google Images or TinEye to find where it originally came from.')
        ],
        notes:
          'These definitions were in the teacher pack but never on a slide. They ' +
          'are here so students can copy them down.\n\n' +
          'Worth adding aloud: the Online Safety Act requires platforms to remove ' +
          'illegal content, and the law on intimate images already covers ' +
          'AI-generated ones. Technology moves faster than legislation, but on ' +
          'this particular point the law has caught up.'
      },
      {
        type: 'journey',
        title: 'Staying safe in an AI world',
        subtitle: 'Five habits, in the order you would use them',
        bullets: [
          card('Stop', 'Before sharing, ask: could this be AI-generated? Check the source.'),
          card('Verify', 'Official accounts, reverse image search, or ask a trusted adult.'),
          card('Report', 'AI-generated intimate images of anyone are illegal. Tell a trusted adult immediately.'),
          card('Protect', 'Think twice before posting photos. They can be manipulated by AI tools.'),
          card('Support', "If someone shows you suspicious content, don't pass it on.")
        ],
        progressive: true,
        notes:
          'Reveal one milestone at a time. Five verbs in the order you would ' +
          'actually use them — that ordering is the point, and it is why this is a ' +
          'path rather than a list.\n\n' +
          'If you are short of time, this is the slide to end on.'
      },
      {
        type: 'keyfact',
        subtitle: 'Key takeaway',
        title: 'Think before you post',
        body: 'Your digital footprint can be used in ways you never intended.',
        notes:
          'One line, then stop talking. Do not add to it.\n\n' +
          'If the room is quiet, that is the right response to this starter.'
      },
      ...SUPPORT_SLIDES,
      {
        type: 'join',
        hidden: true,
        title: 'Join on your phone',
        subtitle: 'Only needed if you are running the live poll',
        notes:
          'HIDDEN BY DEFAULT. Thirty phones joining burns the whole five minutes, ' +
          'and every statement slide in this deck works as a plain pair ' +
          'discussion without anyone joining at all.\n\n' +
          'Unhide and drag to position 2 if you do want the room voting, or just ' +
          'open the join panel from the presenter view without spending a slide ' +
          'on it.'
      }
    ]
  },

  /* ==================================================================== SMART
     Starter 2. The one genuine misconception lesson in the set: students
     anthropomorphise AI, and the teacher pack asks you to correct "it thinks"
     to "it predicts" every time you hear it. The Versus slide carries that
     correction on its own. */
  {
    key: 'smart',
    principle: 'SMART',
    title: "How does AI actually 'think'?",
    theme: 'aiad26-smart',
    slides: [
      {
        type: 'title',
        title: "How does AI\nactually 'think'?",
        subtitle: 'Understanding the technology behind the tools you use',
        notes:
          'AI AWARENESS DAY 2026 · Starter 2 · Principle: SMART · 5 minutes\n\n' +
          'LEARNING OBJECTIVES\n' +
          '· Understand that AI predicts patterns rather than "thinking"\n' +
          '· Recognise the difference between pattern prediction and understanding\n' +
          "· Learn why AI 'hallucinations' occur\n\n" +
          'THE ONE THING TO WATCH FOR — from the teacher pack:\n' +
          'Students will anthropomorphise AI. Gently correct "it thinks" to "it ' +
          'predicts", every time, all the way through. That single substitution ' +
          'is most of the learning.\n\n' +
          'Avoid being dismissive of AI\'s usefulness while explaining its limits.'
      },
      {
        type: 'statement',
        body: "When you ask ChatGPT a question, do you think it 'understands' you the way a human would?",
        subtitle: 'Talk to the person next to you — 60 seconds',
        feedback: {
          kind: 'poll',
          prompt: 'Does it understand you?',
          options: [
            'Yes — it understands',
            'No — it predicts',
            'Somewhere in between',
            'I genuinely do not know'
          ],
          max: 1,
          presentAs: 'rail'
        },
        notes:
          'The vote is the hook. Take it before you say anything, and leave the ' +
          'result on screen while you work through the next slide — you want the ' +
          'room looking at their own answer as the explanation arrives.\n\n' +
          '"Somewhere in between" is the most popular answer in most rooms and it ' +
          'is the most interesting one to unpick: what would "partly understand" ' +
          'even mean?\n\n' +
          'DISCUSSION PROMPTS\n' +
          '→ What is the difference between knowing something and predicting it?\n' +
          '→ Why might it matter if AI does not truly understand?\n' +
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
        notes:
          'This slide is the whole starter. If you only have two minutes, show the ' +
          'question and then this.\n\n' +
          'The analogy that lands best, from the teacher pack: AI is a very ' +
          'sophisticated autocomplete, not a thinking being.\n\n' +
          'Row 3 is the one students find most surprising — a model has no ' +
          'mechanism for noticing that it does not know, which is exactly why ' +
          'hallucinations sound as confident as facts.'
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
        notes:
          'The point of putting 92% next to 51% is that both are true at once: ' +
          'nearly everyone is using it, and half of them already know it makes ' +
          'things up. The room is not naive — it is under-equipped.\n\n' +
          'A hallucination is not a rare glitch. It is what the prediction ' +
          'mechanism does when the pattern runs out.'
      },
      {
        type: 'cards',
        title: 'So — does it understand you?',
        bullets: [
          card('No', 'AI processes text as mathematical patterns, not meaning.'),
          card('It predicts', 'It works out which words are likely to come next, from its training data.'),
          card('It has no experience', 'No feelings, no memories, no consciousness to draw on.'),
          card('It can be confidently wrong', 'Coherent and fluent and completely incorrect, all at once.'),
          card('Understanding needs more', 'Context, common sense and real-world knowledge that AI lacks.'),
          card('But it is still useful', 'A powerful tool when you know what it is doing.')
        ],
        progressive: true,
        buildMode: 'hide',
        notes:
          'Reveal one at a time.\n\n' +
          'Do not skip the last card. The teacher pack is explicit about this: ' +
          'explaining the limits should not tip into dismissing the tool. ' +
          'Students who conclude "AI is rubbish" have missed the lesson as ' +
          'thoroughly as students who conclude "AI knows everything".'
      },
      {
        type: 'statement',
        hidden: true,
        body: "Does it matter if AI doesn't understand, as long as it's helpful?",
        subtitle: 'Extension — if you have longer than five minutes',
        feedback: {
          kind: 'scale',
          prompt: 'How much does it matter?',
          points: 5,
          lowLabel: 'Not at all',
          highLabel: 'Enormously',
          max: 1,
          presentAs: 'rail'
        },
        notes:
          'HIDDEN BY DEFAULT — the teacher pack\'s sub-question. Unhide with the ' +
          'card slide after it.\n\n' +
          'A scale rather than a poll: this is a question of degree, and the ' +
          'spread across the room is more interesting than any single answer. ' +
          'The distribution usually splits, which is the discussion.'
      },
      {
        type: 'cards',
        hidden: true,
        title: 'Yes — it matters',
        bullets: [
          card('Errors follow', 'No understanding means hallucinations are built in, not a bug.'),
          card('On things that matter', 'Plausible-sounding wrong advice on health, legal or safety questions.'),
          card('It cannot flag itself', "Without understanding, it can't know when it's wrong."),
          card('So you have to check', 'Verify outputs rather than trusting them.'),
          card('Knowing the limits helps', 'You use a tool better when you know what it cannot do.')
        ],
        progressive: true,
        buildMode: 'hide',
        notes: 'Extension — unhide together with the question before it.'
      },
      {
        type: 'keywords',
        title: 'Two words worth knowing',
        bullets: [
          kw('Large Language Model (LLM)',
            'AI trained on billions of texts to predict and generate human-like language, by pattern rather than by meaning.'),
          kw('Hallucination',
            "When AI confidently generates false information — because it predicts 'likely' text, not verified facts.")
        ],
        notes:
          'Both definitions were in the teacher pack only. Worth writing down.\n\n' +
          '"Hallucination" is an unfortunate term — it implies a mind having a ' +
          'strange experience. If a student notices that, they have understood ' +
          'the lesson better than the industry that named it.'
      },
      {
        type: 'journey',
        title: 'Being AI-smart',
        subtitle: 'Five habits that follow from knowing how it works',
        bullets: [
          card('Know what it is', "A pattern-matching tool, not a thinking being — it doesn't 'know' facts."),
          card('Verify', "Always check AI outputs against reliable sources — don't trust it blindly."),
          card('Expect bias', 'It reflects patterns in its training data, including biases and errors.'),
          card('Understand it', 'Knowing HOW AI works helps you use it more effectively.'),
          card('Be specific', 'The more specific your question, the better the output.')
        ],
        progressive: true,
        notes: 'Reveal one at a time. If you are short of time, end here.'
      },
      {
        type: 'keyfact',
        subtitle: 'Key takeaway',
        /* The heading adds the teacher pack's analogy rather than restating
           the takeaway underneath it — the body is the campaign's wording and
           stays verbatim, so the heading has to earn its own line. */
        title: 'Autocomplete, not an oracle',
        body: 'AI is a powerful tool — but like any tool, it has to be used properly.',
        notes: 'One line. Then stop.'
      },
      ...SUPPORT_SLIDES,
      {
        type: 'join',
        hidden: true,
        title: 'Join on your phone',
        subtitle: 'Only needed if you are running the live poll',
        notes:
          'HIDDEN BY DEFAULT. Unhide and drag to position 2 if you want the room ' +
          'voting, or open the join panel from the presenter view instead.'
      }
    ]
  },

  /* ================================================================ CREATIVE
     Starter 3. The only starter whose central question has no right answer —
     the teacher pack says so explicitly ("This is genuinely debated"). The
     poll options are therefore graded rather than right/wrong, and the answer
     slide leads with "it depends" rather than burying it. */
  {
    key: 'creative',
    principle: 'CREATIVE',
    title: 'AI as your creative partner',
    theme: 'aiad26-creative',
    slides: [
      {
        type: 'title',
        title: 'AI as your\ncreative partner',
        subtitle: 'Using AI to amplify human creativity, not replace it',
        notes:
          'AI AWARENESS DAY 2026 · Starter 3 · Principle: CREATIVE · 5 minutes\n\n' +
          'LEARNING OBJECTIVES\n' +
          "· Consider whether AI-assisted work is still 'yours'\n" +
          '· Understand what AI can and cannot contribute creatively\n' +
          '· Recognise that human creativity remains essential\n\n' +
          'FRAMING — from the teacher pack:\n' +
          'This connects directly to academic integrity, and different contexts ' +
          'have different rules (art vs. homework vs. professional work). ' +
          'Encourage students to develop their OWN skills, not just delegation ' +
          'skills.\n\n' +
          'There is no right answer to the main question. Do not manufacture one.'
      },
      {
        type: 'statement',
        body: 'If AI helped you write a story or create artwork, is it still your creation?',
        subtitle: 'Talk to the person next to you — 60 seconds',
        feedback: {
          kind: 'poll',
          prompt: 'Is it still yours?',
          options: [
            'Yes — completely mine',
            'Yes — if I did most of it',
            'Only partly mine',
            'No — not really mine'
          ],
          max: 1,
          presentAs: 'rail'
        },
        notes:
          'This one genuinely splits a room, which is the point. Show the spread ' +
          'and let two people who voted differently argue it out.\n\n' +
          'Do NOT resolve it. The teacher pack is clear that this is contested ' +
          'ground; your job is to give them better tools for the argument, not to ' +
          'end it.\n\n' +
          'DISCUSSION PROMPTS\n' +
          '→ If AI helped you with an essay, is it still your work?\n' +
          '→ What unique perspective do YOU bring that AI cannot?\n' +
          '→ When should you disclose that AI helped with something?'
      },
      {
        type: 'stats',
        title: 'Creative thinking is now one of the top five skills employers want',
        subtitle: 'Did you know?',
        bullets: [
          info('Students using AI mainly to save time', '51%', 'freeing space for deeper creative work'),
          info('Creativity and resilience', 'Top 5', 'rising skills for 2030, WEF'),
          info('Original ideas produced by AI', 'None', 'it recombines; it does not originate')
        ],
        body: 'WEF Future of Jobs Report 2025 · HEPI Survey 2025',
        notes:
          'The third tile is the argumentative one and it is meant to be. If a ' +
          'student pushes back — "but it made something new" — that is a good ' +
          'two-minute detour: recombination at sufficient scale can look a lot ' +
          'like originality, and the difference is whether anything was meant.\n\n' +
          'The 51% is the hopeful number. Time saved is only valuable if it goes ' +
          'somewhere.'
      },
      {
        type: 'cards',
        title: 'So — is it yours?',
        bullets: [
          card('It depends how you used it', 'And how much of YOUR creative input was involved.'),
          card('Brainstorming — probably yours', 'Using AI for starting points is like using a dictionary.'),
          card('Generating it whole — less so', 'An entire work with minimal editing is less clearly yours.'),
          card('The test', 'Can you explain and defend every creative choice in the work?'),
          card('The other test', 'Would you be comfortable if your teacher knew exactly how AI was used?'),
          card('What you provide', 'Vision, judgment, emotional truth, perspective, and the final decisions.')
        ],
        progressive: true,
        buildMode: 'hide',
        notes:
          'Reveal one at a time.\n\n' +
          'Cards 4 and 5 are the two that students can actually carry into a ' +
          'homework decision at 11pm. Spend your time there.\n\n' +
          'If a student asks where inspiration ends and copying begins: ' +
          'inspiration transforms an idea through your own perspective and skill; ' +
          'copying reproduces it without adding anything. If you could swap the ' +
          'AI output for any similar output and nothing would be lost, it was ' +
          'never yours.'
      },
      {
        type: 'statement',
        hidden: true,
        body: "What do you bring that AI can't replicate?",
        subtitle: 'Extension — if you have longer than five minutes',
        feedback: {
          kind: 'wordcloud',
          prompt: 'One word — what do you bring?',
          max: 2,
          presentAs: 'rail'
        },
        notes:
          'HIDDEN BY DEFAULT — the teacher pack\'s sub-question.\n\n' +
          'A word cloud is the right shape for this: repeats grow, so the room ' +
          'watches its own consensus form in real time. It is also the single ' +
          'most affirming thirty seconds in the whole set of five starters — if ' +
          'you unhide one extension slide across the whole day, make it this one.'
      },
      {
        type: 'cards',
        hidden: true,
        title: 'What you bring',
        bullets: [
          card('Lived experience', 'Your unique perspective, shaped by your life.'),
          card('Emotional truth', 'Genuine feelings that resonate with other people.'),
          card('Cultural context', 'Understanding nuance, appropriateness and meaning.'),
          card('Creative judgment', "Knowing what's good, what works, and what matters."),
          card('Intentionality', 'Having a purpose and a message behind the work.'),
          card('Ethical reasoning', 'Choosing what SHOULD be created, not just what can be.')
        ],
        progressive: true,
        buildMode: 'hide',
        notes: 'Extension — unhide together with the question before it.'
      },
      {
        type: 'keywords',
        title: 'Two words worth knowing',
        bullets: [
          kw('Generative AI',
            'AI that creates new content from patterns in training data — recombining existing patterns rather than having original ideas.'),
          kw('Authenticity',
            'Being genuine and original: your own voice, experiences and creative choices, rather than delegating them.')
        ],
        notes:
          'Both definitions were in the teacher pack only.\n\n' +
          'Useful counterweight if the room turns purist: tools have always been ' +
          'part of creativity — cameras, synthesisers, spell checkers. The ' +
          'question has never been whether you used a tool. It is whether the ' +
          'result means anything.'
      },
      {
        type: 'journey',
        title: 'Creative AI partnership',
        subtitle: 'Five ways to keep the work yours',
        bullets: [
          card('Brainstorm with it', 'Generate ten ideas, then pick and improve the best one.'),
          card('Delegate the repetitive', 'Let it handle the routine so you can make the real decisions.'),
          card('Bring yourself', 'Your experiences and perspectives are what make work original.'),
          card('Start, do not finish', 'Think of AI as a starting point, not the finish line.'),
          card('Add your voice', 'Always add your own judgment and personal touch.')
        ],
        progressive: true,
        notes: 'Reveal one at a time. If you are short of time, end here.'
      },
      {
        type: 'keyfact',
        subtitle: 'Key takeaway',
        title: 'You are still the author',
        body: 'The best creative work comes from human imagination enhanced by AI capability.',
        notes: 'One line. Then stop.'
      },
      ...SUPPORT_SLIDES,
      {
        type: 'join',
        hidden: true,
        title: 'Join on your phone',
        subtitle: 'Only needed if you are running the live poll',
        notes:
          'HIDDEN BY DEFAULT. Unhide and drag to position 2 if you want the room ' +
          'voting, or open the join panel from the presenter view instead.'
      }
    ]
  },

  /* ============================================================= RESPONSIBLE
     Starter 4. The teacher pack's warning here is the sharpest of the five:
     avoid doom-and-gloom, frame as informed decision-making rather than guilt.
     The answer cards are written to that instruction — none of them tells a
     student to stop using AI. */
  {
    key: 'responsible',
    principle: 'RESPONSIBLE',
    title: 'The hidden costs of AI',
    theme: 'aiad26-responsible',
    slides: [
      {
        type: 'title',
        title: 'The hidden\ncosts of AI',
        subtitle: 'Understanding the environmental and ethical impact of AI',
        notes:
          'AI AWARENESS DAY 2026 · Starter 4 · Principle: RESPONSIBLE · 5 minutes\n\n' +
          'LEARNING OBJECTIVES\n' +
          '· Understand that AI has significant environmental impact\n' +
          '· Learn about data centre energy and water consumption\n' +
          "· Consider when AI use is and isn't justified\n\n" +
          'TONE — from the teacher pack, and it matters here more than anywhere:\n' +
          'Avoid doom-and-gloom. Frame this as informed decision-making, not ' +
          'guilt. The goal is thoughtful use, not complete avoidance. AI also has ' +
          'POSITIVE environmental applications — climate modelling, grid ' +
          'efficiency — and it is worth saying so.'
      },
      {
        type: 'statement',
        body: 'Every time you use AI, it uses electricity and water. Should we care?',
        subtitle: 'Talk to the person next to you — 60 seconds',
        feedback: {
          kind: 'scale',
          prompt: 'How much should we care?',
          points: 5,
          lowLabel: 'Not at all',
          highLabel: 'Enormously',
          max: 1,
          presentAs: 'rail'
        },
        notes:
          'A scale rather than a poll — this is a question of degree, and the ' +
          'spread is the discussion. Show the distribution and ask someone at ' +
          'each end to explain their position.\n\n' +
          'Watch for the room talking itself into guilt. Redirect: the useful ' +
          'question is not "should I feel bad" but "when is it worth it".\n\n' +
          'DISCUSSION PROMPTS\n' +
          "→ Does knowing about AI's environmental impact change how you'll use it?\n" +
          '→ When is using AI worth the environmental cost?\n' +
          '→ What might you use instead of AI for simple tasks?'
      },
      {
        /* The one slide in the five decks that is not a list of facts but an
           argument about proportion, so it gets the layout built for that
           shape rather than stat tiles. Same numbers, same sources — the
           difference is that the tiles say "here are three figures" and this
           says "you saw one line of text; this is what was under it". */
        type: 'iceberg',
        title: "What's under one question",
        subtitle: 'One answer from a chatbot',
        bullets: [
          info('Electricity', '1%', 'of all global electricity goes to data centres — doubling by 2026'),
          info('Carbon', '32.6–79.7 Mt', "AI's 2025 footprint, CO₂ equivalent — about New York City's"),
          info('Per model trained', '5 cars', 'as much CO₂ as five cars over their entire lifetimes'),
          info('Water for cooling', '≈ all bottled water', 'AI data centres could use as much this year as the global bottled water industry')
        ],
        progressive: true,
        body: 'Nature Sustainability 2025 · International Energy Agency 2025 · MIT',
        notes:
          'REVEAL ONE LAYER AT A TIME — press → for each. The room should be ' +
          'guessing how far down this goes.\n\n' +
          'Start by pointing at the line above the waterline: that is all anyone ' +
          'sees when they use it. Everything below is the same single answer.\n\n' +
          'The water layer is the one students remember, because nobody expects ' +
          'computing to be thirsty. Save it for last, which is where it is.\n\n' +
          'The range on the third tile (32.6–79.7) is not vagueness — it is ' +
          'honest reporting of a genuinely uncertain measurement. Worth naming ' +
          'if anyone asks why it is not one number.'
      },
      {
        type: 'cards',
        title: 'So — should we care?',
        bullets: [
          card('Yes — it adds up', 'Small individual actions combine into massive collective impact.'),
          card('The scale is national', "AI's total footprint is equivalent to a small country's emissions."),
          card('Being informed helps', 'It lets you judge when AI is actually worth using.'),
          card('This is not "never use AI"', "It's \"use it thoughtfully\"."),
          card('Companies have a job too', 'Transparency, efficiency, and investment in renewable energy.'),
          card('And so do we', 'As consumers we can advocate for more sustainable AI.')
        ],
        progressive: true,
        buildMode: 'hide',
        notes:
          'Reveal one at a time.\n\n' +
          'Card 4 is the one that keeps this starter honest. Say it clearly and ' +
          'do not let the room leave thinking they have been told off for using a ' +
          'chatbot.\n\n' +
          'Cost-benefit, if it comes up: complex research, accessibility needs ' +
          'and real productivity gains can justify the cost. Simple questions you ' +
          'could answer yourself, and trivial entertainment, mostly do not.'
      },
      {
        /* The teacher pack's first sub-question — "Is using AI to save time
           worth its environmental cost?" — which had no slide because it is
           not a list, it is a judgement about where things sit. This is the
           layout for that, so the question finally has one.

           THE ORDER IS THE PACK'S; THE POSITIONS ARE A READING OF IT. The pack
           names the categories and says plainly which end each belongs at
           ("higher-impact uses may justify higher costs; lower-impact uses may
           not"). It gives no numbers, and these are not presented as any. */
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
        notes:
          'THE POSITIONS ARE ARGUABLE AND THAT IS THE EXERCISE. The teacher ' +
          'pack names these categories and says which end each belongs at; it ' +
          'gives no numbers. Do not defend the exact spots.\n\n' +
          'Best use: ask the room to move one. "Which of these is in the wrong ' +
          'place?" gets further in ninety seconds than any amount of explaining, ' +
          'and the argument is always about the middle one.\n\n' +
          'The question underneath, from the pack: is AI the most efficient tool ' +
          'here, or would a simple search have worked?\n\n' +
          'Keep the tone off guilt. This is a slide about judgement, not abstinence.'
      },
      {
        type: 'statement',
        hidden: true,
        body: "Who should be responsible for AI's carbon footprint?",
        subtitle: 'Extension — if you have longer than five minutes',
        feedback: {
          kind: 'poll',
          prompt: 'Who is responsible?',
          options: [
            'The tech companies',
            'Governments',
            'Us, the users',
            'All of the above'
          ],
          max: 1,
          presentAs: 'rail'
        },
        notes:
          'HIDDEN BY DEFAULT — the teacher pack\'s sub-question.\n\n' +
          'The poll is the lesson: rooms split three ways and then discover the ' +
          'answer is "all of the above". Take the vote before you reveal the next ' +
          'slide, and let the room notice for itself that everyone picked ' +
          'somebody else.'
      },
      {
        type: 'cards',
        hidden: true,
        title: 'All of the above',
        bullets: [
          card('Tech companies', 'They build and profit from AI systems.'),
          card('Governments', 'They set regulations and energy policy.'),
          card('Users', 'We choose when and how much to use AI.'),
          card('Which means everyone', 'Responsibility is shared along the whole chain.'),
          card('Companies should', 'Use renewable energy, improve efficiency, be transparent.'),
          card('And users can', 'Use AI thoughtfully, advocate for sustainability, stay informed.')
        ],
        progressive: true,
        buildMode: 'hide',
        notes: 'Extension — unhide together with the question before it.'
      },
      {
        type: 'keywords',
        title: 'Two words worth knowing',
        bullets: [
          kw('Data centre',
            'A facility housing thousands of servers. AI needs massive ones, consuming electricity for computing and water for cooling.'),
          kw('Carbon footprint',
            "Total greenhouse gases caused by an activity — for AI: electricity generation, hardware manufacturing and cooling.")
        ],
        notes:
          'Both definitions were in the teacher pack only.\n\n' +
          'The water point surprises people every time. Servers generate heat; ' +
          'heat has to go somewhere; evaporative cooling is how it goes.'
      },
      {
        type: 'journey',
        title: 'Using AI responsibly',
        subtitle: 'Five habits — none of which is "stop"',
        bullets: [
          card('Think first', 'Do you really need AI for this task?'),
          card('Check yourself first', "Simple questions often don't need AI at all."),
          card('Batch it', 'Group your requests rather than sending many small ones.'),
          card('Consider the source', 'Some companies use far more renewable energy than others.'),
          card('Ask for transparency', "We need to know AI's true environmental cost.")
        ],
        progressive: true,
        notes: 'Reveal one at a time. If you are short of time, end here.'
      },
      {
        type: 'keyfact',
        subtitle: 'Key takeaway',
        title: 'Thoughtfully — not never',
        body: 'Every choice we make about technology has consequences. Use AI thoughtfully.',
        notes: 'One line. Then stop.'
      },
      ...SUPPORT_SLIDES,
      {
        type: 'join',
        hidden: true,
        title: 'Join on your phone',
        subtitle: 'Only needed if you are running the live poll',
        notes:
          'HIDDEN BY DEFAULT. Unhide and drag to position 2 if you want the room ' +
          'voting, or open the join panel from the presenter view instead.'
      }
    ]
  },

  /* =================================================================== FUTURE
     Starter 5, and the longest in the source: three questions rather than two.
     The third ("What can humans do that AI cannot?") overlaps heavily with the
     Creative starter's word cloud, so it stays hidden — running both on the
     same day would ask a room the same question twice. */
  {
    key: 'future',
    principle: 'FUTURE',
    title: 'Your AI-ready future',
    theme: 'aiad26-future',
    slides: [
      {
        type: 'title',
        title: 'Your AI-ready\nfuture',
        subtitle: 'Preparing for careers in an AI-transformed world',
        notes:
          'AI AWARENESS DAY 2026 · Starter 5 · Principle: FUTURE · 5 minutes\n\n' +
          'LEARNING OBJECTIVES\n' +
          '· Understand how AI is changing the job market\n' +
          '· Identify skills that will remain valuable alongside AI\n' +
          '· Recognise the importance of lifelong learning\n\n' +
          'TONE — from the teacher pack:\n' +
          'Balance realism with optimism. Changes are coming, but so are ' +
          'opportunities. Emphasise that students have agency here. Avoid ' +
          'specific predictions — the exact jobs of 2035 are genuinely unknowable, ' +
          'and pretending otherwise undermines everything else you say.'
      },
      {
        type: 'statement',
        body: 'If AI can do many jobs faster than humans, what skills will make you valuable?',
        subtitle: 'Talk to the person next to you — 60 seconds',
        feedback: {
          kind: 'wordcloud',
          prompt: 'One skill that will still matter',
          max: 2,
          presentAs: 'rail'
        },
        notes:
          'A word cloud rather than a poll: there is no fixed list of right ' +
          'answers, and watching the room converge on "creativity", "empathy" and ' +
          '"communication" without being told is worth more than a slide saying ' +
          'so.\n\n' +
          'DISCUSSION PROMPTS\n' +
          '→ Which skills do you have that AI cannot replicate?\n' +
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
        notes:
          'Lead with the net figure. "170 million new jobs" alone is spin and "92 ' +
          'million displaced" alone is doom — the honest number is +78 million, ' +
          'and students can handle it.\n\n' +
          'One more from the teacher pack if you want it: professionals with AI ' +
          'skills command up to a 56% salary premium (PwC 2025). Use with care — ' +
          'it motivates some rooms and alienates others.'
      },
      {
        type: 'cards',
        title: 'Six things that stay valuable',
        bullets: [
          card('Human skills', 'Empathy, emotional intelligence, relationships, ethical judgment.'),
          card('Creative skills', 'Original thinking, artistic vision, inventive problem-solving.'),
          card('Complex reasoning', 'Critical analysis, nuanced judgment, handling ambiguity.'),
          card('Interpersonal', 'Leadership, collaboration, communication, negotiation.'),
          card('AI-complementary', 'Knowing how to work WITH AI. Prompt engineering is a real skill.'),
          card('Adaptability', 'Willingness to keep learning throughout your career.')
        ],
        progressive: true,
        buildMode: 'hide',
        notes:
          'Reveal one at a time, matching them to what the room already said in ' +
          'the word cloud — "somebody said kindness, that is this one". It makes ' +
          'the list theirs rather than yours.'
      },
      {
        type: 'compare',
        hidden: true,
        title: 'Which jobs change, which jobs grow',
        subtitle: 'Changing | Growing',
        bullets: [
          versus('Routine data entry', 'AI specialists and data scientists'),
          versus('Basic customer service', 'Cybersecurity'),
          versus('Simple content generation', 'Renewable energy'),
          versus('Parts of almost every job', 'AI trainers, ethics officers, prompt engineers')
        ],
        notes:
          'HIDDEN BY DEFAULT — the teacher pack\'s first sub-question.\n\n' +
          'The single most important line is not on the slide, so say it: most ' +
          'jobs will be TRANSFORMED, not destroyed. AI handles parts, humans ' +
          'handle the rest. The left column is tasks, not careers.\n\n' +
          'Protected: anything needing physical presence, human connection, or ' +
          'creative judgment.'
      },
      {
        type: 'cards',
        hidden: true,
        title: 'What humans do that AI cannot',
        bullets: [
          card('Build real relationships', 'Based on trust and emotional connection.'),
          card('Judge what should be done', 'Not just what can be done.'),
          card('Understand context', 'Nuance and cultural meaning.'),
          card('Be accountable', 'Take responsibility for a decision.'),
          card('Have experiences', 'Original ones, that inform creative work.'),
          card('Actually care', 'Feel genuine motivation about the outcome.')
        ],
        progressive: true,
        buildMode: 'hide',
        notes:
          'HIDDEN BY DEFAULT — the teacher pack\'s third question.\n\n' +
          'Deliberately left hidden even in a longer lesson if you are also ' +
          'running the CREATIVE starter that day: its word cloud asks the room ' +
          'this same question, and asking it twice makes the second one feel ' +
          'rhetorical.'
      },
      {
        type: 'keywords',
        title: 'Two words worth knowing',
        bullets: [
          kw('AI literacy',
            'Understanding, using and critically evaluating AI — how it works, where it fails, and how to use it ethically.'),
          kw('Prompt engineering',
            'Writing effective instructions for AI systems: being clear, being specific, and giving relevant context.')
        ],
        notes:
          'Both definitions were in the teacher pack only.\n\n' +
          'Worth noting that "prompt engineering" may not survive as a job title ' +
          '— the skill will likely be absorbed into ordinary literacy, the way ' +
          '"being good at internet searching" was. The underlying ability to ask ' +
          'a precise question is the durable part.'
      },
      {
        type: 'journey',
        title: 'Building your AI-ready skillset',
        subtitle: 'Five moves you can start this year',
        bullets: [
          card('Lead with human skills', 'Critical thinking, communication, creativity, empathy.'),
          card('Learn to work with AI', 'Prompt engineering and AI literacy are valuable now.'),
          card('Build what AI cannot', 'Leadership, ethical judgment, relationships.'),
          card('Stay adaptable', 'The ability to learn new skills is the skill.'),
          card('Explore the field', 'Data science, AI ethics, machine learning, AI product design.')
        ],
        progressive: true,
        notes: 'Reveal one at a time. If you are short of time, end here.'
      },
      {
        type: 'keyfact',
        subtitle: 'Key takeaway',
        title: 'Collaborate, and stay human',
        body: 'The future belongs to those who can work with AI while bringing uniquely human value.',
        notes: 'One line. Then stop.'
      },
      ...SUPPORT_SLIDES,
      {
        type: 'join',
        hidden: true,
        title: 'Join on your phone',
        subtitle: 'Only needed if you are running the live poll',
        notes:
          'HIDDEN BY DEFAULT. Unhide and drag to position 2 if you want the room ' +
          'voting, or open the join panel from the presenter view instead.'
      }
    ]
  }
];

module.exports = { STARTERS, SUPPORT_SLIDES };
