import { Request, Response, NextFunction } from 'express';
import { ProductoService } from '../services/productoService';

const productoService = new ProductoService();

export const getProductos = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const productos = await productoService.getAllProductos(req.query);
    res.status(200).json({ success: true, count: productos.length, data: productos });
  } catch (error) {
    next(error);
  }
};

export const getProductoById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const producto = await productoService.getProductoById(Number(req.params.id));
    res.status(200).json({ success: true, data: producto });
  } catch (error) {
    next(error);
  }
};

export const createProducto = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const producto = await productoService.createProducto(req.body);
    res.status(201).json({ success: true, data: producto });
  } catch (error) {
    next(error);
  }
};

export const updateProducto = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const producto = await productoService.updateProducto(Number(req.params.id), req.body);
    res.status(200).json({ success: true, data: producto });
  } catch (error) {
    next(error);
  }
};
