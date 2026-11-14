const KEY = 'trem-dragooon.current-game';
// Le stockage peut être indisponible (navigation privée, stockage bloqué) : l'appli doit continuer à fonctionner.
export function loadCurrentGame() {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw)
            return null;
        const saved = JSON.parse(raw);
        return saved.version === 1 ? saved : null;
    }
    catch {
        return null;
    }
}
export function saveCurrentGame(game) {
    try {
        if (game)
            localStorage.setItem(KEY, JSON.stringify(game));
        else
            localStorage.removeItem(KEY);
    }
    catch {
        // Sans stockage, la partie continue mais ne pourra pas être reprise après fermeture.
    }
}
