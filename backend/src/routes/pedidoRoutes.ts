import { Router } from 'express';
import {
  getPedidos,
  getPedidoById,
  createPedido,
  updateEstadoPedido,
} from '../controllers/pedidoController';

const router = Router();

router.route('/').get(getPedidos).post(createPedido);
router.route('/:id').get(getPedidoById);
router.route('/:id/estado').patch(updateEstadoPedido);

export default router;
