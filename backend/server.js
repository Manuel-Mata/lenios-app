const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getDb, saveDb } = require('./config/db');

const PORT = process.env.PORT || 5000;
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
const JWT_SECRET = process.env.JWT_SECRET || 'lenios_rellenos_super_secret_jwt_key_2026';

// Almacén de sesiones en memoria
const sessionStore = new Map();

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp'
};

function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str) {
  let output = str.replace(/-/g, '+').replace(/_/g, '/');
  while (output.length % 4) {
    output += '=';
  }
  return Buffer.from(output, 'base64').toString();
}

function signJwt(payload, expiresInSeconds = 86400) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const fullPayload = { ...payload, exp };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function verifyJwt(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, signature] = parts;
  const expectedSig = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  if (signature !== expectedSig) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch (e) {
    return null;
  }
}

function parseCookies(req) {
  const list = {};
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    const name = parts.shift()?.trim();
    if (!name) return;
    const val = parts.join('=').trim();
    list[name] = decodeURIComponent(val);
  });
  return list;
}

function getAuthenticatedUser(req) {
  const cookies = parseCookies(req);
  let token = cookies.token;

  if (!token && req.headers.authorization) {
    const authParts = req.headers.authorization.split(' ');
    if (authParts.length === 2 && authParts[0].toLowerCase() === 'bearer') {
      token = authParts[1];
    }
  }

  if (!token) return null;
  return verifyJwt(token);
}

function logAudit(req, user, action, purpose, resource = '') {
  const db = getDb();
  if (!db.auditLogs) db.auditLogs = [];

  const auditEntry = {
    id: 'audit-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    timestamp: new Date().toISOString(),
    who: {
      userId: user ? user.id : 'anonymous',
      userName: user ? user.name : 'Invitado',
      role: user ? user.role : 'guest',
      ip: req.socket.remoteAddress || '127.0.0.1'
    },
    when: new Date().toISOString(),
    action: action, // e.g. "READ_ORDER", "UPDATE_ORDER_STATUS", "ARCO_ANONYMIZE_USER", "LIST_ADMIN_ORDERS"
    purpose: purpose, // e.g. "Cumplimiento LGPDPPSO / Gestión Operativa", "Consulta de pedido de cliente"
    resource: resource
  };

  db.auditLogs.unshift(auditEntry);
  if (db.auditLogs.length > 500) db.auditLogs.pop();
  saveDb();
  return auditEntry;
}

function getOrCreateSession(req, res) {
  const cookies = parseCookies(req);
  let sessionId = cookies.sessionId;
  let session = sessionId ? sessionStore.get(sessionId) : null;
  let isNew = false;

  if (!session) {
    sessionId = crypto.randomUUID();
    session = {
      id: sessionId,
      cart: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    sessionStore.set(sessionId, session);
    isNew = true;
  } else {
    session.updatedAt = new Date().toISOString();
  }

  // Establecer cookie con atributos Secure, HttpOnly y SameSite=Strict
  if (isNew || !cookies.sessionId) {
    const cookieHeader = `sessionId=${sessionId}; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=86400`;
    res.setHeader('Set-Cookie', cookieHeader);
  }

  return session;
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
  });
}

function getCorsHeaders(req) {
  const origin = req.headers.origin || '*';
  return {
    'Access-Control-Allow-Origin': origin === '*' ? '*' : origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie, X-Requested-With'
  };
}

function sendJson(res, statusCode, data, req = null, customHeaders = {}) {
  const corsHeaders = req ? getCorsHeaders(req) : {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie'
  };

  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=UTF-8',
    ...corsHeaders,
    ...customHeaders
  });
  res.end(JSON.stringify(data));
}

function serveStatic(res, filePath, req) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=UTF-8' });
        res.end('500 Server Error');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
}

