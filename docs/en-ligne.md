# Jouer en ligne

Depuis la version « tout en ligne », l'appli n'a plus de profils propres à la borne : chaque joueur a un
compte en ligne (pseudo + mot de passe) et toutes les parties sont enregistrées sur le serveur. On a donc le
même compte et les mêmes stats que l'on joue ensemble sur la même cible ou chacun chez soi.

Adresse : https://trem-dragooon.julien-charrier01.workers.dev (borne, PC ou téléphone).

| Salle d'attente sur la borne (même cible) | Suivi sur un téléphone | À distance sur un PC 13 pouces |
| --- | --- | --- |
| ![](images/en-ligne/1-salle-attente-borne.png) | ![](images/en-ligne/2-cricket-telephone.png) | ![](images/en-ligne/3-aleatoire-pc13.png) |

## Deux façons de jouer

| | Même cible | En ligne |
| --- | --- | --- |
| Qui saisit | L'appareil qui a créé la partie (la borne) saisit pour tout le monde | Chacun saisit ses fléchettes sur son appareil, à son tour |
| Ajouter les joueurs | Sur la borne : **＋ Ajouter un joueur**, choisir son pseudo et taper son mot de passe, ou **Nouveau joueur** pour créer un compte sur place | Chacun rejoint avec le code ou le lien partagé |
| Téléphones | Peuvent rejoindre avec le code pour suivre les scores, sans saisir | Indispensables : c'est là qu'on saisit |

Le lieu se choisit sur l'accueil (il est retenu sur l'appareil) et peut être changé dans la salle d'attente.
Le compte connecté sur l'appareil est l'hôte. Sur la borne, s'il ne joue pas, **Je ne joue pas** le retire de
la partie sans le déconnecter.

## Déroulement

1. Se connecter (ou **Créer un compte**, puis choisir son avatar). Le compte reste connecté sur l'appareil.
2. Choisir **Même cible** ou **En ligne** (chacun chez soi : **Créer** ou **Rejoindre** avec le code), puis le jeu : 301 · 501 · 701, Cricket, Horloge ou Shanghai.
3. Dans la salle d'attente, l'hôte règle la partie comme sur l'ancienne borne : score de départ, sortie,
   variantes de chaque jeu, individuel ou équipes (tirage au sort ou à la main), ordre de passage (tiré au
   sort ou ordre de la liste, modifiable avec ▲ ▼). Seul, c'est une partie d'entraînement.
4. **Lancer la partie**. Annuler une fléchette : l'hôte peut toujours ; à distance, le joueur peut aussi
   annuler la sienne.
5. **Quitter** : l'hôte peut **Arrêter la partie** (elle compte comme abandonnée dans les stats). En fin de
   partie : **Rejouer** ou **Changer les réglages**.

Coupure réseau : l'appli se reconnecte seule. Page fermée ou rechargée : l'accueil propose **Reprendre la
partie**. Si l'hôte part, le joueur suivant devient hôte. Une partie sans activité est effacée au bout de
12 heures.

## Comptes et statistiques

Pseudo unique (sans tenir compte des majuscules), mot de passe d'au moins 6 caractères. Chaque partie
terminée ou arrêtée est enregistrée pour tous ses joueurs, quel que soit l'appareil. **Joueurs et
classements** montre les classements et les fiches de tout le monde.

Sécurité : seule une empreinte du mot de passe est stockée (PBKDF2-SHA256, 100 000 tours, sel par compte).
Après 10 essais ratés, le pseudo est bloqué 15 minutes, y compris quand on l'ajoute sur la borne. Pas
d'e-mail, donc pas de « mot de passe oublié » : c'est l'administrateur qui donne un mot de passe provisoire
(voir ci-dessous). Chacun change son mot de passe depuis l'accueil (**Mot de passe**) ; ses autres appareils
sont alors déconnectés.

## Saloons (groupes d'amis)

