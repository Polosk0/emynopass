const sqlite3 = require('sqlite3');
const path = require('path');
const fs = require('fs');

console.log('🔧 [TEST] Test simple de la base de données...');

// Utiliser le même chemin que dans Docker
const dbPath = '/app/data/emynopass.db';
const dataDir = path.dirname(dbPath);

console.log('🔧 [TEST] Chemin de la base de données:', dbPath);
console.log('🔧 [TEST] Dossier de données:', dataDir);

// Créer le dossier s'il n'existe pas
if (!fs.existsSync(dataDir)) {
    console.log('🔧 [TEST] Création du dossier de données...');
    fs.mkdirSync(dataDir, { recursive: true });
}

console.log('🔧 [TEST] Connexion à SQLite...');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ [TEST] Erreur connexion SQLite:', err);
        process.exit(1);
    }
    console.log('✅ [TEST] Connexion SQLite établie');
});

// Test de connectivité
console.log('🔧 [TEST] Test de connectivité...');
db.get('SELECT 1', (err) => {
    if (err) {
        console.error('❌ [TEST] Erreur test connectivité:', err);
        process.exit(1);
    }
    console.log('✅ [TEST] Connexion SQLite testée avec succès');
    
    // Test de création de table simple
    console.log('🔧 [TEST] Création d\'une table de test...');
    db.run(`
        CREATE TABLE IF NOT EXISTS test_table (
            id INTEGER PRIMARY KEY,
            name TEXT
        )
    `, (err) => {
        if (err) {
            console.error('❌ [TEST] Erreur création table test:', err);
            process.exit(1);
        }
        console.log('✅ [TEST] Table de test créée avec succès');
        
        // Test d'insertion
        console.log('🔧 [TEST] Insertion de données de test...');
        db.run('INSERT INTO test_table (name) VALUES (?)', ['test'], (err) => {
            if (err) {
                console.error('❌ [TEST] Erreur insertion:', err);
                process.exit(1);
            }
            console.log('✅ [TEST] Insertion réussie');
            
            // Fermer la connexion
            db.close((err) => {
                if (err) {
                    console.error('❌ [TEST] Erreur fermeture:', err);
                } else {
                    console.log('✅ [TEST] Test terminé avec succès');
                }
                process.exit(0);
            });
        });
    });
});

// Timeout de sécurité
setTimeout(() => {
    console.error('❌ [TEST] Timeout - le test prend trop de temps');
    process.exit(1);
}, 10000);
