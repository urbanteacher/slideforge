/* Each style names how it works in four kinds of room. Shared profiles keep
   the reasons consistent while the declaration stays with the style. */
const support = (status, reason) => Object.freeze({ status, reason });

const ROOM_PLAY = Object.freeze({
  quiz: Object.freeze({
    phones: support('yes', 'Each learner answers on their phone.'),
    teams: support('yes', 'Phone answers feed the chosen team.'),
    entry: support('yes', 'The teacher records a choice for each learner.'),
    solo: support('yes', 'The wall accepts the learner’s choice.')
  }),
  typed: Object.freeze({
    phones: support('yes', 'Each learner types or places an answer on their phone.'),
    teams: support('yes', 'Answers feed the chosen team.'),
    entry: support('yes', 'The teacher records each answer by name.'),
    solo: support('partial', 'The wall’s non-choice controls need a solo rehearsal.')
  }),
  order: Object.freeze({
    phones: support('yes', 'Each learner orders the items on their phone.'),
    teams: support('yes', 'Orders feed the chosen team.'),
    entry: support('yes', 'The teacher enters each order as a key sequence.'),
    solo: support('partial', 'The wall’s order control needs a solo rehearsal.')
  }),
  spot: Object.freeze({
    phones: support('yes', 'Each learner taps a word in the passage.'),
    teams: support('yes', 'Finds feed the chosen team.'),
    entry: support('yes', 'The teacher taps the word the learner points at.'),
    solo: support('yes', 'The wall accepts a tap on the passage.')
  }),
  spoken: Object.freeze({
    phones: support('partial', 'Phones show a listen-and-watch job card.'),
    teams: support('yes', 'The teacher credits the selected speaker’s team.'),
    entry: support('yes', 'The teacher selects a recipient and marks the verdict.'),
    solo: support('no', 'A teacher and a room are needed for the spoken verdict.')
  }),
  board: Object.freeze({
    phones: support('no', 'This board is operated by the teacher; phones do not answer.'),
    teams: support('yes', 'The teacher runs the board for teams.'),
    entry: support('yes', 'The teacher operates the board without learner phones.'),
    solo: support('no', 'The board needs a teacher to run it.')
  }),
  paper: Object.freeze({
    phones: support('no', 'This is a paper quiz.'),
    teams: support('yes', 'Teams can discuss and submit paper answers.'),
    entry: support('yes', 'The teacher reveals and marks paper answers.'),
    solo: support('partial', 'A solo paper run still needs a checked workflow.')
  }),
  /* A vote with no right answer to be marked against: the room's split is
     the point (Odd One Out). */
  vote: Object.freeze({
    phones: support('yes', 'Each learner taps their pick; nobody is marked.'),
    teams: support('yes', 'Teams can vote together, then defend their pick.'),
    entry: support('yes', 'The teacher records each learner’s pick by key.'),
    solo: support('no', 'The format depends on discussion with others.')
  }),
  discussion: Object.freeze({
    phones: support('no', 'This discussion currently has no phone answer step.'),
    teams: support('yes', 'Teams can discuss before the reveal.'),
    entry: support('yes', 'The teacher runs the discussion and reveal.'),
    solo: support('no', 'The format depends on discussion with others.')
  })
});

export { ROOM_PLAY };
