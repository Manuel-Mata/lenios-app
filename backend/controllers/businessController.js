const { getDb, saveDb } = require('../config/db');

// Obtener información del negocio y estado operativo
exports.getBusinessInfo = (req, res) => {
  const db = getDb();
  res.json({
    success: true,
    business: db.business
  });
};

// Actualizar información y estado (abierto/cerrado, horarios)
exports.updateBusinessInfo = (req, res) => {
  const db = getDb();
  db.business = {
    ...db.business,
    ...req.body
  };
  saveDb();

  res.json({
    success: true,
    message: 'Información del negocio actualizada',
    business: db.business
  });
};

// Alternar estado de la tienda Abierto / Cerrado
exports.toggleOpenStatus = (req, res) => {
  const db = getDb();
  db.business.isOpen = !db.business.isOpen;
  saveDb();

  res.json({
    success: true,
    message: `El negocio ahora está ${db.business.isOpen ? 'ABIERTO' : 'CERRADO'}`,
    isOpen: db.business.isOpen,
    business: db.business
  });
};

// Obtener estadísticas y KPIs para el dashboard del dueño
exports.getDashboardStats = (req, res) => {
  const db = getDb();
  const orders = db.orders || [];
  const products = db.products || [];

  // Calcular total de ventas (pedidos no cancelados)
  const activeOrders = orders.filter(o => o.status !== 'cancelled');
  const totalSales = activeOrders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
  
  const pendingOrders = orders.filter(o => o.status === 'received' || o.status === 'in_oven').length;
  const inDeliveryOrders = orders.filter(o => o.status === 'on_the_way').length;
  const completedOrders = orders.filter(o => o.status === 'delivered').length;

  const activeProducts = products.filter(p => p.available && p.stock > 0).length;
  const outOfStockProducts = products.filter(p => !p.available || p.stock === 0).length;

  res.json({
    success: true,
    stats: {
      totalSales,
      totalOrders: orders.length,
      pendingOrders,
      inDeliveryOrders,
      completedOrders,
      activeProducts,
      outOfStockProducts,
      isOpen: db.business.isOpen
    }
  });
};
