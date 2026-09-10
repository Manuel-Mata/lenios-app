import { Router } from 'express';
import {
  getProductos,
  getProductoById,
  createProducto,
  updateProducto,
  deleteProducto
} from '../controllers/productoController';
import { verifyToken, requireAdmin } from '../middlewares/authMiddleware';
import { upload } from '../config/multer';

const router = Router();

/**
 * @swagger
 * /api/productos:
 *   get:
 *     summary: Lista todos los productos (con paginación y filtro por categoría)
 *     tags: [Productos]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Cantidad de resultados por página
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: ID de la categoría para filtrar
 *     responses:
 *       200:
 *         description: Lista de productos obtenida exitosamente
 *       500:
 *         description: Error interno del servidor
 */
router.route('/').get(getProductos);

/**
 * @swagger
 * /api/productos:
 *   post:
 *     summary: Crea un nuevo producto (con imagen opcional, sólo administradores)
 *     tags: [Productos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *               descripcion:
 *                 type: string
 *               precio:
 *                 type: number
 *               stock:
 *                 type: integer
 *                 default: 0
 *               id_categoria:
 *                 type: string
 *               imagen:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Producto creado exitosamente
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Prohibido - Requiere rol admin
 */
router.route('/').post(verifyToken, requireAdmin, upload.single('imagen'), createProducto);

/**
 * @swagger
 * /api/productos/{id}:
 *   get:
 *     summary: Obtiene un producto específico por su ID
 *     tags: [Productos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del producto (UUID)
 *     responses:
 *       200:
 *         description: Producto encontrado
 *       404:
 *         description: Producto no encontrado
 */
router.route('/:id').get(getProductoById);

/**
 * @swagger
 * /api/productos/{id}:
 *   put:
 *     summary: Actualiza un producto existente (sólo administradores)
 *     tags: [Productos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del producto (UUID)
 *     requestBody:
 *       required: false
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *               descripcion:
 *                 type: string
 *               precio:
 *                 type: number
 *               id_categoria:
 *                 type: string
 *               imagen:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Producto actualizado
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Prohibido - Requiere rol admin
 *       404:
 *         description: Producto no encontrado
 */
router.route('/:id').put(verifyToken, requireAdmin, upload.single('imagen'), updateProducto);

/**
 * @swagger
 * /api/productos/{id}:
 *   delete:
 *     summary: Elimina un producto por su ID (sólo administradores)
 *     tags: [Productos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del producto (UUID)
 *     responses:
 *       200:
 *         description: Producto eliminado exitosamente
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Prohibido - Requiere rol admin
 *       404:
 *         description: Producto no encontrado
 */
router.route('/:id').delete(verifyToken, requireAdmin, deleteProducto);

export default router;
