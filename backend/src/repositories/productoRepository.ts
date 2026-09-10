import prisma from '../config/prisma';

export class ProductoRepository {
  async findAll(page: number = 1, limit: number = 10, categoryId?: string) {
    const skip = (page - 1) * limit;
    
    const whereClause = categoryId ? { categoriaId: categoryId } : {};

    const [productos, total] = await Promise.all([
      prisma.producto.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: {
          categoria: true
        }
      }),
      prisma.producto.count({ where: whereClause })
    ]);

    return {
      data: productos,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async findById(id: string) {
    return prisma.producto.findUnique({
      where: { id },
      include: {
        categoria: true
      }
    });
  }

  async create(data: any) {
    return prisma.producto.create({
      data
    });
  }

  async update(id: string, data: any) {
    return prisma.producto.update({
      where: { id },
      data
    });
  }

  async delete(id: string) {
    return prisma.producto.delete({
      where: { id }
    });
  }
}