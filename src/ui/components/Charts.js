import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import './Charts.css';
// Graphiques des statistiques, en SVG et HTML simples : pas de bibliothèque, tout fonctionne hors ligne.
// Une seule série par graphique, donc pas de légende : le titre dit ce qui est tracé.
// Chaque marque a une infobulle au toucher ou au survol, et chaque graphique a sa vue en tableau.
/** Barre proportionnelle : une valeur sur 100 %, avec le volume sur lequel elle repose. */
export function MeterBar({ label, share, detail }) {
    return (_jsxs("div", { className: "meter", children: [_jsxs("div", { className: "meter-head", children: [_jsx("span", { className: "meter-label", children: label }), _jsx("span", { className: "meter-value", children: share === null ? 'non disponible' : `${Math.round(share)} %` })] }), _jsx("div", { className: "meter-track", children: share !== null && share > 0 && _jsx("div", { className: "meter-fill", style: { width: `${Math.max(1, Math.min(100, share))}%` } }) }), _jsx("div", { className: "meter-detail", children: detail })] }));
}
/** Histogramme en colonnes, avec la valeur sur la colonne la plus haute et une infobulle par colonne. */
export function ColumnChart({ columns, unit, title }) {
    const [active, setActive] = useState(null);
    const max = Math.max(1, ...columns.map((c) => c.value));
    const top = columns.findIndex((c) => c.value === max);
    const W = 640, H = 220, pad = { l: 36, r: 8, t: 22, b: 34 };
    const slot = (W - pad.l - pad.r) / columns.length;
    const bar = Math.min(24, slot - 4);
    const y = (v) => pad.t + (H - pad.t - pad.b) * (1 - v / max);
    const ticks = niceTicks(max);
    return (_jsxs("figure", { className: "chart", "aria-label": title, children: [_jsxs("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", onPointerLeave: () => setActive(null), children: [ticks.map((t) => (_jsxs("g", { children: [_jsx("line", { className: "chart-grid", x1: pad.l, x2: W - pad.r, y1: y(t), y2: y(t) }), _jsx("text", { className: "chart-axis", x: pad.l - 6, y: y(t) + 4, textAnchor: "end", children: t })] }, t))), columns.map((c, i) => {
                        const x = pad.l + i * slot + (slot - bar) / 2;
                        const h = H - pad.b - y(c.value);
                        return (_jsxs("g", { children: [c.value > 0 && _jsx("path", { className: `chart-bar ${active === i ? 'active' : ''}`, d: columnPath(x, H - pad.b, bar, h) }), i === top && c.value > 0 && (_jsx("text", { className: "chart-label", x: x + bar / 2, y: y(c.value) - 6, textAnchor: "middle", children: c.value })), _jsx("text", { className: "chart-axis", x: x + bar / 2, y: H - pad.b + 16, textAnchor: "middle", children: c.label }), _jsx("rect", { className: "chart-hit", x: pad.l + i * slot, y: pad.t, width: slot, height: H - pad.t - pad.b, onPointerEnter: () => setActive(i), onPointerDown: () => setActive(i) })] }, i));
                    }), _jsx("line", { className: "chart-baseline", x1: pad.l, x2: W - pad.r, y1: H - pad.b, y2: H - pad.b })] }), _jsx("figcaption", { className: "chart-tip", children: active !== null ? columns[active].tip : `Touchez une colonne pour le détail · en ${unit}` })] }));
}
/** Courbe temporelle avec repère vertical et infobulle au toucher ; la dernière valeur est écrite au bout. */
export function LineChart({ points, title, digits = 1 }) {
    const [active, setActive] = useState(null);
    const W = 640, H = 220, pad = { l: 40, r: 56, t: 16, b: 34 };
    const values = points.map((p) => p.value);
    const lo = Math.min(...values), hi = Math.max(...values);
    const span = hi - lo || Math.max(1, hi * 0.1);
    const min = Math.max(0, lo - span * 0.15), max = hi + span * 0.15;
    const x = (i) => pad.l + (points.length === 1 ? (W - pad.l - pad.r) / 2 : (i * (W - pad.l - pad.r)) / (points.length - 1));
    const y = (v) => pad.t + (H - pad.t - pad.b) * (1 - (v - min) / (max - min));
    const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
    const ticks = niceTicks(max, min);
    const labelEvery = Math.ceil(points.length / 8);
    const last = points.length - 1;
    return (_jsxs("figure", { className: "chart", "aria-label": title, children: [_jsxs("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", onPointerLeave: () => setActive(null), onPointerMove: (e) => setActive(nearest(e, points.length, x, W)), onPointerDown: (e) => setActive(nearest(e, points.length, x, W)), children: [ticks.map((t) => (_jsxs("g", { children: [_jsx("line", { className: "chart-grid", x1: pad.l, x2: W - pad.r, y1: y(t), y2: y(t) }), _jsx("text", { className: "chart-axis", x: pad.l - 6, y: y(t) + 4, textAnchor: "end", children: t })] }, t))), points.map((p, i) => i % labelEvery === 0 || i === last ? (_jsx("text", { className: "chart-axis", x: x(i), y: H - pad.b + 16, textAnchor: "middle", children: p.label }, i)) : null), points.length > 1 && _jsx("path", { className: "chart-line", d: path }), active !== null && _jsx("line", { className: "chart-cross", x1: x(active), x2: x(active), y1: pad.t, y2: H - pad.b }), points.map((p, i) => (_jsx("circle", { className: `chart-dot ${active === i ? 'active' : ''}`, cx: x(i), cy: y(p.value), r: active === i ? 6 : 4 }, i))), _jsx("text", { className: "chart-label", x: x(last) + 10, y: y(points[last].value) + 5, children: points[last].value.toLocaleString('fr-FR', { maximumFractionDigits: digits }) })] }), _jsx("figcaption", { className: "chart-tip", children: active !== null ? points[active].tip : 'Touchez la courbe pour le détail' })] }));
}
function nearest(e, n, x, W) {
    const box = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W;
    let best = 0;
    for (let i = 1; i < n; i++)
        if (Math.abs(x(i) - px) < Math.abs(x(best) - px))
            best = i;
    return best;
}
/** Colonne à bout arrondi (4 px), carrée sur la ligne de base. */
function columnPath(x, base, w, h) {
    const r = Math.min(4, w / 2, h);
    const top = base - h;
    return `M${x},${base} V${top + r} Q${x},${top} ${x + r},${top} H${x + w - r} Q${x + w},${top} ${x + w},${top + r} V${base} Z`;
}
/** Graduations rondes (1, 2, 5 × 10ⁿ), 3 à 5 au total. */
export function niceTicks(max, min = 0) {
    const span = max - min || 1;
    const raw = span / 4;
    const mag = 10 ** Math.floor(Math.log10(raw));
    const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw);
    const out = [];
    for (let t = Math.ceil(min / step) * step; t <= max + 1e-9; t += step)
        out.push(+t.toFixed(6));
    return out;
}
/** Repli « voir en tableau » sous un graphique. */
export function DataTable({ head, rows }) {
    return (_jsxs("details", { className: "chart-table", children: [_jsx("summary", { children: "Voir en tableau" }), _jsxs("table", { children: [_jsx("thead", { children: _jsx("tr", { children: head.map((h) => (_jsx("th", { children: h }, h))) }) }), _jsx("tbody", { children: rows.map((r, i) => (_jsx("tr", { children: r.map((c, j) => (_jsx("td", { children: c }, j))) }, i))) })] })] }));
}
