import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Producto, Categoria } from '../../models/producto.model';
import { ProductoService } from '../../services/producto.service';
import { CategoriaService } from '../../services/categoria.service';
import { CarritoService } from '../../services/carrito.service';

@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="catalogo-container">
      <div class="header-section">
        <h1>🪵 Menú de Leños Rellenos</h1>
        <p class="subtitle">Tradición a la leña, productos recién horneados directo de la base de datos</p>

        <!-- Buscador y Filtros -->
        <div class="controls-wrapper">
          <div class="search-box">
            <input
              type="text"
              placeholder="Buscar por nombre o ingrediente..."
              [(ngModel)]="searchQuery"
              (input)="buscar()"
            />
          </div>

          <!-- Filtro dinámico por Categoría -->
          <div class="category-filters" *ngIf="categorias().length > 0">
            <button
              class="filter-btn"
              [class.active]="categoriaSeleccionada() === ''"
              (click)="filtrarPorCategoria('')"
            >
              Todas
            </button>
            <button
              *ngFor="let cat of categorias()"
              class="filter-btn"
              [class.active]="categoriaSeleccionada() === cat.id"
              (click)="filtrarPorCategoria(cat.id)"
            >
              {{ cat.nombre }}
            </button>
          </div>
        </div>
      </div>

      <!-- Grid de Productos -->
      <div class="products-grid" *ngIf="!cargando(); else spinner">
        <ng-container *ngIf="productos().length > 0; else sinResultados">
          <div class="product-card" *ngFor="let prod of productos()">
            <div class="image-wrapper">
              <img [src]="prod.imagenUrl || 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=600&q=80'" [alt]="prod.nombre" />
              <span class="badge-stock" [class.outOfStock]="prod.stock <= 0">
                {{ prod.stock > 0 ? 'Disponible (' + prod.stock + ')' : 'Agotado' }}
              </span>
            </div>

            <div class="card-content">
              <div class="category-tag">{{ prod.categoria?.nombre || 'Especialidad' }}</div>
              <h3>{{ prod.nombre }}</h3>
              <p class="description">{{ prod.descripcion || 'Delicioso leño relleno artesanal.' }}</p>

              <div class="card-footer">
                <span class="price">\${{ prod.precio | number : '1.2-2' }}</span>
                <button
                  class="btn-add"
                  [disabled]="prod.stock <= 0"
                  (click)="agregarAlCarrito(prod)"
                >
                  🛒 Agregar
                </button>
              </div>
            </div>
          </div>
        </ng-container>
      </div>

      <ng-template #sinResultados>
        <div class="empty-state">
          <p>⚠️ No se encontraron leños con los filtros seleccionados.</p>
        </div>
      </ng-template>

      <ng-template #spinner>
        <div class="loading-box">
          <p>🔥 Cargando ...</p>
        </div>
      </ng-template>
    </section>
  `,
  styles: [`
    .catalogo-container { max-width: 1200px; margin: 0 auto; padding: 2rem 1rem; color: #fff7ed; }
    .header-section { text-align: center; margin-bottom: 2.5rem; }
    .header-section h1 { font-size: 2.2rem; color: #ff7316; margin-bottom: 0.5rem; }
    .subtitle { color: #a89485; font-size: 1.1rem; }
    .controls-wrapper { margin-top: 1.5rem; display: flex; flex-direction: column; gap: 1rem; align-items: center; }
    .search-box { width: 100%; max-width: 500px; }
    .search-box input {
      width: 100%; padding: 0.8rem 1.2rem; background: #1f130b; border: 1px solid #ff7316;
      border-radius: 25px; color: #fff; font-size: 1rem; outline: none;
    }
    .category-filters { display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center; }
    .filter-btn {
      background: #1f130b; border: 1px solid rgba(255, 115, 22, 0.4); color: #e4d5c7;
      padding: 0.5rem 1rem; border-radius: 20px; font-weight: 600; cursor: pointer; transition: all 0.2s;
    }
    .filter-btn.active, .filter-btn:hover { background: #ff7316; color: #fff; border-color: #ff7316; }
    .products-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 2rem; }
    .product-card {
      background: #1f130b; border: 1px solid rgba(255, 115, 22, 0.2); border-radius: 16px;
      overflow: hidden; display: flex; flex-direction: column; transition: transform 0.2s, box-shadow 0.2s;
    }
    .product-card:hover { transform: translateY(-4px); box-shadow: 0 10px 20px rgba(255, 115, 22, 0.15); }
    .image-wrapper { position: relative; height: 200px; }
    .image-wrapper img { width: 100%; height: 100%; object-fit: cover; }
    .badge-stock {
      position: absolute; top: 12px; right: 12px; background: #16a34a; color: #fff;
      font-size: 0.75rem; font-weight: bold; padding: 4px 10px; border-radius: 12px;
    }
    .badge-stock.outOfStock { background: #dc2626; }
    .card-content { padding: 1.5rem; display: flex; flex-direction: column; flex-grow: 1; }
    .category-tag { font-size: 0.8rem; color: #ff7316; text-transform: uppercase; font-weight: bold; }
    .product-card h3 { margin: 0.4rem 0; font-size: 1.25rem; color: #fff; }
    .description { font-size: 0.9rem; color: #a89485; line-height: 1.5; flex-grow: 1; margin-bottom: 1.2rem; }
    .card-footer { display: flex; align-items: center; justify-content: space-between; margin-top: auto; }
    .price { font-size: 1.4rem; font-weight: bold; color: #ff7316; }
    .btn-add {
      background: #ff7316; border: none; color: #fff; padding: 0.6rem 1.2rem;
      border-radius: 8px; font-weight: bold; cursor: pointer; transition: background 0.2s;
    }
    .btn-add:hover:not(:disabled) { background: #ea580c; }
    .btn-add:disabled { background: #4a382c; cursor: not-allowed; opacity: 0.6; }
    .empty-state { text-align: center; padding: 3rem; color: #a89485; width: 100%; grid-column: 1 / -1; }
    .loading-box { text-align: center; padding: 4rem; color: #ff7316; font-size: 1.2rem; }
  `],
})
export class CatalogoComponent implements OnInit {
  readonly productos = signal<Producto[]>([]);
  readonly categorias = signal<Categoria[]>([]);
  readonly cargando = signal<boolean>(true);
  readonly categoriaSeleccionada = signal<string>('');
  searchQuery: string = '';

  constructor(
    private productoService: ProductoService,
    private categoriaService: CategoriaService,
    private carritoService: CarritoService
  ) {}

  ngOnInit(): void {
    this.cargarCategorias();
    this.cargarProductos();
  }

  cargarCategorias() {
    this.categoriaService.getCategorias().subscribe((cats) => {
      this.categorias.set(cats);
    });
  }

  cargarProductos() {
    this.cargando.set(true);
    this.productoService
      .getProductos(this.categoriaSeleccionada(), this.searchQuery)
      .subscribe((prods) => {
        this.productos.set(prods);
        this.cargando.set(false);
      });
  }

  filtrarPorCategoria(categoriaId: string) {
    this.categoriaSeleccionada.set(categoriaId);
    this.cargarProductos();
  }

  buscar() {
    this.cargarProductos();
  }

  agregarAlCarrito(producto: Producto) {
    this.carritoService.agregarProducto(producto);
  }
}
