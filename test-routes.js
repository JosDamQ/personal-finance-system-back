// Script simple para probar las rutas del backend
const http = require('http');

// Función para hacer una petición HTTP simple
function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          data: data
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.end();
  });
}

// Probar las rutas
async function testRoutes() {
  console.log('🧪 Probando rutas del backend...\n');

  // Probar ruta principal
  try {
    const homeResponse = await makeRequest('/');
    console.log('✅ GET / ->', homeResponse.statusCode, homeResponse.data);
  } catch (err) {
    console.log('❌ GET / -> Error:', err.message);
  }

  // Probar ruta de categorías (debería dar 401 sin autenticación)
  try {
    const categoriesResponse = await makeRequest('/api/v1/categories');
    console.log('✅ GET /api/v1/categories ->', categoriesResponse.statusCode);
    if (categoriesResponse.statusCode === 401) {
      console.log('   ✅ Correctamente requiere autenticación');
    }
  } catch (err) {
    console.log('❌ GET /api/v1/categories -> Error:', err.message);
  }

  // Probar ruta de auth
  try {
    const authResponse = await makeRequest('/api/v1/auth/login');
    console.log('✅ GET /api/v1/auth/login ->', authResponse.statusCode);
  } catch (err) {
    console.log('❌ GET /api/v1/auth/login -> Error:', err.message);
  }
}

testRoutes();