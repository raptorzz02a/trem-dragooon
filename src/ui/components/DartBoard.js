import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BULL } from '../../game-engine/darts';
import { BOARD_ORDER } from '../../game-engine/modes/clock';
import './DartBoard.css';
const R = { bullseye: 6, bull: 14, triple: [50, 58], double: [80, 88], label: 97 };
function point(r, deg) {
    const a = ((deg - 90) * Math.PI) / 180;
    return [r * Math.cos(a), r * Math.sin(a)];
}
function arc(center, r1, r2) {
    const [x1, y1] = point(r2, center - 9);
    const [x2, y2] = point(r2, center + 9);
    const [x3, y3] = point(r1, center + 9);
    const [x4, y4] = point(r1, center - 9);
    return `M${x1},${y1} A${r2},${r2} 0 0 1 ${x2},${y2} L${x3},${y3} A${r1},${r1} 0 0 0 ${x4},${y4} Z`;
}
/** Parties de la cible couvertes par une zone. */
export function zoneParts(z) {
    if (z.segment === BULL)
        return z.ring === 'D' ? ['D'] : z.ring === 'any' ? ['S', 'D'] : ['S'];
    switch (z.ring) {
        case 'any':
            return ['SI', 'T', 'SO', 'D'];
        case 'S':
            return ['SI', 'SO'];
        case 'SI':
            return ['SI'];
        case 'SO':
            return ['SO'];
        case 'D':
            return ['D'];
        case 'T':
            return ['T'];
    }
}
/**
 * Cible complète (simples, triples, doubles, Bull 25 et 50), couleurs d'une vraie cible assombries.
 * Les zones marquées s'allument : on voit exactement quelle partie viser.
 */
export function DartBoard({ marks, label = 'Cible' }) {
    const tones = new Map();
    const labels = new Map();
    for (const m of marks) {
        for (const p of zoneParts(m.zone))
            tones.set(`${m.zone.segment}:${p}`, m);
        if (m.zone.segment !== BULL && !labels.has(m.zone.segment))
            labels.set(m.zone.segment, m.tone);
    }
    const cls = (n, p, base) => {
        const m = tones.get(`${n}:${p}`);
        return `${base}${m ? ` db-${m.tone}${m.pulse ? ' db-pulse' : ''}` : ''}`;
    };
    return (_jsxs("svg", { className: "dart-board", viewBox: "-110 -110 220 220", role: "img", "aria-label": label, children: [_jsx("circle", { r: "104", className: "db-rim" }), BOARD_ORDER.map((n, i) => {
                const angle = i * 18;
                const [lx, ly] = point(R.label, angle);
                const odd = i % 2 === 1;
                const single = odd ? 'db-single db-light' : 'db-single';
                const ring = odd ? 'db-ring db-green-ring' : 'db-ring';
                const tone = labels.get(n);
                return (_jsxs("g", { children: [_jsx("path", { className: cls(n, 'SI', single), d: arc(angle, R.bull, R.triple[0]) }), _jsx("path", { className: cls(n, 'T', ring), d: arc(angle, R.triple[0], R.triple[1]) }), _jsx("path", { className: cls(n, 'SO', single), d: arc(angle, R.triple[1], R.double[0]) }), _jsx("path", { className: cls(n, 'D', ring), d: arc(angle, R.double[0], R.double[1]) }), _jsx("text", { className: `db-label${tone ? ` db-label-${tone}` : ''}`, x: lx, y: ly, dominantBaseline: "central", textAnchor: "middle", children: n })] }, n));
            }), _jsx("circle", { r: R.bull, className: cls(BULL, 'S', 'db-bull') }), _jsx("circle", { r: R.bullseye, className: cls(BULL, 'D', 'db-bullseye') })] }));
}
