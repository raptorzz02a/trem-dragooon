import { BOARD_ORDER } from '../../game-engine/modes/clock';
import './KillerBoard.css';

/** État d'un numéro sur la cible du Killer. */
export type KillerMark = 'aim-double' | 'self' | 'target' | 'killer' | 'out';

interface Props {
  /** Numéro → état ; les numéros absents ne sont à personne. */
  marks: Partial<Record<number, KillerMark>>;
  label?: string;
}

// Rayons des anneaux (cible officielle à l'échelle : double à l'extérieur, triple au milieu).
const R = { bullseye: 6, bull: 14, triple: [50, 58], double: [80, 88], label: 97 } as const;

function point(r: number, deg: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180;
  return [r * Math.cos(a), r * Math.sin(a)];
}

/** Morceau d'anneau entre deux rayons, centré sur l'angle du numéro (18° par numéro, le 20 en haut). */
function arc(center: number, r1: number, r2: number): string {
  const [x1, y1] = point(r2, center - 9);
  const [x2, y2] = point(r2, center + 9);
  const [x3, y3] = point(r1, center + 9);
  const [x4, y4] = point(r1, center - 9);
  return `M${x1},${y1} A${r2},${r2} 0 0 1 ${x2},${y2} L${x3},${y3} A${r1},${r1} 0 0 0 ${x4},${y4} Z`;
}

/**
 * Cible complète du Killer, avec simples, triples et doubles.
 * Avant d'être Killer : son double brille en or. Ensuite : les numéros à abattre s'allument
 * (en rouge ceux des Killers adverses), son propre numéro reste marqué pour qu'on l'évite.
 */
export function KillerBoard({ marks, label = 'Cible du Killer' }: Props) {
  return (
    <svg className="killer-board" viewBox="-110 -110 220 220" role="img" aria-label={label}>
      <circle r="104" className="kb-rim" />
      {BOARD_ORDER.map((n, i) => {
        const angle = i * 18;
        const [lx, ly] = point(R.label, angle);
        const mark = marks[n];
        const parity = i % 2 ? 'odd' : 'even';
        return (
          <g key={n} className={`kb-seg kb-${parity}${mark ? ` kb-${mark}` : ''}`}>
            <path className="kb-single" d={arc(angle, R.bull, R.triple[0])} />
            <path className="kb-ring kb-triple" d={arc(angle, R.triple[0], R.triple[1])} />
            <path className="kb-single" d={arc(angle, R.triple[1], R.double[0])} />
            <path className="kb-ring kb-double" d={arc(angle, R.double[0], R.double[1])} />
            <text x={lx} y={ly} dominantBaseline="central" textAnchor="middle">
              {n}
            </text>
          </g>
        );
      })}
      <circle r={R.bull} className="kb-bull" />
      <circle r={R.bullseye} className="kb-bullseye" />
    </svg>
  );
}
