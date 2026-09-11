import prisma from '../config/prisma';

export class CategoriaRepository {
  async findAll() {
    return prisma.categoria.findMany({
      orderBy: { nombre: 'asc' },
      include: {
        _count: {
          select: { productos: true },
        },
      },
    });
  }

  async findById(id: string) {
    return prisma.categoria.findUnique({
      where: { id },
      include: {
        productos: {
          select: {
            id: true,
            nombre: true,
            descripcion: true,
            precio: true,
            stock: true,
            imagenUrl: true,
          },
        },
      },
    });
  }

  async findByNombre(nombre: string) {
    return prisma.categoria.findFirst({
      where: {
        nombre: {
          equals: nombre,
          mode: 'insensitive',
        },
      },
    });
  }

  async create(data: { nombre: string; descripcion?: string | null }) {
    return prisma.categoria.create({
      data,
    });
  }

  async update(id: string, data: { nombre?: string; descripcion?: string | null }) {
  async update(id: string, data: any) {
    return prisma.categoria.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return prisma.categoria.delete({
      where: { id },
    });
  }
}
