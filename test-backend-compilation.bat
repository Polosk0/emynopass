@echo off
echo 🔧 Test de compilation du backend...

REM Aller dans le dossier backend
cd backend

REM Nettoyer les anciens builds
echo 🧹 Nettoyage des anciens builds...
if exist dist rmdir /s /q dist

REM Installer les dépendances
echo 📦 Installation des dépendances...
call npm ci
if %errorlevel% neq 0 (
    echo ❌ Erreur lors de l'installation des dépendances
    exit /b 1
)

REM Compiler le TypeScript
echo 🔨 Compilation TypeScript...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Erreur lors de la compilation
    exit /b 1
)

REM Vérifier que la compilation a réussi
if exist "dist\index.js" (
    echo ✅ Compilation réussie - dist\index.js trouvé
    
    REM Vérifier la syntaxe du fichier compilé
    echo 🔍 Vérification de la syntaxe...
    node -c dist\index.js
    if %errorlevel% equ 0 (
        echo ✅ Syntaxe JavaScript valide
    ) else (
        echo ❌ Erreur de syntaxe JavaScript
        exit /b 1
    )
    
    REM Afficher la taille du fichier
    echo 📊 Taille du fichier compilé:
    dir dist\index.js
    
) else (
    echo ❌ Compilation échouée - dist\index.js manquant
    exit /b 1
)

echo ✅ Test de compilation terminé avec succès
pause
