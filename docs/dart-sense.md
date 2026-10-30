# Saisie automatique par caméra (Dart Sense)

Avec une caméra devant la cible, Dart Sense repère chaque fléchette plantée et l'appli la saisit toute seule,
comme un appui sur le pavé. Les effets de l'ampoule, les sons et les stats suivent comme d'habitude.

| Ce que voit la caméra | Ce que fait l'appli |
| --- | --- |
| Une fléchette se plante | Elle est saisie pour le joueur dont c'est le tour (T20, D16, Bull 25/50…) |
| On retire les fléchettes | La volée est terminée : les fléchettes pas vues (tombées, hors cible) comptent comme ratées |
| Bust ou victoire en cours de volée | La volée s'arrête là : les fléchettes suivantes ne passent pas au joueur d'après |
| La cible n'est plus repérée (quelqu'un devant) | Rien n'est compté, pas de faux retrait |

Le pavé, **Annuler la fléchette** et **Fin de tour** restent disponibles pour corriger une erreur de lecture.
Si aucune fléchette n'est restée dans la cible, la caméra ne voit rien à retirer : terminer la volée à la main
(**Raté** ou **Fin de tour**).

Sur l'écran de jeu, le bouton **📷** montre l'état de la caméra :

- **📷 Caméra** (vert) : tout va bien ;
- **📷 Cible non repérée** (orange) : la caméra tourne mais ne voit pas la cible (cadrage, quelqu'un devant) ;
- **📷 Caméra éteinte** (rouge) : Dart Sense n'est pas lancé sur ce PC ;
- un appui passe en **📷 Saisie manuelle** (la caméra est ignorée pour cette partie), un autre la réactive.

Ça marche en « Même cible » comme en « En ligne » : chaque PC équipé d'une caméra saisit les fléchettes du
joueur qui lance chez lui, quand c'est son tour.

## Comment ça marche

`dart-sense/trem_sense.py` remplace l'interface de Dart Sense (`GUI.py`) : il lit la caméra, utilise le modèle
de Dart Sense (`weights.pt`) et sert les fléchettes sur `http://127.0.0.1:55445`, joignable seulement depuis ce
PC. L'appli, ouverte sur ce même PC, l'interroge en continu. Le serveur Cloudflare n'est pas concerné.

Une fléchette compte quand elle est vue au même endroit sur 3 des 5 dernières images (la règle de Dart Sense).
Le retrait : plus aucune fléchette sur 3 des 5 dernières images. Plus la caméra va vite (images/s affichées
dans la fenêtre), plus la saisie est rapide.

## Installation (une fois)

1. **Mettre à jour la borne** dans PowerShell : `cd $HOME\trem-dragooon` puis `git pull`.
2. **Copier le script dans le dossier de Dart Sense** (celui où il y a `weights.pt` et `get_scores.py`) :

   ```powershell
   copy $HOME\trem-dragooon\dart-sense\trem_sense.py <dossier de Dart Sense>
   ```

3. **Essai** depuis le dossier de Dart Sense, environnement Python activé (`.venv\Scripts\activate`, ou le nom de ton environnement) :

   ```powershell
   python trem_sense.py --camera 1
   ```

   `--camera` prend le numéro de la webcam (comme pour Dart Sense : 1 pour la Crosstour en USB), une adresse
   IP Webcam (`192.168.1.20:8080`) ou une adresse complète (`rtsp://…`). Une fenêtre montre ce que voit le
   modèle : points de calibration en vert, fléchettes en orange, et en rouge les fléchettes de la volée en
   cours. `q` dans la fenêtre pour quitter, `--sans-fenetre` pour s'en passer. Chaque fléchette s'écrit aussi
   dans la console. Si Windows demande d'autoriser Python sur le réseau : réseaux **privés**.
4. **Activer la caméra dans l'appli** : menu du compte, **Activer la caméra Dart Sense** (une seule fois sur ce
   PC). Ou ajouter `camera=1` au lien de lancement.
5. **Démarrage automatique** : dans `trem-dragooon.bat` (dossier `shell:startup`), ajouter la ligne de Dart
   Sense et `camera=1` au lien, par exemple avec l'ampoule :

   ```bat
   cd /d "%USERPROFILE%\trem-dragooon"
   start "Pont ampoule" /min node bridge\pont-yeelight.mjs
   start "Dart Sense" /min cmd /c "cd /d <dossier de Dart Sense> && .venv\Scripts\python trem_sense.py --camera 1"
   start "" msedge --app="https://trem-dragooon.julien-charrier01.workers.dev/?ampoule=1&camera=1" --start-fullscreen --no-first-run
   ```

6. **Première partie** : Edge peut demander d'autoriser l'accès aux appareils du réseau local. Répondre
   **Autoriser**, une seule fois.

## Dépannage

- **📷 Caméra éteinte** : la fenêtre « Dart Sense » n'est pas ouverte ou s'est arrêtée (message
  `Plus d image de la camera depuis 10 s` : câble, mode « PC Camera » de la Crosstour). La relancer : l'appli
  se reconnecte toute seule.
- **📷 Cible non repérée** en permanence : recadrer pour que la cible remplisse le carré central de l'image.
- Fléchette mal lue : **Annuler la fléchette** puis la saisir au pavé. La caméra ne la renvoie pas.
- Recette sans caméra : `python -m unittest test_trem_sense` dans `dart-sense\` (logique de volée et serveur),
  et `node scripts/recette-dart-sense.cjs` avec `npm run online:dev` lancé (appli de bout en bout, faux Dart Sense).
