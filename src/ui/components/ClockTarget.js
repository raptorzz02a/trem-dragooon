import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BOARD_ORDER } from '../../game-engine/modes/clock';
import './ClockTarget.css';
const R_OUTER = 88;
const R_INNER = 18;
const R_LABEL = 96;
function point(r, deg) {
    const a = ((deg - 90) * Math.PI) / 180;
    return [r * Math.cos(a), r * Math.sin(a)];
}
/** Secteur de la cible centré sur l'angle donné (18° par numéro, le 20 en haut). */
function wedge(center) {
    const [x1, y1] = point(R_OUTER, center - 9);
    const [x2, y2] = point(R_OUTER, center + 9);
    const [x3, y3] = point(R_INNER, center + 9);
    const [x4, y4] = point(R_INNER, center - 9);
    return `M${x1},${y1} A${R_OUTER},${R_OUTER} 0 0 1 ${x2},${y2} L${x3},${y3} A${R_INNER},${R_INNER} 0 0 0 ${x4},${y4} Z`;
}
/** Cible dessinée : numéro à viser en or, numéros déjà faits en vert, Bull allumé quand c'est son tour. */
export function ClockTarget({ steps, progress, marks, label = 'Progression sur la cible' }) {
    const stateOf = (index) => (index < 0 ? 'todo' : index < progress ? 'done' : index === progress ? 'current' : 'todo');
    const numberState = (n) => (marks ? (marks[n] ?? 'todo') : stateOf(steps.findIndex((s) => 'number' in s && s.number === n)));
    const bullIndexes = steps.map((s, i) => ('bull' in s ? i : -1)).filter((i) => i >= 0);
    const bullState = bullIndexes.length === 0
        ? 'off'
        : bullIndexes.some((i) => i === progress)
            ? 'current'
            : bullIndexes.every((i) => i < progress)
                ? 'done'
                : 'todo';
    return (_jsxs("svg", { className: "clock-target", viewBox: "-110 -110 220 220", role: "img", "aria-label": label, children: [_jsx("circle", { r: "104", className: "ct-rim" }), BOARD_ORDER.map((n, i) => {
                const angle = i * 18;
                const [lx, ly] = point(R_LABEL, angle);
                const state = numberState(n);
                return (_jsxs("g", { className: `ct-seg ct-${state} ${i % 2 ? 'ct-odd' : ''}`, children: [_jsx("path", { d: wedge(angle) }), _jsx("text", { x: lx, y: ly, dominantBaseline: "central", textAnchor: "middle", children: n })] }, n));
            }), _jsx("circle", { r: R_INNER - 2, className: `ct-bull ct-${bullState}` }), _jsx("circle", { r: "6", className: `ct-bullseye ct-${bullState}` })] }));
}
