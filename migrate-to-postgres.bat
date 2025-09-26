@echo off
setlocal enabledelayedexpansion

REM Script de migration complète de SQLite vers PostgreSQL pour Windows
REM Ce script effectue la migration complète du système

echo.
echo 🔄 Migration Emynopass de SQLite vers PostgreSQL
echo ================================================
echo.

REM Vérifier que Docker est installé
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker n'est pas installé. Veuillez installer Docker d'abord.
    pause
    exit /b 1
)

docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker Compose n'est pas installé. Veuillez installer Docker Compose d'abord.
    pause
    exit /b 1
)

REM Vérifier que Node.js est installé
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js n'est pas installé. Veuillez installer Node.js d'abord.
    pause
    exit /b 1
)

echo ✅ Vérification des prérequis terminée

REM 1. Arrêter les services existants
echo.
echo ℹ️  Arrêt des services existants...
docker-compose down >nul 2>&1
echo ✅ Services arrêtés

REM 2. Sauvegarder les données SQLite existantes
if exist "data\emynopass.db" (
    echo.
    echo ℹ️  Sauvegarde de la base SQLite existante...
    for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
    set "YY=%dt:~2,2%" & set "YYYY=%dt:~0,4%" & set "MM=%dt:~4,2%" & set "DD=%dt:~6,2%"
    set "HH=%dt:~8,2%" & set "Min=%dt:~10,2%" & set "Sec=%dt:~12,2%"
    set "timestamp=%YYYY%%MM%%DD%_%HH%%Min%%Sec%"
    copy "data\emynopass.db" "data\emynopass.db.backup.%timestamp%" >nul
    echo ✅ Sauvegarde créée
) else (
    echo.
    echo ⚠️  Aucune base SQLite trouvée, migration des données ignorée
)

REM 3. Installer les nouvelles dépendances
echo.
echo ℹ️  Installation des nouvelles dépendances PostgreSQL...
cd backend
call npm install
cd ..
echo ✅ Dépendances installées

REM 4. Démarrer PostgreSQL
echo.
echo ℹ️  Démarrage de PostgreSQL...
docker-compose up -d postgres

REM Attendre que PostgreSQL soit prêt
echo.
echo ℹ️  Attente de la disponibilité de PostgreSQL...
set /a counter=0
:wait_postgres
docker-compose exec postgres pg_isready -U emynopass -d emynopass >nul 2>&1
if not errorlevel 1 goto postgres_ready
if %counter% geq 60 (
    echo ❌ Timeout: PostgreSQL n'est pas prêt après 60 secondes
    pause
    exit /b 1
)
timeout /t 2 /nobreak >nul
set /a counter+=2
echo|set /p="."
goto wait_postgres
:postgres_ready
echo.
echo ✅ PostgreSQL est prêt

REM 5. Migrer les données si elles existent
if exist "data\emynopass.db" (
    echo.
    echo ℹ️  Migration des données de SQLite vers PostgreSQL...
    
    REM Exporter les variables d'environnement pour le script de migration
    set DB_HOST=localhost
    set DB_PORT=5432
    set DB_NAME=emynopass
    set DB_USER=emynopass
    set DB_PASSWORD=emynopass
    set SQLITE_DB_PATH=./data/emynopass.db
    
    REM Exécuter le script de migration
    node scripts\migrate-sqlite-to-postgres.js
    
    if errorlevel 1 (
        echo ❌ Erreur lors de la migration des données
        pause
        exit /b 1
    )
    echo ✅ Migration des données terminée
) else (
    echo.
    echo ℹ️  Aucune donnée à migrer, initialisation avec les données par défaut
)

REM 6. Démarrer tous les services
echo.
echo ℹ️  Démarrage de tous les services...
docker-compose up -d

REM Attendre que les services soient prêts
echo.
echo ℹ️  Attente de la disponibilité des services...
timeout /t 10 /nobreak >nul

REM 7. Vérifier la santé des services
echo.
echo ℹ️  Vérification de la santé des services...

REM Vérifier PostgreSQL
docker-compose exec postgres pg_isready -U emynopass -d emynopass >nul 2>&1
if errorlevel 1 (
    echo ❌ PostgreSQL: ERREUR
    pause
    exit /b 1
) else (
    echo ✅ PostgreSQL: OK
)

REM Vérifier le backend
curl -f http://localhost:3001/health >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Backend: En cours de démarrage...
    timeout /t 10 /nobreak >nul
    curl -f http://localhost:3001/health >nul 2>&1
    if errorlevel 1 (
        echo ❌ Backend: ERREUR
        pause
        exit /b 1
    ) else (
        echo ✅ Backend: OK
    )
) else (
    echo ✅ Backend: OK
)

REM Vérifier le frontend
curl -f http://localhost:3000 >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Frontend: En cours de démarrage...
    timeout /t 10 /nobreak >nul
    curl -f http://localhost:3000 >nul 2>&1
    if errorlevel 1 (
        echo ❌ Frontend: ERREUR
        pause
        exit /b 1
    ) else (
        echo ✅ Frontend: OK
    )
) else (
    echo ✅ Frontend: OK
)

REM 8. Afficher les informations de connexion
echo.
echo 🎉 Migration terminée avec succès !
echo ==================================
echo.
echo 📊 Services disponibles:
echo   • Frontend: http://localhost:3000
echo   • Backend:  http://localhost:3001
echo   • PostgreSQL: localhost:5432
echo.
echo 👤 Comptes par défaut:
echo   • Admin: polosko@emynopass.dev / Emynopass2024!
echo   • Demo:  demo@emynopass.dev / demo2024
echo.
echo 🔧 Commandes utiles:
echo   • Voir les logs: docker-compose logs -f
echo   • Arrêter: docker-compose down
echo   • Redémarrer: docker-compose restart
echo.
echo 📁 Fichiers importants:
echo   • Sauvegarde SQLite: data\emynopass.db.backup.*
echo   • Configuration: docker-compose.yml
echo   • Script de migration: scripts\migrate-sqlite-to-postgres.js
echo.

echo ✅ Migration complète terminée !
echo.
pause