Un **saloon** est un groupe d'amis, sur le modèle des serveurs Discord. L'accueil ouvre le dernier saloon
utilisé ; on en change avec la colonne d'icônes à gauche (PC) ou le menu sous son pseudo (téléphone).
L'interface prend la couleur du saloon ouvert.

- **TREM-DRAGOOON** est le saloon public : tout compte en est membre, sans mot de passe, et ne peut pas le
  quitter. Les parties d'avant les saloons lui appartiennent.
- **+** : créer un saloon (nom unique, mot de passe d'au moins 4 caractères, couleur, icône ; 3 saloons créés
  au plus par compte) ou en rejoindre un avec son nom et son mot de passe (une seule fois : on reste membre).
  5 essais ratés bloquent ce compte 15 minutes pour ce saloon. 50 membres au plus.
- **Lien d'invitation** (bouton « membres · Inviter », pour le propriétaire et les admins) : il fait entrer
  directement, sans mot de passe, y compris un joueur qui doit d'abord créer son compte. **Nouveau lien**
  rend l'ancien inutilisable.
- **Quitter le saloon** : ses parties restent. Si le propriétaire s'en va, l'admin le plus ancien (à défaut
  le membre le plus ancien) devient propriétaire ; un saloon vide est effacé.
- **Rôles** (bouton « membres » puis onglets Membres / Réglages) : le **propriétaire** nomme ou retire les
  admins, donne la propriété (il reste admin), exclut ou bannit n'importe quel membre et supprime le saloon
  (en retapant son nom) ; un **admin** exclut ou bannit les simples membres, change le nom, le mot de passe
  (les membres restent membres), la couleur et l'icône, et lève un bannissement. Un banni ne peut plus
  revenir, ni par mot de passe ni par lien. Les stats et les mots de passe des comptes restent du ressort de
  l'administrateur de l'appli.
- L'administrateur de l'appli voit tous les saloons dans **Administration** et peut tout y faire (membres,
  réglages, suppression).
- Plusieurs parties peuvent se jouer en même temps, dans un saloon comme dans des saloons différents :
  chaque partie a sa salle et son code.
- **Parties d'un saloon** : seuls ses membres y jouent (un compte non membre est refusé, même avec le
  code ; un **Nouveau joueur** créé sur l'appareil de l'hôte entre dans le saloon). L'accueil du saloon
  liste les **Parties en cours** (sans leur code) : on peut les **Regarder** en spectateur, l'hôte et les
  joueurs voient l'œil et le nombre de spectateurs. Pour jouer, il faut toujours le code. Un point vert
  sur l'icône du saloon signale une partie lancée.
- **Réglages par défaut** : dans la salle d'attente, l'hôte admin du saloon (pour le saloon public :
  l'administrateur de l'appli) peut garder les réglages pour les prochaines parties du saloon ; le mode
  reste celui choisi à l'accueil.
