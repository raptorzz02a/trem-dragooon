import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { isScoredMode, scoreRankings, VOLLEY_UNIT } from '../../profiles/scores';
import { MIN_RANKED_GAMES } from '../../profiles/stats';
import { Avatar } from '../components/Avatar';
import { ALL_TIME, PeriodFilter, periodRange } from '../components/PeriodFilter';
import { ND, num, pct } from '../format';
import { FORMAT_FILTERS, MODE_FILTERS, Segmented } from './Profile';
import { EXTRA_GAMES, extraGame } from '../../extra-games/catalog';
import { extraRankings } from '../../extra-games/stats';
import './Library.css';
const KEY_LABEL = {
    x01: 'Moy. volée',
    cricket: 'Marques/volée',
    clock: 'Record (fl.)',
    random: 'Meilleur score',
    training: 'Meilleur total',
};
// L'Entraînement ne compte pas dans les victoires : il n'a pas de classement.
const RANKING_MODES = MODE_FILTERS.filter((m) => m.value !== 'training');
const SORTS = [
    { value: 'winRate', label: 'Victoires' },
    { value: 'average', label: 'Moyenne' },
    { value: 'bestVolley', label: 'Record de volée' },
    { value: 'progression', label: 'Progression' },
];
export function Rankings({ profiles, games, onOpen, onBack, title = 'Classements', backLabel = '← Accueil', minGames = MIN_RANKED_GAMES, note, }) {
    const [mode, setMode] = useState('all');
    const [period, setPeriod] = useState(ALL_TIME);
    const [format, setFormat] = useState('all');
    const [sortChoice, setSort] = useState('winRate');
    const [family, setFamily] = useState('classic');
    const [extraMode, setExtraMode] = useState(EXTRA_GAMES[0].id);
    const scored = isScoredMode(mode === 'all' ? undefined : mode);
    // Moyenne, record et progression n'ont de sens que pour un mode à score.
    const sort = scored ? sortChoice : 'winRate';
    const range = periodRange(period);
    const { ranked, unranked } = useMemo(() => scoreRankings(games, profiles, { mode: mode === 'all' ? undefined : mode, format, ...range }, sort, minGames), [games, profiles, mode, range.from, range.to, format, sort, minGames]);
    const profileOf = (id) => profiles.find((p) => p.id === id);
    const unit = mode !== 'all' && isScoredMode(mode) ? VOLLEY_UNIT[mode].many : '';
    const digits = mode === 'cricket' ? 2 : 1;
    const sortValue = (r) => {
        if (sort === 'average')
            return num(r.average, digits);
        if (sort === 'bestVolley')
            return r.bestVolley === null ? ND : String(r.bestVolley);
        if (sort === 'progression') {
            if (r.progression === null)
                return ND;
            const v = r.progression.toLocaleString('fr-FR', {
                minimumFractionDigits: digits,
                maximumFractionDigits: digits,
            });
            return r.progression > 0 ? `+${v}` : v;
        }
        return mode === 'all' ? '' : num(r.key, mode === 'cricket' ? 2 : mode === 'x01' ? 1 : 0);
    };
    const lastHead = sort === 'average'
        ? `Moyenne (${unit})`
        : sort === 'bestVolley'
            ? `Record (${unit})`
            : sort === 'progression'
                ? `Progression (${unit})`
                : mode === 'all'
                    ? ''
                    : KEY_LABEL[mode];
    const row = (r, pos, unrankedRow = false) => {
        const p = profileOf(r.playerId);
        const v = sortValue(r);
        return (_jsxs("button", { className: `ranking-row${unrankedRow ? ' unranked' : ''}`, onClick: () => onOpen(r.playerId), children: [_jsx("span", { className: "ranking-pos", children: pos }), _jsx(Avatar, { avatar: p.avatar, color: p.color, size: 48 }), _jsx("span", { className: "ranking-name", children: r.name }), _jsx("span", { className: "ranking-num", children: r.games }), _jsx("span", { className: "ranking-num", children: r.wins }), _jsx("span", { className: "ranking-num", children: pct(r.winRate) }), _jsx("span", { className: `ranking-num ${v === ND ? 'nd' : ''}`, children: v })] }, r.playerId));
    };
    return (_jsxs("div", { className: "screen library rankings-screen", children: [_jsxs("header", { className: "lib-header", children: [_jsx("button", { onClick: onBack, children: backLabel }), _jsx("h2", { children: title })] }), _jsx("div", { className: "lib-filters", children: _jsx(Segmented, { value: family, options: [
                        { value: 'classic', label: 'Modes classiques' },
                        { value: 'extra', label: 'Autres jeux' },
                    ], onChange: setFamily }) }), _jsxs("div", { className: "lib-filters", children: [family === 'classic' ? (_jsx(Segmented, { value: mode, options: RANKING_MODES, onChange: setMode })) : (_jsx(Segmented, { value: extraMode, options: EXTRA_GAMES.map((g) => ({ value: g.id, label: g.name })), onChange: setExtraMode })), _jsx(Segmented, { value: format, options: FORMAT_FILTERS, onChange: setFormat })] }), _jsx("div", { className: "lib-filters", children: _jsx(PeriodFilter, { value: period, onChange: setPeriod }) }), family === 'extra' ? (_jsxs(_Fragment, { children: [note && _jsx("div", { className: "tile-label rankings-note", children: note }), _jsx(ExtraTable, { mode: extraMode, rows: extraRankings(games, profiles, { mode: extraMode, format, ...range }, minGames), minGames: minGames, profileOf: profileOf, onOpen: onOpen })] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "lib-filters", children: [_jsx("span", { className: "label", children: "Classer par" }), _jsx("div", { className: "segmented", children: SORTS.map((o) => (_jsx("button", { className: sort === o.value ? 'selected' : '', disabled: o.value !== 'winRate' && !scored, onClick: () => setSort(o.value), children: o.label }, o.value))) }), _jsx("span", { className: "tile-label", children: !scored
                                    ? 'Choisissez 301/501/701, Cricket ou Chiffre aléatoire pour classer par moyenne, record ou progression.'
                                    : sort === 'progression'
                                        ? range.from
                                            ? 'Écart de moyenne avec la période précédente de même durée.'
                                            : 'Choisissez une période pour mesurer la progression.'
                                        : '' })] }), note && _jsx("div", { className: "tile-label rankings-note", children: note }), ranked.length + unranked.length === 0 ? (_jsx("div", { className: "lib-empty", children: "Aucune partie termin\u00E9e pour ces filtres (l\u2019entra\u00EEnement ne compte pas)." })) : (_jsxs("div", { className: "ranking-table", children: [_jsxs("div", { className: "ranking-row head", children: [_jsx("span", { children: "#" }), _jsx("span", {}), _jsx("span", { children: "Joueur" }), _jsx("span", { className: "ranking-num", children: "Parties" }), _jsx("span", { className: "ranking-num", children: "Victoires" }), _jsx("span", { className: "ranking-num", children: "% victoires" }), _jsx("span", { className: "ranking-num", children: lastHead })] }), ranked.map((r, i) => row(r, String(i + 1))), unranked.length > 0 && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "label ranking-sep", children: ["Moins de ", minGames, " partie", minGames > 1 ? 's' : '', " : pas encore class\u00E9s"] }), unranked.map((r) => row(r, '–', true))] }))] }))] }))] }));
}
/** Classement d'un des autres jeux : taux de victoire, puis statistique propre au jeu. */
function ExtraTable({ mode, rows, minGames, profileOf, onOpen, }) {
    const def = extraGame(mode);
    const row = (r, pos, unranked = false) => {
        const p = profileOf(r.playerId);
        return (_jsxs("button", { className: `ranking-row${unranked ? ' unranked' : ''}`, onClick: () => onOpen(r.playerId), children: [_jsx("span", { className: "ranking-pos", children: pos }), _jsx(Avatar, { avatar: p.avatar, color: p.color, size: 48 }), _jsx("span", { className: "ranking-name", children: r.name }), _jsx("span", { className: "ranking-num", children: r.games }), _jsx("span", { className: "ranking-num", children: r.wins }), _jsx("span", { className: "ranking-num", children: pct(r.winRate) }), _jsx("span", { className: `ranking-num ${r.best === null ? 'nd' : ''}`, children: r.best ?? ND })] }, r.playerId));
    };
    if (rows.ranked.length + rows.unranked.length === 0)
        return _jsxs("div", { className: "lib-empty", children: ["Aucune partie de ", def.name, " termin\u00E9e pour ces filtres."] });
    return (_jsxs("div", { className: "ranking-table", children: [_jsxs("div", { className: "ranking-row head", children: [_jsx("span", { children: "#" }), _jsx("span", {}), _jsx("span", { children: "Joueur" }), _jsx("span", { className: "ranking-num", children: "Parties" }), _jsx("span", { className: "ranking-num", children: "Victoires" }), _jsx("span", { className: "ranking-num", children: "% victoires" }), _jsx("span", { className: "ranking-num", children: def.score.label })] }), rows.ranked.map((r, i) => row(r, String(i + 1))), rows.unranked.length > 0 && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "label ranking-sep", children: ["Moins de ", minGames, " partie", minGames > 1 ? 's' : '', " : pas encore class\u00E9s"] }), rows.unranked.map((r) => row(r, '–', true))] }))] }));
}
