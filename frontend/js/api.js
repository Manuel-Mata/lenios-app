/**
 * LEÑOS RELLENOS - Cliente API Híbrido (REST API + Respaldo LocalStorage)
 */

const API_BASE_URL = 'http://localhost:5000/api';

class ApiClient {
  constructor() {
    this.isBackendAvailable = null;
    this.initLocalStorage();
  }

  // Inicializar almacenamiento local si no existe
  initLocalStorage() {
    if (!localStorage.getItem('lenios_products')) {
      localStorage.setItem('lenios_products', JSON.stringify(DEFAULT_PRODUCTS));
    }
    if (!localStorage.getItem('lenios_business')) {
      localStorage.setItem('lenios_business', JSON.stringify(DEFAULT_BUSINESS));
    }
    if (!localStorage.getItem('lenios_orders')) {
      localStorage.setItem('lenios_orders', JSON.stringify(DEFAULT_ORDERS));
    }
    if (!localStorage.getItem('lenios_customizer')) {
      localStorage.setItem('lenios_customizer', JSON.stringify(DEFAULT_CUSTOMIZER));
    }
  }

  // Verificar conexión con el backend de forma segura
  async checkBackend() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 800);
      const res = await fetch(`${API_BASE_URL}/health`, { signal: controller.signal });
      clearTimeout(timeoutId);
      this.isBackendAvailable = res.ok;
    } catch (e) {
      this.isBackendAvailable = false;
    }
    return this.isBackendAvailable;
  }

  // Obtener productos
  async getProducts() {
    if (this.isBackendAvailable === null) await this.checkBackend();

    if (this.isBackendAvailable) {
      try {
        const res = await fetch(`${API_BASE_URL}/products`);
        const data = await res.json();
        if (data.success) {
          localStorage.setItem('lenios_products', JSON.stringify(data.products));
          return data.products;
        }
      } catch (err) {
        console.warn('Fallo backend, usando datos locales:', err);
      }
    }
    return JSON.parse(localStorage.getItem('lenios_products') || '[]');
  }

  // Obtener opciones de personalización
  async getCustomizerOptions() {
    if (this.isBackendAvailable === null) await this.checkBackend();

    if (this.isBackendAvailable) {
      try {
        const res = await fetch(`${API_BASE_URL}/products`);
        const data = await res.json();
        if (data.customizerOptions) return data.customizerOptions;
      } catch (err) {
        console.warn('Fallo backend:', err);
      }
    }
    return JSON.parse(localStorage.getItem('lenios_customizer')) || DEFAULT_CUSTOMIZER;
  }

  // Obtener datos del negocio
  async getBusinessInfo() {
    if (this.isBackendAvailable === null) await this.checkBackend();

    if (this.isBackendAvailable) {
      try {
        const res = await fetch(`${API_BASE_URL}/business/info`);
        const data = await res.json();
        if (data.success) {
          localStorage.setItem('lenios_business', JSON.stringify(data.business));
          return data.business;
        }
      } catch (err) {
        console.warn('Fallo backend:', err);
      }
    }
    return JSON.parse(localStorage.getItem('lenios_business')) || DEFAULT_BUSINESS;
  }

  // Alternar estado de la tienda (Abierto / Cerrado)
  async toggleBusinessOpen() {
    if (this.isBackendAvailable === null) await this.checkBackend();

    if (this.isBackendAvailable) {
      try {
        const res = await fetch(`${API_BASE_URL}/business/toggle`, { method: 'PATCH' });
        const data = await res.json();
        if (data.success) {
          localStorage.setItem('lenios_business', JSON.stringify(data.business));
          return data.isOpen;
        }
      } catch (err) {
        console.warn('Fallo backend:', err);
      }
    }

    const business = JSON.parse(localStorage.getItem('lenios_business')) || DEFAULT_BUSINESS;
    business.isOpen = !business.isOpen;
    localStorage.setItem('lenios_business', JSON.stringify(business));
    return business.isOpen;
  }

  // Alternar disponibilidad de producto (Activar / Desactivar)
  async toggleProductAvailability(productId) {
    if (this.isBackendAvailable === null) await this.checkBackend();

    if (this.isBackendAvailable) {
      try {
        const res = await fetch(`${API_BASE_URL}/products/${productId}/toggle`, { method: 'PATCH' });
        const data = await res.json();
        if (data.success) return data.product;
      } catch (err) {
        console.warn('Fallo backend:', err);
      }
    }

    const products = JSON.parse(localStorage.getItem('lenios_products') || '[]');
    const prod = products.find(p => p.id === productId);
    if (prod) {
      prod.available = !prod.available;
      localStorage.setItem('lenios_products', JSON.stringify(products));
      return prod;
    }
    return null;
  }

  // Guardar / Crear nuevo producto
  async addProduct(productData) {
    if (this.isBackendAvailable === null) await this.checkBackend();

    if (this.isBackendAvailable) {
      try {
        const res = await fetch(`${API_BASE_URL}/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(productData)
        });
        const data = await res.json();
        if (data.success) return data.product;
      } catch (err) {
        console.warn('Fallo backend:', err);
      }
    }

    const products = JSON.parse(localStorage.getItem('lenios_products') || '[]');
    const newProd = {
      id: 'leno-' + Date.now(),
      ...productData,
      available: (parseInt(productData.stock) || 0) > 0
    };
    products.unshift(newProd);
    localStorage.setItem('lenios_products', JSON.stringify(products));
    return newProd;
  }

  // Eliminar producto
  async deleteProduct(productId) {
    if (this.isBackendAvailable === null) await this.checkBackend();

    if (this.isBackendAvailable) {
      try {
        const res = await fetch(`${API_BASE_URL}/products/${productId}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) return true;
      } catch (err) {
        console.warn('Fallo backend:', err);
      }
    }

    let products = JSON.parse(localStorage.getItem('lenios_products') || '[]');
    products = products.filter(p => p.id !== productId);
    localStorage.setItem('lenios_products', JSON.stringify(products));
    return true;
  }

  // Crear pedido
  async createOrder(orderPayload) {
    if (this.isBackendAvailable === null) await this.checkBackend();

    if (this.isBackendAvailable) {
      try {
        const res = await fetch(`${API_BASE_URL}/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderPayload)
        });
        const data = await res.json();
        if (data.success) {
          this.saveOrderLocally(data.order);
          return data;
        }
      } catch (err) {
        console.warn('Fallo backend en createOrder:', err);
      }
    }

    // Fallback local
    const orderId = `LR-${Math.floor(10000 + Math.random() * 90000)}`;
    const isDelivery = orderPayload.deliveryType === 'delivery';
    const subtotal = orderPayload.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    const deliveryCost = isDelivery ? 25.00 : 0;
    const total = subtotal + deliveryCost;

    const newOrder = {
      id: orderId,
      ...orderPayload,
      subtotal,
      deliveryCost,
      total,
      status: 'received',
      createdAt: new Date().toISOString()
    };

    this.saveOrderLocally(newOrder);

    // Generar enlace de WhatsApp
    let waItemsText = orderPayload.items.map(i => `• ${i.quantity}x ${i.name} ($${(i.price * i.quantity).toFixed(2)})${i.customization ? ` [${i.customization}]` : ''}`).join('\n');
    const waMessage = `🪵 *NUEVO PEDIDO LEÑOS RELLENOS* 🪵\n\n` +
      `📋 *Orden:* #${orderId}\n` +
      `👤 *Cliente:* ${orderPayload.customerName}\n` +
      `📱 *Teléfono:* ${orderPayload.customerPhone}\n` +
      `📍 *Entrega:* ${isDelivery ? 'A Domicilio' : 'Recoger en Local'}\n` +
      `🏠 *Dirección:* ${orderPayload.customerAddress || 'En sucursal'}\n` +
      `💳 *Pago:* ${orderPayload.paymentMethod === 'cash' ? 'Efectivo al recibir' : 'Transferencia / SPEI'}\n` +
      (orderPayload.notes ? `📝 *Notas:* ${orderPayload.notes}\n` : '') +
      `\n🛒 *PRODUCTOS:*\n${waItemsText}\n\n` +
      `💵 *Subtotal:* $${subtotal.toFixed(2)}\n` +
      `🛵 *Envío:* $${deliveryCost.toFixed(2)}\n` +
      `💰 *TOTAL A PAGAR: $${total.toFixed(2)}*\n\n` +
      `_¡Muchas gracias por su preferencia!_`;

    const waUrl = `https://api.whatsapp.com/send?phone=524731234567&text=${encodeURIComponent(waMessage)}`;

    return {
      success: true,
      order: newOrder,
      whatsappUrl: waUrl,
      whatsappMessage: waMessage
    };
  }

  saveOrderLocally(order) {
    const orders = JSON.parse(localStorage.getItem('lenios_orders') || '[]');
    orders.unshift(order);
    localStorage.setItem('lenios_orders', JSON.stringify(orders));
    localStorage.setItem('lenios_last_order_id', order.id);
  }

  // Obtener pedidos para el admin o tracking
  async getOrders() {
    if (this.isBackendAvailable === null) await this.checkBackend();

    if (this.isBackendAvailable) {
      try {
        const res = await fetch(`${API_BASE_URL}/orders`);
        const data = await res.json();
        if (data.success) {
          localStorage.setItem('lenios_orders', JSON.stringify(data.orders));
          return data.orders;
        }
      } catch (err) {
        console.warn('Fallo backend:', err);
      }
    }
    return JSON.parse(localStorage.getItem('lenios_orders') || '[]');
  }

  // Obtener pedido por ID
  async getOrderById(orderId) {
    const orders = await this.getOrders();
    return orders.find(o => o.id.toUpperCase() === orderId.toUpperCase());
  }

  // Actualizar estado de pedido
  async updateOrderStatus(orderId, status) {
    if (this.isBackendAvailable === null) await this.checkBackend();

    if (this.isBackendAvailable) {
      try {
        const res = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status })
        });
        const data = await res.json();
        if (data.success) return data.order;
      } catch (err) {
        console.warn('Fallo backend:', err);
      }
    }

    const orders = JSON.parse(localStorage.getItem('lenios_orders') || '[]');
    const ord = orders.find(o => o.id.toUpperCase() === orderId.toUpperCase());
    if (ord) {
      ord.status = status;
      ord.updatedAt = new Date().toISOString();
      localStorage.setItem('lenios_orders', JSON.stringify(orders));
      return ord;
    }
    return null;
  }

  // Eliminar pedido
  async deleteOrder(orderId) {
    if (this.isBackendAvailable === null) await this.checkBackend();

    if (this.isBackendAvailable) {
      try {
        const res = await fetch(`${API_BASE_URL}/orders/${orderId}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) return true;
      } catch (err) {
        console.warn('Fallo backend:', err);
      }
    }

    let orders = JSON.parse(localStorage.getItem('lenios_orders') || '[]');
    orders = orders.filter(o => o.id.toUpperCase() !== orderId.toUpperCase());
    localStorage.setItem('lenios_orders', JSON.stringify(orders));
    return true;
  }
}

window.apiClient = new ApiClient();
