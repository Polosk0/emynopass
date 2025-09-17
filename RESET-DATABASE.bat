@echo off
title Reset Database Emynopass
color 0C

echo.
echo ===============================
echo   RESET DATABASE EMYNOPASS
echo ===============================
echo.
echo ATTENTION: Cette action va supprimer toutes les donnees !
echo.
pause

echo [1/5] Arret des services...
taskkill /F /IM node.exe >nul 2>&1
docker-compose down >nul 2>&1
timeout /t 2 >nul

echo [2/5] Suppression de l'ancienne base de donnees...
if exist "data\fileshare.db" (
    del "data\fileshare.db"
    echo OK - Ancienne base supprimee
) else (
    echo OK - Pas d'ancienne base
)

echo [3/5] Suppression des anciens uploads...
if exist "uploads\*.*" (
    del /Q "uploads\*.*" >nul 2>&1
    echo OK - Anciens uploads supprimes
) else (
    echo OK - Pas d'anciens uploads
)

echo [4/5] Recreation des dossiers...
if not exist "data" mkdir data
if not exist "uploads" mkdir uploads
echo OK - Dossiers recrees

echo [5/5] Redemarrage de l'application...
echo.
start "" ".\START-EMYNOPASS.bat"

echo.
echo ===============================
echo   BASE DE DONNEES RESETEE !
echo ===============================
echo.
echo L'application redémarre avec une base de données fraîche.
echo Les comptes de test seront recréés automatiquement :
echo   - Admin: polosko@emynopass.dev / Emynopass2024!
echo   - Demo:  demo@emynopass.dev / demo2024
echo.

pause


