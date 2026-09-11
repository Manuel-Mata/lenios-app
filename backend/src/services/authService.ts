import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import process from 'process';
import { UsuarioRepository, CreateUsuarioDto } from '../repositories/usuarioRepository';
import { Rol } from '@prisma/client';

const SALT_ROUNDS = 12;
const usuarioRepository = new UsuarioRepository();

export class AuthService {
  private getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('Configuración del servidor incompleta: JWT_SECRET no definido');
    }
    return secret;
  }

  private getJwtRefreshSecret(): string {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) {
      throw new Error('Configuración del servidor incompleta: JWT_REFRESH_SECRET no definido');
    }
    return secret;
  }

  async register(dto: CreateUsuarioDto) {
    const { nombre, email, password, rol } = dto;

    if (!nombre || !email || !password) {
      throw new Error('Faltan campos requeridos: nombre, email o password');
    }

    const existingUser = await usuarioRepository.findByEmail(email);
    if (existingUser) {
      throw new Error('El correo electrónico ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Validar rol si se proporciona
    let selectedRol: Rol = Rol.cliente;
    if (rol && Object.values(Rol).includes(rol)) {
      selectedRol = rol;
    }

    const newUser = await usuarioRepository.create({
      nombre,
      email,
      password: hashedPassword,
      rol: selectedRol,
    });

    return {
      id: newUser.id,
      nombre: newUser.nombre,
      email: newUser.email,
      rol: newUser.rol,
    };
  }

  async login(email: string, password: string) {
    if (!email || !password) {
      throw new Error('Email y contraseña son requeridos');
    }

    const user = await usuarioRepository.findByEmail(email);
    if (!user) {
      throw new Error('Credenciales inválidas');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error('Credenciales inválidas');
    }

    const payload = { id: user.id, email: user.email, rol: user.rol };
    const accessToken = jwt.sign(payload, this.getJwtSecret(), { expiresIn: '15m' });
    const refreshToken = jwt.sign(payload, this.getJwtRefreshSecret(), { expiresIn: '7d' });

    return {
      user: payload,
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new Error('Refresh token es requerido');
    }

    try {
      const decoded = jwt.verify(refreshToken, this.getJwtRefreshSecret()) as any;
      const payload = { id: decoded.id, email: decoded.email, rol: decoded.rol };
      const newAccessToken = jwt.sign(payload, this.getJwtSecret(), { expiresIn: '15m' });

      return { accessToken: newAccessToken };
    } catch (error) {
      throw new Error('Refresh token inválido o expirado');
    }
  }
}
