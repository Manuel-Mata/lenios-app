/**
 * LEÑOS RELLENOS - Gestor de Autenticación, Sesión y Rutas Protegidas
 * Manejo de JWT en cookie HttpOnly (Cero tokens en LocalStorage) y Minimización de Datos
 */

class AuthManager {
  constructor() {
    this.currentUser = null;
    this.isCheckingSession = false;
    this.redirectTarget = null;
  }

  // Inicializar estado de sesión al cargar la página
  async init() {
    await this.checkSession();
    this.setupLoginFormListeners();
    this.renderNavbarAuthUI();
  }

  // Verificar sesión activa contra el backend mediante cookie HttpOnly
  async checkSession() {
    this.isCheckingSession = true;
    try {
      const response = await window.apiClient.getMe();
      if (response && response.success && response.user) {
        this.currentUser = response.user;
      } else {
        this.currentUser = null;
      }
    } catch (err) {
      console.warn('Error al verificar sesión:', err);
      this.currentUser = null;
    } finally {
      this.isCheckingSession = false;
      this.renderNavbarAuthUI();
    }
    return this.currentUser;
  }

  isAuthenticated() {
    return Boolean(this.currentUser);
  }

  isAdmin() {
    return this.currentUser && this.currentUser.role === 'admin';
  }

  getUser() {
    return this.currentUser;
  }

  // Validación de rutas (Guards)
  canAccessView(viewName) {
    // Vistas públicas
    const publicViews = ['home', 'menu', 'about', 'contact', 'tracking', 'cart', 'login'];
    if (publicViews.includes(viewName)) {
      // Si ya está autenticado y va a login, redirigir a inicio o panel según su rol
      if (viewName === 'login' && this.isAuthenticated()) {
        showToast(`Ya has iniciado sesión como ${this.currentUser.name}`);
        if (this.isAdmin()) {
          switchView('admin');
        } else {
          switchView('home');
        }
        return false;
      }
      return true;
    }

    // Vistas de administración protegidas por rol admin
    if (viewName === 'admin') {
      if (!this.isAuthenticated()) {
        this.redirectTarget = 'admin';
        showToast('Debes iniciar sesión para acceder al panel administrativo', 'error');
        this.showLoginNotice('🔒 Se requiere autenticación para ingresar al Panel de Administración.');
        switchView('login');
        return false;
      }

      if (!this.isAdmin()) {
        showToast('Acceso denegado: Se requiere rol de Administrador', 'error');
        this.showLoginNotice('⛔ Tu cuenta no tiene permisos de Administrador para acceder a esta sección.');
        switchView('home');
        return false;
      }

      return true;
    }

    return true;
  }

  // Iniciar sesión con validación del cliente y minimización de datos
  async handleLoginSubmit(event) {
    if (event) event.preventDefault();

    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    const emailError = document.getElementById('loginEmailError');
    const passwordError = document.getElementById('loginPasswordError');
    const formError = document.getElementById('loginFormAlert');
    const submitBtn = document.getElementById('loginSubmitBtn');

    // Limpiar errores previos
    if (emailError) emailError.textContent = '';
    if (passwordError) passwordError.textContent = '';
    if (formError) {
      formError.textContent = '';
      formError.style.display = 'none';
    }
    if (emailInput) emailInput.classList.remove('is-invalid');
    if (passwordInput) passwordInput.classList.remove('is-invalid');

    const email = (emailInput?.value || '').trim();
    const password = (passwordInput?.value || '').trim();

    // 1. Validación en cliente: Correo electrónico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    let hasErrors = false;

    if (!email) {
      if (emailError) emailError.textContent = 'El correo electrónico es requerido.';
      if (emailInput) emailInput.classList.add('is-invalid');
      hasErrors = true;
    } else if (!emailRegex.test(email)) {
      if (emailError) emailError.textContent = 'Ingresa un formato de correo válido (ej. usuario@dominio.com).';
      if (emailInput) emailInput.classList.add('is-invalid');
      hasErrors = true;
    }

    // 2. Validación en cliente: Contraseña
    if (!password) {
      if (passwordError) passwordError.textContent = 'La contraseña es requerida.';
      if (passwordInput) passwordInput.classList.add('is-invalid');
      hasErrors = true;
    } else if (password.length < 6) {
      if (passwordError) passwordError.textContent = 'La contraseña debe tener al menos 6 caracteres.';
      if (passwordInput) passwordInput.classList.add('is-invalid');
      hasErrors = true;
    }

    if (hasErrors) return;

    // 3. Minimización: Se envían estrictamente solo email y password
    const loginPayload = {
      email,
      password
    };

    // Estado de carga en botón
    const originalBtnHtml = submitBtn ? submitBtn.innerHTML : 'Iniciar Sesión';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>⏳ Autenticando...</span>';
    }

