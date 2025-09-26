#!/bin/bash

# Script pour corriger l'erreur Cloudflare 521
echo "🌐 Correction de l'erreur Cloudflare 521"
echo "======================================="

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 1. Vérifier que les services locaux fonctionnent
echo ""
log_info "1. Vérification des services locaux"

if curl -f http://localhost:3000 >/dev/null 2>&1; then
    log_success "Frontend local: OK"
else
    log_error "Frontend local: ERREUR"
    echo "Le frontend doit fonctionner localement avant de configurer Cloudflare"
    exit 1
fi

if curl -f http://localhost:3001/health >/dev/null 2>&1; then
    log_success "Backend local: OK"
else
    log_error "Backend local: ERREUR"
    echo "Le backend doit fonctionner localement avant de configurer Cloudflare"
    exit 1
fi

# 2. Vérifier la configuration Nginx
echo ""
log_info "2. Vérification de la configuration Nginx"

if [ -f "docker/nginx-production.conf" ]; then
    log_success "Configuration Nginx production trouvée"
    cat docker/nginx-production.conf
else
    log_warning "Configuration Nginx production manquante"
fi

# 3. Vérifier les ports ouverts
echo ""
log_info "3. Vérification des ports ouverts"
netstat -tlnp | grep -E ':(80|443|3000|3001)'

# 4. Vérifier le firewall
echo ""
log_info "4. Vérification du firewall"
if command -v ufw >/dev/null 2>&1; then
    ufw status
elif command -v firewall-cmd >/dev/null 2>&1; then
    firewall-cmd --list-all
else
    log_warning "Aucun firewall détecté"
fi

# 5. Instructions pour Cloudflare
echo ""
log_info "5. Instructions pour corriger Cloudflare 521"
echo ""
echo "🔧 Étapes à suivre dans Cloudflare:"
echo ""
echo "1. Vérifiez que votre domaine pointe vers l'IP de votre VPS"
echo "2. Dans Cloudflare DNS, assurez-vous que:"
echo "   • Type: A"
echo "   • Name: @ (ou votre sous-domaine)"
echo "   • Content: IP_DE_VOTRE_VPS"
echo "   • Proxy status: Proxied (nuage orange)"
echo ""
echo "3. Dans Cloudflare SSL/TLS:"
echo "   • Mode: Full (strict)"
echo "   • Edge Certificates: activé"
echo ""
echo "4. Dans Cloudflare Page Rules (si nécessaire):"
echo "   • Ajoutez une règle pour forcer HTTPS"
echo ""
echo "5. Vérifiez que votre serveur écoute sur le port 80 et 443:"
echo "   • Port 80: pour HTTP"
echo "   • Port 443: pour HTTPS (si configuré)"
echo ""

# 6. Test de connectivité externe
echo ""
log_info "6. Test de connectivité externe"
echo "Testez ces commandes depuis un autre serveur:"
echo "curl -I http://VOTRE_IP_VPS"
echo "curl -I http://VOTRE_DOMAINE"
echo ""

# 7. Configuration Nginx recommandée
echo ""
log_info "7. Configuration Nginx recommandée pour Cloudflare"
cat << 'EOF' > docker/nginx-cloudflare.conf
server {
    listen 80;
    server_name _;
    
    # Logs
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;
    
    # Frontend
    location / {
        proxy_pass http://frontend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://backend:3001/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Health check
    location /health {
        proxy_pass http://backend:3001/health;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Uploads
    location /uploads/ {
        alias /var/www/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

log_success "Configuration Nginx Cloudflare créée: docker/nginx-cloudflare.conf"

echo ""
log_info "Correction Cloudflare 521 terminée"
echo "===================================="
echo ""
echo "📋 Prochaines étapes:"
echo "1. Utilisez la configuration Nginx créée"
echo "2. Redémarrez les services: docker-compose restart nginx"
echo "3. Vérifiez les logs: docker-compose logs nginx"
echo "4. Testez depuis l'extérieur: curl -I http://VOTRE_DOMAINE"
echo ""


