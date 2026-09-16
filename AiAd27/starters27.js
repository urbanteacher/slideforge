'use strict';
/* AI Awareness Day 2027 — Keep Humans in the Loop.
 *
 *   Student-facing message   Your AI. Your Choices.
 *   Activation               Five Minutes to Think
 *   Campaign line            Five minutes. One important question.
 *                            Better choices with AI.
 *
 * THE SHIFT FROM 2026 IS AWARENESS → AGENCY. 2026 helped students understand
 * what AI is. 2027 asks what we should let it do, decide and influence. Every
 * starter here ends with a choice the student makes, not a fact they receive.
 *
 * ── SEVEN STUDENT-FACING SLIDES ─────────────────────────────────────────────
 *
 * Every deck is the same seven, in the same order, with the brief's timings:
 *
 *   1  Title             the question, dominant, with the campaign lockup
 *   2  The scenario      30s   one realistic situation, two or three sentences
 *   3  Make your choice  45s   they vote BEFORE the explanation
 *   4  Talk to someone   90s   one question, in pairs, least clutter in the deck
 *   5  The reveal        90s   the concept, and the assumption it breaks
 *   6  What to remember  45s   three short practical rules, numbered
 *   7  Your choice             one personal action, and the campaign close
 *
 * Slide 3 is the load-bearing one. Voting before the reveal is what makes this
 * a lesson rather than a briefing, and it is why the options are on the wall as
 * cards and not only in the poll rail — a room with no phones still votes, by
 * hand, against something it can see.
 *
 * Two further slides per deck are HIDDEN from the show: the teacher's
 * preparation page, and the vocabulary. The brief asks for teacher guidance to
 * be separate from the student-facing slides and to live in the presenter
 * notes; this does both, and neither can be projected by accident.
 *
 * ── SOURCES ─────────────────────────────────────────────────────────────────
 *
 * The four the brief names, and what each is doing here:
 *
 *   UNICEF, "When AI becomes a friend" (policy brief, June 2026)
 *     SAFE. Names the four child-specific harms and the 20-million figure.
 *     https://www.unicef.org/documents/when-ai-becomes-friend-child-rights-risks
 *
 *   Ofqual, "Using AI in marking" (blog, 14 January 2026)
 *     RESPONSIBLE. Quoted directly — the regulator's own words carry this
 *     starter, and they are stronger than any paraphrase.
 *     https://ofqual.blog.gov.uk/2026/01/14/using-ai-in-marking-why-technical-capability-fairness-and-transparency-all-matter/
 *
 *   Content Credentials (C2PA)
 *     CREATIVE. The provenance standard the reveal slide is modelled on.
 *     https://contentcredentials.org/
 *
 *   Education Endowment Foundation, metacognition and self-regulation
 *     FUTURE. Plan, monitor, evaluate — the frame for "is this strengthening
 *     or replacing my thinking?"
 *     https://educationendowmentfoundation.org.uk/education-evidence/teaching-learning-toolkit/metacognition-and-self-regulation
 *
 * The UNICEF and Ofqual material was read for this build; Ofqual is quoted
 * verbatim. Content Credentials and the EEF toolkit are used as concepts, not
 * as sources of figures. Nothing here carries an unsourced number.
 */

/** Label · value · note — stats, iceberg, spectrum, shift. */
const info = (label, value, note) => [label, value, note].join('\t');

/** Two columns — compare. */
const versus = (left, right) => `${left}\t${right}`;

/** Heading · body — cards. */
const card = (heading, body) => `${heading}\t${body}`;

/** Term · definition — keywords. */
const kw = (term, detail) => `${term}\t${detail}`;

/* The vocabulary slide is identical in shape across all five, so it is built
   here rather than written out five times. Hidden, with the teacher page:
   seven student-facing slides is the brief and these two are not among them. */
const vocab = (a, b) => ({
  type: 'keywords',
  hidden: true,
  title: 'Two words worth knowing',
  bullets: [a, b],
  notes:
    'HIDDEN FROM THE SHOW — the brief asks for seven student-facing slides ' +
    'and this is not one of them.\n\n' +
    'Worth thirty seconds anyway. Both terms are used on the slides this deck ' +
    'shows, and a word nobody defines is a word nobody argues with.\n\n' +
    'Written for 11–16, not for a policy paper.'
});

/* The teacher's preparation page, one per deck.

   The brief asks for teacher guidance to be separate from the student-facing
   slides AND to appear in the presenter notes. This is both: a hidden slide
   that can never be projected by accident, carrying the purpose, the age
   range, the exact five-minute timing, the script, likely responses,
   safeguarding, SEND differentiation and an extension — all in the notes,
   where the presenter view puts them on the teacher's own screen. */
