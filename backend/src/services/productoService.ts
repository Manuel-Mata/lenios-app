import { ProductoRepository } from '../repositories/productoRepository';
import cloudinary from '../config/cloudinary';

const productoRepository = new ProductoRepository();

export class ProductoService {
  async getAllProductos(page: number, limit: number, categoryId?: string, search?: string) {
    return productoRepository.findAll({ page, limit, categoryId, search });
  }

  async getProductoById(id: string) {
    const producto = await productoRepository.findById(id);
    if (!producto) {
      throw new Error('Producto no encontrado');
    }
    return producto;
  }

  async createProducto(data: any, file?: any) {
    let imageUrl = typeof data.imagen === 'string' && data.imagen.trim() !== '' ? data.imagen.trim() : null;

    if (file) {
      // Subir a Cloudinary desde el buffer en memoria
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'lenios-app/productos' },
          (error: any, result: any) => {
            if (result) {
              resolve(result);
            } else {
              reject(error);
            }
          }
        );
        stream.end(file.buffer);
      });
      imageUrl = (result as any).secure_url;
    }

    const productoData = {
      ...data,
      precio: parseFloat(data.precio),
      stock: data.stock !== undefined && data.stock !== '' ? parseInt(data.stock, 10) : 0,
      categoriaId: data.categoryId || data.categoriaId || data.id_categoria,
      imagenUrl: imageUrl
    };
    delete productoData.imagen;
    delete productoData.id_categoria;
    delete productoData.categoryId;

    return productoRepository.create(productoData);
  }

  async updateProducto(id: string, data: any, file?: any) {
    // Verificar que exista
    await this.getProductoById(id);

    let imageUrl = data.imagen;

    if (file) {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'lenios-app/productos' },
          (error: any, result: any) => {
            if (result) {
              resolve(result);
            } else {
              reject(error);
            }
          }
        );
        stream.end(file.buffer);
      });
      imageUrl = (result as any).secure_url;
    }

    const productoData: any = { ...data };
    if (data.precio !== undefined) productoData.precio = parseFloat(data.precio);
    if (data.stock !== undefined && data.stock !== '') productoData.stock = parseInt(data.stock, 10);
    if (data.categoryId || data.categoriaId || data.id_categoria) {
      productoData.categoriaId = data.categoryId || data.categoriaId || data.id_categoria;
    }
    if (imageUrl) productoData.imagenUrl = imageUrl;
    delete productoData.imagen;
    delete productoData.id_categoria;
    delete productoData.categoryId;

    return productoRepository.update(id, productoData);
  }

  async deleteProducto(id: string) {
    // Verificar que exista
    await this.getProductoById(id);
    return productoRepository.delete(id);
  }
}
