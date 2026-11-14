import { drawHalveTargets, HALVE_STANDARD } from '../game-engine/extra/halveit';
import { drawKillerNumbers, KILLER_MIN_PLAYERS } from '../game-engine/extra/killer';
import { MAX_PLAYERS } from '../game-engine/engine';
import { MORE_GAMES } from './catalog-more';
export const CATEGORIES = [
    { value: 'classic', label: 'Classiques' },
    { value: 'quick', label: 'Rapides' },
    { value: 'precision', label: 'Précision' },
    { value: 'team', label: 'Équipe' },
    { value: 'house', label: 'Défis TREM-DRAGOOON' },
];
const num = (v, fallback) => (typeof v === 'number' ? v : fallback);
const LOT1_GAMES = [
    {
        id: 'highscore',
        name: 'High Score',
        sub: 'Le plus gros total gagne',
        categories: ['quick', 'team'],
        icon: 'up',
        minPlayers: 1,
        maxPlayers: MAX_PLAYERS,
        teams: true,
        bubble: 'Tu as un nombre de tours défini pour marquer le plus de points possible. Toutes les zones de la cible comptent. Le joueur avec le plus gros total gagne.',
        rules: {
            goal: 'Marquer le plus de points possible',
            points: 'Chaque fléchette rapporte sa valeur (triple 20 = 60)',
            win: 'Le plus gros total à la fin des manches',
            warning: 'Rien de spécial : tout compte, même le Bull',
        },
        settings: [
            {
                key: 'rounds',
                label: 'Manches',
                choices: [5, 10, 15].map((v) => ({ value: v, label: String(v) })),
                default: 10,
            },
        ],
        options: (v) => ({
            mode: 'highscore',
            options: { rounds: num(v.rounds, 10) },
        }),
        score: {
            label: 'Meilleur total',
            better: 'high',
            of: (s, side) => s.mode.scores[side] ?? null,
        },
    },
    {
        id: 'halveit',
        name: 'Halve It',
        sub: 'Rate la cible, ton score est coupé en deux',
        categories: ['classic', 'team'],
        icon: 'half',
        minPlayers: 1,
        maxPlayers: MAX_PLAYERS,
        teams: true,
        bubble: 'À chaque tour, une cible est imposée. Tu marques les points des fléchettes qui touchent cette cible. Si tu ne touches rien de valable pendant ton tour, ton score est divisé par deux. Le meilleur score gagne.',
        rules: {
            goal: 'Faire le plus de points en 10 manches',
            points: 'La valeur des fléchettes sur la cible du tour (triple 14 = 42)',
            win: 'Le plus gros score après la manche du Bull',
            warning: 'Aucune fléchette sur la cible : ton score est divisé par deux',
        },
        settings: [
            {
                key: 'sequence',
                label: 'Séquence',
                choices: [
                    { value: 'standard', label: '12, D13, 14, T15… Bull' },
                    { value: 'random', label: 'Tirée au sort' },
                ],
                default: 'standard',
            },
        ],
        options: (v, _n, rng) => v.sequence === 'random'
            ? {
                mode: 'halveit',
                options: { sequence: 'random', targets: drawHalveTargets(rng) },
            }
            : {
                mode: 'halveit',
                options: { sequence: 'standard', targets: HALVE_STANDARD },
            },
        score: {
            label: 'Meilleur score',
            better: 'high',
            of: (s, side) => s.mode.scores[side] ?? null,
        },
    },
    {
        id: 'killer',
        name: 'Killer',
        sub: 'Touche ton double, puis chasse les autres',
        categories: ['classic'],
        icon: 'killer',
        minPlayers: KILLER_MIN_PLAYERS,
        maxPlayers: MAX_PLAYERS,
        teams: false,
        bubble: "Chaque joueur possède un numéro. Tu dois d'abord toucher ton propre double pour devenir un tueur. Ensuite, vise les numéros des adversaires pour leur retirer leurs vies. Le dernier joueur encore en vie gagne.",
        rules: {
            goal: 'Être le dernier joueur encore en vie',
            points: 'Killer : un simple retire 1 vie, un double ou un triple en retire 2',
            win: 'Le dernier survivant',
            warning: 'Une fois Killer, toucher ton propre numéro te coûte une vie',
        },
        settings: [
            {
                key: 'lives',
                label: 'Vies',
                choices: [3, 5].map((v) => ({ value: v, label: String(v) })),
                default: 3,
            },
        ],
        options: (v, n, rng) => ({
            mode: 'killer',
            options: {
                lives: num(v.lives, 3),
                numbers: drawKillerNumbers(n, rng),
            },
        }),
        score: {
            label: 'Vies retirées',
            better: 'high',
            of: (s, side) => s.mode.taken[side] ?? null,
        },
    },
];
export const EXTRA_GAMES = [...LOT1_GAMES, ...MORE_GAMES];
/** Jeux annoncés mais pas encore jouables (aucun pour l'instant). */
export const UPCOMING_GAMES = [];
export const EXTRA_MODES = EXTRA_GAMES.map((g) => g.id);
export const isExtraMode = (mode) => EXTRA_MODES.includes(mode);
export function extraGame(mode) {
    return EXTRA_GAMES.find((g) => g.id === mode);
}
/** Réglages par défaut d'un jeu (bouton « Règles par défaut »). */
export function defaultValues(def) {
    return Object.fromEntries(def.settings.map((s) => [s.key, s.default]));
}
/** Garde les seuls réglages proposés à l'écran ; le reste reprend la valeur par défaut. */
export function cleanValues(def, input, base) {
    const v = input && typeof input === 'object' ? input : {};
    return Object.fromEntries(def.settings.map((s) => {
        const asked = v[s.key];
        const fallback = base?.[s.key] ?? s.default;
        return [s.key, s.choices.some((c) => c.value === asked) ? asked : fallback];
    }));
}
/** Une partie sans joueur assez nombreux, ou en équipes pour un jeu individuel : la raison, sinon null. */
export function extraPlayersProblem(def, players, teamMode) {
    if (teamMode && !def.teams)
        return `${def.name} se joue en individuel.`;
    if (players < def.minPlayers)
        return `Il faut au moins ${def.minPlayers} joueurs pour ${def.name}.`;
    if (players > def.maxPlayers)
        return `${def.maxPlayers} joueurs maximum pour ${def.name}.`;
    return null;
}
export function playersLabel(def) {
    return def.minPlayers === def.maxPlayers ? `${def.minPlayers} joueurs` : `${def.minPlayers} à ${def.maxPlayers} joueurs`;
}
