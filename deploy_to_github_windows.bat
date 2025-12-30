@echo off
setlocal enabledelayedexpansion

REM === Config ===
set "REPO_URL=https://github.com/1cxnnu/1cxnnu.github.io.git"
set "BRANCH=main"
set "COMMIT_MSG=Deploy new site"

REM === Preconditions ===
where git >nul 2>&1
if errorlevel 1 (
  echo [ERREUR] Git n'est pas installe ou pas dans le PATH.
  echo Installez Git for Windows: https://git-scm.com/download/win
  echo Puis relancez ce script.
  pause
  exit /b 1
)

REM === Aller dans le dossier du projet (l'emplacement courant) ===
set "PROJECT_DIR=%cd%"
echo [INFO] Dossier projet: %PROJECT_DIR%

REM === Initialiser Git si besoin ===
if not exist "%PROJECT_DIR%\.git" (
  echo [INFO] Initialisation du depot Git...
  git init || goto :git_error
  git branch -M %BRANCH% 2>nul
) else (
  echo [INFO] Depot Git deja initialise.
)

REM === Configurer la remote origin ===
for /f "tokens=*" %%r in ('git remote 2^>nul') do set hasRemote=1
if not defined hasRemote (
  echo [INFO] Ajout de la remote origin: %REPO_URL%
  git remote add origin %REPO_URL% || goto :git_error
) else (
  echo [INFO] Mise a jour de la remote origin: %REPO_URL%
  git remote set-url origin %REPO_URL% || goto :git_error
)

REM === Ajouter tous les fichiers ===
echo [INFO] Ajout des fichiers...
 git add -A || goto :git_error

REM === Commit (sauter si rien a commit) ===
for /f "delims=" %%i in ('git status --porcelain') do set changes=1
if defined changes (
  echo [INFO] Commit en cours...
  git commit -m "%COMMIT_MSG%" || goto :git_error
) else (
  echo [INFO] Aucun changement a commiter.
)

REM === Pousser sur la branche ===
echo [INFO] Push vers %REPO_URL% branche %BRANCH% ...
 git push -u origin %BRANCH% || goto :git_error

 echo [SUCCES] Deploiement termine. Verifiez: https://1cxnnu.github.io/
 pause
 exit /b 0

:git_error
 echo.
 echo [ERREUR] Une commande Git a echoue. Details ci-dessus.
 echo - Astuce: Si l'authentification echoue, verifiez vos identifiants GitHub.
 echo - Si la branche par defaut de votre repo n'est pas '%BRANCH%', remplacez-la en haut du script.
 pause
 exit /b 1
