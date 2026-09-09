import { Request, Response, NextFunction } from 'express';
import { ClienteService } from '../services/clienteService';

const clienteService = new ClienteService();

export const getClientes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientes = await clienteService.getAllClientes();
    res.status(200).json({
      success: true,
      data: clientes,
    });
  } catch (error) {
    next(error);
  }
};

export const getClienteById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const cliente = await clienteService.getClienteById(Number(id));
    res.status(200).json({
      success: true,
      data: cliente,
    });
  } catch (error) {
    // Para simplificar, pasamos el error. Un error handler global en Express lo atrapará.
    const err = error as Error;
    res.status(404).json({ success: false, message: err.message });
  }
};
