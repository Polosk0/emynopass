#!/bin/bash
echo '🔍 DIAGNOSTIC PARTAGES - EMYNOPASS'
echo '=================================='
echo ''

# Vérifier le statut des services
echo '📊 Statut des services:'
docker-compose ps
echo ''

# Vérifier les logs backend récents
echo '📄 Logs backend (dernières 50 lignes):'
docker-compose logs --tail=50 backend
echo ''

# Vérifier le schéma de la table shares
echo '📋 Schéma table shares:'
docker-compose exec postgres psql -U emynopass -d emynopass -c "\d shares" || echo 'Erreur schéma shares'
echo ''

# Vérifier les partages existants
echo '🔗 Partages existants:'
docker-compose exec postgres psql -U emynopass -d emynopass -c "SELECT id, token, isActive, createdAt FROM shares ORDER BY createdAt DESC LIMIT 10;" || echo 'Erreur requête partages'
echo ''

# Vérifier les logs d'erreur spécifiques
echo '❌ Logs d'erreur récents:'
docker-compose logs --tail=100 backend | grep -i error || echo 'Aucune erreur récente'
echo ''

echo '🎯 DIAGNOSTIC PARTAGES TERMINÉ'
