// What the lesson's mechanic draws on the wall beside the question (live/mechanics.ts, wallModel.ts `mech`): the Horse race's
// track, the Boss battle's health bar with the last blow, and the Word reveal's dripping word. Real text and a meter, in HTML
// over the slide (hard rule 4), never painted into the canvas. The track shows the leaders when there are many lanes.

import type { WallMech } from './wallModel';

const LANES = 8;

function RaceTrack({ race }: { race: NonNullable<WallMech['race']> }) {
  const shown = race.lanes.slice(0, LANES);
  return (
    <section className="wall-mech mech-race" aria-label="The race" data-testid="race">
      <h3>{race.title}</h3>
      <ol role="list">
        {shown.map((l) => (
          <li key={l.key} className={`${l.moved ? 'moved' : ''}${race.winners.includes(l.key) ? ' won' : ''}`} style={{ ['--team' as string]: l.color, ['--at' as string]: String(Math.min(1, l.pos / race.length)) }} data-testid="lane">
            <span className="mech-name">{l.name}</span>
            <span className="mech-track" aria-hidden="true"><i className="mech-runner" /></span>
            <b className="mech-pos">{l.pos} / {race.length}</b>
          </li>
        ))}
      </ol>
      {race.lanes.length > LANES && <p className="mech-more">+{race.lanes.length - LANES} more</p>}
      {race.note && <p className="mech-note" role="status" aria-live="polite" data-testid="race-note">{race.note}</p>}
    </section>
  );
}

function BossBar({ boss }: { boss: NonNullable<WallMech['boss']> }) {
  const pct = boss.max > 0 ? Math.round((boss.hp / boss.max) * 100) : 0;
  return (
    <section className={`wall-mech mech-boss${boss.hit ? ' hit' : ''}${boss.hp <= 0 ? ' down' : ''}`} aria-label="The boss" data-testid="boss">
      <h3>{boss.title}</h3>
      <div className="mech-hp" role="meter" aria-label="Boss health" aria-valuemin={0} aria-valuemax={boss.max} aria-valuenow={boss.hp} aria-valuetext={`${boss.hp} of ${boss.max} HP`}>
        <span style={{ width: `${pct}%` }} />
      </div>
      <p className="mech-hp-text" data-testid="boss-hp">{boss.hp} / {boss.max} HP</p>
      {boss.note && <p className="mech-note" role="status" aria-live="polite" data-testid="boss-note">{boss.note}</p>}
      {boss.attack && <p className="mech-attack" data-testid="boss-attack">{boss.attack}</p>}
    </section>
  );
}

/** The word, a letter to a cell, the open ones lit; the hint under it. Not announced letter by letter. */
function DripWord({ drip }: { drip: NonNullable<WallMech['drip']> }) {
  return (
    <section className="wall-mech mech-drip" aria-label="The word" data-testid="drip">
      <p className="mech-word" aria-live="off" data-testid="drip-word">
        {[...drip.mask].map((c, i) => (c === ' ' ? <span key={i} className="mech-gap" /> : <span key={i} className={c === '_' ? 'closed' : 'open'}>{c === '_' ? '' : c}</span>))}
      </p>
      {drip.hint && <p className="mech-hint">Hint: {drip.hint}</p>}
      <p className="mech-count" data-testid="drip-count">{drip.shown} of {drip.total} letters</p>
    </section>
  );
}

/** The mechanic's views for a question on the wall, or for the scores. */
export function MechanicViews({ mech, scores = false }: { mech: WallMech; scores?: boolean }) {
  return (
    <>
      {mech.race && <RaceTrack race={mech.race} />}
      {mech.boss && <BossBar boss={mech.boss} />}
      {!scores && mech.drip && <DripWord drip={mech.drip} />}
    </>
  );
}
