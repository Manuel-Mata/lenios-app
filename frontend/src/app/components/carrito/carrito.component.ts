import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CarritoService } from '../../services/carrito.service';
import { PedidoService } from '../../services/pedido.service';
import { AuthService } from '../../services/auth.service';
import { SanitizerService } from '../../services/sanitizer.service';
import { CrearPedidoDto } from '../../models/pedido.model';
import { AvisoPrivacidadComponent } from '../aviso-privacidad/aviso-privacidad.component';

@Component({
  selector: 'app-carrito',
  standalone: true,
  imports: [CommonModule, FormsModule, AvisoPrivacidadComponent],
  template: `
    <section class="carrito-container">
      <h2>🛒 Tu Carrito de Pedidos</h2>

      <div class="cart-layout" *ngIf="carritoService.items().length > 0; else carritoVacio">
        <!-- Lista de Items -->
        <div class="items-list">
          <div class="cart-item" *ngFor="let item of carritoService.items()">
            <img [src]="item.producto.imagenUrl || 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=600&q=80'" [alt]="item.producto.nombre" />

            <div class="item-details">
              <h4>{{ item.producto.nombre }}</h4>
              <span class="price-single">\${{ item.producto.precio | number : '1.2-2' }} c/u</span>
            </div>

            <div class="quantity-controls">
              <button (click)="decrementar(item.producto.id, item.cantidad)">-</button>
              <span>{{ item.cantidad }}</span>
              <button (click)="incrementar(item.producto.id, item.cantidad)">+</button>
            </div>

            <div class="item-total">
              \${{ (item.producto.precio * item.cantidad) | number : '1.2-2' }}
            </div>

            <button class="btn-remove" (click)="remover(item.producto.id)">🗑️</button>
          </div>

          <button class="btn-empty" (click)="vaciar()">Vaciar Carrito</button>
        </div>

        <!-- Formulario de Checkout y Resumen -->
        <div class="checkout-card">
          <h3>📋 Datos de Entrega y Pago</h3>

          <form (ngSubmit)="procesarPedido()">
            <div class="form-group">
              <label>Nombre Completo *</label>
              <input type="text" [(ngModel)]="formPedido.nombreCliente" name="nombre" required placeholder="Ej. Carlos Rodríguez" />
            </div>

            <div class="form-group">
              <label>Teléfono de Contacto *</label>
              <input type="tel" [(ngModel)]="formPedido.telefonoCliente" name="telefono" required placeholder="Ej. 4181234567" />
            </div>

            <div class="form-group">
              <label>Tipo de Entrega</label>
              <select [(ngModel)]="formPedido.tipoEntrega" name="tipoEntrega">
                <option value="DOMICILIO">🛵 Envío a Domicilio (+\$25.00)</option>
                <option value="SUCURSAL">🏪 Recoger en Local</option>
              </select>
            </div>

            <div class="form-group" *ngIf="formPedido.tipoEntrega === 'DOMICILIO'">
              <label>Dirección de Entrega *</label>
              <input type="text" [(ngModel)]="formPedido.direccionEntrega" name="direccion" required placeholder="Calle, Número, Colonia" />
            </div>

            <div class="form-group">
              <label>Método de Pago</label>
              <select [(ngModel)]="formPedido.metodoPago" name="metodoPago">
                <option value="EFECTIVO">💵 Efectivo al Recibir</option>
                <option value="TRANSFERENCIA">📲 Transferencia SPEI</option>
              </select>
            </div>

            <div class="form-group">
              <label>Notas / Indicaciones</label>
              <textarea [(ngModel)]="formPedido.observaciones" name="notes" placeholder="Ej. Sin cebolla, tocar timbre verde"></textarea>
            </div>

            <!-- Checkbox de Aviso de Privacidad -->
            <div class="privacy-check">
              <input type="checkbox" id="privacyCheck" [(ngModel)]="formPedido.avisoPrivacidadAceptado" name="privacyAccepted" required />
              <label for="privacyCheck">
                He leído y acepto el <a (click)="abrirAvisoPrivacidad($event)">Aviso de Privacidad (LGPDPPSO)</a> *
              </label>
            </div>

            <!-- Resumen de Costos -->
            <div class="summary-totals">
              <div class="summary-row">
                <span>Subtotal:</span>
                <span>\${{ carritoService.resumen().subtotal | number : '1.2-2' }}</span>
              </div>
              <div class="summary-row" *ngIf="formPedido.tipoEntrega === 'DOMICILIO'">
                <span>Envío:</span>
                <span>\${{ carritoService.resumen().costoEnvio | number : '1.2-2' }}</span>
              </div>
              <div class="summary-row total-row">
                <span>Total:</span>
                <span>\${{ calcularTotalFinal() | number : '1.2-2' }}</span>
              </div>
            </div>

            <div class="error-msg" *ngIf="errorMessage">{{ errorMessage }}</div>

            <button type="submit" class="btn-whatsapp" [disabled]="!esFormularioValido() || enviando">
              {{ enviando ? '⏳ Procesando Pedido...' : '📲 Confirmar Pedido en Servidor & WhatsApp' }}
            </button>
          </form>
        </div>
      </div>

      <ng-template #carritoVacio>
        <div class="empty-state">
          <p>🛒 Tu carrito está vacío actualmente.</p>
          <p class="subtext">Añade deliciosos leños rellenos desde el catálogo.</p>
        </div>
      </ng-template>
    </section>

    <!-- Componente Modal Aviso de Privacidad -->
    <app-aviso-privacidad #modalAviso (aceptado)="onAvisoAceptado()"></app-aviso-privacidad>
  `,
  styles: [`
    .carrito-container { max-width: 1100px; margin: 0 auto; padding: 2rem 1rem; color: #fff7ed; }
    h2 { color: #ff7316; margin-bottom: 1.5rem; text-align: center; }
    .cart-layout { display: grid; grid-template-columns: 1fr; gap: 2rem; }
    @media (min-width: 850px) { .cart-layout { grid-template-columns: 1.2fr 0.8fr; } }
    .items-list { background: #1f130b; padding: 1.5rem; border-radius: 16px; border: 1px solid rgba(255,115,22,0.2); }
    .cart-item { display: flex; align-items: center; gap: 1rem; padding: 1rem 0; border-bottom: 1px solid rgba(255,255,255,0.08); }
    .cart-item img { width: 70px; height: 70px; object-fit: cover; border-radius: 8px; }
    .item-details { flex-grow: 1; }
    .item-details h4 { margin: 0 0 4px 0; font-size: 1rem; color: #fff; }
    .price-single { color: #a89485; font-size: 0.85rem; }
    .quantity-controls { display: flex; align-items: center; gap: 0.5rem; background: #2a1a0f; padding: 4px 8px; border-radius: 6px; }
    .quantity-controls button { background: transparent; border: none; color: #ff7316; font-size: 1.2rem; cursor: pointer; font-weight: bold; }
    .item-total { font-weight: bold; color: #ff7316; min-width: 70px; text-align: right; }
    .btn-remove { background: transparent; border: none; cursor: pointer; font-size: 1.1rem; }
    .btn-empty { margin-top: 1rem; background: transparent; border: 1px solid #4a382c; color: #a89485; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; }
    .checkout-card { background: #1f130b; padding: 1.5rem; border-radius: 16px; border: 1px solid #ff7316; height: fit-content; }
    .checkout-card h3 { margin-top: 0; color: #ff7316; font-size: 1.2rem; margin-bottom: 1rem; }
    .form-group { margin-bottom: 1rem; }
    .form-group label { display: block; font-size: 0.85rem; margin-bottom: 4px; color: #e4d5c7; }
    .form-group input, .form-group select, .form-group textarea {
      width: 100%; padding: 0.6rem 0.8rem; background: #2a1a0f; border: 1px solid #4a382c; border-radius: 8px; color: #fff; outline: none;
    }
    .privacy-check { display: flex; align-items: flex-start; gap: 0.5rem; margin: 1rem 0; font-size: 0.85rem; color: #e4d5c7; }
    .privacy-check a { color: #ff7316; text-decoration: underline; cursor: pointer; }
    .summary-totals { border-top: 1px solid rgba(255,255,255,0.1); padding-top: 1rem; margin-top: 1rem; }
    .summary-row { display: flex; justify-content: space-between; margin-bottom: 0.5rem; }
    .total-row { font-size: 1.3rem; font-weight: bold; color: #ff7316; border-top: 1px solid #ff7316; padding-top: 0.5rem; margin-top: 0.5rem; }
    .btn-whatsapp { width: 100%; background: #25d366; border: none; color: #fff; font-weight: bold; padding: 0.9rem; border-radius: 10px; font-size: 1rem; cursor: pointer; margin-top: 1rem; transition: background 0.2s; }
    .btn-whatsapp:hover:not(:disabled) { background: #1eb956; }
    .btn-whatsapp:disabled { background: #4a382c; opacity: 0.6; cursor: not-allowed; }
    .error-msg { color: #ef4444; font-size: 0.85rem; margin-top: 0.5rem; }
    .empty-state { text-align: center; padding: 4rem; background: #1f130b; border-radius: 16px; border: 1px dashed #4a382c; }
    .subtext { color: #a89485; font-size: 0.95rem; }
  `],
})
export class CarritoComponent {
  @ViewChild('modalAviso') modalAviso!: AvisoPrivacidadComponent;

