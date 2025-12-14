// Script para crear un usuario de prueba
const http = require('http');

function makePostRequest(path, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          data: responseData
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

async function createTestUser() {
  console.log('👤 Creando usuario de prueba...\n');

  const userData = {
    email: 'test@example.com',
    password: 'password123',
    name: 'Usuario de Prueba'
  };

  try {
    const response = await makePostRequest('/api/v1/auth/register', userData);
    console.log('📝 Respuesta del registro:');
    console.log('Status:', response.statusCode);
    console.log('Data:', response.data);
    
    if (response.statusCode === 201) {
      console.log('\n✅ Usuario creado exitosamente!');
      console.log('📧 Email: test@example.com');
      console.log('🔑 Password: password123');
      console.log('\nPuedes usar estas credenciales para hacer login en la app.');
    } else {
      console.log('\n⚠️ El usuario puede que ya exista o hubo un error.');
    }
  } catch (err) {
    console.log('❌ Error creando usuario:', err.message);
  }
}

createTestUser();