# TREM-DRAGOOON · Documentation technique

Livrable 06 · version 0.1.0 · octobre 2026

## 1. Vue d'ensemble

TREM-DRAGOOON est une application web monopage (React 18 + TypeScript, construite avec Vite), servie par un
Cloudflare Worker qui garde les comptes, les parties en cours et les parties archivées. Elle demande Internet
pendant le jeu. Le fonctionnement en ligne est décrit dans `en-ligne.md` ; les sections 5 (données locales)
et 3 (serveur local) ne servent plus qu'à reprendre les stats d'avant le passage en ligne.

| Élément | Choix |
| --- | --- |
| Matériel cible | PC Windows 11 Pro, écran tactile 13-14 pouces en 1366 × 768, paysage |
| Navigateur | Microsoft Edge (Chromium), en plein écran puis en mode kiosque (lot 5) |
| Interface | React 18, TypeScript strict, CSS simple (pas de framework CSS) |
| Construction | Vite 6, sortie statique dans `dist/` avec chemins relatifs (`base: './'`) |
| Tests | Vitest 3 (moteur, sessions, statistiques) ; script Playwright pour la recette de l'interface |
| Stockage | Serveur (Durable Objects, SQLite) pour les comptes et les parties ; `localStorage` pour la session et les réglages d'affichage |

## 2. Architecture

| Dossier | Rôle |
| --- | --- |
| `src/game-engine` | Règles des 4 familles de modes (6 modes), calcul des scores, vainqueurs, classements, suggestions de finition. Aucune dépendance à l'interface. |
| `src/game-session` | Cycle de vie d'une partie : création, lancers, fin de tour, annulation, correction, abandon, revanche. |
| `src/teams` | Équipes, tirage au sort, ordre de passage, couleurs d'équipe. |
| `src/profiles` | Types des profils et des archives ; statistiques et classements (`stats.ts`), statistiques de score par volée, progression, périodes et classements par moyenne (`scores.ts`), export CSV (`export.ts`). |
| `src/storage` | Partie en cours (`currentGame.ts`, localStorage) ; base IndexedDB (`db.ts`). |
| `src/settings` | Réglages d'affichage (durée de la transition, animations) et des statistiques (seuils, tranches de l'histogramme). |
| `src/ui` | Écrans React. `src/ui/modes` contient ce qui change d'un mode à l'autre à l'écran ; `src/ui/components` les éléments partagés (pavé de saisie, avatar, cible de l'Horloge, éditeur de profil, graphiques des statistiques `Charts.tsx`, filtre de période `PeriodFilter.tsx`). |
| `docs` | Règles appliquées (`regles.md`), guide utilisateur, cette documentation, procès-verbal de recette. |
| `scripts/recette-en-ligne.cjs` | Recette automatisée dans Chromium : borne, téléphone, PC 13 pouces. |

### 2.1 Principe du moteur : tout est recalculé

Une partie est stockée sous la forme de sa configuration et de la **liste brute des événements** :
`{ type: 'dart', dart }` ou `{ type: 'endTurn' }`. La fonction `computeState(config, events)` rejoue cette
liste et produit l'état complet : scores, joueur actif, volées, statut, vainqueurs, classement.

Conséquences :

- **Annuler**, c'est retirer le dernier événement.
- **Corriger une fléchette passée**, c'est la remplacer dans la liste puis rejouer. La correction est tracée
  dans `session.corrections`.
- Les mêmes impacts avec les mêmes règles donnent toujours le même résultat.
- Les statistiques sont recalculées à partir des parties archivées. Rien n'est stocké en double, donc pas de
  doublon possible.

Chaque mode implémente l'interface `ModeRules` (`src/game-engine/rules.ts`) :

- `init` : état de départ ;
- `onTurnStart` : début de volée ;
- `applyDart` : effet d'une fléchette (points, bust, victoire, fin de volée) ;
- `onRoundEnd` : fin de manche ;
- `ranking` : classement.

Sur un bust, le moteur restaure l'état du début de volée.

Un « côté » porte le score : un joueur en individuel, une équipe en mode équipe. Les côtés jouent à tour de
rôle, et les membres d'une équipe se relaient d'une manche à l'autre :
`playerFor(config, side, round) = side.playerIds[round % taille]`.

### 2.2 Interface

`App.tsx` choisit l'écran à afficher : accueil, préparation, jeu, joueurs, profil ou classements.

L'écran de jeu (`screens/Game.tsx`) est commun aux quatre modes. Ce qui diffère passe par un objet
`ModeView` (`src/ui/modes/*View.tsx`) : titre, valeur principale, aide, tableau des scores, pavé ou saisie
propre au mode. L'Horloge, par exemple, remplace le pavé par Touché / Raté et une cible dessinée.

Contre les saisies accidentelles :

- `useTapGuard` ignore un second appui sur la même action dans les 250 ms (400 ms pour les actions de tour) ;
- l'écran de transition bloque la saisie jusqu'à ce que le joueur suivant soit annoncé.

