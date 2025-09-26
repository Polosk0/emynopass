#!/usr/bin/env node

/**
 * Script de test pour vérifier la migration PostgreSQL
 * Ce script teste la connexion et les fonctionnalités de base
 */

const { Pool } = require('pg');

// Configuration PostgreSQL
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'emynopass',
  user: process.env.DB_USER || 'emynopass',
  password: process.env.DB_PASSWORD || 'emynopass',
};

console.log('🧪 Test de la migration PostgreSQL');
console.log('==================================');
console.log('Configuration:', {
  host: config.host,
  port: config.port,
  database: config.database,
  user: config.user
});

const pool = new Pool(config);

async function testConnection() {
  console.log('\n1️⃣ Test de connexion...');
  try {
    const client = await pool.connect();
    console.log('✅ Connexion PostgreSQL réussie');
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Erreur de connexion:', error.message);
    return false;
  }
}

async function testTables() {
  console.log('\n2️⃣ Test des tables...');
  const client = await pool.connect();
  try {
    const tables = ['users', 'files', 'shares', 'sessions'];
    
    for (const table of tables) {
      const result = await client.query(`
        SELECT COUNT(*) as count FROM ${table}
      `);
      console.log(`✅ Table ${table}: ${result.rows[0].count} enregistrements`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Erreur test tables:', error.message);
    return false;
  } finally {
    client.release();
  }
}

async function testUsers() {
  console.log('\n3️⃣ Test des utilisateurs...');
  const client = await pool.connect();
  try {
    // Test de récupération des utilisateurs
    const users = await client.query(`
      SELECT id, email, name, role, isActive, isDemo 
      FROM users 
      ORDER BY createdAt DESC
    `);
    
    console.log(`✅ ${users.rows.length} utilisateurs trouvés:`);
    users.rows.forEach(user => {
      console.log(`   • ${user.email} (${user.role}) - ${user.isactive ? 'Actif' : 'Inactif'}${user.isdemo ? ' [Démo]' : ''}`);
    });
    
    // Test de l'utilisateur admin
    const admin = await client.query(`
      SELECT * FROM users WHERE email = 'polosko@emynopass.dev'
    `);
    
    if (admin.rows.length > 0) {
      console.log('✅ Compte admin trouvé');
    } else {
      console.log('⚠️  Compte admin non trouvé');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Erreur test utilisateurs:', error.message);
    return false;
  } finally {
    client.release();
  }
}

async function testFiles() {
  console.log('\n4️⃣ Test des fichiers...');
  const client = await pool.connect();
  try {
    const files = await client.query(`
      SELECT f.*, u.email as userEmail 
      FROM files f 
      LEFT JOIN users u ON f.userId = u.id 
      ORDER BY f.uploadedAt DESC 
      LIMIT 5
    `);
    
    console.log(`✅ ${files.rows.length} fichiers trouvés (affichage des 5 derniers):`);
    files.rows.forEach(file => {
      const sizeKB = Math.round(file.size / 1024);
      console.log(`   • ${file.originalname} (${sizeKB} KB) - ${file.useremail || 'Utilisateur inconnu'}`);
    });
    
    return true;
  } catch (error) {
    console.error('❌ Erreur test fichiers:', error.message);
    return false;
  } finally {
    client.release();
  }
}

async function testShares() {
  console.log('\n5️⃣ Test des partages...');
  const client = await pool.connect();
  try {
    const shares = await client.query(`
      SELECT s.*, f.originalName, u.email as userEmail 
      FROM shares s 
      LEFT JOIN files f ON s.fileId = f.id 
      LEFT JOIN users u ON s.userId = u.id 
      ORDER BY s.createdAt DESC 
      LIMIT 5
    `);
    
    console.log(`✅ ${shares.rows.length} partages trouvés (affichage des 5 derniers):`);
    shares.rows.forEach(share => {
      console.log(`   • ${share.originalname || 'Fichier supprimé'} - Token: ${share.token.substring(0, 8)}... - ${share.downloads} téléchargements`);
    });
    
    return true;
  } catch (error) {
    console.error('❌ Erreur test partages:', error.message);
    return false;
  } finally {
    client.release();
  }
}

async function testPerformance() {
  console.log('\n6️⃣ Test de performance...');
  const client = await pool.connect();
  try {
    const start = Date.now();
    
    // Test de requête complexe
    await client.query(`
      SELECT 
        u.email,
        COUNT(f.id) as fileCount,
        COALESCE(SUM(f.size), 0) as totalSize,
        COUNT(s.id) as shareCount
      FROM users u
      LEFT JOIN files f ON u.id = f.userId
      LEFT JOIN shares s ON u.id = s.userId
      GROUP BY u.id, u.email
      ORDER BY totalSize DESC
    `);
    
    const duration = Date.now() - start;
    console.log(`✅ Requête complexe exécutée en ${duration}ms`);
    
    if (duration < 1000) {
      console.log('✅ Performance excellente');
    } else if (duration < 5000) {
      console.log('⚠️  Performance acceptable');
    } else {
      console.log('❌ Performance lente');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Erreur test performance:', error.message);
    return false;
  } finally {
    client.release();
  }
}

async function testBackendAPI() {
  console.log('\n7️⃣ Test de l'API backend...');
  try {
    const http = require('http');
    
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/health',
      method: 'GET'
    };
    
    return new Promise((resolve) => {
      const req = http.request(options, (res) => {
        if (res.statusCode === 200) {
          console.log('✅ API backend accessible');
          resolve(true);
        } else {
          console.log(`❌ API backend erreur: ${res.statusCode}`);
          resolve(false);
        }
      });
      
      req.on('error', (error) => {
        console.log('❌ API backend inaccessible:', error.message);
        resolve(false);
      });
      
      req.setTimeout(5000, () => {
        console.log('❌ API backend timeout');
        req.destroy();
        resolve(false);
      });
      
      req.end();
    });
  } catch (error) {
    console.error('❌ Erreur test API:', error.message);
    return false;
  }
}

async function main() {
  const tests = [
    { name: 'Connexion', fn: testConnection },
    { name: 'Tables', fn: testTables },
    { name: 'Utilisateurs', fn: testUsers },
    { name: 'Fichiers', fn: testFiles },
    { name: 'Partages', fn: testShares },
    { name: 'Performance', fn: testPerformance },
    { name: 'API Backend', fn: testBackendAPI }
  ];
  
  let passed = 0;
  let total = tests.length;
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      }
    } catch (error) {
      console.error(`❌ Erreur dans le test ${test.name}:`, error.message);
    }
  }
  
  console.log('\n📊 Résumé des tests');
  console.log('==================');
  console.log(`✅ Tests réussis: ${passed}/${total}`);
  console.log(`❌ Tests échoués: ${total - passed}/${total}`);
  
  if (passed === total) {
    console.log('\n🎉 Tous les tests sont passés ! La migration est réussie.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Certains tests ont échoué. Vérifiez les erreurs ci-dessus.');
    process.exit(1);
  }
}

// Gestion des erreurs non capturées
process.on('unhandledRejection', (error) => {
  console.error('❌ Erreur non gérée:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Exception non capturée:', error);
  process.exit(1);
});

// Exécuter les tests
main().catch((error) => {
  console.error('❌ Erreur principale:', error);
  process.exit(1);
}).finally(() => {
  pool.end();
});
