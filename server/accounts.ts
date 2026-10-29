import { DurableObject } from 'cloudflare:workers';
import { sessionState } from '../src/game-session/session';
import {
  claimRecord,
  cleanAvatar,
  IMPORT_BATCH,
  importedGameId,
  involves,
  cleanColor,
  passwordProblem,
  pseudoKey,
  pseudoProblem,
  type Community,
  type Login,
  type PublicAccount,
} from '../src/online/accounts';
import type { GameRecord } from '../src/profiles/types';

// Base des comptes et des parties en ligne : un seul Durable Object, stocké en SQLite (offre gratuite).
// Les mots de passe ne sont jamais stockés, seulement leur empreinte PBKDF2 salée ; les jetons de connexion
// sont eux aussi stockés sous forme d'empreinte.

/** Maximum accepté par les Workers pour PBKDF2. */
const PBKDF2_ITERATIONS = 100_000;
/** Après tant d'échecs de connexion sur un pseudo, il est bloqué un moment. */
const MAX_FAILURES = 10;
const LOCK_MS = 15 * 60 * 1000;

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
}

const publicAccount = (row: AccountRow): PublicAccount => ({
  id: row.id,
  name: row.name,
  color: row.color,
  avatar: JSON.parse(row.avatar),
  createdAt: row.created_at,
});

export class AccountsObject extends DurableObject<object> {
  private sql: SqlStorage;

  constructor(ctx: DurableObjectState, env: object) {
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
    `);
  }

  private row(where: string, value: string): AccountRow | null {
    return (this.sql.exec<AccountRow>(`SELECT * FROM accounts WHERE ${where} = ?`, value).toArray()[0] as AccountRow) ?? null;
  }

  private async openSession(accountId: string): Promise<string> {
    const token = randomHex(32);
    this.sql.exec('INSERT INTO sessions VALUES (?, ?, ?)', await sha256(token), accountId, new Date().toISOString());
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
      'INSERT INTO accounts (id, name, name_key, color, avatar, salt, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      id,
      name,
      pseudoKey(name),
      colour,
      JSON.stringify(look),
      salt,
      hash,
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
    return publicAccount(row);
  }

  /** Compte correspondant à un jeton de connexion, ou null s'il est inconnu (déconnecté). */
  async me(token: string): Promise<PublicAccount | null> {
    if (typeof token !== 'string' || token.length !== 64) return null;
    const session = this.sql.exec<{ account_id: string }>('SELECT account_id FROM sessions WHERE token_hash = ?', await sha256(token)).toArray()[0];
    const row = session ? this.row('id', session.account_id) : null;
    return row ? publicAccount(row) : null;
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
}
