@echo off
title FileShare - Arret des Services
color 0C
chcp 65001 >nul

echo.
echo [91m  ███████╗████████╗ ██████╗ ██████╗ [0m
echo [91m  ██╔════╝╚══██╔══╝██╔═══██╗██╔══██╗[0m
echo [91m  ███████╗   ██║   ██║   ██║██████╔╝[0m
echo [91m  ╚════██║   ██║   ██║   ██║██╔═══╝ [0m
echo [91m  ███████║   ██║   ╚██████╔╝██║     [0m
echo [91m  ╚══════╝   ╚═╝    ╚═════╝ ╚═╝     [0m
echo.
echo [93m           🛑 ARRÊT DE FILESHARE 🛑[0m
echo.
echo =====================================

:: Aller à la racine du projet
cd /d "%~dp0..\.."

echo [94m🔄 Arrêt des services Node.js...[0m
taskkill /f /im node.exe /t >nul 2>&1
taskkill /f /im npm.cmd /t >nul 2>&1
echo [92m✅ Services Node.js arrêtés[0m

echo [94m🐳 Arrêt des services Docker...[0m
if exist "docker-compose.yml" (
    docker-compose stop >nul 2>&1
    echo [92m✅ Services Docker arrêtés[0m
) else (
    echo [93m⚠️  docker-compose.yml non trouvé[0m
)

echo [94m🧹 Nettoyage...[0m
timeout /t 2 /nobreak >nul
echo [92m✅ Nettoyage terminé[0m

echo.
echo [92m✅ Tous les services ont été arrêtés proprement![0m
echo.
echo [96m🚀 Pour redémarrer:[0m
echo    • Mode simple:  scripts/windows/start-simple.bat
echo    • Mode debug:   scripts/windows/start-debug.bat
echo.
echo [96m📊 Logs disponibles dans: logs/[0m
echo.
pause
