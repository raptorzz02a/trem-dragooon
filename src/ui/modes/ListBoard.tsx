import type { ReactNode } from 'react';
import { formatDart } from '../../game-engine/darts';
import { playerFor } from '../../game-engine/engine';
import type { ViewContext } from './types';

interface Row {
  value: string | number;
  detail?: string;
  /** Repères propres au jeu (numéro, vies, badges), avant le score. */
  extra?: ReactNode;
  /** Côté éliminé : ligne grisée. */
  out?: boolean;
}

/** Tableau en lignes, un côté par ligne : utilisé par 301/501/701, Horloge, Chiffre aléatoire et Entraînement. */
export function ListBoard({ ctx, row }: { ctx: ViewContext; row: (sideIndex: number) => Row }) {
  const { state } = ctx;
  const current = state.current;
  return (
    <ol className="board">
      {state.config.sides.map((side, i) => {
        const active = current?.sideIndex === i;
        // Joueur qui lancera la prochaine volée de ce côté.
        const next = current ? playerFor(state.config, i, current.round + (i < current.sideIndex ? 1 : 0)) : '';
        const r = row(i);
        // Dernière volée terminée de ce côté : reste visible quand la main passe (saisie par caméra surtout).
        const last = [...state.turns].reverse().find((t) => t.sideIndex === i);
        return (
          <li
            key={side.id}
            className={`${active ? 'active' : ''}${r.out ? ' out' : ''}`}
            style={{ borderLeftColor: side.color ?? 'transparent' }}
          >
            <span className="board-name">
              {ctx.sideName(i)}
              {state.config.teamMode && next && <span className="board-sub"> · {ctx.nameOf(next)}</span>}
            </span>
            {last && (
              <span className={`board-last ${last.outcome === 'bust' ? 'bust' : ''}`} title="Dernière volée">
                {last.darts.map((d, k) => (
                  <span key={k} className={d.dart.segment === 0 ? 'zero' : ''}>
                    {formatDart(d.dart)}
                  </span>
                ))}
              </span>
            )}
            {r.extra}
            {r.detail && <span className="board-avg">{r.detail}</span>}
            <span className="board-score">{r.value}</span>
          </li>
        );
      })}
    </ol>
  );
}
