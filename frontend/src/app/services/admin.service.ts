import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import { Pedido, EstadoPedido } from '../models/pedido.model';
import { environment } from '../../environments/environment';

export interface RespuestaAdminPedidos {
  success: boolean;
  message?: string;
  data: Pedido[];
}

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private readonly adminApiUrl = `${environment.apiUrl}/admin`;
  private readonly ordersApiUrl = `${environment.apiUrl}/orders`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene la lista general de pedidos para administradores (GET /api/admin/orders)
   */
  getAdminOrders(): Observable<Pedido[]> {
    return this.http.get<RespuestaAdminPedidos | Pedido[]>(`${this.adminApiUrl}/orders`).pipe(
      map((res: any) => (Array.isArray(res) ? res : res?.data || [])),
      catchError((error) => {
        console.error('[AdminService] Error al obtener órdenes de administración:', error);
        return of([]);
      })
    );
  }

  /**
   * Actualiza el estado de un pedido (PUT /api/orders/:id/status - Requiere Rol Admin)
   */
  actualizarEstadoPedido(orderId: string, nuevoEstado: EstadoPedido): Observable<Pedido | null> {
    return this.http
      .put<{ success: boolean; data: Pedido }>(`${this.ordersApiUrl}/${orderId}/status`, {
        estado: nuevoEstado,
      })
      .pipe(
        map((res: any) => (res && res.data ? res.data : res)),
        catchError((error) => {
          console.error(`[AdminService] Error al actualizar estado del pedido ${orderId}:`, error);
          return of(null);
        })
      );
  }
}
