/* SlideForge boss battles.
   The fight is state that outlives a question — HP does not belong to the
   question that dented it — so it lives here rather than in js/live.js, which
   is where it used to live and nowhere else. A battle played without phones
   had no boss at all: the slide drew a crest and a damage badge, every answer
   was right or wrong to nobody, and nothing could ever be defeated.

   The loop is the one the original game ran: read a question, let the clock
   run, reveal, then mark. A hit takes damage equal to the question's
   difficulty; a miss and a timeout both take none. */

/* Moved out of js/boss.js and into the boards engine — see the note in
 * src/boards/runtimes/bingo.js. Installed by src/model.js, not by a page.
 */
export function installBoss(SF) {

  /**
   * A fresh fight.
   * @param {Array} questions compiled boss slides, in order
   * @param {Array} participants team or player names
   * @param {number} seconds per-question clock
   */
  function create(questions, participants, seconds) {
    var qs = (questions || []).map(function (q, i) {
      return {
        id: q.id || ('q' + i),
        damage: Math.max(0, Number(q.bossDamage) || SF.bossDamage(q.difficulty) || 0),
        difficulty: q.difficulty || 'medium',
        /* A question with nothing to ask is still a square on the board — it
           is named as missing rather than quietly skipped. */
        ready: !!(String(q.question || '').trim() && (q.options || []).length)
      };
    });
    var max = Math.max(1, qs.reduce(function (n, q) { return n + q.damage; }, 0));
    return {
      phase: 'ready',
      questions: qs,
      participants: (participants || ['The class']).slice(),
      seconds: Math.max(0, Number(seconds) || 0),
      index: 0, hp: max, max: max,
      revealed: false, expired: false,
      hits: 0, misses: 0, timeouts: 0, marked: [],
      remaining: Math.max(0, Number(seconds) || 0),
      dealt: {}, log: []
    };
  }

  /** Whose turn it is — by question index, as the original did. */
  function turn(s) {
    if (!s.participants.length) return 0;
    return s.index % s.participants.length;
  }

  function current(s) {
    return s.questions[s.index] || null;
  }

  /** Already scored — revisiting must not invite another hit/miss. */
  function isMarked(s) {
    var q = current(s);
    return !!(q && (s.marked || []).indexOf(q.id) > -1);
  }

  /** What a hit on the question in play is worth. */
  function damageNow(s) {
    var q = current(s);
    return q ? q.damage : 0;
  }

  function copy(s) {
    return Object.assign({}, s, {
      marked: (s.marked || []).slice(),
      dealt: Object.assign({}, s.dealt),
      log: s.log.slice(),
      questions: s.questions.slice(),
      participants: s.participants.slice()
    });
  }

  /**
   * Close the question just marked.
   *
   * Deliberately does not move the cursor — the presentation does that, and
   * the fight follows it through focus(). A fight that counted its own way
   * through the questions drifted away from the slide on screen the first
   * time anyone pressed Hit.
   */
  function advance(s) {
    s.marked = (s.marked || []).concat([s.questions[s.index].id]);
    s.revealed = false;
    s.expired = false;
    s.remaining = s.seconds;
    if (s.hp <= 0) s.phase = 'complete';
    else if (s.marked.length >= s.questions.length) s.phase = 'complete';
    else s.phase = 'asking';
    return s;
  }

  function transition(state, action, arg) {
    var s = copy(state);
    if (action === 'restart') return create(state.questions.map(function (q) {
      return { id: q.id, bossDamage: q.damage, difficulty: q.difficulty,
        question: q.ready ? 'x' : '', options: q.ready ? [1] : [] };
    }), state.participants, state.seconds);

    if (action === 'start' && s.phase === 'ready') {
      s.phase = 'asking';
      s.remaining = s.seconds;
    } else if (isMarked(s) && (action === 'tick' || action === 'expire' ||
        action === 'reveal' || action === 'hit' || action === 'miss')) {
      /* Revisit: this id is already in marked — do not score again. */
      return s;
    } else if (action === 'tick' && s.phase === 'asking' && s.seconds > 0) {
      s.remaining = Math.max(0, s.remaining - Math.max(0, Number(arg) || 0));
      /* Out of time is a miss, but the room still sees the answer — the
         original marked it wrong and moved on without showing anything. */
      if (s.remaining <= 0) { s.phase = 'marking'; s.revealed = true; s.expired = true; }
    } else if (action === 'expire' && s.phase === 'asking') {
      s.remaining = 0; s.phase = 'marking'; s.revealed = true; s.expired = true;
    } else if (action === 'reveal' && s.phase === 'asking') {
      s.phase = 'marking'; s.revealed = true; s.expired = false;
    } else if (action === 'hit' && s.phase === 'marking' && !s.expired) {
      var who = s.participants[turn(s)] || 'The class';
      var dmg = damageNow(s);
      s.hp = Math.max(0, s.hp - dmg);
      s.hits++;
      s.dealt[who] = (s.dealt[who] || 0) + dmg;
      s.log.push({ index: s.index, who: who, damage: dmg, hit: true, expired: false });
      advance(s);
    } else if (action === 'miss' && s.phase === 'marking') {
      var missedBy = s.participants[turn(s)] || 'The class';
      s.misses++;
      if (s.expired) s.timeouts++;
      s.log.push({ index: s.index, who: missedBy, damage: 0, hit: false, expired: s.expired });
      advance(s);
    }
    return s;
  }

  function defeated(s) { return s.hp <= 0; }

  function verdict(s) {
    if (s.phase !== 'complete') return '';
    if (s.hp <= 0) return 'The boss is defeated.';
    return 'The boss survived on ' + s.hp + ' of ' + s.max + ' HP.';
  }

  /** Damage each participant landed, biggest first. */
  function standings(s) {
    return s.participants.map(function (name) {
      return { name: name, damage: s.dealt[name] || 0 };
    }).sort(function (a, b) { return b.damage - a.damage; });
  }

  /** Which of the three looks the boss wears — halves, not hard-coded HP. */
  function stage(s) {
    if (s.hp <= 0) return 'defeated';
    if (s.hp <= s.max * 0.34) return 'weak';
    if (s.hp <= s.max * 0.67) return 'hurt';
    return 'full';
  }

  /* ---- the fight for one run of one deck ------------------------------- */
  var fights = {};

  function forDeck(deck, questions, participants, seconds) {
    if (!deck) return null;
    var key = deck.presenterGameId || deck.id || 'deck';
    /* Asked without questions, this is "the fight already under way" — which
       is how everything that is not the renderer asks for it. Returning null
       there made reading the fight a different call from creating it, and the
       first thing to do that threw. */
    if (!questions || !questions.length) return fights[key] || null;
    var fight = fights[key];
    if (!fight || fight.questions.length !== questions.length) {
      fight = fights[key] = create(questions, participants, seconds);
    }
    return fight;
  }

  function command(deck, action, arg) {
    var key = deck && (deck.presenterGameId || deck.id || 'deck');
    if (!key || !fights[key]) return null;
    var before = fights[key];
    var after = transition(before, action, arg);
    fights[key] = after;
    /* A hit or a miss is a teacher's verdict on something said in the room,
       and it is the only record a battle leaves. Same rail as the boards. */
    if ((action === 'hit' || action === 'miss') && after.log.length > before.log.length &&
        SF.Boss.onVerdict) {
      var entry = after.log[after.log.length - 1];
      SF.Boss.onVerdict({
        slideId: (deck.presenterGameId || deck.id || 'deck') + ':boss',
        title: deck.title || 'Boss battle',
        kind: 'boss', set: 1, card: entry.index,
        term: 'Q' + (entry.index + 1) + ' · ' + before.questions[entry.index].difficulty +
          (entry.expired ? ' · out of time' : ''),
        participant: after.participants.length > 1 ? entry.who : null,
        right: entry.hit,
        value: entry.damage
      });
    }
    return after;
  }

  /**
   * Point the fight at the question actually on screen.
   *
   * The cursor used to be the fight's own, advanced by marking — so a hit
   * moved the fight to Q2 while the presentation stayed on Q1 and the room
   * read one question while the teacher marked another. The slide is the
   * truth; this follows it.
   *
   * @param {object} deck
   * @param {number} index  which quiz slide is showing, from zero
   */
  function focus(deck, index) {
    var key = deck && (deck.presenterGameId || deck.id || 'deck');
    var f = key && fights[key];
    if (!f || !Number.isInteger(index) || index === f.index) return f || null;
    if (index < 0 || index >= f.questions.length) return f;
    var q = f.questions[index];
    var done = !!(q && (f.marked || []).indexOf(q.id) > -1);
    fights[key] = Object.assign({}, f, {
      index: index,
      /* A different unmarked question is a fresh ask. A marked one stays
         read-only — reveal/hit/miss are ignored and the UI hides them. */
      revealed: done, expired: false, remaining: f.seconds,
      phase: f.phase === 'complete' ? 'complete' : 'asking'
    });
    return fights[key];
  }

  function clear() { fights = {}; }

  SF.Boss = { onVerdict: null, create: create, transition: transition, focus: focus,
    turn: turn, current: current, isMarked: isMarked, damageNow: damageNow,
    defeated: defeated, verdict: verdict, standings: standings, stage: stage,
    forDeck: forDeck, command: command, clear: clear };
}
