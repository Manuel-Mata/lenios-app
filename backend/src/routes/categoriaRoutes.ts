import { Router } from 'express';
import {
  getCategorias,
  getCategoriaById,
  createCategoria,
  updateCategoria,
  deleteCategoria,
} from '../controllers/categoriaController';
import { verifyToken, requireAdmin } from '../middlewares/authMiddleware';
import { auditLogger } from '../middlewares/auditMiddleware';
import { getCategorias, getCategoriaById, createCategoria } from '../controllers/categoriaController';
import { verifyToken, requireAdmin } from '../middlewares/authMiddleware';

const router = Router();

/**
 * @swagger
 * /api/categorias:
 *   get:
 *     summary: Lista todas las categorías registradas
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
 *     summary: Crea una nueva categoría (Sólo administradores)
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
 *             required:
 *               - nombre
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: Especiales de la Casa
 *               descripcion:
 *                 type: string
 *                 example: Leños rellenos con recetas gourmet exclusivas
 *     responses:
 *       201:
 *         description: Categoría creada exitosamente
 *       400:
 *         description: Datos inválidos o nombre duplicado
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Acceso denegado (Requiere rol admin)
 */
router.route('/').post(verifyToken, requireAdmin, auditLogger, createCategoria);
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
 *     summary: Obtiene los detalles de una categoría por su ID
 *     summary: Obtiene una categoría por su ID
 *     tags: [Categorías]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID único de la categoría (UUID)
 *         description: ID de la categoría (UUID)
 *     responses:
 *       200:
 *         description: Categoría encontrada
 *       404:
 *         description: Categoría no encontrada
 */
router.route('/:id').get(getCategoriaById);

/**
 * @swagger
 * /api/categorias/{id}:
 *   put:
 *     summary: Actualiza una categoría existente (Sólo administradores)
 *     tags: [Categorías]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la categoría (UUID)
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
 *       200:
 *         description: Categoría actualizada exitosamente
 *       400:
 *         description: Error en los datos proporcionados
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Acceso denegado (Requiere rol admin)
 *       404:
 *         description: Categoría no encontrada
 */
router.route('/:id').put(verifyToken, requireAdmin, auditLogger, updateCategoria);

/**
 * @swagger
 * /api/categorias/{id}:
 *   delete:
 *     summary: Elimina una categoría (Sólo administradores)
 *     tags: [Categorías]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la categoría (UUID)
 *     responses:
 *       200:
 *         description: Categoría eliminada exitosamente
 *       400:
 *         description: No se puede eliminar porque contiene productos asociados
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Acceso denegado (Requiere rol admin)
 *       404:
 *         description: Categoría no encontrada
 */
router.route('/:id').delete(verifyToken, requireAdmin, auditLogger, deleteCategoria);

export default router;
