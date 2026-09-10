import prisma from '../config/prisma';

export class CategoriaRepository {
  async findAll() {
    return prisma.categoria.findMany();
  }

  async findById(id: string) {
    return prisma.categoria.findUnique({
      where: { id },
    });
  }

  async create(data: any) {
    return prisma.categoria.create({
      data,
    });
  }

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
