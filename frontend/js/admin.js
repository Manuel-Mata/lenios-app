/**
 * LEÑOS RELLENOS - Panel de Administración y Dashboard del Dueño
 */

class AdminManager {
  constructor() {
    this.currentFilter = 'all';
  }

  async init() {
    await this.renderDashboard();
  }

  async renderDashboard() {
    await this.renderKPIs();
    await this.renderOrdersTable();
    await this.renderProductsInventoryTable();
    await this.renderBusinessStatusToggle();
  }

  async renderKPIs() {
    const orders = await window.apiClient.getOrders();
    const products = await window.apiClient.getProducts();

    const activeOrders = orders.filter(o => o.status !== 'cancelled');
    const totalSales = activeOrders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
    const pendingCount = orders.filter(o => o.status === 'received' || o.status === 'in_oven').length;
    const activeProductsCount = products.filter(p => p.available && p.stock > 0).length;
    const outOfStockCount = products.filter(p => !p.available || p.stock === 0).length;

    const salesEl = document.getElementById('kpiSales');
    const ordersCountEl = document.getElementById('kpiPendingOrders');
    const activeProdsEl = document.getElementById('kpiActiveProducts');
    const outOfStockEl = document.getElementById('kpiOutOfStock');

    if (salesEl) salesEl.textContent = `$${totalSales.toFixed(2)}`;
    if (ordersCountEl) ordersCountEl.textContent = pendingCount;
    if (activeProdsEl) activeProdsEl.textContent = activeProductsCount;
    if (outOfStockEl) outOfStockEl.textContent = outOfStockCount;
  }

  async renderOrdersTable() {
    const tbody = document.getElementById('adminOrdersTableBody');
    if (!tbody) return;

    let orders = await window.apiClient.getOrders();

    if (this.currentFilter !== 'all') {
      orders = orders.filter(o => o.status === this.currentFilter);
    }

    if (orders.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--color-text-muted); padding: 24px;">No hay pedidos en esta categoría.</td></tr>`;
      return;
    }

    tbody.innerHTML = orders.map(order => {
      const itemsSummary = (order.items || []).map(i => `${i.quantity}x ${i.name}`).join('<br>');
      return `
        <tr>
          <td>
            <strong>#${order.id}</strong><br>
            <small style="color: var(--color-text-muted);">${new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
          </td>
          <td>
            <strong>${order.customerName}</strong><br>
            <small style="color: var(--color-text-muted);">📱 ${order.customerPhone}</small><br>
            <small style="color: var(--color-text-muted);">📍 ${order.customerAddress}</small>
          </td>
          <td style="font-size: 0.82rem;">${itemsSummary}</td>
          <td style="font-weight: 700; color: var(--color-primary);">$${(order.total || 0).toFixed(2)}</td>
          <td>
            <select class="form-select" style="padding: 4px 8px; font-size: 0.82rem;" onchange="adminManager.changeOrderStatus('${order.id}', this.value)">
              <option value="received" ${order.status === 'received' ? 'selected' : ''}>📝 Recibido</option>
              <option value="in_oven" ${order.status === 'in_oven' ? 'selected' : ''}>🔥 En Horno</option>
              <option value="on_the_way" ${order.status === 'on_the_way' ? 'selected' : ''}>🛵 En Camino</option>
              <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>✅ Entregado</option>
              <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>❌ Cancelado</option>
            </select>
          </td>
          <td>
            <div style="display: flex; gap: 6px;">
              <button class="btn-card-customize" style="padding: 6px 10px;" title="Ver en Rastreo" onclick="switchView('tracking'); trackerManager.loadOrder('${order.id}')">
                👁️
              </button>
              <button class="btn-card-customize" style="padding: 6px 10px; background: #DCFCE7; color: #16A34A;" title="Avisar por WhatsApp" onclick="adminManager.notifyCustomerWA('${order.id}')">
                💬
              </button>
              <button class="cart-item-remove" title="Eliminar" onclick="adminManager.deleteOrder('${order.id}')">
                🗑️
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  async renderProductsInventoryTable() {
    const tbody = document.getElementById('adminProductsTableBody');
    if (!tbody) return;

    const products = await window.apiClient.getProducts();

    tbody.innerHTML = products.map(prod => `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 10px;">
            <img src="${prod.image}" style="width: 44px; height: 44px; border-radius: 8px; object-fit: cover;" alt="">
            <div>
              <strong>${prod.name}</strong><br>
              <small style="color: var(--color-text-muted);">${prod.category.toUpperCase()}</small>
            </div>
          </div>
        </td>
        <td style="font-weight: 700; color: var(--color-primary);">$${parseFloat(prod.price).toFixed(2)}</td>
        <td>
          <input type="number" value="${prod.stock}" min="0" style="width: 60px; padding: 4px; border: 1px solid var(--color-border-light); border-radius: 4px;" onchange="adminManager.updateProductStock('${prod.id}', this.value)">
        </td>
        <td>
          <label class="toggle-switch">
            <input type="checkbox" ${prod.available ? 'checked' : ''} onchange="adminManager.toggleProduct('${prod.id}')">
            <span class="toggle-slider"></span>
          </label>
        </td>
        <td>
          <button class="cart-item-remove" title="Eliminar Producto" onclick="adminManager.deleteProduct('${prod.id}')">
            🗑️
          </button>
        </td>
      </tr>
    `).join('');
  }

  async renderBusinessStatusToggle() {
    const business = await window.apiClient.getBusinessInfo();
    const toggleEl = document.getElementById('adminStoreToggle');
    const statusTextEl = document.getElementById('adminStoreStatusText');

    if (toggleEl) toggleEl.checked = business.isOpen;
    if (statusTextEl) {
      statusTextEl.textContent = business.isOpen ? '🟢 Negocio ABIERTO (Aceptando pedidos)' : '🔴 Negocio CERRADO';
      statusTextEl.style.color = business.isOpen ? 'var(--color-success)' : 'var(--color-danger)';
    }

    updateGlobalStoreStatusIndicator(business.isOpen);
  }

  async toggleStoreStatus() {
    const isOpen = await window.apiClient.toggleBusinessOpen();
    this.renderBusinessStatusToggle();
    showToast(`El negocio ahora está ${isOpen ? 'ABIERTO' : 'CERRADO'}`);
  }

  async changeOrderStatus(orderId, newStatus) {
    await window.apiClient.updateOrderStatus(orderId, newStatus);
    showToast(`Estado de #${orderId} actualizado`);
    await this.renderDashboard();
  }

  async notifyCustomerWA(orderId) {
    const order = await window.apiClient.getOrderById(orderId);
    if (!order) return;

    const phone = order.customerPhone.replace(/\D/g, '');
    const msgs = {
      'received': `¡Hola ${order.customerName}! 🪵 Hemos recibido tu pedido #${order.id} de Leños Rellenos y pronto comenzaremos a hornearlo.`,
      'in_oven': `¡Hola ${order.customerName}! 🔥 Tu leño relleno está en nuestro horno de leña alcanzando el dorado perfecto.`,
      'on_the_way': `¡Hola ${order.customerName}! 🛵 ¡Tu pedido va en camino a tu dirección: ${order.customerAddress}!`,
      'delivered': `¡Hola ${order.customerName}! 🎉 Esperamos que hayas disfrutado tus Leños Rellenos. ¡Buen provecho!`
    };

    const text = encodeURIComponent(msgs[order.status] || msgs['received']);
    window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${text}`, '_blank');
  }

  async deleteOrder(orderId) {
    if (confirm(`¿Estás seguro de eliminar el pedido #${orderId}?`)) {
      await window.apiClient.deleteOrder(orderId);
      showToast('Pedido eliminado');
      await this.renderDashboard();
    }
  }

