import prisma from '../config/prisma';
import { Rol } from '@prisma/client';

export interface CreateUsuarioDto {
  nombre: string;
  email: string;
  password: string;
  rol?: Rol;
}

export class UsuarioRepository {
  async findByEmail(email: string) {
    return prisma.usuario.findUnique({
      where: { email },
    });
  }

  async findById(id: string) {
    return prisma.usuario.findUnique({
      where: { id },
    });
  }

  async findByIdSanitized(id: string) {
    return prisma.usuario.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async create(data: CreateUsuarioDto) {
    return prisma.usuario.create({
      data: {
        nombre: data.nombre,
        email: data.email,
        password: data.password,
        rol: data.rol || Rol.cliente,
      },
    });
  }

  /**
   * Anonimiza los datos personales de un usuario (Derecho ARCO de Cancelación/Oposición)
   * Preserva la integridad referencial para auditorías contables.
   */
  async anonymizeUser(id: string) {
    const anonId = id.substring(0, 8);
    return prisma.usuario.update({
      where: { id },
      data: {
        nombre: `[USUARIO_ANONIMIZADO_${anonId}]`,
        email: `deleted_${anonId}@deleted-user.local`,
        password: '[CUENTA_ELIMINADA]',
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        updatedAt: true,
      },
    });
  }
}
