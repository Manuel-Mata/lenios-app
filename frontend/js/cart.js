/**
 * LEÑOS RELLENOS - Gestión del Carrito y Checkout con WhatsApp
 * Implementa persistencia por sesión de usuario y cálculo reactivo en tiempo real
 */

class CartManager {
  constructor() {
    this.sessionCartKey = 'lenios_session_cart';
    this.items = this.loadCart();
    this.listeners = [];
  }

  // Cargar carrito persistido durante la sesión del usuario
  loadCart() {
    try {
      const sessionData = sessionStorage.getItem(this.sessionCartKey);
      if (sessionData) {
        return JSON.parse(sessionData);
      }
      // Fallback a localStorage si el usuario cambió de pestaña en la misma sesión
      const localData = localStorage.getItem(this.sessionCartKey);
      if (localData) {
        return JSON.parse(localData);
      }
      return [];
    } catch (e) {
      console.warn('Error al cargar carrito de la sesión:', e);
      return [];
    }
  }

  // Guardar y persistir durante la sesión del usuario
  saveCart() {
    try {
      sessionStorage.setItem(this.sessionCartKey, JSON.stringify(this.items));
      localStorage.setItem(this.sessionCartKey, JSON.stringify(this.items));
      
      // Sincronizar con la sesión del backend en segundo plano
      if (window.apiClient && typeof window.apiClient.syncSessionCart === 'function') {
        window.apiClient.syncSessionCart(this.items);
      }
    } catch (e) {
      console.warn('Error al guardar carrito en la sesión:', e);
    }
    this.notify();
  }

  // Agregar producto desde el catálogo
  addItem(product, quantity = 1, customization = '', extraPrice = 0) {
    const basePrice = parseFloat(product.price) || 0;
    const addedExtra = Math.max(0, parseFloat(extraPrice) || 0);
    const finalPrice = basePrice + addedExtra;
    const cartItemId = `${product.id}-${customization.replace(/\s+/g, '')}`;

    const existing = this.items.find(i => i.cartItemId === cartItemId);
    if (existing) {
      existing.quantity += quantity;
    } else {
      this.items.push({
        cartItemId,
        id: product.id,
        name: product.name,
        price: finalPrice,
        basePrice: basePrice,
        extraPrice: addedExtra,
        quantity: Math.max(1, quantity),
        customization: customization || '',
        image: product.image
      });
    }

    this.saveCart();
    showToast(`🛒 "${product.name}" agregado al carrito (${this.getTotalCount()} productos en total)`);
  }

  // Modificar cantidad de cada producto en el carrito
  updateQuantity(cartItemId, newQty) {
    const qty = parseInt(newQty);
    const itemIndex = this.items.findIndex(i => i.cartItemId === cartItemId);
    
    if (itemIndex === -1) return;

    if (isNaN(qty) || qty <= 0) {
      this.removeItem(cartItemId);
      return;
    }

    this.items[itemIndex].quantity = qty;
    this.saveCart();
    this.renderCartView();
  }

  // Eliminar producto del carrito
  removeItem(cartItemId) {
    const itemToRemove = this.items.find(i => i.cartItemId === cartItemId);
    this.items = this.items.filter(i => i.cartItemId !== cartItemId);
    this.saveCart();
    this.renderCartView();
    if (itemToRemove) {
      showToast(`🗑️ "${itemToRemove.name}" eliminado del carrito`);
    }
  }

  // Vaciar carrito
  clearCart() {
    this.items = [];
    this.saveCart();
    this.renderCartView();
  }

  // Cálculo del subtotal en tiempo real
  getSubtotal() {
    return this.items.reduce((sum, item) => {
      const price = parseFloat(item.price) || 0;
      const qty = parseInt(item.quantity) || 1;
      return sum + (price * qty);
    }, 0);
  }