    try {
      const result = await window.apiClient.login(loginPayload);

      if (result && result.success && result.user) {
        this.currentUser = result.user;
        this.renderNavbarAuthUI();

        showToast(`¡Bienvenido de nuevo, ${this.currentUser.name}!`);

        // Limpiar formulario
        if (emailInput) emailInput.value = '';
        if (passwordInput) passwordInput.value = '';

        // Redirigir a la ruta deseada previa o panel según rol
        const target = this.redirectTarget || (this.isAdmin() ? 'admin' : 'home');
        this.redirectTarget = null;
        switchView(target);
      } else {
        const errorMsg = result?.message || 'Error al iniciar sesión. Revisa tus credenciales.';
        if (formError) {
          formError.textContent = `⚠️ ${errorMsg}`;
          formError.style.display = 'block';
        }
        showToast(errorMsg, 'error');
      }
    } catch (err) {
      console.error('Error durante el login:', err);
      if (formError) {
        formError.textContent = '⚠️ Ocurrió un error inesperado al conectar con el servidor.';
        formError.style.display = 'block';
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHtml;
      }
    }
  }

  // Cerrar sesión
  async logout() {
    try {
      await window.apiClient.logout();
      this.currentUser = null;
      this.renderNavbarAuthUI();
      showToast('Has cerrado sesión correctamente');

      // Si el usuario estaba en una vista protegida de administración, redirigir a Home
      const currentActive = document.querySelector('.view-section.active');
      if (currentActive && currentActive.id === 'view-admin') {
        switchView('home');
      }
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    }
  }

  // Llenar credenciales de prueba con un solo clic (UX amigable)
  fillDemoCredentials(role) {
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    const emailError = document.getElementById('loginEmailError');
    const passwordError = document.getElementById('loginPasswordError');
    const formError = document.getElementById('loginFormAlert');

    if (emailError) emailError.textContent = '';
    if (passwordError) passwordError.textContent = '';
    if (formError) formError.style.display = 'none';

    if (role === 'admin') {
      if (emailInput) emailInput.value = 'admin@lenios.com';
      if (passwordInput) passwordInput.value = 'admin123';
    } else {
      if (emailInput) emailInput.value = 'cliente@lenios.com';
      if (passwordInput) passwordInput.value = 'cliente123';
    }

    if (emailInput) emailInput.focus();
  }

  // Alternar visibilidad de contraseña
  togglePasswordVisibility() {
    const pwdInput = document.getElementById('loginPassword');
    const toggleIcon = document.getElementById('togglePwdIcon');
    if (!pwdInput) return;

    if (pwdInput.type === 'password') {
      pwdInput.type = 'text';
      if (toggleIcon) toggleIcon.textContent = '🙈';
    } else {
      pwdInput.type = 'password';
      if (toggleIcon) toggleIcon.textContent = '👁️';
    }
  }

  showLoginNotice(message) {
    const noticeEl = document.getElementById('loginNoticeBox');
    if (noticeEl) {
      noticeEl.textContent = message;
      noticeEl.style.display = 'block';
      setTimeout(() => {
        if (noticeEl) noticeEl.style.display = 'none';
      }, 7000);
    }
  }

  // Actualizar interfaz del Navbar según el estado de la sesión
  renderNavbarAuthUI() {
    const navAuthContainer = document.getElementById('navAuthContainer');
    const adminNavBtn = document.querySelector('.admin-nav-btn');

    if (!navAuthContainer) return;

    if (this.isAuthenticated()) {
      const user = this.currentUser;
      const isAdmin = user.role === 'admin';

      navAuthContainer.innerHTML = `
        <div class="user-session-chip">
          <div class="user-avatar-badge ${isAdmin ? 'admin-badge' : 'client-badge'}">
            ${isAdmin ? '🛡️' : '👤'}
          </div>
          <div class="user-meta-info">
            <span class="user-meta-name">${user.name.split(' ')[0]}</span>
            <span class="user-meta-role ${isAdmin ? 'admin' : 'customer'}">${isAdmin ? 'Administrador' : 'Cliente'}</span>
          </div>
          <button class="btn-logout-nav" onclick="authManager.logout()" title="Cerrar Sesión">
            🚪 Salir
          </button>
        </div>
      `;

      // Mostrar u ocultar botón de Admin según rol
      if (adminNavBtn) {
        adminNavBtn.style.display = isAdmin ? 'inline-flex' : 'none';
      }
    } else {
      navAuthContainer.innerHTML = `
        <button class="btn-login-nav" onclick="switchView('login')" title="Iniciar Sesión">
          <span>👤 Iniciar Sesión</span>
        </button>
      `;

      // Si no está autenticado, mantener el botón de admin visible para que al hacer clic pida login
      if (adminNavBtn) {
        adminNavBtn.style.display = 'inline-flex';
      }
    }
  }

  setupLoginFormListeners() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleLoginSubmit(e));
    }

    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');

    if (emailInput) {
      emailInput.addEventListener('input', () => {
        const emailError = document.getElementById('loginEmailError');
        if (emailError && emailError.textContent) {
          emailError.textContent = '';
          emailInput.classList.remove('is-invalid');
        }
      });
    }

    if (passwordInput) {
      passwordInput.addEventListener('input', () => {
        const passwordError = document.getElementById('loginPasswordError');
        if (passwordError && passwordError.textContent) {
          passwordError.textContent = '';
          passwordInput.classList.remove('is-invalid');
        }
      });
    }
  }
}

window.authManager = new AuthManager();
