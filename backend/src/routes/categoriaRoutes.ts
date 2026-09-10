import { Router } from 'express';
import { getCategorias, getCategoriaById, createCategoria } from '../controllers/categoriaController';

const router = Router();

router.route('/').get(getCategorias).post(createCategoria);
router.route('/:id').get(getCategoriaById);

export default router;
