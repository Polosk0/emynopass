@echo off
title FileShare - Demarrage rapide

echo.
echo   ███████╗██╗██╗     ███████╗███████╗██╗  ██╗ █████╗ ██████╗ ███████╗
echo   ██╔════╝██║██║     ██╔════╝██╔════╝██║  ██║██╔══██╗██╔══██╗██╔════╝
echo   █████╗  ██║██║     █████╗  ███████╗███████║███████║██████╔╝█████╗  
echo   ██╔══╝  ██║██║     ██╔══╝  ╚════██║██╔══██║██╔══██║██╔══██╗██╔══╝  
echo   ██║     ██║███████╗███████╗███████║██║  ██║██║  ██║██║  ██║███████╗
echo   ╚═╝     ╚═╝╚══════╝╚══════╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝
echo.
echo                    Plateforme de partage de fichiers securisee
echo.
echo ========================================================================
echo.

:: Vérifier si c'est la première fois
if not exist .env (
    echo 🎉 Bienvenue dans FileShare!
    echo.
    echo Ce script va configurer et demarrer votre plateforme de partage de fichiers.
    echo.
    echo 📋 Que va faire ce script:
    echo    ✅ Verifier les prerequis ^(Node.js, Docker^)
    echo    ✅ Creer la configuration par defaut
    echo    ✅ Installer toutes les dependances
    echo    ✅ Configurer la base de donnees
    echo    ✅ Demarrer tous les services
    echo    ✅ Ouvrir l'application dans votre navigateur
    echo.
    echo ⏱️ Temps estime: 3-5 minutes
    echo.
    set /p "continue=Voulez-vous continuer ? (Y/n): "
    if /i "%continue%"=="n" (
        echo Operation annulee.
        pause
        exit /b 0
    )
    echo.
) else (
    echo 🚀 Demarrage rapide de FileShare...
    echo.
)

:: Lancer le script de démarrage principal
call start-dev.bat

if errorlevel 1 (
    echo.
    echo ❌ Une erreur s'est produite lors du demarrage.
    echo.
    echo 🔧 Solutions possibles:
    echo    1. Verifiez que Docker Desktop est demarre
    echo    2. Verifiez que les ports 3000 et 3001 sont libres
    echo    3. Relancez ce script en tant qu'administrateur
    echo.
    echo 📞 Besoin d'aide ? Consultez docs/INSTALLATION.md
    echo.
    pause
    exit /b 1
)

echo.
echo 🎉 FileShare est maintenant pret!
echo.
echo 🌟 Fonctionnalites disponibles:
echo    📤 Upload de fichiers avec chiffrement
echo    🔗 Liens de partage temporaires
echo    🔐 Protection par mot de passe
echo    👥 Gestion des utilisateurs
echo    📊 Statistiques d'usage
echo.
echo 👤 Comptes de test disponibles:
echo    📧 admin@fileshare.local / admin123
echo    📧 test@fileshare.local  / test123
echo.
echo 🌐 Acces:
echo    Frontend: http://localhost:3000
echo    API:      http://localhost:3001
echo.
echo 🛑 Pour arreter: stop-dev.bat
echo.
echo Bon partage de fichiers! 🚀
