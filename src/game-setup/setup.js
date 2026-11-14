import { DEFAULT_OPTIONS, MAX_TEAMS, MIN_TEAMS, validateConfig } from '../game-engine/engine';
import { drawTargets } from '../game-engine/modes/random';
import { emptyTeams, individualSides, randomOrder, randomTeams } from '../teams/teams';
import { cleanValues, defaultValues, EXTRA_GAMES, EXTRA_MODES, extraGame, extraPlayersProblem, isExtraMode, } from '../extra-games/catalog';
const defaultExtra = () => Object.fromEntries(EXTRA_GAMES.map((g) => [g.id, defaultValues(g)]));
export const DEFAULT_SETUP = {
    mode: 'x01',
    x01: { ...DEFAULT_OPTIONS.x01 },
    cricket: { ...DEFAULT_OPTIONS.cricket },
    clock: { ...DEFAULT_OPTIONS.clock },
    random: { ...DEFAULT_OPTIONS.random },
    teamMode: false,
    teamCount: 2,
    randomizeOrder: true,
    teamOf: {},
    extra: defaultExtra(),
};
/** Modes principaux : les seuls comptés dans les statistiques et classements classiques. */
export const MODES = ['x01', 'cricket', 'clock', 'random', 'training'];
/** Tous les modes qu'une partie peut avoir, Autres jeux compris. */
export const ALL_MODES = [...MODES, ...EXTRA_MODES];
export const isClassicMode = (mode) => MODES.includes(mode);
export const MODE_NAMES = {
    x01: '301 / 501 / 701',
    cricket: 'Cricket',
    clock: 'Horloge',
    random: 'Chiffre aléatoire',
    training: 'Entraînement',
    ...Object.fromEntries(EXTRA_GAMES.map((g) => [g.id, g.name])),
};
/** Convention d'équipe à afficher avant le départ. */
export const TEAM_NOTES = {
    x01: 'Le score est commun à l’équipe.',
    cricket: 'Marques et points sont communs à l’équipe.',
    clock: 'La progression est commune : le numéro à viser est partagé par l’équipe.',
    random: 'Le total est commun : tous visent le même numéro tiré au sort.',
    training: 'Les points de l’équipe s’additionnent.',
    ...Object.fromEntries(EXTRA_MODES.map((m) => [m, 'Le score est commun à l’équipe ; ses joueurs lancent à tour de rôle.'])),
};
function modeOptions(setup, sideCount, rng) {
    if (isExtraMode(setup.mode)) {
        const def = extraGame(setup.mode);
        return def.options(cleanValues(def, setup.extra?.[setup.mode]), sideCount, rng);
    }
    switch (setup.mode) {
        case 'x01':
            return { mode: 'x01', options: setup.x01 };
        case 'cricket':
            return { mode: 'cricket', options: setup.cricket };
        case 'clock':
            return { mode: 'clock', options: setup.clock };
        case 'random':
            return { mode: 'random', options: { rounds: setup.random.rounds, targets: drawTargets(setup.random.rounds, rng) } };
        case 'training':
            return { mode: 'training', options: {} };
    }
}
/**
 * Configuration du moteur pour ces joueurs (dans l'ordre de la liste).
 * Une partie à un joueur, ou une partie du mode Entraînement, est un entraînement : stats, mais pas de victoire.
 */
