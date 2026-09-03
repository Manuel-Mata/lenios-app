import prisma from '../config/prisma';

export class ProductoRepository {
  async findAll(filtros?: any) {
    return prisma.producto.findMany({
      where: filtros,
      include: {
        categoria: {
          select: { nombre: true },
        },
      },
    });
  }

  async findById(id: number) {
    return prisma.producto.findUnique({
      where: { id },
      include: {
        categoria: {
          select: { nombre: true },
        },
      },
    });
  }

  async create(data: any) {
    return prisma.producto.create({
      data,
    });
  }

  async update(id: number, data: any) {
    return prisma.producto.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    return prisma.producto.delete({
      where: { id },
    });
  }
}
