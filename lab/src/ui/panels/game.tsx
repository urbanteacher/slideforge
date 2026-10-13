import type { GameSettings } from '../../core';
import { applyGameSettings, canWrite, replaceGame, writeGame, GAME_LOOKS, REASONS, relookGame, HAS_LOOKS, type ShowcaseGame } from '../../designs';
import { slideOf, useStore } from '../../store';
import { Row, Scrub, Section, Select } from '../controls/controls';
import { RefreshCw, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Area, Chips, Input } from '../controls/fields';
import { normalizeTeams, TEAM_DEFAULTS } from '../../live';

// ─── A game's settings ──────────────────────────────────────────────────────
const ROLE_NAMES = { cover: 'its cover', question: 'a question', answer: 'an answer', board: 'its board', end: 'its end' } as const;
const secs = (s: number) => (s >= 60 && s % 60 === 0 ? `${s / 60} min` : `${s} s`);

/**
 * What a game runs by and the wall cannot show: the time, the points, the difficulty, how close
 * counts, the spellings that also count. A change goes to the question and its answer together, or
 * from the cover to every question; the clock, the eyebrow and the rest of what shows it follow.
 */
export function GamePanel() {
  const slide = useStore(slideOf);
  const deck = useStore((s) => s.deck);
  const g = slide.game;
  const [accept, setAccept] = useState('');
  const [teamText, setTeamText] = useState('');
  useEffect(() => { setTeamText((g?.settings.teams ?? []).join(', ')); }, [slide.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setAccept((g?.settings.accept ?? []).join('\n')); }, [slide.id, g?.settings.accept]);
  if (!g) return null;
  const s = g.settings;
  const apply = (change: GameSettings, every = false, merge?: string) => useStore.getState().mutate((d) => applyGameSettings(d, slide.id, change, every), merge);
  const timed = (g.role === 'question' || g.role === 'board') && g.clock !== 'none' && (g.role === 'question' || s.seconds != null);
  const canNone = g.role === 'question' && g.clock !== 'Round';
  const times = [...(canNone ? [0] : []), 10, 15, 20, 30, 45, 60, 90, 120, 180];
  const questions = deck.slides.filter((x) => x.game?.id === g.id && x.game.role === 'question' && x.game.clock !== 'none');
  const first = questions[0]?.game?.settings.seconds ?? 0;
  const levels = g.format === 'boss-battle' ? ['easy', 'medium', 'hard', 'boss'] : ['easy', 'medium', 'hard'];
  return (
    <Section title={`Game · ${g.label}`}>
      {slide.warn && <div className="desc game-warn" role="status">⚠ {slide.warn}</div>}
      <WriteGame gameId={g.id} format={g.format} label={g.label} />
      {HAS_LOOKS.has(g.format) && (
        <Row label="Look" info="Buttons: the options as buttons (two by two, or True and False as two doors), the right one lit green where it stands, as SlideForge's quiz does. Question, then answer: the options as rows, the answer and why on the slide after. The questions, their times and points stay as they are.">
          <Select value={g.look ?? 'walls'} options={GAME_LOOKS} onChange={(v) => {
            let first = '';
            useStore.getState().mutate((d) => { first = relookGame(d, g.id, v as 'buttons' | 'walls')[0]?.id ?? ''; });
            if (first) useStore.setState({ slideId: first, selectedId: null });
          }} />
        </Row>
      )}
      {HAS_LOOKS.has(g.format) && (g.look ?? 'walls') === 'buttons' && (
        <Row label="Reason" info="Where the answer's reason goes: under the question, as the other games have it; under the buttons; or kept to the notes, for you to say. The buttons stand in the same place on the question and its answer whichever you choose. Its words are edited on the answer slide.">
          <Select value={g.reason ?? 'question'} options={REASONS} onChange={(v) => {
            let first = '';
            useStore.getState().mutate((d) => { first = relookGame(d, g.id, 'buttons', v as 'question' | 'buttons' | 'notes')[0]?.id ?? ''; });
            if (first) useStore.setState({ slideId: first, selectedId: null });
          }} />
        </Row>
      )}
      <div className="desc">This slide is {ROLE_NAMES[g.role]} of the game. These are how it runs, and what the wall shows follows them{g.key != null ? '; a question and its answer share them' : ''}.</div>
      {timed && (
        <>
          <Row label={g.clock ?? 'Time limit'}>
            <Chips value={String(s.seconds ?? 0)} options={times.map((t) => ({ value: String(t), label: t ? secs(t) : 'None' }))} onChange={(v) => apply({ seconds: Number(v) || undefined })} />
          </Row>
          <Row label="Or exactly"><Scrub value={s.seconds ?? 0} min={canNone ? 0 : 5} max={600} step={1} decimals={0} unit=" s" onChange={(v, m) => apply({ seconds: v || undefined }, false, m)} /></Row>
        </>
      )}
      {g.role === 'cover' && questions.length > 0 && (
        <Row label="Every question" info="The time for each question in the game, set at once. Each can still be changed on its own slide.">
          <Chips value={String(first)} options={[0, 10, 15, 20, 30, 45, 60].map((t) => ({ value: String(t), label: t ? secs(t) : 'None' }))} onChange={(v) => { const d = useStore.getState().deck; const q = d.slides.find((x) => x.id === questions[0].id); if (q) useStore.getState().mutate((dd) => applyGameSettings(dd, q.id, { seconds: Number(v) || undefined }, true)); }} />
        </Row>
      )}
      {s.difficulty != null && (
        <Row label="Difficulty" info={g.format === 'boss-battle' ? 'Sets the hit a right answer deals: easy 1, medium 2, hard 3, boss 5.' : g.format === 'emoji-guess' ? 'Easy gives the letter pattern and the hint; medium the pattern only; hard neither.' : g.format === 'word-reveal' ? 'How much of the word shows before the drip: easy 60%, medium 40%, hard 20%.' : undefined}>
          <Select value={s.difficulty} options={levels.map((l) => ({ value: l, label: l[0].toUpperCase() + l.slice(1) }))} onChange={(v) => apply({ difficulty: v })} />
        </Row>
      )}
      {g.format === 'boss-battle' && s.damage != null && (
        <Row label="Damage" info="What a right answer takes off the boss. The health bar re-divides across the game."><Scrub value={s.damage} min={1} max={10} step={1} decimals={0} onChange={(v, m) => apply({ damage: v }, false, m)} /></Row>
      )}
      {s.points != null && g.format !== 'quiz-bowl' && (
        <Row label="Points"><Scrub value={s.points} min={0} max={5000} step={10} decimals={0} onChange={(v, m) => apply({ points: v }, false, m)} /></Row>
      )}
      {(g.role === 'question' || g.role === 'answer') && (
        <>
          <Row label="Room" info="Play individually, or in teams. A team's score is its members' average, so a big team is no better off. The first game in the lesson sets the teams for the whole room.">
            <Chips value={s.mode ?? 'individual'} options={[{ value: 'individual', label: 'Individual' }, { value: 'teams', label: 'Teams' }]}
              onChange={(v) => { const teams = s.teams?.length && s.teams.length >= 2 ? s.teams : TEAM_DEFAULTS; setTeamText(teams.join(', ')); apply(v === 'teams' ? { mode: 'teams', teams } : { mode: 'individual' }, true); }} />
          </Row>
          {s.mode === 'teams' && (
            <>
              <div className="desc">Team names, separated by commas: two to six.</div>
              <Input value={teamText} onChange={(v) => { setTeamText(v); const t = normalizeTeams(v); if (t.length >= 2) apply({ teams: t }, true, 'teams'); }} placeholder="Red, Blue, Green, Yellow" />
            </>
          )}
        </>
      )}
      {s.tolerance != null && (
        <Row label="Counts within" info="How close an answer must be to score. The green band on the answer shows it."><Scrub value={s.tolerance} min={0} max={Math.max(1, s.range ? s.range[1] - s.range[0] : 100)} step={1} decimals={0} onChange={(v, m) => apply({ tolerance: v }, false, m)} /></Row>
      )}
      {s.words != null && <WordsRow slideId={slide.id} words={s.words} />}
      {s.accept != null && (
        <>
          <div className="desc">Also accept — one spelling a line. Near spellings count too, in SlideForge’s live session.</div>
          <Area rows={3} value={accept} onChange={(v) => { setAccept(v); apply({ accept: v.split('\n').map((x) => x.trim()).filter(Boolean) }, false, 'accept'); }} />
        </>
      )}
    </Section>
  );
}

