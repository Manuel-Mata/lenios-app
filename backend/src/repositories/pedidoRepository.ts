import prisma from '../config/prisma';
import { EstadoPedido } from '@prisma/client';

export interface ItemPedidoDto {
  productoId: string;
  cantidad: number;
}

export interface CreatePedidoDto {
  usuarioId: string;
  items: ItemPedidoDto[];
  metodoEnvio?: string;
  observaciones?: string;
}

export class PedidoRepository {
  async findById(id: string) {
    return prisma.pedido.findUnique({
      where: { id },
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            rol: true,
          },
        },
        detalles: {
          include: {
            producto: {
              select: {
                id: true,
                nombre: true,
                precio: true,
                imagenUrl: true,
              },
            },
          },
        },
      },
    });
  }

  async findAll() {
    return prisma.pedido.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },
        detalles: {
          include: {
            producto: {
              select: {
                id: true,
                nombre: true,
                precio: true,
              },
            },
          },
        },
      },
    });
  }

  async findByUsuarioId(usuarioId: string) {
    return prisma.pedido.findMany({
      where: { usuarioId },
      orderBy: { createdAt: 'desc' },
      include: {
        detalles: {
          include: {
            producto: {
              select: {
                id: true,
                nombre: true,
                precio: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Transacción atómica: Valida stock, decrementa inventario y registra el pedido con sus detalles.
   */
  async createTransactional(data: CreatePedidoDto) {
    return prisma.$transaction(async (tx) => {
      // 1. Obtener los productos y validar existencias
      const productoIds = data.items.map((i) => i.productoId);
      const productos = await tx.producto.findMany({
        where: { id: { in: productoIds } },
      });

      let totalCalculado = 0;
      const detallesParaCrear = [];

      for (const item of data.items) {
        const prod = productos.find((p) => p.id === item.productoId);
        if (!prod) {
          throw new Error(`El producto con ID ${item.productoId} no existe`);
        }

        if (prod.stock < item.cantidad) {
          throw new Error(`Stock insuficiente para el producto "${prod.nombre}". Disponible: ${prod.stock}, Solicitado: ${item.cantidad}`);
        }

        // Decrementar el stock
        await tx.producto.update({
          where: { id: prod.id },
          data: { stock: prod.stock - item.cantidad },
        });

        const subtotal = prod.precio * item.cantidad;
        totalCalculado += subtotal;

        detallesParaCrear.push({
          productoId: prod.id,
          cantidad: item.cantidad,
          precioUnitario: prod.precio,
        });
      }

      // 2. Crear el Pedido y sus detalles
      const nuevoPedido = await tx.pedido.create({
        data: {
          usuarioId: data.usuarioId,
          total: totalCalculado,
          estado: EstadoPedido.PENDIENTE,
          metodoEnvio: data.metodoEnvio || 'Pickup',
          observaciones: data.observaciones || null,
          detalles: {
            create: detallesParaCrear,
          },
        },
        include: {
          detalles: {
            include: {
              producto: true,
            },
          },
        },
      });

      return nuevoPedido;
    });
  }

  async updateEstado(id: string, estado: EstadoPedido) {
    return prisma.pedido.update({
      where: { id },
      data: { estado },
      include: {
        detalles: true,
      },
    });
  }
}
