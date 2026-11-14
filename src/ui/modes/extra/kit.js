import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
// Petits outils partagés par les écrans des autres jeux.
export const roundOf = (state) => state.current?.round ?? state.turns.at(-1)?.round ?? 0;
export const sideNow = (state) => state.current?.sideIndex ?? state.turns.at(-1)?.sideIndex ?? 0;
export const plural = (n, word, many = `${word}s`) => `${n} ${Math.abs(n) > 1 ? many : word}`;
export const sum = (darts) => darts.reduce((a, d) => a + d.points, 0);
export const signed = (n) => (n > 0 ? `+${n}` : String(n));
/** « Manche 3 / 10 » avec une barre de progression. */
export function RoundBar({ round, total, label = 'Manche' }) {
    return (_jsxs(_Fragment, { children: [_jsx("span", { className: "label", children: label }), " ", Math.min(round + 1, total), " / ", total, _jsx("span", { className: "hint-bar", children: _jsx("span", { style: { width: `${(100 * Math.min(round + 1, total)) / total}%` } }) })] }));
}
/** Cœurs pleins et vides. */
export function Hearts({ lives, max }) {
    return (_jsxs("span", { className: "hearts", "aria-label": plural(lives, 'vie'), children: ['♥'.repeat(Math.max(0, lives)), _jsx("i", { children: '♥'.repeat(Math.max(0, max - lives)) })] }));
}
/** Puces d'une suite de cibles : faites, en cours, à venir. */
export function Strip({ items, current, bad = [] }) {
    return (_jsx("span", { className: "target-strip", children: items.map((t, i) => (_jsx("span", { className: i === current ? 'current' : bad.includes(i) ? 'done bad' : i < current ? 'done' : '', children: t }, i))) }));
}
/** Résumé de fin standard : « 42 points ». */
export const winnerLine = (ctx, text) => ctx.state.winners.length === 1 ? _jsx("div", { className: "end-darts", children: text(ctx.state.winners[0]) }) : null;
/** Résultat de volée standard : « Ju : +12 ». */
export const simpleResult = (unit = 'point') => (turn, ctx) => ({ text: `${ctx.nameOf(turn.playerId)} : ${plural(sum(turn.darts), unit)}` });
