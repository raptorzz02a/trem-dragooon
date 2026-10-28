import { useState } from 'react';
import { BULL, MISS, type Dart, type Multiplier } from '../../game-engine/darts';
import { useTapGuard } from '../useTapGuard';
import './ScorePad.css';

const MULTIPLIERS: { value: Multiplier; label: string }[] = [
  { value: 1, label: 'Simple' },
  { value: 2, label: 'Double' },
  { value: 3, label: 'Triple' },
];

interface Props {
  disabled: boolean;
  onDart: (dart: Dart) => void;
}

/**
 * Saisie en deux étapes : on choisit la zone (Simple par défaut), puis le numéro.
 * L'appui sur le numéro enregistre la fléchette et la zone revient à Simple.
 */
export function ScorePad({ disabled, onDart }: Props) {
  const [multiplier, setMultiplier] = useState<Multiplier>(1);
  const guard = useTapGuard();

  const throwDart = guard((dart: Dart) => {
    onDart(dart);
    setMultiplier(1);
  });

  return (
    <div className={`pad pad-m${multiplier}`}>
      <div className="pad-step label">1. Choisir la zone</div>
      <div className="pad-multipliers">
        {MULTIPLIERS.map((m) => (
          <button
            key={m.value}
            className={`pad-mult pad-mult-${m.value} ${multiplier === m.value ? 'selected' : ''}`}
            disabled={disabled}
            onClick={() => setMultiplier(m.value)}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="pad-step label">2. Choisir le numéro</div>
      <div className="pad-numbers">
        {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
          <button key={n} className="pad-num" disabled={disabled} onClick={() => throwDart({ segment: n, multiplier })}>
            {multiplier > 1 && <span className="pad-prefix">{multiplier === 2 ? 'D' : 'T'}</span>}
            {n}
          </button>
        ))}
      </div>
      <div className="pad-specials">
        <button className="pad-bull25" disabled={disabled} onClick={() => throwDart({ segment: BULL, multiplier: 1 })}>
          Bull 25
        </button>
        <button className="pad-bull50" disabled={disabled} onClick={() => throwDart({ segment: BULL, multiplier: 2 })}>
          Bull 50
        </button>
        <button className="pad-miss" disabled={disabled} onClick={() => throwDart(MISS)}>
          Raté 0
        </button>
      </div>
    </div>
  );
}
