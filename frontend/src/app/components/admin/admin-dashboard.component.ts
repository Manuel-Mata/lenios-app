import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../services/admin.service';
import { ProductoService, CrearProductoDto } from '../../services/producto.service';
import { CategoriaService, CrearCategoriaDto } from '../../services/categoria.service';
import { Pedido, EstadoPedido } from '../../models/pedido.model';
import { Producto, Categoria } from '../../models/producto.model';
import { SanitizerService } from '../../services/sanitizer.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="admin-container">
      <div class="header">
        <h1>🛡️ Panel de Administración Full-Stack</h1>
        <p class="subtitle">Gestión integral de pedidos, inventario con subida a Cloudinary y CRUD de categorías</p>
      </div>

      <!-- Pestañas Principales -->
      <div class="admin-tabs">
        <button [class.active]="tabActiva() === 'ordenes'" (click)="tabActiva.set('ordenes')">
          📋 Pedidos ({{ pedidos().length }})
        </button>
        <button [class.active]="tabActiva() === 'inventario'" (click)="tabActiva.set('inventario')">
          📦 Inventario de Productos ({{ productos().length }})
        </button>
        <button [class.active]="tabActiva() === 'categorias'" (click)="tabActiva.set('categorias')">
          🏷️ Categorías ({{ categorias().length }})
        </button>
      </div>

      <!-- TAB 1: GESTIÓN DE PEDIDOS -->
      <div class="tab-content" *ngIf="tabActiva() === 'ordenes'">
        <div class="section-title">
          <h2>Monitoreo de Órdenes</h2>
          <button class="btn-refresh" (click)="cargarOrdenes()">🔄 Actualizar</button>
        </div>

        <div class="table-wrapper" *ngIf="!cargando(); else spinner">
          <table class="admin-table" *ngIf="pedidos().length > 0; else sinPedidos">
            <thead>
              <tr>
                <th>ID / Folio</th>
                <th>Fecha</th>
                <th>Envío / Cliente</th>
                <th>Total</th>
                <th>Estado Actual</th>
                <th>Cambiar Estado</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let ped of pedidos()">
                <td><strong>#{{ ped.id.substring(0, 8) }}</strong></td>
                <td>{{ ped.createdAt | date : 'short' }}</td>
                <td>
                  <div><strong>{{ ped.metodoEnvio || 'Estándar' }}</strong></div>
                  <small class="obs-text">{{ ped.observaciones }}</small>
                </td>
                <td class="total-cell">\${{ ped.total | number : '1.2-2' }}</td>
                <td>
                  <span class="badge-status" [ngClass]="ped.estado.toLowerCase()">
                    {{ ped.estado }}
                  </span>
                </td>
                <td>
                  <select
                    [ngModel]="ped.estado"
                    (ngModelChange)="cambiarEstadoPedido(ped.id, $event)"
                    class="status-select"
                  >
                    <option value="PENDIENTE">PENDIENTE</option>
                    <option value="EN_PROCESO">EN PROCESO</option>
                    <option value="COMPLETADO">COMPLETADO</option>
                    <option value="CANCELADO">CANCELADO</option>
                  </select>
                </td>
              </tr>
            </tbody>
          </table>

          <ng-template #sinPedidos>
            <div class="empty-box">No hay pedidos registrados en el servidor.</div>
          </ng-template>
        </div>
      </div>

      <!-- TAB 2: CRUD DE INVENTARIO Y PRODUCTOS -->
      <div class="tab-content" *ngIf="tabActiva() === 'inventario'">
        <div class="section-title">
          <h2>Gestión de Catálogo de Productos</h2>
          <button class="btn-primary" (click)="abrirModalCrearProducto()">➕ Nuevo Producto</button>
        </div>

        <!-- Tabla de Inventario -->
        <div class="table-wrapper">
          <table class="admin-table" *ngIf="productos().length > 0; else sinProductos">
            <thead>
              <tr>
                <th>Imagen</th>
                <th>Nombre del Leño</th>
                <th>Categoría</th>
                <th>Precio</th>
                <th>Stock</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let prod of productos()">
                <td>
                  <img [src]="prod.imagenUrl || 'https://via.placeholder.com/60'" [alt]="prod.nombre" class="thumb-img" />
                </td>
                <td>
                  <strong>{{ prod.nombre }}</strong>
                  <small class="obs-text">{{ prod.descripcion }}</small>
                </td>
                <td>{{ prod.categoria?.nombre || 'General' }}</td>
                <td class="price-text">\${{ prod.precio | number : '1.2-2' }}</td>
                <td>
                  <span class="stock-badge" [class.low]="prod.stock <= 5">
                    {{ prod.stock }} unidades
                  </span>
                </td>
                <td class="actions-cell">
                  <button class="btn-edit" (click)="prepararEdicionProducto(prod)">✏️ Editar</button>
                  <button class="btn-delete" (click)="eliminarProducto(prod.id)">🗑️ Eliminar</button>
                </td>
              </tr>
            </tbody>
          </table>

          <ng-template #sinProductos>
            <div class="empty-box">No hay productos registrados en el catálogo.</div>
          </ng-template>
        </div>

        <!-- Formulario Modal de Crear o Editar Producto -->
        <div class="form-modal" *ngIf="mostrandoFormProducto()">
          <div class="modal-card">
            <h3>{{ productoEdicionId ? '✏️ Editar Producto' : '➕ Crear Nuevo Producto' }}</h3>

            <form (ngSubmit)="guardarProducto()">
              <div class="form-grid">
                <div class="form-group">
                  <label>Nombre del Leño *</label>
                  <input type="text" [(ngModel)]="formProducto.nombre" name="pNombre" required />
                </div>

                <div class="form-group">
                  <label>Categoría *</label>
                  <select [(ngModel)]="formProducto.categoriaId" name="pCat" required>
                    <option value="" disabled>Selecciona una categoría</option>
                    <option *ngFor="let cat of categorias()" [value]="cat.id">{{ cat.nombre }}</option>
                  </select>
                </div>

                <div class="form-group">
                  <label>Precio (\$) *</label>
                  <input type="number" [(ngModel)]="formProducto.precio" name="pPrecio" required min="0" step="0.5" />
                </div>

                <div class="form-group">
                  <label>Stock Inicial *</label>
                  <input type="number" [(ngModel)]="formProducto.stock" name="pStock" required min="0" />
                </div>

                <div class="form-group full-width">
                  <label>Subir Imagen de Producto (Cloudinary) 📷</label>
                  <input type="file" (change)="onFileSelected($event)" accept="image/*" class="file-input" />
                  <small *ngIf="selectedFileName" class="file-name">Seleccionado: {{ selectedFileName }}</small>
                </div>

                <div class="form-group full-width">
                  <label>O URL de Imagen Externa</label>
                  <input type="url" [(ngModel)]="formProducto.imagenUrl" name="pImg" placeholder="https://..." />
                </div>

                <div class="form-group full-width">
                  <label>Descripción *</label>
                  <textarea [(ngModel)]="formProducto.descripcion" name="pDesc" required rows="3"></textarea>
                </div>
              </div>

              <div class="modal-actions">
                <button type="button" class="btn-cancel" (click)="cancelarFormProducto()">Cancelar</button>
                <button type="submit" class="btn-save" [disabled]="guardando()">
                  {{ guardando() ? '⏳ Guardando...' : 'Guardar Producto' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- TAB 3: CRUD COMPLETO DE CATEGORÍAS -->
      <div class="tab-content" *ngIf="tabActiva() === 'categorias'">
        <div class="section-title">
          <h2>Gestión de Categorías</h2>
          <button class="btn-primary" (click)="abrirModalCrearCategoria()">➕ Nueva Categoría</button>
        </div>

        <div class="table-wrapper">
          <table class="admin-table" *ngIf="categorias().length > 0; else sinCategorias">
            <thead>
              <tr>
                <th>Nombre de Categoría</th>
                <th>Descripción</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let cat of categorias()">
                <td><strong>🏷️ {{ cat.nombre }}</strong></td>
                <td>{{ cat.descripcion || 'Sin descripción' }}</td>
                <td class="actions-cell">
                  <button class="btn-edit" (click)="prepararEdicionCategoria(cat)">✏️ Editar</button>
                  <button class="btn-delete" (click)="eliminarCategoria(cat.id)">🗑️ Eliminar</button>
                </td>
              </tr>
            </tbody>
          </table>

          <ng-template #sinCategorias>
            <div class="empty-box">No hay categorías creadas.</div>
          </ng-template>
        </div>

        <!-- Modal de Crear o Editar Categoría -->
        <div class="form-modal" *ngIf="mostrandoFormCategoria()">
          <div class="modal-card small-card">
            <h3>{{ categoriaEdicionId ? '✏️ Editar Categoría' : '➕ Nueva Categoría' }}</h3>
            <form (ngSubmit)="guardarCategoria()">
              <div class="form-group">
                <label>Nombre de Categoría *</label>
                <input type="text" [(ngModel)]="formCategoria.nombre" name="cNombre" required placeholder="Ej. Especiales de la Casa" />
              </div>

              <div class="form-group">
                <label>Descripción</label>
                <textarea [(ngModel)]="formCategoria.descripcion" name="cDesc" rows="3"></textarea>
              </div>

              <div class="msg-box error" *ngIf="msgCategoriaError()">{{ msgCategoriaError() }}</div>

              <div class="modal-actions">
                <button type="button" class="btn-cancel" (click)="cancelarFormCategoria()">Cancelar</button>
                <button type="submit" class="btn-save">Guardar Categoría</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <ng-template #spinner>
        <div class="loading-box">🔥 Cargando...</div>
      </ng-template>
    </section>
  `,
  styles: [`
    .admin-container { max-width: 1150px; margin: 0 auto; padding: 2rem 1rem; color: #fff7ed; }
    .header h1 { color: #ff7316; font-size: 2rem; margin-bottom: 0.3rem; }
    .subtitle { color: #a89485; margin-bottom: 1.5rem; }
    .admin-tabs { display: flex; gap: 0.8rem; margin-bottom: 1.5rem; border-bottom: 1px solid rgba(255, 115, 22, 0.2); }
    .admin-tabs button {
      background: #1f130b; border: 1px solid #4a382c; color: #a89485; padding: 0.7rem 1.2rem;
      border-radius: 8px 8px 0 0; font-weight: bold; cursor: pointer; transition: all 0.2s;
    }
    .admin-tabs button.active { background: #ff7316; color: #fff; border-color: #ff7316; }
    .tab-content { background: #1f130b; padding: 1.5rem; border-radius: 12px; border: 1px solid rgba(255, 115, 22, 0.2); }
    .section-title { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .section-title h2 { margin: 0; color: #ff7316; font-size: 1.3rem; }
    .btn-primary { background: #ff7316; border: none; color: #fff; font-weight: bold; padding: 0.6rem 1.2rem; border-radius: 8px; cursor: pointer; }
    .btn-refresh { background: transparent; border: 1px solid #ff7316; color: #ff7316; padding: 0.4rem 0.8rem; border-radius: 6px; cursor: pointer; }
    .table-wrapper { overflow-x: auto; }
    .admin-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem; }
    .admin-table th, .admin-table td { padding: 0.8rem; border-bottom: 1px solid rgba(255, 255, 255, 0.08); }
    .admin-table th { background: #180e08; color: #ff7316; }
    .thumb-img { width: 50px; height: 50px; object-fit: cover; border-radius: 6px; }
    .total-cell { font-weight: bold; color: #22c55e; }
    .price-text { font-weight: bold; color: #ff7316; }
    .obs-text { display: block; color: #a89485; font-size: 0.8rem; max-width: 250px; }
    .stock-badge { background: #16a34a; color: #fff; padding: 3px 8px; border-radius: 10px; font-size: 0.75rem; font-weight: bold; }
    .stock-badge.low { background: #dc2626; }
    .actions-cell { display: flex; gap: 0.5rem; }
    .btn-edit { background: #3b82f6; border: none; color: #fff; padding: 0.4rem 0.8rem; border-radius: 6px; cursor: pointer; font-size: 0.8rem; }
    .btn-delete { background: #ef4444; border: none; color: #fff; padding: 0.4rem 0.8rem; border-radius: 6px; cursor: pointer; font-size: 0.8rem; }
    .badge-status { padding: 3px 8px; border-radius: 12px; font-weight: bold; font-size: 0.75rem; text-transform: uppercase; }
    .badge-status.pendiente { background: rgba(234, 179, 8, 0.2); color: #facc15; }
    .badge-status.en_proceso { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
    .badge-status.completado { background: rgba(34, 197, 94, 0.2); color: #4ade80; }
    .badge-status.cancelado { background: rgba(239, 68, 68, 0.2); color: #fca5a5; }
    .status-select { background: #2a1a0f; border: 1px solid #4a382c; color: #fff; padding: 0.4rem; border-radius: 6px; }
    .form-card { background: #2a1a0f; padding: 1.5rem; border-radius: 12px; }
    .form-modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 99; }
    .modal-card { background: #1f130b; border: 1px solid #ff7316; padding: 2rem; border-radius: 16px; width: 100%; max-width: 600px; color: #fff; }
    .small-card { max-width: 450px !important; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .full-width { grid-column: 1 / -1; }
    .form-group { margin-bottom: 1rem; }
    .form-group label { display: block; font-size: 0.85rem; color: #e4d5c7; margin-bottom: 4px; }
    .form-group input, .form-group select, .form-group textarea {
      width: 100%; padding: 0.6rem 0.8rem; background: #2a1a0f; border: 1px solid #4a382c; border-radius: 8px; color: #fff; outline: none;
    }
    .file-input { padding: 0.4rem !important; }
    .file-name { display: block; margin-top: 4px; color: #22c55e; font-size: 0.8rem; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1rem; }
    .btn-cancel { background: transparent; border: 1px solid #4a382c; color: #a89485; padding: 0.6rem 1.2rem; border-radius: 8px; cursor: pointer; }
    .btn-save { background: #ff7316; border: none; color: #fff; font-weight: bold; padding: 0.6rem 1.4rem; border-radius: 8px; cursor: pointer; }
    .msg-box.error { background: rgba(239, 68, 68, 0.2); color: #fca5a5; padding: 0.5rem; border-radius: 6px; font-size: 0.85rem; margin-top: 0.5rem; }
    .empty-box { text-align: center; padding: 3rem; color: #a89485; }
    .loading-box { text-align: center; padding: 3rem; color: #ff7316; }
  `],
})
export class AdminDashboardComponent implements OnInit {
  readonly tabActiva = signal<'ordenes' | 'inventario' | 'categorias'>('ordenes');
  readonly pedidos = signal<Pedido[]>([]);
  readonly productos = signal<Producto[]>([]);
  readonly categorias = signal<Categoria[]>([]);
  readonly cargando = signal<boolean>(true);
  readonly guardando = signal<boolean>(false);
  readonly mostrandoFormProducto = signal<boolean>(false);
  readonly mostrandoFormCategoria = signal<boolean>(false);
  readonly msgCategoriaError = signal<string>('');

  productoEdicionId: string | null = null;
  categoriaEdicionId: string | null = null;
  selectedFile: File | null = null;
  selectedFileName: string = '';

  formProducto: CrearProductoDto = {
    nombre: '',
    descripcion: '',
    precio: 150,
    stock: 20,
    imagenUrl: '',
    categoriaId: '',
  };

  formCategoria: CrearCategoriaDto = {
    nombre: '',
    descripcion: '',
  };

  constructor(
    private adminService: AdminService,
    private productoService: ProductoService,
    private categoriaService: CategoriaService,
    private sanitizerService: SanitizerService
  ) {}

  ngOnInit(): void {
    this.cargarOrdenes();
    this.cargarProductos();
    this.cargarCategorias();
  }

  cargarOrdenes() {
    this.cargando.set(true);
    this.adminService.getAdminOrders().subscribe((orders) => {
      this.pedidos.set(orders);
      this.cargando.set(false);
    });
  }

  cargarProductos() {
    this.productoService.getProductos().subscribe((prods) => {
      this.productos.set(prods);
    });
  }

  cargarCategorias() {
    this.categoriaService.getCategorias().subscribe((cats) => {
      this.categorias.set(cats);
    });
  }

  cambiarEstadoPedido(orderId: string, nuevoEstado: EstadoPedido) {
    this.adminService.actualizarEstadoPedido(orderId, nuevoEstado).subscribe({
      next: (res) => {
        if (res) this.cargarOrdenes();
      },
    });
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.selectedFileName = file.name;
    }
  }

  abrirModalCrearProducto() {
    this.productoEdicionId = null;
    this.selectedFile = null;
    this.selectedFileName = '';
    this.formProducto = { nombre: '', descripcion: '', precio: 150, stock: 20, imagenUrl: '', categoriaId: this.categorias()[0]?.id || '' };
    this.mostrandoFormProducto.set(true);
  }

  prepararEdicionProducto(producto: Producto) {
    this.productoEdicionId = producto.id;
    this.selectedFile = null;
    this.selectedFileName = '';
    this.formProducto = {
      nombre: producto.nombre,
      descripcion: producto.descripcion || '',
      precio: producto.precio,
      stock: producto.stock,
      imagenUrl: producto.imagenUrl || '',
      categoriaId: producto.categoriaId,
    };
    this.mostrandoFormProducto.set(true);
  }

  cancelarFormProducto() {
    this.mostrandoFormProducto.set(false);
    this.productoEdicionId = null;
    this.selectedFile = null;
    this.selectedFileName = '';
  }

  guardarProducto() {
    if (!this.formProducto.nombre || !this.formProducto.categoriaId || this.guardando()) return;

    this.formProducto = this.sanitizerService.sanitizarFormulario(this.formProducto);

    this.guardando.set(true);

    if (this.productoEdicionId) {
      this.productoService.actualizarProducto(this.productoEdicionId, this.formProducto, this.selectedFile).subscribe({
        next: () => {
          this.guardando.set(false);
          this.cargarProductos();
          this.cancelarFormProducto();
        },
        error: () => this.guardando.set(false),
      });
    } else {
      const formData = this.productoService.crearFormData(this.formProducto, this.selectedFile);
      this.productoService.crearProducto(formData).subscribe({
        next: () => {
          this.guardando.set(false);
          this.cargarProductos();
          this.cancelarFormProducto();
        },
        error: () => this.guardando.set(false),
      });
    }
  }

  eliminarProducto(id: string) {
    if (confirm('¿Estás seguro de eliminar este producto del catálogo?')) {
      this.productoService.eliminarProducto(id).subscribe(() => {
        this.cargarProductos();
      });
    }
  }

  // --- CRUD CATEGORIAS --- //
  abrirModalCrearCategoria() {
    this.categoriaEdicionId = null;
    this.formCategoria = { nombre: '', descripcion: '' };
    this.msgCategoriaError.set('');
    this.mostrandoFormCategoria.set(true);
  }

  prepararEdicionCategoria(categoria: Categoria) {
    this.categoriaEdicionId = categoria.id;
    this.formCategoria = { nombre: categoria.nombre, descripcion: categoria.descripcion || '' };
    this.msgCategoriaError.set('');
    this.mostrandoFormCategoria.set(true);
  }

  cancelarFormCategoria() {
    this.mostrandoFormCategoria.set(false);
    this.categoriaEdicionId = null;
    this.msgCategoriaError.set('');
  }

  guardarCategoria() {
    if (!this.formCategoria.nombre) return;

    this.formCategoria = this.sanitizerService.sanitizarFormulario(this.formCategoria);

    this.msgCategoriaError.set('');

    if (this.categoriaEdicionId) {
      this.categoriaService.actualizarCategoria(this.categoriaEdicionId, this.formCategoria).subscribe({
        next: () => {
          this.cargarCategorias();
          this.cancelarFormCategoria();
        },
        error: (err) => this.msgCategoriaError.set(err.error?.message || 'Error al actualizar la categoría.'),
      });
    } else {
      this.categoriaService.crearCategoria(this.formCategoria).subscribe({
        next: () => {
          this.cargarCategorias();
          this.cancelarFormCategoria();
        },
        error: (err) => this.msgCategoriaError.set(err.error?.message || 'Error al crear la categoría.'),
      });
    }
  }

  eliminarCategoria(id: string) {
    if (confirm('¿Estás seguro de eliminar esta categoría?')) {
      this.categoriaService.eliminarCategoria(id).subscribe((res) => {
        if (res.success) {
          this.cargarCategorias();
        } else {
          alert(res.message || 'No se puede eliminar la categoría porque tiene productos asociados.');
        }
      });
    }
  }
}
