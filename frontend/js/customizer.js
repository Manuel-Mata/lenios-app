/**
 * LEÑOS RELLENOS - Modal y Lógica de Personalización de Leños
 */

class CustomizerManager {
  constructor() {
    this.currentProduct = null;
    this.selectedBase = null;
    this.selectedFillings = [];
    this.selectedSauce = null;
    this.modalEl = null;
  }

  init() {
    this.modalEl = document.getElementById('customizerModal');
  }

  async open(productId) {
    const products = await window.apiClient.getProducts();
    const product = products.find(p => p.id === productId);
    if (!product) return;

    this.currentProduct = product;
    const options = await window.apiClient.getCustomizerOptions();

    // Valores por defecto
    this.selectedBase = options.bases[0];
    this.selectedFillings = [];
    this.selectedSauce = options.sauces[0];

    this.renderModalContent(product, options);
    if (this.modalEl) {
      this.modalEl.classList.add('active');
    }
  }

  close() {
    if (this.modalEl) {
      this.modalEl.classList.remove('active');
    }
  }

  calculateTotal() {
    let extra = (this.selectedBase ? this.selectedBase.price : 0);
    this.selectedFillings.forEach(f => {
      extra += f.price;
    });
    const basePrice = parseFloat(this.currentProduct.price) || 0;
    return basePrice + extra;
  }

  renderModalContent(product, options) {
    const titleEl = document.getElementById('customizerTitle');
    const basesContainer = document.getElementById('customizerBasesList');
    const fillingsContainer = document.getElementById('customizerFillingsList');
    const saucesContainer = document.getElementById('customizerSaucesList');
    const previewImg = document.getElementById('customizerPreviewImg');
    const previewName = document.getElementById('customizerPreviewName');

    if (titleEl) titleEl.textContent = `Personaliza tu ${product.name}`;
    if (previewImg) previewImg.src = product.image;
    if (previewName) previewName.textContent = product.name;

    // Render Bases
    if (basesContainer) {
      basesContainer.innerHTML = options.bases.map(b => `
        <label class="custom-radio-option ${b.id === this.selectedBase.id ? 'selected' : ''}" onclick="customizerManager.selectBase('${b.id}')">
          <div class="opt-left">
            <input type="radio" name="customBase" value="${b.id}" ${b.id === this.selectedBase.id ? 'checked' : ''}>
            <div>
              <span class="opt-name">${b.name}</span>
              <span class="opt-desc">${b.description}</span>
            </div>
          </div>
          <span class="opt-price">${b.price > 0 ? `+$${b.price.toFixed(2)}` : 'Incluida'}</span>
        </label>
      `).join('');
    }

    // Render Fillings / Toppings
    if (fillingsContainer) {
      fillingsContainer.innerHTML = options.fillings.map(f => {
        const isSelected = this.selectedFillings.some(item => item.id === f.id);
        return `
          <label class="custom-checkbox-option ${isSelected ? 'selected' : ''}" onclick="customizerManager.toggleFilling('${f.id}')">
            <div class="opt-left">
              <input type="checkbox" name="customFilling" value="${f.id}" ${isSelected ? 'checked' : ''}>
              <span class="opt-name">${f.name}</span>
            </div>
            <span class="opt-price">+$${f.price.toFixed(2)}</span>
          </label>
        `;
      }).join('');
    }

    // Render Sauces
    if (saucesContainer) {
      saucesContainer.innerHTML = options.sauces.map(s => `
        <label class="custom-radio-option ${s.id === this.selectedSauce.id ? 'selected' : ''}" onclick="customizerManager.selectSauce('${s.id}')">
          <div class="opt-left">
            <input type="radio" name="customSauce" value="${s.id}" ${s.id === this.selectedSauce.id ? 'checked' : ''}>
            <div>
              <span class="opt-name">${s.name}</span>
              <span class="opt-desc">${s.description}</span>
            </div>
          </div>
          <span class="opt-price">Gratis</span>
        </label>
      `).join('');
    }

    this.updatePreviewAndPrice();
  }

  async selectBase(baseId) {
    const options = await window.apiClient.getCustomizerOptions();
    this.selectedBase = options.bases.find(b => b.id === baseId) || options.bases[0];
    this.renderModalContent(this.currentProduct, options);
  }

  async toggleFilling(fillingId) {
    const options = await window.apiClient.getCustomizerOptions();
    const filling = options.fillings.find(f => f.id === fillingId);
    if (!filling) return;

    const idx = this.selectedFillings.findIndex(f => f.id === fillingId);
    if (idx >= 0) {
      this.selectedFillings.splice(idx, 1);
    } else {
      this.selectedFillings.push(filling);
    }
    this.renderModalContent(this.currentProduct, options);
  }

  async selectSauce(sauceId) {
    const options = await window.apiClient.getCustomizerOptions();
    this.selectedSauce = options.sauces.find(s => s.id === sauceId) || options.sauces[0];
    this.renderModalContent(this.currentProduct, options);
  }

  updatePreviewAndPrice() {
    const totalEl = document.getElementById('customizerTotalPrice');
    const tagsList = document.getElementById('customizerTagsList');

    const total = this.calculateTotal();
    if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;

    if (tagsList) {
      let tags = [];
      if (this.selectedBase) tags.push(`🍞 Base: ${this.selectedBase.name}`);
      if (this.selectedSauce) tags.push(`🍯 Salsa: ${this.selectedSauce.name}`);
      if (this.selectedFillings.length > 0) {
        tags.push(`🥓 Extras: ${this.selectedFillings.map(f => f.name).join(', ')}`);
      } else {
        tags.push(`✨ Sin ingredientes adicionales`);
      }

      tagsList.innerHTML = tags.map(t => `<div class="preview-tag-item">${t}</div>`).join('');
    }
  }

  addToCartFromCustomizer() {
    if (!this.currentProduct) return;

    let customTextParts = [];
    if (this.selectedBase) customTextParts.push(`Base: ${this.selectedBase.name}`);
    if (this.selectedSauce) customTextParts.push(`Salsa: ${this.selectedSauce.name}`);
    if (this.selectedFillings.length > 0) {
      customTextParts.push(`Extras: ${this.selectedFillings.map(f => f.name).join(', ')}`);
    }

    const customizationString = customTextParts.join(' | ');
    const extraCost = this.calculateTotal() - (parseFloat(this.currentProduct.price) || 0);

    window.cartManager.addItem(this.currentProduct, 1, customizationString, extraCost);
    this.close();
  }
}

window.customizerManager = new CustomizerManager();
