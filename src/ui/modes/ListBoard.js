import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { formatDart } from '../../game-engine/darts';
import { playerFor } from '../../game-engine/engine';
/** Tableau en lignes, un côté par ligne : utilisé par 301/501/701, Horloge, Chiffre aléatoire et Entraînement. */
export function ListBoard({ ctx, row }) {
    const { state } = ctx;
    const current = state.current;
    return (_jsx("ol", { className: "board", children: state.config.sides.map((side, i) => {
            const active = current?.sideIndex === i;
            // Joueur qui lancera la prochaine volée de ce côté.
            const next = current ? playerFor(state.config, i, current.round + (i < current.sideIndex ? 1 : 0)) : '';
            const r = row(i);
            // Dernière volée terminée de ce côté : reste visible quand la main passe (saisie par caméra surtout).
            const last = [...state.turns].reverse().find((t) => t.sideIndex === i);
            return (_jsxs("li", { className: `${active ? 'active' : ''}${r.out ? ' out' : ''}`, style: { borderLeftColor: side.color ?? 'transparent' }, children: [_jsxs("span", { className: "board-name", children: [ctx.sideName(i), state.config.teamMode && next && _jsxs("span", { className: "board-sub", children: [" \u00B7 ", ctx.nameOf(next)] })] }), last && (_jsx("span", { className: `board-last ${last.outcome === 'bust' ? 'bust' : ''}`, title: "Derni\u00E8re vol\u00E9e", children: last.darts.map((d, k) => (_jsx("span", { className: d.dart.segment === 0 ? 'zero' : '', children: formatDart(d.dart) }, k))) })), r.extra, r.detail && _jsx("span", { className: "board-avg", children: r.detail }), _jsx("span", { className: "board-score", children: r.value })] }, side.id));
        }) }));
}
