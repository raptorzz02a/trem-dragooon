// Bilan d'une partie d'entraînement pour un joueur, affiché sur l'écran de fin.
// Contrairement à la heat map, toutes les fléchettes comptent ici, saisies au pavé comprises.
import { formatDart } from '../game-engine/darts';
export function recap(turns) {
    const darts = turns.flatMap((t) => t.darts);
    const n = darts.length;
    const pct = (c) => (n ? (100 * c) / n : 0);
    const volleys = turns.filter((t) => t.darts.length).map((t) => t.darts.reduce((a, d) => a + d.points, 0));
    const points = volleys.reduce((a, b) => a + b, 0);
    const rings = { single: 0, double: 0, triple: 0, bull: 0, miss: 0 };
    const counts = new Map();
    for (const { dart } of darts) {
        if (dart.segment === 0)
            rings.miss++;
        else if (dart.segment === 25)
            rings.bull++;
        else if (dart.multiplier === 3)
            rings.triple++;
        else if (dart.multiplier === 2)
            rings.double++;
        else
            rings.single++;
        const zone = formatDart(dart);
        counts.set(zone, (counts.get(zone) ?? 0) + 1);
    }
    return {
        darts: n,
        points,
        avg3: n ? (3 * points) / n : null,
        bestVolley: volleys.length ? Math.max(...volleys) : null,
        rings: {
            single: pct(rings.single),
            double: pct(rings.double),
            triple: pct(rings.triple),
            bull: pct(rings.bull),
            miss: pct(rings.miss),
        },
        zones: [...counts]
            .map(([zone, count]) => ({ zone, count, share: pct(count) }))
            .sort((a, b) => b.count - a.count || (a.zone < b.zone ? -1 : 1)),
    };
}