const server = http.createServer(async (req, res) => {
  res.req = req;
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  const method = req.method.toUpperCase();

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, getCorsHeaders(req));
    return res.end();
  }

  console.log(`[${new Date().toLocaleTimeString()}] ${method} ${pathname}`);

  // Rutas API
  if (pathname.startsWith('/api/')) {
    const session = getOrCreateSession(req, res);
    const authUser = getAuthenticatedUser(req);
    const db = getDb();

    if (!db.users) {
      db.users = [
        { id: 'user-admin-01', name: 'Administrador Leños', email: 'admin@lenios.com', password: 'admin123', role: 'admin' },
        { id: 'user-client-01', name: 'Carlos Rodríguez', email: 'cliente@lenios.com', password: 'cliente123', role: 'customer' }
      ];
    }

    // 0. Autenticación (Auth)
    if (pathname === '/api/auth/login' && method === 'POST') {
      const body = await parseBody(req);
      const email = (body.email || '').toLowerCase().trim();
      const password = (body.password || '').trim();

      if (!email || !password) {
        return sendJson(res, 400, { success: false, message: 'Correo y contraseña requeridos' }, req);
      }

      const user = db.users.find(u => u.email.toLowerCase() === email && u.password === password);
      if (!user) {
        return sendJson(res, 401, { success: false, message: 'Credenciales inválidas. Verifica tu correo y contraseña.' }, req);
      }

      const userPayload = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      };
      const token = signJwt(userPayload, 86400);
      const cookieHeader = `token=${token}; HttpOnly; Path=/; SameSite=Strict; Secure; Max-Age=86400`;

      logAudit(req, userPayload, 'LOGIN_SUCCESS', 'Inicio de sesión de usuario', `User: ${user.id}`);

      return sendJson(res, 200, {
        success: true,
        message: 'Inicio de sesión exitoso',
        token,
        user: userPayload // Respuestas JSON NO exponen contraseñas ni hashes
      }, req, { 'Set-Cookie': cookieHeader });
    }

    if (pathname === '/api/auth/me' && method === 'GET') {
      if (!authUser) {
        return sendJson(res, 401, { success: false, message: 'No hay sesión activa o el token ha expirado' }, req);
      }

      logAudit(req, authUser, 'GET_ME', 'Consulta de perfil de usuario autenticado');

      return sendJson(res, 200, {
        success: true,
        user: {
          id: authUser.id,
          name: authUser.name,
          email: authUser.email,
          role: authUser.role
        }
      }, req);
    }

    if (pathname === '/api/auth/logout' && method === 'POST') {
      if (authUser) logAudit(req, authUser, 'LOGOUT', 'Cierre de sesión de usuario');
      const cookieHeader = `token=; HttpOnly; Path=/; SameSite=Strict; Secure; Max-Age=0`;
      return sendJson(res, 200, { success: true, message: 'Sesión cerrada correctamente' }, req, { 'Set-Cookie': cookieHeader });
    }

    // 1. Health & Session Check
    if (pathname === '/api/health') {
      return sendJson(res, 200, {
        status: 'online',
        app: 'Leños Rellenos API',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        sessionId: session.id
      }, req);
    }

    // 2. Session Management Endpoint
    if (pathname === '/api/session') {
      if (method === 'GET') {
        return sendJson(res, 200, {
          success: true,
          sessionId: session.id,
          cart: session.cart || []
        }, req);
      }
    }

    if (pathname === '/api/session/cart') {
      if (method === 'GET') {
        return sendJson(res, 200, {
          success: true,
          cart: session.cart || []
        }, req);
      }

      if (method === 'POST' || method === 'PUT') {
        const body = await parseBody(req);
        if (Array.isArray(body.items)) {
          session.cart = body.items.map(item => ({
            id: String(item.id || ''),
            cartItemId: String(item.cartItemId || `${item.id}-${(item.customization || '').replace(/\s+/g, '')}`),
            quantity: Math.max(1, parseInt(item.quantity) || 1),
            customization: String(item.customization || ''),
            extraPrice: Math.max(0, parseFloat(item.extraPrice) || 0)
          }));
          sessionStore.set(session.id, session);
        }
        return sendJson(res, 200, {
          success: true,
          cart: session.cart
        }, req);
      }
    }

    // 3. Products
    if (pathname === '/api/products') {
      if (method === 'GET') {
        const category = parsedUrl.searchParams.get('category');
        const featured = parsedUrl.searchParams.get('featured');
        let filtered = [...db.products];

        if (category && category !== 'all') {
          filtered = filtered.filter(p => p.category === category);
        }
        if (featured === 'true') {
          filtered = filtered.filter(p => p.isFeatured);
        }

        return sendJson(res, 200, {
          success: true,
          count: filtered.length,
          products: filtered,
          categories: db.categories,
          customizerOptions: db.customizerOptions
        }, req);
      }
    }

    // 4. Admin Orders: GET /api/admin/orders (Solo Admin - Criterio LGPDPPSO)
    if (pathname === '/api/admin/orders' && method === 'GET') {
      if (!authUser || authUser.role !== 'admin') {
        logAudit(req, authUser, 'UNAUTHORIZED_ACCESS_ATTEMPT', 'Intento no autorizado de listar pedidos administrativos', 'GET /api/admin/orders');
        return sendJson(res, 403, {
          success: false,
          message: 'Acceso denegado. Se requieren privilegios de administrador para consultar el registro general de pedidos.'
        }, req);
      }

      logAudit(req, authUser, 'LIST_ADMIN_ORDERS', 'Gestión y control operativo de pedidos (Admin)', 'All Orders');

      return sendJson(res, 200, {
        success: true,
        count: (db.orders || []).length,
        orders: db.orders || []
      }, req);
    }

    // 5. Audit Logs: GET /api/admin/audit-logs (Solo Admin - LGPDPPSO)
    if (pathname === '/api/admin/audit-logs' && method === 'GET') {
      if (!authUser || authUser.role !== 'admin') {
        return sendJson(res, 403, {
          success: false,
          message: 'Acceso denegado. Solo administradores pueden consultar los registros de auditoría LGPDPPSO.'
        }, req);
      }

      logAudit(req, authUser, 'READ_AUDIT_LOGS', 'Revisión de bitácora de trazabilidad y accesos LGPDPPSO');

      return sendJson(res, 200, {
        success: true,
        count: (db.auditLogs || []).length,
        auditLogs: db.auditLogs || []
      }, req);
    }

    // 6. Orders: POST /api/orders (Crear pedido asociado a cliente)
    if (pathname === '/api/orders') {
      if (method === 'GET') {
        // Si es admin devuelve todo, si es usuario autenticado devuelve sus pedidos
        if (authUser && authUser.role === 'admin') {
          logAudit(req, authUser, 'GET_ALL_ORDERS', 'Consulta global de pedidos');
          return sendJson(res, 200, { success: true, count: db.orders.length, orders: db.orders }, req);
        } else if (authUser) {
          const userOrders = (db.orders || []).filter(o => o.userId === authUser.id || o.sessionId === session.id);
          logAudit(req, authUser, 'GET_USER_ORDERS', 'Consulta de pedidos propios del cliente');
          return sendJson(res, 200, { success: true, count: userOrders.length, orders: userOrders }, req);
        }
        return sendJson(res, 200, { success: true, count: db.orders.length, orders: db.orders }, req);
      }

      if (method === 'POST') {
        const body = await parseBody(req);
        const { customerName, customerPhone, customerAddress, deliveryType, paymentMethod, items, notes } = body;

        if (!customerName || !customerPhone || !items || !Array.isArray(items) || items.length === 0) {
          return sendJson(res, 400, { success: false, message: 'Datos incompletos del pedido' }, req);
        }

        let subtotal = 0;
        const verifiedItems = [];

        for (const item of items) {
          const prod = db.products.find(p => p.id === item.id);
          if (!prod) {
            return sendJson(res, 400, {
              success: false,
              message: `El producto con ID '${item.id}' no existe en el catálogo.`
            }, req);
          }

          const qty = Math.max(1, parseInt(item.quantity) || 1);
          const extraPrice = Math.max(0, parseFloat(item.extraPrice) || 0);
          const unitPrice = parseFloat(prod.price) + extraPrice;
          subtotal += unitPrice * qty;

          verifiedItems.push({
            id: prod.id,
            name: prod.name,
            price: unitPrice,
            basePrice: prod.price,
            extraPrice: extraPrice,
            quantity: qty,
            customization: item.customization || '',
            image: prod.image
          });
        }

        const isDelivery = deliveryType === 'delivery';
        const deliveryCost = isDelivery ? (db.business.deliveryCost || 25.00) : 0;
        const total = subtotal + deliveryCost;
        const orderId = `LR-${Math.floor(10000 + Math.random() * 90000)}`;

        const newOrder = {
          id: orderId,
          userId: authUser ? authUser.id : null,
          sessionId: session.id,
          customerName: String(customerName).trim(),
          customerPhone: String(customerPhone).trim(),
          customerAddress: isDelivery ? (String(customerAddress || '').trim() || 'Dirección no especificada') : 'Recoger en Sucursal',
          deliveryType: isDelivery ? 'delivery' : 'pickup',
          paymentMethod: paymentMethod === 'transfer' ? 'transfer' : 'cash',
          notes: String(notes || '').trim(),
          items: verifiedItems,
          subtotal: parseFloat(subtotal.toFixed(2)),
          deliveryCost: parseFloat(deliveryCost.toFixed(2)),
          total: parseFloat(total.toFixed(2)),
          status: 'received',
          createdAt: new Date().toISOString()
        };

        // Descontar inventario
        verifiedItems.forEach(orderItem => {
          const prod = db.products.find(p => p.id === orderItem.id);
          if (prod && prod.stock > 0) {
            prod.stock = Math.max(0, prod.stock - orderItem.quantity);
            if (prod.stock === 0) prod.available = false;
          }
        });

        if (!db.orders) db.orders = [];
        db.orders.unshift(newOrder);
        saveDb();

        session.cart = [];
        sessionStore.set(session.id, session);

        logAudit(req, authUser, 'CREATE_ORDER', 'Registro de nuevo pedido de cliente', `Order #${orderId}`);

        let waItemsText = verifiedItems.map(i => `• ${i.quantity}x ${i.name} ($${(i.price * i.quantity).toFixed(2)})${i.customization ? ` [${i.customization}]` : ''}`).join('\n');
        const waMessage = `🪵 *NUEVO PEDIDO LEÑOS RELLENOS* 🪵\n\n` +
          `📋 *Orden:* #${orderId}\n` +
          `👤 *Cliente:* ${newOrder.customerName}\n` +
          `📱 *Teléfono:* ${newOrder.customerPhone}\n` +
          `📍 *Entrega:* ${isDelivery ? 'A Domicilio' : 'Recoger en Local'}\n` +
          `🏠 *Dirección:* ${newOrder.customerAddress}\n` +
          `💳 *Pago:* ${newOrder.paymentMethod === 'cash' ? 'Efectivo al recibir' : 'Transferencia / SPEI'}\n` +
          (newOrder.notes ? `📝 *Notas:* ${newOrder.notes}\n` : '') +
          `\n🛒 *PRODUCTOS:*\n${waItemsText}\n\n` +
          `💵 *Subtotal:* $${subtotal.toFixed(2)}\n` +
          `🛵 *Envío:* $${deliveryCost.toFixed(2)}\n` +
          `💰 *TOTAL A PAGAR: $${total.toFixed(2)}*\n\n` +
          `_¡Muchas gracias por su preferencia!_`;

        const currentWa = (process.env.WHATSAPP_NUMBER || process.env.BUSINESS_WHATSAPP || db.business?.whatsappFormatted || '523751837635').replace(/\D/g, '');
        const waUrl = `https://api.whatsapp.com/send?phone=${currentWa}&text=${encodeURIComponent(waMessage)}`;

        return sendJson(res, 201, {
          success: true,
          order: newOrder,
          whatsappUrl: waUrl,
          whatsappMessage: waMessage
        }, req);
      }
    }

    // 7. Update order status: PUT /api/orders/:id/status o PATCH /api/orders/:id/status (Solo Admin)
    const orderStatusMatch = pathname.match(/^\/api\/orders\/([^\/]+)\/status$/);
    if (orderStatusMatch && (method === 'PUT' || method === 'PATCH')) {
      const orderId = orderStatusMatch[1];
      const body = await parseBody(req);
      const validStatuses = ['received', 'in_oven', 'on_the_way', 'delivered', 'cancelled'];

      if (!authUser || authUser.role !== 'admin') {
        logAudit(req, authUser, 'UNAUTHORIZED_UPDATE_STATUS', `Intento no autorizado de cambiar estado de orden #${orderId}`, `Order #${orderId}`);
        return sendJson(res, 403, {
          success: false,
          message: 'Acceso denegado. Solo administradores pueden actualizar el estado de los pedidos.'
        }, req);
      }

      if (!validStatuses.includes(body.status)) {
        return sendJson(res, 400, {
          success: false,
          message: `Estado no válido. Estados permitidos: ${validStatuses.join(', ')}`
        }, req);
      }

      const order = (db.orders || []).find(o => o.id.toUpperCase() === orderId.toUpperCase());
      if (!order) return sendJson(res, 404, { success: false, message: 'Pedido no encontrado' }, req);

      const oldStatus = order.status;
      order.status = body.status;
      order.updatedAt = new Date().toISOString();
      saveDb();

      logAudit(req, authUser, 'UPDATE_ORDER_STATUS', `Actualización de estado de pedido de ${oldStatus} a ${body.status}`, `Order #${orderId}`);

      return sendJson(res, 200, {
        success: true,
        message: 'Estado del pedido actualizado correctamente',
        order
      }, req);
    }

    // 8. Get order by ID: GET /api/orders/:id (Solo propietario o Admin - Criterio LGPDPPSO)
    const getOrderMatch = pathname.match(/^\/api\/orders\/([^\/]+)$/);
    if (getOrderMatch && method === 'GET') {
      const orderId = getOrderMatch[1];
      const order = (db.orders || []).find(o => o.id.toUpperCase() === orderId.toUpperCase());

      if (!order) {
        return sendJson(res, 404, { success: false, message: 'Pedido no encontrado' }, req);
      }

      // Verificación de propiedad: Propietario por userId, sessionId o Admin
      const isOwner = (authUser && order.userId && order.userId === authUser.id) ||
                      (order.sessionId && order.sessionId === session.id) ||
                      (!authUser && !order.userId); // Permitir seguimiento público por token de tracking
      const isAdmin = authUser && authUser.role === 'admin';

      if (!isOwner && !isAdmin) {
        logAudit(req, authUser, 'UNAUTHORIZED_ORDER_VIEW', `Intento no autorizado de consultar pedido #${orderId}`, `Order #${orderId}`);
        return sendJson(res, 403, {
          success: false,
          message: 'Acceso denegado. Solo el titular del pedido o un administrador pueden acceder a esta información.'
        }, req);
      }

      logAudit(req, authUser, 'READ_ORDER_DETAIL', 'Consulta de detalle de pedido', `Order #${orderId}`);

      return sendJson(res, 200, { success: true, order }, req);
    }

    // 9. Derechos ARCO: DELETE /api/users/:id (Elimina / Anonimiza datos del usuario por LGPDPPSO)
    const deleteUserMatch = pathname.match(/^\/api\/users\/([^\/]+)$/);
    if (deleteUserMatch && method === 'DELETE') {
      const targetUserId = deleteUserMatch[1];

      // Verificación: Solo el propio usuario o un admin puede ejercer derecho de Cancelación/Supresión
      const isSelf = authUser && authUser.id === targetUserId;
      const isAdmin = authUser && authUser.role === 'admin';

      if (!authUser || (!isSelf && !isAdmin)) {
        logAudit(req, authUser, 'UNAUTHORIZED_ARCO_REQUEST', `Intento no autorizado de ejercer derecho ARCO sobre usuario ${targetUserId}`, `User: ${targetUserId}`);
        return sendJson(res, 403, {
          success: false,
          message: 'Acceso denegado. Se requiere autenticación del titular o administrador para ejercer derechos ARCO.'
        }, req);
      }

      const userIndex = (db.users || []).findIndex(u => u.id === targetUserId);
      if (userIndex === -1) {
        return sendJson(res, 404, { success: false, message: 'Usuario no encontrado en los registros' }, req);
      }

      const targetUser = db.users[userIndex];

      // Anonimizar pedidos asociados para conservar trazabilidad fiscal/operativa sin datos personales
      let anonymizedOrdersCount = 0;
      (db.orders || []).forEach(o => {
        if (o.userId === targetUserId || o.customerPhone === targetUser.email) {
          o.customerName = '[DATO ANONIMIZADO POR DERECHO ARCO]';
          o.customerPhone = '0000000000';
          o.customerAddress = '[DIRECCIÓN SUPRIMIDA CONFORME A LGPDPPSO]';
          o.notes = '[NOTAS ELIMINADAS]';
          anonymizedOrdersCount++;
        }
      });

      // Eliminar registro del usuario
      db.users.splice(userIndex, 1);
      saveDb();

      logAudit(req, authUser, 'ARCO_DATA_ERASURE', 'Ejercicio de Derecho ARCO: Cancelación y Supresión de Datos Personales conforme a LGPDPPSO', `User ${targetUserId}, Anonymized Orders: ${anonymizedOrdersCount}`);

      return sendJson(res, 200, {
        success: true,
        message: 'Derecho ARCO ejecutado con éxito: Los datos personales del usuario han sido cancelados y anonimizados de conformidad con la LGPDPPSO.',
        details: {
          userId: targetUserId,
          status: 'ANONYMIZED_AND_DELETED',
          anonymizedOrders: anonymizedOrdersCount,
          appliedStandard: 'LGPDPPSO Art. 43 - 55'
        }
      }, req);
    }

    // 10. Business info
    if (pathname === '/api/business/info') {
      const currentWa = (process.env.WHATSAPP_NUMBER || process.env.BUSINESS_WHATSAPP || db.business?.whatsappFormatted || '523751837635').replace(/\D/g, '');
      const businessInfo = {
        ...db.business,
        whatsappFormatted: currentWa,
        whatsappNumber: process.env.WHATSAPP_NUMBER_DISPLAY || db.business?.whatsappNumber || `+${currentWa}`
      };
      return sendJson(res, 200, { success: true, business: businessInfo }, req);
    }

    return sendJson(res, 404, { success: false, message: 'Endpoint no encontrado' }, req);
  }

  // Servir archivos estáticos del Frontend
  let filePath = path.join(FRONTEND_DIR, pathname === '/' ? 'index.html' : pathname);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(FRONTEND_DIR, 'index.html');
  }

  serveStatic(res, filePath, req);
});

server.listen(PORT, () => {
  console.log('====================================================');
  console.log(`🔥 LEÑOS RELLENOS - Servidor Activo en:`);
  console.log(`🌐 Aplicación Web: http://localhost:${PORT}`);
  console.log(`📡 API REST:       http://localhost:${PORT}/api`);
  console.log(`🔒 Seguridad:      JWT Auth, Derechos ARCO, Cookies RFC-Compliant`);
  console.log(`📜 Auditoría:      Trazabilidad de Logs LGPDPPSO`);
  console.log('====================================================');
});
