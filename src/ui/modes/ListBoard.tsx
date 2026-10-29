import { playerFor } from '../../game-engine/engine';
import type { ViewContext } from './types';

interface Row {
  value: string | number;
  detail?: string;
}

/** Tableau en lignes, un côté par ligne : utilisé par 301/501/701, Horloge et Chiffre aléatoire. */
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
        return (
          <li key={side.id} className={active ? 'active' : ''} style={{ borderLeftColor: side.color ?? 'transparent' }}>
            <span className="board-name">
              {ctx.sideName(i)}
              {state.config.teamMode && next && <span className="board-sub"> · {ctx.nameOf(next)}</span>}
            </span>
            {r.detail && <span className="board-avg">{r.detail}</span>}
            <span className="board-score">{r.value}</span>
          </li>
        );
      })}
    </ol>
  );
}
