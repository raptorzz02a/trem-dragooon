import { useState, type ReactNode } from 'react';
import './Charts.css';

// Graphiques des statistiques, en SVG et HTML simples : pas de bibliothèque, tout fonctionne hors ligne.
// Une seule série par graphique, donc pas de légende : le titre dit ce qui est tracé.
// Chaque marque a une infobulle au toucher ou au survol, et chaque graphique a sa vue en tableau.

/** Barre proportionnelle : une valeur sur 100 %, avec le volume sur lequel elle repose. */
export function MeterBar({ label, share, detail }: { label: string; share: number | null; detail: string }) {
  return (
    <div className="meter">
      <div className="meter-head">
        <span className="meter-label">{label}</span>
        <span className="meter-value">{share === null ? 'non disponible' : `${Math.round(share)} %`}</span>
      </div>
      <div className="meter-track">
        {share !== null && share > 0 && <div className="meter-fill" style={{ width: `${Math.max(1, Math.min(100, share))}%` }} />}
      </div>
      <div className="meter-detail">{detail}</div>
    </div>
  );
}

export interface Column {
  label: string;
  value: number;
  /** Texte de l'infobulle. */
  tip: string;
}

/** Histogramme en colonnes, avec la valeur sur la colonne la plus haute et une infobulle par colonne. */
export function ColumnChart({ columns, unit, title }: { columns: Column[]; unit: string; title: string }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...columns.map((c) => c.value));
  const top = columns.findIndex((c) => c.value === max);
  const W = 640, H = 220, pad = { l: 36, r: 8, t: 22, b: 34 };
  const slot = (W - pad.l - pad.r) / columns.length;
  const bar = Math.min(24, slot - 4);
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / max);
  const ticks = niceTicks(max);
  return (
    <figure className="chart" aria-label={title}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" onPointerLeave={() => setActive(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line className="chart-grid" x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} />
            <text className="chart-axis" x={pad.l - 6} y={y(t) + 4} textAnchor="end">
              {t}
            </text>
          </g>
        ))}
        {columns.map((c, i) => {
          const x = pad.l + i * slot + (slot - bar) / 2;
          const h = H - pad.b - y(c.value);
          return (
            <g key={i}>
              {c.value > 0 && <path className={`chart-bar ${active === i ? 'active' : ''}`} d={columnPath(x, H - pad.b, bar, h)} />}
              {i === top && c.value > 0 && (
                <text className="chart-label" x={x + bar / 2} y={y(c.value) - 6} textAnchor="middle">
                  {c.value}
                </text>
              )}
              <text className="chart-axis" x={x + bar / 2} y={H - pad.b + 16} textAnchor="middle">
                {c.label}
              </text>
              {/* Zone de toucher plus large que la colonne. */}
              <rect
                className="chart-hit"
                x={pad.l + i * slot}
                y={pad.t}
                width={slot}
                height={H - pad.t - pad.b}
                onPointerEnter={() => setActive(i)}
                onPointerDown={() => setActive(i)}
              />
            </g>
          );
        })}
        <line className="chart-baseline" x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} />
      </svg>
      <figcaption className="chart-tip">{active !== null ? columns[active]!.tip : `Touchez une colonne pour le détail · en ${unit}`}</figcaption>
    </figure>
  );
}

export interface Point {
  label: string;
  value: number;
  tip: string;
}

/** Courbe temporelle avec repère vertical et infobulle au toucher ; la dernière valeur est écrite au bout. */
export function LineChart({ points, title, digits = 1 }: { points: Point[]; title: string; digits?: number }) {
  const [active, setActive] = useState<number | null>(null);
  const W = 640, H = 220, pad = { l: 40, r: 56, t: 16, b: 34 };
  const values = points.map((p) => p.value);
  const lo = Math.min(...values), hi = Math.max(...values);
  const span = hi - lo || Math.max(1, hi * 0.1);
  const min = Math.max(0, lo - span * 0.15), max = hi + span * 0.15;
  const x = (i: number) => pad.l + (points.length === 1 ? (W - pad.l - pad.r) / 2 : (i * (W - pad.l - pad.r)) / (points.length - 1));
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - (v - min) / (max - min));
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const ticks = niceTicks(max, min);
  const labelEvery = Math.ceil(points.length / 8);
  const last = points.length - 1;
  return (
    <figure className="chart" aria-label={title}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        onPointerLeave={() => setActive(null)}
        onPointerMove={(e) => setActive(nearest(e, points.length, x, W))}
        onPointerDown={(e) => setActive(nearest(e, points.length, x, W))}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line className="chart-grid" x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} />
            <text className="chart-axis" x={pad.l - 6} y={y(t) + 4} textAnchor="end">
              {t}
            </text>
          </g>
        ))}
        {points.map((p, i) =>
          i % labelEvery === 0 || i === last ? (
            <text key={i} className="chart-axis" x={x(i)} y={H - pad.b + 16} textAnchor="middle">
              {p.label}
            </text>
          ) : null,
        )}
        {points.length > 1 && <path className="chart-line" d={path} />}
        {active !== null && <line className="chart-cross" x1={x(active)} x2={x(active)} y1={pad.t} y2={H - pad.b} />}
        {points.map((p, i) => (
          <circle key={i} className={`chart-dot ${active === i ? 'active' : ''}`} cx={x(i)} cy={y(p.value)} r={active === i ? 6 : 4} />
        ))}
        <text className="chart-label" x={x(last) + 10} y={y(points[last]!.value) + 5}>
          {points[last]!.value.toLocaleString('fr-FR', { maximumFractionDigits: digits })}
        </text>
      </svg>
      <figcaption className="chart-tip">{active !== null ? points[active]!.tip : 'Touchez la courbe pour le détail'}</figcaption>
    </figure>
  );
}

function nearest(e: React.PointerEvent<SVGSVGElement>, n: number, x: (i: number) => number, W: number): number {
  const box = e.currentTarget.getBoundingClientRect();
  const px = ((e.clientX - box.left) / box.width) * W;
  let best = 0;
  for (let i = 1; i < n; i++) if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i;
  return best;
}

/** Colonne à bout arrondi (4 px), carrée sur la ligne de base. */
function columnPath(x: number, base: number, w: number, h: number): string {
  const r = Math.min(4, w / 2, h);
  const top = base - h;
  return `M${x},${base} V${top + r} Q${x},${top} ${x + r},${top} H${x + w - r} Q${x + w},${top} ${x + w},${top + r} V${base} Z`;
}

/** Graduations rondes (1, 2, 5 × 10ⁿ), 3 à 5 au total. */
export function niceTicks(max: number, min = 0): number[] {
  const span = max - min || 1;
  const raw = span / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw)!;
  const out: number[] = [];
  for (let t = Math.ceil(min / step) * step; t <= max + 1e-9; t += step) out.push(+t.toFixed(6));
  return out;
}

/** Repli « voir en tableau » sous un graphique. */
export function DataTable({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <details className="chart-table">
      <summary>Voir en tableau</summary>
      <table>
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
