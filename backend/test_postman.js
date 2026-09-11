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

async function runAcceptanceTests() {
  console.log('================================================================================');
  console.log('🥖 LEÑOS RELLENOS API — VERIFICACIÓN TOTAL DE CRITERIOS DE ACEPTACIÓN');
  console.log('================================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      passed++;
      console.log(`  ✅ [PASS] ${message}`);
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
    }
  }

  // ---------------------------------------------------------------------------
  // 1. OBTENER TOKENS (LOGIN ADMIN Y REGISTRO/LOGIN CLIENTE)
  // ---------------------------------------------------------------------------
  console.log('🔑 PASO 1: Autenticación de Usuarios (Admin y Cliente)...');
  
  // Login Admin
  const adminLogin = await request({
    host: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'admin@lenios.com', password: 'admin123' });
  
  assert(adminLogin.statusCode === 200, 'POST /api/auth/login (admin) devuelve status 200');
  assert(!!adminLogin.body.accessToken, 'Admin recibe JWT firmado');
  assert(adminLogin.body.user?.role === 'admin', 'Rol verificado como "admin"');
  assert(adminLogin.body.user?.password === undefined, 'No expone hash ni contraseña en respuesta JSON');
  const adminToken = adminLogin.body.accessToken;

  // Registro/Login Cliente
  const testClientEmail = `cliente_${Date.now()}@lenios.com`;
  const clientReg = await request({
    host: 'localhost', port: 5000, path: '/api/auth/register', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { name: 'Cliente Valeria', email: testClientEmail, password: 'clientePassword123' });

  assert(clientReg.statusCode === 201, 'POST /api/auth/register (cliente) devuelve status 201');
  assert(!!clientReg.body.accessToken, 'Cliente recibe JWT firmado');
  assert(clientReg.body.user?.role === 'cliente', 'Rol verificado como "cliente"');
  assert(clientReg.body.user?.password === undefined, 'No expone datos sensibles de cliente');
  const clientToken = clientReg.body.accessToken;

  // ---------------------------------------------------------------------------
  // 2. CRITERIO 1: GET /api/products — LISTA TODOS LOS PRODUCTOS CON PAGINACIÓN
  // ---------------------------------------------------------------------------
  console.log('\n📦 CRITERIO 1: GET /api/products — Lista productos con paginación');
  
  const productsAll = await request({
    host: 'localhost', port: 5000, path: '/api/products', method: 'GET'
  });
  assert(productsAll.statusCode === 200, 'GET /api/products devuelve 200 OK');
  assert(Array.isArray(productsAll.body.products), 'Retorna lista de productos');
  assert(productsAll.body.total >= 3, `Total de productos en catálogo: ${productsAll.body.total}`);

  // Paginación: Limit 2, Page 1
  const productsPage1 = await request({
    host: 'localhost', port: 5000, path: '/api/products?page=1&limit=2', method: 'GET'
  });
  assert(productsPage1.statusCode === 200, 'GET /api/products?page=1&limit=2 responde 200 OK');
  assert(productsPage1.body.products.length === 2, 'Paginación limita exactamente a 2 elementos');
  assert(productsPage1.body.page === 1, 'Página actual indicada correctamente (page=1)');
  assert(productsPage1.body.totalPages >= 2, `Total de páginas calculado (${productsPage1.body.totalPages})`);

  // ---------------------------------------------------------------------------
  // 3. CRITERIO 2: GET /api/products/:id — OBTIENE UN PRODUCTO POR ID
  // ---------------------------------------------------------------------------
  console.log('\n🔍 CRITERIO 2: GET /api/products/:id — Obtiene producto por ID');
  
  const sampleProduct = productsAll.body.products[0];
  const prodById = await request({
    host: 'localhost', port: 5000, path: `/api/products/${sampleProduct.id}`, method: 'GET'
  });
  assert(prodById.statusCode === 200, `GET /api/products/${sampleProduct.id} responde 200 OK`);
  assert(prodById.body.product?.id === sampleProduct.id, 'Producto retornado coincide con el ID solicitado');
  assert(prodById.body.product?.name === sampleProduct.name, `Nombre de producto: "${prodById.body.product?.name}"`);

  // Error 404 para ID inexistente
  const prodNotFound = await request({
    host: 'localhost', port: 5000, path: '/api/products/producto-inexistente-xyz', method: 'GET'
  });
  assert(prodNotFound.statusCode === 404, 'GET /api/products/:id inexistente devuelve 404 Not Found');

  // ---------------------------------------------------------------------------
  // 4. CRITERIO 3: GET /api/categories — LISTA TODAS LAS CATEGORÍAS
  // ---------------------------------------------------------------------------
  console.log('\n🏷️ CRITERIO 3: GET /api/categories — Lista todas las categorías');
  
  const categoriesRes = await request({
    host: 'localhost', port: 5000, path: '/api/categories', method: 'GET'
  });
  assert(categoriesRes.statusCode === 200, 'GET /api/categories responde 200 OK');
  assert(Array.isArray(categoriesRes.body.categories), 'Retorna arreglo de categorías');
  assert(categoriesRes.body.count > 0, `Total categorías encontradas: ${categoriesRes.body.count}`);

  // ---------------------------------------------------------------------------
  // 5. CRITERIO 4: GET /api/products?category=:id — FILTRA POR CATEGORÍA
  // ---------------------------------------------------------------------------
  console.log('\n🎯 CRITERIO 4: GET /api/products?category=:id — Filtra productos por categoría');
  
  const categoryToFilter = categoriesRes.body.categories.find(c => c.id !== 'all')?.id || 'gourmet';
  const filteredProds = await request({
    host: 'localhost', port: 5000, path: `/api/products?category=${categoryToFilter}`, method: 'GET'
  });
  assert(filteredProds.statusCode === 200, `GET /api/products?category=${categoryToFilter} responde 200 OK`);
  const allMatchCategory = filteredProds.body.products.every(p => p.category === categoryToFilter);
  assert(allMatchCategory, `Todos los productos retornados pertenecen a la categoría "${categoryToFilter}"`);

  // ---------------------------------------------------------------------------
  // 6. CRITERIO 5: POST /api/products — CREA PRODUCTO (SOLO ADMIN & VALIDACIÓN)
  // ---------------------------------------------------------------------------
  console.log('\n➕ CRITERIO 5: POST /api/products — Crear producto (Solo Admin + Validación)');
  
  // 6.1 Intento como Cliente (Debe rechazar con 403 Forbidden)
  const clientCreateAttempt = await request({
    host: 'localhost', port: 5000, path: '/api/products', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${clientToken}` }
  }, { name: 'Leño No Permitido', price: 80, stock: 10 });
  assert(clientCreateAttempt.statusCode === 403, 'Cliente recibe 403 Forbidden al intentar crear producto');

  // 6.2 Validación estricta: Nombre demasiado corto (< 3 caracteres)
  const invalidNameAttempt = await request({
    host: 'localhost', port: 5000, path: '/api/products', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` }
  }, { name: 'Ab', price: 95, stock: 10 });
  assert(invalidNameAttempt.statusCode === 400, 'Nombre inválido (<3 caracteres) genera 400 Bad Request');

  // 6.3 Validación estricta: Precio <= 0 o inválido
  const invalidPriceAttempt = await request({
    host: 'localhost', port: 5000, path: '/api/products', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` }
  }, { name: 'Leño Precio Inválido', price: -10, stock: 5 });
  assert(invalidPriceAttempt.statusCode === 400, 'Precio inválido (<= 0) genera 400 Bad Request');

  // 6.4 Creación exitosa como Admin
  const newProductData = {
    name: 'Leño Gourmet de Pastor Suizo',
    price: 110.00,
    stock: 25,
    category: 'gourmet',
    badge: '🔥 Gourmet',
    description: 'Carne al pastor con costra de queso gouda y piña asada al horno de leña.',
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80',
    isFeatured: true
  };
  const adminCreateSuccess = await request({
    host: 'localhost', port: 5000, path: '/api/products', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` }
  }, newProductData);
  assert(adminCreateSuccess.statusCode === 201, 'Admin crea producto exitosamente (201 Created)');
  assert(adminCreateSuccess.body.product?.name === newProductData.name, 'Producto creado con datos correctos');
  const createdProductId = adminCreateSuccess.body.product?.id;

  // ---------------------------------------------------------------------------
  // 7. CRITERIO 6: PUT /api/products/:id — ACTUALIZA PRODUCTO (SOLO ADMIN & VALIDACIÓN)
  // ---------------------------------------------------------------------------
  console.log('\n✏️ CRITERIO 6: PUT /api/products/:id — Actualiza producto (Solo Admin + Validación)');

  // 7.1 Intento como Cliente (Debe rechazar con 403 Forbidden)
  const clientUpdateAttempt = await request({
    host: 'localhost', port: 5000, path: `/api/products/${createdProductId}`, method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${clientToken}` }
  }, { price: 50.00 });
  assert(clientUpdateAttempt.statusCode === 403, 'Cliente recibe 403 Forbidden al intentar editar producto');

  // 7.2 Validación estricta en PUT: precio <= 0
  const invalidPutAttempt = await request({
    host: 'localhost', port: 5000, path: `/api/products/${createdProductId}`, method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` }
  }, { price: 0 });
  assert(invalidPutAttempt.statusCode === 400, 'Actualización con precio inválido (0) genera 400 Bad Request');

  // 7.3 Actualización exitosa como Admin
  const adminUpdateSuccess = await request({
    host: 'localhost', port: 5000, path: `/api/products/${createdProductId}`, method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` }
  }, {
    name: 'Leño Gourmet Pastor Suizo Premium',
    price: 119.50,
    stock: 30
  });
  assert(adminUpdateSuccess.statusCode === 200, 'Admin actualiza producto exitosamente (200 OK)');
  assert(adminUpdateSuccess.body.product?.price === 119.50, 'Precio actualizado correctamente a $119.50');
  assert(adminUpdateSuccess.body.product?.name === 'Leño Gourmet Pastor Suizo Premium', 'Nombre actualizado correctamente');

  // ---------------------------------------------------------------------------
  // 8. CRITERIO 7: DELETE /api/products/:id — ELIMINA PRODUCTO (SOLO ADMIN)
  // ---------------------------------------------------------------------------
  console.log('\n🗑️ CRITERIO 7: DELETE /api/products/:id — Elimina producto (Solo Admin)');

  // 8.1 Intento como Cliente (Debe rechazar con 403 Forbidden)
  const clientDeleteAttempt = await request({
    host: 'localhost', port: 5000, path: `/api/products/${createdProductId}`, method: 'DELETE',
    headers: { 'Authorization': `Bearer ${clientToken}` }
  });
  assert(clientDeleteAttempt.statusCode === 403, 'Cliente recibe 403 Forbidden al intentar eliminar producto');

  // 8.2 Eliminación exitosa como Admin
  const adminDeleteSuccess = await request({
    host: 'localhost', port: 5000, path: `/api/products/${createdProductId}`, method: 'DELETE',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert(adminDeleteSuccess.statusCode === 200, 'Admin elimina producto exitosamente (200 OK)');

  // 8.3 Verificar que ya no existe (404 al consultar)
  const checkDeleted = await request({
    host: 'localhost', port: 5000, path: `/api/products/${createdProductId}`, method: 'GET'
  });
  assert(checkDeleted.statusCode === 404, 'Producto eliminado ya no es accesible (404 Not Found)');

  // ---------------------------------------------------------------------------
  // RESUMEN DE RESULTADOS
  // ---------------------------------------------------------------------------
  console.log('\n================================================================================');
  console.log(`📊 RESULTADO FINAL: ${passed}/${total} Pruebas Exitosas (${Math.round((passed/total)*100)}%)`);
  if (passed === total) {
    console.log('🎉 ¡TODOS LOS CRITERIOS DE ACEPTACIÓN SE CUMPLEN AL 100%!');
  } else {
    console.log('⚠️ Hubo fallos en algunas pruebas.');
  }
  console.log('================================================================================\n');
}

runAcceptanceTests().catch(console.error);
