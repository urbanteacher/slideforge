// The lab slide's own words for an activity page. The room reads the page as SlideForge made it (catalogue.ts),
// then puts over it what the lab slide says: its title, its brief or prompt, and each row's (each stage's) name
// and text, read from the layers the lab's designs name (designs/engage: "Think — task", "Prompt", "Heading",
// "Cover — title", "Step 2 — text"). A word the slide does not have, or still says as the catalogue does, stays
// the catalogue's, so an unedited slide is told to the phones exactly as classic tells it. What changes is the
// lab's own copy (Think-Pair-Share's, tuned for the wall), a teacher's edits, and an activity written on a topic.

import type { Slide } from '../../core';

type Layered = Partial<Pick<Slide, 'layers'>>;

// As the designs read a row (designs/engage/kit.ts rowsOf): "Label · 3 min [talk]<TAB>What to do".
const TIME = /\s*[·•\-–—|,]\s*(every\s+)?(\d+(?:\.\d+)?)\s*(min|mins|minutes|m|s|sec|secs|seconds)\s*$/i;
const JOB = /\s*\[(note|talk|send|work|down)\]\s*$/i;
const labelOf = (term: string) => { const a = term.replace(JOB, '').trim(); const m = a.match(TIME); return m ? a.slice(0, m.index).trim() : a; };
/** Compared as the designs set them: the display faces' en dash for a minus, spaces folded. */
const norm = (v: string) => v.replace(/−/g, '–').replace(/\s+/g, ' ').trim();

function textOf(s: Layered, ...names: string[]): string | null {
  for (const n of names) {
    const l = s.layers?.find((x) => x.name === n && x.kind === 'text');
    if (l && typeof l.params.text === 'string' && l.params.text.trim()) return l.params.text.trim();
  }
  return null;
}
/** The slide's word where it says something other than the catalogue's, else null. */
const changed = (mine: string | null, ...theirs: string[]) => (mine != null && theirs.every((t) => norm(mine) !== norm(t)) ? mine : null);

interface Row { at: number; term: string; def: string; label: string; tail: string }

/** The page with the lab slide's words over the catalogue's. `title` is the activity's title in the catalogue. */
export function ownPage(s: Layered, page: SFActivitySlide, title: string): SFActivitySlide {
  if (!s.layers?.length || !Array.isArray(page.bullets)) return withTitle(s, page, title);
  const bullets = [...page.bullets];
  const rows: Row[] = [];
  bullets.forEach((line, at) => {
    // A row without a tab is left as it is: the designs read its words as a label only.
    if (!String(line).trim() || !String(line).includes('\t')) return;
    const [term = '', def = ''] = String(line).split('\t');
    rows.push({ at, term, def: def.replace(JOB, '').trim(), label: labelOf(term), tail: def.match(JOB)?.[0] ?? '' });
  });
  const put = (r: Row, def: string, term = r.term) => { bullets[r.at] = `${term}\t${def}${r.tail}`; };
  const rename = (r: Row, ...names: string[]) => {
    const name = changed(textOf(s, ...names), r.label);
    return name ? r.term.replace(r.label, name.trim()) : r.term;
  };

  if (page.activityPresentation === 'stages' && page.type === 'keywords') {
    // designs/engage/index.ts routineOf: a leading untimed row is the brief (the band's Prompt); with none, a
    // question opening the first stage is the prompt, and the stage keeps what follows it.
    const timed = (r: Row) => TIME.test(r.term.replace(JOB, '').trim());
    const lead = rows[0] && !timed(rows[0]) && rows.slice(1).some(timed) ? rows[0] : null;
    const stages = lead ? rows.slice(1) : rows;
    if (lead) {
      const brief = changed(textOf(s, 'Prompt'), lead.def || lead.label);
      if (brief) put(lead, brief);
    }
    stages.forEach((r, k) => {
      const term = rename(r, `${r.label} — name`, `${r.label} — heading`);
      const split = !lead && k === 0 ? r.def.match(/^(.*\?)\s+(\S.*)$/) : null;
      const task = textOf(s, `${r.label} — task`);
      let def = r.def;
      if (split) {
        const prompt = changed(textOf(s, 'Prompt'), split[1]) ?? split[1];
        const rest = changed(task, split[2]) ?? split[2];
        def = `${prompt.trim()} ${rest.trim()}`;
      } else def = changed(task, r.def) ?? r.def;
      if (def !== r.def || term !== r.term) put(r, def, term);
    });
  } else {
    const brief = page.activityPresentation === 'brief';
    const steps = page.activityPresentation === 'steps';
    rows.forEach((r, i) => {
      const def = brief && i === 0
        ? changed(textOf(s, 'Brief', 'Brief — text'), r.def || r.label)
        : changed(textOf(s, ...(steps ? [`Step ${i + 1} — text`] : []), `${r.label} — text`, `${r.label} — task`), r.def, r.def || r.label);
      const term = brief && i === 0 ? r.term : rename(r, ...(steps ? [] : [`${r.label} — name`]));
      if (def != null || term !== r.term) put(r, def ?? r.def, term);
    });
  }
  return withTitle(s, { ...page, bullets }, title);
}

/** The slide's heading (or the track's cover title) where it says another title than the catalogue's. */
function withTitle(s: Layered, page: SFActivitySlide, title: string): SFActivitySlide {
  const heading = changed(textOf(s, 'Heading'), String(page.title || title));
  const cover = changed(textOf(s, 'Cover — title'), title);
  const own = heading ?? cover;
  return own ? { ...page, title: own } : page;
}
