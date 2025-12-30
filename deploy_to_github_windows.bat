@echo off
setlocal enableextensions enabledelayedexpansion

REM Ultra-simple deploy: force push your current folder to GitHub Pages repo
REM Usage: place this .bat in the ROOT of YOUR NEW PROJECT and double-click.

set "REPO_URL=https://github.com/1cxnnu/1cxnnu.github.io.git"
set "BRANCH=main"
set "COMMIT_MSG=Deploy website"

where git >nul 2>&1
if errorlevel 1 (
  echo [ERREUR] Git n'est pas installe ou pas dans le PATH. Installez: https://git-scm.com/download/win
  pause
  exit /b 1
)

echo [INFO] Projet: %cd%

REM 1) Init repo (or switch to main)
if not exist .git (
  echo [INFO] Init depot Git...
  git init || goto :fail
)

echo [INFO] Bascule/creation branche %BRANCH% ...
git checkout -B %BRANCH% 1>nul 2>nul || git branch -M %BRANCH% 1>nul 2>nul

REM 2) Remote origin -> REPO_URL
for /f "tokens=*" %%r in ('git remote 2^>nul') do set hasRemote=1
if not defined hasRemote (
  echo [INFO] Ajout remote origin: %REPO_URL%
  git remote add origin %REPO_URL% 1>nul 2>nul
) else (
  git remote set-url origin %REPO_URL% 1>nul 2>nul
)

REM 3) Stage + commit (commit may be empty; that's fine)
echo [INFO] Ajout des fichiers...
git add -A || goto :fail
set changes=
for /f "delims=" %%i in ('git status --porcelain') do set changes=1
if defined changes (
  git commit -m "%COMMIT_MSG%" 1>nul 2>nul
) else (
  echo [INFO] Aucun changement detected; push quand meme.
)

REM 4) HARD way that just works: force push to main
echo [INFO] Push FORCE vers %REPO_URL% (%BRANCH%) ...
git push -f -u origin %BRANCH%
if errorlevel 1 goto :fail

echo.
echo [SUCCES] Deploiement termine. Ouvre: https://1cxnnu.github.io/
echo Si tu ne vois pas la mise a jour, attends 1-2 minutes et rafraichis (Ctrl+F5).
pause
exit /b 0

:fail
echo.
echo [ERREUR] Echec du push.
echo - Verifie tes identifiants GitHub si une fenetre de login apparait.
echo - Si la branche protegee empeche le force push, desactive la protection sur 'main'.
echo - Tu peux aussi supprimer la remote et reessayer: git remote remove origin
pause
exit /b 1
