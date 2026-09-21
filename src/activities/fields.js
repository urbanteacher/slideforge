/* An activity, written onto a slide.
 *
 * The catalogue says what an activity is and the presets say how one is set
 * up; this is the third part — the rule for putting one onto a slide and
 * reading it back off. It was the only band of js/activities.js that reached
 * nothing outside itself, sitting in a file where every other band is
 * authoring UI talking to the editor and the shell. See docs/engines.md.
 *
 * No DOM here, and nothing about panes or rails. A dotted path, an array that
 * grows to meet it, and the keyword line's two halves.
 */

/* A keywords bullet is one string holding a label and its text either side of
   a tab, so `bullets.0` alone would make a teacher type the tab. These two
   paths address the halves: `bullets.0.term` and `bullets.0.def`. */
const KEYWORD_HALF = /^(bullets\.\d+)\.(term|def)$/;

/**
 * @param {object} SF  for parseKeywordLine/formatKeywordLine, which are model
 *   functions this needs and does not own.
 */
export function createActivityFields(SF) {
  /** Read a dotted path off a slide: `title`, `bullets.0`, `bullets.0.def`. */
  function read(slide, path) {
    const half = String(path).match(KEYWORD_HALF);
    if (half) {
      const line = SF.parseKeywordLine(read(slide, half[1]) || '');
      return half[2] === 'term' ? line.term : line.def;
    }
    return String(path).split('.').reduce(function (at, key) {
      return at == null ? undefined : at[key];
    }, slide);
  }

  /** Write one, growing the array if the path points past its end — a layout
   *  with two pits has to accept a third question without losing it. */
  function write(slide, path, value) {
    const half = String(path).match(KEYWORD_HALF);
    if (half) {
      const line = SF.parseKeywordLine(read(slide, half[1]) || '');
      write(slide, half[1], half[2] === 'term'
        ? SF.formatKeywordLine(value, line.def)
        : SF.formatKeywordLine(line.term, value));
      return;
    }
    const parts = String(path).split('.');
    /* `pop` on a non-empty split is always a string, but only the typechecker
       has to be told — this file is checked now that it lives in src/, which
       is how a latent undefined index came to light after years in a script
       that was not. */
    const last = parts.pop();
    if (last === undefined) return;
    const at = parts.reduce(function (node, key) { return node[key]; }, slide);
    if (Array.isArray(at)) {
      const i = Number(last);
      while (at.length <= i) at.push('');
      at[i] = value;
    } else {
      at[last] = value;
    }
  }

  /** The field defaults, written onto a slide as it is created. A worked
   *  example to overwrite beats an empty pit and a guess about what goes in
   *  it — the same argument the game presets already make. */
  function applyFields(a, slide) {
    const fields = (a && a.fields) || [];
    /* An activity that names its bullets owns all of them. The layout's own
       placeholders are dropped first, or Hook & Predict's two questions
       arrive followed by a stray "Third point" that nobody asked for. */
    if (fields.some(function (f) { return /^bullets\./.test(f.slide); })) slide.bullets = [];
    fields.forEach(function (f) {
      /* On a keywords box the field's own label is the box's label, so the
         catalogue says it once. The teacher edits the content; the label is
         what the activity calls that box. */
      const half = String(f.slide).match(KEYWORD_HALF);
      if (half && half[2] === 'def') write(slide, half[1] + '.term', f.label);
      if (f.value !== undefined) write(slide, f.slide, f.type === 'minutes' ? Number(f.value) * 60 : f.value);
    });
  }

  /** An activity as the speaker notes a teacher reads in the room. */
  function steps(a) {
    return a.blurb + '\n\n' + a.steps.map(function (step, i) {
      return (i + 1) + '. ' + step;
    }).join('\n') + (a.materials ? '\n\nMaterials (source):\n' + a.materials.join(' · ') : '') +
      (a.teacherNotes ? '\n\nTeacher guidance / example answers (draft):\n' + a.teacherNotes : '') +
      (a.mappingReason ? '\n\nImplementation note:\n' + a.mappingReason : '');
  }

  return { read, write, applyFields, steps };
}
