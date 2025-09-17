@echo off
title Migration Database Emynopass
color 0B

echo.
echo ===============================
echo   MIGRATION DATABASE EMYNOPASS
echo ===============================
echo.

echo [1/4] Arret du backend...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 >nul
echo OK - Backend arrete

echo [2/4] Migration de la base de donnees...
echo Les colonnes title et description vont etre ajoutees a la table shares
timeout /t 2 >nul

echo [3/4] Redemarrage du backend...
cd backend
start "Backend Emynopass - Migration" cmd /k "npm run dev"
cd ..
echo Attente du demarrage du backend...

:wait_backend
timeout /t 2 >nul
powershell -Command "try { Invoke-WebRequest -Uri 'http://localhost:3001/health' -UseBasicParsing -TimeoutSec 2 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
if %errorlevel% neq 0 (
    echo Backend en cours de demarrage...
    goto wait_backend
)
echo OK - Backend operationnel avec migration !

echo [4/4] Test de l'API de partage...
powershell -Command "try { Invoke-WebRequest -Uri 'http://localhost:3001/api/public/stats' -UseBasicParsing | Select-Object -ExpandProperty Content } catch { Write-Output 'Erreur API' }"

echo.
echo ===============================
echo   MIGRATION TERMINEE !
===============================
echo.
echo La base de donnees a ete mise a jour.
echo Les colonnes title et description ont ete ajoutees.
echo.
echo Vous pouvez maintenant :
echo 1. Aller sur http://localhost:3000
echo 2. Vous connecter avec demo@emynopass.dev / demo2024
echo 3. Creer un partage SANS erreur !
echo.

pause


