import { useMemo, useState } from 'react';
import { BOARD_ORDER } from '../../game-engine/modes/clock';
import type { Heatmap } from '../../profiles/heatmap';
import { DataTable } from './Charts';
import './DartHeatmap.css';

// Cible aux vraies dimensions, en mm (cible de 451 mm, double extérieur à 170 mm), le 20 en haut.
const R = { bullseye: 7.15, bull: 16.7, trebleIn: 97.4, trebleOut: 107.4, doubleIn: 160, doubleOut: 170, label: 194 };

function point(r: number, deg: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180;
  return [r * Math.cos(a), r * Math.sin(a)];
}

/** Portion d'anneau entre deux rayons, centrée sur l'angle donné (18° par numéro). */
function band(r1: number, r2: number, center: number): string {
  const [x1, y1] = point(r2, center - 9);
  const [x2, y2] = point(r2, center + 9);
  const [x3, y3] = point(r1, center + 9);
  const [x4, y4] = point(r1, center - 9);
  return `M${x1},${y1} A${r2},${r2} 0 0 1 ${x2},${y2} L${x3},${y3} A${r1},${r1} 0 0 0 ${x4},${y4} Z`;
}

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`;
const zoneName = (z: string) => (z === '0' ? 'Hors cible' : z === '25' ? 'Bull 25' : z === '50' ? 'Bull 50' : z);

/** Heat map : halo de densité et point par fléchette vue par la caméra. Touchez une zone pour son détail. */
export function DartHeatmap({ data }: { data: Heatmap }) {
  const [active, setActive] = useState<string | null>(null);
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of data.points) m.set(p.zone, (m.get(p.zone) ?? 0) + 1);
    return m;
  }, [data.points]);
  const n = data.points.length;
  const tip = (zone: string) => {
    const c = counts.get(zone) ?? 0;
    return `${zoneName(zone)} : ${plural(c, 'fléchette')}${n ? ` (${Math.round((100 * c) / n)} %)` : ''}`;
  };
  const zoneProps = (zone: string, className: string) => ({
    className: `hm-zone ${className} ${active === zone ? 'active' : ''}`,
    onClick: () => setActive(active === zone ? null : zone),
  });
  const ranked = [...counts].sort((a, b) => b[1] - a[1]);

  return (
    <figure className="heatmap">
      <svg viewBox="-225 -225 450 450" role="img" aria-label={`Impacts de ${plural(n, 'fléchette')} sur la cible`}>
        <defs>
          <filter id="hm-blur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="9" />
          </filter>
        </defs>
        <circle r="224" className="hm-rim" onClick={() => setActive(null)} />
        {BOARD_ORDER.map((num, i) => {
          const angle = i * 18;
          const odd = i % 2 ? 'odd' : 'even';
          const [lx, ly] = point(R.label, angle);
          return (
            <g key={num}>
              <path d={band(R.bull, R.trebleIn, angle)} {...zoneProps(`S${num}`, `hm-single ${odd}`)} />
              <path d={band(R.trebleIn, R.trebleOut, angle)} {...zoneProps(`T${num}`, `hm-ring ${odd}`)} />
              <path d={band(R.trebleOut, R.doubleIn, angle)} {...zoneProps(`S${num}`, `hm-single ${odd}`)} />
              <path d={band(R.doubleIn, R.doubleOut, angle)} {...zoneProps(`D${num}`, `hm-ring ${odd}`)} />
              <text x={lx} y={ly} className={`hm-label ${active && /^[SDT]/.test(active) && active.slice(1) === String(num) ? 'active' : ''}`}>
                {num}
              </text>
            </g>
          );
        })}
        <circle r={R.bull} {...zoneProps('25', 'hm-bull')} />
        <circle r={R.bullseye} {...zoneProps('50', 'hm-bullseye')} />
        <g className="hm-halo" filter="url(#hm-blur)">
          {data.points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="9" />
          ))}
        </g>
        <g className="hm-dots">
          {data.points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="3.4" className={active && p.zone === active ? 'active' : ''} />
          ))}
        </g>
      </svg>
      <figcaption className="chart-tip">{active ? tip(active) : 'Touchez une zone pour le détail'}</figcaption>
      <DataTable
        head={['Zone', 'Fléchettes', 'Part']}
        rows={ranked.map(([zone, c]) => [zoneName(zone), c, `${Math.round((100 * c) / n)} %`])}
      />
    </figure>
  );
}
