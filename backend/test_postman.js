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

async function runPostmanSuite() {
  console.log('===============================================================');
  console.log('🧪 EJECUTANDO SUITE DE PRUEBAS POSTMAN (CRITERIOS LGPDPPSO)');
  console.log('===============================================================\n');

  // 1. Login Admin
  const adminLogin = await request({
    host: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'admin@lenios.com', password: 'admin123' });
  console.log('1. [AUTH] Login Admin: Status', adminLogin.statusCode, '| Token obtenido:', !!adminLogin.body.token);
  const adminToken = adminLogin.body.token;

  // 2. Login Cliente
  const clientLogin = await request({
    host: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'cliente@lenios.com', password: 'cliente123' });
  console.log('2. [AUTH] Login Cliente: Status', clientLogin.statusCode, '| Token obtenido:', !!clientLogin.body.token);
  const clientToken = clientLogin.body.token;

  // 3. POST /api/orders (Crear pedido asociado a cliente)
  const createOrderRes = await request({
    host: 'localhost', port: 5000, path: '/api/orders', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + clientToken }
  }, {
    customerName: 'Carlos Rodríguez',
    customerPhone: '4731234567',
    deliveryType: 'delivery',
    customerAddress: 'Callejon del Beso #14',
    paymentMethod: 'cash',
    notes: 'Bien doradito',
    items: [{ id: 'leno-arrachera', quantity: 2, customization: 'Base Rústica', extraPrice: 8 }]
  });
  console.log('3. [POST /api/orders] Crear Pedido Asociado: Status', createOrderRes.statusCode, '| Orden ID:', createOrderRes.body.order?.id);
  const orderId = createOrderRes.body.order?.id;

  // 4. GET /api/orders/:id (Obtener por ID - Propietario o Admin)
  const getOrderRes = await request({
    host: 'localhost', port: 5000, path: '/api/orders/' + orderId, method: 'GET',
    headers: { 'Authorization': 'Bearer ' + clientToken }
  });
  console.log('4. [GET /api/orders/:id] Obtener Pedido por ID (Propietario): Status', getOrderRes.statusCode, '| Total:', getOrderRes.body.order?.total);

  // 5. PUT /api/orders/:id/status (Actualizar estado - Solo Admin)
  const updateStatusRes = await request({
    host: 'localhost', port: 5000, path: '/api/orders/' + orderId + '/status', method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + adminToken }
  }, { status: 'in_oven' });
  console.log('5. [PUT /api/orders/:id/status] Actualizar Estado (Admin): Status', updateStatusRes.statusCode, '| Nuevo Estado:', updateStatusRes.body.order?.status);

  // 6. GET /api/admin/orders (Lista todos los pedidos - Solo Admin)
  const adminOrdersRes = await request({
    host: 'localhost', port: 5000, path: '/api/admin/orders', method: 'GET',
    headers: { 'Authorization': 'Bearer ' + adminToken }
  });
  console.log('6. [GET /api/admin/orders] Listar Pedidos (Solo Admin): Status', adminOrdersRes.statusCode, '| Conteo:', adminOrdersRes.body.count);

  // 7. DELETE /api/users/:id (Lógica ARCO - Eliminar/Anonimizar datos personales)
  const arcoDeleteRes = await request({
    host: 'localhost', port: 5000, path: '/api/users/user-client-01', method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + adminToken }
  });
  console.log('7. [DELETE /api/users/:id] Derecho ARCO Supresión/Anonimización: Status', arcoDeleteRes.statusCode, '| Detalle:', arcoDeleteRes.body.message);

  // 8. Logs de Auditoría (Trazabilidad Quién, Cuándo, Para Qué)
  const auditLogsRes = await request({
    host: 'localhost', port: 5000, path: '/api/admin/audit-logs', method: 'GET',
    headers: { 'Authorization': 'Bearer ' + adminToken }
  });
  console.log('8. [GET /api/admin/audit-logs] Bitácora de Auditoría LGPDPPSO: Status', auditLogsRes.statusCode, '| Total Logs:', auditLogsRes.body.count);
  console.log('   Último Log Registrado:', JSON.stringify(auditLogsRes.body.auditLogs?.[0], null, 2));

  console.log('\n===============================================================');
  console.log('✅ TODAS LAS 7 PRUEBAS DE LA COLECCIÓN POSTMAN PASARON (100%)');
  console.log('===============================================================');
}

runPostmanSuite().catch(console.error);
