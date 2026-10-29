import { DurableObject } from 'cloudflare:workers';
import { sessionState } from '../src/game-session/session';
import {
  claimRecord,
  cleanAvatar,
  IMPORT_BATCH,
  importedGameId,
  involves,
  cleanColor,
  detachPlayer,
  passwordProblem,
  temporaryPassword,
  pseudoKey,
  pseudoProblem,
  type AdminAccount,
  type Community,
  type Login,
  type PublicAccount,
} from '../src/online/accounts';
import { DELETED_NAME, type GameRecord } from '../src/profiles/types';

// Base des comptes et des parties en ligne : un seul Durable Object, stocké en SQLite (offre gratuite).
// Les mots de passe ne sont jamais stockés, seulement leur empreinte PBKDF2 salée ; les jetons de connexion
// sont eux aussi stockés sous forme d'empreinte.

/** Maximum accepté par les Workers pour PBKDF2. */
const PBKDF2_ITERATIONS = 100_000;
/** Après tant d'échecs de connexion sur un pseudo, il est bloqué un moment. */
const MAX_FAILURES = 10;
const LOCK_MS = 15 * 60 * 1000;
/** La date de dernière utilisation n'est réécrite qu'au plus une fois par tranche de ce délai. */
const SEEN_EVERY_MS = 10 * 60 * 1000;

/** Variables du Worker lues par la base des comptes. */
export interface AccountsEnv {
  /** Pseudos administrateurs, séparés par des virgules (voir wrangler.toml). */
  ADMINS?: string;
}

const hex = (bytes: ArrayBuffer | Uint8Array) =>
  [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');

const randomHex = (n: number) => hex(crypto.getRandomValues(new Uint8Array(n)));

async function hashPassword(password: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: PBKDF2_ITERATIONS },
    key,
    256,
  );
  return hex(bits);
}

const sha256 = async (text: string) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));

