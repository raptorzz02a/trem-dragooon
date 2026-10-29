# TREM-DRAGOOON

Application de comptage de points aux fléchettes, en ligne : sur la borne tactile (PC Windows 1366 × 768), un PC
13 pouces ou un téléphone, sur la même cible ou chacun chez soi, avec un compte et des stats communs.

Adresse : https://trem-dragooon.julien-charrier01.workers.dev · détails dans `docs/en-ligne.md`.

Modes : 301 / 501 / 701, Cricket, Horloge, Chiffre aléatoire. De 1 à 10 joueurs, en individuel ou en équipes.

## Développement

```bash
npm install
npm test          # tests automatiques
npm run typecheck # vérification TypeScript
```

## Organisation du code

| Dossier | Rôle |
| --- | --- |
| `src/game-engine` | Règles des 6 modes, calcul des scores et des vainqueurs, suggestions de finition. Indépendant de l'interface. |
| `src/game-session` | Déroulement d'une partie : états, lancers, annulation, corrections, abandon, revanche. |
| `src/teams` | Composition des équipes, tirage au sort, ordre de passage, couleurs. |
| `src/profiles` | Profils joueurs, statistiques par mode et classements, recalculés à partir des parties archivées. |
| `src/game-setup` | Réglages d'une partie (jeu, options, équipes, ordre), partagés par l'appli et le serveur. |
| `src/storage` | Anciennes données de la borne (IndexedDB), lues une fois pour reprendre les stats. |
| `src/ui` | Écrans (connexion, accueil, salle d'attente et réglages, jeu, classements) ; `src/ui/modes` contient ce qui diffère d'un mode à l'autre à l'écran. |
| `src/online` | Parties à code, comptes, arbitrage par le serveur, connexion. Voir `docs/en-ligne.md`. |
| `src/light` | Effets lumineux : repère triple, Bull, double, raté, bust et victoire, et les envoie au pont de l'ampoule. |
| `bridge` | Pont local de l'ampoule Yeelight, lancé sur le PC de la borne. Voir `docs/ampoule.md`. |
| `server` | Serveur Cloudflare (Worker + Durable Objects) qui sert l'appli et les salons en ligne. |
| `docs/regles.md` | Règles exactes appliquées par le moteur. |
| `docs/guide-utilisateur.md` | Guide utilisateur (livrable 05). |
| `docs/technique.md` | Documentation technique : architecture, installation, kiosque, données, mise à jour (livrable 06). |
| `docs/recette.md` | Procès-verbal de recette (livrable 07). |
| `docs/en-ligne.md` | Jouer en ligne : même cible ou à distance, comptes, reprise des stats de la borne, mise à jour du serveur. |
| `scripts/recette-en-ligne.cjs` | Recette automatisée (borne, téléphone, PC 13 pouces). |

Le moteur ne stocke que la configuration et la liste des lancers ; tout le reste (scores, vainqueur, classement)
est recalculé en rejouant cette liste. Annuler ou corriger revient à modifier la liste.

Chaque partie terminée est archivée (une partie arrêtée par l'hôte est supprimée, sans archive) telle quelle sur le serveur, pour tous ses joueurs. Les
statistiques et classements sont recalculés à partir de ces archives : seules les parties terminées hors
entraînement comptent dans les victoires et les classements (5 parties minimum pour être classé).

## Lancer l'application

```bash
npm install
npm run online:dev  # appli + serveur en local sur http://localhost:8787
npm run build       # version optimisée dans dist/
npm run deploy      # met en ligne sur Cloudflare
```

Sous Windows, utiliser PowerShell (pas PowerShell ISE) et `npm.cmd` si l'exécution de scripts est bloquée.
Écran de référence : 1366 × 768, paysage, tactile.
