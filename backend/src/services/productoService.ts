import { ProductoRepository } from '../repositories/productoRepository';

const productoRepository = new ProductoRepository();

export class ProductoService {
  async getAllProductos(filtros?: any) {
    return productoRepository.findAll(filtros);
  }

  async getProductoById(id: number) {
    const producto = await productoRepository.findById(id);
    if (!producto) {
      throw new Error('Producto no encontrado');
    }
    return producto;
  }

  async createProducto(data: any) {
    return productoRepository.create(data);
  }

  async updateProducto(id: number, data: any) {
    // Verificar que exista
    await this.getProductoById(id);
    return productoRepository.update(id, data);
  }
}
