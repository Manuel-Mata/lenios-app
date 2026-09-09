import prisma from '../config/prisma';

export class CategoriaRepository {
  async findAll() {
    return prisma.categoria.findMany();
  }

  async findById(id: number) {
    return prisma.categoria.findUnique({
      where: { id },
    });
  }

  async create(data: any) {
    return prisma.categoria.create({
      data,
    });
  }

  async update(id: number, data: any) {
    return prisma.categoria.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    return prisma.categoria.delete({
      where: { id },
    });
  }
}
