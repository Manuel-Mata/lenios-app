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
}
