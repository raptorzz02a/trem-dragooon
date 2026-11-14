import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { CATEGORIES, EXTRA_GAMES, UPCOMING_GAMES, extraGame, } from '../../extra-games/catalog';
import { GameIcon } from '../components/GameIcon';
import { RulesDialog } from '../components/RulesDialog';
import './OtherGames.css';
const RECENT_KEY = 'trem.autresJeux.recents';
const RECENT_MAX = 5;
function readRecent() {
    try {
        const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
        return Array.isArray(v) ? v.filter((m) => EXTRA_GAMES.some((g) => g.id === m)) : [];
    }
    catch {
        return [];
    }
}
function pushRecent(mode) {
    try {
        localStorage.setItem(RECENT_KEY, JSON.stringify([mode, ...readRecent().filter((m) => m !== mode)].slice(0, RECENT_MAX)));
    }
    catch {
        /* stockage indisponible : pas de récents */
    }
}
const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
/** Catalogue des « Autres jeux » : grille minimaliste, catégories, recherche, filtres. */
export function OtherGames({ onBack, onPlay }) {
    const [tab, setTab] = useState('all');
    const [query, setQuery] = useState('');
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [players, setPlayers] = useState('any');
    const [format, setFormat] = useState('any');
    const [rules, setRules] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const recent = useMemo(readRecent, []);
    const matches = (g) => (!query || fold(`${g.name} ${g.sub}`).includes(fold(query))) && (tab === 'all' || tab === 'recent' || g.categories.includes(tab));
    const playable = (tab === 'recent' ? recent.map(extraGame) : EXTRA_GAMES).filter((g) => matches(g) &&
        (players === 'any' || (g.minPlayers <= players && (players < 5 || g.maxPlayers >= 5))) &&
        (format === 'any' || (format === 'teams' ? g.teams : true)));
    // Les jeux à venir n'ont pas encore de règles fixées : ils ne suivent que la recherche et les catégories.
    const upcoming = tab === 'recent' || format === 'teams' ? [] : UPCOMING_GAMES.filter(matches);
    const filterCount = (players !== 'any' ? 1 : 0) + (format !== 'any' ? 1 : 0);
    const play = async (def) => {
        setBusy(true);
        setError(null);
        pushRecent(def.id);
        try {
            await onPlay(def.id);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Serveur en ligne injoignable.');
            setBusy(false);
        }
    };
    const tabs = [
        { value: 'all', label: 'Tous' },
        ...(recent.length ? [{ value: 'recent', label: 'Récents' }] : []),
        ...CATEGORIES,
    ];
    return (_jsxs("div", { className: "screen other-games", children: [_jsxs("header", { className: "og-header", children: [_jsx("button", { onClick: onBack, children: "\u2190 Accueil" }), _jsx("h2", { children: "Autres jeux" }), _jsx("span", { className: "og-place", children: "M\u00EAme cible" })] }), _jsxs("div", { className: "og-tools", children: [_jsx("input", { className: "og-search", type: "search", placeholder: "Rechercher un jeu", value: query, onChange: (e) => setQuery(e.target.value), "aria-label": "Rechercher un jeu" }), _jsxs("button", { className: `og-filters-btn${filterCount ? ' on' : ''}`, onClick: () => setFiltersOpen((o) => !o), "aria-expanded": filtersOpen, children: ["Filtres", filterCount ? ` · ${filterCount}` : ''] })] }), filtersOpen && (_jsxs("div", { className: "og-filters", children: [_jsx("span", { className: "label", children: "Joueurs" }), _jsx("div", { className: "segmented", children: ['any', 2, 3, 5].map((v) => (_jsx("button", { className: players === v ? 'selected' : '', onClick: () => setPlayers(v), children: v === 'any' ? 'Tous' : v === 5 ? '5 et +' : v }, v))) }), _jsx("span", { className: "label", children: "Formule" }), _jsx("div", { className: "segmented", children: [
                            ['any', 'Tous'],
                            ['solo', 'Individuel'],
                            ['teams', 'Équipes'],
                        ].map(([v, label]) => (_jsx("button", { className: format === v ? 'selected' : '', onClick: () => setFormat(v), children: label }, v))) })] })), _jsx("nav", { className: "og-pills", children: tabs.map((t) => (_jsx("button", { className: tab === t.value ? 'selected' : '', onClick: () => setTab(t.value), children: t.label }, t.value))) }), error && _jsx("div", { className: "home-warning", children: error }), _jsxs("div", { className: "og-grid", children: [playable.map((g) => (_jsxs("div", { className: "og-card", children: [_jsxs("button", { className: "og-card-main", disabled: busy, onClick: () => void play(g), children: [_jsx(GameIcon, { def: g, size: 64 }), _jsx("span", { className: "og-name", children: g.name }), _jsx("span", { className: "og-sub", children: g.sub })] }), _jsx("button", { className: "og-info", "aria-label": `Règles de ${g.name}`, onClick: () => setRules(g), children: "i" })] }, g.id))), upcoming.map((g) => (_jsxs("div", { className: "og-card soon", "aria-disabled": "true", children: [_jsxs("div", { className: "og-card-main", children: [_jsx(GameIcon, { def: g, size: 64 }), _jsx("span", { className: "og-name", children: g.name }), _jsx("span", { className: "og-sub", children: g.sub })] }), _jsx("span", { className: "og-soon", children: "Bient\u00F4t" })] }, g.name)))] }), playable.length + upcoming.length === 0 && _jsx("div", { className: "lib-empty", children: "Aucun jeu pour ces filtres." }), rules && (_jsx(RulesDialog, { def: rules, onClose: () => setRules(null), onPlay: () => {
                    const def = rules;
                    setRules(null);
                    void play(def);
                } }))] }));
}
