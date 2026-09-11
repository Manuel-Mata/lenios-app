import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { SanitizerService } from '../../services/sanitizer.service';
import { LoginDto, RegisterDto } from '../../models/auth.model';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="auth-container">
      <div class="auth-card">
        <div class="tabs-header">
          <button [class.active]="isLoginTab()" (click)="isLoginTab.set(true)">
            🔐 Iniciar Sesión
          </button>
          <button [class.active]="!isLoginTab()" (click)="isLoginTab.set(false)">
            📝 Registrarse
          </button>
        </div>

        <div class="auth-body">
          <!-- Formulario de Login -->
          <form *ngIf="isLoginTab()" (ngSubmit)="handleLogin()">
            <h2>Bienvenido a Leños Rellenos</h2>
            <p class="subtitle">Ingresa con tus credenciales de usuario o administrador</p>

            <div class="form-group">
              <label>Correo Electrónico *</label>
              <input
                type="email"
                [(ngModel)]="loginForm.email"
                name="loginEmail"
                required
                placeholder="usuario@dominio.com"
              />
            </div>

            <div class="form-group">
              <label>Contraseña *</label>
              <input
                type="password"
                [(ngModel)]="loginForm.password"
                name="loginPassword"
                required
                placeholder="••••••••"
              />
            </div>

            <div class="error-box" *ngIf="errorMessage()">
              ⚠️ {{ errorMessage() }}
            </div>

            <button type="submit" class="btn-submit" [disabled]="cargando()">
              {{ cargando() ? '⏳ Autenticando...' : 'Iniciar Sesión' }}
            </button>
          </form>

          <!-- Formulario de Registro -->
          <form *ngIf="!isLoginTab()" (ngSubmit)="handleRegister()">
            <h2>Crear Nueva Cuenta</h2>
            <p class="subtitle">Registra tus datos para guardar tus pedidos</p>

            <div class="form-group">
              <label>Nombre Completo *</label>
              <input
                type="text"
                [(ngModel)]="registerForm.nombre"
                name="regNombre"
                required
                placeholder="Ej. Juan Pérez"
              />
            </div>

            <div class="form-group">
              <label>Correo Electrónico *</label>
              <input
                type="email"
                [(ngModel)]="registerForm.email"
                name="regEmail"
                required
                placeholder="juan@ejemplo.com"
              />
            </div>

            <div class="form-group">
              <label>Contraseña *</label>
              <input
                type="password"
                [(ngModel)]="registerForm.password"
                name="regPassword"
                required
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <!-- El rol se asigna automáticamente como "cliente" en el servidor y DTO -->

            <div class="error-box" *ngIf="errorMessage()">
              ⚠️ {{ errorMessage() }}
            </div>

            <div class="success-box" *ngIf="successMessage()">
              ✅ {{ successMessage() }}
            </div>

            <button type="submit" class="btn-submit" [disabled]="cargando()">
              {{ cargando() ? '⏳ Registrando...' : 'Crear Cuenta' }}
            </button>
          </form>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .auth-container {
      max-width: 480px;
      margin: 3rem auto;
      padding: 0 1rem;
      color: #fff7ed;
    }
    .auth-card {
      background: #1f130b;
      border: 1px solid #ff7316;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 15px 30px rgba(0, 0, 0, 0.5);
    }
    .tabs-header {
      display: flex;
      background: #180e08;
      border-bottom: 1px solid rgba(255, 115, 22, 0.2);
    }
    .tabs-header button {
      flex: 1;
      padding: 1rem;
      background: transparent;
      border: none;
      color: #a89485;
      font-weight: bold;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    .tabs-header button.active {
      color: #ff7316;
      border-bottom: 3px solid #ff7316;
      background: rgba(255, 115, 22, 0.08);
    }
    .auth-body {
      padding: 2rem;
    }
    .auth-body h2 {
      margin-top: 0;
      font-size: 1.5rem;
      color: #ff7316;
      margin-bottom: 0.3rem;
    }
    .subtitle {
      color: #a89485;
      font-size: 0.9rem;
      margin-bottom: 1.5rem;
    }
    .form-group {
      margin-bottom: 1.2rem;
    }
    .form-group label {
      display: block;
      font-size: 0.85rem;
      color: #e4d5c7;
      margin-bottom: 4px;
    }
    .form-group input, .form-group select {
      width: 100%;
      padding: 0.75rem 1rem;
      background: #2a1a0f;
      border: 1px solid #4a382c;
      border-radius: 8px;
      color: #fff;
      font-size: 0.95rem;
      outline: none;
    }
    .form-group input:focus, .form-group select:focus {
      border-color: #ff7316;
    }
    .error-box {
      background: rgba(239, 68, 68, 0.15);
      border-left: 4px solid #ef4444;
      color: #fca5a5;
      padding: 0.75rem 1rem;
      border-radius: 4px;
      font-size: 0.85rem;
      margin-bottom: 1rem;
    }
    .success-box {
      background: rgba(34, 197, 94, 0.15);
      border-left: 4px solid #22c55e;
      color: #86efac;
      padding: 0.75rem 1rem;
      border-radius: 4px;
      font-size: 0.85rem;
      margin-bottom: 1rem;
    }
    .btn-submit {
      width: 100%;
      background: #ff7316;
      border: none;
      color: #fff;
      font-weight: bold;
      padding: 0.85rem;
      border-radius: 8px;
      font-size: 1rem;
      cursor: pointer;
      transition: background 0.2s;
    }
    .btn-submit:hover:not(:disabled) {
      background: #ea580c;
    }
    .btn-submit:disabled {
      background: #4a382c;
      opacity: 0.6;
      cursor: not-allowed;
    }
  `],
})
export class AuthComponent {
  readonly isLoginTab = signal<boolean>(true);
  readonly cargando = signal<boolean>(false);
  readonly errorMessage = signal<string>('');
  readonly successMessage = signal<string>('');

  loginForm: LoginDto = { email: '', password: '' };
  registerForm: RegisterDto = { nombre: '', email: '', password: '', rol: 'cliente' };

  constructor(
    private authService: AuthService,
    private sanitizerService: SanitizerService,
    private router: Router
  ) {}

  handleLogin() {
    if (!this.loginForm.email || !this.loginForm.password) {
      this.errorMessage.set('Por favor completa todos los campos requeridos.');
      return;
    }

    // OWASP XSS Sanitización masiva de formulario
    this.loginForm = this.sanitizerService.sanitizarFormulario(this.loginForm);

    this.cargando.set(true);
    this.errorMessage.set('');

    this.authService.login(this.loginForm).subscribe({
      next: (res: any) => {
        this.cargando.set(false);
        if (this.authService.isAdmin()) {
          this.router.navigate(['/admin']);
        } else {
          this.router.navigate(['/catalogo']);
        }
      },
      error: (err: any) => {
        this.cargando.set(false);
        this.errorMessage.set(err.error?.message || 'Error de autenticación. Verifica tus credenciales.');
      },
    });
  }

  handleRegister() {
    if (!this.registerForm.nombre || !this.registerForm.email || !this.registerForm.password) {
      this.errorMessage.set('Por favor ingresa nombre, email y contraseña.');
      return;
    }

    // OWASP XSS Sanitización masiva de formulario
    this.registerForm = this.sanitizerService.sanitizarFormulario(this.registerForm);

    this.cargando.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.authService.register(this.registerForm).subscribe({
      next: (res: any) => {
        this.cargando.set(false);
        this.successMessage.set('¡Registro exitoso! Ya puedes iniciar sesión con tu cuenta.');
        this.isLoginTab.set(true);
        this.loginForm.email = this.registerForm.email;
      },
      error: (err: any) => {
        this.cargando.set(false);
        this.errorMessage.set(err.error?.message || 'Error al registrar la cuenta.');
      },
    });
  }
}
