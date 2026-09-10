import { Router } from 'express';
import { getAdminOrders } from '../controllers/pedidoController';
import { verifyToken, requireAdmin } from '../middlewares/authMiddleware';
import { auditLogger } from '../middlewares/auditMiddleware';

const router = Router();

router.use(verifyToken);
router.use(requireAdmin);
router.use(auditLogger);

/**
 * @swagger
 * /api/admin/orders:
 *   get:
 *     summary: Lista todos los pedidos registrados en el sistema (Exclusivo Administradores)
 *     tags: [Admin - Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista completa de pedidos
 *       403:
 *         description: Acceso denegado (Requiere rol admin)
 */
router.get('/orders', getAdminOrders);

export default router;
