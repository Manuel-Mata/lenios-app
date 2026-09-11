import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import { Producto, RespuestaProductos } from '../models/producto.model';
import { environment } from '../../environments/environment';

export interface CrearProductoDto {
  nombre: string;
  descripcion?: string;
  precio: number;
  stock: number;
  imagenUrl?: string;
  categoriaId: string;
  file?: File | null;
}

@Injectable({
  providedIn: 'root',
})
export class ProductoService {
  private readonly apiUrl = `${environment.apiUrl}/productos`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene el catálogo de productos (GET /api/productos)
   */
  getProductos(categoriaId?: string, search?: string): Observable<Producto[]> {
    let params = new HttpParams();
    if (categoriaId) params = params.set('category', categoriaId);
    if (search) params = params.set('search', search);

    return this.http.get<RespuestaProductos | Producto[]>(this.apiUrl, { params }).pipe(
      map((res: any) => (Array.isArray(res) ? res : res?.data || [])),
      catchError((error) => {
        console.error('[ProductoService] Error al consultar productos:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtiene detalle por ID (GET /api/productos/:id)
   */
  getProductoById(id: string): Observable<Producto | undefined> {
    return this.http.get<{ success: boolean; data: Producto } | Producto>(`${this.apiUrl}/${id}`).pipe(
      map((res: any) => (res && res.data ? res.data : res)),
      catchError((error) => {
        console.error(`[ProductoService] Error al obtener el producto ${id}:`, error);
        return of(undefined);
      })
    );
  }

  /**
   * Empaqueta el DTO y el archivo de imagen opcional en un objeto FormData para multipart/form-data
   */
  crearFormData(dto: Partial<CrearProductoDto>, file?: File | null): FormData {
    const formData = new FormData();
    if (dto.nombre) formData.append('nombre', dto.nombre);
    if (dto.descripcion) formData.append('descripcion', dto.descripcion);
    if (dto.precio !== undefined) formData.append('precio', dto.precio.toString());
    if (dto.stock !== undefined) formData.append('stock', dto.stock.toString());
    if (dto.categoriaId) formData.append('categoriaId', dto.categoriaId);
    if (dto.imagenUrl) formData.append('imagenUrl', dto.imagenUrl);

    if (file) {
      formData.append('imagen', file, file.name);
    }
    return formData;
  }

  /**
   * Crear nuevo producto enviando FormData o JSON (POST /api/productos - Requiere Rol Admin)
   */
  crearProducto(data: FormData | CrearProductoDto): Observable<Producto> {
    const payload = data instanceof FormData ? data : this.crearFormData(data, data.file);
    return this.http.post<{ success: boolean; data: Producto } | Producto>(this.apiUrl, payload).pipe(
      map((res: any) => (res && res.data ? res.data : res.product || res))
    );
  }

  /**
   * Actualizar producto existente enviando FormData o JSON (PUT /api/productos/:id - Requiere Rol Admin)
   */
  actualizarProducto(id: string, data: FormData | Partial<CrearProductoDto>, file?: File | null): Observable<Producto> {
    const payload = data instanceof FormData ? data : this.crearFormData(data, file || data.file);
    return this.http.put<{ success: boolean; data: Producto } | Producto>(`${this.apiUrl}/${id}`, payload).pipe(
      map((res: any) => (res && res.data ? res.data : res.product || res))
    );
  }

  /**
   * Alternar disponibilidad de producto (PATCH /api/productos/:id/toggle)
   */
  toggleDisponibilidad(id: string): Observable<Producto | null> {
    return this.http.patch<any>(`${this.apiUrl}/${id}/toggle`, {}).pipe(
      map((res: any) => (res && res.data ? res.data : res.product || res)),
      catchError(() => of(null))
    );
  }

  /**
   * Eliminar producto (DELETE /api/productos/:id - Requiere Rol Admin)
   */
  eliminarProducto(id: string): Observable<boolean> {
    return this.http.delete<{ success: boolean }>(`${this.apiUrl}/${id}`).pipe(
      map((res: any) => Boolean(res && res.success !== false)),
      catchError(() => of(false))
    );
  }
}
