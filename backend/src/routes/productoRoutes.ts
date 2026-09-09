import { Router } from 'express';
import {
  getProductos,
  getProductoById,
  createProducto,
  updateProducto,
} from '../controllers/productoController';

const router = Router();

router.route('/').get(getProductos).post(createProducto);
router.route('/:id').get(getProductoById).put(updateProducto);

export default router;
