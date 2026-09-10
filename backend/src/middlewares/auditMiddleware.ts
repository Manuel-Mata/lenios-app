import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    rol: string;
  };
}

/**
 * Sanitiza objetos quitando datos sensibles (passwords, tokens, tarjetas, etc.)
 */
const sanitizeBody = (obj: any): any => {
  if (!obj || typeof obj !== 'object') return obj;

  const sensitiveFields = ['password', 'token', 'accessToken', 'refreshToken', 'tarjeta', 'cvv', 'contraseña'];
  const sanitized = Array.isArray(obj) ? [...obj] : { ...obj };

  for (const key of Object.keys(sanitized)) {
    if (sensitiveFields.includes(key.toLowerCase())) {
      sanitized[key] = '[REDACTADO]';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeBody(sanitized[key]);
    }
  }

  return sanitized;
};

/**
 * Middleware de Auditoría y Trazabilidad para cumplimiento normativo y seguridad
 */
export const auditLogger = (req: AuthRequest, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const userId = req.user ? req.user.id : 'ANONIMO';
  const userRol = req.user ? req.user.rol : 'SIN_ROL';
  const method = req.method;
  const url = req.originalUrl;
  const ip = req.ip || req.socket.remoteAddress;

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    
    // Log estructurado sanitizado
    logger.info(
      `AUDIT | Usuario: ${userId} (${userRol}) | Acción: ${method} ${url} | Estado: ${statusCode} | IP: ${ip} | Duración: ${duration}ms`
    );

    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && req.body && Object.keys(req.body).length > 0) {
      const sanitizedPayload = sanitizeBody(req.body);
      logger.debug(`AUDIT_PAYLOAD | ${method} ${url} | Body: ${JSON.stringify(sanitizedPayload)}`);
    }
  });

  next();
};
