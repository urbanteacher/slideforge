/* SlideForge — activities/rooms. Edit source here; npm run build updates js/model.js. */

/* Which rooms each activity works in: thirty phones, groups at tables, a
   room with no devices, one learner alone. The game styles declare this
   (src/games/rooms.js); an activity's answer follows from its shape, so it
   is derived here rather than written 54 times, and a game activity
   borrows its engine's.

   It is honest about today. A prompt that collects from the phones cannot
   yet be recorded by the teacher for a room without them (activities audit
   §7, tally entry), so it says no, and the badge is missing until it can. */

import { stageJob, declaredJob, parseStageLabel } from "./stages.js";

/**
 * @typedef {import("../types.js").Activity} Activity
 * @typedef {import("../types.js").RoomSupport} RoomSupport
 */

const support = (status, reason) => Object.freeze({ status, reason });

const ACTIVITY_ROOMS = Object.freeze({
  /* A staged routine whose phones write, talk or work, and send nothing. */
  staged: Object.freeze({
    phones: support('yes', 'Each stage gives the phone a job, or tells it to go down.'),
    teams: support('yes', 'The routine is the grouping: pairs and groups work where they sit.'),
    entry: support('yes', 'The wall carries every stage; phones are an extra, not a need.'),
    solo: support('partial', 'The stages run in a solo present, without a partner to talk to.')
  }),
  /* A staged routine with an idea box: without phones the ideas are said. */
  stagedSend: Object.freeze({
    phones: support('yes', 'Each stage gives the phone a job; ideas arrive on the wall without names.'),
    teams: support('yes', 'The routine is the grouping; a group can send one idea from one phone.'),
    entry: support('partial', 'The stages run from the wall, but spoken ideas cannot be entered into the idea box.'),
    solo: support('partial', 'The stages run in a solo present; there is no room to share with.')
  }),
  /* A prompt on a slide: a poll, scale, word cloud or idea box. */
  collect: Object.freeze({
    phones: support('yes', 'Each learner answers on their phone.'),
    teams: support('partial', 'One phone per group works, but the count is per phone.'),
    entry: support('no', 'The teacher cannot yet record a poll, scale or idea for a room without phones.'),
    solo: support('no', 'It collects from a room.')
  }),
  /* A slide the teacher leads from: objectives, a brief, a task. */
  slide: Object.freeze({
    phones: support('partial', 'Phones show the slide, with a quiet Need help.'),
    teams: support('yes', 'Groups work from the wall.'),
    entry: support('yes', 'The teacher leads from the wall; no phones are needed.'),
    solo: support('yes', 'It reads as a slide.')
  }),
  /* A timed routine that stays a checklist: Do Now, Wait Time. */
  moment: Object.freeze({
    phones: support('partial', 'Phones show what is on the wall, with a quiet Need help.'),
    teams: support('yes', 'Groups work from the wall.'),
    entry: support('yes', 'The wall and its one clock carry it; no phones are needed.'),
    solo: support('partial', 'The clock runs in a solo present; the routine assumes a room.')
  })
});

/** The jobs an activity's rows would give its stages. @param {Activity} a */
function rowJobs(a) {
  return (a.fields || [])
    .filter((f) => /^bullets\.\d+\.def$/.test(f.slide || ''))
    .map((f) => declaredJob(f.label) || stageJob(parseStageLabel(f.label).name));
}

/**
 * How this activity works in each kind of room.
 * @param {Activity} a
 * @param {(style: string) => ({ plays?: RoomSupport } | null)} [styleOf] a game engine, by name
 * @returns {RoomSupport}
 */
function activityPlays(a, styleOf) {
  if (a.target === 'game') {
    const style = a.style && styleOf ? styleOf(a.style) : null;
    if (style && style.plays) return style.plays;
  }
  if (a.target === 'feedback') return ACTIVITY_ROOMS.collect;
  if (a.presentation === 'stages') {
    return rowJobs(a).includes('send') ? ACTIVITY_ROOMS.stagedSend : ACTIVITY_ROOMS.staged;
  }
  if (a.target === 'moment') return ACTIVITY_ROOMS.moment;
  return ACTIVITY_ROOMS.slide;
}

export { ACTIVITY_ROOMS, activityPlays };
