# 🪵 LEÑOS RELLENOS — Aplicación Web PWA Full-Stack Seguro

Sistema web de comercio electrónico y gestión de inventario/pedidos para la microempresa artesanal **"Leños Rellenos"** (Dolores Hidalgo, Guanajuato).

---

## 🏛️ Arquitectura y Patrones de Diseño
El proyecto implementa una arquitectura desacoplada de tres capas basada en **Angular 19 (Frontend PWA)** y **Node.js + Express + Prisma + PostgreSQL (Backend RESTful)**:

1. **Patrón Repository-Service-Controller (Backend)**:
   - `Repositories`: Abstracción y acceso transaccional a la base de datos PostgreSQL mediante Prisma Client (`pedidoRepository.ts`, `productoRepository.ts`).
   - `Services`: Lógica de negocio pura, validaciones de existencia, reglas de duplicidad y control de stock (`pedidoService.ts`, `productoService.ts`).
   - `Controllers`: Manejo de peticiones/respuestas HTTP, formateo y códigos de estado RESTful (`pedidoController.ts`).

2. **Patrón Middleware Chain & Interceptor (Seguridad)**:
   - `verifyToken` & `requireAdmin`: Autenticación JWT y Control de Acceso Basado en Roles (RBAC).
   - `bolaMiddleware`: Protección contra Broken Object Level Authorization (BOLA).
   - `apiInterceptor`: Interceptor HTTP en Angular 19 para inyección automática de encabezados `Authorization: Bearer` y credenciales seguras.

---

## 🛡️ Mecanismos de Seguridad y Privacidad (OWASP & LGPDPPSO)
- **Sanitización contra XSS**: `SanitizerService` en Angular 19 sanitiza masiva y recursivamente todos los formularios contra scripts maliciosos.
- **Protección contra Clickjacking**: Meta etiqueta `Content-Security-Policy` estricta con directiva `frame-ancestors 'none'`.
- **Protección contra SQLi / NoSQLi**: Consultas 100% parametrizadas mediante el ORM Prisma.
- **Prevención de Fuga de Datos (Mass Assignment)**: Exclusión de hashes de contraseñas y datos sensibles en las respuestas JSON.
- **Protección de Datos Personales (LGPDPPSO)**: Modal interactivo de Aviso de Privacidad con checkbox obligatorio antes de la captura de datos.

---

## 🐳 Despliegue y Orquestación con Docker

### Requisitos Previos:
- Docker y Docker Compose instalados.

### Ejecución en un solo comando:
```bash
docker-compose up --build -d
```

### Contenedores Orquestados:
- **`lenios_postgres`**: Base de datos PostgreSQL en puerto `5432`.
- **`lenios_backend`**: API RESTful Node.js + Express en puerto `3000`.
- **`lenios_frontend`**: Cliente Angular 19 PWA servido sobre Nginx en puerto `80`.

---

## 🔑 Credenciales de Prueba para Evaluación (R2)

| Rol | Correo Electrónico | Contraseña | Permisos |
| :--- | :--- | :--- | :--- |
| **Administrador** | `admin@leniosrellenos.com` | `admin123` | Acceso a `/admin`, CRUD de productos, categorías y cambio de estados de pedidos. |
| **Cliente** | `cliente@ejemplo.com` | `cliente123` | Acceso al menú, carrito y creación de pedidos. |
