const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getDb, saveDb } = require('./config/db');
const { hash, compare, SALT_ROUNDS } = require('./config/bcrypt');

const PORT = process.env.PORT || 5000;
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
const JWT_SECRET = process.env.JWT_SECRET || 'lenios_rellenos_super_secret_jwt_key_2026';
const ACCESS_TOKEN_EXPIRES_IN = parseInt(process.env.ACCESS_TOKEN_EXPIRES_IN) || 3600; // 1 hora
const REFRESH_TOKEN_EXPIRES_IN = parseInt(process.env.REFRESH_TOKEN_EXPIRES_IN) || 604800; // 7 días

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

function signJwt(payload, expiresInSeconds = ACCESS_TOKEN_EXPIRES_IN) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const iat = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, iat, exp };

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
  const decoded = verifyJwt(token);
  if (!decoded || decoded.type === 'refresh') return null;
  return decoded;
}

function logAudit(req, user, action, purpose, resource = '') {
  const db = getDb();
  if (!db.auditLogs) db.auditLogs = [];

  const auditEntry = {
    id: 'audit-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    timestamp: new Date().toISOString(),
    who: {
      userId: user ? (user.id || user.sub) : 'anonymous',
      userName: user ? user.name : 'Invitado',
      role: user ? user.role : 'guest',
      ip: req.socket.remoteAddress || '127.0.0.1'
    },
    when: new Date().toISOString(),
    action: action,
    purpose: purpose,
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

    // Inicializar usuarios por defecto con Bcrypt (12 rounds) si no existen
    if (!db.users || db.users.length === 0) {
      db.users = [
        {
          id: 'user-admin-01',
          name: 'Administrador Leños',
          email: 'admin@lenios.com',
          password: '$2b$12$e7f2b4d1171de232ca76d7f20eb3e57c$97d80aa6ae2ac491c5a8406db20411ee098924d571d754516394598c580f6315cca73490967be1d38c775bfb414e607fab18db454e5c990f1d86d1728f2279c0', // 'admin123'
          role: 'admin',
          createdAt: new Date().toISOString()
        },
        {
          id: 'user-client-01',
          name: 'Carlos Rodríguez',
          email: 'cliente@lenios.com',
          password: '$2b$12$5669b465ce760f7e3864689bd378a2e4$09f05cba7bd80e158bbf266e7f6008e0d2cb41ddef8e196a77a64c3e71bc3579b3f184c84e20ddd6d9cd8439db8273c10e3f56f0953fcaf3c05290eed916b29c', // 'cliente123'
          role: 'cliente',
          createdAt: new Date().toISOString()
        }
      ];
      saveDb();
    }

    // =========================================================================
    // 0. AUTENTICACIÓN Y AUTORIZACIÓN (REGISTER, LOGIN, REFRESH, LOGOUT, ME)
    // =========================================================================

    // 0.1 POST /api/auth/register — Registro con hashing bcrypt (mínimo 12 rounds)
    if (pathname === '/api/auth/register' && method === 'POST') {
      const body = await parseBody(req);
      const name = String(body.name || '').trim();
      const email = String(body.email || '').toLowerCase().trim();
      const password = String(body.password || '').trim();
      const role = (body.role === 'admin' ? 'admin' : 'cliente'); // Roles definidos: admin y cliente

      if (!name || !email || !password) {
        return sendJson(res, 400, {
          success: false,
          message: 'Nombre, correo electrónico y contraseña son obligatorios.'
        }, req);
      }

      if (password.length < 6) {
        return sendJson(res, 400, {
          success: false,
          message: 'La contraseña debe contener al menos 6 caracteres.'
        }, req);
      }

      // Validar si el correo ya está registrado
      const existingUser = db.users.find(u => u.email.toLowerCase() === email);
      if (existingUser) {
        return sendJson(res, 409, {
          success: false,
          message: 'El correo electrónico ya se encuentra registrado.'
        }, req);
      }

      // Hashing de contraseña con Bcrypt usando mínimo 12 rounds
      const hashedPassword = await hash(password, SALT_ROUNDS);

      const newUser = {
        id: 'user-' + Date.now(),
        name,
        email,
        password: hashedPassword,
        role,
        createdAt: new Date().toISOString()
      };

      db.users.push(newUser);
      saveDb();

      // Generar Access Token y Refresh Token
      const userPayload = {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        type: 'access'
      };
      const accessToken = signJwt(userPayload, ACCESS_TOKEN_EXPIRES_IN);

      const refreshPayload = {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        type: 'refresh'
      };
      const refreshToken = signJwt(refreshPayload, REFRESH_TOKEN_EXPIRES_IN);

      const accessCookie = `token=${accessToken}; HttpOnly; Path=/; SameSite=Strict; Secure; Max-Age=${ACCESS_TOKEN_EXPIRES_IN}`;
      const refreshCookie = `refreshToken=${refreshToken}; HttpOnly; Path=/; SameSite=Strict; Secure; Max-Age=${REFRESH_TOKEN_EXPIRES_IN}`;

      logAudit(req, userPayload, 'USER_REGISTER', `Registro de nuevo usuario con rol ${role}`, `User: ${newUser.id}`);

      return sendJson(res, 201, {
        success: true,
        message: 'Usuario registrado exitosamente con hashing Bcrypt (12 rounds)',
        accessToken,
        refreshToken,
        expiresIn: ACCESS_TOKEN_EXPIRES_IN,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role
        }
      }, req, {
        'Set-Cookie': [accessCookie, refreshCookie]
      });
    }

    // 0.2 POST /api/auth/login — Login devuelve JWT firmado y tokens configurados
    if (pathname === '/api/auth/login' && method === 'POST') {
      const body = await parseBody(req);
      const email = String(body.email || '').toLowerCase().trim();
      const password = String(body.password || '').trim();

      if (!email || !password) {
        return sendJson(res, 400, { success: false, message: 'Correo y contraseña requeridos' }, req);
      }

      const user = db.users.find(u => u.email.toLowerCase() === email);
      if (!user) {
        return sendJson(res, 401, { success: false, message: 'Credenciales inválidas. Verifica tu correo y contraseña.' }, req);
      }

      // Verificación de hash Bcrypt
      const isValidPassword = await compare(password, user.password);
      if (!isValidPassword) {
        return sendJson(res, 401, { success: false, message: 'Credenciales inválidas. Verifica tu correo y contraseña.' }, req);
      }

      const userPayload = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        type: 'access'
      };
      const accessToken = signJwt(userPayload, ACCESS_TOKEN_EXPIRES_IN);

      const refreshPayload = {
        id: user.id,
        email: user.email,
        role: user.role,
        type: 'refresh'
      };
      const refreshToken = signJwt(refreshPayload, REFRESH_TOKEN_EXPIRES_IN);

      const accessCookie = `token=${accessToken}; HttpOnly; Path=/; SameSite=Strict; Secure; Max-Age=${ACCESS_TOKEN_EXPIRES_IN}`;
      const refreshCookie = `refreshToken=${refreshToken}; HttpOnly; Path=/; SameSite=Strict; Secure; Max-Age=${REFRESH_TOKEN_EXPIRES_IN}`;

      logAudit(req, userPayload, 'LOGIN_SUCCESS', 'Inicio de sesión exitoso con JWT firmado', `User: ${user.id}`);

      return sendJson(res, 200, {
        success: true,
        message: 'Inicio de sesión exitoso',
        accessToken,
        refreshToken,
        expiresIn: ACCESS_TOKEN_EXPIRES_IN,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      }, req, {
        'Set-Cookie': [accessCookie, refreshCookie]
      });
    }

    // 0.3 POST /api/auth/refresh — Refresco de Token de Acceso
    if (pathname === '/api/auth/refresh' && method === 'POST') {
      const body = await parseBody(req);
      const cookies = parseCookies(req);
      const tokenToRefresh = body.refreshToken || cookies.refreshToken;

      if (!tokenToRefresh) {
        return sendJson(res, 400, {
          success: false,
          message: 'Refresh Token requerido para renovar la sesión.'
        }, req);
      }

      const decoded = verifyJwt(tokenToRefresh);
      if (!decoded || decoded.type !== 'refresh') {
        return sendJson(res, 401, {
          success: false,
          message: 'Refresh Token inválido o expirado. Por favor inicia sesión nuevamente.'
        }, req);
      }

      const user = db.users.find(u => u.id === decoded.id);
      if (!user) {
        return sendJson(res, 404, {
          success: false,
          message: 'El usuario asociado al token no existe.'
        }, req);
      }

      // Generar nuevo Access Token firmado
      const newAccessPayload = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        type: 'access'
      };
      const newAccessToken = signJwt(newAccessPayload, ACCESS_TOKEN_EXPIRES_IN);
      const accessCookie = `token=${newAccessToken}; HttpOnly; Path=/; SameSite=Strict; Secure; Max-Age=${ACCESS_TOKEN_EXPIRES_IN}`;

      logAudit(req, newAccessPayload, 'TOKEN_REFRESH', 'Renovación exitosa de Access Token mediante Refresh Token', `User: ${user.id}`);

      return sendJson(res, 200, {
        success: true,
        message: 'Token de acceso renovado exitosamente',
        accessToken: newAccessToken,
        expiresIn: ACCESS_TOKEN_EXPIRES_IN,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      }, req, {
        'Set-Cookie': accessCookie
      });
    }

    // 0.4 GET /api/auth/me — Perfil de usuario autenticado
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

    // 0.5 POST /api/auth/logout — Cerrar sesión
    if (pathname === '/api/auth/logout' && method === 'POST') {
      if (authUser) logAudit(req, authUser, 'LOGOUT', 'Cierre de sesión de usuario');
      const cookie1 = `token=; HttpOnly; Path=/; SameSite=Strict; Secure; Max-Age=0`;
      const cookie2 = `refreshToken=; HttpOnly; Path=/; SameSite=Strict; Secure; Max-Age=0`;
      return sendJson(res, 200, { success: true, message: 'Sesión cerrada correctamente' }, req, {
        'Set-Cookie': [cookie1, cookie2]
      });
    }

    // =========================================================================
    // 1. HEALTH & SESSION ENDPOINTS
    // =========================================================================
    if (pathname === '/api/health') {
      return sendJson(res, 200, {
        status: 'online',
        app: 'Leños Rellenos API',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        sessionId: session.id
      }, req);
    }

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

    // =========================================================================
    // 2. PRODUCTOS (CATÁLOGO PÚBLICO & GESTIÓN SOLO ADMIN)
    // =========================================================================
    if (pathname === '/api/products') {
      // Lectura del catálogo es pública
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

      // Creación de productos: SOLO ROL ADMIN
      if (method === 'POST') {
        if (!authUser || authUser.role !== 'admin') {
          logAudit(req, authUser, 'UNAUTHORIZED_CREATE_PRODUCT', 'Intento no autorizado de agregar producto', 'POST /api/products');
          return sendJson(res, 403, {
            success: false,
            message: 'Acceso denegado. Solo administradores pueden agregar productos al catálogo.'
          }, req);
        }

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

        logAudit(req, authUser, 'CREATE_PRODUCT', `Creación de nuevo producto: ${newProduct.name}`, `Product: ${newProduct.id}`);

        return sendJson(res, 201, { success: true, product: newProduct }, req);
      }
    }

    // Toggle disponibilidad de producto: SOLO ROL ADMIN
    const toggleMatch = pathname.match(/^\/api\/products\/([^\/]+)\/toggle$/);
    if (toggleMatch && method === 'PATCH') {
      if (!authUser || authUser.role !== 'admin') {
        return sendJson(res, 403, {
          success: false,
          message: 'Acceso denegado. Solo administradores pueden modificar la disponibilidad de productos.'
        }, req);
      }

      const prodId = toggleMatch[1];
      const prod = db.products.find(p => p.id === prodId);
      if (!prod) return sendJson(res, 404, { success: false, message: 'Producto no encontrado' }, req);
      prod.available = !prod.available;
      saveDb();

      logAudit(req, authUser, 'TOGGLE_PRODUCT_AVAILABILITY', `Disponibilidad cambiada a ${prod.available}`, `Product: ${prodId}`);

      return sendJson(res, 200, { success: true, product: prod, available: prod.available }, req);
    }

    // Eliminar producto: SOLO ROL ADMIN
    const deleteMatch = pathname.match(/^\/api\/products\/([^\/]+)$/);
    if (deleteMatch && method === 'DELETE') {
      if (!authUser || authUser.role !== 'admin') {
        return sendJson(res, 403, {
          success: false,
          message: 'Acceso denegado. Solo administradores pueden eliminar productos.'
        }, req);
      }

      const prodId = deleteMatch[1];
      db.products = db.products.filter(p => p.id !== prodId);
      saveDb();

      logAudit(req, authUser, 'DELETE_PRODUCT', 'Eliminación de producto del catálogo', `Product: ${prodId}`);

      return sendJson(res, 200, { success: true, message: 'Producto eliminado correctamente' }, req);
    }

    // =========================================================================
    // 3. GESTIÓN DE PEDIDOS Y PANEL DE ADMINISTRACIÓN
    // =========================================================================

    // 3.1 GET /api/admin/orders — Lista todos los pedidos (SOLO ROL ADMIN)
    if (pathname === '/api/admin/orders' && method === 'GET') {
      if (!authUser || authUser.role !== 'admin') {
        logAudit(req, authUser, 'UNAUTHORIZED_ACCESS_ATTEMPT', 'Intento no autorizado de consultar lista general de pedidos', 'GET /api/admin/orders');
        return sendJson(res, 403, {
          success: false,
          message: 'Acceso denegado. Se requiere rol de administrador para consultar el registro general de pedidos.'
        }, req);
      }

      logAudit(req, authUser, 'LIST_ADMIN_ORDERS', 'Consulta general de pedidos de clientes');

      return sendJson(res, 200, {
        success: true,
        count: (db.orders || []).length,
        orders: db.orders || []
      }, req);
    }

    // 3.2 GET /api/admin/audit-logs — Bitácora de auditoría LGPDPPSO (SOLO ROL ADMIN)
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

    // 3.3 POST /api/orders — Crear nuevo pedido asociado al cliente con Minimización
    if (pathname === '/api/orders') {
      if (method === 'GET') {
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

        logAudit(req, authUser, 'CREATE_ORDER', 'Creación de nuevo pedido asociado al cliente', `Order #${orderId}`);

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

    // 3.4 Actualizar estado del pedido: PUT /api/orders/:id/status o PATCH (SOLO ROL ADMIN)
    const orderStatusMatch = pathname.match(/^\/api\/orders\/([^\/]+)\/status$/);
    if (orderStatusMatch && (method === 'PUT' || method === 'PATCH')) {
      const orderId = orderStatusMatch[1];
      const body = await parseBody(req);
      const validStatuses = ['received', 'in_oven', 'on_the_way', 'delivered', 'cancelled'];

      if (!authUser || authUser.role !== 'admin') {
        logAudit(req, authUser, 'UNAUTHORIZED_STATUS_UPDATE', `Intento no autorizado de cambiar estado de orden #${orderId}`, `Order #${orderId}`);
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

      logAudit(req, authUser, 'UPDATE_ORDER_STATUS', `Estado de pedido actualizado de ${oldStatus} a ${body.status}`, `Order #${orderId}`);

      return sendJson(res, 200, {
        success: true,
        message: 'Estado del pedido actualizado correctamente',
        order
      }, req);
    }

    // 3.5 Obtener pedido por ID: GET /api/orders/:id (Solo propietario o Admin)
    const getOrderMatch = pathname.match(/^\/api\/orders\/([^\/]+)$/);
    if (getOrderMatch && method === 'GET') {
      const orderId = getOrderMatch[1];
      const order = (db.orders || []).find(o => o.id.toUpperCase() === orderId.toUpperCase());

      if (!order) {
        return sendJson(res, 404, { success: false, message: 'Pedido no encontrado' }, req);
      }

      const isOwner = (authUser && order.userId && order.userId === authUser.id) ||
                      (order.sessionId && order.sessionId === session.id) ||
                      (!authUser && !order.userId);
      const isAdmin = authUser && authUser.role === 'admin';

      if (!isOwner && !isAdmin) {
        logAudit(req, authUser, 'UNAUTHORIZED_ORDER_VIEW', `Intento no autorizado de consultar pedido #${orderId}`, `Order #${orderId}`);
        return sendJson(res, 403, {
          success: false,
          message: 'Acceso denegado. Solo el titular del pedido o un administrador pueden acceder a esta información.'
        }, req);
      }

      logAudit(req, authUser, 'READ_ORDER_DETAIL', 'Consulta autorizada de detalle de pedido', `Order #${orderId}`);

      return sendJson(res, 200, { success: true, order }, req);
    }

    // 3.6 Eliminar pedido: DELETE /api/orders/:id (SOLO ROL ADMIN)
    const deleteOrderMatch = pathname.match(/^\/api\/orders\/([^\/]+)$/);
    if (deleteOrderMatch && method === 'DELETE') {
      if (!authUser || authUser.role !== 'admin') {
        return sendJson(res, 403, {
          success: false,
          message: 'Acceso denegado. Solo administradores pueden eliminar pedidos.'
        }, req);
      }

      const orderId = deleteOrderMatch[1];
      db.orders = (db.orders || []).filter(o => o.id.toUpperCase() !== orderId.toUpperCase());
      saveDb();

      logAudit(req, authUser, 'DELETE_ORDER', 'Eliminación administrativa de pedido', `Order #${orderId}`);

      return sendJson(res, 200, { success: true, message: 'Pedido eliminado correctamente' }, req);
    }

    // =========================================================================
    // 4. DERECHOS ARCO: DELETE /api/users/:id
    // =========================================================================
    const deleteUserMatch = pathname.match(/^\/api\/users\/([^\/]+)$/);
    if (deleteUserMatch && method === 'DELETE') {
      const targetUserId = deleteUserMatch[1];
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

    // =========================================================================
    // 5. BUSINESS INFO & STATUS
    // =========================================================================
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
  console.log(`🔒 Auth & Tokens:  Bcrypt (12 rounds) + JWT (Access/Refresh)`);
  console.log(`🛡️ Roles:          admin & cliente (RBAC estricto)`);
  console.log(`📜 Auditoría:      Trazabilidad de Logs LGPDPPSO`);
  console.log('====================================================');
});