- **Borne** : menu du joueur, « Fixer ce saloon sur cet appareil » : la borne s'ouvre toujours sur ce
  saloon, sans sélecteur (réglage de l'appareil, à défaire par le même menu).
- Les liens de partage d'une partie sont maintenant `?partie=CODE` (les anciens `?salon=CODE` marchent encore).
- Une partie créée appartient au saloon ouvert à ce moment-là (champ `saloonId` des parties enregistrées).

Recettes : `node scripts/recette-saloons.cjs` et `node scripts/recette-saloons-parties.cjs`, avec
`npm run online:dev` lancé à côté.

## Espace administrateur

Le bouton **Administration** (accueil) n'apparaît que pour les pseudos listés dans `ADMINS`
(`server/wrangler.toml`, séparés par des virgules). Un pseudo administrateur est attaché pour de bon au
compte qui le porte : changer de pseudo ensuite ne donne pas l'accès à celui qui reprendrait l'ancien.
Retirer un pseudo de `ADMINS` (puis remettre en ligne) retire l'accès à son compte.

- liste de tous les comptes : date de création, date de dernière utilisation (connexion, ouverture de
  l'appli ou partie terminée, à 10 minutes près ; pour les comptes d'avant le suivi, dernière connexion
  connue), nombre de parties ;
- **Reset stats** : le compte est retiré de toutes ses parties, qui restent valables pour ses adversaires ;
- **Reset mot de passe** : crée un mot de passe provisoire (8 caractères) à transmettre au joueur, et
  déconnecte ses appareils ;
- **Supprimer** : le compte disparaît, ses parties restent pour les autres au nom « Joueur supprimé ».
  On ne peut pas supprimer son propre compte.

## Reprendre les stats de la borne

Les parties jouées avant le passage en ligne sont dans le navigateur de la borne. Pour les rattacher aux
comptes, une seule fois, sur la borne :

```powershell
cd $HOME\trem-dragooon
git pull
npm.cmd install
npm.cmd run build:borne   # même appli, qui parle au serveur en ligne
npm.cmd run preview       # http://localhost:4173, là où sont les anciennes données
```

Ouvrir http://localhost:4173, se connecter, puis **Récupérer les stats de la borne** : choisir son ancien
profil et valider. Chacun fait de même avec son compte (se déconnecter, se connecter avec le compte suivant).
Une partie jouée à plusieurs est rattachée à chaque compte qui récupère son profil ; recommencer ne crée pas
de doublon.

Ensuite, la borne peut ouvrir directement l'adresse en ligne (voir `technique.md`, configuration kiosque) :
plus besoin de serveur local.

## Fonctionnement technique

| Élément | Rôle |
| --- | --- |
| `src/game-setup/setup.ts` | Réglages d'une partie (jeu, options, équipes, ordre), validés de la même façon par l'appli et le serveur. |
| `src/online/protocol.ts` | Messages échangés (JSON sur WebSocket), codes de partie. |
| `src/online/room.ts` | Règles d'une partie : arrivée, joueurs ajoutés sur place, hôte, lancement, qui peut saisir. Pur et testé (`room.test.ts`). |
| `src/online/useOnlineRoom.ts`, `api.ts` | Connexion de l'appli au serveur, reconnexion automatique, adresse du serveur. |
| `src/ui/screens/Room.tsx`, `Setup.tsx` | Salle d'attente, réglages, ajout des joueurs ; la partie réutilise l'écran de jeu. |
| `src/ui/screens/ImportLocal.tsx` | Reprise des stats de la borne. |
| `server/worker.ts` | Cloudflare Worker : sert l'appli et l'API. Un Durable Object par code garde l'état de la partie. |
| `server/accounts.ts` | Comptes et parties : un Durable Object unique stocké en SQLite (inclus dans l'offre gratuite). |
| `scripts/recette-en-ligne.cjs` | Recette automatisée : borne, téléphone et PC 13 pouces. |

Le serveur applique le même moteur que l'appli : il rejoue chaque fléchette reçue et refuse celles qui ne
viennent pas du bon appareil. L'appli ne fait qu'afficher l'état qu'il renvoie.

`npm run build:borne` lit `.env.borne`, qui donne l'adresse du serveur (`VITE_API_URL`) ; le serveur
accepte les appels venant de http://localhost:4173.

## Essayer en local

```bash
npm install
npm run online:dev                         # construit l'appli et lance le serveur sur http://localhost:8787
node scripts/recette-en-ligne.cjs          # dans un autre terminal (Playwright requis)
```

Sous Windows : `npm.cmd run online:dev`.

## Mettre à jour le serveur

```bash
npm run deploy
```

Il faut être connecté à Cloudflare (`npx wrangler login`, ou la variable `CLOUDFLARE_API_TOKEN`). L'offre
gratuite couvre largement un groupe d'amis (100 000 requêtes par jour, Durable Objects inclus).
