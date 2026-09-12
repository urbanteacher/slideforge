/* SlideForge race tracks.
   The track is state that outlives a question, which is why it belongs here
   rather than in the question. It used to live only inside js/live.js, so a
   race that was not being hosted drew its teams at the starting gate and left
   them there for the whole game — every lane 0/5, however the room answered.
   Live still owns the phone-scored race; this owns the one the teacher runs. */
(function (global) {
  'use strict';
  /** @type {import("../src/types.js").SlideForgeGlobal} */
  var SF = global.SF = global.SF || {};

  function clampLength(n) {
    return Math.max(3, Math.min(12, Number(n) || 5));
  }

  /**
   * A fresh track.
   * @param {Array} field  [{ key, name, color }]
   * @param {number} length steps to the finish
   */
  function create(field, length) {
    return { pos: {}, winners: [], moved: [], length: clampLength(length),
      field: (field || []).map(function (l) {
        return { key: l.key, name: l.name, color: l.color };
      }) };
  }

  /**
   * Move one lane a step.
   *
   * Capped at the finish and recorded once: a lane that is home stays home,
   * and pressing it again neither moves it past the post nor names it a winner
   * twice.
   */
  function advance(state, key) {
    var s = Object.assign({}, state, {
      pos: Object.assign({}, state.pos),
      winners: state.winners.slice(),
      moved: []
    });
    if (!s.field.some(function (l) { return l.key === key; })) return state;
    var at = s.pos[key] || 0;
    if (at >= s.length) return s;            // already home
    s.pos[key] = at + 1;
    s.moved = [key];
    if (s.pos[key] >= s.length && s.winners.indexOf(key) === -1) s.winners.push(key);
    return s;
  }

  /** Put a lane back a step — for a verdict given by mistake. */
  function back(state, key) {
    var s = Object.assign({}, state, {
      pos: Object.assign({}, state.pos),
      winners: state.winners.filter(function (k) { return k !== key; }),
      moved: []
    });
    s.pos[key] = Math.max(0, (s.pos[key] || 0) - 1);
    return s;
  }

  function reset(state) {
    return create(state.field, state.length);
  }

  /** The field as the renderer wants it, in the order the race stands. */
  function standings(state) {
    return state.field.map(function (l) {
      return { key: l.key, name: l.name, color: l.color,
        pos: state.pos[l.key] || 0,
        moved: state.moved.indexOf(l.key) > -1,
        won: state.winners.indexOf(l.key) > -1 };
    });
  }

  function finished(state) {
    return state.winners.length > 0;
  }

  function winner(state) {
    if (!state.winners.length) return '';
    var names = state.winners.map(function (k) {
      var lane = state.field.filter(function (l) { return l.key === k; })[0];
      return lane ? lane.name : k;
    });
    return names.length === 1
      ? names[0] + ' is home.'
      : 'A dead heat: ' + names.join(' & ');
  }

  /* ---- the track for one run of one deck ---------------------------------
     Held per deck id, so leaving the race and coming back to it later in the
     lesson finds the field where it was left. A new presentation clears it. */
  var tracks = {};

  function forDeck(deck, field) {
    if (!deck || !field || !field.length) return null;
    var key = deck.id || 'deck';
    var track = tracks[key];
    var sameField = track && track.field.length === field.length &&
      track.field.every(function (l, i) { return l.key === field[i].key; });
    if (!sameField || track.length !== clampLength(deck.trackLength)) {
      track = tracks[key] = create(field, deck.trackLength);
    }
    return track;
  }

  function command(deck, action, key) {
    var track = deck && tracks[deck.id || 'deck'];
    if (!track) return null;
    if (action === 'advance') track = advance(track, key);
    else if (action === 'back') track = back(track, key);
    else if (action === 'reset') track = reset(track);
    tracks[deck.id || 'deck'] = track;
    return track;
  }

  function clear() { tracks = {}; }

  SF.Race = { create: create, advance: advance, back: back, reset: reset,
    standings: standings, finished: finished, winner: winner,
    forDeck: forDeck, command: command, clear: clear };
})(typeof window !== 'undefined' ? window : globalThis);
