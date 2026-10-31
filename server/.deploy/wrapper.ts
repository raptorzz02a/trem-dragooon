import worker, { AccountsObject, RoomObject } from '../worker';
import files from './files.json';

export { AccountsObject, RoomObject };

const table = files as Record<string, { type: string; body: string }>;

function serve(request: Request): Response {
  const path = new URL(request.url).pathname;
  const file = table[path] ?? table['/index.html']!;
  const bytes = Uint8Array.from(atob(file.body), (c) => c.charCodeAt(0));
  const cache = path.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache';
  return new Response(bytes, { headers: { 'Content-Type': file.type, 'Cache-Control': cache } });
}

export default {
  fetch(request: Request, env: Record<string, unknown>, ctx: ExecutionContext) {
    return (worker.fetch as any)(request, { ...env, ASSETS: { fetch: (r: Request) => Promise.resolve(serve(r)) } }, ctx);
  },
};
