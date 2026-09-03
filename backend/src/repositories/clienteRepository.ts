import prisma from '../config/prisma';

export class ClienteRepository {
  async findAll() {
    return prisma.cliente.findMany({
      select: {
        id: true,
        nombre: true,
        email: true,
        telefono: true,
        ubicacion: true,
        rol: true,
        fecha_registro: true,
      },
    });
  }

  async findById(id: number) {
    return prisma.cliente.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        email: true,
        telefono: true,
        ubicacion: true,
        rol: true,
        fecha_registro: true,
      },
    });
  }

  async create(data: any) {
    return prisma.cliente.create({
      data,
    });
  }
}
