@echo off
echo 🔍 Diagnostic du problème de redémarrage du backend...
echo.

echo 📋 Informations système:
echo - OS: %OS%
echo - Architecture: %PROCESSOR_ARCHITECTURE%
echo - Node.js version:
node --version
echo - NPM version:
npm --version
echo.

echo 📁 Structure des dossiers:
echo - Dossier backend:
if exist backend (
    echo   ✅ backend/ existe
    dir backend /b
) else (
    echo   ❌ backend/ manquant
)

echo - Dossier backend/src:
if exist backend\src (
    echo   ✅ backend/src/ existe
    dir backend\src /b
) else (
    echo   ❌ backend/src/ manquant
)

echo - Dossier backend/dist:
if exist backend\dist (
    echo   ✅ backend/dist/ existe
    dir backend\dist /b
) else (
    echo   ❌ backend/dist/ manquant
)

echo - Fichier package.json:
if exist backend\package.json (
    echo   ✅ backend/package.json existe
) else (
    echo   ❌ backend/package.json manquant
)

echo - Fichier tsconfig.json:
if exist backend\tsconfig.json (
    echo   ✅ backend/tsconfig.json existe
) else (
    echo   ❌ backend/tsconfig.json manquant
)

echo.
echo 🔧 Test de compilation:
cd backend
echo Compilation en cours...
call npm run build
if %errorlevel% equ 0 (
    echo ✅ Compilation réussie
) else (
    echo ❌ Compilation échouée
    echo Détails de l'erreur:
    call npm run build
)

echo.
echo 📊 Fichiers générés:
if exist dist\index.js (
    echo ✅ dist/index.js généré
    echo Taille: 
    dir dist\index.js
) else (
    echo ❌ dist/index.js manquant
)

echo.
echo 🐳 Test Docker:
echo Vérification de la configuration Docker...
if exist docker-compose.yml (
    echo ✅ docker-compose.yml existe
) else (
    echo ❌ docker-compose.yml manquant
)

if exist docker\Dockerfile.backend (
    echo ✅ docker/Dockerfile.backend existe
) else (
    echo ❌ docker/Dockerfile.backend manquant
)

echo.
echo 🔍 Variables d'environnement importantes:
echo - NODE_ENV: %NODE_ENV%
echo - DATABASE_PATH: %DATABASE_PATH%
echo - PORT: %PORT%
echo - JWT_SECRET: %JWT_SECRET%

echo.
echo ✅ Diagnostic terminé
pause
