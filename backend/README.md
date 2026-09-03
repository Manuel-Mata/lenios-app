# 🪵 Backend API - Leños Rellenos

API REST modular desarrollada en **Node.js** y **Express** para el sistema de pedidos y administración del negocio familiar **Leños Rellenos**.

## 🚀 Cómo Iniciar el Backend

1. Abre una terminal dentro de esta carpeta (`lenios-app/backend/`):
   ```bash
   npm install
   ```
2. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   # o
   npm start
   ```
3. El servidor correrá en: `http://localhost:5000`

---

## 📡 Endpoints de la API REST

### 🥖 Catálogo & Productos (`/api/products`)
| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/products` | Lista de productos (soporta filtros `?category=`, `?featured=true`, `?availableOnly=true`) |
| `GET` | `/api/products/:id` | Detalle de un producto individual |
| `POST` | `/api/products` | Crear nuevo leño relleno en el menú |
| `PUT` | `/api/products/:id` | Actualizar precio, stock, nombre o datos |
| `PATCH` | `/api/products/:id/toggle` | Alternar disponibilidad (Activo / Inactivo) con 1 clic |
| `DELETE` | `/api/products/:id` | Eliminar leño del catálogo |

### 📦 Pedidos & Tracking (`/api/orders`)
| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/orders` | Listar todos los pedidos (soporta `?status=`, `?limit=`) |
| `GET` | `/api/orders/:id` | Consultar estado y detalle de una orden (Rastreo) |
| `POST` | `/api/orders` | Crear nuevo pedido desde el carrito (Genera WhatsApp link y descuenta stock) |
| `PATCH` | `/api/orders/:id/status` | Cambiar estado (`received`, `in_oven`, `on_the_way`, `delivered`, `cancelled`) |
| `DELETE` | `/api/orders/:id` | Eliminar registro de pedido |

### 🏢 Negocio & Métricas (`/api/business`)
| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/business/info` | Horarios, dirección y teléfono de WhatsApp |
| `PUT` | `/api/business/info` | Actualizar información del local |
| `PATCH` | `/api/business/toggle` | Abrir / Cerrar el negocio con 1 botón |
| `GET` | `/api/business/stats` | KPIs en vivo: Ventas del día, pedidos activos, productos agotados |
| `GET` | `/api/health` | Estado de salud del servidor |
