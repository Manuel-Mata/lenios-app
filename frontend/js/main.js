/**
 * LEÑOS RELLENOS - Orquestador Principal de la Aplicación
 */

class MainApp {
  constructor() {
    this.currentView = 'home';
    this.currentCategory = 'all';
    this.carouselIndex = 0;
    this.carouselItems = [];
    this.carouselTimer = null;
  }

  async init() {
    if (window.authManager) {
      await window.authManager.init();
    }
    window.customizerManager.init();
    await this.loadBusinessHeader();
    await this.renderCarousel();
    await this.renderCategories();
    await this.renderProducts();
    window.cartManager.notify();
    this.setupEventListeners();
  }

  async loadBusinessHeader() {
    const business = await window.apiClient.getBusinessInfo();
    const scheduleEl = document.getElementById('headerScheduleText');
    if (scheduleEl) scheduleEl.textContent = business.schedule;
    updateGlobalStoreStatusIndicator(business.isOpen);
  }

  async renderCarousel() {
    const container = document.getElementById('carouselSlideContainer');
    const dotsContainer = document.getElementById('carouselDotsContainer');
    if (!container) return;

    const products = await window.apiClient.getProducts();
    this.carouselItems = products.filter(p => p.isFeatured || p.category === 'gourmet' || p.category === 'especiales').slice(0, 5);

    if (this.carouselItems.length === 0) {
      this.carouselItems = products.slice(0, 4);
    }

    container.innerHTML = this.carouselItems.map((item, idx) => `
      <div class="carousel-item ${idx === 0 ? 'active' : ''}" data-index="${idx}">
        <div class="carousel-image-wrapper">
          <img src="${item.image}" alt="${item.name}">
          <span class="carousel-badge-float">${item.badge || '🔥 Especialidad'}</span>
        </div>
        <div class="carousel-info">
          <h4>${item.name}</h4>
          <p>${item.description}</p>
        </div>
        <div class="carousel-footer">
          <span class="carousel-price">$${parseFloat(item.price).toFixed(2)}</span>
          <div style="display: flex; gap: 8px;">
            <button class="btn-card-customize" onclick="customizerManager.open('${item.id}')">
              Personalizar ⚙️
            </button>
            <button class="btn-card-add" onclick="cartManager.addItem(${JSON.stringify(item).replace(/"/g, '&quot;')})">
              Comprar 🛒
            </button>
          </div>
        </div>
      </div>
    `).join('');

    if (dotsContainer) {
      dotsContainer.innerHTML = this.carouselItems.map((_, idx) => `
        <div class="carousel-dot ${idx === 0 ? 'active' : ''}" onclick="mainApp.goToCarouselSlide(${idx})"></div>
      `).join('');
    }

    this.startCarouselAutoPlay();
  }

  startCarouselAutoPlay() {
    if (this.carouselTimer) clearInterval(this.carouselTimer);
    this.carouselTimer = setInterval(() => {
      this.nextCarouselSlide();
    }, 4500);
  }

  nextCarouselSlide() {
    if (this.carouselItems.length <= 1) return;
    this.carouselIndex = (this.carouselIndex + 1) % this.carouselItems.length;
    this.updateCarouselUI();
  }

  prevCarouselSlide() {
    if (this.carouselItems.length <= 1) return;
    this.carouselIndex = (this.carouselIndex - 1 + this.carouselItems.length) % this.carouselItems.length;
    this.updateCarouselUI();
  }

  goToCarouselSlide(idx) {
    this.carouselIndex = idx;
    this.updateCarouselUI();
    this.startCarouselAutoPlay();
  }

  updateCarouselUI() {
    const items = document.querySelectorAll('.carousel-item');
    const dots = document.querySelectorAll('.carousel-dot');

    items.forEach((it, idx) => {
      it.classList.toggle('active', idx === this.carouselIndex);
    });

    dots.forEach((dot, idx) => {
      dot.classList.toggle('active', idx === this.carouselIndex);
    });
  }

