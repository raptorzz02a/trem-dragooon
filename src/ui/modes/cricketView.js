import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { BULL } from '../../game-engine/darts';
import { CRICKET_NUMBERS } from '../../game-engine/modes/cricket';
const cr = (state) => state.mode;
const MARK = ['', '╱', '✕', 'ⓧ'];
const label = (n) => (n === BULL ? 'Bull' : String(n));
/** Marques réellement posées par une fléchette (0 si le numéro ne compte pas). */
function marksOf(d, state) {
    return cr(state).targets.includes(d.dart.segment) ? d.dart.multiplier : 0;
}
function CricketBoard({ ctx }) {
    const { state } = ctx;
    const s = cr(state);
    const sides = state.config.sides;
    const active = state.current?.sideIndex;
    return (_jsxs("table", { className: "cricket", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", {}), sides.map((side, i) => (_jsx("th", { className: i === active ? 'active' : '', style: { color: side.color }, children: ctx.sideName(i) }, side.id)))] }) }), _jsxs("tbody", { children: [s.targets.map((n, t) => {
                        const closedByAll = s.marks.every((row) => row[t] >= 3);
                        return (_jsxs("tr", { className: closedByAll ? 'closed' : '', children: [_jsx("th", { children: label(n) }), sides.map((side, i) => (_jsx("td", { className: `mark mark-${s.marks[i][t]} ${i === active ? 'active' : ''}`, children: MARK[s.marks[i][t]] }, side.id)))] }, n));
                    }), _jsxs("tr", { className: "cricket-points", children: [_jsx("th", { children: "Pts" }), sides.map((side, i) => (_jsx("td", { className: i === active ? 'active' : '', children: s.points[i] }, side.id)))] })] })] }));
}
export const cricketView = {
    title: ({ state }) => {
        const o = state.config.options;
        return `Cricket${o.variant === 'cutthroat' ? ' Cut-Throat' : ''}${o.bull ? '' : ' · sans Bull'}`;
    },
    hero: ({ state }, side) => ({ label: 'Points', value: cr(state).points[side] }),
    hint: ({ state }) => {
        const side = state.current?.sideIndex;
        if (side === undefined)
            return null;
        const s = cr(state);
        const open = s.targets.filter((_, t) => s.marks[side][t] < 3);
        return open.length ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "label", children: "\u00C0 fermer" }), " ", open.map(label).join(' · ')] })) : ('Tout est fermé : marque des points !');
    },
    dartNote: (d, { state }) => (d.points > 0 ? `+${d.points}` : marksOf(d, state) ? MARK[marksOf(d, state)] : '—'),
    volleyTotal: (darts, { state }) => `${darts.reduce((a, d) => a + marksOf(d, state), 0)} m.`,
    turnResult: (turn, ctx) => {
        const marks = turn.darts.reduce((a, d) => a + marksOf(d, ctx.state), 0);
        const points = turn.darts.reduce((a, d) => a + d.points, 0);
        return { text: `${ctx.nameOf(turn.playerId)} : ${marks} marque${marks > 1 ? 's' : ''}${points ? `, ${points} points` : ''}` };
    },
    rankValue: (r) => `${r.value} pts`,
    board: (ctx) => _jsx(CricketBoard, { ctx: ctx }),
    pad: () => ({ numbers: [...CRICKET_NUMBERS] }),
};
