import { BULL, MISS, type Dart, type Multiplier } from '../../game-engine/darts';
import type { HalveTarget } from '../../game-engine/types';
import { useTapGuard } from '../useTapGuard';
import { ClockTarget } from './ClockTarget';
import './ClockInput.css';

interface Props {
  /** Cible imposée : un numéro (toute zone, ou double/triple exigé) ou le Bull. */
  target: HalveTarget;
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
 * Saisie à cible imposée (Halve It…) : la cible dessinée, la zone à viser allumée.
 * Toute zone : Simple / Double / Triple / Raté. Double ou triple exigé : Touché / Raté. Bull : 25 / 50 / Raté.
 */
export function TargetInput({ target, disabled, onDart }: Props) {
  const guard = useTapGuard();
  const bull = target.segment === BULL;
  const hit = guard((m: Multiplier) => onDart({ segment: target.segment, multiplier: m }));
  const miss = guard(() => onDart(MISS));
  const zones = bull ? BULLS : target.multiplier ? [{ m: target.multiplier, label: 'Touché' }] : ZONES;
  const layout = bull ? 'by-bull' : target.multiplier ? '' : 'by-zone';

  return (
    <div className="clock-input">
      <div className="clock-input-target">
        <ClockTarget steps={[bull ? { bull: 'any' } : { number: target.segment }]} progress={0} />
      </div>
      <div className={`clock-input-buttons ${layout}`}>
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