  async renderCategories() {
    const container = document.getElementById('categoryTabsContainer');
    if (!container) return;

    container.innerHTML = DEFAULT_CATEGORIES.map(cat => `
      <button class="category-tab-btn ${cat.id === this.currentCategory ? 'active' : ''}" onclick="mainApp.filterCategory('${cat.id}')">
        <span>${cat.name}</span>
      </button>
    `).join('');
  }

  async filterCategory(categoryId) {
    this.currentCategory = categoryId;
    await this.renderCategories();
    await this.renderProducts();
  }

  async renderProducts() {
    const container = document.getElementById('productsGridContainer');
    const homeFeaturedContainer = document.getElementById('homeFeaturedGrid');
    const searchTerm = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
    let products = await window.apiClient.getProducts();

    // Renderizar destacados en Home si existe
    if (homeFeaturedContainer) {
      const featured = products.filter(p => p.isFeatured).slice(0, 4);
      homeFeaturedContainer.innerHTML = featured.map(p => this.createProductCardHtml(p)).join('');
    }

    if (!container) return;

    if (this.currentCategory !== 'all') {
      products = products.filter(p => p.category === this.currentCategory);
    }

    if (searchTerm) {
      products = products.filter(p => 
        p.name.toLowerCase().includes(searchTerm) || 
        p.description.toLowerCase().includes(searchTerm)
      );
    }

    if (products.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--color-text-muted);">
          <h3>No se encontraron leños con esos criterios</h3>
          <p>Intenta con otra categoría o término de búsqueda.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = products.map(product => this.createProductCardHtml(product)).join('');
  }

