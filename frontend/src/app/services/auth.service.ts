import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError, of } from 'rxjs';
import { Usuario, LoginDto, RegisterDto, RespuestaAuth } from '../models/auth.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}/auth`;
  private readonly TOKEN_KEY = 'lenios_access_token';
  private readonly USER_KEY = 'lenios_user_info';

  // Angular 19 Signals para gestión de estado reactivo de la sesión
  readonly currentUser = signal<Usuario | null>(this.cargarUsuarioGuardado());
  readonly token = signal<string | null>(localStorage.getItem(this.TOKEN_KEY));

  readonly isAuthenticated = computed(() => Boolean(this.currentUser() && this.token()));
  readonly isAdmin = computed(() => this.currentUser()?.rol === 'admin');

  constructor(private http: HttpClient) {}

  /**
   * Inicia sesión en el servidor (POST /api/auth/login)
   */
  login(credentials: LoginDto): Observable<RespuestaAuth> {
    return this.http.post<RespuestaAuth>(`${this.apiUrl}/login`, credentials).pipe(
      tap((res) => {
        if (res && res.success && res.data) {
          const accessToken = res.data.tokens?.accessToken || res.data.accessToken || '';
          const user = res.data.user;

          if (accessToken && user) {
            this.guardarSesion(accessToken, user);
          }
        }
      }),
      catchError((error) => {
        console.error('[AuthService] Error al iniciar sesión:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Registra un nuevo usuario (POST /api/auth/register)
   */
  register(userData: RegisterDto): Observable<RespuestaAuth> {
    return this.http.post<RespuestaAuth>(`${this.apiUrl}/register`, userData).pipe(
      catchError((error) => {
        console.error('[AuthService] Error en el registro:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Cierra sesión e invalida el token guardado
   */
  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.token.set(null);
    this.currentUser.set(null);
  }

  /**
   * Obtiene el token de acceso actual
   */
  getToken(): string | null {
    return this.token();
  }

  private guardarSesion(token: string, user: Usuario) {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this.token.set(token);
    this.currentUser.set(user);
  }

  private cargarUsuarioGuardado(): Usuario | null {
    try {
      const data = localStorage.getItem(this.USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }
}
