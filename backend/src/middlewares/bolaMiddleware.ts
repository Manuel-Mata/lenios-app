import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';
import prisma from '../config/prisma';

/**
 * Middleware para prevenir la vulnerabilidad BOLA (Broken Object Level Authorization) en Pedidos.
 * Valida de forma cruzada que el pedido (req.params.id) pertenezca estrictamente al usuario autenticado (req.user.id)
 * o que el usuario tenga el rol de administrador (RBAC).
 */
export const validateOrderOwnership = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Acceso denegado. Se requiere autenticación.',
      });
    }

    const { id } = req.params;

    // Si el usuario es Administrador, cuenta con autorización RBAC global
    if (req.user.rol === 'admin') {
      return next();
    }

    // Consulta directa a la base de datos usando Prisma ORM
    const pedido = await prisma.pedido.findUnique({
      where: { id },
      select: { usuarioId: true },
    });

    if (!pedido) {
      return res.status(404).json({
        success: false,
        message: 'Pedido no encontrado.',
      });
    }

    // Validación BOLA: verificar propiedad del objeto
    if (pedido.usuarioId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado: No tienes autorización para consultar o modificar este pedido.',
      });
    }

    next();
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Error interno al validar la propiedad del recurso.',
    });
  }
};

/**
 * Middleware para prevenir BOLA en la gestión de Usuarios / Perfiles.
 * Valida que el ID solicitado en los parámetros coincida con el usuario del token JWT o sea Admin.
 */
export const validateUserOwnership = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Acceso denegado. Se requiere autenticación.',
      });
    }

    const { id } = req.params;

    // Si es Administrador o el ID coincide con el usuario autenticado
    if (req.user.rol === 'admin' || req.user.id === id) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Acceso denegado: No tienes permiso para acceder o modificar la información de este usuario.',
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Error interno al validar los permisos del usuario.',
    });
  }
};
