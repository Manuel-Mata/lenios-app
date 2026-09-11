import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  const headers: { [key: string]: string } = {
    Accept: 'application/json',
  };

  // Si el cuerpo NO es FormData, agregamos Content-Type: application/json
  // Si es FormData, dejamos que el navegador establezca multipart/form-data con su boundary
  if (!(req.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const apiReq = req.clone({
    setHeaders: headers,
    withCredentials: true,
  });

  return next(apiReq);
};
