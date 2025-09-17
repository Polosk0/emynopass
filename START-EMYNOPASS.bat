@echo off
title Emynopass - Demarrage
color 0A

echo.
echo ===============================
echo      EMYNOPASS - START
echo ===============================
echo.

echo [1/6] Verification du dossier...
if not exist "package.json" (
    echo ERREUR: Pas dans le bon dossier
    pause
    exit /b 1
)
echo OK - Dans le bon dossier

echo.
echo [2/6] Arret des services existants...
docker-compose down >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 >nul
echo OK - Services arretes

echo.
echo [3/6] Demarrage Redis...
docker-compose up -d redis
if %errorlevel% neq 0 (
    echo ERREUR: Impossible de demarrer Redis
    pause
    exit /b 1
)
echo OK - Redis demarre
timeout /t 3 >nul

echo.
echo [4/6] Installation des dependances...
cd backend
call npm install >nul 2>&1
cd ../frontend  
call npm install >nul 2>&1
cd ..
echo OK - Dependances installees

echo.
echo [5/6] Demarrage du Backend...
cd backend
start "Backend Emynopass" cmd /k "npm run dev"
cd ..
echo Attente du demarrage du backend...

:wait_backend
timeout /t 2 >nul
powershell -Command "try { Invoke-WebRequest -Uri 'http://localhost:3001/health' -UseBasicParsing -TimeoutSec 2 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
if %errorlevel% neq 0 (
    echo Backend en cours de demarrage...
    goto wait_backend
)
echo OK - Backend operationnel !

echo.
echo [6/6] Demarrage du Frontend...
cd frontend
start "Frontend Emynopass" cmd /k "npm run dev"
cd ..
echo Attente du demarrage du frontend...
timeout /t 5 >nul

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


