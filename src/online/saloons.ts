import type { AvatarConfig } from '../profiles/types';

// Saloons : les groupes d'amis, sur le modèle Discord. Chaque saloon a ses membres, ses parties et ses
// classements ; on y entre une fois avec son nom et son mot de passe, ou directement par un lien d'invitation.
// TREM-DRAGOOON est le saloon public : tout compte en est membre d'office, et son classement sert de classement mondial.
// Règles partagées par l'appli et le serveur.

export type SaloonRole = 'owner' | 'admin' | 'member';

/** Un saloon vu par l'un de ses membres. */
export interface Saloon {
  id: string;
  name: string;
  color: string;
  icon: string;
  /** Le saloon public TREM-DRAGOOON. */
  public: boolean;
  role: SaloonRole;
  members: number;
  /** Jeton du lien d'invitation : seulement pour le propriétaire et les admins du saloon. */
  invite?: string;
}

export const PUBLIC_SALOON_ID = 'trem-dragooon';
export const PUBLIC_SALOON_NAME = 'TREM-DRAGOOON';

export const SALOON_NAME_MIN = 2;
export const SALOON_NAME_MAX = 24;
export const SALOON_PASSWORD_MIN = 4;
/** Saloons qu'un compte peut créer (il peut en rejoindre autant qu'il veut). */
export const MAX_OWNED_SALOONS = 3;
export const MAX_SALOON_MEMBERS = 50;

/** Icônes proposées pour un saloon (la cible est réservée au saloon public). */
export const SALOON_ICONS = ['🍺', '🐉', '🏆', '🤠', '🔥', '⭐', '🎲', '👑', '🃏', '⚡', '🍀'] as const;

/**
 * Couleurs proposées pour un saloon : l'interface prend la couleur du saloon ouvert. Le vert et l'or de
 * l'interface d'origine sont réservés au saloon public, pour qu'on sache toujours où l'on est.
 */
export const SALOON_COLORS = ['#d64545', '#e8833a', '#3d7fd9', '#2bb3c0', '#8e5bd6', '#d9529b', '#a8683a', '#6f7f99', '#b8324f'] as const;

/** Clé d'unicité d'un nom de saloon : « Les Potes » et « les potes » sont le même saloon. */
export function saloonKey(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('fr').normalize('NFC');
}

export function saloonNameProblem(name: string): string | null {
  const n = name.trim();
  if (n.length < SALOON_NAME_MIN) return `Le nom du saloon doit faire au moins ${SALOON_NAME_MIN} caractères.`;
  if (n.length > SALOON_NAME_MAX) return `Le nom du saloon doit faire au plus ${SALOON_NAME_MAX} caractères.`;
  if (/[\u0000-\u001f\u007f]/.test(n)) return 'Le nom du saloon contient un caractère interdit.';
  if (saloonKey(n) === saloonKey(PUBLIC_SALOON_NAME)) return 'Ce nom est réservé au saloon public.';
  return null;
}

export function saloonPasswordProblem(password: string): string | null {
  if (password.length < SALOON_PASSWORD_MIN) return `Le mot de passe du saloon doit faire au moins ${SALOON_PASSWORD_MIN} caractères.`;
  if (password.length > 200) return 'Mot de passe trop long.';
  return null;
}

export const cleanSaloonIcon = (value: unknown): string | null =>
  (SALOON_ICONS as readonly unknown[]).includes(value) ? (value as string) : null;

export const cleanSaloonColor = (value: unknown): string | null =>
  (SALOON_COLORS as readonly unknown[]).includes(value) ? (value as string) : null;

/** Saloon d'une partie enregistrée : les parties d'avant les saloons appartiennent au saloon public. */
export const saloonOf = (record: { saloonId?: string }): string => record.saloonId ?? PUBLIC_SALOON_ID;

/** Lien d'invitation : il fait entrer directement dans le saloon, sans mot de passe. */
export const inviteLink = (origin: string, invite: string) => `${origin}/?invitation=${encodeURIComponent(invite)}`;

export const isInviteToken = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{32}$/.test(value);

/** Un membre d'un saloon, vu depuis la liste des membres. */
export interface SaloonMember {
  id: string;
  name: string;
  color: string;
  avatar: AvatarConfig;
  role: SaloonRole;
  joinedAt: string;
}

/** Membres d'un saloon, et les comptes bannis (visibles du propriétaire et des admins). */
export interface SaloonMembers {
  members: SaloonMember[];
  banned: { id: string; name: string }[];
}

/** Qui agit dans un saloon : un membre selon son rôle, ou l'administrateur de l'appli (tous les pouvoirs). */
export type SaloonActor = SaloonRole | 'global';

export type MemberAction = 'kick' | 'ban' | 'promote' | 'demote' | 'transfer';

/**
 * Pouvoirs sur un membre : un admin exclut ou bannit les simples membres ; le propriétaire agit aussi sur les admins,
 * nomme ou retire les admins et transfère la propriété ; l'administrateur de l'appli peut tout faire.
 */
export function canManage(actor: SaloonActor, target: SaloonRole, action: MemberAction): boolean {
  if (actor === 'member') return false;
  if (action === 'promote') return target === 'member' && (actor === 'owner' || actor === 'global');
  if (action === 'demote') return target === 'admin' && (actor === 'owner' || actor === 'global');
  if (action === 'transfer') return target !== 'owner' && (actor === 'owner' || actor === 'global');
  // Exclure ou bannir : jamais le propriétaire (il transfère d'abord, ou quitte), sauf par l'administrateur de l'appli.
  if (actor === 'global') return true;
  if (actor === 'owner') return target !== 'owner';
  return target === 'member';
}

/** Changer le nom, le mot de passe, la couleur ou l'icône, lever un bannissement. */
export const canEditSaloon = (actor: SaloonActor | null): boolean => actor !== null && actor !== 'member';

export const canDeleteSaloon = (actor: SaloonActor | null): boolean => actor === 'owner' || actor === 'global';

/** Un saloon vu depuis l'espace administrateur de l'appli. */
export interface AdminSaloon {
  id: string;
  name: string;
  color: string;
  icon: string;
  members: number;
  owner: string | null;
  createdAt: string;
}