/** Mind reveal's words: its content, so the slides are made again from them when they change. */
function WordsRow({ slideId, words }: { slideId: string; words: string[] }) {
  const [text, setText] = useState(words.join('\n'));
  useEffect(() => { setText(words.join('\n')); }, [slideId, words]);
  const next = text.split('\n').map((x) => x.trim()).filter(Boolean);
  const dirty = next.join('|') !== words.join('|');
  return (
    <>
      <div className="desc">The words to remember, one a line — up to 20. Updating makes the study, recall and answer slides again.</div>
      <Area rows={6} value={text} onChange={setText} />
      <button className={`btn-soft tidy${dirty ? ' sp-dirty' : ''}`} disabled={!dirty || !next.length} onClick={() => useStore.getState().mutate((d) => applyGameSettings(d, slideId, { words: next }))}><RefreshCw size={13} />{dirty ? `Update the slides (${next.length} words)` : 'Up to date'}</button>
    </>
  );
}

/**
 * Write the game with AI, as Quiz studio does: a topic, and the game is made again from what comes
 * back — the same format, in the deck's style, where it stood. SlideForge writes and checks the
 * questions (js/ai.js); the lab designs them.
 */
function WriteGame({ gameId, format, label }: { gameId: string; format: string; label: string }) {
  const [topic, setTopic] = useState('');
  const [state, setState] = useState<{ busy?: boolean; msg?: string; bad?: boolean }>({});
  const can = canWrite(format);
  const run = async () => {
    setState({ busy: true, msg: 'Writing the questions…' });
    const [gj] = await Promise.all([import('../../assets/games.json')]);
    const all = ((gj as { default: { games: ShowcaseGame[] } }).default ?? (gj as unknown as { games: ShowcaseGame[] })).games;
    const base = all.find((x) => x.format === format);
    if (!base) { setState({ msg: `${label} is not written by AI yet.`, bad: true }); return; }
    const res = await writeGame(base, topic);
    if (!res.game) { setState({ msg: res.error, bad: true }); return; }
    let first = '';
    useStore.getState().mutate((d) => { first = replaceGame(d, gameId, res.game!)[0]?.id ?? ''; });
    if (first) useStore.setState({ slideId: first, selectedId: null });
    const n = res.game.slides.filter((s) => (s as { type?: string }).type === 'quiz').length;
    setState({ msg: `${label} written on “${topic.trim()}”${n ? `: ${n} ${n === 1 ? 'question' : 'questions'}` : ''}${res.rejected ? ` (${res.rejected} set aside that did not fit the format)` : ''}. Undo brings the last one back.` });
  };
  if (can === 'no-format') return null;
  return (
    <div className="sp-write">
      <div className="desc">{can === 'yes' ? 'Write this game with AI: give it a theme or topic. Its slides are made again from the questions; Undo brings the old ones back.' : 'Writing with AI works when the studio is open inside SlideForge, which holds the AI key.'}</div>
      <Input value={topic} onChange={setTopic} placeholder="Topic, e.g. photosynthesis for Year 9" />
      <button className="btn-soft accent tidy" disabled={can !== 'yes' || state.busy || !topic.trim()} onClick={run}><Sparkles size={13} />{state.busy ? 'Writing…' : 'Generate'}</button>
      {state.msg && <div className={`desc${state.bad ? ' sp-bad' : ''}`}>{state.msg}</div>}
    </div>
  );
}
