import { Router } from 'express';
import { getClientes, getClienteById } from '../controllers/clienteController';

const router = Router();

router.route('/').get(getClientes);
router.route('/:id').get(getClienteById);

export default router;
