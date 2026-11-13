import { BULL, MISS, type Dart, type Multiplier } from '../../game-engine/darts';
import { dartFor, type Zone } from '../../game-engine/extra/zones';
import { useTapGuard } from '../useTapGuard';
import { DartBoard, type Mark } from './DartBoard';
import './ClockInput.css';

interface Props {
  /** Zone imposée : allumée en or sur la cible. */
  target: Zone;
  /** Autres zones à colorer (numéros faits, à éviter…). */
  marks?: Mark[];
  /** Petit texte sous chaque bouton (ex. « 3 pts »), selon la zone touchée. */
  note?: (m: Multiplier) => string;
  /** Libellé du bouton raté (ex. « Raté −14 »). */
  missLabel?: string;
  /** La zone touchée ne change rien (Nine Lives, Bombe…) : un seul bouton « Touché ». */
  anyHit?: boolean;
  disabled: boolean;
  onDart: (dart: Dart) => void;
}

/**
 * Saisie à cible imposée : la cible complète avec la zone à viser en or, et seulement les boutons utiles.
 * Tout le numéro : Simple / Double / Triple / Raté. Zone précise : Touché / Raté. Bull : 25 / 50 / Raté.
 */
export function ZoneInput({ target, marks = [], note, missLabel = 'Raté', anyHit = false, disabled, onDart }: Props) {
  const guard = useTapGuard();
  const hit = guard((m: Multiplier) => onDart(dartFor(target, m)));
  const miss = guard(() => onDart(MISS));
  const bull = target.segment === BULL;
  const buttons: { m: Multiplier; label: string }[] =
    target.ring !== 'any' || anyHit
      ? [{ m: 1, label: 'Touché' }]
      : bull
        ? [
            { m: 1, label: '25' },
            { m: 2, label: '50' },
          ]
        : [
            { m: 1, label: 'Simple' },
            { m: 2, label: 'Double' },
            { m: 3, label: 'Triple' },
          ];
  const layout = buttons.length === 3 ? 'by-zone' : buttons.length === 2 ? 'by-bull' : '';

  return (
    <div className="clock-input">
      <div className="clock-input-target">
        <DartBoard marks={[...marks, { zone: target, tone: 'gold', pulse: true }]} label="Zone à viser" />
      </div>
      <div className={`clock-input-buttons ${layout}`}>
        {buttons.map(({ m, label }) => (
          <button key={m} className="clock-hit" disabled={disabled} onClick={() => hit(m)}>
            ✓ {label}
            {note && <small className="zone-note">{note(target.ring === 'D' ? 2 : target.ring === 'T' ? 3 : m)}</small>}
          </button>
        ))}
        <button className="clock-miss" disabled={disabled} onClick={miss}>
          ✗ {missLabel}
        </button>
      </div>
    </div>
  );
}
