import { Router } from 'express';
import { getCategorias, getCategoriaById, createCategoria } from '../controllers/categoriaController';
import { verifyToken, requireAdmin } from '../middlewares/authMiddleware';

const router = Router();

/**
 * @swagger
 * /api/categorias:
 *   get:
 *     summary: Lista todas las categorías
 *     tags: [Categorías]
 *     responses:
 *       200:
 *         description: Lista de categorías obtenida exitosamente
 *       500:
 *         description: Error interno del servidor
 */
router.route('/').get(getCategorias);

/**
 * @swagger
 * /api/categorias:
 *   post:
 *     summary: Crea una nueva categoría (sólo administradores)
 *     tags: [Categorías]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *               descripcion:
 *                 type: string
 *     responses:
 *       201:
 *         description: Categoría creada exitosamente
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Prohibido - Requiere rol admin
 */
router.route('/').post(verifyToken, requireAdmin, createCategoria);

/**
 * @swagger
 * /api/categorias/{id}:
 *   get:
 *     summary: Obtiene una categoría por su ID
 *     tags: [Categorías]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la categoría (UUID)
 *     responses:
 *       200:
 *         description: Categoría encontrada
 *       404:
 *         description: Categoría no encontrada
 */
router.route('/:id').get(getCategoriaById);

export default router;
