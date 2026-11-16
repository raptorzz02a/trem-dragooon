// Carte des impacts : où tombent les fléchettes d'un joueur, d'après la caméra (Dart Sense).
// Seules les fléchettes vues par la caméra y figurent : une saisie au pavé ou une correction à la main
// compte dans les statistiques, mais n'a pas de position, donc pas de point sur la carte.
import { formatDart } from '../game-engine/darts';
/** Au-delà, la carte devient illisible et lente : on garde les plus récentes (les parties arrivent de la plus récente à la plus ancienne). */
export const MAX_POINTS = 3000;
export function heatmap(games) {
    return heatmapOfTurns(games.flatMap((g) => g.turns));
}
/** Même carte, à partir de volées (ex. celles d'une seule partie, sur l'écran de fin). */
export function heatmapOfTurns(turns) {
    const points = [];
    let manual = 0;
    for (const t of turns) {
        for (const { dart } of t.darts) {
            if (!dart.pos)
                manual++;
            else if (points.length < MAX_POINTS)
                points.push({ x: dart.pos.x, y: dart.pos.y, zone: formatDart(dart) });
        }
    }
    if (!points.length)
        return { points, manual, center: null, spread: null };
    const center = {
        x: points.reduce((s, p) => s + p.x, 0) / points.length,
        y: points.reduce((s, p) => s + p.y, 0) / points.length,
    };
    const spread = points.reduce((s, p) => s + Math.hypot(p.x - center.x, p.y - center.y), 0) / points.length;
    return { points, manual, center, spread };
}
