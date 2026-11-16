# Réinstaller la borne sur un nouveau PC

Ce guide remonte tout le système sur un PC Windows neuf : l'appli TREM-DRAGOOON (en ligne), le pont de
l'ampoule Yeelight et la saisie par caméra Dart Sense. Le plus simple est l'installateur en un double-clic
(section 3, environ 20 minutes, surtout du téléchargement) ; les sections 4 à 9 font la même chose à la main.

Rien n'est stocké sur le PC lui-même : les comptes, les parties et les stats sont sur le serveur en ligne.
On ne perd donc rien en changeant de PC, il suffit de se reconnecter.

## 1. Ce que fait chaque morceau

| Morceau | Où il tourne | Sert à |
| --- | --- | --- |
| Appli TREM-DRAGOOON | En ligne : https://trem-dragooon.julien-charrier01.workers.dev, ouverte dans Edge | Le jeu, les comptes, les stats. Rien à installer. |
| Pont de l'ampoule (`bridge/pont-yeelight.mjs`) | Sur le PC, avec Node.js | Transmet les effets lumineux à l'ampoule Yeelight. Facultatif. |
| Dart Sense (`trem_sense.py` + modèle `weights.pt`) | Sur le PC, avec Python | Lit la caméra et saisit les fléchettes tout seul. Facultatif. |
| `trem-dragooon.bat` | Dossier de démarrage de Windows | Lance les deux ponts puis l'appli en plein écran à l'ouverture de session. |
| `mise-a-jour.bat` | Bureau | Récupère la dernière version (`git pull`) et recopie les scripts caméra dans Dart Sense. |
| `installer.bat` + `installer.ps1` | Dossier `borne` du dépôt, ou package zip | Installe tout sur un PC neuf (section 3). |

Sans pont ni Dart Sense, l'appli marche quand même : on saisit au pavé et il n'y a pas d'effets lumineux.

### Dossiers sur le PC

```
C:\Users\<compte>\trem-dragooon\        dépôt de la borne (git clone), avec bridge\, borne\, dart-sense\
C:\darts\dart-sense-main\                dépôt Dart Sense (weights.pt, get_scores.py)
    trem_sense.py, test_camera.py        copiés depuis trem-dragooon\dart-sense\
    .venv\                               environnement Python 3.11 (ultralytics, opencv-python, openvino)
    weights_openvino_model\              modèle accéléré, créé une fois
Dossier de démarrage (shell:startup)    trem-dragooon.bat (copie réglée : adresse de l'ampoule)
Bureau                                  Mise a jour TREM-DRAGOOON.bat
```

## 2. Prérequis

### Matériel

