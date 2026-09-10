import { Response, NextFunction } from 'express';
import { PedidoService } from '../services/pedidoService';
import { AuthRequest } from '../middlewares/authMiddleware';

const pedidoService = new PedidoService();

export const createPedido = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
    }

    const dto = {
      usuarioId: req.user.id,
      items: req.body.items,
      metodoEnvio: req.body.metodoEnvio,
      observaciones: req.body.observaciones,
    };

    const nuevoPedido = await pedidoService.createPedido(dto);

    res.status(201).json({
      success: true,
      message: 'Pedido registrado exitosamente',
      data: nuevoPedido,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Error al registrar el pedido',
    });
  }
};

export const getPedidoById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
    }

    const { id } = req.params;
    const pedido = await pedidoService.getPedidoById(id, req.user.id, req.user.rol);

    res.status(200).json({
      success: true,
      message: 'Detalle del pedido obtenido',
      data: pedido,
    });
  } catch (error: any) {
    const isForbidden = error.message.includes('Acceso denegado');
    const isNotFound = error.message.includes('no encontrado');

    res.status(isForbidden ? 403 : isNotFound ? 404 : 400).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateEstadoPedido = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!estado) {
      return res.status(400).json({ success: false, message: 'El campo "estado" es requerido' });
    }

    const pedidoActualizado = await pedidoService.updateEstadoPedido(id, estado);

    res.status(200).json({
      success: true,
      message: `Estado del pedido actualizado a ${estado.toUpperCase()}`,
      data: pedidoActualizado,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Error al actualizar el estado del pedido',
    });
  }
};

export const getAdminOrders = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const pedidos = await pedidoService.getAllPedidosForAdmin();

    res.status(200).json({
      success: true,
      message: 'Lista general de pedidos de administración',
      data: pedidos,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error al obtener la lista de pedidos',
    });
  }
};

export const getMisPedidos = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
    }

    const pedidos = await pedidoService.getPedidosByUsuario(req.user.id);

    res.status(200).json({
      success: true,
      message: 'Historial de pedidos del cliente',
      data: pedidos,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error al obtener el historial de pedidos',
    });
  }
};
