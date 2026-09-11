import prisma from '../config/prisma';
import { Prisma } from '@prisma/client';

export interface ProductQueryFilters {
  page?: number;
  limit?: number;
  categoryId?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
}

export class ProductoRepository {
  /**
   * Búsqueda y filtrado seguro parametrizado con Prisma ORM.
   * Evita inyecciones SQL y NoSQL al construir cláusulas fuertemente tipadas.
   */
  async findAll(filters: ProductQueryFilters = {}) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.max(1, Math.min(100, filters.limit || 10));
    const skip = (page - 1) * limit;

    // Construcción segura de la cláusula WHERE usando Prisma (Previene Inyección SQL/NoSQL)
    const whereClause: Prisma.ProductoWhereInput = {};

    if (filters.categoryId) {
      whereClause.categoriaId = filters.categoryId;
    }

    if (filters.search && filters.search.trim() !== '') {
      // Coincidencia segura insensible a mayúsculas/minúsculas sin concatenar cadenas SQL
      whereClause.OR = [
        { nombre: { contains: filters.search.trim(), mode: 'insensitive' } },
        { descripcion: { contains: filters.search.trim(), mode: 'insensitive' } },
      ];
    }

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      whereClause.precio = {};
      if (filters.minPrice !== undefined) whereClause.precio.gte = filters.minPrice;
      if (filters.maxPrice !== undefined) whereClause.precio.lte = filters.maxPrice;
    }

    const [productos, total] = await Promise.all([
      prisma.producto.findMany({
        where: whereClause,
        skip,
        take: limit,
        select: {
          id: true,
          nombre: true,
          descripcion: true,
          precio: true,
          stock: true,
          imagenUrl: true,
          categoriaId: true,
          categoria: {
            select: {
              id: true,
              nombre: true,
            },
          },
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.producto.count({ where: whereClause }),
    ]);

    return {
      data: productos,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    return prisma.producto.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        descripcion: true,
        precio: true,
        stock: true,
        imagenUrl: true,
        categoriaId: true,
        categoria: {
          select: {
            id: true,
            nombre: true,
            descripcion: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Prevención de Mass Assignment: Se desestructuran y asignan explícitamente solo los campos permitidos.
   */
  async create(data: { nombre: string; descripcion?: string; precio: number; stock: number; imagenUrl?: string; categoriaId: string }) {
    return prisma.producto.create({
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion,
        precio: data.precio,
        stock: data.stock,
        imagenUrl: data.imagenUrl,
        categoriaId: data.categoriaId,
      },
      select: {
        id: true,
        nombre: true,
        descripcion: true,
        precio: true,
        stock: true,
        imagenUrl: true,
        categoriaId: true,
        createdAt: true,
      },
    });
  }

  async update(id: string, data: Partial<{ nombre: string; descripcion: string; precio: number; stock: number; imagenUrl: string; categoriaId: string }>) {
    return prisma.producto.update({
      where: { id },
      data,
      select: {
        id: true,
        nombre: true,
        descripcion: true,
        precio: true,
        stock: true,
        imagenUrl: true,
        categoriaId: true,
        updatedAt: true,
      },
    });
  }

  async delete(id: string) {
    return prisma.producto.delete({
      where: { id },
      select: { id: true },
    });
  }
}