import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import { Categoria } from '../models/producto.model';
import { environment } from '../../environments/environment';

export interface CrearCategoriaDto {
  nombre: string;
  descripcion?: string;
}

@Injectable({
  providedIn: 'root',
})
export class CategoriaService {
  private readonly apiUrl = `${environment.apiUrl}/categorias`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene la lista completa de categorías (GET /api/categorias)
   */
  getCategorias(): Observable<Categoria[]> {
    return this.http.get<any>(this.apiUrl).pipe(
      map((res: any) => (Array.isArray(res) ? res : res?.data || [])),
      catchError((error) => {
        console.error('[CategoriaService] Error al obtener categorías:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtiene una categoría por su ID (GET /api/categorias/:id)
   */
  getCategoriaById(id: string): Observable<Categoria | undefined> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map((res: any) => (res && res.data ? res.data : res)),
      catchError((error) => {
        console.error(`[CategoriaService] Error al obtener categoría ${id}:`, error);
        return of(undefined);
      })
    );
  }

  /**
   * Crear nueva categoría (POST /api/categorias - Requiere Rol Admin)
   */
  crearCategoria(categoria: CrearCategoriaDto): Observable<Categoria> {
    return this.http.post<any>(this.apiUrl, categoria).pipe(
      map((res: any) => (res && res.data ? res.data : res))
    );
  }

  /**
   * Actualizar categoría existente (PUT /api/categorias/:id - Requiere Rol Admin)
   */
  actualizarCategoria(id: string, categoria: Partial<CrearCategoriaDto>): Observable<Categoria> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, categoria).pipe(
      map((res: any) => (res && res.data ? res.data : res))
    );
  }

  /**
   * Eliminar categoría (DELETE /api/categorias/:id - Requiere Rol Admin)
   */
  eliminarCategoria(id: string): Observable<{ success: boolean; message?: string }> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`).pipe(
      map((res: any) => ({ success: Boolean(res && res.success !== false), message: res?.message })),
      catchError((err) => of({ success: false, message: err.error?.message || 'No se pudo eliminar la categoría' }))
    );
  }
}
