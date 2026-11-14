import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { comparePeriods, progression, scoreProfile, scoreRecords, VOLLEY_UNIT, x01Closure, } from '../../profiles/scores';
import { x01Stats } from '../../profiles/stats';
import { ColumnChart, DataTable, LineChart, MeterBar } from '../components/Charts';
import { dateTime, ND, num, pct, plural, withUnit } from '../format';
import { Segmented } from './Profile';
// Onglets « Scores » et « Progression » de la fiche joueur, et cartes de records du résumé.
const MODE_NAMES = {
    x01: '301/501/701',
    cricket: 'Cricket',
    random: 'Chiffre aléatoire',
    training: 'Entraînement',
};
function Tile({ value, label, detail }) {
    return (_jsxs("div", { className: "tile", children: [_jsx("span", { className: `tile-value ${value === ND ? 'nd' : ''}`, children: value }), _jsx("span", { className: "tile-label", children: label }), detail && _jsx("span", { className: "tile-detail", children: detail })] }));
}
/** Cartes de records : meilleure volée, meilleure moyenne sur une partie, plus grand checkout. */
export function RecordCards({ games, modes }) {
    const cards = modes.flatMap((mode) => {
        const r = scoreRecords(games, mode);
        if (!r.bestVolley)
            return [];
        const unit = VOLLEY_UNIT[mode];
        const out = [
            {
                key: `${mode}-v`,
                title: `Meilleure volée · ${MODE_NAMES[mode]}`,
                value: withUnit(r.bestVolley.value, unit),
                when: r.bestVolley.endedAt,
            },
            {
                key: `${mode}-a`,
                title: `Meilleure moyenne sur une partie · ${MODE_NAMES[mode]}`,
                value: r.bestGameAverage ? withUnit(r.bestGameAverage.value, unit) : ND,
                when: r.bestGameAverage?.endedAt,
                note: r.bestGameAverage ? `sur ${plural(r.bestGameAverage.volleys, 'volée')}` : 'il faut une partie d’au moins 3 volées',
            },
        ];
        if (mode === 'x01') {
            const best = Math.max(0, ...x01Stats(games).map((s) => s.bestCheckout ?? 0));
            out.push({
                key: 'x01-c',
                title: 'Plus grand checkout',
                value: best ? withUnit(best, unit) : ND,
            });
        }
        return out;
    });
    if (cards.length === 0)
        return null;
    return (_jsx("div", { className: "record-cards", children: cards.map((c) => (_jsxs("div", { className: "record-card", children: [_jsx("span", { className: "record-title", children: c.title }), _jsx("span", { className: `record-value ${c.value === ND ? 'nd' : ''}`, children: c.value }), _jsx("span", { className: "record-when", children: c.note ?? (c.when ? `le ${dateTime(c.when).slice(0, 10)}` : '') })] }, c.key))) }));
}
/** Choix du mode pour les onglets qui ont besoin d'un score de volée. */
export function ScoredModePicker({ value, available, onChange, }) {
    return (_jsx(Segmented, { value: value, options: ['x01', 'cricket', 'random', 'training']
            .filter((m) => available.includes(m) || m === value)
            .map((m) => ({ value: m, label: MODE_NAMES[m] })), onChange: onChange }));
}
export function ScoresTab(props) {
    const { games, mode, settings } = props;
    const unit = VOLLEY_UNIT[mode];
    const cricket = mode === 'cricket';
    const thresholds = cricket ? [3, 5, 7] : settings.statThresholds;
    const p = scoreProfile(games, mode, thresholds, settings.histogramStep);
    const closure = mode === 'x01' ? x01Closure(games) : [];
    const closed = closure.filter((c) => c.wins > 0);
    const unclosed = closure.filter((c) => c.wins === 0).map((c) => c.variant);
    if (p.volleys === 0)
        return _jsxs("div", { className: "lib-empty", children: ["Aucune vol\u00E9e en ", MODE_NAMES[mode], " pour ces filtres."] });
    return (_jsxs("div", { className: "scores-tab", children: [_jsxs("div", { className: "scores-col", children: [_jsxs("div", { className: "tiles tiles-3", children: [_jsx(Tile, { value: withUnit(p.average, unit), label: "Moyenne par vol\u00E9e", detail: `sur ${plural(p.volleys, 'volée')} · ${plural(p.games, 'partie')}` }), _jsx(Tile, { value: p.stdDev === null ? ND : `± ${num(p.stdDev)}`, label: `Régularité (écart type, en ${unit.many})`, detail: "plus c'est petit, plus les vol\u00E9es se ressemblent" }), _jsx(Tile, { value: withUnit(p.best, unit), label: "Meilleure vol\u00E9e", detail: p.best === null ? undefined : p.bestCount > 1 ? `réalisée ${p.bestCount} fois` : 'réalisée 1 fois' })] }), _jsxs("section", { className: "stat-card", children: [_jsxs("div", { className: "card-head", children: [_jsx("h3", { children: "Vol\u00E9es au-dessus des seuils" }), !cricket && (_jsx("button", { className: "small", onClick: props.onEditThresholds, children: "Modifier les seuils" }))] }), _jsx("div", { className: "meters", children: p.thresholds.map((t) => (_jsx(MeterBar, { label: `${withUnit(t.threshold, unit)} ou plus`, share: t.share, detail: `${t.count} volée${t.count > 1 ? 's' : ''} sur ${p.volleys}` }, t.threshold))) })] }), closure.length > 0 && (_jsxs("section", { className: "stat-card", children: [_jsx("h3", { children: "Cl\u00F4ture des parties gagn\u00E9es" }), closed.length > 0 && (_jsxs("table", { className: "compare-table closure-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", {}), _jsx("th", { children: "Victoires" }), _jsx("th", { children: "Vol\u00E9es (moy.)" }), _jsx("th", { children: "Fl\u00E9chettes (moy.)" }), _jsx("th", { children: "Plus rapide" })] }) }), _jsx("tbody", { children: closed.map((c) => (_jsxs("tr", { children: [_jsx("td", { children: c.variant }), _jsx("td", { children: c.wins }), _jsx("td", { children: num(c.avgVolleys) }), _jsx("td", { children: num(c.avgDarts) }), _jsx("td", { children: c.bestDarts === null ? ND : plural(c.bestDarts, 'fl.', 'fl.') })] }, c.variant))) })] })), _jsxs("div", { className: "tile-detail", children: ["Victoires en individuel seulement : en \u00E9quipe, la fin d\u00E9pend aussi des partenaires.", unclosed.length > 0 && ` Pas encore de victoire en ${unclosed.join(', ')}.`] })] }))] }), _jsxs("section", { className: "stat-card scores-col", children: [_jsxs("div", { className: "card-head", children: [_jsx("h3", { children: "R\u00E9partition des vol\u00E9es" }), !cricket && (_jsx(Segmented, { value: String(settings.histogramStep), options: ['10', '20', '30'].map((v) => ({
                                    value: v,
                                    label: `par ${v}`,
                                })), onChange: (v) => props.onStep(Number(v)) }))] }), _jsx(ColumnChart, { title: `Nombre de volées par tranche de ${unit.many}`, unit: cricket ? 'nombre de volées' : `nombre de volées, tranches de ${settings.histogramStep} ${unit.many}`, columns: p.histogram.map((b) => ({
                            label: cricket ? String(b.from) : `${b.from}`,
                            value: b.count,
                            tip: `${cricket ? withUnit(b.from, unit) : `${b.from} à ${b.to} ${unit.many}`} : ${plural(b.count, 'volée')} (${pct(b.share)})`,
                        })) }), _jsx(DataTable, { head: ['Tranche', 'Volées', 'Part'], rows: p.histogram.map((b) => [cricket ? withUnit(b.from, unit) : `${b.from} – ${b.to}`, b.count, pct(b.share)]) })] })] }));
}
const GRANULARITY = [
    { value: 'week', label: 'Semaine' },
    { value: 'month', label: 'Mois' },
    { value: 'year', label: 'Année' },
];
function bucketLabel(d, g, long = false) {
    if (g === 'year')
        return String(d.getFullYear());
    if (g === 'month')
        return d.toLocaleDateString('fr-FR', {
            month: long ? 'long' : 'short',
            year: long ? 'numeric' : '2-digit',
        });
    return long ? `semaine du ${d.toLocaleDateString('fr-FR')}` : d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}
