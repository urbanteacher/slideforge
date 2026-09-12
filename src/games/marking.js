/* SlideForge — games/marking. Edit source here; npm run build updates js/model.js. */

/* ======================================================================
   Marking a typed answer

   Recall questions are marked by the host, not the relay — see the comment
   on markResponse. The rules below are the whole of it, and the authoring
   panel states them to the teacher, because a rule a teacher cannot predict
   is worse than no rule.
   ====================================================================== */

/* Case, accents, punctuation and surrounding space never carry the meaning
   of a recalled answer, so none of them decide it. A leading article goes
   too: "photosynthesis" and "the photosynthesis" are the same knowledge. */
function normalizeAnswer(text) {
  var t = String(text == null ? '' : text);
  if (t.normalize) t = t.normalize('NFD').replace(/[̀-ͯ]/g, '');
  t = t.toLowerCase()
    .replace(/[‘’‛]/g, "'")     // smart quotes typed by phones
    .replace(/[^a-z0-9'\s]+/g, ' ')
    .replace(/'/g, '')                          // don't/dont, o'clock/oclock
    .replace(/\s+/g, ' ')
    .trim();
  return t.replace(/^(?:the|a|an)\s+/, '');
}

/* A figure recalled as "1,000" and one typed "1000" are the same answer, and
   so are "0.5", ".5" and "0.50". Read from the raw text, not the normalized
   form: normalizing turns the decimal point into a space, which would make
   "0.5" and "0.50" two different strings of digits. */
function numeric(text) {
  var t = String(text == null ? '' : text).trim().replace(/[,\s]/g, '');
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(t)) return null;
  var n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/* A symbol sits against the number, a word sits apart from it: "37.5%" but
   "206 bones". */
function withUnit(text, unit) {
  unit = String(unit == null ? '' : unit).trim();
  if (!unit) return text;
  return /^[%°]/.test(unit) ? text + unit : text + ' ' + unit;
}

/* Numbers as a teacher would write them, without the trailing digits
   floating-point arithmetic leaves behind. */
function formatValue(value, unit) {
  var n = Number(value);
  if (!Number.isFinite(n)) return '';
  return withUnit(String(Math.round(n * 1000) / 1000), unit);
}

function editDistance(a, b) {
  if (a === b) return 0;
  if (!a.length || !b.length) return Math.max(a.length, b.length);
  /* Bail before doing the work when the lengths alone rule out a match —
     every threshold this is asked about is 2 or less. */
  if (Math.abs(a.length - b.length) > 2) return 3;
  var prev = [], row = [], i, j;
  for (j = 0; j <= b.length; j++) prev[j] = j;
  for (i = 1; i <= a.length; i++) {
    row[0] = i;
    for (j = 1; j <= b.length; j++) {
      row[j] = Math.min(
        prev[j] + 1,
        row[j - 1] + 1,
        prev[j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1)
      );
    }
    prev = row.slice();
  }
  return prev[b.length];
}

/* How far off a spelling can be and still count. Scaled by length, because
   one wrong letter in "cell" changes the word and one in "mitochondria"
   is a slip of the thumb. Never applied to a number: 1500 is not 1600, and
   no amount of length makes a digit a typo you can forgive. */
function typoAllowance(normalized, raw) {
  if (numeric(raw) != null || /\d/.test(normalized)) return 0;
  if (normalized.length >= 8) return 2;
  if (normalized.length >= 5) return 1;
  return 0;
}

/**
 * Mark one typed response against a question's accepted answers.
 * @returns {object} { right, matched, distance } — matched is the accepted
 *   answer it hit, so the host can say which spelling it took.
 */
function markTyped(accept, response, allowTypos) {
  var given = normalizeAnswer(response);
  var givenNum = numeric(response);
  var miss = /** @type {{ right: boolean, matched: string | null, distance: number | null }} */ ({
    right: false, matched: null, distance: null
  });
  if (!given) return miss;
  var list = (Array.isArray(accept) ? accept : [accept])
    .filter(function (a) { return String(a == null ? '' : a).trim(); });
  var best = miss;
  for (var i = 0; i < list.length; i++) {
    var raw = String(list[i]);
    var want = normalizeAnswer(raw);
    if (!want) continue;
    if (given === want) return { right: true, matched: raw, distance: 0 };
    var wantNum = numeric(raw);
    if (givenNum != null && wantNum != null && givenNum === wantNum) {
      return { right: true, matched: raw, distance: 0 };
    }
    if (allowTypos === false) continue;
    var allowed = typoAllowance(want, raw);
    if (!allowed) continue;
    var d = editDistance(given, want);
    if (d <= allowed && (best.distance == null || d < best.distance)) {
      best = { right: true, matched: raw, distance: d };
    }
  }
  return best;
}

export { normalizeAnswer, numeric, withUnit, formatValue, editDistance, typoAllowance, markTyped };
