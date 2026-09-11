export interface Categoria {
  id: string;
  nombre: string;
  descripcion?: string;
}

export interface Producto {
  id: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  stock: number;
  imagenUrl?: string;
  categoriaId: string;
  categoria?: Categoria;
  createdAt?: string;
  updatedAt?: string;
}

export interface RespuestaProductos {
  success: boolean;
  message?: string;
  data: Producto[];
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
