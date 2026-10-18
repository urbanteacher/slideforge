import { rebuildSlide, RECIPE_NAMES } from '../../designs';
import { slideOf, useStore } from '../../store';
import { ColorField, Row, Scrub, Section, Select } from '../controls/controls';
import { RefreshCw } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Area, Input, List, PictureTile } from '../controls/fields';

// ─── Slide designs made of several layers ───────────────────────────────────
type Spot = { x: number; y: number; zoom?: number; title: string; body?: string };
type Fig = { src: string; caption?: string; source?: string };
type Callout = { label: string; note: string };
type Stat = { value: string; label: string };
type Bar = { label: string; value: number };
type Step = { head: string; body: string };
type Partner = { src: string; caption: string };
type Reason = { head: string; body: string };

/** Edit what a slide design was built from, then build it again in place. */
export function RecipePanel() {
  const slide = useStore(slideOf);
  const recipe = slide.recipe;
  const [args, setArgs] = useState<Record<string, unknown>>(recipe?.args ?? {});
  useEffect(() => { setArgs(recipe?.args ?? {}); }, [slide.id, recipe]);
  if (!recipe || !RECIPE_NAMES[recipe.kind]) return null;
  const put = (k: string, v: unknown) => setArgs((a) => ({ ...a, [k]: v }));
  const dirty = JSON.stringify(args) !== JSON.stringify(recipe.args);
  const apply = () => useStore.getState().mutate((d) => rebuildSlide(d, slide.id, args));
  const str = (k: string) => String(args[k] ?? '');
  let body: ReactNode = null;
  if (recipe.kind === 'explore') {
    const spots = (args.spots as Spot[]) ?? [];
    body = (
      <>
        <Row label="Title"><Input value={str('title')} onChange={(v) => put('title', v)} /></Row>
        <PictureTile src={str('src')} onChange={(v) => put('src', v)} />
        <List noun="hotspot" items={spots} max={8} onChange={(v) => put('spots', v)} make={() => ({ x: 50, y: 50, zoom: 2, title: 'A detail', body: '' })}
          render={(sp, set) => (
            <>
              <Input value={sp.title} onChange={(v) => set({ ...sp, title: v })} placeholder="What it is" />
              <Area rows={2} value={sp.body ?? ''} onChange={(v) => set({ ...sp, body: v })} placeholder="Why it matters" />
              <Row label="Across"><Scrub value={sp.x} min={0} max={100} step={1} decimals={0} unit="%" onChange={(v) => set({ ...sp, x: v })} /></Row>
              <Row label="Down"><Scrub value={sp.y} min={0} max={100} step={1} decimals={0} unit="%" onChange={(v) => set({ ...sp, y: v })} /></Row>
              <Row label="Zoom"><Scrub value={sp.zoom ?? 2} min={1} max={4} step={0.1} decimals={1} unit="×" onChange={(v) => set({ ...sp, zoom: v })} /></Row>
            </>
          )} />
      </>
    );
  } else if (recipe.kind === 'flip') {
    body = (
      <>
        <PictureTile src={str('src')} onChange={(v) => put('src', v)} />
        <Row label="Caption"><Input value={str('caption')} onChange={(v) => put('caption', v)} /></Row>
        <Row label="Credit"><Input value={str('credit')} onChange={(v) => put('credit', v)} /></Row>
        <Row label="Frame"><Select value={str('frame') || '4:3'} options={['16:9', '4:3', '3:2', '1:1', '4:5'].map((f) => ({ value: f, label: f }))} onChange={(v) => put('frame', v)} /></Row>
        <Row label="Caption on"><Select value={str('cap') || 'bar'} options={[{ value: 'bar', label: 'An accent bar' }, { value: 'plain', label: 'The slide' }, { value: 'scrim', label: 'A fade over the picture' }]} onChange={(v) => put('cap', v)} /></Row>
        <div className="desc">The facts on the back, one paragraph a line. Empty takes the ⇄ away.</div>
        <Area rows={6} value={str('facts')} onChange={(v) => put('facts', v)} />
      </>
    );
  } else if (recipe.kind === 'gallery') {
    const figs = (args.figs as Fig[]) ?? [];
    body = (
      <>
        <Row label="Title"><Input value={str('title')} onChange={(v) => put('title', v)} /></Row>
        <List noun="picture" items={figs} max={8} onChange={(v) => put('figs', v)} make={() => ({ src: '', caption: '', source: '' })}
          render={(f, set) => (
            <>
              <PictureTile src={f.src} onChange={(v) => set({ ...f, src: v })} />
              <Input value={f.caption ?? ''} onChange={(v) => set({ ...f, caption: v })} placeholder="Caption" />
              <Input value={f.source ?? ''} onChange={(v) => set({ ...f, source: v })} placeholder="Source" />
            </>
          )} />
        <Row label="Frame"><Select value={str('frame') || '4:3'} options={['16:9', '4:3', '3:2', '1:1', '4:5'].map((f) => ({ value: f, label: f }))} onChange={(v) => put('frame', v)} /></Row>
        <Row label="Fit"><Select value={str('fit') || 'contain'} options={[{ value: 'contain', label: 'Whole picture' }, { value: 'cover', label: 'Fill the frame' }]} onChange={(v) => put('fit', v)} /></Row>
      </>
    );
  } else if (recipe.kind === 'callouts') {
    const callouts = (args.callouts as Callout[]) ?? [];
    const labels = str('data').split('\n').filter((l) => l.trim()).map((l) => l.split(',')[0].trim());
    body = (
      <>
        <Row label="Title"><Input value={str('title')} onChange={(v) => put('title', v)} /></Row>
        <div className="desc">The chart’s data: one “label, value” per line.</div>
        <Area rows={6} value={str('data')} onChange={(v) => put('data', v)} />
        <Row label="Source"><Input value={str('source')} onChange={(v) => put('source', v)} /></Row>
        <List noun="callout" items={callouts} max={6} onChange={(v) => put('callouts', v)} make={() => ({ label: labels[0] ?? '', note: '' })}
          render={(c, set) => (
            <>
              <Row label="Zooms to"><Select value={c.label} options={labels.map((l) => ({ value: l, label: l }))} onChange={(v) => set({ ...c, label: v })} /></Row>
              <Area rows={2} value={c.note} onChange={(v) => set({ ...c, note: v })} placeholder="What to notice there" />
            </>
          )} />
      </>
    );
  } else if (recipe.kind === 'story-numbers') {
    const stats = (args.stats as Stat[]) ?? [];
    body = (
      <>
        <Row label="Kicker"><Input value={str('kicker')} onChange={(v) => put('kicker', v)} placeholder="A short label above the title" /></Row>
        <Row label="Title"><Input value={str('title')} onChange={(v) => put('title', v)} /></Row>
        <Row label="Intro"><Input value={str('intro')} onChange={(v) => put('intro', v)} placeholder="Optional line before the numbers" /></Row>
        <List noun="number" items={stats} max={4} onChange={(v) => put('stats', v)} make={() => ({ value: '10%', label: 'What it counts' })}
          render={(st, set) => (
            <>
              <Input value={st.value} onChange={(v) => set({ ...st, value: v })} placeholder="The number: 3.1m, 4×, 120,000" />
              <Area rows={2} value={st.label} onChange={(v) => set({ ...st, label: v })} placeholder="What it counts" />
            </>
          )} />
        <Row label="Takeaway"><Input value={str('takeaway')} onChange={(v) => put('takeaway', v)} placeholder="Optional line after the numbers" /></Row>
        <Row label="Source"><Input value={str('source')} onChange={(v) => put('source', v)} placeholder="Where the numbers come from" /></Row>
        <Row label="Numbers arrive"><Select value={str('reveal') || 'click'} options={[{ value: 'click', label: 'One per click' }, { value: 'slide', label: 'With the slide' }]} onChange={(v) => put('reveal', v)} /></Row>
      </>
    );
  } else if (recipe.kind === 'story-hero') {
    body = (
      <>
        <PictureTile src={str('src')} onChange={(v) => put('src', v)} />
        <Row label="First line"><Input value={str('line1')} onChange={(v) => put('line1', v)} /></Row>
        <Row label="Big line"><Input value={str('line2')} onChange={(v) => put('line2', v)} placeholder="The biggest words, in the accent" /></Row>
        <Row label="Line under"><Input value={str('sub')} onChange={(v) => put('sub', v)} placeholder="Optional sentence" /></Row>
        <Row label="Credit"><Input value={str('credit')} onChange={(v) => put('credit', v)} placeholder="Photo: …" /></Row>
        <Row label="Words sit"><Select value={str('side') || 'left'} options={[{ value: 'left', label: 'On the left' }, { value: 'bottom', label: 'Along the bottom' }]} onChange={(v) => put('side', v)} /></Row>
        <Row label="Fade colour" info="The shade behind the words, fading out across the picture."><ColorField value={str('fadeColor') || '#121416'} onChange={(v) => put('fadeColor', v)} /></Row>
        <Row label="Fade strength" info="How dark the fade is behind the words. 0 leaves the picture clear."><Scrub value={Number(args.fadeStrength ?? 96)} min={0} max={100} step={1} decimals={0} unit="%" onChange={(v) => put('fadeStrength', v)} /></Row>
      </>
    );
  } else if (recipe.kind === 'story-bars') {
    const bars = (args.bars as Bar[]) ?? [];
    body = (
      <>
        <Row label="Kicker"><Input value={str('kicker')} onChange={(v) => put('kicker', v)} /></Row>
        <Row label="Title"><Input value={str('title')} onChange={(v) => put('title', v)} /></Row>
        <Row label="Bars title"><Input value={str('barsTitle')} onChange={(v) => put('barsTitle', v)} /></Row>
        <List noun="bar" items={bars} max={6} onChange={(v) => put('bars', v)} make={() => ({ label: 'Group', value: 10 })}
          render={(b, set) => (
            <>
              <Input value={b.label} onChange={(v) => set({ ...b, label: v })} placeholder="What the bar is" />
              <Row label="Value"><Scrub value={Number(b.value) || 0} min={0} max={1000} step={1} decimals={0} onChange={(v) => set({ ...b, value: v })} /></Row>
            </>
          )} />
        <Row label="Unit"><Input value={str('unit')} onChange={(v) => put('unit', v)} placeholder="%, people, hours…" /></Row>
        <Row label="Under the bars"><Input value={str('barsNote')} onChange={(v) => put('barsNote', v)} placeholder="Who and when" /></Row>
        <Row label="Card title"><Input value={str('cardTitle')} onChange={(v) => put('cardTitle', v)} /></Row>
        <Row label="Card number"><Input value={str('big')} onChange={(v) => put('big', v)} /></Row>
        <Area rows={2} value={str('bigLabel')} onChange={(v) => put('bigLabel', v)} placeholder="What the card number counts" />
        <Row label="Second number"><Input value={str('big2')} onChange={(v) => put('big2', v)} placeholder="Optional" /></Row>
        <Area rows={2} value={str('big2Label')} onChange={(v) => put('big2Label', v)} placeholder="What it counts" />
        <Row label="Takeaway"><Input value={str('takeaway')} onChange={(v) => put('takeaway', v)} placeholder="Optional; arrives on a click" /></Row>
        <Row label="Source"><Input value={str('source')} onChange={(v) => put('source', v)} /></Row>
      </>
    );
  } else if (recipe.kind === 'story-closing') {
    body = (
      <>
        <Row label="Kicker"><Input value={str('kicker')} onChange={(v) => put('kicker', v)} /></Row>
        <Row label="First line"><Input value={str('line1')} onChange={(v) => put('line1', v)} /></Row>
        <Row label="Second line"><Input value={str('line2')} onChange={(v) => put('line2', v)} placeholder="In the accent" /></Row>
        <Row label="Tag"><Input value={str('tag')} onChange={(v) => put('tag', v)} placeholder="Optional label" /></Row>
        <Row label="When and where"><Input value={str('detail')} onChange={(v) => put('detail', v)} /></Row>
        <Row label="Button"><Input value={str('action')} onChange={(v) => put('action', v)} placeholder="The call to action" /></Row>
        <Row label="Contact"><Input value={str('contact')} onChange={(v) => put('contact', v)} /></Row>
        <Row label="Outlined word"><Input value={str('word')} onChange={(v) => put('word', v)} placeholder="Optional, along the foot" /></Row>
      </>
    );
  } else if (recipe.kind === 'story-steps') {
    const steps = (args.steps as Step[]) ?? [];
    body = (
      <>
        <Row label="Kicker"><Input value={str('kicker')} onChange={(v) => put('kicker', v)} /></Row>
        <Row label="Title"><Input value={str('title')} onChange={(v) => put('title', v)} /></Row>
        <List noun="step" items={steps} max={5} onChange={(v) => put('steps', v)} make={() => ({ head: 'A step', body: '' })}
          render={(x, set) => (
            <>
              <Input value={x.head} onChange={(v) => set({ ...x, head: v })} placeholder="The step, in a few words" />
              <Area rows={2} value={x.body} onChange={(v) => set({ ...x, body: v })} placeholder="One line about it" />
            </>
          )} />
        <PictureTile src={str('src')} onChange={(v) => put('src', v)} />
        <Row label="Caption"><Input value={str('caption')} onChange={(v) => put('caption', v)} placeholder="Optional, under the picture" /></Row>
        <Row label="Picture sits"><Select value={str('side') || 'right'} options={[{ value: 'right', label: 'On the right' }, { value: 'left', label: 'On the left' }]} onChange={(v) => put('side', v)} /></Row>
      </>
    );
  } else if (recipe.kind === 'story-logos') {
    const partners = (args.partners as Partner[]) ?? [];
    body = (
      <>
        <Row label="Kicker"><Input value={str('kicker')} onChange={(v) => put('kicker', v)} /></Row>
        <Row label="Title"><Input value={str('title')} onChange={(v) => put('title', v)} /></Row>
        <List noun="partner" items={partners} max={6} onChange={(v) => put('partners', v)} make={() => ({ src: '', caption: '' })}
          render={(x, set) => (
            <>
              <PictureTile src={x.src} onChange={(v) => set({ ...x, src: v })} />
              <Area rows={2} value={x.caption} onChange={(v) => set({ ...x, caption: v })} placeholder="Who they are and what they brought" />
            </>
          )} />
        <Row label="Line after"><Input value={str('line')} onChange={(v) => put('line', v)} /></Row>
      </>
    );
  } else if (recipe.kind === 'story-showcase') {
    body = (
      <>
        <Row label="Kicker"><Input value={str('kicker')} onChange={(v) => put('kicker', v)} /></Row>
        <Row label="Title"><Input value={str('title')} onChange={(v) => put('title', v)} /></Row>
        <PictureTile src={str('src')} label="Screenshot" onChange={(v) => put('src', v)} />
        <Row label="Number"><Input value={str('big')} onChange={(v) => put('big', v)} placeholder="Optional; counts up" /></Row>
        <Area rows={2} value={str('bigLabel')} onChange={(v) => put('bigLabel', v)} placeholder="What the number counts" />
        <div className="desc">A few lines about it, one a line.</div>
        <Area rows={3} value={str('points')} onChange={(v) => put('points', v)} />
        <Row label="Address"><Input value={str('url')} onChange={(v) => put('url', v)} placeholder="example.com" /></Row>
        <Row label="Built with"><Input value={str('built')} onChange={(v) => put('built', v)} placeholder="Python · pandas · Three.js" /></Row>
      </>
    );
  } else if (recipe.kind === 'story-why') {
    const reasons = (args.reasons as Reason[]) ?? [];
    body = (
      <>
        <Row label="Kicker"><Input value={str('kicker')} onChange={(v) => put('kicker', v)} /></Row>
        <Row label="Title"><Input value={str('title')} onChange={(v) => put('title', v)} /></Row>
        <Row label="Number"><Input value={str('big')} onChange={(v) => put('big', v)} placeholder="Counts up" /></Row>
        <Area rows={2} value={str('bigLabel')} onChange={(v) => put('bigLabel', v)} placeholder="What it counts" />
        <Row label="Second number"><Input value={str('second')} onChange={(v) => put('second', v)} placeholder="Optional; on a click" /></Row>
        <Area rows={2} value={str('secondLabel')} onChange={(v) => put('secondLabel', v)} placeholder="What it counts" />
        <Row label="Card title"><Input value={str('cardTitle')} onChange={(v) => put('cardTitle', v)} placeholder="Why?" /></Row>
        <List noun="reason" items={reasons} max={3} onChange={(v) => put('reasons', v)} make={() => ({ head: 'A reason', body: '' })}
          render={(r, set) => (
            <>
              <Input value={r.head} onChange={(v) => set({ ...r, head: v })} placeholder="The reason, in a few words" />
              <Area rows={2} value={r.body} onChange={(v) => set({ ...r, body: v })} placeholder="One line about it" />
            </>
          )} />
        <Row label="Source"><Input value={str('source')} onChange={(v) => put('source', v)} /></Row>
      </>
    );
  } else if (recipe.kind === 'story-mosaic') {
    const srcs = ((args.srcs as string[]) ?? []).concat(['', '', '', '']).slice(0, 4);
    const setSrc = (i: number, v: string) => put('srcs', srcs.map((x, j) => (j === i ? v : x)));
    body = (
      <>
        {['The large picture', 'Top middle', 'Top right', 'Bottom right'].map((label, i) => <PictureTile key={i} src={srcs[i]} label={label} onChange={(v) => setSrc(i, v)} />)}
        <Row label="First line"><Input value={str('line1')} onChange={(v) => put('line1', v)} /></Row>
        <Row label="Big line"><Input value={str('line2')} onChange={(v) => put('line2', v)} placeholder="In the accent" /></Row>
      </>
    );
  } else if (recipe.kind === 'story-routes') {
    body = (
      <>
        <Row label="Kicker"><Input value={str('kicker')} onChange={(v) => put('kicker', v)} /></Row>
        <Row label="Title"><Input value={str('title')} onChange={(v) => put('title', v)} /></Row>
        <Row label="Number"><Input value={str('big')} onChange={(v) => put('big', v)} /></Row>
        <Area rows={2} value={str('bigLabel')} onChange={(v) => put('bigLabel', v)} placeholder="What it counts" />
        <Row label="Second"><Input value={str('stat2')} onChange={(v) => put('stat2', v)} /></Row>
        <Area rows={2} value={str('stat2Label')} onChange={(v) => put('stat2Label', v)} placeholder="What it counts" />
        <Row label="Third"><Input value={str('stat3')} onChange={(v) => put('stat3', v)} /></Row>
        <Area rows={2} value={str('stat3Label')} onChange={(v) => put('stat3Label', v)} placeholder="What it counts" />
        <Row label="Diagram title"><Input value={str('cardTitle')} onChange={(v) => put('cardTitle', v)} /></Row>
        <Row label="From"><Input value={str('from')} onChange={(v) => put('from', v)} placeholder="Home" /></Row>
        <Row label="To"><Input value={str('to')} onChange={(v) => put('to', v)} placeholder="School" /></Row>
        <Row label="Worse route"><Input value={str('worse')} onChange={(v) => put('worse', v)} /></Row>
        <Row label="Better route"><Input value={str('better')} onChange={(v) => put('better', v)} /></Row>
        <Row label="Source"><Input value={str('source')} onChange={(v) => put('source', v)} /></Row>
      </>
    );
  } else if (recipe.kind === 'story-wall') {
    body = (
      <>
        <div className="desc">The wall: every phrase, one after another.</div>
        <Area rows={6} value={str('phrases')} onChange={(v) => put('phrases', v)} />
        <div className="desc">Up to four stamped over it, one a line.</div>
        <Area rows={4} value={str('highlights')} onChange={(v) => put('highlights', v)} />
        <Row label="Caption"><Input value={str('caption')} onChange={(v) => put('caption', v)} /></Row>
      </>
    );
  } else if (recipe.kind === 'story-cover') {
    const logos = ((args.logos as string[]) ?? []).concat(['', '', '']).slice(0, 3);
    const setLogo = (i: number, v: string) => put('logos', logos.map((x, j) => (j === i ? v : x)));
    body = (
      <>
        <Row label="Kicker"><Input value={str('kicker')} onChange={(v) => put('kicker', v)} /></Row>
        <Row label="Title"><Input value={str('line1')} onChange={(v) => put('line1', v)} /></Row>
        <Row label="Title, second line"><Input value={str('line2')} onChange={(v) => put('line2', v)} placeholder="In the accent" /></Row>
        <Row label="About the talk"><Input value={str('sub')} onChange={(v) => put('sub', v)} /></Row>
        <Row label="Speaker"><Input value={str('name')} onChange={(v) => put('name', v)} /></Row>
        <Row label="Role"><Input value={str('role')} onChange={(v) => put('role', v)} /></Row>
        <PictureTile src={str('src')} label="Portrait (a cut-out PNG)" onChange={(v) => put('src', v)} />
        <Row label="Outlined word"><Input value={str('word')} onChange={(v) => put('word', v)} placeholder="Optional, behind the portrait" /></Row>
        {['Logo 1', 'Logo 2', 'Logo 3'].map((label, i) => <PictureTile key={i} src={logos[i]} label={label} onChange={(v) => setLogo(i, v)} />)}
      </>
    );
  }
  return (
    <Section title={RECIPE_NAMES[recipe.kind]}>
      <div className="desc">This slide is a {RECIPE_NAMES[recipe.kind]} design. Change what it shows here, then build it again — its place, notes, header and footer stay.</div>
      {body}
      <button className={`btn-soft tidy${dirty ? ' sp-dirty' : ''}`} disabled={!dirty} onClick={apply}><RefreshCw size={13} />{dirty ? 'Update the slide' : 'Up to date'}</button>
    </Section>
  );
}
