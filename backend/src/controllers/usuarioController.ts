import { Response, NextFunction } from 'express';
import { UsuarioService } from '../services/usuarioService';
import { AuthRequest } from '../middlewares/authMiddleware';

const usuarioService = new UsuarioService();

export const deleteUsuarioArco = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
    }

    const { id } = req.params;
    const usuarioAnonimizado = await usuarioService.anonymizeUser(id, req.user.id, req.user.rol);

    res.status(200).json({
      success: true,
      message: 'Derecho ARCO de cancelación ejecutado exitosamente. Los datos personales han sido anonimizados.',
      data: usuarioAnonimizado,
    });
  } catch (error: any) {
    const isForbidden = error.message.includes('Acceso denegado');
    res.status(isForbidden ? 403 : 400).json({
      success: false,
      message: error.message || 'Error al procesar la solicitud ARCO',
    });
  }
};

export const getUsuarioProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
    }

    const { id } = req.params;

    if (req.user.rol !== 'admin' && req.user.id !== id) {
      return res.status(403).json({ success: false, message: 'Acceso denegado: No tienes permiso para ver este perfil' });
    }

    const usuario = await usuarioService.getUsuarioById(id);

    res.status(200).json({
      success: true,
      message: 'Perfil del usuario obtenido',
      data: usuario,
    });
  } catch (error: any) {
    res.status(404).json({
      success: false,
      message: error.message || 'Usuario no encontrado',
    });
  }
};
