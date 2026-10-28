# TREM-DRAGOOON

Application de comptage de points aux fléchettes, pensée pour un PC Windows tactile en mode kiosque.

Modes : 301 / 501 / 701, Cricket, Horloge, Shanghai. De 1 à 10 joueurs, en individuel ou en équipes.

## Développement

```bash
npm install
npm test          # tests du moteur de jeu
npm run typecheck # vérification TypeScript
```

## Organisation du code

| Dossier | Rôle |
| --- | --- |
| `src/game-engine` | Règles des 6 modes, calcul des scores et des vainqueurs, suggestions de finition. Indépendant de l'interface. |
| `src/game-session` | Déroulement d'une partie : états, lancers, annulation, corrections, abandon, revanche. |
| `src/teams` | Composition des équipes, tirage au sort, ordre de passage, couleurs. |
| `docs/regles.md` | Règles exactes appliquées par le moteur. |

Le moteur ne stocke que la configuration et la liste des lancers ; tout le reste (scores, vainqueur, classement)
est recalculé en rejouant cette liste. Annuler ou corriger revient à modifier la liste.

## Lancer l'application

```bash
npm install
npm run dev       # appli de développement sur http://localhost:5173
npm run build     # version optimisée dans dist/
npm run preview   # sert dist/ sur http://localhost:4173
```

Sous Windows, utiliser PowerShell (pas PowerShell ISE) et `npm.cmd` si l'exécution de scripts est bloquée.
Écran de référence : 1366 × 768, paysage, tactile.
