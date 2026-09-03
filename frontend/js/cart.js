/**
 * LEÑOS RELLENOS - Gestión del Carrito y Checkout con WhatsApp
 */

class CartManager {
  constructor() {
    this.cartKey = 'lenios_cart_items';
    this.items = this.loadCart();
    this.listeners = [];
  }

  loadCart() {
    try {
      return JSON.parse(localStorage.getItem(this.cartKey) || '[]');
    } catch (e) {
      return [];
    }
  }

  saveCart() {
    localStorage.setItem(this.cartKey, JSON.stringify(this.items));
    this.notify();
  }

  addItem(product, quantity = 1, customization = '', extraPrice = 0) {
    const finalPrice = (parseFloat(product.price) || 0) + extraPrice;
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
        basePrice: product.price,
        quantity,
        customization,
        image: product.image
      });
    }

    this.saveCart();
    showToast(`🛒 "${product.name}" agregado al carrito`);
  }

  updateQuantity(cartItemId, newQty) {
    const item = this.items.find(i => i.cartItemId === cartItemId);
    if (item) {
      item.quantity = parseInt(newQty);
      if (item.quantity <= 0) {
        this.removeItem(cartItemId);
        return;
      }
      this.saveCart();
    }
  }

  removeItem(cartItemId) {
    this.items = this.items.filter(i => i.cartItemId !== cartItemId);
    this.saveCart();
    showToast('Producto retirado del carrito');
  }

  clearCart() {
    this.items = [];
    this.saveCart();
  }

  getSubtotal() {
    return this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }

  getTotalCount() {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  subscribe(callback) {
    this.listeners.push(callback);
  }

  notify() {
    this.listeners.forEach(cb => cb(this.items));
    this.updateBadges();
  }

  updateBadges() {
    const badges = document.querySelectorAll('.cart-badge');
    const count = this.getTotalCount();
    badges.forEach(b => {
      b.textContent = count;
    });
  }

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
            Ver Menú Completo
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
      html += `
        <div class="cart-item-row" data-id="${item.cartItemId}">
          <img src="${item.image}" alt="${item.name}" class="cart-item-thumb">
          <div class="cart-item-info">
            <h4>${item.name}</h4>
            ${item.customization ? `<p>✨ ${item.customization}</p>` : ''}
            <p>Precio unitario: $${item.price.toFixed(2)}</p>
          </div>
          <div class="cart-qty-ctrl">
            <button class="qty-btn" onclick="cartManager.updateQuantity('${item.cartItemId}', ${item.quantity - 1})">-</button>
            <span style="font-weight: 700; font-size: 0.9rem; min-width: 20px; text-align: center;">${item.quantity}</span>
            <button class="qty-btn" onclick="cartManager.updateQuantity('${item.cartItemId}', ${item.quantity + 1})">+</button>
          </div>
          <div style="display: flex; align-items: center; gap: 12px;">
            <span class="cart-item-price">$${(item.price * item.quantity).toFixed(2)}</span>
            <button class="cart-item-remove" title="Eliminar" onclick="cartManager.removeItem('${item.cartItemId}')">
              🗑️
            </button>
          </div>
        </div>
      `;
    });

    cartContainer.innerHTML = html;

    const subtotal = this.getSubtotal();
    const deliveryCost = isDelivery ? 25.00 : 0.00;
    const total = subtotal + deliveryCost;

    if (cartSubtotalEl) cartSubtotalEl.textContent = `$${subtotal.toFixed(2)}`;
    if (cartDeliveryEl) cartDeliveryEl.textContent = `$${deliveryCost.toFixed(2)}`;
    if (cartTotalEl) cartTotalEl.textContent = `$${total.toFixed(2)}`;
  }
}

window.cartManager = new CartManager();
