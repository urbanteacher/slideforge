import { useState } from 'react';
import { makePlan, PLAN_PRESETS, unitsOf, type PlanPreset } from '../engine/words';
import { useStore } from '../model/store';
import type { Layer, PlanStep, WordArc } from '../model/types';
import { Row, Scrub, Section, Select } from './controls';

// SlideForge's per-word choreography, by hand. A preset writes ordinary numbers for every word (or
// letter); pick a word to see and change where it starts, when, and how it lands. SlideForge writes
// these from a brief with its AI button; here every number is in reach.

const ARCS: { value: WordArc; label: string }[] = [
  { value: 'settle', label: 'Settle — eases to rest' },
  { value: 'bounce', label: 'Bounce — past its place and back' },
  { value: 'mist', label: 'Mist — in place soft, then sharp' },
];

export function Choreography({ layer }: { layer: Layer }) {
  const update = useStore((s) => s.updateLayer);
  const [pick, setPick] = useState(0);
  const a = layer.anim;
  const unit = a.type === 'letters' ? 'letters' : 'words';
  const units = unitsOf(String(layer.params.text ?? ''), unit);
  const plan = a.plan ?? [];
  const on = plan.length > 0;
  const i = Math.min(pick, Math.max(0, units.length - 1));
  const step: PlanStep = plan[i] ?? {};
  const upStep = (fn: (s: PlanStep) => void, m?: string) => update(layer.id, (l) => {
    const p = l.anim.plan ?? [];
    while (p.length < units.length) p.push({});
    fn(p[i]);
    l.anim.plan = p;
  }, m);
  const choose = (v: PlanPreset | 'none') => update(layer.id, (l) => {
    if (v === 'none') { delete l.anim.plan; return; }
    const made = makePlan(v, String(l.params.text ?? ''));
    Object.assign(l.anim, { type: made.type, plan: made.plan, easing: made.easing, duration: made.duration });
  });
  const num = (label: string, key: keyof PlanStep, min: number, max: number, stepBy: number, unitLabel: string, rest: number, info?: string) => (
    <Row label={label} info={info}>
      <Scrub value={Number(step[key] ?? rest)} min={min} max={max} step={stepBy} decimals={stepBy < 0.1 ? 2 : 1} unit={unitLabel}
        onChange={(v, m) => upStep((s) => { (s as Record<string, number>)[key] = v; }, m)} />
    </Row>
  );
  return (
    <Section title="Choreography">
      <Row label="Plan" info="Each word, or letter, starts from its own place at its own time. A preset writes the numbers; change any of them below.">
        <Select value={on ? 'custom' : 'none'} options={[{ value: 'none', label: on ? 'Remove the plan' : 'None — every word the same' }, ...(on ? [{ value: 'custom', label: 'Written — change it below' }] : []), ...PLAN_PRESETS.map((p) => ({ value: p.value, label: p.label }))]}
          onChange={(v) => v !== 'custom' && choose(v as PlanPreset | 'none')} />
      </Row>
      {on && (
        <>
          {plan.length !== units.length && (
            <div className="desc">Written for {plan.length} {unit}; the text now has {units.length}. {units.length > plan.length ? 'The new ones land at rest.' : 'The extra steps are ignored.'} Choose a preset to write it again.</div>
          )}
          <div className="chips" style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '4px 0 8px' }}>
            {units.map((u, k) => (
              <button key={k} className={`btn-soft${k === i ? ' accent' : ''}`} style={{ padding: '2px 7px', minWidth: 0 }} onClick={() => setPick(k)}>{u}</button>
            ))}
          </div>
          {num('Starts at', 'delay', 0, 3, 0.01, ' s', 0, 'When this one begins, from the start of the entrance.')}
          {num('Lift', 'dy', -3, 3, 0.05, ' em', 0, 'Where it starts above (−) or below (+) its place, in heights of the text.')}
          {num('Across', 'dx', -3, 3, 0.05, ' em', 0)}
          {num('Turn', 'rot', -30, 30, 1, '°', 0)}
          {num('Scale', 'scale', 0.4, 1.8, 0.01, '×', 1)}
          {num('Blur', 'blur', 0, 14, 0.5, ' px', 0, 'Soft at the start, sharp once it lands. Mist keeps at least 5.')}
          <Row label="Lands"><Select value={step.arc ?? 'settle'} options={ARCS} onChange={(v) => upStep((s) => { if (v === 'settle') delete s.arc; else s.arc = v; })} /></Row>
          <Row label="Every one lands">
            <Select value={'' as WordArc | ''} options={[{ value: '', label: 'Set them all…' }, ...ARCS]}
              onChange={(v) => v && update(layer.id, (l) => { for (const s of l.anim.plan ?? []) { if (v === 'settle') delete s.arc; else s.arc = v as WordArc; } })} />
          </Row>
        </>
      )}
    </Section>
  );
}
