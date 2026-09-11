import { Request, Response, NextFunction } from 'express';
import { CategoriaService } from '../services/categoriaService';

const categoriaService = new CategoriaService();

export const getCategorias = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categorias = await categoriaService.getAllCategorias();
    res.status(200).json({
      success: true,
      message: 'Lista de categorías obtenida exitosamente',
      data: categorias,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error al obtener la lista de categorías',
    });
  }
};

export const getCategoriaById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categoria = await categoriaService.getCategoriaById(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Categoría encontrada',
      data: categoria,
    });
  } catch (error: any) {
    res.status(404).json({
      success: false,
      message: error.message || 'Categoría no encontrada',
    });
    res.status(200).json({ success: true, data: categoria });
  } catch (error) {
    next(error);
  }
};

export const createCategoria = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categoria = await categoriaService.createCategoria(req.body);
    res.status(201).json({
      success: true,
      message: 'Categoría registrada exitosamente',
      data: categoria,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Error al registrar la categoría',
    });
  }
};

export const updateCategoria = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categoriaActualizada = await categoriaService.updateCategoria(req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: 'Categoría actualizada exitosamente',
      data: categoriaActualizada,
    });
  } catch (error: any) {
    const isNotFound = error.message.includes('no encontrada');
    res.status(isNotFound ? 404 : 400).json({
      success: false,
      message: error.message || 'Error al actualizar la categoría',
    });
  }
};

export const deleteCategoria = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await categoriaService.deleteCategoria(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Categoría eliminada exitosamente',
    });
  } catch (error: any) {
    const isNotFound = error.message.includes('no encontrada');
    res.status(isNotFound ? 404 : 400).json({
      success: false,
      message: error.message || 'Error al eliminar la categoría',
    });
  }
};
