import { PedidoRepository, CreatePedidoDto } from '../repositories/pedidoRepository';
import { EstadoPedido } from '@prisma/client';

const pedidoRepository = new PedidoRepository();

export class PedidoService {
  async createPedido(dto: CreatePedidoDto) {
    if (!dto.items || !Array.isArray(dto.items) || dto.items.length === 0) {
      throw new Error('El pedido debe incluir al menos un producto');
    }

    for (const item of dto.items) {
      if (!item.productoId || typeof item.cantidad !== 'number' || item.cantidad <= 0) {
        throw new Error('Cada ítem del pedido debe tener productoId válido y cantidad mayor a 0');
      }
    }

    return pedidoRepository.createTransactional(dto);
  }

  async getPedidoById(id: string, requestingUserId: string, requestingUserRol: string) {
    const pedido = await pedidoRepository.findById(id);

    if (!pedido) {
      throw new Error('Pedido no encontrado');
    }

    // Validación BOLA / RBAC: Solo el dueño del pedido o un Admin pueden ver los detalles
    if (requestingUserRol !== 'admin' && pedido.usuarioId !== requestingUserId) {
      throw new Error('Acceso denegado: No tienes permiso para consultar este pedido');
    }

    return pedido;
  }

  async getAllPedidosForAdmin() {
    return pedidoRepository.findAll();
  }

  async getPedidosByUsuario(usuarioId: string) {
    return pedidoRepository.findByUsuarioId(usuarioId);
  }

  async updateEstadoPedido(id: string, nuevoEstado: string) {
    const pedido = await pedidoRepository.findById(id);
    if (!pedido) {
      throw new Error('Pedido no encontrado');
    }

    const estadoUpper = nuevoEstado.toUpperCase() as EstadoPedido;
    if (!Object.values(EstadoPedido).includes(estadoUpper)) {
      throw new Error(`Estado de pedido inválido. Valores permitidos: ${Object.values(EstadoPedido).join(', ')}`);
    }

    return pedidoRepository.updateEstado(id, estadoUpper);
  }
}
