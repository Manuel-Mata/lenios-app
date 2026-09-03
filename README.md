# 🪵 LEÑOS RELLENOS — Aplicación Web Completa & Sistema de Pedidos

Plataforma digital para el negocio familiar **"Leños Rellenos"** (Dolores Hidalgo, Guanajuato). Sistema de 3 capas con separación total entre **Frontend** y **Backend REST API**.

---

## 📂 Arquitectura de Carpetas

```
lenios-app/
│
├── frontend/                     # Capa de Presentación (Frontend)
│   ├── index.html                # Vistas integradas: Home, Menú, Personalizador, Carrito, Tracking, Admin
│   ├── css/
│   │   └── styles.css            # Sistema de diseño oficial: Café (#1F130B), Naranja (#FF7316), Crema (#FFF7ED)
│   └── js/
│       ├── api.js                # Conector API híbrido (Node.js REST API + LocalStorage fallback)
│       ├── products.js           # Catálogo inicial y categorías de leños rellenos
│       ├── cart.js               # Carrito interactivo, persistencia y checkout
│       ├── customizer.js         # Panel de personalización de masas, salsas y extras
│       ├── tracker.js            # Rastreador de orden en tiempo real del cliente
│       ├── admin.js              # Panel de control / Dashboard del dueño y métricas
│       └── main.js               # Enrutador, carrusel dinámico y buscador en vivo
│
├── backend/                      # Capa de Lógica de Negocio (Backend REST API)
│   ├── server.js                 # Servidor HTTP Express & REST API
│   ├── package.json              # Dependencias (Express, CORS)
│   ├── config/
│   │   └── db.js                 # Persistencia JSON local / MongoDB Atlas ready
│   ├── controllers/              # Controladores de productos, pedidos y negocio
│   ├── routes/                   # Enrutamiento REST (/api/products, /api/orders, /api/business)
│   ├── data/
│   │   └── initialData.json      # Base de datos inicial con catálogo y órdenes
│   └── README.md                 # Documentación técnica de endpoints
│
└── README.md                     # Documentación general
```

---

## 🚀 Cómo Ejecutar la Aplicación

### 1. Iniciar el Backend (Node.js REST API)
En una terminal en `lenios-app/backend/`:
```bash
npm install
npm start
```
> El servidor REST API correrá en `http://localhost:5000/api`.

### 2. Abrir el Frontend
Puedes abrir directamente el archivo `frontend/index.html` en tu navegador favorito, o servirlo con cualquier servidor estático (Live Server, Vite, o directamente desde el backend en `http://localhost:5000`).

> 💡 **Nota de resiliencia:** El frontend cuenta con un cliente API híbrido (`js/api.js`) que funciona tanto con el backend de Node.js en ejecución como de manera offline/autónoma en cualquier navegador.

---

## ✨ Módulos Implementados

1. **Página Principal (Home)**:
   - Hero banner dinámico *"Sabor a la Leña - Tradición en cada bocado"*.
   - **Carrusel interactivo de leños estrella** con autoplay y controles.
   - Indicador de estado del negocio (*Abierto ahora* / *Cerrado*) y horarios.
2. **Catálogo & Menú Digital**:
   - Filtros por categoría (*Clásicos, Especiales, Gourmet, Bebidas, Combos*).
   - Buscador en tiempo real por nombre o ingrediente.
   - Control de disponibilidad y stock visible.
3. **Panel de Personalización de Leños (Wireframe Pág. 13)**:
   - Selección de base de masa (Trigo Clásico, Rústica a la Leña, Integral).
   - Selección de ingredientes extras (Carne ahumada extra, Tocino crujiente, Queso Oaxaca fundido, Champiñones al ajillo).
   - Salsas de la casa (Chimichurri, Ajo Asado, BBQ Ahumada, Habanero Mango).
   - Cálculo en vivo del precio y vista previa.
4. **Carrito de Compras y Envío a WhatsApp (Wireframe Pág. 5 & 14)**:
   - Persistencia en almacenamiento local al recargar la página.
   - Control de cantidades (+ / -) y cálculo de envío.
   - Formulario de entrega (Domicilio o Sucursal) y método de pago.
   - **Generación automática del pedido estructurado con folio único a WhatsApp**.
5. **Rastreador de Pedidos del Cliente (Wireframe Pág. 6 & 7)**:
   - Barra de progreso con 4 etapas: *Recibido ➔ En Horno ➔ En Camino ➔ Entregado*.
6. **Panel de Administración del Dueño y su Hijo (Wireframe Pág. 6, 9 & 10)**:
   - KPIs en vivo: Ventas del día, pedidos pendientes, productos activos y agotados.
   - Switch de 1 clic para abrir o cerrar la tienda.
   - Gestor de pedidos en vivo con cambio de estados y aviso al cliente por WhatsApp.
   - Control de stock y disponibilidad de productos con opción de agregar nuevos leños.
