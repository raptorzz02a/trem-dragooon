export const KILLER_MIN_PLAYERS = 3;
/** Numéros uniques de 1 à 20, un par joueur, tirés au sort au lancement. */
export function drawKillerNumbers(count, rng = Math.random) {
    const pool = Array.from({ length: 20 }, (_, i) => i + 1);
    return Array.from({ length: count }, () => pool.splice(Math.floor(rng() * pool.length), 1)[0]);
}
export const alive = (state, side) => state.outOrder[side] === 0;
/**
 * Killer (règles validées par ju) : chacun a un numéro et 3 vies. Toucher son propre double fait devenir Killer.
 * Un Killer qui touche le numéro d'un adversaire lui retire 1 vie en simple, 2 en double ou en triple ;
 * s'il touche son propre numéro, il perd 1 vie. À zéro vie on est éliminé ; le dernier en vie gagne.
 */
export const killerRules = {
    validate(config) {
        if (config.teamMode)
            throw new Error('Killer se joue en individuel.');
        if (config.sides.length < KILLER_MIN_PLAYERS)
            throw new Error(`Il faut au moins ${KILLER_MIN_PLAYERS} joueurs pour Killer.`);
        const { numbers } = config.options;
        if (numbers.length !== config.sides.length || new Set(numbers).size !== numbers.length) {
            throw new Error('Numéros des joueurs invalides.');
        }
    },
    init(config) {
        const { lives, numbers } = config.options;
        const n = config.sides.length;
        return {
            numbers,
            lives: Array(n).fill(lives),
            maxLives: lives,
            killer: Array(n).fill(false),
            outOrder: Array(n).fill(0),
            taken: Array(n).fill(0),
            dartsToKiller: Array(n).fill(null),
            darts: Array(n).fill(0),
        };
    },
    skipSide(state, side) {
        return !alive(state, side);
    },
    applyDart(state, ctx, dart) {
        const me = ctx.sideIndex;
        const darts = state.darts.slice();
        darts[me] = darts[me] + 1;
        const next = { ...state, darts };
        const owner = dart.segment >= 1 && dart.segment <= 20 ? state.numbers.indexOf(dart.segment) : -1;
        if (owner < 0 || !alive(state, owner))
            return { state: next, points: 0 };
        if (!state.killer[me]) {
            if (owner !== me || dart.multiplier !== 2)
                return { state: next, points: 0 };
            const killer = state.killer.slice();
            killer[me] = true;
            const dartsToKiller = state.dartsToKiller.slice();
            dartsToKiller[me] = darts[me];
            return { state: { ...next, killer, dartsToKiller }, points: 0 };
        }
        const damage = owner === me ? 1 : dart.multiplier === 1 ? 1 : 2;
        const lives = state.lives.slice();
        lives[owner] = Math.max(0, lives[owner] - damage);
        const taken = state.taken.slice();
        if (owner !== me)
            taken[me] = taken[me] + (state.lives[owner] - lives[owner]);
        const outOrder = state.outOrder.slice();
        if (lives[owner] === 0)
            outOrder[owner] = Math.max(...outOrder) + 1;
        const after = { ...next, lives, taken, outOrder };
        const living = outOrder.map((o, i) => (o === 0 ? i : -1)).filter((i) => i >= 0);
        if (living.length <= 1)
            return {
                state: after,
                points: owner === me ? 0 : damage,
                winners: living.length ? living : [me],
            };
        // Un Killer qui s'élimine lui-même rend la main.
        return {
            state: after,
            points: owner === me ? 0 : damage,
            endTurn: owner === me && lives[me] === 0,
        };
    },
    onRoundEnd() {
        return null;
    },
    ranking(state) {
        // En vie d'abord (plus de vies devant), puis les éliminés du dernier au premier.
        const score = (s) => (alive(state, s) ? 1000 + state.lives[s] : state.outOrder[s]);
        const order = state.numbers.map((_, i) => i).sort((a, b) => score(b) - score(a) || a - b);
        const out = [];
        order.forEach((s, pos) => {
            const prev = out[pos - 1];
            const tied = prev !== undefined && score(prev.sideIndex) === score(s);
            out.push({
                sideIndex: s,
                rank: tied ? prev.rank : pos + 1,
                value: state.lives[s],
            });
        });
        return out;
    },
};
