@echo off
rem === TREM-DRAGOOON : demarrage de la borne ===
rem A adapter si besoin : dossier de Dart Sense, cameras (auto = celles qui voient la cible, une ou deux ; ou 1 ; ou 1,2), definition.
set APPLI=%USERPROFILE%\trem-dragooon
set DARTSENSE=C:\darts\dart-sense-main
set CAMERA=auto
set DEFINITION=1920x1080

rem 0. PC en mode performances (plus d'images/s pour Dart Sense)
powercfg /setactive SCHEME_MIN >nul 2>&1

rem 1. Pont lumiere (ampoule Yeelight)
cd /d "%APPLI%"
start "Pont lumiere" /min node bridge\pont-yeelight.mjs --ip 192.168.1.10

rem 2. Pont Dart Sense (camera)
rem Python de l'environnement de Dart Sense (.venv ou venv), sinon celui de Windows
set PY=python
if exist "%DARTSENSE%\venv\Scripts\python.exe" set PY="%DARTSENSE%\venv\Scripts\python.exe"
if exist "%DARTSENSE%\.venv\Scripts\python.exe" set PY="%DARTSENSE%\.venv\Scripts\python.exe"
cd /d "%DARTSENSE%"
rem Modele accelere OpenVINO (environ 3 fois plus rapide) : cree une seule fois s'il manque
if not exist "%DARTSENSE%\weights_openvino_model" (
  echo Preparation du modele accelere OpenVINO, une seule fois...
  %PY% -m pip install -q openvino
  %PY% -c "from ultralytics import YOLO; YOLO('weights.pt').export(format='openvino', imgsz=800)"
)
set MODELE=weights.pt
if exist "%DARTSENSE%\weights_openvino_model" set MODELE=weights_openvino_model
rem Priorite haute : Windows donne la main a Dart Sense en premier
start "Pont Dart Sense" /min /high cmd /k %PY% trem_sense.py --camera %CAMERA% --modele %MODELE% --definition %DEFINITION%

rem 3. L'appli, avec l'eclairage et la camera actives (elle se reconnecte toute seule quand Dart Sense est pret)
timeout /t 5 /nobreak >nul
start "" msedge --app="https://trem-dragooon.julien-charrier01.workers.dev/?ampoule=1&camera=1" --start-fullscreen --no-first-run