  createProductCardHtml(product) {
    const isAvailable = product.available && product.stock > 0;
    const isLowStock = product.stock > 0 && product.stock <= 3;
    const prodJson = JSON.stringify(product).replace(/"/g, '&quot;');

    return `
      <div class="product-card ${!isAvailable ? 'out-of-stock' : ''}">
        <div class="product-thumb-container">
          <img src="${product.image}" alt="${product.name}" loading="lazy">
          ${product.badge ? `<span class="product-badge">${product.badge}</span>` : ''}
          <span class="stock-tag ${isLowStock ? 'low' : ''}">
            ${isAvailable ? (isLowStock ? `¡Solo ${product.stock} restantes!` : `Stock: ${product.stock}`) : 'Agotado'}
          </span>
        </div>
        <div class="product-body">
          <h4 class="product-title">${product.name}</h4>
          <p class="product-desc">${product.description}</p>
          <div class="product-card-footer">
            <span class="product-price">$${parseFloat(product.price).toFixed(2)}</span>
            <div style="display: flex; gap: 8px;">
              ${isAvailable ? `
                <button class="btn-card-customize" onclick="customizerManager.open('${product.id}')" title="Personalizar Base/Extras">
                  ⚙️
                </button>
                <button class="btn-card-add" onclick="cartManager.addItem(${prodJson})">
                  + Agregar
                </button>
              ` : `
                <button class="btn-card-customize" disabled style="opacity: 0.6; cursor: not-allowed;">
                  No Disponible
                </button>
              `}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    // Buscador en tiempo real
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', () => this.renderProducts());
    }

    // Toggle de Delivery / Pickup
    const deliveryRadios = document.querySelectorAll('input[name="deliveryType"]');
    deliveryRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        const addressGroup = document.getElementById('addressFormGroup');
        if (addressGroup) {
          addressGroup.style.display = radio.value === 'pickup' ? 'none' : 'block';
        }
        window.cartManager.renderCartView();
      });
    });

    // Envío del Checkout
    const checkoutForm = document.getElementById('checkoutForm');
    if (checkoutForm) {
      checkoutForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleCheckoutSubmit();
      });
    }
  }

  async handleCheckoutSubmit() {
    if (window.cartManager.items.length === 0) {
      showToast('Tu carrito está vacío', 'error');
      return;
    }

    const customerName = document.getElementById('custName').value.trim();
    const customerPhone = document.getElementById('custPhone').value.trim();
    const customerAddress = document.getElementById('custAddress')?.value.trim() || '';
    const deliveryType = document.querySelector('input[name="deliveryType"]:checked').value;
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
    const notes = document.getElementById('orderNotes').value.trim();

    if (!customerName || !customerPhone) {
      showToast('Por favor completa tu nombre y teléfono', 'error');
      return;
    }

    if (deliveryType === 'delivery' && !customerAddress) {
      showToast('Ingresa tu dirección de entrega', 'error');
      return;
    }

    const payload = {
      customerName,
      customerPhone,
      customerAddress,
      deliveryType,
      paymentMethod,
      notes,
      items: window.cartManager.items
    };

    const submitBtn = document.getElementById('btnSendWhatsAppOrder') || document.querySelector('.btn-whatsapp-order');
    const originalBtnText = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>⏳ Generando pedido...</span>';
    }

    try {
      const result = await window.apiClient.createOrder(payload);

      if (result && result.success) {
        window.cartManager.clearCart();
        showToast('¡Pedido generado con éxito! Abriendo WhatsApp...');

        const waUrl = result.whatsappUrl;

        // Abrir WhatsApp de forma confiable evitando bloqueo de popups
        if (waUrl) {
          const newTab = window.open(waUrl, '_blank', 'noopener,noreferrer');
          if (!newTab || newTab.closed || typeof newTab.closed === 'undefined') {
            const link = document.createElement('a');
            link.href = waUrl;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            document.body.appendChild(link);
            link.click();
            link.remove();
          }
        }

        // Redirigir a vista de seguimiento
        switchView('tracking');
        if (result.order && result.order.id) {
          window.trackerManager.loadOrder(result.order.id);
        }
      } else {
        showToast(result?.message || 'Error al procesar el pedido', 'error');
      }
    } catch (err) {
      console.error('Error al enviar pedido:', err);
      showToast('Ocurrió un error al generar el pedido', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
      }
    }
  }
}

// Router con verificación de autenticación y roles para rutas protegidas
function switchView(viewName) {
  // Verificar permisos de acceso a la vista
  if (window.authManager && !window.authManager.canAccessView(viewName)) {
    return;
  }

  const sections = document.querySelectorAll('.view-section');
  const navLinks = document.querySelectorAll('.nav-link');

  sections.forEach(s => {
    s.classList.remove('active');
  });

  const target = document.getElementById(`view-${viewName}`);
  if (target) {
    target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  navLinks.forEach(l => {
    l.classList.remove('active');
    if (l.dataset.view === viewName) {
      l.classList.add('active');
    }
  });

  if (viewName === 'cart') {
    window.cartManager.renderCartView();
  } else if (viewName === 'tracking') {
    window.trackerManager.loadOrder();
  } else if (viewName === 'admin') {
    window.adminManager.init();
  } else if (viewName === 'menu') {
    if (window.mainApp) window.mainApp.renderProducts();
  }
}

  // Cerrar menú móvil si estuviera abierto
  const navLinksList = document.querySelector('.nav-links');
  if (navLinksList) navLinksList.classList.remove('mobile-open');
}

function toggleMobileNav() {
  const nav = document.querySelector('.nav-links');
  if (nav) nav.classList.toggle('mobile-open');
}

function updateGlobalStoreStatusIndicator(isOpen) {
  const dots = document.querySelectorAll('.status-dot');
  const textEls = document.querySelectorAll('.status-text-label');

  dots.forEach(d => {
    d.className = `status-dot ${isOpen ? 'open' : 'closed'}`;
  });

  textEls.forEach(t => {
    t.textContent = isOpen ? 'ABIERTO AHORA' : 'CERRADO TEMPORALMENTE';
  });
}

function showToast(message, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = '0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// Inicialización al cargar la página
window.addEventListener('DOMContentLoaded', () => {
  window.mainApp = new MainApp();
  window.mainApp.init();
});
