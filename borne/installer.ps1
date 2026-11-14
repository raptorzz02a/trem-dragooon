# === TREM-DRAGOOON : installation de la borne sur un nouveau PC ===
# Lance par installer.bat (double-clic). Peut etre relance sans risque : ce qui est deja fait est saute.
# Fait : prerequis (Git, Node.js LTS, Python 3.11, via winget s'ils manquent), dossiers, telechargement
# des depots, environnement Python de Dart Sense, modele OpenVINO, demarrage automatique, raccourci
# de mise a jour sur le Bureau.

$ErrorActionPreference = 'Stop'

$Appli     = Join-Path $env:USERPROFILE 'trem-dragooon'
$DartSense = 'C:\darts\dart-sense-main'
$DepotAppli     = 'https://github.com/raptorzz02a/trem-dragooon.git'
$DepotDartSense = 'https://github.com/bnww/dart-sense.git'
$Startup = [Environment]::GetFolderPath('Startup')
$Desktop = [Environment]::GetFolderPath('Desktop')

function Etape($texte) { Write-Host ''; Write-Host "=== $texte" -ForegroundColor Cyan }
function Ok($texte) { Write-Host "[OK] $texte" -ForegroundColor Green }
function Info($texte) { Write-Host "     $texte" }
function Attention($texte) { Write-Host "[!] $texte" -ForegroundColor Yellow }

function Actualiser-Path {
  $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
}

function Existe($commande) { [bool](Get-Command $commande -ErrorAction SilentlyContinue) }

function Lancer($exe, [string[]]$arguments, $quoi) {
  & $exe @arguments
  if ($LASTEXITCODE -ne 0) { throw "$quoi a echoue (code $LASTEXITCODE)." }
}

function Installer-Winget($id, $nom) {
  if (-not (Existe 'winget')) {
    throw "$nom n'est pas installe et winget n'est pas disponible. Installe $nom a la main (liens dans LISEZMOI.txt), puis relance installer.bat."
  }
  Info "$nom manque : installation avec winget (accepter si Windows demande)..."
  & winget install -e --id $id --accept-source-agreements --accept-package-agreements
  Actualiser-Path
}

function Trouver-Python311 {
  if (Existe 'py') {
    try {
      $chemin = & py -3.11 -c "import sys; print(sys.executable)" 2>$null
      if ($LASTEXITCODE -eq 0 -and $chemin) { $chemin = ([string]$chemin).Trim(); if (Test-Path $chemin) { return $chemin } }
    } catch { }
  }
  foreach ($c in @("$env:LOCALAPPDATA\Programs\Python\Python311\python.exe", "$env:ProgramFiles\Python311\python.exe")) {
    if (Test-Path $c) { return $c }
  }
  return $null
}

