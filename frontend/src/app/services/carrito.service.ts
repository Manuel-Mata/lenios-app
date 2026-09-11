import { Injectable, signal, computed } from '@angular/core';
import { ItemCarrito, ResumenCarrito } from '../models/carrito.model';
import { Producto } from '../models/producto.model';
import { CrearPedidoDto } from '../models/pedido.model';

@Injectable({
  providedIn: 'root',
})
export class CarritoService {
  private readonly STORAGE_KEY = 'lenios_carrito_angular';
  private readonly COSTO_ENVIO_DOMICILIO = 25.0;

  // Estado reactivo con Angular Signals
  readonly items = signal<ItemCarrito[]>(this.cargarCarritoGuardado());

  // Señales computadas para cálculos en tiempo real
  readonly totalCantidadItems = computed(() =>
    this.items().reduce((total, item) => total + item.cantidad, 0)
  );

  readonly subtotal = computed(() =>
    this.items().reduce((total, item) => total + item.producto.precio * item.cantidad, 0)
  );

  readonly resumen = computed<ResumenCarrito>(() => {
    const sub = this.subtotal();
    return {
      items: this.items(),
      subtotal: sub,
      costoEnvio: sub > 0 ? this.COSTO_ENVIO_DOMICILIO : 0,
      total: sub > 0 ? sub + this.COSTO_ENVIO_DOMICILIO : 0,
      totalCantidadItems: this.totalCantidadItems(),
    };
  });

  constructor() {}

  /**
   * Agrega un producto al carrito de compras
   */
  agregarProducto(producto: Producto, cantidad: number = 1, observaciones?: string) {
    const itemsActuales = [...this.items()];
    const index = itemsActuales.findIndex((i) => i.producto.id === producto.id);

    if (index >= 0) {
      itemsActuales[index] = {
        ...itemsActuales[index],
        cantidad: itemsActuales[index].cantidad + cantidad,
        observaciones: observaciones || itemsActuales[index].observaciones,
      };
    } else {
      itemsActuales.push({ producto, cantidad, observaciones });
    }

    this.actualizarEstado(itemsActuales);
  }

  /**
   * Actualiza la cantidad de un ítem existente
   */
  actualizarCantidad(productoId: string, cantidad: number) {
    if (cantidad <= 0) {
      this.removerProducto(productoId);
      return;
    }

    const itemsActuales = this.items().map((item) =>
      item.producto.id === productoId ? { ...item, cantidad } : item
    );
    this.actualizarEstado(itemsActuales);
  }

  /**
   * Remueve un producto del carrito
   */
  removerProducto(productoId: string) {
    const itemsFiltrados = this.items().filter((item) => item.producto.id !== productoId);
    this.actualizarEstado(itemsFiltrados);
  }

  /**
   * Vacía por completo el carrito
   */
  vaciarCarrito() {
    this.actualizarEstado([]);
  }

  /**
   * Genera la URL de enlace Click to Chat de WhatsApp para enviar el pedido estructurado
   */
  generarEnlaceWhatsApp(pedido: CrearPedidoDto, telefonoDestino: string = '523751837635'): string {
    const folio = `LR-${Math.floor(10000 + Math.random() * 90000)}`;
    const esDomicilio = pedido.tipoEntrega === 'DOMICILIO';
    const subtotal = this.subtotal();
    const costoEnvio = esDomicilio ? this.COSTO_ENVIO_DOMICILIO : 0;
    const total = subtotal + costoEnvio;

    const listaProductosText = this.items()
      .map((item) => {
        const obs = item.observaciones ? ` _(${item.observaciones})_` : '';
        const precioTotalItem = (item.producto.precio * item.cantidad).toFixed(2);
        return `• *${item.cantidad}x* ${item.producto.nombre} - $${precioTotalItem}${obs}`;
      })
      .join('\n');

    const textoMetodoPago = pedido.metodoPago === 'EFECTIVO' ? 'Efectivo al recibir 💵' : 'Transferencia / SPEI 📲';
    const textoTipoEntrega = esDomicilio ? 'A Domicilio 🛵' : 'Recoger en Sucursal 🏪';

    const mensajeWhatsApp =
      `🔥 *¡HOLA, LEÑOS RELLENOS!* 🔥\n` +
      `_Acabo de armar mi pedido desde la app Angular:_\n\n` +
      `📋 *DETALLES DEL PEDIDO*\n` +
      `• *Folio:* #${folio}\n` +
      `• *Cliente:* ${pedido.nombreCliente}\n` +
      `• *Teléfono:* ${pedido.telefonoCliente}\n` +
      `• *Entrega:* ${textoTipoEntrega}\n` +
      `• *Dirección:* ${pedido.direccionEntrega || 'Recoger en sucursal'}\n` +
      `• *Pago:* ${textoMetodoPago}\n` +
      `• *Aviso Privacidad:* Aceptado (Cumplimiento LGPDPPSO) ✅\n` +
      (pedido.observaciones ? `• *Notas:* ${pedido.observaciones}\n` : '') +
      `\n🛒 *PRODUCTOS:*\n` +
      `${listaProductosText}\n\n` +
      `💵 *Subtotal:* $${subtotal.toFixed(2)}\n` +
      (esDomicilio ? `🛵 *Envío:* $${costoEnvio.toFixed(2)}\n` : '') +
      `💰 *TOTAL A PAGAR: $${total.toFixed(2)}*\n\n` +
      `_¡Muchas gracias por su preferencia!_ 🔥🪵`;

    const numLimpio = telefonoDestino.replace(/\D/g, '');
    return `https://api.whatsapp.com/send?phone=${numLimpio}&text=${encodeURIComponent(mensajeWhatsApp)}`;
  }

  private actualizarEstado(nuevosItems: ItemCarrito[]) {
    this.items.set(nuevosItems);
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(nuevosItems));
    } catch (e) {
      console.error('Error al guardar carrito en localStorage', e);
    }
  }

  private cargarCarritoGuardado(): ItemCarrito[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }
}
