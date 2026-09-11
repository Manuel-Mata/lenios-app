import { Router } from 'express';
import { register, login, refresh, logout, getProfileMe } from '../controllers/authController';
import { authLimiter } from '../middlewares/rateLimitMiddleware';
import { verifyToken } from '../middlewares/authMiddleware';

const router = Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registra un nuevo usuario (Protegido por Rate Limiting)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               rol:
 *                 type: string
 *                 enum: [cliente, admin]
 *                 description: Rol opcional del usuario (por defecto es cliente)
 *     responses:
 *       201:
 *         description: Usuario registrado exitosamente
 *       429:
 *         description: Demasiados intentos de registro desde esta IP
 */
router.post('/register', authLimiter, register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Inicia sesión de usuario (Protegido por Rate Limiting contra Fuerza Bruta)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Inicio de sesión exitoso, cookie HttpOnly establecida
 *       429:
 *         description: Demasiados intentos de login (Rate limit excedido)
 */
router.post('/login', authLimiter, login);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Obtiene el perfil del usuario autenticado (requiere cookie HttpOnly)
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Datos del usuario autenticado (id, nombre, email, rol)
 *       401:
 *         description: No autenticado o token inválido
 */
router.get('/me', verifyToken, getProfileMe);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Cierra la sesión del usuario eliminando la cookie HttpOnly
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logout exitoso
 */
router.post('/logout', logout);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresca el access token usando un refresh token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Nuevo access token emitido
 */
router.post('/refresh', refresh);

export default router;