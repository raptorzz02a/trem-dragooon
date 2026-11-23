import { suggestCheckout } from '../game-engine/checkout';
import { formatDart } from '../game-engine/darts';
import { MODE_NAMES } from '../game-setup/setup';
import { sessionState } from '../game-session/session';
const sum = (n) => n.reduce((a, b) => a + b, 0);
const round1 = (n) => Math.round(n * 10) / 10;
const scored = (state, side) => state.turns.filter((t) => t.sideIndex === side);
/** Moyenne par volée : points marqués / volées jouées (un bust compte 0), comme sur l'écran de jeu. */
function average(state, side) {
    const mode = state.config.mode;
    if (mode !== 'x01' && mode !== 'training')
        return null;
    const turns = scored(state, side);
    if (turns.length === 0)
        return 0;
    return round1(sum(turns.map((t) => (t.outcome === 'bust' ? 0 : sum(t.darts.map((d) => d.points))))) / turns.length);
}
function title(state) {
    if (state.config.mode === 'x01') {
        const o = state.config.options;
        return `${o.startScore} · ${o.out === 'double' ? 'Double out' : 'Sortie simple'}`;
    }
    return MODE_NAMES[state.config.mode] ?? state.config.mode;
}
function value(state, side) {
    if (state.config.mode === 'x01')
        return state.mode.remaining[side] ?? 0;
    return state.ranking.find((r) => r.sideIndex === side)?.value ?? 0;
}
function winnerOf(state, names) {
    if (state.status !== 'finished')
        return null;
    const winners = state.winners.map((s) => names[s] ?? '');
    if (state.winners.length !== 1)
        return { names: winners, darts: null, best: null, checkout: [], checkoutPoints: null };
    const turns = scored(state, state.winners[0]);
    const totals = turns.map((t) => (t.outcome === 'bust' ? 0 : sum(t.darts.map((d) => d.points))));
    const last = turns[turns.length - 1];
    const x01 = state.config.mode === 'x01';
    return {
        names: winners,
        darts: sum(turns.map((t) => t.darts.length)),
        best: totals.length ? Math.max(...totals) : null,
        checkout: x01 && last ? last.darts.map((d) => formatDart(d.dart)) : [],
        checkoutPoints: x01 && last ? sum(last.darts.map((d) => d.points)) : null,
    };
}
/** L'état d'une partie tel que la tablette l'affiche. */
export function boardView(room) {
    const empty = { status: 'lobby', game: null, title: '', round: null, current: null, darts: [], sides: [], checkout: [], last: null, winner: null };
    const session = room.session;
    if (room.status !== 'playing' || !session)
        return empty;
    const state = sessionState(session);
    const colorOf = (id) => room.players.find((p) => p.id === id)?.color ?? '#3dff6e';
    const names = state.config.sides.map((s) => s.name);
    const current = state.current;
    const finished = state.status === 'finished' || session.status === 'finished';
    const lastTurn = state.turns[state.turns.length - 1];
    const x01 = state.config.mode === 'x01';
    const checkout = x01 && current
        ? (suggestCheckout(state.mode.remaining[current.sideIndex], current.dartsLeft, state.config.options.out) ?? []).map(formatDart)
        : [];
    return {
        status: finished ? 'finished' : 'playing',
        game: session.id,
        title: title(state),
        round: current ? current.round + 1 : lastTurn ? lastTurn.round + 1 : 1,
        current: finished || !current ? null : current.sideIndex,
        darts: current && !finished ? current.darts.map((d) => formatDart(d.dart)) : [],
        sides: state.config.sides.map((s, i) => ({
            name: s.name,
            color: s.color ?? colorOf(s.playerIds[0] ?? ''),
            value: value(state, i),
            avg: average(state, i),
        })),
        checkout,
        last: lastTurn
            ? {
                seq: lastTurn.turnIndex,
                side: lastTurn.sideIndex,
                total: lastTurn.outcome === 'bust' ? 0 : sum(lastTurn.darts.map((d) => d.points)),
                outcome: lastTurn.outcome,
                darts: lastTurn.darts.map((d) => formatDart(d.dart)),
            }
            : null,
        winner: winnerOf(state, names),
    };
}
/** Code d'appairage affiché par la tablette : 4 chiffres, tapés sur la borne. */
export const isPairCode = (code) => typeof code === 'string' && /^\d{4}$/.test(code);
export const DEFAULT_DISPLAY_SETTINGS = { dim: true, animations: true, reload: 0 };
export function cleanDisplaySettings(input, base = DEFAULT_DISPLAY_SETTINGS) {
    const o = input && typeof input === 'object' ? input : {};
    return {
        dim: typeof o.dim === 'boolean' ? o.dim : base.dim,
        animations: typeof o.animations === 'boolean' ? o.animations : base.animations,
        reload: typeof o.reload === 'number' && Number.isFinite(o.reload) ? o.reload : base.reload,
    };
}
