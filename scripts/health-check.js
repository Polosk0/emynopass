const http = require('http');
const https = require('https');

// Couleurs pour la console
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = (message, color = 'reset') => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

// Fonction pour vérifier un service
const checkService = (name, url, timeout = 5000) => {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const req = client.get(url, { timeout }, (res) => {
      const success = res.statusCode >= 200 && res.statusCode < 300;
      resolve({
        name,
        url,
        status: success ? 'OK' : 'ERROR',
        statusCode: res.statusCode,
        message: success ? 'Service accessible' : `HTTP ${res.statusCode}`
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        name,
        url,
        status: 'TIMEOUT',
        message: 'Délai d\'attente dépassé'
      });
    });
    
    req.on('error', (err) => {
      resolve({
        name,
        url,
        status: 'ERROR',
        message: err.message
      });
    });
  });
};

// Services à vérifier
const services = [
  { name: 'Frontend', url: 'http://localhost:3000' },
  { name: 'Backend API', url: 'http://localhost:3001/api/health' },
  { name: 'Backend Root', url: 'http://localhost:3001' }
];

// Fonction principale
async function healthCheck() {
  log('🏥 Vérification de la santé des services...', 'cyan');
  log('', 'reset');
  
  const results = await Promise.all(
    services.map(service => checkService(service.name, service.url))
  );
  
  let allHealthy = true;
  
  results.forEach(result => {
    const statusColor = result.status === 'OK' ? 'green' : 'red';
    const statusIcon = result.status === 'OK' ? '✅' : '❌';
    
    log(`${statusIcon} ${result.name}:`, 'bright');
    log(`   URL: ${result.url}`, 'reset');
    log(`   Status: ${result.status}`, statusColor);
    log(`   Message: ${result.message}`, 'reset');
    
    if (result.statusCode) {
      log(`   Code: ${result.statusCode}`, 'reset');
    }
    
    log('', 'reset');
    
    if (result.status !== 'OK') {
      allHealthy = false;
    }
  });
  
  // Résumé
  log('==========================================', 'cyan');
  if (allHealthy) {
    log('🎉 Tous les services sont opérationnels!', 'green');
    log('', 'reset');
    log('🌐 URLs disponibles:', 'cyan');
    log('   • Application: http://localhost:3000', 'reset');
    log('   • API:         http://localhost:3001', 'reset');
  } else {
    log('⚠️  Certains services ont des problèmes', 'yellow');
    log('', 'reset');
    log('🔧 Solutions possibles:', 'cyan');
    log('   • Vérifiez que Docker est démarré', 'reset');
    log('   • Relancez: npm run dev', 'reset');
    log('   • Vérifiez les logs: npm run docker:logs', 'reset');
  }
  log('==========================================', 'cyan');
  
  process.exit(allHealthy ? 0 : 1);
}

// Vérifier si on doit attendre avant de tester
const waitTime = process.argv[2] ? parseInt(process.argv[2]) : 0;

if (waitTime > 0) {
  log(`⏳ Attente de ${waitTime} secondes avant la vérification...`, 'yellow');
  setTimeout(healthCheck, waitTime * 1000);
} else {
  healthCheck();
}
