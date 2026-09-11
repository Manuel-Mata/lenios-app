import { Producto } from './producto.model';

export interface ItemCarrito {
  producto: Producto;
  cantidad: number;
  observaciones?: string;
  opcionesPersonalizadas?: string[];
}

export interface ResumenCarrito {
  items: ItemCarrito[];
  subtotal: number;
  costoEnvio: number;
  total: number;
  totalCantidadItems: number;
}
