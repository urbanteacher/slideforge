import { Sparkles } from 'lucide-react';
import { useState } from 'react';
import { CONSTRAINTS, NODES, canWriteNodes, writeNodes, type Audience, type NodesBrief } from '../../designs';
import { DEFAULT_THEME, themeOf } from '../../layouts';
import type { Deck, Slide } from '../../core';
import { slideOf, useStore } from '../../store';
import { Row, Section, Select } from '../controls/controls';
import { Area, Input } from '../controls/fields';

// A Nodes format's side panel, on the Design tab of any of its slides: what it is, and Write it with AI —
// a topic and who it is for. One request writes the challenge's content; its slides are drawn again in
// place from what comes back, in the lesson's style. Undo brings the last version back.

const YEARS = ['', 'Year 7', 'Year 8', 'Year 9', 'Year 10', 'Year 11', 'Year 12', 'Year 13', 'Undergraduate', 'Postgraduate', 'Adult learners'];

/** Whether the deck wears a header and footer, which the designs keep clear of (as Browse decides). */
const framed = (deck: Deck) => !!deck.headerFooter?.enabled || deck.slides.some((s) => s.layers.some((l) => typeof l.params.hfSlot === 'string'));

/** The challenge's slides drawn again from new content, where the old ones were. */
async function redraw(id: string, format: string, content: unknown) {
  const f = NODES.find((x) => x.id === format);
  if (!f) return;
  const { setFrame } = await import('../../designs/engage/kit');
  const deck = useStore.getState().deck;
  setFrame(framed(deck));
  const fresh: Slide[] = f.slides(themeOf(deck) ?? DEFAULT_THEME, content);
  useStore.getState().mutate((d) => {
    const at = d.slides.findIndex((s) => s.nodes?.id === id);
    if (at < 0) return;
    const n = d.slides.filter((s) => s.nodes?.id === id).length;
    d.slides.splice(at, n, ...fresh);
  });
  useStore.setState({ slideId: fresh[0].id, selectedId: null });
}

export function NodesPanel() {
  const slide = useStore(slideOf);
  const [brief, setBrief] = useState<NodesBrief>({ topic: '' });
  const set = (k: keyof NodesBrief) => (v: string) => setBrief((b) => ({ ...b, [k]: v }));
  const [aud, setAud] = useState<Audience>({});
  const [state, setState] = useState<{ busy?: boolean; msg?: string; bad?: boolean }>({});
  const n = slide.nodes;
  const f = n?.format ? NODES.find((x) => x.id === n.format) : undefined;
  if (!n?.id || !f) return null;
  const can = canWriteNodes();
  const run = async () => {
    setState({ busy: true, msg: 'Writing it…' });
    const res = await writeNodes(f.id, n.content ?? f.starter, brief, aud);
    if (!res.content) { setState({ msg: res.error, bad: true }); return; }
    await redraw(n.id!, f.id, res.content);
    setState({ msg: `Written on “${brief.topic.trim()}”. Read it before you teach it; Undo brings the last one back.` });
  };
  const toggle = (c: string) => setAud((w) => ({ ...w, constraints: w.constraints?.includes(c) ? w.constraints.filter((x) => x !== c) : [...(w.constraints ?? []), c] }));
  return (
    <Section title={`Nodes · ${f.label}`}>
      <div className="desc">{f.aim}</div>
      <div className="sp-write">
        <div className="desc">{can ? 'Write it with AI: the subject, topic, technical terms and course overview, and who it is for. One request writes the whole challenge; its slides are drawn again from it.' : 'Writing with AI works when the studio is open inside SlideForge, which holds the AI key.'}</div>
        <Row label="Subject"><Input value={brief.subject ?? ''} onChange={set('subject')} placeholder="e.g. Computer Science" /></Row>
        <Row label="Topic"><Input value={brief.topic} onChange={set('topic')} placeholder="e.g. the CPU and clock speed" /></Row>
        <Row label="Technical terms" info="The words students must use accurately, separated by commas. A Framework uses them as its recall terms."><Input value={brief.terms ?? ''} onChange={set('terms')} placeholder="e.g. ALU, cache, clock speed" /></Row>
        <div className="sp-label">Course overview</div>
        <Area value={brief.overview ?? ''} onChange={set('overview')} rows={4} placeholder="What students should learn in this unit, in your own words or pasted from the scheme of work." />
        <Row label="Year group"><Select value={aud.yearGroup ?? ''} options={YEARS.map((y) => ({ value: y, label: y || 'Any' }))} onChange={(v) => setAud((w) => ({ ...w, yearGroup: v || undefined }))} /></Row>
        <Row label="They get wrong" info="A misconception the challenge should bring out, if there is one."><Input value={aud.misconceptions ?? ''} onChange={(v) => setAud((w) => ({ ...w, misconceptions: v }))} placeholder="e.g. more GHz always means faster" /></Row>
        <div className="sp-chips">{CONSTRAINTS.map((c) => <button key={c} className={`sp-chip${aud.constraints?.includes(c) ? ' on' : ''}`} onClick={() => toggle(c)}>{c}</button>)}</div>
        <button className="btn-soft accent tidy" disabled={!can || state.busy || !brief.topic.trim()} onClick={run}><Sparkles size={13} />{state.busy ? 'Writing…' : 'Generate'}</button>
        {state.msg && <div className={`desc${state.bad ? ' sp-bad' : ''}`}>{state.msg}</div>}
      </div>
    </Section>
  );
}
