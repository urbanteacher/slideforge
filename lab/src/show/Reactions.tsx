// The room's reactions on the wall (live/reactions.ts): each glyph rises over the foot of the slide and is gone, as
// classic's Player.showReaction draws them. Inside the slide, so it is measured in the slide's coordinates, and a
// slide change (the bay is keyed by the slide) takes anything still in the air with it.
import { useEffect, useState } from 'react';
import { REACTION_CLEAR_MS, addGlyph, type Glyph, type Reaction } from '../live';

export function ReactionBay({ reaction, height }: { reaction: Reaction | null; height: number }) {
  const [air, setAir] = useState<Glyph[]>([]);
  useEffect(() => {
    if (!reaction) return;
    setAir((a) => addGlyph(a, reaction));
    // A timer as well as animationend: a hidden tab does not advance animations, so its glyphs would wait there.
    const t = setTimeout(() => setAir((a) => a.filter((g) => g.n !== reaction.n)), REACTION_CLEAR_MS);
    return () => clearTimeout(t);
  }, [reaction]);
  if (!air.length) return null;
  const drop = (n: number) => setAir((a) => a.filter((g) => g.n !== n));
  return (
    <div className="show-reactbay" aria-hidden="true" style={{ ['--k' as string]: `${height / 1080}px` }}>
      {air.map((g) => (
        <div key={g.n} className="show-reaction" onAnimationEnd={() => drop(g.n)}
          style={{ left: `${g.left}%`, ['--drift' as string]: `${g.drift}`, ['--spin' as string]: `${g.spin}deg`, animationDelay: `${g.delay}ms` }}>{g.glyph}</div>
      ))}
    </div>
  );
}
