// The join card (J): the room's PIN, address and QR over the slide mid-lesson, for latecomers, as classic's join panel
// brought them back. J, Esc or a click closes it.

import { useMemo } from 'react';
import { qrSvg } from './qr';
import type { Wall } from './wallModel';

export function JoinCard({ join, players, onClose }: { join: NonNullable<Wall['join']>; players: number; onClose: () => void }) {
  const qr = useMemo(() => { try { return qrSvg(join.link, { quiet: 2, title: `Join the lesson at ${join.link}` }); } catch { return ''; } }, [join.link]);
  return (
    <div className="join-card" role="dialog" aria-label="Join the lesson" data-testid="join-card" onClick={onClose}>
      <div className="join-card-body">
        <div>
          <p className="lobby-line">Join at <b className="lobby-url">{join.address}</b></p>
          <p className="lobby-line">PIN <b className="lobby-pin">{join.pin}</b></p>
          <p className="lobby-count">{players} {players === 1 ? 'player' : 'players'} in · J or Esc closes this</p>
        </div>
        {qr && <div className="lobby-qr" dangerouslySetInnerHTML={{ __html: qr }} />}
      </div>
    </div>
  );
}
