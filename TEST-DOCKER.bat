@echo off
title Emynopass - Test Docker
color 0B

echo.
echo ===============================
echo   EMYNOPASS - DOCKER TEST
echo ===============================
echo.

echo [1/6] Verification de Docker...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERREUR: Docker n'est pas installe
    pause
    exit /b 1
)
echo OK - Docker disponible

docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERREUR: Docker Compose n'est pas installe
    pause
    exit /b 1
)
echo OK - Docker Compose disponible

echo.
echo [2/6] Arret des services existants...
docker-compose down >nul 2>&1
echo OK - Services arretes

echo.
echo [3/6] Construction des images...
docker-compose build
if %errorlevel% neq 0 (
    echo ERREUR: Echec de la construction des images
    pause
    exit /b 1
)
echo OK - Images construites

echo.
echo [4/6] Demarrage des services...
docker-compose up -d
if %errorlevel% neq 0 (
    echo ERREUR: Echec du demarrage des services
    pause
    exit /b 1
)
echo OK - Services demarres

echo.
echo [5/6] Attente du demarrage complet...
timeout /t 15 >nul
echo OK - Attente terminee

echo.
echo [6/6] Test des services...

:test_backend
echo Test du backend...
powershell -Command "try { Invoke-WebRequest -Uri 'http://localhost:3001/health' -UseBasicParsing -TimeoutSec 5 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
if %errorlevel% neq 0 (
    echo ERREUR: Backend non accessible
    echo Logs backend:
    docker-compose logs backend
) else (
    echo OK - Backend accessible
)

:test_frontend
echo Test du frontend...
powershell -Command "try { Invoke-WebRequest -Uri 'http://localhost:3000' -UseBasicParsing -TimeoutSec 5 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
if %errorlevel% neq 0 (
    echo ERREUR: Frontend non accessible
    echo Logs frontend:
    docker-compose logs frontend
) else (
    echo OK - Frontend accessible
)

echo.
echo ===============================
echo     TEST TERMINE !
echo ===============================
echo.
echo URLs disponibles :
echo   - Frontend: http://localhost:3000
echo   - Backend:  http://localhost:3001
echo   - Redis:    localhost:6379
echo.
echo Commandes utiles :
echo   - Logs:     docker-compose logs -f
echo   - Arret:    docker-compose down
echo   - Statut:   docker-compose ps
echo.

pause

