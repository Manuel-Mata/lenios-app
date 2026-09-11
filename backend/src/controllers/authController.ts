import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';

const authService = new AuthService();

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
      res.cookie('accessToken', result.accessToken, {
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
