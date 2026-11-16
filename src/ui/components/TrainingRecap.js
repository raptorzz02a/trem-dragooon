import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { heatmapOfTurns } from '../../profiles/heatmap';
import { recap } from '../../profiles/recap';
import { DartHeatmap } from './DartHeatmap';
import './TrainingRecap.css';
const fr = (n, digits = 1) => n.toLocaleString('fr-FR', { maximumFractionDigits: digits });
const pct = (n) => `${fr(n, 0)} %`;
const zoneName = (z) => (z === '0' ? 'Raté' : z === '25' ? 'Bull 25' : z === '50' ? 'Bull 50' : z);
/** Bilan de la partie d'entraînement qui vient de se jouer, joueur par joueur. */
export function TrainingRecap({ ctx }) {
    const { state } = ctx;
    const playerIds = useMemo(() => {
        const first = state.ranking[0]?.sideIndex ?? 0;
        const order = [first, ...state.config.sides.map((_, i) => i).filter((i) => i !== first)];
        return order.flatMap((i) => state.config.sides[i].playerIds);
    }, [state]);
    const [picked, setPicked] = useState(null);
    const playerId = picked && playerIds.includes(picked) ? picked : playerIds[0];
    const turns = useMemo(() => state.turns.filter((t) => t.playerId === playerId), [state.turns, playerId]);
    const r = useMemo(() => recap(turns), [turns]);
    const map = useMemo(() => heatmapOfTurns(turns), [turns]);
    return (_jsxs("section", { className: "recap", "aria-label": "Statistiques de la partie", children: [playerIds.length > 1 && (_jsx("div", { className: "segmented recap-players", children: playerIds.map((id) => (_jsx("button", { className: id === playerId ? 'selected' : '', onClick: () => setPicked(id), children: ctx.nameOf(id) }, id))) })), _jsxs("div", { className: "recap-body", children: [_jsxs("div", { className: "recap-map", children: [_jsx(DartHeatmap, { data: map, table: false }), map.manual > 0 && (_jsx("div", { className: "recap-note", children: map.points.length
                                    ? `${map.manual} fléchette${map.manual > 1 ? 's' : ''} saisie${map.manual > 1 ? 's' : ''} à la main, hors carte`
                                    : 'Aucune fléchette vue par la caméra : la carte reste vide' }))] }), _jsxs("div", { className: "recap-stats", children: [_jsxs("div", { className: "recap-tiles", children: [_jsxs("div", { className: "recap-tile", children: [_jsx("span", { className: "recap-value", children: r.points }), _jsx("span", { className: "recap-label", children: "Score total" })] }), _jsxs("div", { className: "recap-tile", children: [_jsx("span", { className: "recap-value", children: r.darts }), _jsx("span", { className: "recap-label", children: "Fl\u00E9chettes lanc\u00E9es" })] }), _jsxs("div", { className: "recap-tile", children: [_jsx("span", { className: "recap-value", children: r.avg3 === null ? '–' : fr(r.avg3) }), _jsx("span", { className: "recap-label", children: "Moyenne (3 fl.)" })] }), _jsxs("div", { className: "recap-tile", children: [_jsx("span", { className: "recap-value", children: r.bestVolley ?? '–' }), _jsx("span", { className: "recap-label", children: "Plus haute vol\u00E9e" })] })] }), r.zones.length > 0 && (_jsxs("div", { className: "recap-zones", children: [_jsx("div", { className: "recap-label", children: "Secteurs touch\u00E9s" }), _jsx("div", { className: "recap-rings", children: r.zones.map((z) => (_jsxs("div", { className: `recap-ring ${z.zone === '0' ? 'miss' : ''}`, children: [_jsx("span", { className: "recap-ring-label", children: zoneName(z.zone) }), _jsx("span", { className: "recap-bar", children: _jsx("span", { style: { width: `${z.share}%` } }) }), _jsx("span", { className: "recap-ring-value", children: pct(z.share) })] }, z.zone))) })] }))] })] })] }));
}
