const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'emynopass.db');

console.log('🔍 Vérification de la base SQLite...');
console.log('📁 Chemin:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Erreur connexion SQLite:', err);
    return;
  }
  console.log('✅ Connexion SQLite établie');
});

// Vérifier les tables
db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
  if (err) {
    console.error('❌ Erreur lecture tables:', err);
  } else {
    console.log('📊 Tables trouvées:', rows.length);
    rows.forEach(row => {
      console.log(`  • ${row.name}`);
    });
    
    if (rows.length === 0) {
      console.log('⚠️  Aucune table trouvée - la base est vide');
    }
  }
  
  db.close((err) => {
    if (err) {
      console.error('❌ Erreur fermeture:', err);
    } else {
      console.log('✅ Connexion fermée');
    }
  });
});
