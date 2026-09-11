import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import process from 'process';

// Extendemos Request para incluir el usuario decodificado
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    rol: string;
  };
}

export const verifyToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Acceso denegado. Token no proporcionado o inválido.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    req.user = {
      id: decoded.id,
      email: decoded.email,
      rol: decoded.rol
    };
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Acceso denegado. Token no proporcionado o inválido.' });
  }
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Acceso denegado. Se requiere autenticación.' });
  }

  if (req.user.rol !== 'admin') {
    return res.status(403).json({ success: false, message: 'Acceso denegado. Se requieren permisos de administrador.' });
  }

  next();
};