  enviando = false;
  errorMessage = '';

  formPedido: CrearPedidoDto = {
    nombreCliente: '',
    telefonoCliente: '',
    direccionEntrega: '',
    tipoEntrega: 'DOMICILIO',
    metodoPago: 'EFECTIVO',
    observaciones: '',
    items: [],
    avisoPrivacidadAceptado: localStorage.getItem('aviso_privacidad_aceptado') === 'true',
  };

  constructor(
    public carritoService: CarritoService,
    private pedidoService: PedidoService,
    private authService: AuthService,
    private sanitizerService: SanitizerService,
    private router: Router
  ) {
    // Autocompletar datos del cliente si el usuario está autenticado
    const usuarioActual = this.authService.currentUser();
    if (usuarioActual) {
      this.formPedido.nombreCliente = usuarioActual.nombre || '';
    }
  }

  incrementar(productoId: string, cantidadActual: number) {
    this.carritoService.actualizarCantidad(productoId, cantidadActual + 1);
  }

  decrementar(productoId: string, cantidadActual: number) {
    this.carritoService.actualizarCantidad(productoId, cantidadActual - 1);
  }

  remover(productoId: string) {
    this.carritoService.removerProducto(productoId);
  }

  vaciar() {
    this.carritoService.vaciarCarrito();
  }

