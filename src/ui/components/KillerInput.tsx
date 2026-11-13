import { useState } from 'react';
import { MISS, type Dart, type Multiplier } from '../../game-engine/darts';
import type { ViewContext } from '../modes/types';
import { Hearts } from '../modes/extra/killerView';
import { useTapGuard } from '../useTapGuard';
import { DartBoard, type Mark } from './DartBoard';
import './KillerInput.css';

export interface PlayerButton {
  side: number;
  number: number;
  lives: number;
  maxLives: number;
  killer?: boolean;
}

interface Props {
  ctx: ViewContext;
  players: PlayerButton[];
  /** Cible dessinée sous les boutons. */
  marks: Mark[];
  /** Seul le double compte (Killer Doubles) : pas de choix de zone. */
  doublesOnly?: boolean;
  disabled: boolean;
  onDart: (dart: Dart) => void;
}

const ZONES: { m: Multiplier; label: string }[] = [
  { m: 1, label: 'Simple' },
  { m: 2, label: 'Double' },
  { m: 3, label: 'Triple' },
];

/**
 * Saisie des jeux « à numéros de joueurs » (Killer, Killer Doubles) : on choisit la zone, puis le joueur dont on a
 * touché le numéro. Tout autre numéro ne fait rien : un seul bouton « Autre numéro / Raté ».
 */
export function KillerInput({ ctx, players, marks, doublesOnly = false, disabled, onDart }: Props) {
  const guard = useTapGuard();
  const [zone, setZone] = useState<Multiplier>(doublesOnly ? 2 : 1);
  const me = ctx.state.current?.sideIndex ?? -1;
  const send = guard((dart: Dart) => {
    onDart(dart);
    setZone(doublesOnly ? 2 : 1);
  });

  return (
    <div className="killer-input">
      {!doublesOnly && (
        <div className="killer-zones segmented">
          {ZONES.map(({ m, label }) => (
            <button key={m} className={zone === m ? 'selected' : ''} disabled={disabled} onClick={() => setZone(m)}>
              {label}
            </button>
          ))}
        </div>
      )}
      <div className="killer-players">
        {players.map((p) => (
          <button
            key={p.side}
            className={`killer-player${p.side === me ? ' me' : ''}`}
            disabled={disabled}
            onClick={() => send({ segment: p.number, multiplier: zone })}
          >
            <span className="killer-number">
              {zone === 2 ? 'D' : zone === 3 ? 'T' : ''}
              {p.number}
            </span>
            <span className="killer-name">{p.side === me ? `${ctx.sideName(p.side)} (toi)` : ctx.sideName(p.side)}</span>
            <Hearts lives={p.lives} max={p.maxLives} />
            {p.killer && <span className="board-chip gold">KILLER</span>}
          </button>
        ))}
      </div>
      <div className="killer-target">
        <DartBoard marks={marks} />
      </div>
      <button className="clock-miss killer-miss" disabled={disabled} onClick={() => send(MISS)}>
        ✗ Autre numéro / Raté
      </button>
    </div>
  );
}
