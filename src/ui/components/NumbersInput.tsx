import { MISS, type Dart } from '../../game-engine/darts';
import { useTapGuard } from '../useTapGuard';
import { DartBoard, type Mark } from './DartBoard';
import './ClockInput.css';
import './NumbersInput.css';

interface Props {
  /** Numéros encore à toucher : un gros bouton chacun. */
  numbers: number[];
  marks: Mark[];
  disabled: boolean;
  onDart: (dart: Dart) => void;
}

/** Saisie « plusieurs numéros à toucher dans n'importe quel ordre » (Pyramide) : un bouton par numéro restant, plus Raté. */
export function NumbersInput({ numbers, marks, disabled, onDart }: Props) {
  const guard = useTapGuard();
  const hit = guard((n: number) => onDart({ segment: n, multiplier: 1 }));
  const miss = guard(() => onDart(MISS));
  return (
    <div className="clock-input">
      <div className="clock-input-target">
        <DartBoard marks={marks} label="Numéros à toucher" />
      </div>
      <div className="numbers-input">
        {numbers.map((n) => (
          <button key={n} className="clock-hit" disabled={disabled} onClick={() => hit(n)}>
            ✓ {n}
          </button>
        ))}
        <button className="clock-miss" disabled={disabled} onClick={miss}>
          ✗ Raté
        </button>
      </div>
    </div>
  );
}