## 3. Installation

### 3.1 Prérequis sur le PC

- **Node.js** 20 LTS ou plus récent ([nodejs.org](https://nodejs.org), installeur Windows « LTS »).
- **Git** ([git-scm.com](https://git-scm.com/download/win)).
- **Microsoft Edge** (déjà présent sous Windows 11).

Sous Windows, utiliser **PowerShell** et non PowerShell ISE, où npm n'affiche rien. Si PowerShell refuse
d'exécuter `npm` (stratégie d'exécution des scripts), taper `npm.cmd` à la place de `npm`.

### 3.2 Première installation

```powershell
cd $HOME
git clone https://github.com/raptorzz02a/trem-dragooon.git
cd trem-dragooon
npm.cmd install
npm.cmd test          # 109 tests doivent passer
npm.cmd run build     # construit dist/
npm.cmd run preview   # sert l'application sur http://localhost:4173
```

Ouvrir http://localhost:4173 dans Edge, puis F11 pour le plein écran.

`npm run dev` lance la version de développement sur http://localhost:5173, avec rechargement automatique. Il
sert à modifier le code, pas au jeu au quotidien.

> Le dossier est propre au compte Windows qui l'a cloné (`$HOME` = `C:\Users\<compte>`). Les données de jeu
> sont rangées dans le profil Edge de ce même compte : il faut toujours utiliser la même session Windows.

### 3.3 Commandes

| Commande | Effet |
| --- | --- |
| `npm test` | Tests automatiques (Vitest) |
| `npm run typecheck` | Vérification TypeScript |
| `npm run build` | Vérification TypeScript puis construction dans `dist/` |
| `npm run preview` | Sert `dist/` sur le port 4173 (accessible aussi depuis le réseau local) |
| `npm run dev` | Serveur de développement, port 5173 |

## 4. Configuration kiosque

> **État : à livrer au lot 5.** Le lot 5 fournira un script de démarrage et l'installation de l'application.
> La procédure ci-dessous est celle qui sera automatisée. Elle peut déjà servir à la main.

1. **Ouvrir l'application** au démarrage de la session : un raccourci dans le dossier de démarrage
   (`Win + R`, `shell:startup`) vers un fichier `trem-dragooon.bat` qui contient :

   ```bat
   start "" msedge --app=https://trem-dragooon.julien-charrier01.workers.dev --start-fullscreen --no-first-run
   ```

   Plus besoin de serveur local, sauf une fois pour reprendre les anciennes stats (`en-ligne.md`).
   Avec l'ampoule Yeelight, le `.bat` lance aussi le pont local : voir `ampoule.md`. Avec la caméra, il lance
   aussi Dart Sense : voir `dart-sense.md`.

2. **Plein écran Edge** : `--app` ouvre Edge sans barre d'adresse ni onglets. Pour en sortir, `Alt + F4`, ou
   fermer la session Windows. Ne pas utiliser `--kiosk` ni l'accès attribué de Windows (« Configurer un
   kiosque ») : Edge y tourne en navigation InPrivate et oublie tout à la fermeture, donc le compte connecté
   sur la borne serait déconnecté à chaque redémarrage.
3. **Éviter les interruptions** : désactiver la mise en veille de l'écran (Paramètres > Système >
   Alimentation) et les notifications. Laisser le clavier tactile activé pour la saisie des surnoms.

Dans l'application, un code administrateur protégera la sortie du kiosque, les réglages et la restauration
(lot 5).

## 5. Données et sauvegarde

### 5.1 Où sont les données

| Donnée | Emplacement | Clé |
| --- | --- | --- |
| Partie en cours | `localStorage` | `trem-dragooon.current-game` |
| Réglages | `localStorage` | `trem-dragooon.settings` (`transitionMs`, `animations`, `statThresholds`, `histogramStep`) |
| Profils | IndexedDB, base `trem-dragooon` v1 | magasin `profiles`, clé `id` |
| Parties archivées | IndexedDB, base `trem-dragooon` v1 | magasin `games`, clé `id` (identifiant de la partie) |

Ces données sont dans le profil Edge du compte Windows. Elles survivent à la fermeture du navigateur et au
redémarrage du PC (vérifié en recette, G01 et G02). Elles sont perdues si l'on efface les « cookies et
données de site » d'Edge, ou si l'on change de compte Windows.

La partie en cours est réécrite après chaque action. Une partie est archivée à sa fin, sous son identifiant.
Si on l'archive à nouveau (annulation puis nouvelle fin), l'archive est remplacée : il n'y a donc jamais de
doublon. Si une annulation rouvre la partie, l'archive est retirée. Les parties abandonnées sont archivées
avec le statut `abandoned` : elles figurent dans l'historique, mais pas dans les victoires.

Si IndexedDB est indisponible (navigation InPrivate, stockage bloqué), l'application bascule sur un stockage
en mémoire et affiche un avertissement rouge sur l'accueil.

### 5.2 Formats

```ts
// Partie en cours (localStorage)
interface SavedGame { version: 1; session: GameSession; players: { id: string; name: string }[] }

// Partie archivée (IndexedDB, magasin games)
interface GameRecord { id: string; session: GameSession; players: { id: string; name: string }[] }

interface GameSession {
  id: string; config: GameConfig; status: 'ready' | 'in_progress' | 'finished' | 'abandoned' | 'cancelled';
  events: GameEvent[]; corrections: Correction[];
  createdAt: string; startedAt: string | null; endedAt: string | null; // dates ISO
}

// Profil (IndexedDB, magasin profiles)
interface Profile {
  id: string; name: string; color: string; createdAt: string; deleted?: boolean;
  avatar: { skin: number; hair: number; hairColor: number; facialHair: number; glasses: number; hat: number };
}
```

Supprimer un joueur passe `deleted` à vrai et remplace son nom par « Joueur supprimé », dans le profil comme
dans les parties archivées. L'avatar est remis par défaut. Les parties sont conservées pour les autres
joueurs.

### 5.3 Sauvegarde et restauration

> **État : à livrer au lot 5.** Ce lot ajoutera, derrière le code administrateur :
>
> - un export JSON de toutes les données (profils, parties, réglages) ;
> - une restauration qui valide le fichier avant de remplacer quoi que ce soit, et refuse explicitement un
>   fichier invalide.

En attendant, ne pas effacer les données de navigation d'Edge sur le PC de jeu.

### 5.4 Évolution du format

Le numéro de version de la base (`DB_VERSION` dans `src/storage/db.ts`) et le champ `version` de la partie en
cours permettent d'ajouter des migrations. Toute modification de format doit incrémenter ce numéro et migrer
les données dans `onupgradeneeded`.

## 6. Mise à jour

```powershell
cd $HOME\trem-dragooon
git checkout main
git pull
npm.cmd install
npm.cmd test
npm.cmd run build
```

Relancer ensuite `npm.cmd run preview`, ou redémarrer le PC si le démarrage automatique est en place. Dans
Edge, Ctrl+F5 recharge la nouvelle version. Les données ne sont pas touchées par une mise à jour. Une partie
en cours peut être reprise après la mise à jour.

## 7. Maintenance

### 7.1 Tests

- `npm test` lance 109 tests. L'identifiant du cahier des charges (A01, B03, G08…) figure dans le nom des
  tests : `src/game-engine/**/*.test.ts`, `src/game-session/*.test.ts`, `src/profiles/stats.test.ts`.
- Recette de l'interface : `npm run online:dev` dans un terminal. Dans un autre terminal :

  ```bash
  npm install --no-save playwright
  npx playwright install chromium
  node scripts/recette-en-ligne.cjs
  ```

  Le script joue sur trois appareils simulés (borne, téléphone, PC 13 pouces), écrit les captures dans le
  dossier temporaire et sort en erreur si une vérification échoue.

### 7.2 Ajouter ou modifier une règle

1. Écrire d'abord le test dans le fichier du mode (`src/game-engine/modes/<mode>.test.ts`).
2. Modifier la règle dans `src/game-engine/modes/<mode>.ts`, et l'option dans `types.ts` et `DEFAULT_OPTIONS`
   (`engine.ts`).
3. Ajouter le choix à l'écran dans `src/ui/screens/Setup.tsx` (`ModeRules`).
4. Mettre à jour `docs/regles.md`.

Pour un nouveau mode, il faut un `ModeRules` côté moteur, un `ModeView` côté interface (`src/ui/modes`),
l'enregistrer dans `MODE_VIEWS`, puis l'ajouter à l'accueil et aux statistiques (`src/profiles/stats.ts`).

### 7.3 Dépannage technique

| Symptôme | Cause et solution |
| --- | --- |
| `npm` n'affiche rien | PowerShell ISE : utiliser PowerShell. |
| « l'exécution de scripts est désactivée » | Utiliser `npm.cmd`, ou `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`. |
| « Impossible de trouver le chemin » sur `cd $HOME\trem-dragooon` | Autre compte Windows : cloner le dépôt sous ce compte (§ 3.2). |
| Port 4173 déjà utilisé | Un serveur tourne déjà : fermer l'autre fenêtre, ou lancer `npx vite preview --port 4174`. |
| Écran blanc | Ouvrir les outils de développement d'Edge (F12 > Console), relever l'erreur, relancer `npm.cmd run build`. |

## 8. Dépendances

| Paquet | Rôle |
| --- | --- |
| `react`, `react-dom` 18 | Interface |
| `vite` 6, `@vitejs/plugin-react` 4 | Construction et serveur local |
| `typescript` 5 | Typage strict (`noUncheckedIndexedAccess`) |
| `vitest` 3 | Tests |
| `@types/react`, `@types/react-dom` | Types |

Aucune dépendance n'est chargée depuis Internet à l'exécution. Les polices sont celles du système (Segoe UI).