const teacherPage = (opts) => ({
  type: 'content',
  hidden: true,
  title: 'Teacher preparation',
  subtitle: opts.purpose,
  bullets: [
    'Ages ' + opts.ages + '  ·  5 minutes  ·  no preparation, no account, no extra materials',
    'Timing  30s scenario  ·  45s vote  ·  90s pairs  ·  90s reveal  ·  45s action',
    'You need  this deck on the board. Phones are optional \u2014 a show of hands works.'
  ],
  notes: opts.notes
});

const STARTERS_27 = [

  /* ===================================================================== SAFE
     Would You Tell an AI Your Secret?

     The hardest of the five to teach, because from the inside it looks like
     being listened to. UNICEF's term "data elicitation" is the one that does
     the work: the thing is not passively storing what you say, it is drawing
     it out of you. */
  {
    key: 'safe',
    principle: 'SAFE',
    title: 'Would you tell an AI your secret?',
    slides: [
      teacherPage({
        ages: '9–18',
        purpose: 'Students decide what they will and will not tell an AI — and who they will tell instead.',
        notes: 'PURPOSE. Students decide what they will and will not tell an AI, and who they will tell instead. Not a lecture about chatbots being bad.\\n\\nSCRIPT, if you want one:\\n"Read this." (slide 2) — "Vote. No talking yet." (slide 3) — "Turn to the person next to you. Ninety seconds." (slide 4) — "Here is what is actually happening." (slide 5) — "Three things to take away." (slide 6) — "Decide one. You do not have to say it." (slide 7)\\n\\nLIKELY RESPONSES. Most rooms vote "stays between us" or "stored safely". Very few pick "nobody knows", which is the honest answer. Some students will be defensive — they have a companion they like, and they are hearing an adult criticise it.\\n\\nSAFEGUARDING. Real risk of disclosure in this session. If a student indicates they have shared images, been asked for images, or is relying on a companion instead of people, follow your school’s safeguarding process the same day. Have the named person ready before you start. Childline 0800 1111. Samaritans 116 123.\\n\\nSEND / YOUNGER LEARNERS. Drop slide 5 to the first two rows. Replace "data elicitation" with "it asks questions to get you talking". Offer the vote as a show of hands only.\\n\\nEXTENSION. Find the privacy setting in a tool you actually use. Screenshot it. What does it let you turn off?\\n\\nSOURCE. UNICEF, "When AI becomes a friend", June 2026.'
      }),
      {
        type: 'title',
        title: 'Would you tell an AI your secret?',
        subtitle: 'Five Minutes to Think',
        notes:
          'SLIDE 1 · TITLE. Up as the class comes in. The question does the work; ' +
          'do not explain it yet.\n\n' +
          'The full teacher page is the hidden slide before this one — purpose, ' +
          'timing, script, safeguarding, SEND and an extension.'
      },
      {
        type: 'quote',
        body: 'I told it something I have never told anyone. It said it understood.',
        subtitle: 'The scenario · 30 seconds',
        notes:
          'BEAT 1 · 30 SECONDS. Read it, let it sit, move on. Do not comment yet.\n\n' +
          'DO NOT OPEN WITH DISAPPROVAL. Some of this room have done exactly ' +
          'this, and a few will have said things to a chatbot they have said to ' +
          'nobody else. If the first thing they hear is that it is sad or ' +
          'embarrassing, you have lost them for the whole five minutes.'
      },
      {
        type: 'cards',
        title: 'Make your choice: where does that message go now?',
        bullets: [
          card('It stays between us', 'Nobody else ever sees it.'),
          card('Stored, but safely', 'Kept on a server, protected, not looked at.'),
          card('It trains the next version', 'Your words become part of what it learns from.'),
          card('Nobody actually knows', 'Including the person who typed it.')
        ],
        feedback: {
          kind: 'poll',
          prompt: 'Where does that message go?',
          options: ['It stays between us', 'Stored, but safely',
                    'It trains the next version', 'Nobody actually knows'],
          max: 1,
          presentAs: 'rail'
        },
        notes:
          'BEAT 2 · 45 SECONDS. Vote first. Do not explain first.\n\n' +
          'The options are on the wall as well as in the poll so a room with no ' +
          'phones can still vote by hand.\n\n' +
          'The fourth option is the honest one and it is meant to be ' +
          'uncomfortable. It differs by product, most terms do not say plainly, ' +
          'and almost nobody checks. Do not give that away until beat 4.'
      },
      {
        type: 'statement',
        body: 'Where does a secret go when you tell it to something that cannot keep one?',
        subtitle: 'Discuss in pairs · 90 seconds',
        notes:
          'BEAT 3 · 90 SECONDS. The 90 seconds are the lesson. Resist filling them.\n\n' +
          'Listen for "but it does not tell anyone". That is the assumption beat ' +
          '4 breaks: not telling anyone and not keeping a secret are different ' +
          'things.\n\n' +
          'If a student says the AI understood them — accept it. Feeling heard is ' +
          'real. Whether anything was on the other side of it is the question.'
      },
      {
        type: 'iceberg',
        title: 'What is under a conversation that felt private',
        subtitle: 'A message you would never say out loud',
        bullets: [
          /* Each note is held to one line at 28pt. Two-line notes put the
             fourth band 43px off the slide, and the floor is not negotiable. */
          info('Emotional dependence', 'Risk 1', 'the pull to return to it, not to a person'),
          info('Data elicitation', 'Risk 2', 'built to draw things out of you'),
          info('Harmful advice', 'Risk 3', 'confident, wrong, about things that matter'),
          info('Sexualised role-play', 'Risk 4', 'including with users known to be children')
        ],
        progressive: true,
        /* Four rows, not five. The 20-million figure was a fifth band until the
           28pt accessibility floor went in and pushed the stack 80px off the
           slide. The floor is the brief's and it wins, so the figure moved to
           the source line where it still gets said — the four named harms are
           what the layout is for. */
        body: '20 million+ children across 10 countries already use them · UNICEF, "When AI becomes a friend", June 2026',
        notes:
          'BEAT 4 · 90 SECONDS. Reveal one layer at a time.\n\n' +
          'THE SECOND ROW IS THE POINT. "Data elicitation" is UNICEF’s own term ' +
          'and it is the one students have never considered: a companion that ' +
          'asks follow-up questions is not being curious, it is being designed. ' +
          'The warmth is the mechanism.\n\n' +
          'UNICEF groups the harms as technical, psychological, developmental ' +
          'and social. The four above are the child-specific ones it names.\n\n' +
          'Say the last row plainly: 20 million children, ten countries, taken up ' +
          'faster than adults did. This is normal behaviour, not a fringe one.'
      },
      {
        type: 'journey',
        title: 'What to remember',
        subtitle: 'Three things, in the order you would use them',
        bullets: [
          card('Keep it off the record', 'Private information stays out of an AI chat — names, images, anything about someone else.'),
          card('Check before you talk', 'Look at the privacy setting once, before you need it.'),
          card('Take the serious things to a person', 'Someone who can actually do something about it.')
        ],
        progressive: true,
        notes:
          'SLIDE 6 · 45 SECONDS. Reveal one at a time. Three is the limit — a ' +
          'fourth rule is a rule nobody remembers.\n\n' +
          'Numbered rather than bulleted so the order is part of the message, and so ' +
          'nothing here depends on colour to be understood.'
      },
      {
        type: 'keyfact',
        subtitle: 'Your choice · 45 seconds',
        title: 'Name one thing you will take to a person',
        body: 'Decide now which kind of thing you will say out loud to someone who can actually do something about it.',
        notes:
          'BEAT 5 · 45 SECONDS. Everyone decides one thing. They do not have to ' +
          'say it aloud.\n\n' +
          'Then give them the route, by name: your tutor, your head of year, your ' +
          'safeguarding lead. Childline 0800 1111. Samaritans 116 123.\n\n' +
          'Watch who does not look up.'
      },
      vocab(
        kw('AI companion', 'A chatbot built to act like a friend or partner — it remembers you, asks about your day, and is always awake.'),
        kw('Data elicitation', 'When a system is designed to draw information out of you, rather than waiting to be told. The questions are the product working.')
      )
    ]
  },

  /* ==================================================================== SMART
     What Happens When AI Acts for You?

     The move from generating answers to taking actions, in language a
     13-year-old can hold. The distinction that matters is not clever: a wrong
     answer costs you time, a wrong action costs you something you cannot undo. */
  {
    key: 'smart',
    principle: 'SMART',
    title: 'What happens when AI acts for you?',
    slides: [
      teacherPage({
        ages: '11–18',
        purpose: 'Students work out what an AI should be allowed to do on their behalf, and what must always ask first.',
        notes: 'PURPOSE. Students distinguish a chatbot from an agent, and decide what they would let one do without being asked.\\n\\nKEY DEFINITION. An agent does not answer, it acts — sends, books, buys, changes files. Most students have not been told there is a difference.\\n\\nLIKELY RESPONSES. The vote splits hard between "read your emails" and "none of it, not once". Both are defensible, which is what makes it worth voting on. Anyone choosing "none, not once" should be asked how long they would keep that up.\\n\\nSEND / YOUNGER LEARNERS. Use one example all the way through — ordering food is the clearest. Skip the last row of slide 5.\\n\\nEXTENSION. Write the permission list you would actually grant. Compare with a partner: where do you differ, and why?\\n\\nNOT A SCARE SESSION. Agents are useful. The lesson is about where the checkpoint goes.'
      }),
      {
        type: 'title',
        title: 'What happens when AI acts for you?',
        subtitle: 'Five Minutes to Think',
        notes:
          'SLIDE 1 · TITLE. Up as the class comes in. The question does the work; ' +
          'do not explain it yet.\n\n' +
          'The full teacher page is the hidden slide before this one — purpose, ' +
          'timing, script, safeguarding, SEND and an extension.'
      },
      {
        type: 'quote',
        body: 'It has my email, my calendar and my card. I told it to sort out my birthday.',
        subtitle: 'The scenario · 30 seconds',
        notes:
          'BEAT 1 · 30 SECONDS. Read it and move on.\n\n' +
          'This is not science fiction and should not be introduced as if it ' +
          'were. Agents that read mail, book things and buy things are shipping ' +
          'now. The room may already have used one without calling it that.'
      },
      {
        type: 'cards',
        title: 'Make your choice: which of these can it do without asking?',
        bullets: [
          card('Read your emails', 'To find the details it needs.'),
          card('Send a message as you', 'In your name, in your words.'),
          card('Spend your money', 'Up to a limit you set once.'),
          card('None of it, not once', 'It asks every single time.')
        ],
        feedback: {
          kind: 'poll',
          prompt: 'What can it do without asking?',
          options: ['Read your emails', 'Send a message as you',
                    'Spend your money', 'None of it, not once'],
          max: 1,
          presentAs: 'rail'
        },
        notes:
          'BEAT 2 · 45 SECONDS. Vote before you explain anything.\n\n' +
          'Rooms split hard between the first and the last, and both positions ' +
          'are defensible — which is what makes this worth voting on.\n\n' +
          'Anyone who picks "none, not once" should be asked how long they would ' +
          'actually keep that up. Permission fatigue is why the setting exists.'
      },
      {
        type: 'statement',
        body: 'If it makes a mistake while acting as you, whose mistake is it?',
        subtitle: 'Discuss in pairs · 90 seconds',
        notes:
          'BEAT 3 · 90 SECONDS.\n\n' +
          'Push on "the company’s". Ask what happens if the message has already ' +
          'been sent, or the money already spent. Fault and consequence are not ' +
          'the same thing, and only one of them lands on the student.\n\n' +
          'Good prompt if they stall: would you let a friend borrow your account ' +
          'to do the same job?'
      },
      {
        type: 'compare',
        title: 'A chatbot answers. An agent acts.',
        subtitle: 'A chatbot | An agent',
        bullets: [
          versus('Gives you something to use', 'Goes and does the next step'),
          versus('You decide whether to act on it', 'It has already acted'),
          versus('A wrong answer costs you time', 'A wrong action costs money, or a relationship'),
          versus('You can check before anything happens', 'You check afterwards, if at all'),
          versus('Wrong once', 'Wrong repeatedly, quickly, in your name')
        ],
        notes:
          'BEAT 4 · 90 SECONDS. Left column first if you can.\n\n' +
          'THE THIRD ROW IS THE WHOLE LESSON. Everything else follows from it. ' +
          'An answer you can ignore; an action has already happened.\n\n' +
          'The last row is the one that surprises: an agent does not make one ' +
          'mistake, it makes the same mistake at speed until something stops it.\n\n' +
          'Name the principle: give it the smallest permission that does the job, ' +
          'and make anything you cannot undo ask first.'
      },
      {
        type: 'journey',
        title: 'What to remember',
        subtitle: 'Three things, in the order you would use them',
        bullets: [
          card('Smallest permission that works', 'Give it what the job needs and nothing more.'),
          card('Anything you cannot undo, it asks', 'Money, messages sent as you, anything deleted.'),
          card('Check what it did', 'Not just what it said it would do.')
        ],
        progressive: true,
        notes:
          'SLIDE 6 · 45 SECONDS. Reveal one at a time. Three is the limit — a ' +
          'fourth rule is a rule nobody remembers.\n\n' +
          'Numbered rather than bulleted so the order is part of the message, and so ' +
          'nothing here depends on colour to be understood.'
      },
      {
        type: 'keyfact',
        subtitle: 'Your choice · 45 seconds',
        title: 'Decide what it must always ask about',
        body: 'Pick the one thing you would never let it do without checking with you first.',
        notes:
          'BEAT 5 · 45 SECONDS.\n\n' +
          'Most rooms land on money or on messages sent in their name. Both are ' +
          'right answers.\n\n' +
          'Point out that this is a real setting in real products, not a thought ' +
          'experiment — and that almost nobody opens it.'
      },
      vocab(
        kw('AI agent', 'AI that does things rather than only saying things — sending, booking, buying, changing files on your behalf.'),
        kw('Human in the loop', 'Keeping a person at the point of decision, so nothing important happens without someone choosing it.')
      )
    ]
  },

  /* ================================================================ CREATIVE
     Who Really Made It?

     Deliberately not "can you spot the AI". That game is already lost and it
     was never the useful question. The useful question is what you declare —
     which is what Content Credentials exist to carry. The reveal slide is a
     content credential, rendered. */
  {
    key: 'creative',
    principle: 'CREATIVE',
    title: 'Who really made it?',
    slides: [
      teacherPage({
        ages: '9–18',
        purpose: 'Students decide what makes work theirs, and practise saying plainly what they used.',
        notes: 'PURPOSE. Students move from "can you spot AI?" to "what did you declare?" — the first is already unanswerable, the second is entirely in their control.\\n\\nLIKELY RESPONSES. The most genuinely split vote in the campaign. "Depends what you do next" is the sophisticated answer; ask whoever picks it what "next" involves.\\n\\nCONNECT TO YOUR OWN POLICY. This is your school’s academic-integrity rules in student language. If you have a written AI policy, name it here — the slide sets up the habit, your policy sets the line.\\n\\nSEND / YOUNGER LEARNERS. Use a drawing rather than a song. "Who made it?" is easier when the thing is visible and one object.\\n\\nEXTENSION. Write the declaration line for the last piece of work you handed in. Would you have been comfortable attaching it?\\n\\nSOURCE. Content Credentials (C2PA) — provenance travelling with the file.'
      }),
      {
        type: 'title',
        title: 'Who really made it?',
        subtitle: 'Five Minutes to Think',
        notes:
          'SLIDE 1 · TITLE. Up as the class comes in. The question does the work; ' +
          'do not explain it yet.\n\n' +
          'The full teacher page is the hidden slide before this one — purpose, ' +
          'timing, script, safeguarding, SEND and an extension.'
      },
      {
        type: 'quote',
        body: 'I typed one sentence. It wrote the song, made the cover and mixed it.',
        subtitle: 'The scenario · 30 seconds',
        notes:
          'BEAT 1 · 30 SECONDS.\n\n' +
          'Keep it neutral. The work in this scenario might be good — that is ' +
          'what makes the question hard. If you imply it is rubbish, there is ' +
          'nothing left to discuss.'
      },
      {
        type: 'cards',
        title: 'Make your choice: who made it?',
        bullets: [
          card('You did', 'It was your idea. Nobody else would have asked for that.'),
          card('Partly you', 'You started it. Something else finished it.'),
          card('The AI did', 'One sentence is not making something.'),
          card('Depends what you do next', 'It is not finished being made yet.')
        ],
        feedback: {
          kind: 'poll',
          prompt: 'Who made it?',
          options: ['You did', 'Partly you', 'The AI did', 'Depends what you do next'],
          max: 1,
          presentAs: 'rail'
        },
        notes:
          'BEAT 2 · 45 SECONDS. Vote first.\n\n' +
          'This is the most genuinely split vote in the whole campaign. Take it ' +
          'properly and show the spread.\n\n' +
          'Ask someone who chose the fourth option to say what "next" would have ' +
          'to involve. They usually arrive at the answer on their own.'
      },
      {
        type: 'statement',
        body: 'What would you have to add before you would put your name on it?',
        subtitle: 'Discuss in pairs · 90 seconds',
        notes:
          'BEAT 3 · 90 SECONDS.\n\n' +
          'Better than "is it yours", because it cannot be answered yes or no. ' +
          'It forces them to name a contribution.\n\n' +
          'Listen for "changing a few words". Ask whether they would accept that ' +
          'from someone else claiming to have written their favourite song.'
      },
      {
        type: 'sourcecheck',
        title: '"My track. Out now."',
        subtitle: 'The same claim, with its working shown',
        bullets: [
          info('The idea', 'Yours', 'one sentence — but nobody else wrote that sentence'),
          info('The words', 'Generated', 'you kept them as they came'),
          info('The music', 'Generated', 'from a style you chose'),
          info('The cover', 'Generated', 'you picked it from four'),
          info('What changed after', 'Nothing yet', 'this is the row that decides the answer'),
          info('Declared', 'Nowhere', 'the post does not say any of the above')
        ],
        progressive: true,
        body: 'Modelled on Content Credentials (C2PA) — provenance attached to the file, not guessed from it',
        notes:
          'BEAT 4 · 90 SECONDS. Reveal one row at a time.\n\n' +
          'This is a content credential, rendered as a slide. The real ones ride ' +
          'inside the file and say what tool touched it and when — provenance ' +
          'attached, rather than guessed at afterwards.\n\n' +
          'THE SHIFT TO MAKE: the interesting question is not "can you tell?" ' +
          'That game is already lost. It is "what did you declare?" — which you ' +
          'control completely.\n\n' +
          'Row 5 is where authorship actually lives. Row 6 is the one that gets ' +
          'people into trouble, at school and later at work.'
      },
      {
        type: 'journey',
        title: 'What to remember',
        subtitle: 'Three things, in the order you would use them',
        bullets: [
          card('Say what you used', 'Before anyone has to ask you.'),
          card('Add what only you could add', 'Your judgement, your experience, your choices.'),
          card('Be able to explain every choice', 'If you cannot, it is not finished being made.')
        ],
        progressive: true,
        notes:
          'SLIDE 6 · 45 SECONDS. Reveal one at a time. Three is the limit — a ' +
          'fourth rule is a rule nobody remembers.\n\n' +
          'Numbered rather than bulleted so the order is part of the message, and so ' +
          'nothing here depends on colour to be understood.'
      },
      {
        type: 'keyfact',
        subtitle: 'Your choice · 45 seconds',
        title: 'Decide what you would declare',
        body: 'Write the one line you would put underneath it, honestly describing what you did and what the tool did.',
        notes:
          'BEAT 5 · 45 SECONDS. One line, in their heads or on paper.\n\n' +
          'The test that survives contact with the real world: would you be ' +
          'comfortable if the person marking it, or hiring you, could see ' +
          'exactly how it was made?\n\n' +
          'Not an anti-AI message. A disclosure habit is what lets you use these ' +
          'tools without the question hanging over everything you make.'
      },
      vocab(
        kw('Provenance', 'The record of where something came from and what happened to it along the way.'),
        kw('Disclosure', 'Saying plainly what you used and what you did — before anyone has to ask.')
      )
    ]
  },

  /* ============================================================= RESPONSIBLE
     Should AI Decide?

     The one starter where a UK regulator has already answered, in public, in
     quotable words. Ofqual is doing the heavy lifting here and the slide gets
     out of its way. */
  {
    key: 'responsible',
    principle: 'RESPONSIBLE',
    title: 'Should AI decide?',
    slides: [
      teacherPage({
        ages: '11–18',
        purpose: 'Students separate decisions AI can support from decisions that must involve a person.',
        notes: 'PURPOSE. Students arrive at a principle rather than a list: the greater the effect on someone’s life, the greater the need for human oversight.\\n\\nTHE REGULATOR HAS ALREADY ANSWERED, and the words are quotable. Ofqual: AI is "nowhere near ready to take over high stakes marking"; using it as the sole mechanism for awarding marks "does not comply with our current regulations" because it fails the requirement for "a human based judgement". Its three tests: technical capability, fairness, transparency.\\n\\nLIKELY RESPONSES. Marking is the one students hand over most readily — it feels objective. That is the assumption slide 5 takes apart.\\n\\nMISCONCEPTION TO BREAK. Automated does not mean neutral. A system that cannot explain itself is not impartial, it is unexaminable.\\n\\nSEND / YOUNGER LEARNERS. Use two decisions rather than four: marking a test, and choosing who gets picked for a team.\\n\\nEXTENSION. Rank the four decisions by how much a mistake would cost the person. Does the order match your vote?\\n\\nSOURCE. Ofqual, "Using AI in marking", 14 January 2026.'
      }),
      {
        type: 'title',
        title: 'Should AI decide?',
        subtitle: 'Five Minutes to Think',
        notes:
          'SLIDE 1 · TITLE. Up as the class comes in. The question does the work; ' +
          'do not explain it yet.\n\n' +
          'The full teacher page is the hidden slide before this one — purpose, ' +
          'timing, script, safeguarding, SEND and an extension.'
      },
      {
        type: 'quote',
        body: 'Your exam was marked by an AI. Your appeal was read by the same one.',
        subtitle: 'The scenario · 30 seconds',
        notes:
          'BEAT 1 · 30 SECONDS.\n\n' +
          'The second sentence is what makes it land. One decision with no ' +
          'second opinion is a different thing from one decision.'
      },
      {
        type: 'cards',
        title: 'Make your choice: which of these could AI decide on its own?',
        bullets: [
          card('Choosing who gets a job', 'From hundreds of applications.'),
          card('Marking an exam', 'Against a published mark scheme.'),
          card('Recommending a treatment', 'Based on your symptoms and history.'),
          card('Excluding a student', 'On the evidence in the file.')
        ],
        feedback: {
          kind: 'poll',
          prompt: 'Which could AI decide alone?',
          options: ['None of them', 'Marking only',
                    'Marking and shortlisting', 'Any of them, with a human check'],
          max: 1,
          presentAs: 'rail'
        },
        notes:
          'BEAT 2 · 45 SECONDS. Vote before anything is explained.\n\n' +
          'The four cards are the decisions; the four poll options are the ' +
          'positions. Read the cards, then take the vote.\n\n' +
          'Marking is the one rooms hand over most readily — it feels objective. ' +
          'That is exactly the assumption beat 4 takes apart, with the ' +
          'regulator’s own words.'
      },
      {
        type: 'statement',
        body: 'What makes a decision too important for a machine to make on its own?',
        subtitle: 'Discuss in pairs · 90 seconds',
        notes:
          'BEAT 3 · 90 SECONDS.\n\n' +
          'You are steering towards a principle, not a list: the greater the ' +
          'effect on someone’s life, the greater the need for human oversight.\n\n' +
          'If they say "when it might be wrong" — push. Humans are wrong too. ' +
          'What is different is whether anyone can explain the decision ' +
          'afterwards, and whether anyone is accountable for it.'
      },
      {
        type: 'spectrum',
        title: 'Support, or decide?',
        subtitle: 'AI can support this | This must stay human',
        bullets: [
          info('Checking marking for inconsistency', '12', 'Ofqual calls this promising'),
          info('Training new examiners', '20', ''),
          info('Flagging an answer for a person to look at', '34', ''),
          info('Awarding the final mark', '84', 'does not meet the rules on its own'),
          info('Excluding a student', '96', 'no regulator anywhere permits this')
        ],
        body: 'Ofqual, "Using AI in marking", 14 January 2026 — positions read from its stated direction',
        notes:
          'BEAT 4 · 90 SECONDS. Ask the room to move one before you defend any.\n\n' +
          'OFQUAL’S OWN WORDS, worth reading out — they are stronger than any ' +
          'paraphrase:\n' +
          '· AI is "nowhere near ready to take over high stakes marking".\n' +
          '· Using it as the sole mechanism for awarding marks "does not comply ' +
          'with our current regulations" because it fails the requirement for ' +
          '"a human based judgement".\n\n' +
          'The three things Ofqual says matter: technical capability (AI lacks ' +
          '"true semantic understanding"), fairness (it "can perpetuate or ' +
          'amplify biases present in their training data"), and transparency ' +
          '(a "black box", hard even for experts to explain).\n\n' +
          'THE MISCONCEPTION TO BREAK: automated does not mean objective. A ' +
          'machine that cannot explain itself is not neutral, it is unexaminable.'
      },
      {
        type: 'journey',
        title: 'What to remember',
        subtitle: 'Three things, in the order you would use them',
        bullets: [
          card('Bigger effect, more human', 'The more a decision changes a life, the more a person must make it.'),
          card('Automated is not fair', 'A system can be consistent and still be biased.'),
          card('Ask who you appeal to', 'If nobody can explain the decision, nobody can review it.')
        ],
        progressive: true,
        notes:
          'SLIDE 6 · 45 SECONDS. Reveal one at a time. Three is the limit — a ' +
          'fourth rule is a rule nobody remembers.\n\n' +
          'Numbered rather than bulleted so the order is part of the message, and so ' +
          'nothing here depends on colour to be understood.'
      },
      {
        type: 'keyfact',
        subtitle: 'Your choice · 45 seconds',
        title: 'The bigger the effect on a life, the more human the decision',
        body: 'Decide one decision about you that you would always want a person to make, and be able to explain.',
        notes:
          'BEAT 5 · 45 SECONDS.\n\n' +
          '"And be able to explain" is the part to stress. The right to an ' +
          'explanation is the thing being protected, not a preference for humans.\n\n' +
          'Worth saying: this is a live question in UK policy right now, not a ' +
          'settled one. They will be adults while it is being decided.'
      },
      vocab(
        kw('Human oversight', 'A person who can see how a decision was made, question it, and overrule it.'),
        kw('Black box', 'A system whose workings cannot be inspected — you see what went in and what came out, and nothing between.')
      )
    ]
  },

  /* =================================================================== FUTURE
     What Skills Must Stay Human?

     Explicitly not an anti-AI message. The whole point is the distinction
     between AI strengthening your thinking and AI replacing it, which is the
     EEF's plan / monitor / evaluate applied to a tool that will do all three
     for you if you let it. */
  {
    key: 'future',
    principle: 'FUTURE',
    title: 'What skills must stay human?',
    slides: [
      teacherPage({
        ages: '11–18',
        purpose: 'Students notice the difference between AI strengthening their thinking and AI replacing it.',
        notes: 'PURPOSE. Students identify one capability they will keep developing themselves. Explicitly NOT an anti-AI session — every good example on slide 5 involves using AI.\\n\\nTHE FRAME. EEF on metacognition: plan, monitor, evaluate. A tool that does all three for you has not helped you learn, however good the output was.\\n\\nLIKELY RESPONSES. Take "nothing — I would be fine" seriously. For some students it is true, and treating it as denial teaches them not to answer honestly.\\n\\nTONE. Slide 4 is the sharpest question in the campaign and needs a safe room. Pairs, not whole-class. You are not fishing for confessions.\\n\\nSEND / YOUNGER LEARNERS. Reframe as "what could you still do if the internet was off for a week?" Concrete and less self-critical.\\n\\nEXTENSION. For one week, write one sentence after each AI use: did that strengthen my thinking or replace it?\\n\\nSOURCE. Education Endowment Foundation, metacognition and self-regulation.'
      }),
      {
        type: 'title',
        title: 'What skills must stay human?',
        subtitle: 'Five Minutes to Think',
        notes:
          'SLIDE 1 · TITLE. Up as the class comes in. The question does the work; ' +
          'do not explain it yet.\n\n' +
          'The full teacher page is the hidden slide before this one — purpose, ' +
          'timing, script, safeguarding, SEND and an extension.'
      },
      {
        type: 'quote',
        body: 'Tomorrow the tool you use most is switched off. The work is still due.',
        subtitle: 'The scenario · 30 seconds',
        notes:
          'BEAT 1 · 30 SECONDS.\n\n' +
          'Not a threat and not a prediction. A thought experiment that makes ' +
          'the dependency visible, which is the only way to measure it.'
      },
      {
        type: 'cards',
        title: 'Make your choice: what would you struggle with most?',
        bullets: [
          card('Starting from nothing', 'The blank page.'),
          card('Explaining my reasoning', 'Saying why, not just what.'),
          card('Checking whether it is true', 'Without something to check it for you.'),
          card('Nothing — I would be fine', 'It only ever saved you time.')
        ],
        feedback: {
          kind: 'poll',
          prompt: 'What would you struggle with most?',
          options: ['Starting from nothing', 'Explaining my reasoning',
                    'Checking whether it is true', 'Nothing — I would be fine'],
          max: 1,
          presentAs: 'rail'
        },
        notes:
          'BEAT 2 · 45 SECONDS. Vote first, and make it anonymous in feel — this ' +
          'is the one question in the campaign where students are reporting on ' +
          'themselves.\n\n' +
          'Take the fourth option seriously. For some of them it is true, and ' +
          'treating it as denial teaches them not to answer honestly.'
      },
      {
        type: 'statement',
        body: 'Which part of your thinking have you quietly stopped practising?',
        subtitle: 'Discuss in pairs · 90 seconds',
        notes:
          'BEAT 3 · 90 SECONDS. The sharpest question in the campaign, and the ' +
          'one that needs the safest room. Pairs, not the whole class.\n\n' +
          'You are not fishing for confessions. You are making the difference ' +
          'between using a tool and outsourcing a skill something they can feel.'
      },
      {
        type: 'compare',
        title: 'Strengthening, or replacing?',
        subtitle: 'It is strengthening your thinking | It is replacing your thinking',
        bullets: [
          versus('You draft, then ask it to argue back', 'It drafts, you paste'),
          versus('You decide, it checks your reasoning', 'It decides, you accept'),
          versus('It gives you options, you choose', 'It gives you one answer, you take it'),
          versus('You could explain every choice', 'You could not explain any of it'),
          versus('You got better at it', 'You got faster at avoiding it')
        ],
        progressive: true,
        body: 'Frame after the EEF on metacognition — plan, monitor, evaluate your own learning',
        notes:
          'BEAT 4 · 90 SECONDS. Reveal a row at a time.\n\n' +
          'NOT AN ANTI-AI SLIDE, and it will be misread as one if you let it. ' +
          'Every left-hand row involves using AI. The difference is where the ' +
          'thinking happened.\n\n' +
          'Row 4 is the usable test, because it works during the task rather ' +
          'than afterwards: could you explain this choice to someone who asked?\n\n' +
          'The EEF frame, if you want it: plan, monitor, evaluate. A tool that ' +
          'does all three for you has not helped you learn, however good the ' +
          'output was.'
      },
      {
        type: 'journey',
        title: 'What to remember',
        subtitle: 'Three things, in the order you would use them',
        bullets: [
          card('Notice who is thinking', 'If you could not explain it, it was not you.'),
          card('Keep practising what you would miss', 'Pick the skill, not the task.'),
          card('Use it to argue back', 'Ask it to challenge your work, not to produce it.')
        ],
        progressive: true,
        notes:
          'SLIDE 6 · 45 SECONDS. Reveal one at a time. Three is the limit — a ' +
          'fourth rule is a rule nobody remembers.\n\n' +
          'Numbered rather than bulleted so the order is part of the message, and so ' +
          'nothing here depends on colour to be understood.'
      },
      {
        type: 'keyfact',
        subtitle: 'Your choice · 45 seconds',
        title: 'Pick one thing you will keep doing yourself',
        body: 'Choose one part of your thinking you will keep practising, even when something could do it faster.',
        notes:
          'BEAT 5 · 45 SECONDS.\n\n' +
          'Ask for one, not a list. A list is a wish; one is a decision.\n\n' +
          'Close the campaign on the line it is built around: AI can answer, ' +
          'create, recommend and increasingly act for you. Your job is deciding ' +
          'when to use it, when to question it, and when to keep humans in ' +
          'control.'
      },
      vocab(
        kw('Metacognition', 'Thinking about your own thinking — planning how you will work, noticing how it is going, and judging how it went.'),
        kw('Cognitive offloading', 'Handing a mental job to something else. Useful for a shopping list. Costly for a skill you still need.')
      )
    ]
  }
];

module.exports = { STARTERS_27 };
