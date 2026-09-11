import rateLimit from 'express-rate-limit';

/**
 * Middleware de Rate Limiting específico para rutas sensibles de autenticación
 * Previene ataques de fuerza bruta y peticiones masivas automatizadas.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // Ventana de 15 minutos
  max: 5, // Máximo 5 intentos por IP en esa ventana
  message: {
    success: false,
    message: 'Demasiados intentos de autenticación desde esta IP. Por favor intente nuevamente en 15 minutos.',
  },
  standardHeaders: true, // Envía cabeceras estándar RateLimit-*
  legacyHeaders: false, // Desactiva cabeceras X-RateLimit-*
});

/**
 * Middleware de Rate Limiting general para la API
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Máximo 100 peticiones por IP
  message: {
    success: false,
    message: 'Demasiadas peticiones enviadas desde esta IP. Por favor intente más tarde.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
