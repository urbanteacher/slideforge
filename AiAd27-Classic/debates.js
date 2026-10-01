'use strict';
/* The debate for each lesson, one per National Conversation age pathway.
 *
 * The same text as the lesson page's "Set up the debate" section on the
 * website, which is written from here: export.mjs puts it in
 * wp-instructions.json as each lesson's debate pack. starters.js draws three
 * slides from it in every deck — the Secondary motion with a vote, its points
 * for and against, and all three ages' motions side by side.
 *
 * Where a motion came from the debate network's motion bank (AIADN_Motions in
 * the website's aiad-debate-network plugin) it is written out here in full,
 * so the slides do not depend on the plugin.
 *
 * Keyed by the lesson's slug in starters.js.
 */

const DEBATES = {
  safe: {
    primary: {
      motion: 'Should apps have to put a label on pictures and videos made by AI?',
      prompt: "Sentence starter: I think they should / shouldn't because ___.",
      for: ['It would help us tell what is real and what is made up.', 'People would be less likely to be tricked.', 'It is fair to know how something was made.'],
      against: ['People who want to trick others could remove the label.', 'Some AI pictures are just for fun and do no harm.', 'We should learn to check things ourselves anyway.']
    },
    secondary: {
      motion: 'Making a deepfake of someone without their permission should be against the law, even as a joke.',
      prompt: 'Challenge card: What if the deepfake was of a famous politician and made a serious point?',
      for: ['A joke deepfake can still humiliate someone and spread far beyond the people it was meant for.', 'Once shared, it is almost impossible to delete, and the harm can last.', "A clear law would show that a person's face and voice belong to them."],
      against: ['Satire of public figures is an important part of free speech.', 'The most harmful uses, such as intimate images and fraud, are already crimes.', 'Education and fast reporting tools may protect people better than a law that is hard to enforce.']
    },
    post16: {
      motion: 'This house would make social media platforms legally responsible for deepfakes shared on their sites.',
      prompt: 'The tension: free expression vs protection. Research: what does the Online Safety Act require platforms to do about illegal content?',
      for: ['Platforms profit from content spreading, so they should carry responsibility for the harm it causes.', 'Only platforms can act at the speed and scale needed to stop a deepfake spreading.', 'Legal duties give victims a route to justice that individual reporting does not.'],
      against: ['Detection is imperfect, so platforms would over-remove legitimate content, including satire.', 'Responsibility should rest with the person who makes and shares a deepfake.', 'Heavy liability favours big companies that can afford moderation and squeezes out smaller platforms.']
    }
  },

  smart: {
    primary: {
      motion: 'Would you trust an AI helper more than a book?',
      prompt: 'Sentence starter: I would trust ___ more because ___.',
      for: ['AI answers quickly, and you can ask it anything.', 'It can explain things in a way that suits you.', 'Books can be old and out of date.'],
      against: ['AI can make up answers that sound true.', 'Books are checked by people before they are printed.', 'AI does not really understand what it is saying.']
    },
    secondary: {
      motion: 'It does not matter whether AI understands, as long as its answers are useful.',
      prompt: "Challenge card: What if someone followed an AI's health advice and it was wrong?",
      for: ['We use calculators and maps without them understanding anything.', 'What matters is whether an answer is correct, and we can check that.', 'AI already helps people learn, write and solve problems every day.'],
      against: ['Without understanding, AI cannot tell when its own answer is false.', 'Hallucinations in health, legal or safety advice can cause real harm.', 'People trust AI more when they think it understands, so the difference changes how we use it.']
    },
    post16: {
      motion: 'This house would ban AI chatbots from giving medical or legal advice.',
      prompt: 'The tension: access vs accuracy. Research: what do UK health and legal regulators say about AI tools giving advice to the public?',
      for: ['Pattern prediction is not professional judgement, and confident errors here can do serious harm.', 'Doctors and lawyers are accountable and regulated; a chatbot is neither.', 'Vulnerable people are the most likely to rely on free advice without checking it.'],
      against: ['Many people cannot afford or quickly reach a doctor or lawyer, and general information helps them.', 'A ban would push people towards worse sources, such as anonymous forums.', 'Clear signposting and safety rules would reduce harm without removing a useful service.']
    }
  },

  creative: {
    primary: {
      motion: 'If AI helps you make a picture, is it still your picture?',
      prompt: "Sentence starter: I think it is / isn't still mine because ___.",
      for: ['You had the idea and told the AI what to make.', 'You chose which picture to keep and what to change.', 'Artists have always used tools, like paintbrushes and cameras.'],
      against: ['The AI did the drawing, not you.', "The AI learned from other people's pictures.", 'If you only typed a few words, you did not do much of the work.']
    },
    secondary: {
      motion: 'Using AI makes people more creative, not less.',
      prompt: 'Challenge card: What if AI made it so easy that nobody bothered to learn to draw, write or play an instrument?',
      for: ['AI can get you past a blank page and spark ideas you would not have had.', 'People without expensive training or equipment can now make music, films and art.', 'The best results come from human ideas plus AI help, with the human still in charge.'],
      against: ['AI recombines existing patterns, so its suggestions push everyone towards similar work.', 'Skills such as drawing and writing come from practice that AI lets people skip.', 'When AI does the hard part, it is harder to put your own voice and experience into the work.']
    },
    post16: {
      motion: 'This house believes AI-generated work should not be eligible for creative prizes.',
      prompt: 'The tension: tool vs author. Research: how is the UK debating copyright and AI training?',
      for: ['Prizes reward human skill, effort and vision, and a prompt is not the same achievement.', "AI models are trained on artists' work, often without permission or payment.", 'If AI work can win, human artists lose the opportunities that build careers.'],
      against: ['Every new tool, from photography to digital art, was once called cheating.', 'Where a person directs, selects and edits, the creative choices are still theirs.', 'A ban is unworkable, because almost all digital work now involves some AI assistance.']
    }
  },

  responsible: {
    primary: {
      motion: 'Should we use AI less to help look after the planet?',
      prompt: "Sentence starter: I think we should / shouldn't use AI less because ___.",
      for: ['AI uses electricity and water every time we use it.', 'Small changes by lots of people can add up.', 'We can still do many things without AI, like thinking for ourselves.'],
      against: ['AI can help the planet too, like spotting leaks or saving energy.', 'The big companies use the most, so they should change first.', 'AI helps people learn and do useful things.']
    },
    secondary: {
      motion: "Tech companies, not users, should be responsible for cutting AI's environmental impact.",
      prompt: 'Challenge card: What if companies only change when their customers demand it?',
      for: ['Companies design the models and run the data centres, so they control most of the impact.', 'Users cannot see how much energy or water a request uses, so they cannot make informed choices.', 'Companies have the money and expertise to switch to renewable energy and better cooling.'],
      against: ["Companies respond to demand, so users' choices shape what they build.", 'Governments set the rules on energy and water, so responsibility is shared.', 'Every user can choose when AI is really needed.']
    },
    post16: {
      motion: 'This house believes the benefits of AI are worth its environmental cost.',
      prompt: 'The tension: progress vs sustainability. Research: how is AI being used to cut emissions in energy, transport or farming?',
      for: ['AI is helping to design better batteries, manage power grids and model the climate.', 'Efficiency improves quickly: newer models and chips do more with less energy.', 'The cost is real but small compared with sectors such as transport and heating.'],
      against: ['Data centre demand for energy and water is growing fast and competing with local communities.', 'Much AI use is trivial, so the cost is not being spent on climate solutions.', 'Without transparent reporting, claims that the benefits outweigh the costs cannot be checked.']
    }
  },

  future: {
    primary: {
      motion: "Should AI and robots do the boring jobs so people don't have to?",
      prompt: "Sentence starter: I think they should / shouldn't because ___.",
      for: ['People would have more time for fun, creative and caring jobs.', 'Robots do not get tired or bored.', 'Some boring jobs are also dangerous, so it would keep people safe.'],
      against: ['Some people like those jobs and need them to earn money.', 'A job that seems boring to you might matter a lot to someone else.', 'If AI does everything, people might forget how to do important things.']
    },
    secondary: {
      motion: 'AI will create more good jobs than it takes away.',
      prompt: 'Challenge card: What if the new jobs need skills that the people who lost their jobs do not have?',
      for: ['The World Economic Forum expects about 170 million new roles by 2030, against 92 million displaced.', 'Most jobs will be transformed rather than disappear, with AI taking over routine tasks.', 'New careers are already appearing, from AI ethics to data science.'],
      against: ['New jobs may appear in different places from the jobs that are lost.', 'Not every new role is a good one; some will be low-paid work checking AI output.', 'The speed of change could leave many people behind before they can retrain.']
    },
    post16: {
      motion: 'This house believes schools should prioritise human skills over technical AI skills.',
      prompt: 'The tension: employability vs adaptability. Research: which skills do employers say they will need most by 2030?',
      for: ['Empathy, judgement and creativity are the skills AI cannot replicate, so they keep their value.', 'Technical tools change every year, but human skills last a whole career.', 'Employers consistently rank skills such as communication and problem-solving among the most important.'],
      against: ['Without technical AI literacy, young people cannot shape or question the tools they use.', 'Many of the best-paid new roles need data and AI skills, and school is where access is fairest.', 'It is a false choice: working well alongside AI is itself a human skill.']
    }
  },

  assembly: {
    primary: {
      motion: 'Should you check everything AI tells you?',
      prompt: "Sentence starter: I think you should / don't need to check because ___.",
      for: ['AI can make things up and still sound very sure.', 'Checking with a book or a trusted adult helps you find the truth.', 'If you share something wrong, other people might believe it too.'],
      against: ['Checking everything would take a very long time.', 'For fun things, like a silly story, it does not matter if it is wrong.', 'AI gets lots of simple things right.']
    },
    secondary: {
      motion: 'AI chatbots should have to warn you every time an answer might be made up.',
      prompt: 'Challenge card: What if the warnings appeared so often that everyone started ignoring them?',
      for: ['Hallucinations happen regularly, and fluent answers make them hard to spot.', 'A warning reminds people to verify before they trust or share.', 'Companies already warn about other risks, such as age limits and gambling.'],
      against: ['The system often cannot tell when it is wrong, so the warnings would be guesses too.', 'Constant warnings cause warning fatigue, and people stop reading them.', 'Learning to verify is a skill we need anyway, warning or not.']
    },
    post16: {
      motion: 'This house would require AI tools in schools to guide students rather than give answers.',
      prompt: 'The tension: efficiency vs learning. Research: what does the evidence say about AI tutoring and learning outcomes?',
      for: ['Learning comes from working things out; ready-made answers skip the thinking that builds understanding.', 'Guiding tools reduce the risk of students copying a confident hallucination into their work.', 'Schools have a duty to teach verification, and answer machines undermine it.'],
      against: ['Students will use answer tools at home anyway, so schools should teach them to use them well.', 'Sometimes a clear worked answer is the fastest way to learn, as with a model essay.', 'A rule for every tool is hard to enforce and may hold back students who use AI responsibly.']
    }
  }
};

/* The website's debate pack: flat fields, one point per line. */
function debatePack(debate) {
  const pack = {};
  ['primary', 'secondary', 'post16'].forEach((age) => {
    const d = debate[age];
    pack[age + '_motion'] = d.motion;
    pack[age + '_prompt'] = d.prompt;
    pack[age + '_for'] = d.for.join('\n');
    pack[age + '_against'] = d.against.join('\n');
  });
  return pack;
}

module.exports = { DEBATES, debatePack };
