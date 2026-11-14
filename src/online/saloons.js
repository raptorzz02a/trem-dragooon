export const PUBLIC_SALOON_ID = 'trem-dragooon';
export const PUBLIC_SALOON_NAME = 'TREM-DRAGOOON';
export const SALOON_NAME_MIN = 2;
export const SALOON_NAME_MAX = 24;
export const SALOON_PASSWORD_MIN = 4;
/** Saloons qu'un compte peut créer (il peut en rejoindre autant qu'il veut). */
export const MAX_OWNED_SALOONS = 3;
export const MAX_SALOON_MEMBERS = 50;
/** Bornes du nombre minimum de parties pour être classé, réglé par les admins du saloon. */
export const MIN_GAMES_MIN = 1;
export const MIN_GAMES_MAX = 50;
/** Nombre minimum de parties reçu du réseau, ou null s'il n'est pas acceptable. */
export const cleanMinGames = (value) => typeof value === 'number' && Number.isInteger(value) && value >= MIN_GAMES_MIN && value <= MIN_GAMES_MAX ? value : null;
/** Libellé d'une partie dont le saloon n'existe plus. */
export const DELETED_SALOON_NAME = 'Saloon supprimé';
/** Icônes proposées pour un saloon (la cible est réservée au saloon public). */
export const SALOON_ICONS = ['🍺', '🐉', '🏆', '🤠', '🔥', '⭐', '🎲', '👑', '🃏', '⚡', '🍀'];
/**
 * Couleurs proposées pour un saloon : l'interface prend la couleur du saloon ouvert. Le vert et l'or de
 * l'interface d'origine sont réservés au saloon public, pour qu'on sache toujours où l'on est.
 */
export const SALOON_COLORS = ['#d64545', '#e8833a', '#3d7fd9', '#2bb3c0', '#8e5bd6', '#d9529b', '#a8683a', '#6f7f99', '#b8324f'];
/** Clé d'unicité d'un nom de saloon : « Les Potes » et « les potes » sont le même saloon. */
export function saloonKey(name) {
    return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('fr').normalize('NFC');
}
export function saloonNameProblem(name) {
    const n = name.trim();
    if (n.length < SALOON_NAME_MIN)
        return `Le nom du saloon doit faire au moins ${SALOON_NAME_MIN} caractères.`;
    if (n.length > SALOON_NAME_MAX)
        return `Le nom du saloon doit faire au plus ${SALOON_NAME_MAX} caractères.`;
    if (/[\u0000-\u001f\u007f]/.test(n))
        return 'Le nom du saloon contient un caractère interdit.';
    if (saloonKey(n) === saloonKey(PUBLIC_SALOON_NAME))
        return 'Ce nom est réservé au saloon public.';
    return null;
}
export function saloonPasswordProblem(password) {
    if (password.length < SALOON_PASSWORD_MIN)
        return `Le mot de passe du saloon doit faire au moins ${SALOON_PASSWORD_MIN} caractères.`;
    if (password.length > 200)
        return 'Mot de passe trop long.';
    return null;
}
export const cleanSaloonIcon = (value) => SALOON_ICONS.includes(value) ? value : null;
export const cleanSaloonColor = (value) => SALOON_COLORS.includes(value) ? value : null;
/** Saloon d'une partie enregistrée : les parties d'avant les saloons appartiennent au saloon public. */
export const saloonOf = (record) => record.saloonId ?? PUBLIC_SALOON_ID;
/** Lien d'invitation : il fait entrer directement dans le saloon, sans mot de passe. */
export const inviteLink = (origin, invite) => `${origin}/?invitation=${encodeURIComponent(invite)}`;
export const isInviteToken = (value) => typeof value === 'string' && /^[0-9a-f]{32}$/.test(value);
/**
 * Pouvoirs sur un membre : un admin exclut ou bannit les simples membres ; le propriétaire agit aussi sur les admins,
 * nomme ou retire les admins et transfère la propriété ; l'administrateur de l'appli peut tout faire.
 */
export function canManage(actor, target, action) {
    if (actor === 'member')
        return false;
    if (action === 'promote')
        return target === 'member' && (actor === 'owner' || actor === 'global');
    if (action === 'demote')
        return target === 'admin' && (actor === 'owner' || actor === 'global');
    if (action === 'transfer')
        return target !== 'owner' && (actor === 'owner' || actor === 'global');
    // Exclure ou bannir : jamais le propriétaire (il transfère d'abord, ou quitte), sauf par l'administrateur de l'appli.
    if (actor === 'global')
        return true;
    if (actor === 'owner')
        return target !== 'owner';
    return target === 'member';
}
/** Changer le nom, le mot de passe, la couleur ou l'icône, lever un bannissement. */
export const canEditSaloon = (actor) => actor !== null && actor !== 'member';
export const canDeleteSaloon = (actor) => actor === 'owner' || actor === 'global';
/** Une partie qui ne donne plus de nouvelles depuis ce délai sort de la liste (même durée que l'effacement d'une partie). */
export const LIVE_GAME_TTL_MS = 12 * 60 * 60 * 1000;
