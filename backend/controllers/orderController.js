const { getDb, saveDb } = require('../config/db');

// Obtener todos los pedidos
exports.getAllOrders = (req, res) => {
  const db = getDb();
  const { status, limit } = req.query;

  let orders = [...(db.orders || [])];

  if (status && status !== 'all') {
    orders = orders.filter(o => o.status === status);
  }

  // Ordenar por más reciente primero
  orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (limit) {
    orders = orders.slice(0, parseInt(limit));
  }

  res.json({
    success: true,
    count: orders.length,
    orders
  });
};

// Obtener pedido por ID (para rastreo de cliente o detalle)
exports.getOrderById = (req, res) => {
  const db = getDb();
  const order = (db.orders || []).find(o => o.id.toUpperCase() === req.params.id.toUpperCase());

  if (!order) {
    return res.status(404).json({ success: false, message: 'Pedido no encontrado' });
  }

  res.json({ success: true, order });
};

// Crear nuevo pedido desde el carrito
exports.createOrder = (req, res) => {
  const db = getDb();
  const { customerName, customerPhone, customerAddress, deliveryType, paymentMethod, items, notes } = req.body;

  if (!customerName || !customerPhone || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Faltan datos obligatorios del pedido (nombre, teléfono o productos).'
    });
  }

  // Calcular subtotal
  let subtotal = 0;
  items.forEach(item => {
    subtotal += (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1);
  });

  const isDelivery = deliveryType === 'delivery';
  const deliveryCost = isDelivery ? (db.business.deliveryCost || 25.00) : 0;
  const total = subtotal + deliveryCost;

  // Generar ID de pedido tipo LR-XXXXX
  const randomNum = Math.floor(10000 + Math.random() * 90000);
  const orderId = `LR-${randomNum}`;

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
    status: 'received', // 'received', 'in_oven', 'on_the_way', 'delivered', 'cancelled'
    createdAt: new Date().toISOString()
  };

  // Descontar inventario/stock
  items.forEach(orderItem => {
    const prod = db.products.find(p => p.id === orderItem.id);
    if (prod && prod.stock > 0) {
      prod.stock = Math.max(0, prod.stock - (parseInt(orderItem.quantity) || 1));
      if (prod.stock === 0) {
        prod.available = false;
      }
    }
  });

  if (!db.orders) db.orders = [];
  db.orders.unshift(newOrder);
  saveDb();

  // Generar texto para WhatsApp
  let waItemsText = items.map(i => `• ${i.quantity}x ${i.name} ($${(i.price * i.quantity).toFixed(2)})${i.customization ? `\n  - Detalle: ${i.customization}` : ''}`).join('\n');
  const waMessage = `🪵 *NUEVO PEDIDO LEÑOS RELLENOS* 🪵\n\n` +
    `📋 *Orden:* #${orderId}\n` +
    `👤 *Cliente:* ${customerName}\n` +
    `📱 *Teléfono:* ${customerPhone}\n` +
    `📍 *Entrega:* ${isDelivery ? 'A Domicilio 🛵' : 'Recoger en Local 🏪'}\n` +
    `🏠 *Dirección:* ${customerAddress || 'Recoger en sucursal'}\n` +
    `💳 *Pago:* ${paymentMethod === 'cash' ? 'Efectivo al recibir 💵' : 'Transferencia / SPEI 📲'}\n` +
    (notes ? `📝 *Notas:* ${notes}\n` : '') +
    `\n🛒 *PRODUCTOS:*\n${waItemsText}\n\n` +
    `💵 *Subtotal:* $${subtotal.toFixed(2)}\n` +
    `🛵 *Envío:* $${deliveryCost.toFixed(2)}\n` +
    `💰 *TOTAL A PAGAR: $${total.toFixed(2)}*\n\n` +
    `_¡Muchas gracias por su preferencia!_`;

  const rawWaNumber = process.env.WHATSAPP_NUMBER || process.env.BUSINESS_WHATSAPP || db.business?.whatsappFormatted || '524731234567';
  const waNumber = rawWaNumber.replace(/\D/g, '');
  const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(waMessage)}`;

  res.status(201).json({
    success: true,
    message: 'Pedido registrado con éxito',
    order: newOrder,
    whatsappUrl: waUrl,
    whatsappMessage: waMessage
  });
};

// Actualizar estado de la orden (Dashboard Admin)
exports.updateOrderStatus = (req, res) => {
  const db = getDb();
  const { status } = req.body;
  const validStatuses = ['received', 'in_oven', 'on_the_way', 'delivered', 'cancelled'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Estado no válido' });
  }

  const order = (db.orders || []).find(o => o.id.toUpperCase() === req.params.id.toUpperCase());

  if (!order) {
    return res.status(404).json({ success: false, message: 'Pedido no encontrado' });
  }

  order.status = status;
  order.updatedAt = new Date().toISOString();
  saveDb();

  res.json({
    success: true,
    message: 'Estado del pedido actualizado correctamente',
    order
  });
};

// Eliminar pedido
exports.deleteOrder = (req, res) => {
  const db = getDb();
  const initialLength = (db.orders || []).length;
  db.orders = (db.orders || []).filter(o => o.id.toUpperCase() !== req.params.id.toUpperCase());

  if (db.orders.length === initialLength) {
    return res.status(404).json({ success: false, message: 'Pedido no encontrado' });
  }

  saveDb();
  res.json({ success: true, message: 'Pedido eliminado correctamente' });
};
