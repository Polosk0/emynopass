@echo off
title Emynopass - Demarrage Docker
color 0A

echo.
echo ===============================
echo   EMYNOPASS - DOCKER START
echo ===============================
echo.

echo [1/5] Verification du dossier...
if not exist "docker-compose.yml" (
    echo ERREUR: Pas dans le bon dossier
    pause
    exit /b 1
)
echo OK - Dans le bon dossier

echo.
echo [2/5] Verification de Docker...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERREUR: Docker n'est pas installe ou demarre
    echo Veuillez installer Docker Desktop et le demarrer
    pause
    exit /b 1
)
echo OK - Docker disponible

echo.
echo [3/5] Arret des services existants...
docker-compose down >nul 2>&1
echo OK - Services arretes

echo.
echo [4/5] Construction et demarrage des conteneurs...
echo Construction des images Docker...
docker-compose build --no-cache
if %errorlevel% neq 0 (
    echo ERREUR: Echec de la construction des images
    pause
    exit /b 1
)

echo Demarrage des services...
docker-compose up -d
if %errorlevel% neq 0 (
    echo ERREUR: Echec du demarrage des services
    pause
    exit /b 1
)

echo.
echo [5/5] Attente du demarrage complet...
echo Verification de la disponibilite des services...

:wait_services
timeout /t 5 >nul
powershell -Command "try { Invoke-WebRequest -Uri 'http://localhost:3001/health' -UseBasicParsing -TimeoutSec 2 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
if %errorlevel% neq 0 (
    echo Services en cours de demarrage...
    goto wait_services
)

powershell -Command "try { Invoke-WebRequest -Uri 'http://localhost:3000' -UseBasicParsing -TimeoutSec 2 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
if %errorlevel% neq 0 (
    echo Frontend en cours de demarrage...
    goto wait_services
)

echo.
echo ===============================
echo     EMYNOPASS PRET !
echo ===============================
echo.
echo URLs disponibles :
echo   - Application : http://localhost:3000
echo   - API Backend : http://localhost:3001
echo   - Health Check: http://localhost:3001/health
echo.
echo Comptes de test :
echo   - Admin: polosko@emynopass.dev / Emynopass2024!
echo   - Demo:  demo@emynopass.dev / demo2024
echo.
echo Pour tester le partage :
echo   1. Connectez-vous avec un compte
echo   2. Uploadez un fichier
echo   3. Cliquez sur "Partager" dans la liste des fichiers
echo   4. Copiez l'URL de partage generee
echo   5. Testez l'URL dans un nouvel onglet
echo.

pause


