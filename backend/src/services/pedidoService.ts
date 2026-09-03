import { PedidoRepository } from '../repositories/pedidoRepository';

const pedidoRepository = new PedidoRepository();

export class PedidoService {
  async getAllPedidos() {
    return pedidoRepository.findAll();
  }

  async getPedidoById(id: number) {
    const pedido = await pedidoRepository.findById(id);
    if (!pedido) {
      throw new Error('Pedido no encontrado');
    }
    return pedido;
  }

  async createPedido(data: any, detalles: any[]) {
    // Aquí podrían ir validaciones extra de negocio (ej: si el usuario existe, si los productos tienen stock, etc)
    if (!detalles || detalles.length === 0) {
      throw new Error('El pedido debe tener al menos un producto');
    }

    let total = 0;
    const detallesValidados = detalles.map((item) => {
      if (!item.id_producto || !item.cantidad || !item.precio_unitario) {
        throw new Error('Datos incompletos en el detalle del pedido');
      }
      total += item.cantidad * item.precio_unitario;
      return item;
    });

    const pedidoData = {
      ...data,
      total,
    };

    return pedidoRepository.create(pedidoData, detallesValidados);
  }

  async updateEstadoPedido(id: number, estado: string) {
    await this.getPedidoById(id);
    return pedidoRepository.updateStatus(id, estado);
  }
}