  // Cantidad total de leños en el carrito
  getTotalCount() {
    return this.items.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);
  }

  subscribe(callback) {
    this.listeners.push(callback);
  }

  notify() {
    this.listeners.forEach(cb => cb(this.items));
    this.updateBadges();
  }

  // Actualizar contadores del navbar en tiempo real
  updateBadges() {
    const badges = document.querySelectorAll('.cart-badge');
    const count = this.getTotalCount();
    badges.forEach(b => {
      b.textContent = count;
      b.style.display = count > 0 ? 'inline-block' : 'inline-block';
      if (count > 0) {
        b.classList.add('badge-pop');
        setTimeout(() => b.classList.remove('badge-pop'), 250);
      }
    });
  }

  // Renderizar la vista del carrito con cálculo en tiempo real
  renderCartView() {
    const cartContainer = document.getElementById('cartItemsList');
    const cartSubtotalEl = document.getElementById('cartSubtotal');
    const cartDeliveryEl = document.getElementById('cartDelivery');
    const cartTotalEl = document.getElementById('cartTotal');
    const deliveryRadio = document.querySelector('input[name="deliveryType"]:checked');
    const isDelivery = deliveryRadio ? deliveryRadio.value === 'delivery' : true;

    if (!cartContainer) return;

    if (this.items.length === 0) {
      cartContainer.innerHTML = `
        <div class="cart-empty-state">
          <div class="icon">🥖</div>
          <h3>Tu carrito está vacío</h3>
          <p>Explora nuestro delicioso menú artesanal y añade tus leños favoritos.</p>
          <button class="btn-primary" style="margin-top: 16px;" onclick="switchView('menu')">
            Ver Menú Completo 🚀
          </button>
        </div>
      `;
      if (cartSubtotalEl) cartSubtotalEl.textContent = '$0.00';
      if (cartDeliveryEl) cartDeliveryEl.textContent = '$0.00';
      if (cartTotalEl) cartTotalEl.textContent = '$0.00';
      return;
    }

    let html = '';
    this.items.forEach(item => {
      const itemSubtotal = (item.price * item.quantity).toFixed(2);
      html += `
        <div class="cart-item-row" data-id="${item.cartItemId}">
          <img src="${item.image}" alt="${item.name}" class="cart-item-thumb">
          <div class="cart-item-info">
            <h4>${item.name}</h4>
            ${item.customization ? `<p class="cart-item-custom">✨ ${item.customization}</p>` : ''}
            <p style="font-size: 0.84rem; color: var(--color-text-muted);">Precio unitario: $${parseFloat(item.price).toFixed(2)}</p>
          </div>
          <div class="cart-qty-ctrl">
            <button class="qty-btn" title="Disminuir" onclick="cartManager.updateQuantity('${item.cartItemId}', ${item.quantity - 1})">-</button>
            <span style="font-weight: 700; font-size: 0.95rem; min-width: 24px; text-align: center;">${item.quantity}</span>
            <button class="qty-btn" title="Aumentar" onclick="cartManager.updateQuantity('${item.cartItemId}', ${item.quantity + 1})">+</button>
          </div>
          <div style="display: flex; align-items: center; gap: 12px;">
            <span class="cart-item-price">$${itemSubtotal}</span>
            <button class="cart-item-remove" title="Eliminar producto" onclick="cartManager.removeItem('${item.cartItemId}')">
              🗑️
            </button>
          </div>
        </div>
      `;
    });

    cartContainer.innerHTML = html;

    // Cálculo de subtotal y total en tiempo real
    const subtotal = this.getSubtotal();
    const deliveryCost = isDelivery ? 25.00 : 0.00;
    const total = subtotal + deliveryCost;

    if (cartSubtotalEl) cartSubtotalEl.textContent = `$${subtotal.toFixed(2)}`;
    if (cartDeliveryEl) cartDeliveryEl.textContent = `$${deliveryCost.toFixed(2)}`;
    if (cartTotalEl) cartTotalEl.textContent = `$${total.toFixed(2)}`;
  }
}

window.cartManager = new CartManager();
