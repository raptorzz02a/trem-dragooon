import { computeState, DEFAULT_EXTRA_OPTIONS, DEFAULT_OPTIONS } from '../game-engine/engine';
import { parseDart } from '../game-engine/darts';
export function players(n) {
    return Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `Joueur ${i + 1}`, playerIds: [`p${i + 1}`] }));
}
export function teams(...sizes) {
    let next = 1;
    return sizes.map((size, t) => ({
        id: `t${t + 1}`,
        name: `Équipe ${t + 1}`,
        playerIds: Array.from({ length: size }, () => `p${next++}`),
    }));
}
export function config(mode, options = {}, sides = players(2)) {
    return {
        mode,
        options: { ...{ ...DEFAULT_OPTIONS, ...DEFAULT_EXTRA_OPTIONS }[mode], ...options },
        sides,
        teamMode: sides.some((s) => s.playerIds.length > 1) || sides[0]?.id.startsWith('t') === true,
        training: mode === 'training' || sides.flatMap((s) => s.playerIds).length === 1,
    };
}
/** Fléchettes en notation courte ; « / » termine la volée, « ! » termine la partie. Ex. : "T20 T20 / S1". */
export function events(script) {
    return script
        .split(/\s+/)
        .filter(Boolean)
        .map((t) => (t === '/' ? { type: 'endTurn' } : t === '!' ? { type: 'finish' } : { type: 'dart', dart: parseDart(t) }));
}
export function play(cfg, script) {
    return computeState(cfg, events(script));
}
