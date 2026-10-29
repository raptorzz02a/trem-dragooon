# Ampoule Yeelight sur la borne

La borne peut piloter une ampoule Yeelight (testé pour la Color 1S) pendant les parties :

| Moment | Effet |
| --- | --- |
| Triple, Bull 25 ou 50 | Stroboscope multicolore (environ 2 s) |
| Double | Vague de couleurs (environ 2,5 s) |
| Raté, bust | Rouge pendant 1 seconde |
| Victoire | Dix flashs à la couleur de l'équipe gagnante (ou du joueur), puis cette couleur 4 s |

Après l'effet, l'ampoule reprend la couleur et la luminosité qu'elle avait. Si elle était éteinte, elle
s'allume pour l'effet puis se rééteint. Un nouvel effet remplace celui en cours.

## Pourquoi un pont

L'appli est une page web : un navigateur ne peut pas parler directement à l'ampoule, qui se pilote en TCP
sur le réseau local (port 55443). Un petit programme, `bridge/pont-yeelight.mjs`, tourne donc sur le PC de la
borne. L'appli lui envoie l'effet sur `http://127.0.0.1:55444`, et lui le transmet à l'ampoule. Il n'écoute que
ce PC, et il n'accepte que l'appli en ligne (et `localhost` pour les tests). Il n'a aucune dépendance : Node
18 ou plus suffit.

Les effets partent de l'appareil où l'ampoule est activée, quelle que soit la personne qui saisit : sur une
partie « Même cible », la borne affiche la partie, donc les tirs saisis depuis un téléphone déclenchent aussi
l'ampoule. La borne qui regarde une partie (spectateur) les déclenche aussi.

## Installation (une fois)

1. **Appli Yeelight** sur le téléphone : ouvrir l'ampoule, puis le menu des réglages, et activer
   **Contrôle LAN** (« LAN Control »). L'ampoule doit être sur le même wifi que la borne.
2. **Mettre à jour le dossier de la borne** dans PowerShell :

   ```powershell
   cd $HOME\trem-dragooon
   git pull
   npm.cmd run pont
   ```

   Le pont cherche l'ampoule tout seul et affiche `Pont prêt : ampoule 192.168.x.y`. Si Windows demande
   d'autoriser Node sur le réseau, accepter pour les **réseaux privés**. Si l'ampoule n'est pas trouvée,
   donner son adresse IP (visible dans l'appli Yeelight, informations de l'appareil) :
   `node bridge\pont-yeelight.mjs --ip 192.168.1.42`.
3. **Démarrage automatique** : remplacer le contenu de `trem-dragooon.bat` (dossier `shell:startup`) par :

   ```bat
   cd /d "%USERPROFILE%\trem-dragooon"
   start "Pont ampoule" /min node bridge\pont-yeelight.mjs
   start "" msedge --app=https://trem-dragooon.julien-charrier01.workers.dev/?ampoule=1 --start-fullscreen --no-first-run
   ```

   `?ampoule=1` active l'ampoule sur cet appareil. On peut aussi l'activer ou la couper dans le menu du
   compte : **Activer l'ampoule de la borne** (un flash doré confirme que le pont répond).
4. **Première partie** : Edge peut demander d'autoriser l'accès aux appareils du réseau local. Répondre
   **Autoriser**, une seule fois.

## Dépannage

- Pas d'effet et le menu affiche « Pont de l'ampoule injoignable » : la fenêtre « Pont ampoule » n'est pas
  ouverte. Relancer le `.bat` ou `npm.cmd run pont`.
- Le pont écrit `Ampoule : …` : il n'arrive pas à joindre l'ampoule. Vérifier le Contrôle LAN et l'adresse IP.
  Le plus simple est de fixer l'adresse de l'ampoule dans la box (bail DHCP) et de lancer le pont avec `--ip`.
- L'ampoule accepte environ 60 commandes par minute. Une partie normale en envoie bien moins.
- Recette sans ampoule : `npm run recette:ampoule` (fausse ampoule, vérifie le pont de bout en bout).
