// The deck-level mechanics of the room (lab-engine-plan M8): the Horse race's track and the Boss battle's HP belong to the
// lesson, not to one question. The room takes the mechanic from the first game in the lesson, and every question the room
// asks takes part, as classic's (js/live.js advanceRace, advanceBoss). The host keeps one of these across the questions and
// feeds it the relay's `teamAnswers` after each reveal. Pure: no socket, no DOM, nothing sent from here.

import { bossDamage, bossMaxHp } from '@sf/games/boss.js';
import type { PlayerRow } from './protocol';
import { teamColor } from './teams';
import type { RoomQuiz } from './show';

/** What the lesson's lead game makes of the room. */
export type Mechanic = 'race' | 'boss' | 'wordreveal' | 'points';

/** A track's length: 3 to 12 steps, 5 when the game does not say (src/model.js normalizeGameSettings). */
export const trackLengthOf = (v: unknown): number => Math.max(3, Math.min(12, Math.round(Number(v)) || 5));

// ---- the race

export interface RaceLane { key: string; name: string; color: string; pos: number; moved: boolean }
/** The track as the wall draws it. */
export interface RaceView { length: number; lanes: RaceLane[]; winners: string[]; title: string; note: string }

const sum = (row: number[]): number => row.reduce((a, b) => a + b, 0);

/** The team's pick when most of its members agree: the option picked by more of them than any other, or -1 on a tie or when nobody answered. */
function teamPick(row: number[]): number {
  let best = -1, at = -1, tied = false;
  row.forEach((n, i) => {
    if (n > best) { best = n; at = i; tied = false; } else if (n === best && n > 0) tied = true;
  });
  return tied ? -1 : at;
}

export class Race {
  private pos: Record<string, number> = {};
  private winners: string[] = [];
  constructor(readonly length: number) {}

  /** The lanes in race order (leaders first, ties in the room's order), with where each stands. */
  lanes(mode: string, teams: string[], players: PlayerRow[]): { key: string; name: string; color: string; pos: number }[] {
    const lanes = mode === 'teams'
      ? teams.map((name, i) => ({ key: `t${i}`, name, color: teamColor(i), pos: this.pos[`t${i}`] ?? 0 }))
      : players.map((p, i) => ({ key: `p${p.id}`, name: p.name, color: teamColor(i), pos: this.pos[`p${p.id}`] ?? 0 }));
    return lanes.sort((a, b) => b.pos - a.pos);
  }

  private behind(p: PlayerRow): number { return Math.min(this.length, Math.max(0, p.correct ?? 0)); }

  /** An individual race runs on the players' own right-answer counts, which the relay sends after `teamAnswers`: is any lane behind them? */
  stale(mode: string, players: PlayerRow[]): boolean {
    return mode !== 'teams' && players.some((p) => this.behind(p) !== (this.pos[`p${p.id}`] ?? 0));
  }

  /** Move each lane that earned it: a team whose members mostly picked the right answer (a tie does not move it), a player to their count. Returns the lanes that moved. */
  advance(mode: string, teams: string[], players: PlayerRow[], counts: number[][], correct: number): string[] {
    const moved: string[] = [];
    const win = (key: string) => { if (this.winners.indexOf(key) === -1) this.winners.push(key); };
    if (mode === 'teams') {
      teams.forEach((_, i) => {
        const row = counts[i] ?? [];
        if (!sum(row)) return; // nobody on this team answered
        if (teamPick(row) !== Number(correct)) return;
        const key = `t${i}`;
        if ((this.pos[key] ?? 0) >= this.length) return; // already home
        this.pos[key] = (this.pos[key] ?? 0) + 1;
        moved.push(key);
        if (this.pos[key] >= this.length) win(key);
      });
    } else {
      for (const p of players) {
        const key = `p${p.id}`, now = this.behind(p);
        if (now > (this.pos[key] ?? 0)) moved.push(key);
        this.pos[key] = now;
        if (now >= this.length) win(key);
      }
    }
    return moved;
  }

  /** The track after a reveal (classic showTrack). */
  view(mode: string, teams: string[], players: PlayerRow[], moved: string[]): RaceView {
    const lanes = this.lanes(mode, teams, players).map((l) => ({ ...l, moved: moved.includes(l.key) }));
    const done = this.winners.length > 0, n = moved.length;
    const who = mode === 'teams' ? (n === 1 ? ' team moves up' : ' teams move up') : (n === 1 ? ' runner moves up' : ' runners move up');
    return { length: this.length, lanes, winners: [...this.winners], title: done ? 'Photo finish!' : 'The race', note: done ? this.winnerNote(lanes) : n ? n + who : 'Nobody moved — nothing scored that round' };
  }

