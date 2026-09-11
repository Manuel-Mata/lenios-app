import { Router } from 'express';
import {
  createPedido,
  getPedidoById,
  updateEstadoPedido,
  getAdminOrders,
  getMisPedidos,
} from '../controllers/pedidoController';
import { verifyToken, requireAdmin } from '../middlewares/authMiddleware';
import { auditLogger } from '../middlewares/auditMiddleware';
import { validateOrderOwnership } from '../middlewares/bolaMiddleware';

const router = Router();

// Todas las rutas de pedidos requieren autenticación y auditoría
router.use(verifyToken);
router.use(auditLogger);

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Crea un nuevo pedido para el usuario autenticado (valida stock de productos)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *             properties:
 *               metodoEnvio:
 *                 type: string
 *                 example: Domicilio
 *               observaciones:
 *                 type: string
 *                 example: Sin cebolla, por favor
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - productoId
 *                     - cantidad
 *                   properties:
 *                     productoId:
 *                       type: string
 *                       example: 1a184873-1f55-402d-b96d-66e1ae867e6a
 *                     cantidad:
 *                       type: integer
 *                       example: 2
 *     responses:
 *       201:
 *         description: Pedido registrado exitosamente
 *       400:
 *         description: Stock insuficiente o datos inválidos
 *       401:
 *         description: No autenticado
 */
router.post('/', createPedido);

/**
 * @swagger
 * /api/orders/mis-pedidos:
 *   get:
 *     summary: Lista los pedidos pertenecientes al cliente autenticado
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Historial de pedidos del cliente
 */
router.get('/mis-pedidos', getMisPedidos);

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Obtiene el detalle de un pedido (Protegido BOLA: Solo el dueño o un Admin pueden ver)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del pedido
 *     responses:
 *       200:
 *         description: Detalle del pedido
 *       403:
 *         description: Acceso denegado (No eres el propietario ni admin)
 *       404:
 *         description: Pedido no encontrado
 */
router.get('/:id', validateOrderOwnership, getPedidoById);

/**
 * @swagger
 * /api/orders/{id}/status:
 *   put:
 *     summary: Actualiza el estado del pedido (Exclusivo Administradores)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del pedido
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - estado
 *             properties:
 *               estado:
 *                 type: string
 *                 enum: [PENDIENTE, EN_PROCESO, COMPLETADO, CANCELADO]
 *                 example: EN_PROCESO
 *     responses:
 *       200:
 *         description: Estado actualizado exitosamente
 *       403:
 *         description: Requiere rol admin
 */
router.put('/:id/status', requireAdmin, updateEstadoPedido);

export default router;