export function buildConfig(setup, players, rng = Math.random) {
    let sides = individualSides(players);
    if (setup.teamMode) {
        sides = emptyTeams(setup.teamCount);
        for (const p of players)
            sides[setup.teamOf[p.id] ?? 0].playerIds.push(p.id);
    }
    if (setup.randomizeOrder)
        sides = randomOrder(sides, rng);
    return {
        ...modeOptions(setup, sides.length, rng),
        teamMode: setup.teamMode,
        training: players.length === 1 || setup.mode === 'training',
        sides,
    };
}
/** Pourquoi la partie ne peut pas être lancée avec ces réglages, ou null si tout va bien. */
export function setupProblem(setup, players) {
    if (players.length === 0)
        return 'Ajoute au moins un joueur.';
    if (isExtraMode(setup.mode)) {
        const problem = extraPlayersProblem(extraGame(setup.mode), players.length, setup.teamMode);
        if (problem)
            return problem;
    }
    try {
        validateConfig(buildConfig({ ...setup, randomizeOrder: false }, players));
        return null;
    }
    catch (e) {
        return e.message;
    }
}
/** Répartition au hasard en équipes de tailles aussi égales que possible. */
export function drawTeams(playerIds, teamCount, rng = Math.random) {
    const teamOf = {};
    randomTeams(playerIds, teamCount, rng).forEach((t, i) => t.playerIds.forEach((id) => (teamOf[id] = i)));
    return teamOf;
}
/** Équipe la moins nombreuse, pour un joueur qui arrive. */
export function smallestTeam(setup, playerIds) {
    const sizes = Array.from({ length: setup.teamCount }, (_, t) => playerIds.filter((id) => setup.teamOf[id] === t).length);
    return sizes.indexOf(Math.min(...sizes));
}
// Vérification des réglages reçus du réseau : seules les valeurs proposées à l'écran sont acceptées.
const pick = (value, allowed, fallback) => (allowed.includes(value) ? value : fallback);
const obj = (value) => (value && typeof value === 'object' ? value : {});
export function cleanSetup(input, base = DEFAULT_SETUP) {
    const v = obj(input);
    const x = obj(v.x01);
    const c = obj(v.cricket);
    const h = obj(v.clock);
    const r = obj(v.random);
    const required = pick(h.required, ['any', 'double', 'triple'], base.clock.required);
    const teamCount = pick(v.teamCount, [2, 3, 4, 5], base.teamCount);
    const teamOf = {};
    for (const [id, t] of Object.entries(obj(v.teamOf ?? base.teamOf))) {
        if (typeof t === 'number' && Number.isInteger(t) && t >= 0 && t < MAX_TEAMS)
            teamOf[id.slice(0, 64)] = Math.min(t, teamCount - 1);
    }
    const mode = pick(v.mode, ALL_MODES, base.mode);
    // Jeu individuel (Killer…) : pas d'équipes, même si le saloon les a par défaut.
    const soloOnly = isExtraMode(mode) && !extraGame(mode).teams;
    return {
        mode,
        x01: {
            startScore: pick(x.startScore, [301, 501, 701], base.x01.startScore),
            out: pick(x.out, ['straight', 'double'], base.x01.out),
            maxRounds: null,
        },
        cricket: {
            variant: pick(c.variant, ['standard', 'cutthroat'], base.cricket.variant),
            bull: pick(c.bull, [true, false], base.cricket.bull),
            maxRounds: pick(c.maxRounds, [null, 20], base.cricket.maxRounds),
        },
        clock: {
            order: pick(h.order, ['asc', 'desc', 'board'], base.clock.order),
            required,
            advanceByMultiplier: required === 'any' && pick(h.advanceByMultiplier, [true, false], base.clock.advanceByMultiplier),
            bullFinish: pick(h.bullFinish, ['none', 'any', 'both'], base.clock.bullFinish),
        },
        random: {
            rounds: pick(r.rounds, [10, 15, 20], base.random.rounds),
            targets: [],
        },
        teamMode: !soloOnly && pick(v.teamMode, [true, false], base.teamMode),
        teamCount: Math.max(MIN_TEAMS, teamCount),
        randomizeOrder: pick(v.randomizeOrder, [true, false], base.randomizeOrder),
        teamOf,
        extra: Object.fromEntries(EXTRA_GAMES.map((g) => [g.id, cleanValues(g, obj(v.extra)[g.id], base.extra?.[g.id])])),
    };
}