  private winnerNote(lanes: { key: string; name: string }[]): string {
    const names = this.winners.map((k) => lanes.find((l) => l.key === k)?.name ?? k);
    return names.length === 1 ? `${names[0]} is past the post` : `${names.join(' and ')} finish together`;
  }

  /** The result when the lesson's scores come up: who is past the post, else who is furthest along (classic's `Race result`). */
  result(mode: string, teams: string[], players: PlayerRow[]): RaceView {
    const lanes = this.lanes(mode, teams, players).map((l) => ({ ...l, moved: false }));
    const note = this.winners.length ? this.winnerNote(lanes) : lanes.length ? `${lanes[0].name} finishes furthest along` : '';
    return { length: this.length, lanes, winners: this.winners.length ? [...this.winners] : lanes[0] ? [lanes[0].key] : [], title: 'Result', note };
  }
}

// ---- the boss

/** The boss as the wall draws it: its health, and what the last reveal did to it. */
export interface BossView { hp: number; max: number; title: string; note: string; hit: boolean; damage: number; prevHp: number; attack: string }

/** The damage a right answer deals on this question: its own, else by its difficulty. */
export const damageOf = (q: { [field: string]: unknown }): number => Number(q.bossDamage) || bossDamage(q.difficulty) || 2;

/** The boss's HP for a lesson: its own game's questions only, each by its difficulty; two a question when nothing says. */
export function bossHpOf(qs: { [field: string]: unknown }[]): number {
  return bossMaxHp(qs.map((q) => ({ difficulty: q.difficulty || 'medium' }))) || Math.max(1, qs.length * 2);
}

/** What the report keeps of a hit or a miss (the `oral` frame's fields beside the slide). */
export interface BossVerdict { term: string; right: boolean; value: number }

export class Boss {
  hp: number;
  constructor(readonly max: number) { this.hp = max; }

  /** The room hits when a team's members mostly picked the right answer (any team), or most of an individual room did. */
  private hit(mode: string, counts: number[][], correct: number, answers: { response: unknown }[]): boolean {
    const c = Number(correct);
    if (!Number.isInteger(c) || c < 0) return false;
    if (mode === 'teams') return counts.some((row) => sum(row ?? []) > 0 && teamPick(row ?? []) === c);
    const rights = answers.filter((a) => Number(a.response) === c).length;
    return answers.length > 0 && rights * 2 > answers.length;
  }

  /** The room's accuracy, said as the attack: a count, never a name. */
  private attack(mode: string, counts: number[][], correct: number, answers: { response: unknown }[]): string {
    const c = Number(correct);
    if (mode === 'teams') {
      const rows = counts.filter((row) => sum(row ?? []) > 0);
      const agreed = rows.filter((row) => teamPick(row) === c && row[c] === Math.max(...row)).length;
      return rows.length ? `The attack: ${agreed} of ${rows.length} teams agreed on the right answer` : '';
    }
    const right = answers.filter((a) => Number(a.response) === c).length;
    return answers.length ? `The attack: ${right} of ${answers.length} right (${Math.round((right / answers.length) * 100)}%)` : '';
  }

  /** A reveal's blow (classic advanceBoss): the view for the wall, and what the report is told. `n` is the question's number in the lesson. */
  strike(q: RoomQuiz, n: number, mode: string, counts: number[][], correct: number, answers: { response: unknown }[]): { view: BossView; verdict: BossVerdict } {
    const damage = damageOf(q);
    const hit = this.hit(mode, counts, correct, answers);
    const prevHp = this.hp;
    let note: string;
    if (hit && this.hp > 0) {
      this.hp = Math.max(0, this.hp - damage);
      note = `Hit! −${damage} · ${this.hp} / ${this.max} HP left`;
    } else if (this.hp <= 0) note = 'Boss already defeated';
    else note = `Miss — boss still at ${this.hp} / ${this.max} HP`;
    return {
      view: { ...this.view(note, hit), damage: hit && prevHp > 0 ? Math.min(damage, prevHp) : 0, prevHp, attack: this.attack(mode, counts, correct, answers) },
      verdict: { term: `Q${n} · ${String(q.difficulty || 'medium')} · ${this.hp}/${this.max} HP left`, right: hit, value: hit ? damage : 0 },
    };
  }

  view(note: string, hit = false): BossView {
    return { hp: this.hp, max: this.max, title: this.hp <= 0 ? 'Boss defeated!' : 'Boss battle', note, hit, damage: 0, prevHp: this.hp, attack: '' };
  }

  /** What the scores slide says. */
  result(): string { return this.hp <= 0 ? 'The room brought the boss down' : `Boss survived at ${this.hp} / ${this.max} HP`; }
}

// ---- the word

/** The word as it drips onto the wall: the mask, the hint, and how many of its letters are open. */
export interface DripView { id: string; word: string; mask: string; hint: string; shown: number; total: number }
