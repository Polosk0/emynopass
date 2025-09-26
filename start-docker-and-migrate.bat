@echo off
setlocal enabledelayedexpansion

echo.
echo 🐳 Démarrage de Docker Desktop et migration PostgreSQL
echo ====================================================
echo.

REM Vérifier si Docker Desktop est déjà en cours d'exécution
docker ps >nul 2>&1
if not errorlevel 1 (
    echo ✅ Docker Desktop est déjà en cours d'exécution
    goto :start_migration
)

echo ℹ️  Démarrage de Docker Desktop...
echo ⏳ Veuillez patienter, cela peut prendre quelques minutes...

REM Démarrer Docker Desktop
start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"

REM Attendre que Docker soit prêt
echo.
echo ℹ️  Attente de la disponibilité de Docker...
set /a counter=0
:wait_docker
docker ps >nul 2>&1
if not errorlevel 1 goto :docker_ready
if %counter% geq 120 (
    echo ❌ Timeout: Docker n'est pas prêt après 2 minutes
    echo 💡 Veuillez démarrer Docker Desktop manuellement et relancer ce script
    pause
    exit /b 1
)
timeout /t 5 /nobreak >nul
set /a counter+=5
echo|set /p="."
goto wait_docker
:docker_ready
echo.
echo ✅ Docker Desktop est prêt

:start_migration
echo.
echo 🚀 Lancement de la migration PostgreSQL...
echo.

REM Lancer la migration
call migrate-to-postgres.bat

echo.
echo ✅ Migration terminée !
pause
