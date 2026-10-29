// Adresse du serveur en ligne. Vide : le serveur qui a servi l'appli (cas normal, sur Cloudflare).
// La borne peut servir l'appli elle-même (npm run build:borne) en visant le serveur en ligne : voir docs/en-ligne.md.
const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export const apiUrl = (path: string) => `${BASE}${path}`;

export function wsUrl(path: string): string {
  const base = BASE ? new URL(BASE) : location;
  return `${base.protocol === 'https:' ? 'wss:' : 'ws:'}//${base.host}${path}`;
}