- PC **Windows 10 ou 11**, idéalement écran tactile 1366 × 768 (référence de l'appli). Un processeur récent
  compte pour Dart Sense : sans carte graphique, on obtient 2 à 3 images/s avec le modèle accéléré OpenVINO.
- **Connexion Internet** (l'appli est en ligne).
- **Caméra** : la Crosstour CT9000 branchée en **USB, mode « PC Camera »** (appuyer sur OK à la connexion
  pour choisir PC Camera), ou une webcam USB 1080p (Logitech C920/C922). Une ou deux caméras.
- Ampoule **Yeelight** (facultatif) avec le **Contrôle LAN** activé (appli Yeelight, réglages de l'ampoule),
  sur le même réseau que le PC.

### Logiciels à installer

| Logiciel | Version | Où le trouver | Remarque |
| --- | --- | --- | --- |
| **Python** | **3.11** (3.11.9 testé) | [python-3.11.9-amd64.exe](https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe) | Cocher **Add python.exe to PATH**. Éviter 3.13 et plus : PyTorch et OpenVINO y sont moins bien suivis. |
| **Node.js** | 20 LTS ou plus | [nodejs.org/fr/download](https://nodejs.org/fr/download) : installeur « LTS » | Seulement pour le pont de l'ampoule : inutile sans ampoule. |
| **Git** | récent | [git-scm.com/download/win](https://git-scm.com/download/win) | Pour récupérer le dossier de la borne et le mettre à jour. Sinon, télécharger le ZIP depuis GitHub. |
| **Microsoft Edge** | déjà dans Windows | [microsoft.com/fr-fr/edge/download](https://www.microsoft.com/fr-fr/edge/download) | Le `.bat` ouvre l'appli avec Edge. |

L'installateur de la section 3 installe lui-même Git, Python 3.11 et Node.js s'ils manquent (avec `winget`,
présent dans Windows 10 et 11).

Paquets Python (installés à l'étape 5, dans un environnement à part) :

| Paquet | Sert à |
| --- | --- |
| `ultralytics` (dernière version) | Le modèle YOLO de Dart Sense. Installe aussi PyTorch, NumPy et Pillow. |
| `opencv-python` | La lecture de la caméra et la fenêtre de contrôle. |
| `openvino` | Le modèle accéléré (environ 3 fois plus d'images/s). Le `.bat` l'installe tout seul s'il manque. |

Ne pas installer `requirements.txt` du dépôt Dart Sense : c'est un export conda qui ne s'installe pas avec pip.
Ne pas garder une vieille `ultralytics` 8.2.x : elle plante avec les PyTorch récents.

Tout se tape dans **PowerShell** (menu Démarrer, « PowerShell », pas « PowerShell ISE »). Si PowerShell
refuse `npm`, taper `npm.cmd`.

## 3. Installation en un double-clic

1. Copier le dossier du package (`trem-dragooon-installation`) sur le PC, ou prendre `borne\` dans le dépôt.
2. Double-cliquer sur **`installer.bat`**. Si Windows affiche « Windows a protégé votre ordinateur » :
   **Informations complémentaires**, puis **Exécuter quand même**.
3. Répondre aux deux questions : ampoule Yeelight ou non, et son adresse IP (Entrée = recherche automatique).
4. Laisser faire. Si Windows demande l'autorisation d'installer Git, Python ou Node : **Oui**.

L'installateur, dans l'ordre :

| Étape | Ce qu'il fait |
| --- | --- |
| 1 | Vérifie Git, Python 3.11, Node.js (seulement avec une ampoule) et Edge ; installe ceux qui manquent avec winget. |
| 2 | Télécharge le dépôt de la borne dans `C:\Users\<compte>\trem-dragooon` (ou le met à jour s'il est déjà là). |
| 3 | Télécharge Dart Sense dans `C:\darts\dart-sense-main` et y copie `trem_sense.py` et `test_camera.py`. |
| 4 | Crée l'environnement Python `.venv` et installe `ultralytics`, `opencv-python`, `openvino`. |
| 5 | Prépare le modèle accéléré OpenVINO. |
| 6 | Place `trem-dragooon.bat` dans le dossier de démarrage, réglé pour l'ampoule (ou sans pont s'il n'y en a pas), et `Mise a jour TREM-DRAGOOON.bat` sur le Bureau. |
| 7 | Propose de lancer la borne tout de suite. |

On peut le relancer sans risque : ce qui est déjà fait est sauté. Si Git, Python ou Node vient d'être installé
et n'est « pas encore visible », fermer la fenêtre et relancer `installer.bat`.

Ensuite : brancher la caméra (section 6, essai) et coupler avec l'appli (section 9).

## 4. Installation à la main : dossier de la borne

```powershell
cd $HOME
git clone https://github.com/raptorzz02a/trem-dragooon.git
```

Le dossier arrive dans `C:\Users\<compte>\trem-dragooon`. C'est là que le `.bat` cherche le pont de
l'ampoule. Pas besoin de `npm install` sur la borne : le pont n'a aucune dépendance.

Pour les mises à jour plus tard : `mise-a-jour.bat` (section 10).

## 5. Installer Dart Sense

1. **Télécharger Dart Sense** : [github.com/bnww/dart-sense](https://github.com/bnww/dart-sense), bouton
   **Code**, **Download ZIP**. Extraire dans `C:\darts\` pour obtenir `C:\darts\dart-sense-main\`, avec
   `weights.pt` et `get_scores.py` dedans. (Un autre dossier marche aussi, il faudra alors l'indiquer dans le
   `.bat`.)

2. **Copier les scripts de la borne** dans ce dossier :

   ```powershell
   copy $HOME\trem-dragooon\dart-sense\trem_sense.py C:\darts\dart-sense-main\
   copy $HOME\trem-dragooon\dart-sense\test_camera.py C:\darts\dart-sense-main\
   ```

3. **Créer l'environnement Python et installer les paquets** :

   ```powershell
   cd C:\darts\dart-sense-main
   py -3.11 -m venv .venv
   .venv\Scripts\python -m pip install --upgrade pip
   .venv\Scripts\python -m pip install ultralytics opencv-python openvino
   ```

   Le téléchargement de PyTorch prend plusieurs minutes. Le `.bat` repère tout seul le Python de `.venv`.

4. **Préparer le modèle accéléré** (facultatif, le `.bat` le fait au premier lancement s'il manque) :

   ```powershell
   .venv\Scripts\python -c "from ultralytics import YOLO; YOLO('weights.pt').export(format='openvino', imgsz=800)"
   ```

   Un dossier `weights_openvino_model` apparaît à côté de `weights.pt`.

## 6. Brancher et vérifier la caméra

1. Brancher la caméra en USB (Crosstour : mode **PC Camera**).
2. Lister les caméras vues par Windows :

   ```powershell
   cd C:\darts\dart-sense-main
   .venv\Scripts\python test_camera.py
   ```

   Chaque caméra trouvée s'affiche avec sa définition, par exemple `OK   1  ->  image 1920x1080`. La webcam
   intégrée du PC est souvent la 0, la caméra de la cible la 1.
3. **Essai complet**, cible visible :

   ```powershell
   .venv\Scripts\python trem_sense.py --camera auto --definition 1920x1080
   ```

   La console doit afficher `Webcam 1 : voit la cible`, puis
   `Dart Sense pret pour TREM-DRAGOOON : http://127.0.0.1:55445`. La fenêtre montre les points de calibration
   en vert et les fléchettes en orange. Planter une fléchette : elle s'écrit dans la console. `q` pour quitter.
   Si Windows demande d'autoriser Python sur le réseau : **réseaux privés**.

Placement : caméra à hauteur du centre de la cible, 20 à 40° sur le côté, à 40-60 cm, la cible remplissant
le carré central de l'image, éclairage blanc constant (anneau LED). Détails dans `docs/dart-sense.md`.

## 7. Pont de l'ampoule

```powershell
cd $HOME\trem-dragooon
node bridge\pont-yeelight.mjs
```

Il cherche l'ampoule et affiche `Pont prêt : ampoule 192.168.x.y`. Noter cette adresse : le `.bat` la donne
au pont (`--ip`). Pour qu'elle ne change pas, la réserver dans la box (bail DHCP fixe pour l'ampoule).
Si Windows demande d'autoriser Node sur le réseau : **réseaux privés**. `Ctrl+C` pour arrêter.

## 8. Démarrage automatique

1. Copier `borne\trem-dragooon.bat` du dossier de la borne dans le dossier de démarrage : `Windows + R`, taper
   `shell:startup`, Entrée, puis coller le fichier dans la fenêtre qui s'ouvre.
2. L'ouvrir avec le Bloc-notes (clic droit, **Modifier**) et vérifier les lignes du haut :

   | Ligne | Valeur par défaut | À changer si |
   | --- | --- | --- |
   | `set APPLI=` | `%USERPROFILE%\trem-dragooon` | le dépôt a été cloné ailleurs |
   | `set DARTSENSE=` | `C:\darts\dart-sense-main` | Dart Sense est dans un autre dossier |
   | `set CAMERA=` | `auto` | une caméra précise est voulue (`1`, ou `1,2` pour deux) |
   | `set DEFINITION=` | `1920x1080` | la caméra ne fait pas de 1080p |
   | `--ip 192.168.1.10` (étape 1 du fichier) | adresse de l'ampoule | l'ampoule a une autre adresse ; sans ampoule, supprimer la ligne `start "Pont lumiere"` |

3. Double-cliquer sur le `.bat` pour l'essayer. Il :
   - passe le PC en mode performances ;
   - lance le pont de l'ampoule (fenêtre « Pont lumiere », réduite) ;
   - prépare le modèle OpenVINO s'il manque, puis lance Dart Sense en priorité haute (fenêtre « Pont Dart Sense ») ;
   - ouvre l'appli dans Edge en plein écran avec `?ampoule=1&camera=1`.

## 9. Coupler avec l'appli en ligne

1. Dans l'appli ouverte par le `.bat`, **se connecter** avec son compte (pseudo et mot de passe habituels).
   La session reste ouverte sur ce PC tant qu'on ne se déconnecte pas.
2. Au premier usage, Edge peut demander d'**autoriser l'accès aux appareils du réseau local** : répondre
   **Autoriser**. C'est ce qui laisse l'appli parler aux deux ponts du PC.
3. `camera=1` et `ampoule=1` dans le lien activent la caméra et l'ampoule sur ce PC. Sans le `.bat`, on les
   active dans le menu du compte : **Activer la caméra Dart Sense** et **Activer l'ampoule de la borne** (un
   flash doré confirme que le pont répond).

Pas d'import de stats à refaire : la reprise des stats de l'ancienne borne a déjà été faite, tout est sur le
serveur.

## 10. Mettre à jour la borne

Double-cliquer sur **Mise a jour TREM-DRAGOOON** (Bureau ; sinon `borne\mise-a-jour.bat` du dépôt). Il fait
`git pull`, affiche les nouveautés et recopie `trem_sense.py` et `test_camera.py` dans le dossier de Dart
Sense. Fermer ensuite les fenêtres « Pont lumiere » et « Pont Dart Sense » et relancer `trem-dragooon.bat`
(ou redémarrer le PC). L'appli elle-même est en ligne : elle se met à jour toute seule.

## 11. Vérifications

- [ ] L'appli s'ouvre en plein écran et le compte est connecté.
- [ ] Menu du compte : **Activer l'ampoule de la borne** donne un flash doré.
- [ ] Une partie lancée : le bouton **📷** est vert (**📷 Caméra**).
- [ ] Une fléchette plantée est saisie toute seule pour le joueur dont c'est le tour.
- [ ] Les fléchettes retirées terminent la volée.
- [ ] Un triple déclenche l'effet de l'ampoule.
- [ ] Fenêtre Dart Sense : 2 images/s ou plus (sinon vérifier que `weights_openvino_model` existe et que le PC
      est sur secteur).
- [ ] Après redémarrage du PC, tout se relance seul à l'ouverture de session.

## 12. Dépannage rapide

| Symptôme | Cause probable | Que faire |
| --- | --- | --- |
| **📷 Caméra éteinte** (rouge) | Dart Sense n'est pas lancé ou s'est arrêté | Regarder la fenêtre « Pont Dart Sense » : erreur Python, ou `Plus d image de la camera … depuis 10 s` (câble, mode PC Camera). Relancer le `.bat`. |
| `No module named ultralytics` / `cv2` | Paquets installés dans un autre Python | Refaire l'étape 5.3 dans `.venv`. |
| `py` introuvable | Python pas installé, ou pas dans le PATH | Réinstaller Python 3.11 en cochant **Add python.exe to PATH**. |
| `Aucune camera ne voit la cible` | Mauvais cadrage, ou caméra en mode stockage | `test_camera.py`, recadrer, puis forcer `CAMERA=1`. |
| **📷 Cible non repérée** (orange) | Cible trop petite, mal éclairée ou masquée | La cible doit remplir le carré central. Allumer l'anneau LED. |
| « Pont de l'ampoule injoignable » | Fenêtre « Pont lumiere » fermée, ou mauvaise IP | Relancer le `.bat`, vérifier `--ip` et le Contrôle LAN. |
| `node` introuvable | Node.js pas installé | Installer Node.js LTS puis rouvrir PowerShell. |
| Edge ne parle pas aux ponts | Accès au réseau local refusé | Paramètres d'Edge, autorisations du site, autoriser **Appareils du réseau local**. |
| Très peu d'images/s | Modèle non accéléré ou PC en économie d'énergie | Étape 5.4, brancher le secteur. |
