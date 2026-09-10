import { Request, Response, NextFunction } from 'express';
import { CategoriaService } from '../services/categoriaService';

const categoriaService = new CategoriaService();

export const getCategorias = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categorias = await categoriaService.getAllCategorias();
    res.status(200).json({ success: true, data: categorias });
  } catch (error) {
    next(error);
  }
};

export const getCategoriaById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categoria = await categoriaService.getCategoriaById(req.params.id);
    res.status(200).json({ success: true, data: categoria });
  } catch (error) {
    next(error);
  }
};

export const createCategoria = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categoria = await categoriaService.createCategoria(req.body);
    res.status(201).json({ success: true, data: categoria });
  } catch (error) {
    next(error);
  }
};