function signed(v, digits = 1, suffix = '') {
    if (v === null)
        return ND;
    const s = v.toLocaleString('fr-FR', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    });
    return `${v > 0 ? '+' : ''}${s}${suffix}`;
}
export function ProgressionTab(props) {
    const { games, mode } = props;
    const [granularity, setGranularity] = useState('month');
    const unit = VOLLEY_UNIT[mode];
    const pts = progression(games, mode, granularity);
    const from = props.filter.from ?? new Date(Date.now() - 30 * 86400000).toISOString();
    const to = props.filter.to ?? new Date().toISOString();
    const cmp = comparePeriods(props.records, props.playerId, {
        ...props.filter,
        mode,
        from,
        to,
    });
    const span = Math.round((Date.parse(to) - Date.parse(from)) / 86400000);
    const rows = [
        {
            label: 'Parties terminées',
            cur: String(cmp.current.games),
            prev: String(cmp.previous.games),
            delta: signed(cmp.current.games - cmp.previous.games, 0),
        },
        {
            label: 'Victoires',
            cur: String(cmp.current.wins),
            prev: String(cmp.previous.wins),
            delta: signed(cmp.current.wins - cmp.previous.wins, 0),
        },
        {
            label: 'Taux de victoire',
            cur: pct(cmp.current.winRate),
            prev: pct(cmp.previous.winRate),
            delta: cmp.current.winRate !== null && cmp.previous.winRate !== null
                ? signed(cmp.current.winRate - cmp.previous.winRate, 0, Math.abs(Math.round(cmp.current.winRate - cmp.previous.winRate)) < 2 ? ' pt' : ' pts')
                : ND,
        },
        {
            label: `Moyenne par volée (${unit.many})`,
            cur: num(cmp.current.average),
            prev: num(cmp.previous.average),
            delta: cmp.averageDelta === null ? ND : `${signed(cmp.averageDelta)} (${signed(cmp.averageDeltaPct, 0, ' %')})`,
        },
        {
            label: `Meilleure volée (${unit.many})`,
            cur: cmp.current.best === null ? ND : String(cmp.current.best),
            prev: cmp.previous.best === null ? ND : String(cmp.previous.best),
            delta: cmp.current.best !== null && cmp.previous.best !== null ? signed(cmp.current.best - cmp.previous.best, 0) : ND,
        },
    ];
    return (_jsxs("div", { className: "scores-tab", children: [_jsxs("section", { className: "stat-card scores-col", children: [_jsxs("div", { className: "card-head", children: [_jsxs("h3", { children: ["Moyenne par vol\u00E9e, en ", unit.many] }), _jsx(Segmented, { value: granularity, options: GRANULARITY, onChange: setGranularity })] }), pts.length === 0 ? (_jsxs("div", { className: "tile-label", children: ["Aucune vol\u00E9e en ", MODE_NAMES[mode], " pour ces filtres."] })) : (_jsxs(_Fragment, { children: [_jsx(LineChart, { title: `Moyenne par volée par ${GRANULARITY.find((g) => g.value === granularity).label.toLowerCase()}`, digits: mode === 'cricket' ? 2 : 1, points: pts.map((p) => ({
                                    label: bucketLabel(p.start, granularity),
                                    value: p.average,
                                    tip: `${bucketLabel(p.start, granularity, true)} : ${withUnit(p.average, unit)} par volée · ${plural(p.games, 'partie')}, ${plural(p.volleys, 'volée')}`,
                                })) }), _jsx(DataTable, { head: ['Période', 'Parties', 'Volées', 'Moyenne', 'Évolution'], rows: pts.map((p, i) => [
                                    bucketLabel(p.start, granularity, true),
                                    p.games,
                                    p.volleys,
                                    num(p.average, mode === 'cricket' ? 2 : 1),
                                    i === 0 ? '' : signed(p.average - pts[i - 1].average),
                                ]) })] }))] }), _jsxs("section", { className: "stat-card scores-col", children: [_jsx("h3", { children: "P\u00E9riode actuelle et pr\u00E9c\u00E9dente" }), _jsxs("div", { className: "tile-detail", children: [props.filter.from ? '' : 'Aucune période choisie : comparaison des 30 derniers jours. ', span, " jours, du ", new Date(from).toLocaleDateString('fr-FR'), " au ", new Date(to).toLocaleDateString('fr-FR'), ", contre les ", span, ' ', "jours d\u2019avant."] }), _jsxs("table", { className: "compare-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", {}), _jsx("th", { children: "Actuelle" }), _jsx("th", { children: "Pr\u00E9c\u00E9dente" }), _jsx("th", { children: "\u00C9volution" })] }) }), _jsx("tbody", { children: rows.map((r) => (_jsxs("tr", { children: [_jsx("td", { children: r.label }), _jsx("td", { children: r.cur }), _jsx("td", { children: r.prev }), _jsx("td", { className: r.delta.startsWith('+') ? 'up' : r.delta.startsWith('-') ? 'down' : '', children: r.delta })] }, r.label))) })] }), cmp.averageDeltaPct !== null && Math.round(cmp.averageDeltaPct) !== 0 && (_jsxs("div", { className: "compare-summary", children: ["Moyenne ", cmp.averageDeltaPct > 0 ? 'en hausse' : 'en baisse', " de ", num(Math.abs(cmp.averageDeltaPct), 0), " % par rapport \u00E0 la p\u00E9riode pr\u00E9c\u00E9dente."] }))] })] }));
}
