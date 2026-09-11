import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  console.log('[adminGuard] 🛡️ Verificando acceso a ruta protegida:', state.url);
  console.log('[adminGuard] 👤 currentUser:', JSON.stringify(authService.currentUser()));
  console.log('[adminGuard] 🔑 isAuthenticated:', authService.isAuthenticated());
  console.log('[adminGuard] 👑 isAdmin:', authService.isAdmin());

  if (authService.isAuthenticated() && authService.isAdmin()) {
    console.log('[adminGuard] ✅ Acceso permitido');
    return true;
  }

  console.warn('[adminGuard] ❌ Acceso denegado → redirigiendo a /login');
  router.navigate(['/login']);
  return false;
};
