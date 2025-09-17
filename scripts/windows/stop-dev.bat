@echo off
echo ========================================
echo   FileShare - Arret des services
echo ========================================
echo.

echo 🛑 Arret des services Node.js...

:: Arreter tous les processus npm run dev
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im npm.cmd >nul 2>&1

echo ✅ Services Node.js arretes!
echo.

echo 🐳 Arret des services Docker...
docker-compose stop
if errorlevel 1 (
    echo ❌ Erreur lors de l'arret des services Docker
) else (
    echo ✅ Services Docker arretes!
)
echo.

:: Demander si on veut supprimer les conteneurs
set /p "choice=Voulez-vous supprimer les conteneurs Docker ? (y/N): "
if /i "%choice%"=="y" (
    echo 🗑️ Suppression des conteneurs Docker...
    docker-compose down
    if errorlevel 1 (
        echo ❌ Erreur lors de la suppression des conteneurs
    ) else (
        echo ✅ Conteneurs Docker supprimes!
    )
    echo.
)

echo ✅ Tous les services ont ete arretes!
echo.
echo 📊 Pour redemarrer:
echo    start-dev.bat
echo.
echo Appuyez sur une touche pour fermer...
pause >nul
