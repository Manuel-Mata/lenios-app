import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { AuthRequest } from '../middlewares/authMiddleware';
import { UsuarioRepository } from '../repositories/usuarioRepository';

const authService = new AuthService();
const usuarioRepo = new UsuarioRepository();

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await authService.register(req.body);
    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      data: user,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Error al registrar el usuario',
    });
  }
}; 


export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
      // Set access token as HttpOnly cookie
      res.cookie('accessToken', result.tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        // Puedes añadir maxAge o expires según política
      });
      res.status(200).json({
        success: true,
        message: 'Inicio de sesión exitoso',
      });
  } catch (error: any) {
    res.status(401).json({
      success: false,
      message: error.message || 'Credenciales inválidas',
    });
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    const result = await authService.refresh(refreshToken);
    res.status(200).json({
      success: true,
      message: 'Token de acceso renovado exitosamente',
      data: result,
    });
  } catch (error: any) {
    res.status(401).json({
      success: false,
      message: error.message || 'Refresh token inválido',
    });
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    res.status(200).json({ success: true, message: 'Logout exitoso' });
  } catch (error: any) {
    next(error);
  }
};

/**
 * GET /auth/me
 * Devuelve los datos del usuario autenticado leyendo el token de la cookie HttpOnly.
 * Solo devuelve campos seguros: id, nombre, email, rol.
 */
export const getProfileMe = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: 'Usuario no autenticado.' });
    }

    const user = await usuarioRepo.findByIdSanitized(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    res.status(200).json({ success: true, data: user });
  } catch (error: any) {
    next(error);
  }
};
