import { Request, Response, NextFunction } from 'express';
import { ProductoService } from '../services/productoService';

const productoService = new ProductoService();

export const getProductos = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const category = req.query.category ? String(req.query.category) : undefined;
    const search = req.query.search ? String(req.query.search) : undefined;

    const result = await productoService.getAllProductos(page, limit, category, search);
    res.status(200).json({
      success: true,
      message: 'Lista de productos obtenida exitosamente',
      data: result.data,
      meta: result.meta,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error al obtener la lista de productos',
    });
  }
};

export const getProductoById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const producto = await productoService.getProductoById(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Producto encontrado',
      data: producto,
    });
  } catch (error: any) {
    res.status(404).json({
      success: false,
      message: error.message || 'Producto no encontrado',
    });
  }
};

export const createProducto = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = req.file;
    const producto = await productoService.createProducto(req.body, file);
    res.status(201).json({
      success: true,
      message: 'Producto creado exitosamente',
      data: producto,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Error al crear el producto',
    });
  }
};

export const updateProducto = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = req.file;
    const producto = await productoService.updateProducto(req.params.id, req.body, file);
    res.status(200).json({
      success: true,
      message: 'Producto actualizado exitosamente',
      data: producto,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Error al actualizar el producto',
    });
  }
};

export const deleteProducto = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await productoService.deleteProducto(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Producto eliminado exitosamente',
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Error al eliminar el producto',
    });
  }
};
