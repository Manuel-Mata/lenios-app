export enum EstadoPedido {
  PENDIENTE = 'PENDIENTE',
  EN_PROCESO = 'EN_PROCESO',
  COMPLETADO = 'COMPLETADO',
  CANCELADO = 'CANCELADO',
}

export interface ItemPedidoDto {
  productoId: string;
  cantidad: number;
}

export interface CrearPedidoDto {
  nombreCliente: string;
  telefonoCliente: string;
  direccionEntrega?: string;
  tipoEntrega: 'DOMICILIO' | 'SUCURSAL';
  metodoPago: 'EFECTIVO' | 'TRANSFERENCIA';
  observaciones?: string;
  items: ItemPedidoDto[];
  avisoPrivacidadAceptado: boolean;
}

export interface Pedido {
  id: string;
  usuarioId?: string;
  total: number;
  estado: EstadoPedido;
  metodoEnvio?: string;
  observaciones?: string;
  createdAt: string;
  detalles?: any[];
}
