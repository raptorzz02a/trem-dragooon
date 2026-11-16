import { useMemo, useState } from 'react';
import { heatmapOfTurns } from '../../profiles/heatmap';
import { recap } from '../../profiles/recap';
import type { ViewContext } from '../modes/types';
import { DartHeatmap } from './DartHeatmap';
import './TrainingRecap.css';

const fr = (n: number, digits = 1) => n.toLocaleString('fr-FR', { maximumFractionDigits: digits });
const pct = (n: number) => `${fr(n, 0)} %`;
const zoneName = (z: string) => (z === '0' ? 'Raté' : z === '25' ? 'Bull 25' : z === '50' ? 'Bull 50' : z);

/** Bilan de la partie d'entraînement qui vient de se jouer, joueur par joueur. */
export function TrainingRecap({ ctx }: { ctx: ViewContext }) {
  const { state } = ctx;
  const playerIds = useMemo(() => {
    const first = state.ranking[0]?.sideIndex ?? 0;
    const order = [first, ...state.config.sides.map((_, i) => i).filter((i) => i !== first)];
    return order.flatMap((i) => state.config.sides[i]!.playerIds);
  }, [state]);
  const [picked, setPicked] = useState<string | null>(null);
  const playerId = picked && playerIds.includes(picked) ? picked : playerIds[0]!;
  const turns = useMemo(() => state.turns.filter((t) => t.playerId === playerId), [state.turns, playerId]);
  const r = useMemo(() => recap(turns), [turns]);
  const map = useMemo(() => heatmapOfTurns(turns), [turns]);

  const rings: [string, number][] = [
    ['Simples', r.rings.single],
    ['Doubles', r.rings.double],
    ['Triples', r.rings.triple],
    ['Bull', r.rings.bull],
    ['Ratés', r.rings.miss],
  ];

  return (
    <section className="recap" aria-label="Statistiques de la partie">
      {playerIds.length > 1 && (
        <div className="segmented recap-players">
          {playerIds.map((id) => (
            <button key={id} className={id === playerId ? 'selected' : ''} onClick={() => setPicked(id)}>
              {ctx.nameOf(id)}
            </button>
          ))}
        </div>
      )}
      <div className="recap-body">
        <div className="recap-map">
          <DartHeatmap data={map} table={false} />
          {map.manual > 0 && (
            <div className="recap-note">
              {map.points.length
                ? `${map.manual} fléchette${map.manual > 1 ? 's' : ''} saisie${map.manual > 1 ? 's' : ''} à la main, hors carte`
                : 'Aucune fléchette vue par la caméra : la carte reste vide'}
            </div>
          )}
        </div>
        <div className="recap-stats">
          <div className="recap-tiles">
            <div className="recap-tile">
              <span className="recap-value">{r.points}</span>
              <span className="recap-label">Score total</span>
            </div>
            <div className="recap-tile">
              <span className="recap-value">{r.darts}</span>
              <span className="recap-label">Fléchettes lancées</span>
            </div>
            <div className="recap-tile">
              <span className="recap-value">{r.avg3 === null ? '–' : fr(r.avg3)}</span>
              <span className="recap-label">Moyenne (3 fl.)</span>
            </div>
            <div className="recap-tile">
              <span className="recap-value">{r.bestVolley ?? '–'}</span>
              <span className="recap-label">Plus haute volée</span>
            </div>
          </div>
          <div className="recap-rings">
            {rings.map(([label, value]) => (
              <div key={label} className="recap-ring">
                <span className="recap-ring-label">{label}</span>
                <span className="recap-bar">
                  <span style={{ width: `${value}%` }} />
                </span>
                <span className="recap-ring-value">{pct(value)}</span>
              </div>
            ))}
          </div>
          {r.zones.length > 0 && (
            <div className="recap-zones">
              <div className="recap-label">Secteurs touchés</div>
              <div className="recap-chips">
                {r.zones.map((z) => (
                  <span key={z.zone} className={`recap-chip ${z.zone === '0' ? 'miss' : ''}`}>
                    <strong>{zoneName(z.zone)}</strong> {pct(z.share)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
