@echo off
rem === TREM-DRAGOOON : installation de la borne sur un nouveau PC ===
rem Double-cliquer dessus. Le detail est dans installer.ps1, a garder dans le meme dossier.
title Installation TREM-DRAGOOON
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0installer.ps1"
