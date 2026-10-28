import { BULL, MISS, type Dart, type Multiplier } from '../../game-engine/darts';
import type { ClockStep } from '../../game-engine/modes/clock';
import type { ClockOptions } from '../../game-engine/types';
import { useTapGuard } from '../useTapGuard';
import { ClockTarget } from './ClockTarget';
import './ClockInput.css';

interface Props {
  options: ClockOptions;
  steps: ClockStep[];
  progress: number;
  disabled: boolean;
  onDart: (dart: Dart) => void;
}

/** Fléchette qui valide l'étape en cours avec la zone donnée (ou celle qu'exige la variante). */
function hitDart(step: ClockStep, options: ClockOptions, multiplier: Multiplier): Dart {
  if ('number' in step) {
    const required = options.required === 'double' ? 2 : options.required === 'triple' ? 3 : multiplier;
    return { segment: step.number, multiplier: required };
  }
  if (step.bull === 25) return { segment: BULL, multiplier: 1 };
  if (step.bull === 50) return { segment: BULL, multiplier: 2 };
  return { segment: BULL, multiplier: options.required === 'any' ? 1 : 2 };
}

/**
 * Saisie de l'Horloge : on indique seulement si la fléchette a touché le numéro à viser.
 * Avec l'option « avance selon la zone », on précise simple, double ou triple.
 */
export function ClockInput({ options, steps, progress, disabled, onDart }: Props) {
  const guard = useTapGuard();
  const step = steps[progress];
  const byZone = options.advanceByMultiplier && options.required === 'any' && step !== undefined && 'number' in step;
  const hit = guard((m: Multiplier) => step && onDart(hitDart(step, options, m)));
  const miss = guard(() => onDart(MISS));

  return (
    <div className="clock-input">
      <div className="clock-input-target">
        <ClockTarget steps={steps} progress={progress} />
      </div>
      <div className={`clock-input-buttons ${byZone ? 'by-zone' : ''}`}>
        {byZone ? (
          ([1, 2, 3] as const).map((m) => (
            <button key={m} className="clock-hit" disabled={disabled} onClick={() => hit(m)}>
              ✓ {m === 1 ? 'Simple' : m === 2 ? 'Double' : 'Triple'}
            </button>
          ))
        ) : (
          <button className="clock-hit" disabled={disabled} onClick={() => hit(1)}>
            ✓ Touché
          </button>
        )}
        <button className="clock-miss" disabled={disabled} onClick={miss}>
          ✗ Raté
        </button>
      </div>
    </div>
  );
}
