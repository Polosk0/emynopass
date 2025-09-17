const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('🔧 Configuration de l\'environnement...');

// Générer des clés sécurisées
const generateSecret = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// Lire le fichier exemple
const envExamplePath = path.join(__dirname, '..', 'env.example');
const envPath = path.join(__dirname, '..', '.env');

if (fs.existsSync(envPath)) {
  console.log('⚠️  Le fichier .env existe déjà');
  process.exit(0);
}

if (!fs.existsSync(envExamplePath)) {
  console.error('❌ Fichier env.example introuvable');
  process.exit(1);
}

// Lire le contenu du fichier exemple
let envContent = fs.readFileSync(envExamplePath, 'utf8');

// Remplacer les valeurs par défaut par des valeurs générées
const replacements = {
  'your-super-secret-jwt-key-change-this-in-production': generateSecret(64),
  'your-32-character-encryption-key-here': generateSecret(32),
  'your-email@gmail.com': 'admin@fileshare.local',
  'your-app-password': generateSecret(16)
};

Object.entries(replacements).forEach(([placeholder, replacement]) => {
  envContent = envContent.replace(placeholder, replacement);
});

// Écrire le fichier .env
fs.writeFileSync(envPath, envContent);

console.log('✅ Fichier .env créé avec des clés sécurisées');
console.log('📝 Vous pouvez maintenant éditer .env selon vos besoins');

// Créer les dossiers nécessaires
const directories = [
  'uploads',
  'logs',
  'backups',
  'backend/logs'
];

directories.forEach(dir => {
  const dirPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`📁 Dossier créé: ${dir}`);
  }
});

console.log('🎉 Configuration terminée!');
