@echo off
title FileShare - Verification Systeme
color 0E
chcp 65001 >nul

echo.
echo [96m  ████████╗███████╗███████╗████████╗[0m
echo [96m  ╚══██╔══╝██╔════╝██╔════╝╚══██╔══╝[0m
echo [96m     ██║   █████╗  ███████╗   ██║   [0m
echo [96m     ██║   ██╔══╝  ╚════██║   ██║   [0m
echo [96m     ██║   ███████╗███████║   ██║   [0m
echo [96m     ╚═╝   ╚══════╝╚══════╝   ╚═╝   [0m
echo.
echo [93m        🔍 VÉRIFICATION SYSTÈME COMPLÈTE 🔍[0m
echo.
echo =======================================

:: Aller à la racine du projet
cd /d "%~dp0..\.."

:: Vérifier qu'on est bien dans le bon dossier
if not exist "package.json" (
    echo [91m❌ Erreur: Impossible de trouver la racine du projet[0m
    echo [93m   Script exécuté depuis: %CD%[0m
    echo [93m   Veuillez exécuter depuis la racine du projet FileShare[0m
    pause
    exit /b 1
)

set "all_ok=1"
set "warnings=0"

echo [94m🔍 [1/8] Vérification des prérequis logiciels...[0m
echo.

:: Node.js
echo [96mNode.js:[0m
node --version >nul 2>&1
if errorlevel 1 (
    echo [91m     ❌ Node.js non installé[0m
    echo [93m        Télécharger: https://nodejs.org/[0m
    set "all_ok=0"
) else (
    for /f "tokens=*" %%i in ('node --version') do echo [92m     ✅ %%i[0m
)

:: npm
echo [96mnpm:[0m
npm --version >nul 2>&1
if errorlevel 1 (
    echo [91m     ❌ npm non disponible[0m
    set "all_ok=0"
) else (
    for /f "tokens=*" %%i in ('npm --version') do echo [92m     ✅ v%%i[0m
)

:: Docker
echo [96mDocker:[0m
docker --version >nul 2>&1
if errorlevel 1 (
    echo [91m     ❌ Docker non installé[0m
    echo [93m        Télécharger: https://www.docker.com/products/docker-desktop[0m
    set "all_ok=0"
) else (
    for /f "tokens=*" %%i in ('docker --version') do echo [92m     ✅ %%i[0m
)

:: Docker Compose
echo [96mDocker Compose:[0m
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo [91m     ❌ Docker Compose non disponible[0m
    set "all_ok=0"
) else (
    for /f "tokens=*" %%i in ('docker-compose --version') do echo [92m     ✅ %%i[0m
)

:: Git (optionnel)
echo [96mGit (optionnel):[0m
git --version >nul 2>&1
if errorlevel 1 (
    echo [93m     ⚠️  Git non installé (optionnel)[0m
    echo [93m        Télécharger: https://git-scm.com/[0m
    set /a warnings+=1
) else (
    for /f "tokens=*" %%i in ('git --version') do echo [92m     ✅ %%i[0m
)

echo.
echo [94m🔌 [2/8] Vérification des ports...[0m
echo.

:: Port 3000 (Frontend)
netstat -an | findstr ":3000" >nul
if not errorlevel 1 (
    echo [93m     ⚠️  Port 3000 occupé (Frontend)[0m
    set /a warnings+=1
) else (
    echo [92m     ✅ Port 3000 libre (Frontend)[0m
)

:: Port 3001 (Backend)
netstat -an | findstr ":3001" >nul
if not errorlevel 1 (
    echo [93m     ⚠️  Port 3001 occupé (Backend)[0m
    set /a warnings+=1
) else (
    echo [92m     ✅ Port 3001 libre (Backend)[0m
)

:: Port 5432 (PostgreSQL)
netstat -an | findstr ":5432" >nul
if not errorlevel 1 (
    echo [93m     ⚠️  Port 5432 occupé (PostgreSQL)[0m
    set /a warnings+=1
) else (
    echo [92m     ✅ Port 5432 libre (PostgreSQL)[0m
)

echo.
echo [94m💾 [3/8] Vérification de l'espace disque...[0m
echo.

:: Espace disque (approximatif)
for /f "skip=1 tokens=3" %%a in ('wmic logicaldisk where "DeviceID='%~d0'" get FreeSpace') do (
    if not "%%a"=="" (
        set /a free_gb=%%a/1073741824
        if !free_gb! LSS 5 (
            echo [91m     ❌ Espace insuffisant: !free_gb!GB libre[0m
            echo [93m        Minimum recommandé: 5GB[0m
            set "all_ok=0"
        ) else (
            echo [92m     ✅ Espace suffisant: !free_gb!GB libre[0m
        )
        goto :disk_done
    )
)
:disk_done

echo.
echo [94m🐳 [4/8] Vérification de Docker...[0m
echo.

docker info >nul 2>&1
if errorlevel 1 (
    echo [91m     ❌ Docker non démarré[0m
    echo [93m        Veuillez démarrer Docker Desktop[0m
    set "all_ok=0"
) else (
    echo [92m     ✅ Docker opérationnel[0m
)

echo.
echo [94m📁 [5/8] Vérification de la structure du projet...[0m
echo.

:: Fichiers essentiels
set "files=package.json backend\package.json frontend\package.json docker-compose.yml"
for %%f in (%files%) do (
    if exist "%%f" (
        echo [92m     ✅ %%f[0m
    ) else (
        echo [91m     ❌ %%f manquant[0m
        set "all_ok=0"
    )
)

echo.
echo [94m📦 [6/8] Vérification des dépendances...[0m
echo.

if exist "node_modules" (
    echo [92m     ✅ Dépendances racine installées[0m
) else (
    echo [93m     ⚠️  Dépendances racine non installées[0m
    set /a warnings+=1
)

if exist "backend\node_modules" (
    echo [92m     ✅ Dépendances backend installées[0m
) else (
    echo [93m     ⚠️  Dépendances backend non installées[0m
    set /a warnings+=1
)

if exist "frontend\node_modules" (
    echo [92m     ✅ Dépendances frontend installées[0m
) else (
    echo [93m     ⚠️  Dépendances frontend non installées[0m
    set /a warnings+=1
)

echo.
echo [94m⚙️  [7/8] Vérification de la configuration...[0m
echo.

if exist ".env" (
    echo [92m     ✅ Fichier .env présent[0m
) else (
    echo [93m     ⚠️  Fichier .env manquant (sera créé automatiquement)[0m
    set /a warnings+=1
)

:: Dossiers de travail
set "dirs=uploads logs scripts"
for %%d in (%dirs%) do (
    if exist "%%d" (
        echo [92m     ✅ Dossier %%d présent[0m
    ) else (
        echo [93m     ⚠️  Dossier %%d manquant (sera créé automatiquement)[0m
        set /a warnings+=1
    )
)

echo.
echo [94m🧪 [8/8] Test de connectivité réseau...[0m
echo.

:: Test de résolution DNS
nslookup google.com >nul 2>&1
if errorlevel 1 (
    echo [91m     ❌ Problème de connectivité réseau[0m
    set "all_ok=0"
) else (
    echo [92m     ✅ Connectivité réseau OK[0m
)

echo.
echo [96m========================================[0m

:: Résumé final
if "%all_ok%"=="1" (
    if %warnings% EQU 0 (
        echo [92m🎉 SYSTÈME PARFAITEMENT CONFIGURÉ![0m
        echo.
        echo [92mVotre système est optimal pour FileShare.[0m
    ) else (
        echo [93m✅ SYSTÈME PRÊT AVEC %warnings% AVERTISSEMENT(S)[0m
        echo.
        echo [93mVotre système peut faire fonctionner FileShare.[0m
        echo [93mLes avertissements seront corrigés automatiquement.[0m
    )
    echo.
    echo [96m🚀 Commandes de démarrage:[0m
    echo [96m   • Mode simple:  scripts\windows\start-simple.bat[0m
    echo [96m   • Mode debug:   scripts\windows\start-debug.bat[0m
) else (
    echo [91m❌ PROBLÈMES CRITIQUES DÉTECTÉS![0m
    echo.
    echo [91mVeuillez corriger les erreurs ci-dessus avant de continuer.[0m
    echo.
    echo [96m📚 Aide:[0m
    echo [96m   • Documentation: docs\INSTALLATION.md[0m
    echo [96m   • Support: Consultez les logs dans logs\[0m
)

echo [96m========================================[0m

:: Proposer de lancer le démarrage si tout va bien
if "%all_ok%"=="1" (
    echo.
    set /p "launch=Voulez-vous démarrer FileShare maintenant ? (Y/n): "
    if /i "!launch!"=="y" (
        echo.
        echo [96m🚀 Lancement du mode debug...[0m
        call scripts\windows\start-debug.bat
        exit /b 0
    ) else if /i "!launch!"=="" (
        echo.
        echo [96m🚀 Lancement du mode debug...[0m
        call scripts\windows\start-debug.bat
        exit /b 0
    )
)

echo.
pause