/** Comparaison en temps constant, pour ne rien laisser deviner par la durée de la réponse. */
function sameHash(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

interface AccountRow extends Record<string, SqlStorageValue> {
  id: string;
  name: string;
  color: string;
  avatar: string;
  created_at: string;
  last_seen_at: string | null;
}

const publicAccount = (row: AccountRow): PublicAccount => ({
  id: row.id,
  name: row.name,
  color: row.color,
  avatar: JSON.parse(row.avatar),
  createdAt: row.created_at,
});

export class AccountsObject extends DurableObject<AccountsEnv> {
  private sql: SqlStorage;

  constructor(ctx: DurableObjectState, env: AccountsEnv) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        name_key TEXT NOT NULL UNIQUE,
        color TEXT NOT NULL,
        avatar TEXT NOT NULL,
        salt TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        failures INTEGER NOT NULL DEFAULT 0,
        locked_until INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY,
        account_id TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS games (
        id TEXT PRIMARY KEY,
        finished_at TEXT NOT NULL,
        record TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS claims (
        local_id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL,
        claimed_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS admins (
        pseudo_key TEXT PRIMARY KEY,
        account_id TEXT NOT NULL
      );
    `);
    const columns = this.sql.exec<{ name: string }>('PRAGMA table_info(accounts)').toArray();
    if (!columns.some((c) => c.name === 'last_seen_at')) {
      // Comptes créés avant le suivi : dernière connexion connue, à défaut la création du compte.
      this.sql.exec('ALTER TABLE accounts ADD COLUMN last_seen_at TEXT');
      this.sql.exec(`UPDATE accounts SET last_seen_at = COALESCE(
        (SELECT MAX(created_at) FROM sessions WHERE sessions.account_id = accounts.id), created_at)`);
    }
    this.bindAdmins();
  }

  /**
   * Un pseudo administrateur (variable ADMINS) est attaché pour de bon au premier compte qui le porte : si ce compte
   * change de pseudo ensuite, personne d'autre ne devient administrateur en prenant l'ancien.
   * Retirer un pseudo de la variable retire l'accès à son compte.
   */
  private bindAdmins(): void {
    for (const pseudo of this.adminPseudos()) {
      const row = this.row('name_key', pseudo);
      if (row) this.sql.exec('INSERT OR IGNORE INTO admins VALUES (?, ?)', pseudo, row.id);
    }
  }

  private adminPseudos(): string[] {
    return (this.env.ADMINS ?? '').split(',').map(pseudoKey).filter(Boolean);
  }

  /** Comptes administrateurs : attachés à un pseudo encore présent dans la variable ADMINS. */
  private adminIds(): Set<string> {
    this.bindAdmins();
    const current = new Set(this.adminPseudos());
    return new Set(
      this.sql
        .exec<{ pseudo_key: string; account_id: string }>('SELECT pseudo_key, account_id FROM admins')
        .toArray()
        .filter((r) => current.has(r.pseudo_key))
        .map((r) => r.account_id),
    );
  }

  private isAdmin(accountId: string): boolean {
    return this.adminIds().has(accountId);
  }

  /** Note que le compte vient d'être utilisé (connexion, ouverture de l'appli, partie). */
  private seen(row: AccountRow, at = new Date()): void {
    const last = row.last_seen_at ? Date.parse(row.last_seen_at) : 0;
    if (at.getTime() - last >= SEEN_EVERY_MS) this.sql.exec('UPDATE accounts SET last_seen_at = ? WHERE id = ?', at.toISOString(), row.id);
  }

  private row(where: string, value: string): AccountRow | null {
    return (this.sql.exec<AccountRow>(`SELECT * FROM accounts WHERE ${where} = ?`, value).toArray()[0] as AccountRow) ?? null;
  }

  private async openSession(accountId: string): Promise<string> {
    const token = randomHex(32);
    const now = new Date().toISOString();
    this.sql.exec('INSERT INTO sessions VALUES (?, ?, ?)', await sha256(token), accountId, now);
    this.sql.exec('UPDATE accounts SET last_seen_at = ? WHERE id = ?', now, accountId);
    return token;
  }

  async signup(name: string, password: string, color: unknown, avatar: unknown): Promise<Login> {
    name = String(name ?? '').trim();
    const problem = pseudoProblem(name) ?? passwordProblem(String(password ?? ''));
    if (problem) throw new Error(problem);
    const look = cleanAvatar(avatar);
    const colour = cleanColor(color);
    if (!look || !colour) throw new Error('Avatar invalide.');
    if (this.row('name_key', pseudoKey(name))) throw new Error('Ce pseudo est déjà pris.');
    const id = crypto.randomUUID();
    const salt = randomHex(16);
    const hash = await hashPassword(password, salt);
    // Un autre compte a pu prendre le pseudo pendant le calcul de l'empreinte.
    if (this.row('name_key', pseudoKey(name))) throw new Error('Ce pseudo est déjà pris.');
    this.sql.exec(
      'INSERT INTO accounts (id, name, name_key, color, avatar, salt, password_hash, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      id,
      name,
      pseudoKey(name),
      colour,
      JSON.stringify(look),
      salt,
      hash,
      new Date().toISOString(),
      new Date().toISOString(),
    );
    return { token: await this.openSession(id), account: publicAccount(this.row('id', id)!) };
  }

  async login(name: string, password: string): Promise<Login> {
    const account = await this.check(name, password);
    return { token: await this.openSession(account.id), account };
  }

  /**
   * Vérifie un pseudo et son mot de passe, sans ouvrir de session : c'est ce qui permet d'ajouter un joueur
   * sans téléphone à une partie sur la même cible. Les échecs comptent pour le blocage, comme à la connexion.
   */
  async check(name: string, password: string): Promise<PublicAccount> {
    const wrong = new Error('Pseudo ou mot de passe incorrect.');
    const row = this.row('name_key', pseudoKey(String(name ?? '')));
    if (!row) throw wrong;
    const now = Date.now();
    if ((row.locked_until as number) > now) throw new Error('Trop d’essais : réessaie dans quelques minutes.');
    const hash = await hashPassword(String(password ?? ''), row.salt as string);
    if (!sameHash(hash, row.password_hash as string)) {
      const failures = (row.failures as number) + 1;
      const locked = failures >= MAX_FAILURES;
      this.sql.exec('UPDATE accounts SET failures = ?, locked_until = ? WHERE id = ?', locked ? 0 : failures, locked ? now + LOCK_MS : 0, row.id);
      throw wrong;
    }
    this.sql.exec('UPDATE accounts SET failures = 0 WHERE id = ?', row.id);
    this.seen(row);
    return publicAccount(row);
  }

  /** Compte correspondant à un jeton de connexion, ou null s'il est inconnu (déconnecté). */
  async me(token: string): Promise<PublicAccount | null> {
    const row = await this.sessionRow(token);
    return row ? publicAccount(row) : null;
  }

  private async sessionRow(token: string): Promise<AccountRow | null> {
    if (typeof token !== 'string' || token.length !== 64) return null;
    const session = this.sql.exec<{ account_id: string }>('SELECT account_id FROM sessions WHERE token_hash = ?', await sha256(token)).toArray()[0];
    return session ? this.row('id', session.account_id) : null;
  }

  /** Ouverture de l'appli : le compte du jeton, s'il est administrateur, et la date d'utilisation est notée. */
  async open(token: string): Promise<{ account: PublicAccount; admin: boolean } | null> {
    const row = await this.sessionRow(token);
    if (!row) return null;
    this.seen(row);
    return { account: publicAccount(row), admin: this.isAdmin(row.id) };
  }

  /** Changement de son propre mot de passe : les autres appareils connectés sont déconnectés. */
  async changePassword(token: string, current: unknown, next: unknown): Promise<string> {
    const row = await this.sessionRow(token);
    if (!row) throw new Error('Connecte-toi d’abord.');
    await this.check(row.name, String(current ?? '')).catch(() => {
      throw new Error('Mot de passe actuel incorrect.');
    });
    await this.setPassword(row.id, String(next ?? ''));
    return this.openSession(row.id);
  }

  /** Nouveau mot de passe : toutes les sessions du compte sont fermées et le blocage est levé. */
  private async setPassword(accountId: string, password: string): Promise<void> {
    const problem = passwordProblem(password);
    if (problem) throw new Error(problem);
    const salt = randomHex(16);
    const hash = await hashPassword(password, salt);
    this.sql.exec('UPDATE accounts SET salt = ?, password_hash = ?, failures = 0, locked_until = 0 WHERE id = ?', salt, hash, accountId);
    this.sql.exec('DELETE FROM sessions WHERE account_id = ?', accountId);
  }

  async logout(token: string): Promise<void> {
    if (typeof token === 'string') this.sql.exec('DELETE FROM sessions WHERE token_hash = ?', await sha256(token));
  }

  async update(token: string, name: unknown, color: unknown, avatar: unknown): Promise<PublicAccount> {
    const account = await this.me(token);
    if (!account) throw new Error('Connecte-toi d’abord.');
    const pseudo = String(name ?? '').trim();
    const problem = pseudoProblem(pseudo);
    if (problem) throw new Error(problem);
    const look = cleanAvatar(avatar);
    const colour = cleanColor(color);
    if (!look || !colour) throw new Error('Avatar invalide.');
    const other = this.row('name_key', pseudoKey(pseudo));
    if (other && other.id !== account.id) throw new Error('Ce pseudo est déjà pris.');
    this.sql.exec(
      'UPDATE accounts SET name = ?, name_key = ?, color = ?, avatar = ? WHERE id = ?',
      pseudo,
      pseudoKey(pseudo),
      colour,
      JSON.stringify(look),
      account.id,
    );
    return publicAccount(this.row('id', account.id)!);
  }

  /** Enregistre (ou remplace) une partie en ligne terminée. */
  async recordGame(record: GameRecord): Promise<void> {
    // Un compte supprimé pendant la partie n'y figure plus que comme « Joueur supprimé ».
    for (const p of record.players) {
      const row = this.row('id', p.id);
      if (row) this.seen(row, new Date(record.session.endedAt ?? Date.now()));
      else record = detachPlayer(record, p.id, `supprime-${crypto.randomUUID()}`, DELETED_NAME);
    }
    this.sql.exec(
      'INSERT OR REPLACE INTO games VALUES (?, ?, ?)',
      record.id,
      record.session.endedAt ?? new Date().toISOString(),
      JSON.stringify(record),
    );
  }

  /** Une annulation a rouvert la partie : elle n'est plus terminée. */
  async forgetGame(id: string): Promise<void> {
    this.sql.exec('DELETE FROM games WHERE id = ?', id);
  }

  /**
   * Reprise des stats de la borne : le profil local `localId` est rattaché au compte connecté, et ses parties
   * archivées sur la borne rejoignent les parties en ligne. Un profil local ne peut être rattaché qu'à un seul compte.
   * Renvoie le nombre de parties reprises.
   */
  async importGames(token: string, localId: unknown, records: unknown): Promise<number> {
    const account = await this.me(token);
    if (!account) throw new Error('Connecte-toi d’abord.');
    if (typeof localId !== 'string' || !localId || localId.length > 64) throw new Error('Joueur de la borne invalide.');
    if (!Array.isArray(records) || records.length > IMPORT_BATCH) throw new Error('Envoi invalide.');
    const claim = this.sql.exec<{ account_id: string }>('SELECT account_id FROM claims WHERE local_id = ?', localId).toArray()[0];
    if (claim && claim.account_id !== account.id) throw new Error('Ce joueur de la borne est déjà rattaché à un autre compte.');
    if (!claim) this.sql.exec('INSERT INTO claims VALUES (?, ?, ?)', localId, account.id, new Date().toISOString());

    let count = 0;
    for (const raw of records as GameRecord[]) {
      try {
        if (typeof raw?.id !== 'string' || raw.id.length > 100 || !involves(raw, localId)) continue;
        sessionState(raw.session); // une partie que le moteur ne sait pas rejouer est ignorée
        const id = importedGameId(raw.id);
        // Un autre joueur de la même partie a pu la reprendre avant : on complète sa version.
        const existing = this.sql.exec<{ record: string }>('SELECT record FROM games WHERE id = ?', id).toArray()[0];
        const base = existing ? (JSON.parse(existing.record) as GameRecord) : { ...raw, id };
        const record = claimRecord(base, localId, account);
        this.sql.exec('INSERT OR REPLACE INTO games VALUES (?, ?, ?)', id, record.session.endedAt ?? record.session.createdAt, JSON.stringify(record));
        count++;
      } catch {
        // Partie illisible : ignorée, les autres sont reprises.
      }
    }
    return count;
  }

  async community(): Promise<Community> {
    const accounts = this.sql.exec<AccountRow>('SELECT * FROM accounts ORDER BY name_key').toArray().map((r) => publicAccount(r as AccountRow));
    const games = this.sql
      .exec<{ record: string }>('SELECT record FROM games ORDER BY finished_at')
      .toArray()
      .map((r) => JSON.parse(r.record) as GameRecord);
    // Les noms affichés suivent les pseudos actuels (un joueur a pu changer de pseudo depuis la partie).
    const names = new Map(accounts.map((a) => [a.id, a.name]));
    for (const g of games) g.players = g.players.map((p) => ({ ...p, name: names.get(p.id) ?? p.name }));
    return { accounts, games };
  }

  // Espace administrateur : chaque action vérifie d'abord que le jeton est celui d'un administrateur.

  private async admin(token: string): Promise<AccountRow> {
    const row = await this.sessionRow(token);
    if (!row || !this.isAdmin(row.id)) throw Object.assign(new Error('Réservé à l’administrateur.'), { status: 403 });
    return row;
  }

  private target(accountId: unknown): AccountRow {
    const row = typeof accountId === 'string' ? this.row('id', accountId) : null;
    if (!row) throw new Error('Compte introuvable.');
    return row;
  }

  async adminList(token: string): Promise<AdminAccount[]> {
    await this.admin(token);
    const counts = new Map<string, number>();
    for (const { record } of this.sql.exec<{ record: string }>('SELECT record FROM games').toArray()) {
      for (const p of (JSON.parse(record) as GameRecord).players) counts.set(p.id, (counts.get(p.id) ?? 0) + 1);
    }
    const admins = this.adminIds();
    return this.sql
      .exec<AccountRow>('SELECT * FROM accounts ORDER BY name_key')
      .toArray()
      .map((r) => {
        const row = r as AccountRow;
        return { ...publicAccount(row), lastSeenAt: row.last_seen_at, games: counts.get(row.id) ?? 0, admin: admins.has(row.id) };
      });
  }

  /** Remise à zéro des stats : le compte est retiré de toutes ses parties, qui restent valables pour les autres. */
  async adminResetStats(token: string, accountId: unknown): Promise<number> {
    await this.admin(token);
    return this.detachEverywhere(this.target(accountId), false);
  }

  /** Mot de passe provisoire, renvoyé une seule fois à l'administrateur pour qu'il le transmette au joueur. */
  async adminResetPassword(token: string, accountId: unknown): Promise<string> {
    await this.admin(token);
    const row = this.target(accountId);
    const password = temporaryPassword(() => crypto.getRandomValues(new Uint32Array(1))[0]! / 2 ** 32);
    await this.setPassword(row.id, password);
    return password;
  }

  /** Suppression d'un compte : ses parties restent pour les autres joueurs, à son nom « Joueur supprimé ». */
  async adminDelete(token: string, accountId: unknown): Promise<void> {
    const me = await this.admin(token);
    const row = this.target(accountId);
    if (row.id === me.id) throw new Error('Tu ne peux pas supprimer ton propre compte ici.');
    this.detachEverywhere(row, true);
    this.sql.exec('DELETE FROM sessions WHERE account_id = ?', row.id);
    this.sql.exec('DELETE FROM claims WHERE account_id = ?', row.id);
    this.sql.exec('DELETE FROM admins WHERE account_id = ?', row.id);
    this.sql.exec('DELETE FROM accounts WHERE id = ?', row.id);
  }

  private detachEverywhere(row: AccountRow, deleted: boolean): number {
    const newId = `${deleted ? 'supprime' : 'remis-a-zero'}-${crypto.randomUUID()}`;
    let count = 0;
    for (const g of this.sql.exec<{ id: string; record: string }>('SELECT id, record FROM games').toArray()) {
      const record = JSON.parse(g.record) as GameRecord;
      if (!record.players.some((p) => p.id === row.id)) continue;
      const name = deleted ? DELETED_NAME : (record.players.find((p) => p.id === row.id)?.name ?? row.name);
      this.sql.exec('UPDATE games SET record = ? WHERE id = ?', JSON.stringify(detachPlayer(record, row.id, newId, name)), g.id);
      count++;
    }
    return count;
  }
}
