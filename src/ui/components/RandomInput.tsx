import { BULL, MISS, type Dart, type Multiplier } from '../../game-engine/darts';
import { useTapGuard } from '../useTapGuard';
import { ClockTarget } from './ClockTarget';
import './ClockInput.css';

interface Props {
  /** Numéro tiré pour la manche (25 = Bull). */
  target: number;
  disabled: boolean;
  onDart: (dart: Dart) => void;
}

const ZONES: { m: Multiplier; label: string }[] = [
  { m: 1, label: 'Simple' },
  { m: 2, label: 'Double' },
  { m: 3, label: 'Triple' },
];
const BULLS: { m: Multiplier; label: string }[] = [
  { m: 1, label: '25' },
  { m: 2, label: '50' },
];

/**
 * Saisie du Chiffre aléatoire : la cible dessinée comme à l'Horloge, le numéro tiré allumé,
 * et on indique seulement la zone touchée sur ce numéro (seules ces fléchettes rapportent).
 */
export function RandomInput({ target, disabled, onDart }: Props) {
  const guard = useTapGuard();
  const bull = target === BULL;
  const hit = guard((m: Multiplier) => onDart({ segment: target, multiplier: m }));
  const miss = guard(() => onDart(MISS));
  const zones = bull ? BULLS : ZONES;

  return (
    <div className="clock-input">
      <div className="clock-input-target">
        <ClockTarget steps={[bull ? { bull: 'any' } : { number: target }]} progress={0} />
      </div>
      <div className={`clock-input-buttons ${bull ? 'by-bull' : 'by-zone'}`}>
        {zones.map(({ m, label }) => (
          <button key={m} className="clock-hit" disabled={disabled} onClick={() => hit(m)}>
            ✓ {label}
          </button>
        ))}
        <button className="clock-miss" disabled={disabled} onClick={miss}>
          ✗ Raté
        </button>
      </div>
    </div>
  );
}
