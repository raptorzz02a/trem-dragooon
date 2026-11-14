// Représentation d'une fléchette et calcul de sa valeur.
// segment : 0 = raté, 1 à 20 = numéros, 25 = Bull.
// Le Bull extérieur (25) est un simple Bull, le Bull intérieur (50) est un double Bull.
/** Au-delà, ce n'est plus la cible (diamètre d'une cible : 451 mm). */
export const POS_LIMIT = 300;
export const BULL = 25;
export const S = (n) => ({ segment: n, multiplier: 1 });
export const D = (n) => ({ segment: n, multiplier: 2 });
export const T = (n) => ({ segment: n, multiplier: 3 });
export const OUTER_BULL = { segment: BULL, multiplier: 1 };
export const INNER_BULL = { segment: BULL, multiplier: 2 };
export const MISS = { segment: 0, multiplier: 1 };
export function isValidDart(dart) {
    const { segment, multiplier } = dart;
    if (!Number.isInteger(segment) || ![1, 2, 3].includes(multiplier))
        return false;
    if (segment === 0)
        return multiplier === 1;
    if (segment === BULL)
        return multiplier === 1 || multiplier === 2;
    return segment >= 1 && segment <= 20;
}
/**
 * Fléchette à enregistrer : seulement la zone et, si elle est plausible, la position (au dixième de mm).
 * Tout autre champ venu du réseau est écarté.
 */
export function cleanDart(dart) {
    const out = { segment: dart.segment, multiplier: dart.multiplier };
    const pos = dart.pos;
    if (pos && typeof pos === 'object') {
        const { x, y } = pos;
        if (typeof x === 'number' && typeof y === 'number' && Number.isFinite(x) && Number.isFinite(y) && Math.hypot(x, y) <= POS_LIMIT) {
            out.pos = { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
        }
    }
    return out;
}
export function assertValidDart(dart) {
    if (!isValidDart(dart)) {
        throw new Error(`Fléchette invalide : ${JSON.stringify(dart)}`);
    }
}
export function dartScore(dart) {
    return dart.segment * dart.multiplier;
}
/** Double valide pour une sortie, Bull intérieur compris. */
export function isDouble(dart) {
    return dart.segment !== 0 && dart.multiplier === 2;
}
export function isMiss(dart) {
    return dart.segment === 0;
}
/** Notation courte : S20, D16, T19, 25, 50, 0. */
export function formatDart(dart) {
    if (dart.segment === 0)
        return '0';
    if (dart.segment === BULL)
        return dart.multiplier === 2 ? '50' : '25';
    return `${'SDT'[dart.multiplier - 1]}${dart.segment}`;
}
/** Inverse de formatDart, pratique pour les tests et les sauvegardes lisibles. */
export function parseDart(text) {
    const t = text.trim().toUpperCase();
    if (t === '0' || t === 'MISS')
        return MISS;
    if (t === '25' || t === 'SB')
        return OUTER_BULL;
    if (t === '50' || t === 'DB')
        return INNER_BULL;
    const m = /^([SDT])(\d{1,2})$/.exec(t);
    if (!m)
        throw new Error(`Notation inconnue : ${text}`);
    const multiplier = ('SDT'.indexOf(m[1]) + 1);
    const dart = { segment: Number(m[2]), multiplier };
    assertValidDart(dart);
    return dart;
}
