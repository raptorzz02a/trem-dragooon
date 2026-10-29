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
  /** Code de secours, donné une seule fois : à la création du compte et après s'en être servi. */
  recovery?: string;
}

/** Classement d'un saloon : ses membres actuels et les parties jouées dans le saloon. */
export interface Community {
  accounts: PublicAccount[];
  games: GameRecord[];
  /** Parties qu'il faut avoir jouées dans le saloon pour y être classé. */
  minGames: number;
}

/** Fiche d'un joueur : ses parties que celui qui regarde a le droit de voir, et les saloons où elles ont été jouées. */
export interface PlayerStats {
  account: PublicAccount;
  /** Les joueurs de ces parties, pour afficher les adversaires. */
  accounts: PublicAccount[];
  games: GameRecord[];
  /** Saloons encore existants de ces parties (un saloon absent a été supprimé). */
  saloons: { id: string; name: string; icon: string }[];
  /** Sa propre fiche : toutes ses parties. Sinon, seulement celles des saloons partagés. */
  own: boolean;
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
  return detachPlayer(record, from, to.id, to.name);
}

/** La partie concerne-t-elle ce profil local ? (Seules les parties terminées ou abandonnées sont reprises.) */
export function involves(record: GameRecord, localId: string): boolean {
  const { session } = record;
  return (
    (session.status === 'finished' || session.status === 'abandoned') &&
    session.config.sides.some((s) => s.playerIds.includes(localId))
  );
}

/** Un compte vu depuis l'espace administrateur. */
export interface AdminAccount extends PublicAccount {
  /** Dernière connexion ou ouverture de l'appli avec ce compte (null : jamais vu depuis le suivi). */
  lastSeenAt: string | null;
  /** Parties en ligne terminées qui comptent pour ce compte. */
  games: number;
  admin: boolean;
  /** Le joueur a demandé un nouveau mot de passe depuis la page de connexion (date de la demande). */
  passwordRequest: string | null;
}

/**
 * Dans une partie archivée, le joueur `accountId` devient `newId` / `name`. Sert à rattacher un profil de la borne
 * à un compte, et à l'inverse à retirer un compte d'une partie : elle reste valable pour les autres joueurs
 * (victoires, confrontations), mais ne compte plus pour ce compte.
 */
export function detachPlayer(record: GameRecord, accountId: string, newId: string, name: string): GameRecord {
  const swap = (id: string) => (id === accountId ? newId : id);
  const { session } = record;
  return {
    ...record,
    session: { ...session, config: { ...session.config, sides: session.config.sides.map((s) => ({ ...s, playerIds: s.playerIds.map(swap) })) } },
    players: record.players.map((p) => (p.id === accountId ? { id: newId, name } : p)),
  };
}

/** Mot de passe provisoire donné par l'administrateur : sans caractères qu'on confond (0/O, 1/l). */
export function temporaryPassword(random: () => number): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < 8; i++) out += alphabet[Math.floor(random() * alphabet.length)];
  return out;
}

/** Caractères des codes de secours : majuscules et chiffres sans ceux qu'on confond (0/O, 1/I/L). */
const RECOVERY_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const RECOVERY_LENGTH = 16;

/**
 * Code de secours d'un compte, à noter : il permet de choisir un nouveau mot de passe depuis la page de connexion.
 * 16 caractères par groupes de 4 (ABCD-EFGH-JKMN-PQRS).
 */
export function recoveryCode(random: () => number): string {
  let out = '';
  for (let i = 0; i < RECOVERY_LENGTH; i++) out += RECOVERY_ALPHABET[Math.floor(random() * RECOVERY_ALPHABET.length)];
  return out.match(/.{4}/g)!.join('-');
}

/** Code tapé par le joueur : tirets, espaces et minuscules ne comptent pas. */
export function normalizeRecovery(code: string): string {
  return code.toUpperCase().replace(/[^0-9A-Z]/g, '');
}
