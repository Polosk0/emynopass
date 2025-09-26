const fs = require('fs');
const FormData = require('form-data');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testUpload() {
  console.log('🧪 Test d\'upload de gros fichier...');
  
  // Créer un fichier de test de 100MB
  const testFileSize = 100 * 1024 * 1024; // 100MB
  const testFileName = 'test-large-file.bin';
  
  console.log(`📁 Création d'un fichier de test de ${testFileSize / 1024 / 1024}MB...`);
  
  // Créer un fichier de test avec des données aléatoires
  const buffer = Buffer.alloc(testFileSize);
  for (let i = 0; i < buffer.length; i++) {
    buffer[i] = Math.floor(Math.random() * 256);
  }
  
  fs.writeFileSync(testFileName, buffer);
  console.log(`✅ Fichier de test créé: ${testFileName}`);
  
  // Test d'upload
  try {
    const form = new FormData();
    form.append('files', fs.createReadStream(testFileName), {
      filename: testFileName,
      contentType: 'application/octet-stream'
    });
    
    console.log('🚀 Début de l\'upload...');
    const startTime = Date.now();
    
    const response = await fetch('https://emynona.cloud/api/upload/files', {
      method: 'POST',
      body: form,
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk1MTFiNDJhLTRkZWQtNDcwZi1iMDc0LWM3MDkyZDU1Njk0NyIsImVtYWlsIjoicG9sb3Nrb0BlbXlub3Bhc3MuZGV2Iiwicm9sZSI6IkFETUlOIiwiaWF0IjoxNzU4ODYxMjUzLCJleHAiOjE3NTg5NDc2NTN9.4xgsGqPnGyaXtxx20M0ydmsa8_EgTzi_Gg1Kh2PEmd'
      }
    });
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log(`⏱️ Upload terminé en ${duration}s`);
    console.log(`📊 Vitesse: ${(testFileSize / 1024 / 1024 / duration).toFixed(2)} MB/s`);
    console.log(`📈 Status: ${response.status}`);
    
    const result = await response.text();
    console.log('📄 Réponse:', result);
    
    if (response.ok) {
      console.log('✅ Upload réussi !');
    } else {
      console.log('❌ Upload échoué');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'upload:', error.message);
  } finally {
    // Nettoyer le fichier de test
    if (fs.existsSync(testFileName)) {
      fs.unlinkSync(testFileName);
      console.log('🧹 Fichier de test supprimé');
    }
  }
}

// Test de connectivité
async function testConnectivity() {
  console.log('🔍 Test de connectivité...');
  
  try {
    const response = await fetch('https://emynona.cloud/health');
    const result = await response.json();
    console.log('✅ Serveur accessible:', result);
    return true;
  } catch (error) {
    console.error('❌ Serveur inaccessible:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Démarrage des tests d\'upload...\n');
  
  const isConnected = await testConnectivity();
  if (!isConnected) {
    console.log('❌ Impossible de continuer - serveur inaccessible');
    return;
  }
  
  console.log('');
  await testUpload();
}

main().catch(console.error);
