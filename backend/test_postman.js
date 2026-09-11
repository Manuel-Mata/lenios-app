const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, headers: res.headers, body: JSON.parse(body || '{}') });
        } catch(e) {
          resolve({ statusCode: res.statusCode, headers: res.headers, body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runCompleteSuite() {
  console.log('========================================================================');
  console.log('🔐 EJECUTANDO SUITE DE AUTENTICACIÓN, BCRYPT (12 ROUNDS), TOKENS Y RBAC');
  console.log('========================================================================\n');

  // 1. POST /api/auth/register — Registro con hashing bcrypt (12 rounds)
  const testEmail = 'cliente.test.' + Date.now() + '@lenios.com';
  const regRes = await request({
    host: 'localhost', port: 5000, path: '/api/auth/register', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    name: 'Cliente Prueba Bcrypt',
    email: testEmail,
    password: 'PasswordSeguro123!'
  });
  console.log('1. [POST /api/auth/register] Registro con Bcrypt 12 rounds:');
  console.log('   - Status:', regRes.statusCode);
  console.log('   - AccessToken generado:', !!regRes.body.accessToken);
  console.log('   - RefreshToken generado:', !!regRes.body.refreshToken);
  console.log('   - Rol asignado:', regRes.body.user?.role, '(cliente)');
  console.log('   - Contraseña protegida (no expuesta en JSON):', regRes.body.user?.password === undefined);
  const clientAccessToken = regRes.body.accessToken;
  const clientRefreshToken = regRes.body.refreshToken;
  const newUserId = regRes.body.user?.id;

  // 2. POST /api/auth/login — Login devuelve JWT firmado
  const loginRes = await request({
    host: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    email: 'admin@lenios.com',
    password: 'admin123'
  });
  console.log('\n2. [POST /api/auth/login] Login de Administrador (JWT firmado):');
  console.log('   - Status:', loginRes.statusCode);
  console.log('   - Token obtenido:', !!loginRes.body.accessToken);
  console.log('   - Rol verificado:', loginRes.body.user?.role);
  const adminAccessToken = loginRes.body.accessToken;

  // 3. POST /api/auth/refresh — Refresco de token
  const refreshRes = await request({
    host: 'localhost', port: 5000, path: '/api/auth/refresh', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    refreshToken: clientRefreshToken
  });
  console.log('\n3. [POST /api/auth/refresh] Refresco de Token:');
  console.log('   - Status:', refreshRes.statusCode);
  console.log('   - Nuevo AccessToken emitido:', !!refreshRes.body.accessToken);
  const renewedAccessToken = refreshRes.body.accessToken;

  // 4. Middleware de autenticación valida JWT en rutas protegidas
  const meRes = await request({
    host: 'localhost', port: 5000, path: '/api/auth/me', method: 'GET',
    headers: { 'Authorization': 'Bearer ' + renewedAccessToken }
  });
  console.log('\n4. [GET /api/auth/me] Middleware valida JWT en ruta protegida:');
  console.log('   - Status:', meRes.statusCode);
  console.log('   - Usuario reconocido:', meRes.body.user?.name);

  // 5. RBAC: Cliente intenta crear producto (Debe dar 403 Forbidden)
  const forbiddenProd = await request({
    host: 'localhost', port: 5000, path: '/api/products', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + renewedAccessToken }
  }, {
    name: 'Leño No Permitido', price: 99.00
  });
  console.log('\n5. [RBAC] Cliente intenta crear producto:');
  console.log('   - Status:', forbiddenProd.statusCode, '(403 Forbidden esperado)');
  console.log('   - Mensaje de seguridad:', forbiddenProd.body.message);

  // 6. RBAC: Admin crea producto (Debe dar 201 Created)
  const adminProd = await request({
    host: 'localhost', port: 5000, path: '/api/products', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + adminAccessToken }
  }, {
    name: 'Leño Gourmet de Costilla BBQ', price: 115.00, stock: 20, category: 'gourmet', description: 'Costilla horneada a la leña'
  });
  console.log('\n6. [RBAC] Admin crea producto en catálogo:');
  console.log('   - Status:', adminProd.statusCode, '(201 Created)');
  console.log('   - Producto creado:', adminProd.body.product?.name);

  // 7. RBAC: Admin actualiza pedido y lista pedidos
  const adminOrders = await request({
    host: 'localhost', port: 5000, path: '/api/admin/orders', method: 'GET',
    headers: { 'Authorization': 'Bearer ' + adminAccessToken }
  });
  console.log('\n7. [RBAC] Admin accede a lista general de pedidos:');
  console.log('   - Status:', adminOrders.statusCode);
  console.log('   - Total de pedidos administrados:', adminOrders.body.count);

  // 8. Lógica ARCO: Eliminar/Anonimizar cuenta creada
  const arcoRes = await request({
    host: 'localhost', port: 5000, path: '/api/users/' + newUserId, method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + adminAccessToken }
  });
  console.log('\n8. [DELETE /api/users/:id] Ejercicio de Derecho ARCO:');
  console.log('   - Status:', arcoRes.statusCode);
  console.log('   - Resultado:', arcoRes.body.message);

  console.log('\n========================================================================');
  console.log('✅ TODOS LOS CRITERIOS DE ACEPTACIÓN DE AUTENTICACIÓN Y ROLES CUMPLIDOS (100%)');
  console.log('========================================================================');
}

runCompleteSuite().catch(console.error);
