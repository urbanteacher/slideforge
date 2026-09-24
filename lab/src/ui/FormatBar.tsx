import { Bold, Italic, List, ListOrdered, Minus, Plus, TextAlignCenter, TextAlignEnd, TextAlignStart, Underline, type LucideIcon } from 'lucide-react';
import { useRef } from 'react';
import { FONTS, kind } from '../engine/registry';
import { layerOf, useStore } from '../model/store';
import type { Layer, ParamValue } from '../model/types';
import { newGesture } from './controls';
import { has, toggleFormat } from './format';

// The word-processor strip in the top bar. Each control drives one param, and is live only when
// the selected layer has that param: all of them for text, font/size/colour for quiz, activity
// and chart cards. Formatting applies to the whole box.

const colourKey = (l: Layer | null) => (has(l, 'color') && l!.kind === 'text' ? 'color' : has(l, 'textColor') ? 'textColor' : null);

// Buttons keep focus where it was, so formatting while typing on the canvas doesn't end the edit.
function Btn({ icon: I, title, on, disabled, onClick }: { icon: LucideIcon; title: string; on?: boolean; disabled: boolean; onClick: () => void }) {
  return <button className={`tb-btn icon${on ? ' active' : ''}`} title={title} disabled={disabled} aria-pressed={!!on} onPointerDown={(e) => e.preventDefault()} onClick={onClick}><I size={15} /></button>;
}

export function FormatBar() {
  const layer = useStore(layerOf);
  const updateLayer = useStore((s) => s.updateLayer);
  const g = useRef(newGesture());
  const set = (key: string, v: ParamValue, merge?: string) => layer && updateLayer(layer.id, (x) => { x.params[key] = v; }, merge);
  const p = layer?.params ?? {};
  const ck = colourKey(layer);
  const size = Number(p.size ?? 0);
  const sizeDef = layer ? kind(layer.kind).params.find((d) => d.key === 'size') : undefined;
  const [min, max] = sizeDef && sizeDef.type === 'number' ? [sizeDef.min, sizeDef.max] : [1, 999];
  const setSize = (v: number) => set('size', Math.max(min, Math.min(max, Math.round(v))), g.current);

  const align = String(p.align ?? 'left');
  const list = String(p.list ?? 'none');

  return (
    <div className={`tb-group fmt${layer ? '' : ' idle'}`} title={layer ? undefined : 'Select a text box to format it'}>
      <select className="fmt-font" value={has(layer, 'font') ? String(p.font) : ''} disabled={!has(layer, 'font')} onChange={(e) => set('font', e.target.value)} onKeyDown={(e) => e.stopPropagation()} title="Font">
        {!has(layer, 'font') && <option value="">Font</option>}
        {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
      </select>
      <div className="fmt-size" title="Size">
        <button className="tb-btn icon" disabled={!has(layer, 'size')} onPointerDown={(e) => e.preventDefault()} onClick={() => { g.current = newGesture(); setSize(size - (size > 48 ? 4 : 2)); }}><Minus size={13} /></button>
        <input
          type="number"
          value={has(layer, 'size') ? size : ''}
          disabled={!has(layer, 'size')}
          onFocus={() => (g.current = newGesture())}
          onChange={(e) => { if (e.target.value !== '') setSize(Number(e.target.value)); }}
          onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        />
        <button className="tb-btn icon" disabled={!has(layer, 'size')} onPointerDown={(e) => e.preventDefault()} onClick={() => { g.current = newGesture(); setSize(size + (size >= 48 ? 4 : 2)); }}><Plus size={13} /></button>
      </div>
      <span className="fmt-sep" />
      <Btn icon={Bold} title="Bold (⌘B)" on={Number(p.weight) >= 600} disabled={!has(layer, 'weight')} onClick={() => layer && toggleFormat(layer, 'bold')} />
      <Btn icon={Italic} title="Italic (⌘I)" on={!!p.italic} disabled={!has(layer, 'italic')} onClick={() => layer && toggleFormat(layer, 'italic')} />
      <Btn icon={Underline} title="Underline (⌘U)" on={!!p.underline} disabled={!has(layer, 'underline')} onClick={() => layer && toggleFormat(layer, 'underline')} />
      <label className={`fmt-colour${ck ? '' : ' disabled'}`} title="Text colour" onPointerDown={(e) => { if (!ck) e.preventDefault(); }}>
        <span className="fmt-a">A</span>
        <span className="fmt-swatch" style={{ background: ck ? String(p[ck]) : 'transparent' }} />
        <input type="color" disabled={!ck} value={ck ? String(p[ck]).slice(0, 7) : '#000000'} onFocus={() => (g.current = newGesture())} onChange={(e) => ck && set(ck, e.target.value, g.current)} />
      </label>
      <span className="fmt-align">
        <span className="fmt-sep" />
        <Btn icon={TextAlignStart} title="Align left" on={has(layer, 'align') && align === 'left'} disabled={!has(layer, 'align')} onClick={() => set('align', 'left')} />
        <Btn icon={TextAlignCenter} title="Align centre" on={has(layer, 'align') && align === 'center'} disabled={!has(layer, 'align')} onClick={() => set('align', 'center')} />
        <Btn icon={TextAlignEnd} title="Align right" on={has(layer, 'align') && align === 'right'} disabled={!has(layer, 'align')} onClick={() => set('align', 'right')} />
      </span>
      <span className="fmt-lists">
        <span className="fmt-sep" />
        <Btn icon={List} title="Bulleted list" on={list === 'bullets'} disabled={!has(layer, 'list')} onClick={() => set('list', list === 'bullets' ? 'none' : 'bullets')} />
        <Btn icon={ListOrdered} title="Numbered list" on={list === 'numbers'} disabled={!has(layer, 'list')} onClick={() => set('list', list === 'numbers' ? 'none' : 'numbers')} />
      </span>
    </div>
  );
}
