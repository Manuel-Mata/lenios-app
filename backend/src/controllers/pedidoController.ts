import { Request, Response, NextFunction } from 'express';
import { PedidoService } from '../services/pedidoService';

const pedidoService = new PedidoService();

export const getPedidos = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pedidos = await pedidoService.getAllPedidos();
    res.status(200).json({ success: true, count: pedidos.length, data: pedidos });
  } catch (error) {
    next(error);
  }
};

export const getPedidoById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pedido = await pedidoService.getPedidoById(Number(req.params.id));
    res.status(200).json({ success: true, data: pedido });
  } catch (error) {
    next(error);
  }
};

export const createPedido = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { detalles, ...pedidoData } = req.body;
    const pedido = await pedidoService.createPedido(pedidoData, detalles);
    res.status(201).json({ success: true, data: pedido });
  } catch (error) {
    next(error);
  }
};

export const updateEstadoPedido = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { estado } = req.body;
    if (!estado) {
      res.status(400).json({ success: false, message: 'Se requiere el nuevo estado' });
      return;
    }
    const pedido = await pedidoService.updateEstadoPedido(Number(req.params.id), estado);
    res.status(200).json({ success: true, data: pedido });
  } catch (error) {
    next(error);
  }
};
