const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function getToken() {
  try {
    console.log('🔐 Connexion pour obtenir un token...');
    
    const response = await fetch('https://emynona.cloud/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'polosko@emynopass.dev',
        password: 'Emynopass2024!'
      })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Connexion réussie !');
      console.log('🔑 Token:', result.token);
      return result.token;
    } else {
      console.error('❌ Erreur de connexion:', result);
      return null;
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    return null;
  }
}

getToken();
