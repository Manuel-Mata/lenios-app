const { getDb, saveDb } = require('../config/db');

// Obtener todos los productos y opciones del personalizador
exports.getAllProducts = (req, res) => {
  const db = getDb();
  const { category, featured, availableOnly } = req.query;

  let filtered = [...db.products];

  if (category && category !== 'all') {
    filtered = filtered.filter(p => p.category === category);
  }
  if (featured === 'true') {
    filtered = filtered.filter(p => p.isFeatured);
  }
  if (availableOnly === 'true') {
    filtered = filtered.filter(p => p.available && p.stock > 0);
  }

  res.json({
    success: true,
    count: filtered.length,
    products: filtered,
    categories: db.categories,
    customizerOptions: db.customizerOptions
  });
};

// Obtener producto individual por ID
exports.getProductById = (req, res) => {
  const db = getDb();
  const product = db.products.find(p => p.id === req.params.id);

  if (!product) {
    return res.status(404).json({ success: false, message: 'Producto no encontrado' });
  }

  res.json({ success: true, product });
};

// Crear nuevo producto (Panel Admin)
exports.createProduct = (req, res) => {
  const db = getDb();
  const { name, category, price, stock, description, image, badge, prepTime } = req.body;

  if (!name || price === undefined) {
    return res.status(400).json({ success: false, message: 'Nombre y precio son requeridos' });
  }

  const id = 'leno-' + name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-') + '-' + Date.now();

  const newProduct = {
    id,
    name,
    category: category || 'clasicos',
    price: parseFloat(price),
    stock: parseInt(stock) || 0,
    available: (parseInt(stock) || 0) > 0,
    isFeatured: req.body.isFeatured || false,
    badge: badge || '⭐ Nuevo',
    description: description || '',
    image: image || 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
    prepTime: prepTime || '10-15 min',
    calories: req.body.calories || '450 kcal'
  };

  db.products.unshift(newProduct);
  saveDb();

  res.status(201).json({ success: true, product: newProduct });
};

// Actualizar producto (precio, stock, disponibilidad, etc.)
exports.updateProduct = (req, res) => {
  const db = getDb();
  const index = db.products.findIndex(p => p.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Producto no encontrado' });
  }

  const current = db.products[index];
  const updated = {
    ...current,
    ...req.body,
    price: req.body.price !== undefined ? parseFloat(req.body.price) : current.price,
    stock: req.body.stock !== undefined ? parseInt(req.body.stock) : current.stock,
    available: req.body.available !== undefined ? Boolean(req.body.available) : current.available
  };

  // Si stock es 0 y no se especificó disponibilidad, marcar como no disponible
  if (updated.stock <= 0 && req.body.available === undefined) {
    updated.available = false;
  }

  db.products[index] = updated;
  saveDb();

  res.json({ success: true, product: updated });
};

// Alternar disponibilidad rápida (Activar/Desactivar para el dueño)
exports.toggleAvailability = (req, res) => {
  const db = getDb();
  const product = db.products.find(p => p.id === req.params.id);

  if (!product) {
    return res.status(404).json({ success: false, message: 'Producto no encontrado' });
  }

  product.available = !product.available;
  saveDb();

  res.json({
    success: true,
    message: `Producto ${product.available ? 'activado' : 'desactivado'} con éxito`,
    available: product.available,
    product
  });
};

// Eliminar producto
exports.deleteProduct = (req, res) => {
  const db = getDb();
  const initialLength = db.products.length;
  db.products = db.products.filter(p => p.id !== req.params.id);

  if (db.products.length === initialLength) {
    return res.status(404).json({ success: false, message: 'Producto no encontrado' });
  }

  saveDb();
  res.json({ success: true, message: 'Producto eliminado correctamente' });
};
