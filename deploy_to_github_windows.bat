@echo off
setlocal enabledelayedexpansion

REM === Config ===
set "REPO_URL=https://github.com/1cxnnu/1cxnnu.github.io.git"
set "BRANCH=main"
set "COMMIT_MSG=Deploy new site (replace remote)"

REM === Check Git ===
where git >nul 2>&1
if errorlevel 1 (
  echo [ERREUR] Git n'est pas installe ou pas dans le PATH.
  echo Installez: https://git-scm.com/download/win
  pause
  exit /b 1
)

REM === Init repo si besoin ===
set "PROJECT_DIR=%cd%"
echo [INFO] Dossier projet: %PROJECT_DIR%
if not exist "%PROJECT_DIR%\.git" (
  echo [INFO] Initialisation du depot Git...
  git init || goto :git_error
  git branch -M %BRANCH% 2>nul
) else (
  echo [INFO] Depot Git deja initialise.
)

REM === Remote origin ===
for /f "tokens=* delims=" %%r in ('git remote 2^>nul') do set hasRemote=1
if not defined hasRemote (
  echo [INFO] Ajout remote origin: %REPO_URL%
  git remote add origin %REPO_URL% || goto :git_error
) else (
  git remote set-url origin %REPO_URL% || goto :git_error
)

REM === Fetch pour se synchroniser (sans merge)
 git fetch origin %BRANCH% --prune

REM === Stage + commit ===
 echo [INFO] Ajout des fichiers...
 git add -A || goto :git_error

 set changes=
 for /f "delims=" %%i in ('git status --porcelain') do set changes=1
 if defined changes (
   echo [INFO] Commit...
   git commit -m "%COMMIT_MSG%" || goto :git_error
 ) else (
   echo [INFO] Aucun changement a commiter.
 )

REM === Push normal d'abord ===
 echo [INFO] Push standard vers %REPO_URL% (%BRANCH%)...
 git push -u origin %BRANCH%
 if errorlevel 1 (
   echo.
   echo [AVERTISSEMENT] Le push a ete rejete (le remote contient des commits).
   set /p ANSW=Forcer l'ecrasement du remote avec le projet local ? (O/N) :
   if /I "%ANSW%"=="O" (
     echo [INFO] Force push avec securite (--force-with-lease)...
     git push --force-with-lease -u origin %BRANCH% || goto :git_error
     echo [SUCCES] Deploiement force effectue. Site: https://1cxnnu.github.io/
     pause & exit /b 0
   ) else (
     echo [INFO] Annule. Aucun force-push effectue.
     echo - Options:
     echo   1) Lancer "git pull --rebase origin %BRANCH%" puis relancer le script
     echo   2) Relancer le script et repondre O pour forcer l'ecrasement
     pause & exit /b 1
   )
 ) else (
   echo [SUCCES] Deploiement effectue. Site: https://1cxnnu.github.io/
   pause & exit /b 0
 )

:git_error
 echo.
 echo [ERREUR] Une commande Git a echoue. Verifiez les messages ci-dessus.
 pause
 exit /b 1
