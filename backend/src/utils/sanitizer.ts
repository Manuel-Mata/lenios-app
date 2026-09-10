/**
 * Utilidades para prevención de Exposición Masiva de Datos (Excessive Data Exposure / OWASP)
 */

export interface SafeUser {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Remueve contraseñas, hashes y atributos sensibles de un objeto Usuario antes de enviarlo en JSON.
 */
export const sanitizeUser = (user: any): SafeUser => {
  if (!user) return user;

  // Destructuración explícita para ignorar campos sensibles
  const { password, refreshToken, ...safeUser } = user;
  return safeUser as SafeUser;
};

/**
 * Sanitiza una colección de usuarios
 */
export const sanitizeUserList = (users: any[]): SafeUser[] => {
  return users.map((user) => sanitizeUser(user));
};
