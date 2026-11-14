/** Attribue les rangs à partir d'un tri, les ex aequo partagent le même rang. */
export function rankBy(count, compare, value) {
    const order = Array.from({ length: count }, (_, i) => i).sort((a, b) => compare(a, b) || a - b);
    const entries = [];
    order.forEach((sideIndex, pos) => {
        const prev = entries[pos - 1];
        const tied = prev !== undefined && compare(prev.sideIndex, sideIndex) === 0;
        entries.push({
            sideIndex,
            rank: tied ? prev.rank : pos + 1,
            value: value(sideIndex),
        });
    });
    return entries;
}
export function topRanked(ranking) {
    return ranking.filter((r) => r.rank === 1).map((r) => r.sideIndex);
}