  async toggleProduct(productId) {
    await window.apiClient.toggleProductAvailability(productId);
    showToast('Disponibilidad actualizada');
    await this.renderDashboard();
    if (window.mainApp) window.mainApp.renderProducts();
  }

  async updateProductStock(productId, newStock) {
    const products = await window.apiClient.getProducts();
    const prod = products.find(p => p.id === productId);
    if (prod) {
      prod.stock = parseInt(newStock) || 0;
      if (prod.stock === 0) prod.available = false;
      const allProds = JSON.parse(localStorage.getItem('lenios_products') || '[]');
      const idx = allProds.findIndex(p => p.id === productId);
      if (idx >= 0) {
        allProds[idx] = prod;
        localStorage.setItem('lenios_products', JSON.stringify(allProds));
      }
      showToast('Stock actualizado');
      await this.renderDashboard();
      if (window.mainApp) window.mainApp.renderProducts();
    }
  }

  async deleteProduct(productId) {
    if (confirm('¿Eliminar este leño del menú?')) {
      await window.apiClient.deleteProduct(productId);
      showToast('Producto eliminado');
      await this.renderDashboard();
      if (window.mainApp) window.mainApp.renderProducts();
    }
  }

  async addNewProduct(event) {
    event.preventDefault();
    const name = document.getElementById('newProdName').value;
    const price = parseFloat(document.getElementById('newProdPrice').value);
    const category = document.getElementById('newProdCategory').value;
    const stock = parseInt(document.getElementById('newProdStock').value) || 10;
    const description = document.getElementById('newProdDesc').value;
    const image = document.getElementById('newProdImage').value;

    await window.apiClient.addProduct({
      name,
      price,
      category,
      stock,
      description,
      image: image || 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
      badge: '⭐ Nuevo'
    });

    showToast(`¡"${name}" agregado al menú!`);
    document.getElementById('addProductForm').reset();
    document.getElementById('addProductModal').classList.remove('active');
    await this.renderDashboard();
    if (window.mainApp) window.mainApp.renderProducts();
  }
}

window.adminManager = new AdminManager();