try {
  Write-Host ''
  Write-Host '  TREM-DRAGOOON - installation de la borne' -ForegroundColor White
  Write-Host "  Appli      : $Appli"
  Write-Host "  Dart Sense : $DartSense"
  Write-Host ''
  $RepAmpoule = Read-Host '  As-tu une ampoule Yeelight a piloter ? (o/N)'
  $Ampoule = $RepAmpoule -match '^[oOyY]'
  $Ip = ''
  if ($Ampoule) {
    Write-Host "  Adresse IP de l'ampoule (visible dans l'appli Yeelight, infos de l'appareil)."
    $Ip = (Read-Host '  Entree = la chercher toute seule au demarrage, ou taper par exemple 192.168.1.10').Trim()
  }

  # 1. Prerequis ------------------------------------------------------------
  Etape '1/7 Prerequis'
  if (-not (Existe 'git')) { Installer-Winget 'Git.Git' 'Git' }
  if (-not (Existe 'git')) { throw 'Git est installe mais pas encore visible : ferme cette fenetre et relance installer.bat.' }
  Ok 'Git'

  if ($Ampoule) {
    if (-not (Existe 'node')) { Installer-Winget 'OpenJS.NodeJS.LTS' 'Node.js LTS' }
    if (-not (Existe 'node')) { throw 'Node.js est installe mais pas encore visible : ferme cette fenetre et relance installer.bat.' }
    Ok ('Node.js ' + (& node --version))
  } else {
    Ok 'Node.js pas necessaire (pas d ampoule)'
  }

  $Python = Trouver-Python311
  if (-not $Python) { Installer-Winget 'Python.Python.3.11' 'Python 3.11'; $Python = Trouver-Python311 }
  if (-not $Python) { throw 'Python 3.11 est installe mais pas encore visible : ferme cette fenetre et relance installer.bat.' }
  Ok "Python 3.11 ($Python)"

  $Edge = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") | Where-Object { Test-Path $_ }
  if ($Edge) { Ok 'Microsoft Edge' } else { Attention "Edge introuvable : l'installer depuis https://www.microsoft.com/fr-fr/edge/download" }

  # 2. Dossiers et depots ---------------------------------------------------
  Etape '2/7 Telechargement de l appli (depot trem-dragooon)'
  if (Test-Path (Join-Path $Appli '.git')) {
    Lancer 'git' @('-C', $Appli, 'pull', '--ff-only') 'La mise a jour du depot trem-dragooon'
    Ok 'Depot deja la, mis a jour'
  } elseif (Test-Path $Appli) {
    throw "Le dossier $Appli existe deja mais n'est pas un depot Git. Renomme-le (par exemple trem-dragooon-ancien) puis relance."
  } else {
    Lancer 'git' @('clone', $DepotAppli, $Appli) 'Le telechargement de trem-dragooon'
    Ok "Depot telecharge dans $Appli"
  }

  Etape '3/7 Telechargement de Dart Sense (modele de detection)'
  New-Item -ItemType Directory -Force -Path (Split-Path $DartSense) | Out-Null
  if (Test-Path (Join-Path $DartSense 'weights.pt')) {
    Ok 'Dart Sense deja la'
  } elseif ((Test-Path $DartSense) -and (Get-ChildItem $DartSense -Force | Select-Object -First 1)) {
    throw "Le dossier $DartSense existe mais sans weights.pt. Vide-le ou renomme-le, puis relance."
  } else {
    Lancer 'git' @('clone', $DepotDartSense, $DartSense) 'Le telechargement de Dart Sense'
    Ok "Dart Sense telecharge dans $DartSense"
  }
  Copy-Item (Join-Path $Appli 'dart-sense\trem_sense.py') $DartSense -Force
  Copy-Item (Join-Path $Appli 'dart-sense\test_camera.py') $DartSense -Force
  Ok 'trem_sense.py et test_camera.py copies dans Dart Sense'

  # 3. Python ---------------------------------------------------------------
  Etape '4/7 Environnement Python et paquets (plusieurs minutes la premiere fois)'
  $VenvPython = Join-Path $DartSense '.venv\Scripts\python.exe'
  if (-not (Test-Path $VenvPython)) {
    Lancer $Python @('-m', 'venv', (Join-Path $DartSense '.venv')) 'La creation de l environnement Python'
  }
  Lancer $VenvPython @('-m', 'pip', 'install', '--upgrade', 'pip') 'La mise a jour de pip'
  Lancer $VenvPython @('-m', 'pip', 'install', '--upgrade', 'ultralytics', 'opencv-python', 'openvino') 'L installation des paquets Python'
  Ok 'ultralytics, opencv-python et openvino installes'

  Etape '5/7 Modele accelere OpenVINO'
  if (Test-Path (Join-Path $DartSense 'weights_openvino_model')) {
    Ok 'Deja prepare'
  } else {
    Push-Location $DartSense
    try {
      Lancer $VenvPython @('-c', "from ultralytics import YOLO; YOLO('weights.pt').export(format='openvino', imgsz=800)") 'L export OpenVINO'
    } finally { Pop-Location }
    Ok 'weights_openvino_model cree'
  }

  # 4. Demarrage automatique -------------------------------------------------
  Etape '6/7 Demarrage automatique et raccourci de mise a jour'
  $Bat = Get-Content (Join-Path $Appli 'borne\trem-dragooon.bat') -Raw
  if (-not $Ampoule) {
    $Bat = (($Bat -split "`r?`n") | Where-Object { $_ -notmatch 'pont-yeelight\.mjs' }) -join "`r`n"
    $Bat = $Bat -replace '\?ampoule=1&camera=1', '?camera=1'
    Ok 'Ampoule : aucune, pont lumiere retire du demarrage'
  } elseif ($Ip -match '^\d{1,3}(\.\d{1,3}){3}$') {
    $Bat = $Bat -replace '--ip \d{1,3}(\.\d{1,3}){3}', "--ip $Ip"
    Ok "Ampoule : $Ip"
  } else {
    if ($Ip) { Attention "Adresse '$Ip' non reconnue : recherche automatique." }
    $Bat = $Bat -replace ' --ip \d{1,3}(\.\d{1,3}){3}', ''
    Ok 'Ampoule : recherche automatique'
  }
  $Demarrage = Join-Path $Startup 'trem-dragooon.bat'
  if (Test-Path $Demarrage) { Copy-Item $Demarrage "$Demarrage.ancien" -Force; Info 'Ancien trem-dragooon.bat garde en trem-dragooon.bat.ancien' }
  $Bat = ($Bat -replace "`r`n", "`n") -replace "`n", "`r`n"
  [IO.File]::WriteAllText($Demarrage, $Bat, [Text.Encoding]::ASCII)
  Ok "trem-dragooon.bat place dans le dossier de demarrage ($Startup)"

  Copy-Item (Join-Path $Appli 'borne\mise-a-jour.bat') (Join-Path $Desktop 'Mise a jour TREM-DRAGOOON.bat') -Force
  Ok "Raccourci 'Mise a jour TREM-DRAGOOON' sur le Bureau"

  # 5. Fin -------------------------------------------------------------------
  Etape '7/7 Termine'
  Ok 'Installation terminee. Au prochain demarrage du PC, la borne se lance toute seule.'
  Info "Au premier lancement : se connecter a son compte, et repondre Autoriser si Edge demande l'acces au reseau local."
  Info 'Si Windows demande d autoriser Python ou Node sur le reseau : reseaux prives.'
  Write-Host ''
  $Rep = Read-Host '     Lancer la borne maintenant ? (O/n)'
  if ($Rep -notmatch '^[nN]') { Start-Process -FilePath $Demarrage }
} catch {
  Write-Host ''
  Write-Host "[ERREUR] $($_.Exception.Message)" -ForegroundColor Red
  Write-Host '         Corriger puis relancer installer.bat : ce qui est deja fait sera saute.'
}
Write-Host ''
Read-Host 'Appuyer sur Entree pour fermer'
