import { useState } from 'react';
import { MISS, type Dart, type Multiplier } from '../../game-engine/darts';
import { alive, type KillerState } from '../../game-engine/extra/killer';
import type { ViewContext } from '../modes/types';
import { Hearts } from '../modes/extra/killerView';
import { useTapGuard } from '../useTapGuard';
import { KillerBoard, type KillerMark } from './KillerBoard';
import './KillerInput.css';

interface Props {
  ctx: ViewContext;
  disabled: boolean;
  onDart: (dart: Dart) => void;
}

const ZONES: { m: Multiplier; label: string }[] = [
  { m: 1, label: 'Simple' },
  { m: 2, label: 'Double' },
  { m: 3, label: 'Triple' },
];

/**
 * Saisie du Killer : on choisit la zone, puis le joueur dont on a touché le numéro.
 * Tout autre numéro ne fait rien : un seul bouton « Autre numéro / Raté ».
 */
export function KillerInput({ ctx, disabled, onDart }: Props) {
  const guard = useTapGuard();
  const [zone, setZone] = useState<Multiplier>(1);
  const k = ctx.state.mode as KillerState;
  const me = ctx.state.current?.sideIndex ?? -1;
  const send = guard((dart: Dart) => {
    onDart(dart);
    setZone(1);
  });
  const sides = k.numbers.map((n, i) => ({ n, i })).filter(({ i }) => alive(k, i));
  // Cible : avant d'être Killer, son double à viser ; ensuite les numéros des adversaires (en rouge les Killers).
  const iAmKiller = me >= 0 && k.killer[me];
  const marks: Partial<Record<number, KillerMark>> = {};
  k.numbers.forEach((n, i) => {
    if (!alive(k, i)) marks[n] = 'out';
    else if (i === me) marks[n] = iAmKiller ? 'self' : 'aim-double';
    else if (iAmKiller) marks[n] = k.killer[i] ? 'killer' : 'target';
  });

  return (
    <div className="killer-input">
      <div className="killer-zones segmented">
        {ZONES.map(({ m, label }) => (
          <button key={m} className={zone === m ? 'selected' : ''} disabled={disabled} onClick={() => setZone(m)}>
            {label}
          </button>
        ))}
      </div>
      <div className="killer-players">
        {sides.map(({ n, i }) => (
          <button
            key={i}
            className={`killer-player${i === me ? ' me' : ''}`}
            disabled={disabled}
            onClick={() => send({ segment: n, multiplier: zone })}
          >
            <span className="killer-number">
              {zone === 2 ? 'D' : zone === 3 ? 'T' : ''}
              {n}
            </span>
            <span className="killer-name">{i === me ? `${ctx.sideName(i)} (toi)` : ctx.sideName(i)}</span>
            <Hearts lives={k.lives[i]!} max={k.maxLives} />
            {k.killer[i] && <span className="board-chip gold">KILLER</span>}
          </button>
        ))}
      </div>
      <div className="killer-target">
        <KillerBoard marks={marks} label={iAmKiller ? 'Numéros à abattre' : 'Ton double à viser'} />
      </div>
      <button className="clock-miss killer-miss" disabled={disabled} onClick={() => send(MISS)}>
        ✗ Autre numéro / Raté
      </button>
    </div>
  );
}
