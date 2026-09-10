import prisma from '../config/prisma';

export class PedidoRepository {
  async findAll() {
    return prisma.pedido.findMany({
      include: {
        cliente: { select: { nombre: true, email: true } },
        detalles: {
          include: {
            producto: { select: { nombre: true, imagen: true } },
          },
        },
      },
      orderBy: { fecha_pedido: 'desc' },
    });
  }

  async findById(id: number) {
    return prisma.pedido.findUnique({
      where: { id },
      include: {
        cliente: { select: { nombre: true, email: true, telefono: true, ubicacion: true } },
        detalles: {
          include: {
            producto: { select: { nombre: true, imagen: true } },
          },
        },
      },
    });
  }

  async create(data: any, detalles: any[]) {
    // Uso de transacciones de Prisma para garantizar atomicidad
    return prisma.$transaction(async (tx) => {
      // 1. Crear el pedido
      const pedido = await tx.pedido.create({
        data,
      });

      // 2. Crear los detalles y descontar stock si es necesario
      for (const item of detalles) {
        await tx.detallePedido.create({
          data: {
            ...item,
            id_pedido: pedido.id,
          },
        });

        // Opcional: Descontar stock
        await tx.producto.update({
          where: { id: item.id_producto },
          data: { stock: { decrement: item.cantidad } },
        });
      }

      return pedido;
    });
  }

  async updateStatus(id: number, estado: string) {
    return prisma.pedido.update({
      where: { id },
      data: { estado },
    });
  }
}
