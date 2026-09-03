const http = require('http');
const fs = require('fs');
const path = require('path');
const { getDb, saveDb } = require('./config/db');

const PORT = process.env.PORT || 5000;
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');

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

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=UTF-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

function serveStatic(res, filePath) {
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
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  const method = req.method.toUpperCase();

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  console.log(`[${new Date().toLocaleTimeString()}] ${method} ${pathname}`);

  // Rutas API
  if (pathname.startsWith('/api/')) {
    const db = getDb();

    // 1. Health
    if (pathname === '/api/health') {
      return sendJson(res, 200, {
        status: 'online',
        app: 'Leños Rellenos API',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      });
    }

    // 2. Products
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
        });
      }

      if (method === 'POST') {
        const body = await parseBody(req);
        if (!body.name || body.price === undefined) {
          return sendJson(res, 400, { success: false, message: 'Nombre y precio son requeridos' });
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
        return sendJson(res, 201, { success: true, product: newProduct });
      }
    }

    // Toggle Product availability
    const toggleMatch = pathname.match(/^\/api\/products\/([^\/]+)\/toggle$/);
    if (toggleMatch && method === 'PATCH') {
      const prodId = toggleMatch[1];
      const prod = db.products.find(p => p.id === prodId);
      if (!prod) return sendJson(res, 404, { success: false, message: 'Producto no encontrado' });
      prod.available = !prod.available;
      saveDb();
      return sendJson(res, 200, { success: true, product: prod, available: prod.available });
    }

    // Delete Product
    const deleteMatch = pathname.match(/^\/api\/products\/([^\/]+)$/);
    if (deleteMatch && method === 'DELETE') {
      const prodId = deleteMatch[1];
      db.products = db.products.filter(p => p.id !== prodId);
      saveDb();
      return sendJson(res, 200, { success: true, message: 'Producto eliminado' });
    }

    // 3. Orders
    if (pathname === '/api/orders') {
      if (method === 'GET') {
        return sendJson(res, 200, { success: true, count: db.orders.length, orders: db.orders });
      }

      if (method === 'POST') {
        const body = await parseBody(req);
        const { customerName, customerPhone, customerAddress, deliveryType, paymentMethod, items, notes } = body;

        if (!customerName || !customerPhone || !items || !Array.isArray(items)) {
          return sendJson(res, 400, { success: false, message: 'Datos incompletos del pedido' });
        }

        let subtotal = 0;
        items.forEach(i => { subtotal += (parseFloat(i.price) || 0) * (parseInt(i.quantity) || 1); });
        const isDelivery = deliveryType === 'delivery';
        const deliveryCost = isDelivery ? (db.business.deliveryCost || 25.00) : 0;
        const total = subtotal + deliveryCost;
        const orderId = `LR-${Math.floor(10000 + Math.random() * 90000)}`;

        const newOrder = {
          id: orderId,
          customerName,
          customerPhone,
          customerAddress: customerAddress || (isDelivery ? 'Dirección no especificada' : 'Recoger en Sucursal'),
          deliveryType: deliveryType || 'delivery',
          paymentMethod: paymentMethod || 'cash',
          notes: notes || '',
          items,
          subtotal,
          deliveryCost,
          total,
          status: 'received',
          createdAt: new Date().toISOString()
        };

        // Descontar inventario
        items.forEach(orderItem => {
          const prod = db.products.find(p => p.id === orderItem.id);
          if (prod && prod.stock > 0) {
            prod.stock = Math.max(0, prod.stock - (parseInt(orderItem.quantity) || 1));
            if (prod.stock === 0) prod.available = false;
          }
        });

        if (!db.orders) db.orders = [];
        db.orders.unshift(newOrder);
        saveDb();

        let waItemsText = items.map(i => `• ${i.quantity}x ${i.name} ($${(i.price * i.quantity).toFixed(2)})${i.customization ? ` [${i.customization}]` : ''}`).join('\n');
        const waMessage = `🪵 *NUEVO PEDIDO LEÑOS RELLENOS* 🪵\n\n` +
          `📋 *Orden:* #${orderId}\n` +
          `👤 *Cliente:* ${customerName}\n` +
          `📱 *Teléfono:* ${customerPhone}\n` +
          `📍 *Entrega:* ${isDelivery ? 'A Domicilio' : 'Recoger en Local'}\n` +
          `🏠 *Dirección:* ${customerAddress || 'En sucursal'}\n` +
          `💳 *Pago:* ${paymentMethod === 'cash' ? 'Efectivo al recibir' : 'Transferencia / SPEI'}\n` +
          (notes ? `📝 *Notas:* ${notes}\n` : '') +
          `\n🛒 *PRODUCTOS:*\n${waItemsText}\n\n` +
          `💵 *Subtotal:* $${subtotal.toFixed(2)}\n` +
          `🛵 *Envío:* $${deliveryCost.toFixed(2)}\n` +
          `💰 *TOTAL A PAGAR: $${total.toFixed(2)}*\n\n` +
          `_¡Muchas gracias por su preferencia!_`;

        const waNumber = (db.business.whatsappFormatted || '524731234567').replace(/\D/g, '');
        const waUrl = `https://api.whatsapp.com/send?phone=${waNumber}&text=${encodeURIComponent(waMessage)}`;

        return sendJson(res, 201, { success: true, order: newOrder, whatsappUrl: waUrl, whatsappMessage: waMessage });
      }
    }

    // Update order status
    const orderStatusMatch = pathname.match(/^\/api\/orders\/([^\/]+)\/status$/);
    if (orderStatusMatch && method === 'PATCH') {
      const orderId = orderStatusMatch[1];
      const body = await parseBody(req);
      const order = (db.orders || []).find(o => o.id.toUpperCase() === orderId.toUpperCase());
      if (!order) return sendJson(res, 404, { success: false, message: 'Pedido no encontrado' });
      order.status = body.status;
      order.updatedAt = new Date().toISOString();
      saveDb();
      return sendJson(res, 200, { success: true, order });
    }

    // Delete order
    const deleteOrderMatch = pathname.match(/^\/api\/orders\/([^\/]+)$/);
    if (deleteOrderMatch && method === 'DELETE') {
      const orderId = deleteOrderMatch[1];
      db.orders = (db.orders || []).filter(o => o.id.toUpperCase() !== orderId.toUpperCase());
      saveDb();
      return sendJson(res, 200, { success: true, message: 'Pedido eliminado' });
    }

    // 4. Business
    if (pathname === '/api/business/info') {
      return sendJson(res, 200, { success: true, business: db.business });
    }
    if (pathname === '/api/business/toggle' && method === 'PATCH') {
      db.business.isOpen = !db.business.isOpen;
      saveDb();
      return sendJson(res, 200, { success: true, isOpen: db.business.isOpen, business: db.business });
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
      });
    }

    return sendJson(res, 404, { success: false, message: 'Endpoint no encontrado' });
  }

  // Servir archivos estáticos del Frontend
  let filePath = path.join(FRONTEND_DIR, pathname === '/' ? 'index.html' : pathname);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(FRONTEND_DIR, 'index.html');
  }

  serveStatic(res, filePath);
});

server.listen(PORT, () => {
  console.log('====================================================');
  console.log(`🔥 LEÑOS RELLENOS - Servidor Activo en:`);
  console.log(`🌐 Aplicación Web: http://localhost:${PORT}`);
  console.log(`📡 API REST:       http://localhost:${PORT}/api`);
  console.log(`📦 Datos:          http://localhost:${PORT}/api/products`);
  console.log('====================================================');
});
