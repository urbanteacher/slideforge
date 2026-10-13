// Rehearse (lab-engine-plan M11b): the lesson run against a simulated class that joins the real relay.
//   const cls = new SimulatedClass({ url: 'wss://…', pin, show, size: 16 }); cls.start(); …; cls.stop();
export { SimulatedClass, type ClassOptions } from './simulated';
export { NAMES, SIZES, answerDelay, answerFor, pickNames, profiles, replyFor, seeded, sureFor, type Answer, type Profile, type QuestionFrame, type Rng } from './model';
