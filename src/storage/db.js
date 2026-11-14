export function memoryStore() {
    const profiles = new Map();
    const games = new Map();
    return {
        listProfiles: async () => [...profiles.values()],
        putProfile: async (p) => void profiles.set(p.id, structuredClone(p)),
        listGames: async () => [...games.values()],
        putGame: async (g) => void games.set(g.id, structuredClone(g)),
        deleteGame: async (id) => void games.delete(id),
    };
}
const DB_NAME = 'trem-dragooon';
const DB_VERSION = 1;
function request(req) {
    return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}
function openDb() {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    // Versionnement du format : chaque nouvelle version ajoutera ses migrations ici.
    req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('profiles'))
            db.createObjectStore('profiles', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('games'))
            db.createObjectStore('games', { keyPath: 'id' });
    };
    return request(req);
}
export async function indexedDbStore() {
    const db = await openDb();
    const tx = (name, mode) => db.transaction(name, mode).objectStore(name);
    return {
        listProfiles: () => request(tx('profiles', 'readonly').getAll()),
        putProfile: async (p) => void (await request(tx('profiles', 'readwrite').put(p))),
        listGames: () => request(tx('games', 'readonly').getAll()),
        putGame: async (g) => void (await request(tx('games', 'readwrite').put(g))),
        deleteGame: async (id) => void (await request(tx('games', 'readwrite').delete(id))),
    };
}
/** IndexedDB si possible ; sinon stockage en mémoire (les données ne survivront pas à la fermeture). */
export async function openStore() {
    try {
        return { store: await indexedDbStore(), durable: true };
    }
    catch {
        return { store: memoryStore(), durable: false };
    }
}
