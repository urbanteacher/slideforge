// Plain True or false (format 'truefalse'; not the Showdown, format 'true-false'): two options, drawn as two tiles.
import { defineStyle } from './types';

export const truefalse = defineStyle({
  key: 'truefalse', name: 'True or false', formats: ['truefalse'], input: 'choice',
  wall: () => ({ kind: 'bars', pair: true }),
});
