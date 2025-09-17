@echo off
echo ========================================
echo   FileShare - Demarrage en developpement
echo ========================================
echo.

:: Verifier si Node.js est installe
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js n'est pas installe. Veuillez l'installer d'abord.
    echo    Telecharger depuis: https://nodejs.org/
    pause
    exit /b 1
)

:: Verifier si Docker est installe
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker n'est pas installe. Veuillez l'installer d'abord.
    echo    Telecharger depuis: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

:: Verifier si Docker Compose est disponible
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker Compose n'est pas disponible.
    pause
    exit /b 1
)

echo ✅ Prerequis verifies avec succes!
echo.

:: Creer le fichier .env s'il n'existe pas
if not exist .env (
    echo 📝 Creation du fichier .env...
    copy env.example .env >nul
    echo ✅ Fichier .env cree. Configuration par defaut appliquee.
    echo.
)

:: Creer les dossiers necessaires
echo 📁 Creation des dossiers necessaires...
if not exist uploads mkdir uploads
if not exist logs mkdir logs
if not exist backups mkdir backups
echo ✅ Dossiers crees avec succes!
echo.

:: Installer les dependances si necessaire
echo 📦 Verification et installation des dependances...

:: Dependances racine
if not exist node_modules (
    echo    Installation des dependances racine...
    npm install
    if errorlevel 1 (
        echo ❌ Erreur lors de l'installation des dependances racine
        pause
        exit /b 1
    )
)

:: Dependances backend
if not exist backend\node_modules (
    echo    Installation des dependances backend...
    cd backend
    npm install
    if errorlevel 1 (
        echo ❌ Erreur lors de l'installation des dependances backend
        cd ..
        pause
        exit /b 1
    )
    cd ..
)

:: Dependances frontend
if not exist frontend\node_modules (
    echo    Installation des dependances frontend...
    cd frontend
    npm install
    if errorlevel 1 (
        echo ❌ Erreur lors de l'installation des dependances frontend
        cd ..
        pause
        exit /b 1
    )
    cd ..
)

echo ✅ Toutes les dependances sont installees!
echo.

:: Demarrer les services Docker (base de donnees et Redis)
echo 🐳 Demarrage des services Docker...
docker-compose up -d database redis
if errorlevel 1 (
    echo ❌ Erreur lors du demarrage des services Docker
    pause
    exit /b 1
)

echo ✅ Services Docker demarres!
echo.

:: Attendre que la base de donnees soit prete
echo ⏳ Attente de la base de donnees (30 secondes)...
timeout /t 30 /nobreak >nul

:: Configuration de la base de donnees
echo 🗄️ Configuration de la base de donnees...
cd backend

:: Generer le client Prisma
echo    Generation du client Prisma...
npx prisma generate
if errorlevel 1 (
    echo ❌ Erreur lors de la generation du client Prisma
    cd ..
    pause
    exit /b 1
)

:: Executer les migrations
echo    Execution des migrations...
npx prisma migrate dev --name init
if errorlevel 1 (
    echo ⚠️ Les migrations ont echoue, tentative de deploiement...
    npx prisma migrate deploy
)

:: Seeder la base de donnees
echo    Seeding de la base de donnees...
npx prisma db seed
if errorlevel 1 (
    echo ⚠️ Le seeding a echoue, mais ce n'est pas critique
)

cd ..
echo ✅ Base de donnees configuree!
echo.

:: Creer les fichiers de demarrage pour chaque service
echo 📝 Creation des scripts de demarrage...

:: Script pour le backend
echo @echo off > start-backend.bat
echo echo Demarrage du backend... >> start-backend.bat
echo cd backend >> start-backend.bat
echo npm run dev >> start-backend.bat

:: Script pour le frontend
echo @echo off > start-frontend.bat
echo echo Demarrage du frontend... >> start-frontend.bat
echo cd frontend >> start-frontend.bat
echo npm run dev >> start-frontend.bat

echo ✅ Scripts de demarrage crees!
echo.

:: Demarrer les services en parallele
echo 🚀 Demarrage des services...
echo.
echo    Backend:  http://localhost:3001
echo    Frontend: http://localhost:3000
echo    Base de donnees: localhost:5432
echo.
echo ⚠️ IMPORTANT: Gardez cette fenetre ouverte!
echo    Appuyez sur Ctrl+C pour arreter tous les services.
echo.

:: Demarrer le backend en arriere-plan
start "Backend API" cmd /c start-backend.bat

:: Attendre un peu puis demarrer le frontend
timeout /t 5 /nobreak >nul
start "Frontend React" cmd /c start-frontend.bat

:: Attendre un peu puis ouvrir le navigateur
timeout /t 10 /nobreak >nul
start http://localhost:3000

echo ✅ Tous les services sont demarres!
echo.
echo 🌐 URLs disponibles:
echo    - Application: http://localhost:3000
echo    - API:         http://localhost:3001
echo    - API Health:  http://localhost:3001/api/health
echo.
echo 📊 Commandes utiles:
echo    - docker-compose logs     : Voir les logs
echo    - docker-compose ps       : Statut des services
echo    - npx prisma studio       : Interface base de donnees (dans backend/)
echo.
echo Appuyez sur une touche pour fermer cette fenetre...
echo (Les services continueront de fonctionner en arriere-plan)
pause >nul

:: Nettoyer les fichiers temporaires
del start-backend.bat 2>nul
del start-frontend.bat 2>nul
