import { UsuarioRepository } from '../repositories/usuarioRepository';

const usuarioRepository = new UsuarioRepository();

export class UsuarioService {
  async getUsuarioById(id: string) {
    const usuario = await usuarioRepository.findByIdSanitized(id);
    if (!usuario) {
      throw new Error('Usuario no encontrado');
    }
    return usuario;
  }

  /**
   * Ejecuta la baja por Derecho ARCO (Cancelación / Oposición)
   * Anonimiza datos personales garantizando cumplimiento LGPDPPSO y manteniendo pedidos contables.
   */
  async anonymizeUser(targetUserId: string, requestingUserId: string, requestingUserRol: string) {
    // Solo el propio usuario o un admin pueden solicitar la cancelación de sus datos
    if (requestingUserRol !== 'admin' && targetUserId !== requestingUserId) {
      throw new Error('Acceso denegado: No tienes autorización para ejercitar derechos ARCO sobre esta cuenta');
    }

    const usuario = await usuarioRepository.findById(targetUserId);
    if (!usuario) {
      throw new Error('El usuario a anonimizar no existe');
    }

    return usuarioRepository.anonymizeUser(targetUserId);
  }
}
