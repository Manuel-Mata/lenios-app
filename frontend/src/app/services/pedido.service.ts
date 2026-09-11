import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CrearPedidoDto, Pedido } from '../models/pedido.model';
import { environment } from '../../environments/environment';

export interface RespuestaCrearPedido {
  success: boolean;
  message: string;
  data: Pedido;
  whatsappUrl?: string;
  whatsappMessage?: string;
}

@Injectable({
  providedIn: 'root',
})
export class PedidoService {
  private readonly apiUrl = `${environment.apiUrl}/orders`;

  constructor(private http: HttpClient) {}

  /**
   * Envía la orden de pedido al backend (POST http://localhost:3000/api/orders)
   */
  crearPedido(pedidoDto: CrearPedidoDto): Observable<RespuestaCrearPedido> {
    const payload = {
      items: pedidoDto.items,
      metodoEnvio: pedidoDto.tipoEntrega,
      observaciones: pedidoDto.observaciones
        ? `Cliente: ${pedidoDto.nombreCliente} | Tel: ${pedidoDto.telefonoCliente} | Dirección: ${pedidoDto.direccionEntrega || 'Sucursal'} | Pago: ${pedidoDto.metodoPago} | Notas: ${pedidoDto.observaciones}`
        : `Cliente: ${pedidoDto.nombreCliente} | Tel: ${pedidoDto.telefonoCliente} | Dirección: ${pedidoDto.direccionEntrega || 'Sucursal'} | Pago: ${pedidoDto.metodoPago}`,
    };

    return this.http.post<RespuestaCrearPedido>(this.apiUrl, payload);
  }
}
