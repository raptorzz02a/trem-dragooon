import { MAX_TEAMS, MIN_TEAMS } from '../game-engine/engine';
/**
 * Couleurs d'équipe, choisies pour être lisibles sur le fond #101713 et le plus éloignées possible
 * les unes des autres. Les premières sont les plus contrastées entre elles : elles servent d'abord.
 */
export const TEAM_COLORS = [
    { name: 'Rouge', hex: '#FF4D4D' },
    { name: 'Bleue', hex: '#3DA5FF' },
    { name: 'Jaune', hex: '#FFE14D' },
    { name: 'Violette', hex: '#C77DFF' },
    { name: 'Verte', hex: '#5CE65C' },
    { name: 'Orange', hex: '#FF9A3D' },
    { name: 'Rose', hex: '#FF6FCF' },
    { name: 'Turquoise', hex: '#2EE6D6' },
    { name: 'Blanche', hex: '#F4F3EC' },
    { name: 'Saumon', hex: '#FFB3A1' },
];
/** Mélange de Fisher-Yates, sans modifier le tableau reçu. */
export function shuffle(items, rng = Math.random) {
    const out = items.slice();
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}
/** Individuel : un côté par joueur, dans l'ordre donné. */
export function individualSides(players) {
    return players.map((p) => ({ id: p.id, name: p.name, playerIds: [p.id] }));
}
/** Crée des équipes vides nommées et colorées, prêtes pour une répartition manuelle. */
export function emptyTeams(count) {
    if (count < MIN_TEAMS || count > MAX_TEAMS)
        throw new Error(`Il faut entre ${MIN_TEAMS} et ${MAX_TEAMS} équipes.`);
    return Array.from({ length: count }, (_, i) => ({
        id: `team-${i + 1}`,
        name: `Équipe ${TEAM_COLORS[i].name}`,
        color: TEAM_COLORS[i].hex,
        playerIds: [],
    }));
}
/**
 * Tirage au sort des équipes : les joueurs sont mélangés puis distribués un par un,
 * pour des tailles aussi égales que possible (7 joueurs en 3 équipes donnent 3, 2 et 2).
 */
export function randomTeams(playerIds, teamCount, rng = Math.random) {
    if (playerIds.length < teamCount)
        throw new Error('Pas assez de joueurs pour ce nombre d’équipes.');
    const teams = emptyTeams(teamCount);
    shuffle(playerIds, rng).forEach((id, i) => teams[i % teamCount].playerIds.push(id));
    return teams;
}
/** Place un joueur dans une équipe, en le retirant de son équipe précédente. */
export function assignPlayer(sides, playerId, sideId) {
    return sides.map((s) => {
        const without = s.playerIds.filter((p) => p !== playerId);
        return { ...s, playerIds: s.id === sideId ? [...without, playerId] : without };
    });
}
/** Déplace un côté dans l'ordre de passage (avant le début de la partie). */
export function moveSide(sides, from, to) {
    const out = sides.slice();
    const [moved] = out.splice(from, 1);
    if (moved)
        out.splice(to, 0, moved);
    return out;
}
/** Ordre de passage aléatoire : les côtés et, dans chaque équipe, ses joueurs sont mélangés. */
export function randomOrder(sides, rng = Math.random) {
    return shuffle(sides, rng).map((s) => ({ ...s, playerIds: shuffle(s.playerIds, rng) }));
}