  calcularTotalFinal(): number {
    const sub = this.carritoService.subtotal();
    const envio = this.formPedido.tipoEntrega === 'DOMICILIO' ? 25.0 : 0;
    return sub + envio;
  }

  esFormularioValido(): boolean {
    if (!this.formPedido.nombreCliente || !this.formPedido.telefonoCliente) return false;
    if (this.formPedido.tipoEntrega === 'DOMICILIO' && !this.formPedido.direccionEntrega) return false;
    if (!this.formPedido.avisoPrivacidadAceptado) return false;
    return true;
  }

  abrirAvisoPrivacidad(event: Event) {
    event.preventDefault();
    this.modalAviso.abrir();
  }

  onAvisoAceptado() {
    this.formPedido.avisoPrivacidadAceptado = true;
  }

  procesarPedido() {
    // 1. Verificación obligatoria de autenticación en el FrontEnd
    if (!this.authService.isAuthenticated()) {
      this.errorMessage = '⚠️ Debes iniciar sesión o registrarte antes de confirmar tu pedido.';
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 1500);
      return;
    }

    if (!this.esFormularioValido() || this.enviando) return;

    // OWASP XSS Sanitización previa de inputs de texto
    this.formPedido.nombreCliente = this.sanitizerService.sanitizarTexto(this.formPedido.nombreCliente);
    this.formPedido.telefonoCliente = this.sanitizerService.sanitizarTexto(this.formPedido.telefonoCliente);
    if (this.formPedido.direccionEntrega) {
      this.formPedido.direccionEntrega = this.sanitizerService.sanitizarTexto(this.formPedido.direccionEntrega);
    }
    if (this.formPedido.observaciones) {
      this.formPedido.observaciones = this.sanitizerService.sanitizarTexto(this.formPedido.observaciones);
    }

    this.enviando = true;
    this.errorMessage = '';

    // Mapear los ítems del carrito al DTO del servidor
    this.formPedido.items = this.carritoService.items().map((item) => ({
      productoId: item.producto.id,
      cantidad: item.cantidad,
    }));

    // 2. Registrar el pedido en el BackEnd (POST /api/orders)
    this.pedidoService.crearPedido(this.formPedido).subscribe({
      next: (res) => {
        this.enviando = false;
        // Abrir WhatsApp con el enlace estructurado devuelto o generado
        const urlWhatsApp = res.whatsappUrl || this.carritoService.generarEnlaceWhatsApp(this.formPedido);
        window.open(urlWhatsApp, '_blank');
        this.carritoService.vaciarCarrito();
      },
      error: (err) => {
        this.enviando = false;
        this.errorMessage = err.error?.message || 'No se pudo procesar el pedido. Verifica tus datos o sesión.';
      },
    });
  }
}
