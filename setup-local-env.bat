@echo off
echo Configuration de l'environnement local...

REM Copier le fichier d'exemple
copy env.example .env

REM Modifier les URLs pour le développement local
powershell -Command "(Get-Content .env) -replace 'VITE_API_URL=\"https://emynona.cloud/api\"', 'VITE_API_URL=\"http://localhost:3001/api\"' | Set-Content .env"
powershell -Command "(Get-Content .env) -replace 'FRONTEND_URL=\"https://emynona.cloud\"', 'FRONTEND_URL=\"http://localhost:3000\"' | Set-Content .env"

echo Fichier .env configuré pour le développement local
echo.
echo URLs configurées:
echo - API: http://localhost:3001/api
echo - Frontend: http://localhost:3000
echo.
echo Vous pouvez maintenant démarrer l'application avec: npm run dev
pause
