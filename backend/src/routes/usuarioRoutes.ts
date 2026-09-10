import { Router } from 'express';
import { deleteUsuarioArco, getUsuarioProfile } from '../controllers/usuarioController';
import { verifyToken } from '../middlewares/authMiddleware';
import { auditLogger } from '../middlewares/auditMiddleware';
import { validateUserOwnership } from '../middlewares/bolaMiddleware';

const router = Router();

router.use(verifyToken);
router.use(auditLogger);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Obtiene el perfil de un usuario (Protegido BOLA: Solo el dueño o Admin)
 *     tags: [Users / ARCO]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del usuario
 *     responses:
 *       200:
 *         description: Perfil del usuario
 *       403:
 *         description: Acceso denegado
 */
router.get('/:id', validateUserOwnership, getUsuarioProfile);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Baja de usuario y anonimización de datos personales (Protegido BOLA: Solo el dueño o Admin)
 *     tags: [Users / ARCO]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del usuario a anonimizar
 *     responses:
 *       200:
 *         description: Datos personales anonimizados exitosamente preservando historial contable
 *       403:
 *         description: Acceso denegado
 */
router.delete('/:id', validateUserOwnership, deleteUsuarioArco);

export default router;
