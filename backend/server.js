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

      // Generar JWT
      const userPayload = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      };
      const token = signJwt(userPayload, 86400);

      // Establecer Cookie HttpOnly
      const cookieHeader = `token=${token}; HttpOnly; Path=/; SameSite=Strict; Secure; Max-Age=86400`;

      return sendJson(res, 200, {
        success: true,
        message: 'Inicio de sesión exitoso',
        user: userPayload
      }, req, { 'Set-Cookie': cookieHeader });
    }

    if (pathname === '/api/auth/me' && method === 'GET') {
      const cookies = parseCookies(req);
      const token = cookies.token;
      const decoded = verifyJwt(token);

      if (!decoded) {
        return sendJson(res, 401, { success: false, message: 'No hay sesión activa o el token ha expirado' }, req);
      }

      return sendJson(res, 200, {
        success: true,
        user: {
          id: decoded.id,
          name: decoded.name,
          email: decoded.email,
          role: decoded.role
        }
      }, req);
    }

    if (pathname === '/api/auth/logout' && method === 'POST') {
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
          // Minimización y validación del carrito en sesión
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

      if (method === 'POST') {
        const body = await parseBody(req);
        if (!body.name || body.price === undefined) {
          return sendJson(res, 400, { success: false, message: 'Nombre y precio son requeridos' }, req);
        }
        const newProduct = {
          id: 'leno-' + Date.now(),
          name: body.name,
          category: body.category || 'clasicos',
          price: parseFloat(body.price),
          stock: parseInt(body.stock) || 0,
          available: (parseInt(body.stock) || 0) > 0,
          isFeatured: Boolean(body.isFeatured),
          badge: body.badge || '⭐ Nuevo',
          description: body.description || '',
          image: body.image || 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80'
        };
        db.products.unshift(newProduct);
        saveDb();
        return sendJson(res, 201, { success: true, product: newProduct }, req);
      }
    }

    // Toggle Product availability
    const toggleMatch = pathname.match(/^\/api\/products\/([^\/]+)\/toggle$/);
    if (toggleMatch && method === 'PATCH') {
      const prodId = toggleMatch[1];
      const prod = db.products.find(p => p.id === prodId);
      if (!prod) return sendJson(res, 404, { success: false, message: 'Producto no encontrado' }, req);
      prod.available = !prod.available;
      saveDb();
      return sendJson(res, 200, { success: true, product: prod, available: prod.available }, req);
    }

    // Delete Product
    const deleteMatch = pathname.match(/^\/api\/products\/([^\/]+)$/);
    if (deleteMatch && method === 'DELETE') {
      const prodId = deleteMatch[1];
      db.products = db.products.filter(p => p.id !== prodId);
      saveDb();
      return sendJson(res, 200, { success: true, message: 'Producto eliminado' }, req);
    }

    // 4. Orders (con Minimización y Verificación de Precios en el Servidor)
    if (pathname === '/api/orders') {
      if (method === 'GET') {
        return sendJson(res, 200, { success: true, count: db.orders.length, orders: db.orders }, req);
      }

      if (method === 'POST') {
        const body = await parseBody(req);
        const { customerName, customerPhone, customerAddress, deliveryType, paymentMethod, items, notes } = body;

        if (!customerName || !customerPhone || !items || !Array.isArray(items) || items.length === 0) {
          return sendJson(res, 400, { success: false, message: 'Datos incompletos del pedido' }, req);
        }

        // PRINCIPIO DE MINIMIZACIÓN Y SEGURIDAD:
        // El servidor valida cada producto contra el catálogo del BackEnd y calcula los precios reales
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

        // Limpiar carrito de la sesión
        session.cart = [];
        sessionStore.set(session.id, session);

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

    // Update order status
    const orderStatusMatch = pathname.match(/^\/api\/orders\/([^\/]+)\/status$/);
    if (orderStatusMatch && method === 'PATCH') {
      const orderId = orderStatusMatch[1];
      const body = await parseBody(req);
      const order = (db.orders || []).find(o => o.id.toUpperCase() === orderId.toUpperCase());
      if (!order) return sendJson(res, 404, { success: false, message: 'Pedido no encontrado' }, req);
      order.status = body.status;
      order.updatedAt = new Date().toISOString();
      saveDb();
      return sendJson(res, 200, { success: true, order }, req);
    }

    // Delete order
    const deleteOrderMatch = pathname.match(/^\/api\/orders\/([^\/]+)$/);
    if (deleteOrderMatch && method === 'DELETE') {
      const orderId = deleteOrderMatch[1];
      db.orders = (db.orders || []).filter(o => o.id.toUpperCase() !== orderId.toUpperCase());
      saveDb();
      return sendJson(res, 200, { success: true, message: 'Pedido eliminado' }, req);
    }

    // 5. Business
    if (pathname === '/api/business/info') {
      const currentWa = (process.env.WHATSAPP_NUMBER || process.env.BUSINESS_WHATSAPP || db.business?.whatsappFormatted || '523751837635').replace(/\D/g, '');
      const businessInfo = {
        ...db.business,
        whatsappFormatted: currentWa,
        whatsappNumber: process.env.WHATSAPP_NUMBER_DISPLAY || db.business?.whatsappNumber || `+${currentWa}`
      };
      return sendJson(res, 200, { success: true, business: businessInfo }, req);
    }

    if (pathname === '/api/business/toggle' && method === 'PATCH') {
      db.business.isOpen = !db.business.isOpen;
      saveDb();
      return sendJson(res, 200, { success: true, isOpen: db.business.isOpen, business: db.business }, req);
    }

    if (pathname === '/api/business/stats') {
      const orders = db.orders || [];
      const products = db.products || [];
      const totalSales = orders.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
      return sendJson(res, 200, {
        success: true,
        stats: {
          totalSales,
          totalOrders: orders.length,
          pendingOrders: orders.filter(o => o.status === 'received' || o.status === 'in_oven').length,
          activeProducts: products.filter(p => p.available && p.stock > 0).length,
          outOfStockProducts: products.filter(p => !p.available || p.stock === 0).length,
          isOpen: db.business.isOpen
        }
      }, req);
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
  console.log(`🔒 Cookies Seguras: HttpOnly; Secure; SameSite=Strict`);
  console.log(`📦 Datos:          http://localhost:${PORT}/api/products`);
  console.log('====================================================');
});
