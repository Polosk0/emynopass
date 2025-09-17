@echo off
title FileShare - Demarrage avec Debug Complet
color 0A
chcp 65001 >nul

:: Art ASCII avec couleurs
echo.
echo [92m  ███████╗██╗██╗     ███████╗███████╗██╗  ██╗ █████╗ ██████╗ ███████╗[0m
echo [92m  ██╔════╝██║██║     ██╔════╝██╔════╝██║  ██║██╔══██╗██╔══██╗██╔════╝[0m
echo [92m  █████╗  ██║██║     █████╗  ███████╗███████║███████║██████╔╝█████╗  [0m
echo [92m  ██╔══╝  ██║██║     ██╔══╝  ╚════██║██╔══██║██╔══██║██╔══██╗██╔══╝  [0m
echo [92m  ██║     ██║███████╗███████╗███████║██║  ██║██║  ██║██║  ██║███████╗[0m
echo [92m  ╚═╝     ╚═╝╚══════╝╚══════╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝[0m
echo.
echo [96m                    🐛 MODE DEBUG COMPLET ACTIVÉ 🐛[0m
echo [96m                   Surveillance en temps réel des services[0m
echo.
echo [93m========================================================================[0m
echo [93m Ce script va démarrer FileShare avec un monitoring complet:[0m
echo [93m ✅ Logs détaillés de chaque étape[0m
echo [93m ✅ Surveillance en temps réel des services[0m
echo [93m ✅ Dashboard interactif dans le terminal[0m
echo [93m ✅ Détection automatique des erreurs[0m
echo [93m ✅ Vérifications de santé continues[0m
echo [93m========================================================================[0m
echo.

:: Vérifier si on est dans le bon dossier
if not exist "package.json" (
    echo [91m❌ Erreur: Ce script doit être exécuté depuis la racine du projet FileShare[0m
    echo [93m   Assurez-vous d'être dans le dossier contenant package.json[0m
    pause
    exit /b 1
)

:: Vérifier Node.js
echo [94m🔍 Vérification des prérequis...[0m
node --version >nul 2>&1
if errorlevel 1 (
    echo [91m❌ Node.js requis! Téléchargez sur https://nodejs.org/[0m
    pause
    exit /b 1
)
echo [92m✅ Node.js détecté[0m

:: Vérifier npm
npm --version >nul 2>&1
if errorlevel 1 (
    echo [91m❌ npm requis![0m
    pause
    exit /b 1
)
echo [92m✅ npm détecté[0m

:: Message d'information
echo.
echo [96m🚀 Démarrage du système de debug...[0m
echo [93m📋 Un dashboard détaillé va s'afficher avec:[0m
echo [93m   • Statut en temps réel de tous les services[0m
echo [93m   • Logs colorés et horodatés[0m
echo [93m   • Métriques de performance[0m
echo [93m   • URLs d'accès et comptes de test[0m
echo.
echo [95m⚡ Gardez cette fenêtre ouverte pour surveiller le système![0m
echo [95m   Appuyez sur Ctrl+C pour arrêter tous les services proprement[0m
echo.

:: Démarrer le debugger JavaScript
echo [94m🎛️  Lancement du debugger principal...[0m
echo.

:: Aller à la racine du projet
cd /d "%~dp0..\.."

:: Vérifier qu'on est bien dans le bon dossier
if not exist "package.json" (
    echo [91m❌ Erreur: Impossible de trouver la racine du projet[0m
    echo [93m   Script exécuté depuis: %CD%[0m
    echo [93m   Racine attendue avec package.json[0m
    pause
    exit /b 1
)

node scripts/debug/debug-start.js

:: En cas d'erreur
if errorlevel 1 (
    echo.
    echo [91m❌ Le démarrage a échoué![0m
    echo.
    echo [93m🔧 Solutions possibles:[0m
    echo [93m   1. Vérifiez que Docker Desktop est démarré[0m
    echo [93m   2. Vérifiez que les ports 3000 et 3001 sont libres[0m
    echo [93m   3. Consultez les logs détaillés dans le dossier logs/[0m
    echo [93m   4. Relancez ce script en tant qu'administrateur[0m
    echo.
    echo [96m📄 Log de debug sauvé dans: logs/debug.log[0m
    echo.
    pause
    exit /b 1
)

echo.
echo [92m🎉 Session de debug terminée![0m
pause
