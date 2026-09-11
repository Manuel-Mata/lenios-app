import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  Observable,
  tap,
  switchMap,
  map,
  catchError,
  throwError,
} from 'rxjs';
import {
  Usuario,
  LoginDto,
  RegisterDto,
  RespuestaAuth,
} from '../models/auth.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  /** URL base del API de autenticación */
  private readonly apiUrl = `${environment.apiUrl}/auth`;
  /** Clave para persistir información del usuario entre recargas */
  private readonly USER_KEY = 'lenios_user_info';
  /* ------------------------------------------------------------------ */
  /*  Signals reactivos de sesión                                         */
  /* ------------------------------------------------------------------ */
  /** Usuario autenticado (null si no hay sesión) */
  readonly currentUser = signal<Usuario | null>(this.cargarUsuarioGuardado());
  /** El usuario está autenticado cuando existe `currentUser` */
  readonly isAuthenticated = computed(() => !!this.currentUser());
  /** El usuario tiene rol de administrador */
  readonly isAdmin = computed(() => this.currentUser()?.rol === 'admin');
  constructor(private http: HttpClient) {}
  /* ------------------------------------------------------------------ */
  /*  Endpoints del backend                                               */
  /* ------------------------------------------------------------------ */
  /**
   * GET /auth/me – devuelve los datos del usuario leyendo la cookie HttpOnly.
   * Es imprescindible incluir `withCredentials: true` para que el navegador
   * envíe la cookie al backend.
   */
  getProfile(): Observable<{ success: boolean; data: Usuario }> {
    return this.http.get<{ success: boolean; data: Usuario }>(`${this.apiUrl}/me`, {
      withCredentials: true,
    });
  }
  /**
   * POST /auth/login – inicia sesión.
   * Después de recibir `res.success === true`, encadena la llamada a `getProfile()`,
   * guarda el usuario en la señal `currentUser` (y opcionalmente en
   * `sessionStorage` para persistir recargas) y devuelve la respuesta original
   * del login al suscriptor.
   */
  login(credentials: LoginDto): Observable<RespuestaAuth> {
    return this.http
      .post<RespuestaAuth>(`${this.apiUrl}/login`, credentials, {
        withCredentials: true, // permite recibir la cookie HttpOnly
      })
      .pipe(
        switchMap((res) => {
          if (res && res.success) {
            // Login exitoso → obtener perfil del usuario
            return this.getProfile().pipe(
              tap((profileRes) => {
                if (profileRes.success && profileRes.data) {
                  this.guardarSesion(profileRes.data);
                }
              }),
              // Devolver la respuesta original del endpoint /login
              map(() => res)
            );
          }
          // Si login falló, propagar el error tal cual
          return throwError(() => res);
        }),
        catchError((error) => {
          console.error('[AuthService] Error al iniciar sesión:', error);
          return throwError(() => error);
        })
      );
  }
  /**
   * POST /auth/register – registra un nuevo usuario.
   */
  register(userData: RegisterDto): Observable<RespuestaAuth> {
    return this.http
      .post<RespuestaAuth>(`${this.apiUrl}/register`, userData)
      .pipe(
        catchError((error) => {
          console.error('[AuthService] Error en el registro:', error);
          return throwError(() => error);
        })
      );
  }
  /**
   * POST /auth/logout – elimina la cookie en el servidor y limpia la sesión
   * local (señal y sessionStorage).
   */
  logout(): void {
    this.http
      .post(`${this.apiUrl}/logout`, {}, { withCredentials: true })
      .subscribe({
        next: () => this.limpiarSesion(),
        error: (err) => console.error('[AuthService] Logout error:', err),
      });
  }
  /**
   * El token se almacena exclusivamente en una cookie HttpOnly,
   * por lo que no hay acceso desde JavaScript.
   * Este método se mantiene por compatibilidad y devuelve null.
   */
  getToken(): string | null {
    return null;
  }
  /* ------------------------------------------------------------------ */
  /*  Helpers de sesión                                                   */
  /* ------------------------------------------------------------------ */
  /**
   * Guarda la información del usuario en la señal `currentUser`
   * y la persiste en `sessionStorage` (no vulnerable a XSS al ser
   * accedido sólo por JavaScript en recargas de la página).
   */
  private guardarSesion(user: Usuario): void {
    this.currentUser.set(user);
    try {
      sessionStorage.setItem(this.USER_KEY, JSON.stringify(user));
    } catch {
      // Ignorar errores de storage (p. ej. modo incógnito)
    }
  }
  /** Elimina la señal y la información persistida en sessionStorage */
  private limpiarSesion(): void {
    this.currentUser.set(null);
    try {
      sessionStorage.removeItem(this.USER_KEY);
    } catch {
      // Ignorar errores de storage
    }
  }
  /** Recupera el usuario guardado en sessionStorage al iniciar la app */
  private cargarUsuarioGuardado(): Usuario | null {
    try {
      const data = sessionStorage.getItem(this.USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }
}
