# Tableau de scores sur iPad

Une vieille tablette (iPad 2 ou 4, iOS 9 ou 10) fixée au-dessus de la cible affiche le score de la partie en cours de la borne, en style « Bar LED » (afficheurs 7 segments), avec des animations pour les 100+, 140+, 180, les BUST et la victoire. Une fois installée, on n'y touche plus : elle suit toute seule les parties du compte auquel elle est reliée.

## Installation (une seule fois, avant de fixer la tablette)

1. Sur l'iPad, ouvrir Safari à l'adresse de l'appli suivie de `/tableau.html` (ex. `https://trem-dragooon.….workers.dev/tableau.html`).
2. La tablette affiche un **code à 4 chiffres**.
3. Sur la borne : menu du compte (avatar en haut) › **Tableau iPad**, taper le code, **Relier**. La tablette passe sur « En attente d'une partie ».
4. Sur l'iPad :
   - Partager › **Sur l'écran d'accueil** : la page s'ouvre ensuite en plein écran, sans barre Safari. L'ouvrir depuis cette icône (il faudra peut-être refaire l'étape 3, l'icône ayant sa propre mémoire).
   - Réglages › Luminosité (ou Général) › **Verrouillage auto : Jamais**.
   - Réglages › Général › Accessibilité › **Accès guidé** : activé ; triple-clic sur le bouton principal une fois la page ouverte, pour la bloquer.
   - Laisser le chargeur branché.

Si la page affiche une erreur de certificat sur un iPad 2 (iOS 9 ne connaît pas tous les certificats récents), le dire : la page peut alors être servie par la borne sur le réseau local.

## Pendant les parties

- La tablette repère la partie en cours du compte (joueur ou hôte, saloon quelconque) et s'y branche en spectatrice, sans compter dans « spectateurs ».
- Écran unique : en haut le joueur qui lance (nom, moyenne, volée en cours, reste en grand) ; en bas à gauche l'**out proposé** (X01) ; en bas à droite les autres joueurs (4 lettres, reste, moyenne), 2 par ligne (3 au-delà de 6).
- Animations : 100+ (vert), 140+ (ambre), 180 (rouge, stroboscope), avec le score en toutes lettres en anglais (« one hundred and forty-two ») ; **BUST** (score remis) ; **victoire** (nom, finish, fléchettes, meilleure volée, checkout), affichée 20 s après la fin, même si la borne revient au salon (seule une nouvelle partie lancée l’interrompt).
- Revanche ou nouvelle partie : la tablette bascule seule. Sans partie : écran d'attente, assombri si l'option est active.

## Réglages depuis la borne (menu › Tableau iPad)

- **Animations** oui/non, **Atténuer hors partie** oui/non.
- **Recharger** : la tablette se recharge sous 10 secondes (après une mise à jour de l'appli, par exemple).
- **Délier** : la tablette oublie le compte et affiche un nouveau code.

Limite : si l'iPad s'éteint complètement, iOS ne rouvre pas la page tout seul au démarrage ; il faut la rouvrir une fois.

## Technique

- Page : `public/tableau.html`, autonome, en ES5 (pas de framework, `XMLHttpRequest`, pas de grille CSS) pour Safari 9/10. Elle garde un secret dans `localStorage`.
- Le serveur calcule l'affichage (`src/online/display.ts`, `boardView`) et l'envoie déjà prêt : la tablette n'embarque pas le moteur du jeu.
- API : `POST /api/display/pair` (nouveau secret + code), `GET /api/display` (état, réglages, partie suivie ; 401 = déliée), WebSocket `GET /api/display/ws?secret=…` (messages `board`), secours `GET /api/display/board` interrogé toutes les 1,5 s si le WebSocket échoue trois fois. Côté borne : `GET/POST /api/displays`, `PUT/DELETE /api/displays/:id`.
- Tablettes stockées dans la table `displays` de la base des comptes ; code non relié oublié après 1 h ; 5 tablettes au plus par compte.
- La tablette interroge `GET /api/display` toutes les 10 s (4 s tant qu'elle n'est pas reliée), soit environ 8 600 requêtes par jour : compatible avec l'offre gratuite de Cloudflare.
- Recette : `npm run online:dev` puis `node scripts/recette-tableau.cjs`.
