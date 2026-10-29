import type { AvatarConfig, GameRecord } from '../profiles/types';

// Comptes du mode en ligne : un pseudo et un mot de passe, pour retrouver son joueur et ses statistiques
// sur n'importe quel appareil. Règles partagées par l'appli et le serveur.

/** Ce que tout le monde voit d'un compte. */
export interface PublicAccount {
  id: string;
  name: string;
  color: string;
  avatar: AvatarConfig;
  createdAt: string;
}

/** Réponse à une connexion ou une création de compte : le jeton reste sur l'appareil. */
export interface Login {
  token: string;
  account: PublicAccount;
}

/** Joueurs en ligne et parties en ligne terminées, pour les classements et les fiches. */
export interface Community {
  accounts: PublicAccount[];
  games: GameRecord[];
}

export const PSEUDO_MIN = 2;
export const PSEUDO_MAX = 20;
export const PASSWORD_MIN = 6;
export const PASSWORD_MAX = 200;

/** Clé d'unicité : « Ju », « ju » et « JU » sont le même pseudo. */
export function pseudoKey(name: string): string {
  return name.trim().toLocaleLowerCase('fr').normalize('NFC');
}

/** Message d'erreur si le pseudo n'est pas acceptable, sinon null. */
export function pseudoProblem(name: string): string | null {
  const n = name.trim();
  if (n.length < PSEUDO_MIN) return `Le pseudo doit faire au moins ${PSEUDO_MIN} caractères.`;
  if (n.length > PSEUDO_MAX) return `Le pseudo doit faire au plus ${PSEUDO_MAX} caractères.`;
  // Pas de caractères de contrôle : le pseudo s'affiche partout.
  if (/[\u0000-\u001f\u007f]/.test(n)) return 'Le pseudo contient un caractère interdit.';
  return null;
}

export function passwordProblem(password: string): string | null {
  if (password.length < PASSWORD_MIN) return `Le mot de passe doit faire au moins ${PASSWORD_MIN} caractères.`;
  if (password.length > PASSWORD_MAX) return 'Mot de passe trop long.';
  return null;
}

const AVATAR_KEYS: (keyof AvatarConfig)[] = ['skin', 'hair', 'hairColor', 'facialHair', 'glasses', 'hat'];

/** Avatar reçu du réseau : seuls des petits entiers sont gardés. */
export function cleanAvatar(value: unknown): AvatarConfig | null {
  if (!value || typeof value !== 'object') return null;
  const out = {} as AvatarConfig;
  for (const k of AVATAR_KEYS) {
    const v = (value as Record<string, unknown>)[k];
    if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > 50) return null;
    out[k] = v;
  }
  return out;
}

export function cleanColor(value: unknown): string | null {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value) ? value : null;
}

/** Nombre maximal de parties envoyées par requête lors de la reprise des stats de la borne. */
export const IMPORT_BATCH = 50;

/** Une partie de la borne reprise en ligne garde son identifiant d'origine, préfixé. */
export const importedGameId = (localGameId: string) => `local-${localGameId}`;

/**
 * Reprise des stats de la borne : dans une partie archivée sur la borne, le profil local `from` devient le compte `to`.
 * Les autres joueurs de la partie gardent leur profil local tant qu'ils ne l'ont pas rattaché à leur compte.
 */
export function claimRecord(record: GameRecord, from: string, to: PublicAccount): GameRecord {
  const swap = (id: string) => (id === from ? to.id : id);
  const { session } = record;
  return {
    ...record,
    session: { ...session, config: { ...session.config, sides: session.config.sides.map((s) => ({ ...s, playerIds: s.playerIds.map(swap) })) } },
    players: record.players.map((p) => (p.id === from ? { id: to.id, name: to.name } : p)),
  };
}

/** La partie concerne-t-elle ce profil local ? (Seules les parties terminées ou abandonnées sont reprises.) */
export function involves(record: GameRecord, localId: string): boolean {
  const { session } = record;
  return (
    (session.status === 'finished' || session.status === 'abandoned') &&
    session.config.sides.some((s) => s.playerIds.includes(localId))
  );
}
