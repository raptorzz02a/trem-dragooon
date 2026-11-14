import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { computeState } from '../../game-engine/engine';
import { clockStats, cricketStats, favouriteHits, playerGames, randomStats, summary, trainingStats, x01Stats, } from '../../profiles/stats';
import { DELETED_SALOON_NAME, saloonOf } from '../../online/saloons';
import { Avatar } from '../components/Avatar';
import { ProfileEditor } from '../components/ProfileEditor';
import { dateTime, duration, ND, num, pct } from '../format';
import { MODE_VIEWS } from '../modes';
import { isClassicMode } from '../../game-setup/setup';
import { playerCsv } from '../../profiles/export';
import { isScoredMode } from '../../profiles/scores';
import { MeterBar } from '../components/Charts';
import { DartHeatmap } from '../components/DartHeatmap';
import { heatmap, MAX_POINTS } from '../../profiles/heatmap';
import { ALL_TIME, PeriodFilter, periodRange } from '../components/PeriodFilter';
import { ProgressionTab, RecordCards, ScoredModePicker, ScoresTab } from './ProfileTabs';
import { ExtrasTab } from './ProfileExtras';
import { extraPlayerGames } from '../../extra-games/stats';
import './Library.css';
export const MODE_FILTERS = [
    { value: 'all', label: 'Tous' },
    { value: 'x01', label: '301/501/701' },
    { value: 'cricket', label: 'Cricket' },
    { value: 'clock', label: 'Horloge' },
    { value: 'random', label: 'Chiffre aléatoire' },
    { value: 'training', label: 'Entraînement' },
];
export const FORMAT_FILTERS = [
    { value: 'all', label: 'Tout' },
    { value: 'solo', label: 'Individuel' },
    { value: 'team', label: 'Équipes' },
];
export function Segmented(props) {
    return (_jsx("div", { className: "segmented", children: props.options.map((o) => (_jsx("button", { className: props.value === o.value ? 'selected' : '', onClick: () => props.onChange(o.value), children: o.label }, o.value))) }));
}
function Stat({ label, value }) {
    return (_jsxs("div", { children: [_jsx("dt", { children: label }), _jsx("dd", { children: value })] }));
}
/** Seuils de volée suivis (part des volées au moins égales), de 1 à 180. */
function ThresholdsDialog({ values, onSave, onCancel }) {
    const [draft, setDraft] = useState(values.map(String));
    const parsed = draft.map((v) => Number(v));
    const valid = parsed.every((v) => Number.isInteger(v) && v >= 1 && v <= 180);
    return (_jsx("div", { className: "overlay", children: _jsxs("div", { className: "dialog", children: [_jsx("strong", { children: "Seuils de vol\u00E9e suivis" }), _jsx("span", { className: "tile-label", children: "Pour chaque seuil, la fiche montre la part des vol\u00E9es qui l\u2019atteignent (de 1 \u00E0 180 points)." }), _jsx("div", { className: "threshold-inputs", children: draft.map((v, i) => (_jsx("input", { type: "number", inputMode: "numeric", min: 1, max: 180, value: v, onChange: (e) => setDraft(draft.map((x, j) => (j === i ? e.target.value : x))) }, i))) }), _jsxs("div", { className: "dialog-actions", children: [_jsx("button", { onClick: () => setDraft(['60', '100', '140']), children: "Valeurs par d\u00E9faut" }), _jsx("button", { onClick: onCancel, children: "Annuler" }), _jsx("button", { className: "btn-gold", disabled: !valid, onClick: () => onSave([...new Set(parsed)].sort((a, b) => a - b)), children: "Enregistrer" })] })] }) }));
}
function ModeCards({ games }) {
    const cricket = cricketStats(games);
    const clock = clockStats(games);
    const random = randomStats(games);
    const training = trainingStats(games);
    return (_jsxs(_Fragment, { children: [x01Stats(games).map((s) => (_jsxs("section", { className: "stat-card", children: [_jsxs("h3", { children: [s.variant, " \u00B7 ", s.games, " partie", s.games > 1 ? 's' : ''] }), _jsxs("dl", { children: [_jsx(Stat, { label: "Moyenne par vol\u00E9e", value: num(s.avgVolley) }), _jsx(Stat, { label: "Moyenne par fl\u00E9chette", value: num(s.avgDart) }), _jsx(Stat, { label: "R\u00E9ussite aux doubles", value: pct(s.doubleRate) }), _jsx(Stat, { label: "Meilleure vol\u00E9e", value: s.bestVolley ?? ND }), _jsx(Stat, { label: "Meilleure finition", value: s.bestCheckout ?? ND }), _jsx(Stat, { label: "Busts", value: s.busts }), _jsx(Stat, { label: "Vol\u00E9es 100+", value: s.over100 }), _jsx(Stat, { label: "Vol\u00E9es 140+", value: s.over140 }), _jsx(Stat, { label: "180", value: s.max180 })] })] }, s.variant))), cricket.games > 0 && (_jsxs("section", { className: "stat-card", children: [_jsxs("h3", { children: ["Cricket \u00B7 ", cricket.games, " partie", cricket.games > 1 ? 's' : ''] }), _jsxs("dl", { children: [_jsx(Stat, { label: "Marques par vol\u00E9e", value: num(cricket.mpr, 2) }), _jsx(Stat, { label: "Marques", value: cricket.marks }), _jsx(Stat, { label: "Dur\u00E9e moyenne", value: duration(cricket.avgDurationMs) })] })] })), clock.games > 0 && (_jsxs("section", { className: "stat-card", children: [_jsxs("h3", { children: ["Horloge \u00B7 ", clock.games, " partie", clock.games > 1 ? 's' : ''] }), _jsxs("dl", { children: [_jsx(Stat, { label: "Parcours termin\u00E9s", value: clock.completions }), _jsx(Stat, { label: "Dur\u00E9e moyenne", value: duration(clock.avgDurationMs) }), clock.best.map((b) => (_jsx(Stat, { label: `Record · ${b.variant}`, value: `${b.darts} fléchettes` }, b.variant)))] })] })), random.games > 0 && (_jsxs("section", { className: "stat-card", children: [_jsxs("h3", { children: ["Chiffre al\u00E9atoire \u00B7 ", random.games, " partie", random.games > 1 ? 's' : ''] }), _jsxs("dl", { children: [_jsx(Stat, { label: "Meilleur score", value: random.bestScore ?? ND }), _jsx(Stat, { label: "Score moyen", value: num(random.avgScore, 0) }), _jsx(Stat, { label: "Meilleure vol\u00E9e", value: random.bestVolley ?? ND }), _jsx(Stat, { label: "Fl\u00E9chettes sur le num\u00E9ro", value: pct(random.hitRate) }), _jsx(Stat, { label: "Points sur le Bull", value: random.bullRounds ? random.bullPoints : ND }), _jsx(Stat, { label: "Dur\u00E9e moyenne", value: duration(random.avgDurationMs) })] })] })), training.games > 0 && (_jsxs("section", { className: "stat-card", children: [_jsxs("h3", { children: ["Entra\u00EEnement \u00B7 ", training.games, " partie", training.games > 1 ? 's' : ''] }), _jsxs("dl", { children: [_jsx(Stat, { label: "Fl\u00E9chettes lanc\u00E9es", value: training.darts }), _jsx(Stat, { label: "Points marqu\u00E9s", value: training.points }), _jsx(Stat, { label: "Moyenne sur 3 fl\u00E9chettes", value: num(training.avg3) }), _jsx(Stat, { label: "Meilleure vol\u00E9e", value: training.bestVolley ?? ND }), _jsx(Stat, { label: "Meilleur total", value: training.bestScore ?? ND }), _jsx(Stat, { label: "Vol\u00E9es 100+", value: training.over100 }), _jsx(Stat, { label: "Vol\u00E9es 140+", value: training.over140 }), _jsx(Stat, { label: "180", value: training.max180 }), _jsx(Stat, { label: "Dur\u00E9e moyenne", value: duration(training.avgDurationMs) })] })] }))] }));
}
/** Historique : toutes les parties du joueur, abandonnées comprises. */
function History({ records, playerId, filter }) {
    const rows = records
        .filter((r) => {
        const c = r.session.config;
        if (!isClassicMode(c.mode))
            return false; // jeu retiré (ancien Shanghai)
        if (!c.sides.some((s) => s.playerIds.includes(playerId)))
            return false;
        if (r.session.status !== 'finished' && r.session.status !== 'abandoned')
            return false;
        if (filter.mode && c.mode !== filter.mode)
            return false;
        if (filter.format === 'solo' && c.teamMode)
            return false;
        if (filter.format === 'team' && !c.teamMode)
            return false;
        return true;
    })
        .sort((a, b) => ((a.session.endedAt ?? a.session.createdAt) < (b.session.endedAt ?? b.session.createdAt) ? 1 : -1))
        .slice(0, 60);
    if (rows.length === 0)
        return _jsx("div", { className: "tile-label", children: "Aucune partie." });
    return (_jsx("ol", { className: "history-list", children: rows.map((r) => {
            const { config } = r.session;
            const state = computeState(config, r.session.events);
            const side = config.sides.findIndex((s) => s.playerIds.includes(playerId));
            const nameOf = (id) => r.players.find((p) => p.id === id)?.name ?? '?';
            const sideName = (i) => (config.teamMode ? config.sides[i].name : nameOf(config.sides[i].playerIds[0]));
            const title = MODE_VIEWS[config.mode].title({ state, nameOf, sideName });
            let result = { text: 'Abandonnée', cls: 'muted' };
            if (r.session.status === 'finished') {
                const rank = state.ranking.find((e) => e.sideIndex === side)?.rank ?? 0;
                if (config.mode === 'training')
                    result = { text: `${state.mode.scores[side]} pts`, cls: 'muted' };
                else if (config.training)
                    result = { text: 'Entraînement', cls: 'muted' };
                else if (state.winners.includes(side))
                    result = { text: 'Victoire', cls: 'win' };
                else
                    result = { text: `${rank}e sur ${config.sides.length}`, cls: '' };
            }
            const others = config.sides.flatMap((s) => s.playerIds).filter((id) => id !== playerId).map(nameOf);
            const team = config.teamMode ? `${config.sides[side].name} · ` : '';
            return (_jsxs("li", { children: [_jsx("span", { className: "history-mode", children: title }), _jsx("span", { className: `history-result ${result.cls}`, children: result.text }), _jsxs("span", { className: "history-meta", children: [dateTime(r.session.endedAt ?? r.session.createdAt), " \u00B7 ", team, others.length ? `avec ${others.join(', ')}` : 'seul'] })] }, r.id));
        }) }));
}
const ALL_SALOONS = 'all';
const DELETED_SALOONS = 'deleted';
const TABS = [
    { value: 'summary', label: 'Résumé' },
    { value: 'scores', label: 'Scores' },
    { value: 'progress', label: 'Progression' },
    { value: 'heatmap', label: 'Heat map' },
    { value: 'history', label: 'Historique' },
    { value: 'extras', label: 'Autres jeux' },
];
function download(name, content, type) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function Profile({ profile, profiles, games: allGames, settings, onSettings, onSave, onDelete, onBack, readOnly = false, backLabel = '← Joueurs', saloons, initialSaloon = ALL_SALOONS, allSaloonsLabel = 'Tous saloons', }) {
    const [tab, setTab] = useState('summary');
    // Un saloon où le joueur n'a pas de partie ne sert pas de point de départ.
    const [saloon, setSaloon] = useState(() => (saloons?.some((x) => x.id === initialSaloon) ? initialSaloon : ALL_SALOONS));
    const known = useMemo(() => new Set(saloons?.map((x) => x.id)), [saloons]);
    const hasDeleted = !!saloons && allGames.some((g) => !known.has(saloonOf(g)));
    const saloonOptions = saloons && [
        { value: ALL_SALOONS, label: allSaloonsLabel },
        ...saloons.map((x) => ({ value: x.id, label: `${x.icon} ${x.name}` })),
        ...(hasDeleted ? [{ value: DELETED_SALOONS, label: DELETED_SALOON_NAME }] : []),
    ];
    // Les exports et l'impression suivent le saloon choisi, comme les autres filtres.
    const games = useMemo(() => !saloons || saloon === ALL_SALOONS
        ? allGames
        : allGames.filter((g) => (saloon === DELETED_SALOONS ? !known.has(saloonOf(g)) : saloonOf(g) === saloon)), [allGames, saloons, saloon, known]);
    const [mode, setMode] = useState('all');
    const [format, setFormat] = useState('all');
    const [period, setPeriod] = useState(ALL_TIME);
    const [editing, setEditing] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [editThresholds, setEditThresholds] = useState(false);
    const range = periodRange(period);
    const filter = { mode: mode === 'all' ? undefined : mode, format, ...range };
    const list = useMemo(() => playerGames(games, profile.id, filter), [games, profile.id, mode, format, range.from, range.to]);
    const s = summary(list);
    // Les fléchettes des autres jeux s'ajoutent au total (seul chiffre partagé avec les modes classiques).
    const extraDarts = useMemo(() => (mode === 'all' ? extraPlayerGames(games, profile.id, { format, ...range }).reduce((n, g) => n + g.turns.reduce((m, t) => m + t.darts.length, 0), 0) : 0), [games, profile.id, mode, format, range.from, range.to]);
    const fav = favouriteHits(list);
    // Modes à score joués sur la période, du plus joué au moins joué : le premier sert par défaut aux onglets de score.
    const played = ['x01', 'cricket', 'random', 'training']
        .map((m) => ({ m, n: list.filter((g) => g.state.config.mode === m).length }))
        .filter((x) => x.n > 0)
        .sort((a, b) => b.n - a.n)
        .map((x) => x.m);
    const [scoredChoice, setScoredChoice] = useState(null);
    const scored = isScoredMode(filter.mode) ? filter.mode : scoredChoice && played.includes(scoredChoice) ? scoredChoice : played[0] ?? null;
    const pickScored = (m) => (mode === 'all' ? setScoredChoice(m) : setMode(m));
    return (_jsxs("div", { className: "screen library profile-screen", children: [_jsxs("header", { className: "profile-head", children: [_jsx("button", { onClick: onBack, children: backLabel }), _jsx(Avatar, { avatar: profile.avatar, color: profile.color, size: 60 }), _jsx("h2", { children: profile.name }), _jsx("button", { className: "no-print", onClick: () => download(`${profile.name}-volees.csv`, playerCsv(list), 'text/csv;charset=utf-8'), children: "Exporter CSV" }), _jsx("button", { className: "no-print", onClick: () => window.print(), children: "Imprimer / PDF" }), !readOnly && (_jsxs(_Fragment, { children: [_jsx("button", { className: "no-print", onClick: () => setEditing(true), children: "Modifier" }), _jsx("button", { className: "btn-danger no-print", onClick: () => setConfirmDelete(true), children: "Supprimer" })] }))] }), _jsxs("div", { className: "lib-filters no-print", children: [_jsx(Segmented, { value: tab, options: TABS, onChange: setTab }), _jsx(Segmented, { value: format, options: FORMAT_FILTERS, onChange: setFormat })] }), _jsxs("div", { className: "lib-filters no-print", children: [tab !== 'extras' && _jsx(Segmented, { value: mode, options: MODE_FILTERS, onChange: setMode }), _jsx(PeriodFilter, { value: period, onChange: setPeriod })] }), saloonOptions && saloonOptions.length > 2 && (_jsxs("div", { className: "lib-filters no-print", children: [_jsx("span", { className: "label", children: "Saloon" }), _jsx(Segmented, { value: saloon, options: saloonOptions, onChange: setSaloon })] })), _jsxs("div", { className: "print-only", children: [saloonOptions && `${saloonOptions.find((o) => o.value === saloon)?.label ?? allSaloonsLabel} · `, TABS.find((t) => t.value === tab).label, " \u00B7", ' ', MODE_FILTERS.find((m) => m.value === ((tab === 'scores' || tab === 'progress') && mode === 'all' && scored ? scored : mode)).label, " \u00B7", ' ', range.from ? `du ${new Date(range.from).toLocaleDateString('fr-FR')} au ${new Date(range.to).toLocaleDateString('fr-FR')}` : 'tout l’historique'] }), _jsxs("div", { className: "profile-content", children: [tab === 'summary' && (_jsxs("div", { className: "profile-body", children: [_jsxs("div", { className: "profile-stats", children: [_jsxs("div", { className: "tiles tiles-5", children: [_jsxs("div", { className: "tile", children: [_jsx("span", { className: "tile-value", children: s.played }), _jsx("span", { className: "tile-label", children: "Parties termin\u00E9es" })] }), _jsxs("div", { className: "tile", children: [_jsx("span", { className: "tile-value", children: (s.darts + extraDarts).toLocaleString('fr-FR') }), _jsxs("span", { className: "tile-label", children: ["Fl\u00E9chettes lanc\u00E9es", extraDarts > 0 ? ' (autres jeux compris)' : ''] })] }), _jsxs("div", { className: "tile", children: [_jsx("span", { className: "tile-value", children: s.wins }), _jsxs("span", { className: "tile-label", children: ["Victoires (", s.soloWins, " solo \u00B7 ", s.teamWins, " \u00E9quipe)"] })] }), _jsxs("div", { className: "tile", children: [_jsx("span", { className: "tile-value", children: s.losses }), _jsx("span", { className: "tile-label", children: "D\u00E9faites" })] }), _jsxs("div", { className: "tile", children: [_jsx("span", { className: `tile-value ${s.winRate === null ? 'nd' : ''}`, children: pct(s.winRate) }), _jsx("span", { className: "tile-label", children: "Taux de victoire" })] })] }), _jsx(MeterBar, { label: "Taux de victoire", share: s.winRate, detail: `${s.wins} victoire${s.wins > 1 ? 's' : ''} sur ${s.competitive} partie${s.competitive > 1 ? 's' : ''} hors entraînement` }), s.played > s.competitive && (_jsxs("div", { className: "tile-label", children: ["Dont ", s.played - s.competitive, " partie(s) d\u2019entra\u00EEnement, compt\u00E9es dans les statistiques mais pas dans les victoires."] })), _jsx(RecordCards, { games: list, modes: isScoredMode(filter.mode) ? [filter.mode] : played })] }), _jsxs("div", { className: "profile-stats", children: [_jsx(ModeCards, { games: list }), (fav.triple || fav.single) && (_jsxs("section", { className: "stat-card", children: [_jsx("h3", { children: "Num\u00E9ros les plus touch\u00E9s" }), _jsxs("dl", { children: [_jsx(Stat, { label: "Triple", value: fav.triple ? `T${fav.triple.segment} · ${pct(fav.triple.share)} des triples` : ND }), _jsx(Stat, { label: "Simple", value: fav.single ? `S${fav.single.segment} · ${pct(fav.single.share)} des simples` : ND })] }), _jsx("div", { className: "tile-detail", children: "D\u2019apr\u00E8s les fl\u00E9chettes saisies zone par zone (hors Horloge). Ne dit rien de la cible vis\u00E9e." })] })), list.length === 0 && _jsx("div", { className: "lib-empty", children: "Aucune partie termin\u00E9e pour ces filtres." })] })] })), (tab === 'scores' || tab === 'progress') && (_jsx(_Fragment, { children: mode === 'clock' ? (_jsx("div", { className: "lib-empty", children: "Non disponible pour l\u2019Horloge : on n\u2019y note que Touch\u00E9 ou Rat\u00E9, sans score de vol\u00E9e. Les records d\u2019Horloge sont dans le R\u00E9sum\u00E9." })) : scored === null ? (_jsx("div", { className: "lib-empty", children: "Aucune partie de 301/501/701, Cricket, Chiffre al\u00E9atoire ou Entra\u00EEnement pour ces filtres." })) : (_jsxs(_Fragment, { children: [mode === 'all' && (_jsxs("div", { className: "lib-filters no-print", children: [_jsx("span", { className: "label", children: "Mode affich\u00E9" }), _jsx(ScoredModePicker, { value: scored, available: played, onChange: pickScored })] })), tab === 'scores' ? (_jsx(ScoresTab, { games: list, mode: scored, settings: settings, onEditThresholds: () => setEditThresholds(true), onStep: (histogramStep) => onSettings({ histogramStep }) })) : (_jsx(ProgressionTab, { games: list, records: games, playerId: profile.id, mode: scored, filter: filter }))] })) })), tab === 'heatmap' && _jsx(HeatmapTab, { games: list }), tab === 'extras' && _jsx(ExtrasTab, { records: games, playerId: profile.id, filter: { format, ...range } }), tab === 'history' && (_jsx("div", { className: "profile-history", children: _jsx(History, { records: games, playerId: profile.id, filter: filter }) }))] }), editThresholds && (_jsx(ThresholdsDialog, { values: settings.statThresholds, onCancel: () => setEditThresholds(false), onSave: (statThresholds) => {
                    onSettings({ statThresholds });
                    setEditThresholds(false);
                } })), editing && (_jsx(ProfileEditor, { title: "Modifier le joueur", initial: profile, takenNames: profiles.filter((p) => !p.deleted && p.id !== profile.id).map((p) => p.name), onCancel: () => setEditing(false), onSave: (p) => {
                    onSave(p);
                    setEditing(false);
                } })), confirmDelete && (_jsx("div", { className: "overlay", children: _jsxs("div", { className: "dialog", children: [_jsxs("strong", { children: ["Supprimer ", profile.name, " ?"] }), _jsx("span", { className: "tile-label", style: { fontSize: 18, maxWidth: 560 }, children: "Son nom et son avatar seront effac\u00E9s. Ses parties restent dans l\u2019historique des autres joueurs, sous le nom \u00AB Joueur supprim\u00E9 \u00BB. Cette action est d\u00E9finitive." }), _jsxs("div", { className: "dialog-actions", children: [_jsx("button", { onClick: () => setConfirmDelete(false), children: "Annuler" }), _jsx("button", { className: "btn-danger", onClick: () => {
                                        onDelete(profile.id);
                                        onBack();
                                    }, children: "Supprimer d\u00E9finitivement" })] })] }) }))] }));
}
function HeatmapTab({ games }) {
    const data = useMemo(() => heatmap(games), [games]);
    if (!data.points.length) {
        return (_jsx("div", { className: "lib-empty", children: "Aucune fl\u00E9chette vue par la cam\u00E9ra pour ces filtres. La heat map se remplit avec les fl\u00E9chettes saisies par Dart Sense ; les saisies au pav\u00E9 et les corrections \u00E0 la main comptent dans les statistiques mais n\u2019ont pas de position." }));
    }
    return (_jsxs("div", { className: "profile-body", children: [_jsx("div", { className: "profile-stats", children: _jsx(DartHeatmap, { data: data }) }), _jsxs("div", { className: "profile-stats", children: [_jsxs("div", { className: "tiles", children: [_jsxs("div", { className: "tile", children: [_jsx("span", { className: "tile-value", children: data.points.length }), _jsx("span", { className: "tile-label", children: "Fl\u00E9chettes vues par la cam\u00E9ra" })] }), _jsxs("div", { className: "tile", children: [_jsxs("span", { className: "tile-value", children: [num(data.spread / 10, 1), " cm"] }), _jsx("span", { className: "tile-label", children: "Groupement (\u00E9cart moyen au centre des impacts)" })] })] }), _jsxs("div", { className: "tile-detail", children: [data.manual > 0 && `${data.manual} fléchette${data.manual > 1 ? 's' : ''} saisie${data.manual > 1 ? 's' : ''} à la main : comptée${data.manual > 1 ? 's' : ''} dans les statistiques, absente${data.manual > 1 ? 's' : ''} de la carte. `, data.points.length >= MAX_POINTS && `Seules les ${MAX_POINTS} fléchettes les plus récentes sont affichées. `, "Plus le groupement est petit, plus les fl\u00E9chettes tombent au m\u00EAme endroit. Ne dit rien de la cible vis\u00E9e."] })] })] }));
}
