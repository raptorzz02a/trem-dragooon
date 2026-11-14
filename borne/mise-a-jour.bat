@echo off
rem === TREM-DRAGOOON : mise a jour de la borne (git pull) ===
rem Double-cliquer dessus. Memes dossiers que trem-dragooon.bat, a adapter si besoin.
set APPLI=%USERPROFILE%\trem-dragooon
set DARTSENSE=C:\darts\dart-sense-main

title Mise a jour TREM-DRAGOOON
echo.
echo  Mise a jour de TREM-DRAGOOON
echo  Dossier : %APPLI%
echo.

where git >nul 2>&1
if errorlevel 1 (
  echo  [ERREUR] Git n'est pas installe : https://git-scm.com/download/win
  goto fin
)
if not exist "%APPLI%\.git" (
  echo  [ERREUR] Pas de depot Git dans %APPLI%
  echo  Faire d'abord : git clone https://github.com/raptorzz02a/trem-dragooon.git
  goto fin
)

cd /d "%APPLI%"
for /f %%i in ('git rev-parse --short HEAD') do set AVANT=%%i

git pull --ff-only
if errorlevel 1 (
  echo.
  echo  [ERREUR] La mise a jour a echoue.
  echo  Causes courantes : pas d'internet, ou des fichiers modifies a la main dans %APPLI%.
  echo  Fichiers modifies localement :
  git status --short
  goto fin
)

for /f %%i in ('git rev-parse --short HEAD') do set APRES=%%i
echo.
if "%AVANT%"=="%APRES%" (
  echo  [OK] Deja a jour, rien de nouveau.
  goto fin
)

echo  [OK] Mise a jour faite : %AVANT% vers %APRES%
echo  Nouveautes :
git log --oneline %AVANT%..%APRES%

rem Les scripts camera vivent aussi dans le dossier de Dart Sense : on les recopie
if exist "%DARTSENSE%" (
  copy /y "%APPLI%\dart-sense\trem_sense.py" "%DARTSENSE%\" >nul
  copy /y "%APPLI%\dart-sense\test_camera.py" "%DARTSENSE%\" >nul
  echo  Scripts camera recopies dans %DARTSENSE%
)
echo.
echo  Pour en profiter : fermer les fenetres "Pont lumiere" et "Pont Dart Sense",
echo  puis relancer trem-dragooon.bat (ou redemarrer le PC).

:fin
echo.
pause
