import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { BULL } from '../../game-engine/darts';
import { targetOf } from '../../game-engine/modes/random';
import { RandomInput } from '../components/RandomInput';
import { ListBoard } from './ListBoard';
const rd = (state) => state.mode;
const name = (n) => (n === BULL ? 'Bull' : String(n));
export const randomView = {
    title: ({ state }) => `Chiffre aléatoire · ${state.config.options.rounds} tours`,
    hero: ({ state }) => ({ label: 'À viser', value: name(rd(state).target) }),
    hint: ({ state }) => {
        const { rounds } = state.config.options;
        const round = (state.current?.round ?? state.turns.at(-1)?.round ?? 0) + 1;
        return (_jsxs(_Fragment, { children: [_jsx("span", { className: "label", children: "Tour" }), " ", round, " / ", rounds, _jsx("span", { className: "hint-bar", children: _jsx("span", { style: { width: `${(100 * round) / rounds}%` } }) })] }));
    },
    dartNote: (d) => (d.points > 0 ? `+${d.points}` : '0'),
    volleyTotal: (darts) => String(darts.reduce((a, d) => a + d.points, 0)),
    turnResult: (turn, ctx) => {
        const points = turn.darts.reduce((a, d) => a + d.points, 0);
        const target = targetOf(ctx.state.config.options, turn.round);
        return { text: `${ctx.nameOf(turn.playerId)} : ${points} point${points > 1 ? 's' : ''} sur le ${name(target)}` };
    },
    rankValue: (r) => `${r.value} pts`,
    board: (ctx) => _jsx(ListBoard, { ctx: ctx, row: (i) => ({ value: rd(ctx.state).scores[i] }) }),
    input: ({ state }, onDart, disabled) => _jsx(RandomInput, { target: rd(state).target, disabled: disabled, onDart: onDart }),
    pad: ({ state }) => {
        const t = rd(state).target;
        return t === BULL ? { highlightBull: 'any' } : { highlight: t };
    },
};
