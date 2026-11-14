import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { EXTRA_GAMES, extraGame } from '../../extra-games/catalog';
import { extraPlayerGames, extraSummary, playedExtraModes } from '../../extra-games/stats';
import { LineChart, MeterBar } from '../components/Charts';
import { GameIcon } from '../components/GameIcon';
import { dateTime, ND, num, pct } from '../format';
import { MODE_VIEWS } from '../modes';
import { Segmented } from './Profile';
/**
 * Onglet « Autres jeux » de la fiche joueur : statistiques séparées des modes classiques, jeu par jeu.
 * Suit les filtres de format, de période et de saloon de la fiche (pas le filtre de mode classique).
 */
export function ExtrasTab({ records, playerId, filter }) {
    const all = useMemo(() => extraPlayerGames(records, playerId, filter), [records, playerId, filter.format, filter.from, filter.to]);
    const played = playedExtraModes(all);
    const [choice, setChoice] = useState('all');
    const mode = choice !== 'all' && played.includes(choice) ? choice : 'all';
    const games = mode === 'all' ? all : all.filter((g) => g.state.config.mode === mode);
    const s = extraSummary(games, mode === 'all' ? undefined : mode);
    const def = mode === 'all' ? null : extraGame(mode);
    if (all.length === 0) {
        return (_jsx("div", { className: "lib-empty", children: "Aucune partie d\u2019autres jeux termin\u00E9e pour ces filtres. Lance-en une depuis la tuile \u00AB Autres jeux \u00BB de l\u2019accueil." }));
    }
    return (_jsxs("div", { className: "profile-body", children: [_jsxs("div", { className: "profile-stats", children: [_jsx("div", { className: "lib-filters", children: _jsx(Segmented, { value: mode, options: [
                                { value: 'all', label: 'Tous' },
                                ...EXTRA_GAMES.filter((g) => played.includes(g.id)).map((g) => ({
                                    value: g.id,
                                    label: g.name,
                                })),
                            ], onChange: setChoice }) }), _jsxs("div", { className: "tiles tiles-5", children: [_jsxs("div", { className: "tile", children: [_jsx("span", { className: "tile-value", children: s.played }), _jsx("span", { className: "tile-label", children: "Parties termin\u00E9es" })] }), _jsxs("div", { className: "tile", children: [_jsx("span", { className: "tile-value", children: s.wins }), _jsx("span", { className: "tile-label", children: "Victoires" })] }), _jsxs("div", { className: "tile", children: [_jsx("span", { className: "tile-value", children: s.losses }), _jsx("span", { className: "tile-label", children: "D\u00E9faites" })] }), _jsxs("div", { className: "tile", children: [_jsx("span", { className: `tile-value ${s.winRate === null ? 'nd' : ''}`, children: pct(s.winRate) }), _jsx("span", { className: "tile-label", children: "Taux de victoire" })] }), _jsxs("div", { className: "tile", children: [_jsx("span", { className: "tile-value", children: s.darts.toLocaleString('fr-FR') }), _jsx("span", { className: "tile-label", children: "Fl\u00E9chettes lanc\u00E9es" })] })] }), _jsx(MeterBar, { label: "Taux de victoire", share: s.winRate, detail: `${s.wins} victoire${s.wins > 1 ? 's' : ''} sur ${s.played} partie${s.played > 1 ? 's' : ''}` }), def ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "tiles tiles-3", children: [_jsxs("div", { className: "tile", children: [_jsx("span", { className: `tile-value ${s.best === null ? 'nd' : ''}`, children: s.best ?? ND }), _jsx("span", { className: "tile-label", children: def.score.label })] }), _jsxs("div", { className: "tile", children: [_jsx("span", { className: `tile-value ${s.average === null ? 'nd' : ''}`, children: s.average === null ? ND : num(s.average, 1) }), _jsx("span", { className: "tile-label", children: "Moyenne par partie" })] }), _jsxs("div", { className: "tile", children: [_jsx("span", { className: `tile-value ${s.progression === null ? 'nd' : ''}`, children: s.progression === null ? ND : `${s.progression > 0 ? '+' : ''}${num(s.progression, 1)}` }), _jsx("span", { className: "tile-label", children: "Progression (5 derni\u00E8res parties contre les 5 d\u2019avant)" })] })] }), s.series.length > 1 && (_jsx(LineChart, { title: `${def.score.label.replace(/^Meilleur(e)? /, '')} partie par partie`, points: s.series.map((p) => ({
                                    label: new Date(p.endedAt).toLocaleDateString('fr-FR', {
                                        day: 'numeric',
                                        month: 'short',
                                    }),
                                    value: p.value,
                                    tip: `${p.value} · ${dateTime(p.endedAt)}`,
                                })), digits: 0 }))] })) : (_jsx("div", { className: "tile-detail", children: "Choisis un jeu pour voir son record, sa moyenne et sa progression." }))] }), _jsxs("div", { className: "profile-stats", children: [_jsx("h3", { className: "label", children: "Historique" }), _jsx("ol", { className: "history-list", children: games.slice(0, 60).map((g) => {
                            const { config } = g.record.session;
                            const nameOf = (id) => g.record.players.find((p) => p.id === id)?.name ?? '?';
                            const sideName = (i) => (config.teamMode ? config.sides[i].name : nameOf(config.sides[i].playerIds[0]));
                            const gameDef = extraGame(config.mode);
                            const rank = g.state.ranking.find((e) => e.sideIndex === g.sideIndex)?.rank ?? 0;
                            const others = config.sides
                                .flatMap((x) => x.playerIds)
                                .filter((id) => id !== playerId)
                                .map(nameOf);
                            const value = gameDef.score.of(g.state, g.sideIndex);
                            return (_jsxs("li", { children: [_jsxs("span", { className: "history-mode", children: [_jsx(GameIcon, { def: gameDef, size: 28 }), ' ', MODE_VIEWS[config.mode].title({
                                                state: g.state,
                                                nameOf,
                                                sideName,
                                            })] }), _jsx("span", { className: `history-result ${g.won ? 'win' : ''}`, children: g.won ? 'Victoire' : `${rank}e sur ${config.sides.length}` }), _jsxs("span", { className: "history-meta", children: [dateTime(g.endedAt), " \u00B7 ", gameDef.score.label.replace(/^Meilleur(e)? /, ''), " : ", value ?? ND, " \u00B7", ' ', others.length ? `avec ${others.join(', ')}` : 'seul'] })] }, g.record.id));
                        }) })] })] }));
}
