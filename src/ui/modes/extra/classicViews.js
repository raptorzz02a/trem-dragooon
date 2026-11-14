import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { BULL } from '../../../game-engine/darts';
import { baseballTotal, INNINGS, leadersAfterNine } from '../../../game-engine/extra/baseball';
import { bobsValue } from '../../../game-engine/extra/bobs27';
import { golfTotal } from '../../../game-engine/extra/golf';
import { formatZone, zone, zoneName } from '../../../game-engine/extra/zones';
import { ZoneInput } from '../../components/ZoneInput';
import { ListBoard } from '../ListBoard';
import { plural, roundOf, RoundBar, sideNow, signed, simpleResult, Strip, sum, winnerLine } from './kit';
/* ---------- Baseball ---------- */
const bb = (s) => s.mode;
const bbTarget = (round) => (round < INNINGS ? zone(round + 1) : zone(BULL));
export const baseballView = {
    title: () => 'Baseball',
    hero: ({ state }, side) => ({ label: 'Points', value: baseballTotal(bb(state), side) }),
    hint: ({ state }) => {
        const r = roundOf(state);
        return r < INNINGS ? (_jsxs(_Fragment, { children: ["Vise le ", _jsx("strong", { children: r + 1 }), " \u00B7 simple 1, double 2, triple 3 \u00B7 ", _jsx(RoundBar, { round: r, total: INNINGS })] })) : (_jsx(_Fragment, { children: "\u00C9galit\u00E9 : manche au Bull (25 = 1, 50 = 2)" }));
    },
    dartNote: (d) => (d.points ? `+${d.points}` : '0'),
    volleyTotal: (darts) => signed(sum(darts)),
    turnResult: simpleResult(),
    endSummary: (ctx) => winnerLine(ctx, (w) => `${plural(baseballTotal(bb(ctx.state), w), 'point')} en ${INNINGS} manches`),
    rankValue: (r) => plural(r.value, 'pt'),
    board: (ctx) => (_jsx(ListBoard, { ctx: ctx, row: (i) => ({
            value: baseballTotal(bb(ctx.state), i),
            out: roundOf(ctx.state) >= INNINGS && !leadersAfterNine(bb(ctx.state)).includes(i),
            extra: (_jsx("span", { className: "target-strip", children: bb(ctx.state)
                    .innings[i].slice(-5)
                    .map((p, k) => (_jsx("span", { children: p }, k))) })),
        }) })),
    input: ({ state }, onDart, disabled) => (_jsx(ZoneInput, { target: bbTarget(roundOf(state)), note: (m) => plural(m, 'pt'), disabled: disabled, onDart: onDart })),
    pad: () => ({}),
};
/* ---------- Bob's 27 ---------- */
const bo = (s) => s.mode;
const boZone = (s, round) => zone(s.targets[Math.min(round, s.targets.length - 1)], 'D');
export const bobs27View = {
    title: () => "Bob's 27",
    hero: ({ state }, side) => ({ label: 'Score', value: bo(state).scores[side] }),
    hint: ({ state }) => {
        const s = bo(state);
        const r = roundOf(state);
        return _jsx(Strip, { items: s.targets.map((n) => (n === BULL ? '50' : `D${n}`)), current: r });
    },
    dartNote: (d) => (d.points ? `+${d.points}` : ''),
    volleyTotal: (darts) => (sum(darts) ? `+${sum(darts)}` : '·'),
    turnResult: (turn, ctx) => {
        const s = bo(ctx.state);
        const v = bobsValue(s.targets[turn.round]);
        const gained = sum(turn.darts);
        const who = ctx.nameOf(turn.playerId);
        if (s.outRound[turn.sideIndex] === turn.round)
            return { text: `${who} tombe à zéro : éliminé`, bad: true };
        return gained ? { text: `${who} : +${gained}` } : { text: `${who} rate le double : −${v}`, bad: true };
    },
    endSummary: (ctx) => winnerLine(ctx, (w) => `${plural(bo(ctx.state).scores[w], 'point')} · ${plural(bo(ctx.state).doubles[w], 'double')} réussi${bo(ctx.state).doubles[w] > 1 ? 's' : ''}`),
    rankValue: (r, { state }) => {
        const s = bo(state);
        const out = s.outRound[r.sideIndex];
        return out >= 0 ? `éliminé au ${s.targets[out] === BULL ? 'Bull' : `D${s.targets[out]}`}` : plural(s.scores[r.sideIndex], 'pt');
    },
    board: (ctx) => (_jsx(ListBoard, { ctx: ctx, row: (i) => ({
            value: bo(ctx.state).scores[i],
            out: bo(ctx.state).outOrder[i] !== 0,
            detail: `${bo(ctx.state).doubles[i]} doubles`,
        }) })),
    input: ({ state }, onDart, disabled) => {
        const s = bo(state);
        const z = boZone(s, roundOf(state));
        const v = bobsValue(z.segment);
        return (_jsx(ZoneInput, { target: z, note: () => `+${v}`, missLabel: s.penalty === 'each' ? `Raté −${v}` : 'Raté', disabled: disabled, onDart: onDart }));
    },
    pad: () => ({}),
};
/* ---------- Golf ---------- */
const go = (s) => s.mode;
const STROKE_NAMES = { 1: 'Birdie !', 2: '2 coups', 3: '3 coups', 4: '4 coups' };
export const golfView = {
    title: ({ state }) => `Golf · ${go(state).holes} trous`,
    hero: ({ state }) => ({ label: 'Trou', value: Math.min(roundOf(state) + 1, go(state).holes) }),
    hint: ({ state }) => (_jsxs(_Fragment, { children: ["Triple 1 \u00B7 Double 2 \u00B7 Simple 3 \u00B7 rien 4 \u00B7 la derni\u00E8re fl\u00E9chette compte, ", _jsx("strong", { children: "Fin de tour" }), " = je garde ce coup"] })),
    dartLabel: (d) => (d.dart.segment === 0 ? '0' : `${'SDT'[d.dart.multiplier - 1]}${d.dart.segment}`),
    dartNote: (d) => `${d.points} coup${d.points > 1 ? 's' : ''}`,
    volleyTotal: (darts) => (darts.length ? String(darts.at(-1).points) : '4'),
    turnResult: (turn, ctx) => {
        const strokes = turn.darts.at(-1)?.points ?? 4;
        return { text: `${ctx.nameOf(turn.playerId)} : trou ${turn.round + 1} en ${STROKE_NAMES[strokes]}`, bad: strokes === 4 };
    },
    endSummary: (ctx) => winnerLine(ctx, (w) => `${plural(golfTotal(go(ctx.state), w), 'coup')} · ${go(ctx.state).cards[w].filter((c) => c === 1).length} birdie(s)`),
    rankValue: (r) => plural(r.value, 'coup'),
    board: (ctx) => (_jsx(ListBoard, { ctx: ctx, row: (i) => ({
            value: golfTotal(go(ctx.state), i),
            extra: (_jsx("span", { className: "target-strip", children: go(ctx.state)
                    .cards[i].slice(-6)
                    .map((c, k) => (_jsx("span", { className: c === 1 ? 'current' : '', children: c }, k))) })),
        }) })),
    input: ({ state }, onDart, disabled) => (_jsx(ZoneInput, { target: zone(roundOf(state) + 1), note: (m) => plural(4 - m, 'coup'), missLabel: "Rat\u00E9 \u00B7 4 coups", disabled: disabled, onDart: onDart })),
    pad: () => ({}),
};
/* ---------- Bermuda ---------- */
const be = (s) => s.mode;
export const bermudaView = {
    title: ({ state }) => `▲ des Bermudes · objectif ${be(state).goal}`,
    hero: ({ state }) => ({ label: 'À viser', value: formatZone(be(state).targets[roundOf(state)]) }),
    hint: ({ state }) => {
        const s = be(state);
        const z = s.targets[roundOf(state)];
        return (_jsxs(_Fragment, { children: ["Score ", _jsx("strong", { children: s.scores[sideNow(state)] }), " / ", s.goal, " \u00B7 vise ", zoneName(z), " \u00B7 rater toute la vol\u00E9e : \u2212", z.segment] }));
    },
    dartNote: (d) => (d.points ? `+${d.points}` : ''),
    volleyTotal: (darts) => (sum(darts) ? `+${sum(darts)}` : '·'),
    turnResult: (turn, ctx) => {
        const g = sum(turn.darts);
        const z = be(ctx.state).targets[turn.round];
        return g
            ? { text: `${ctx.nameOf(turn.playerId)} : +${g}` }
            : { text: `${ctx.nameOf(turn.playerId)} fait naufrage : −${z.segment}`, bad: true };
    },
    endSummary: (ctx) => winnerLine(ctx, (w) => `${plural(be(ctx.state).scores[w], 'point')} · ${plural(be(ctx.state).wrecks[w], 'naufrage')}`),
    rankValue: (r) => plural(r.value, 'pt'),
    board: (ctx) => _jsx(ListBoard, { ctx: ctx, row: (i) => ({ value: be(ctx.state).scores[i], detail: `/ ${be(ctx.state).goal}` }) }),
    input: ({ state }, onDart, disabled) => _jsx(ZoneInput, { target: be(state).targets[roundOf(state)], disabled: disabled, onDart: onDart }),
    pad: () => ({}),
};
