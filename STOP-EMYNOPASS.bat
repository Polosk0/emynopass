@echo off
title Emynopass - Arret
color 0C

echo.
echo ===============================
echo      EMYNOPASS - STOP
echo ===============================
echo.

echo [1/3] Arret des services Node.js...
taskkill /F /IM node.exe >nul 2>&1
echo OK - Node.js arrete

echo.
echo [2/3] Arret des conteneurs Docker...
docker-compose down >nul 2>&1
echo OK - Docker arrete

echo.
echo [3/3] Nettoyage des processus...
timeout /t 2 >nul
echo OK - Nettoyage termine

echo.
echo ===============================
echo   EMYNOPASS ARRETE !
echo ===============================
echo.

pause


