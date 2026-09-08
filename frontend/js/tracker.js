/**
 * LEÑOS RELLENOS - Seguimiento y Rastreo de Pedidos
 */

class TrackerManager {
  constructor() {
    this.currentOrder = null;
  }

  async loadOrder(orderId) {
    if (!orderId) {
      orderId = localStorage.getItem('lenios_last_order_id') || 'LR-10821';
    }

    const order = await window.apiClient.getOrderById(orderId);
    if (!order) {
      showToast('Pedido no encontrado', 'error');
      return;
    }

    this.currentOrder = order;
    this.renderTrackingView(order);
  }

  renderTrackingView(order) {
    const orderIdEl = document.getElementById('trackOrderId');
    const customerNameEl = document.getElementById('trackCustomerName');
    const addressEl = document.getElementById('trackAddress');
    const phoneEl = document.getElementById('trackPhone');
    const totalEl = document.getElementById('trackTotal');
    const itemsListEl = document.getElementById('trackItemsList');
    const deliveryMethodEl = document.getElementById('trackDeliveryMethod');
    const progressBar = document.getElementById('trackingProgressBar');
    const stepNodes = document.querySelectorAll('.step-node');

    if (orderIdEl) orderIdEl.textContent = `#${order.id}`;
    if (customerNameEl) customerNameEl.textContent = order.customerName;
    if (addressEl) addressEl.textContent = order.customerAddress;
    if (phoneEl) phoneEl.textContent = order.customerPhone;
    if (totalEl) totalEl.textContent = `$${(order.total || 0).toFixed(2)}`;
    if (deliveryMethodEl) deliveryMethodEl.textContent = order.deliveryType === 'delivery' ? 'Entrega a Domicilio 🛵' : 'Recoger en Sucursal 🏪';

    // Render Items
    if (itemsListEl && order.items) {
      itemsListEl.innerHTML = order.items.map(item => `
        <div class="tracking-product-item">
          <span>${item.quantity}x ${item.name} ${item.customization ? `(${item.customization})` : ''}</span>
          <span style="font-weight: 700; color: var(--color-primary);">$${(item.price * item.quantity).toFixed(2)}</span>
        </div>
      `).join('');
    }

    // Actualizar Progreso Visual
    // Estados: 'received' -> 'in_oven' -> 'on_the_way' -> 'delivered'
    const statusMap = {
      'received': { index: 0, progress: '12%' },
      'in_oven': { index: 1, progress: '40%' },
      'on_the_way': { index: 2, progress: '75%' },
      'delivered': { index: 3, progress: '100%' },
      'cancelled': { index: 0, progress: '0%' }
    };

    const currentStatus = statusMap[order.status] || statusMap['received'];

    if (progressBar) {
      progressBar.style.width = currentStatus.progress;
    }

    stepNodes.forEach((node, idx) => {
      node.classList.remove('active', 'completed');
      if (idx < currentStatus.index) {
        node.classList.add('completed');
      } else if (idx === currentStatus.index) {
        node.classList.add('active');
      }
    });

    const statusBanner = document.getElementById('trackingStatusMessage');
    if (statusBanner) {
      const messages = {
        'received': '📝 Tu pedido ha sido recibido y está en fila de preparación.',
        'in_oven': '🔥 ¡Tu leño está en el horno de leña alcanzando su punto perfecto!',
        'on_the_way': '🛵 ¡Tu repartidor va en camino a tu domicilio!',
        'delivered': '🎉 ¡Pedido entregado! Disfruta el auténtico sabor a la leña.',
        'cancelled': '❌ Este pedido fue cancelado.'
      };
      statusBanner.textContent = messages[order.status] || messages['received'];
    }
  }

  async contactStore() {
    const business = JSON.parse(localStorage.getItem('lenios_business')) || DEFAULT_BUSINESS;
    const phone = (business.whatsappFormatted || '523751837635').replace(/\D/g, '');

    if (!this.currentOrder) {
      window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent('Hola Leños Rellenos, tengo una consulta sobre sus servicios.')}`, '_blank', 'noopener,noreferrer');
      return;
    }

    const order = this.currentOrder;
    const isDelivery = order.deliveryType === 'delivery';
    const deliveryCost = isDelivery ? (order.deliveryCost || 25.00) : 0;
    const itemsFormattedText = (order.items || []).map(i => {
      const customText = i.customization ? ` (${i.customization})` : '';
      return `• *${i.quantity}x* ${i.name} - $${((parseFloat(i.price) || 0) * (parseInt(i.quantity) || 1)).toFixed(2)}${customText}`;
    }).join('\n');

    const paymentText = order.paymentMethod === 'cash' ? 'Efectivo al recibir 💵' : 'Transferencia / SPEI 📲';
    const deliveryText = isDelivery ? 'A Domicilio 🛵' : 'Recoger en Local 🏪';

    const waMessage = 
      `🔥 *¡HOLA, LEÑOS RELLENOS!* 🔥\n` +
      `_Acabo de armar mi pedido desde la app web:_\n\n` +
      `📋 *DETALLES DEL PEDIDO*\n` +
      `• *Orden:* #${order.id}\n` +
      `• *Cliente:* ${order.customerName}\n` +
      `• *Teléfono:* ${order.customerPhone}\n` +
      `• *Entrega:* ${deliveryText}\n` +
      `• *Dirección:* ${order.customerAddress || 'Recoger en sucursal'}\n` +
      `• *Pago:* ${paymentText}\n` +
      (order.notes ? `• *Notas:* ${order.notes}\n` : '') +
      `\n🛒 *PRODUCTOS:*\n` +
      `${itemsFormattedText}\n\n` +
      `💵 *Subtotal:* $${(order.subtotal || 0).toFixed(2)}\n` +
      (isDelivery ? `🛵 *Envío:* $${deliveryCost.toFixed(2)}\n` : '') +
      `💰 *TOTAL A PAGAR: $${(order.total || 0).toFixed(2)}*\n\n` +
      `_¡Muchas gracias por su preferencia!_ 🔥🪵`;

    // Copiar automáticamente al portapapeles por seguridad
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(waMessage);
        showToast('📋 ¡Mensaje del pedido copiado al portapapeles! Si no aparece en WhatsApp, presiona Pegar (Ctrl+V)');
      }
    } catch (e) {
      // Ignorar error de portapapeles si los permisos están restringidos
    }

    const waUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(waMessage)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  }
}

window.trackerManager = new TrackerManager();
