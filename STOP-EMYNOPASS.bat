@echo off
title Emynopass - Arret Docker
color 0C

echo.
echo ===============================
echo   EMYNOPASS - DOCKER STOP
echo ===============================
echo.

echo [1/2] Verification de Docker...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERREUR: Docker n'est pas disponible
    pause
    exit /b 1
)
echo OK - Docker disponible

echo.
echo [2/2] Arret des conteneurs Docker...
docker-compose down
if %errorlevel% neq 0 (
    echo ATTENTION: Probleme lors de l'arret des conteneurs
) else (
    echo OK - Conteneurs arretes
)

echo.
echo ===============================
echo   EMYNOPASS ARRETE !
echo ===============================
echo.
echo Pour redemarrer: START-EMYNOPASS.bat
echo.

pause


