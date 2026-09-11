import { CategoriaRepository } from '../repositories/categoriaRepository';

const categoriaRepository = new CategoriaRepository();

export class CategoriaService {
  async getAllCategorias() {
    return categoriaRepository.findAll();
  }

  async getCategoriaById(id: string) {
    const categoria = await categoriaRepository.findById(id);
    if (!categoria) {
      throw new Error('Categoría no encontrada');
    }
    return categoria;
  }

  async createCategoria(data: { nombre: string; descripcion?: string }) {
    if (!data.nombre || data.nombre.trim() === '') {
      throw new Error('El nombre de la categoría es obligatorio');
    }

    const nombreLimpio = data.nombre.trim();

    // Verificar duplicado por nombre insensible a mayúsculas/minúsculas
    const existing = await categoriaRepository.findByNombre(nombreLimpio);
    if (existing) {
      throw new Error(`Ya existe una categoría llamada "${nombreLimpio}"`);
    }

    return categoriaRepository.create({
      nombre: nombreLimpio,
      descripcion: data.descripcion ? data.descripcion.trim() : null,
    });
  }

  async updateCategoria(id: string, data: { nombre?: string; descripcion?: string }) {
    const categoriaExistente = await categoriaRepository.findById(id);
    if (!categoriaExistente) {
      throw new Error('Categoría no encontrada para actualizar');
    }

    const updateData: { nombre?: string; descripcion?: string | null } = {};

    if (data.nombre !== undefined) {
      const nombreLimpio = data.nombre.trim();
      if (nombreLimpio === '') {
        throw new Error('El nombre de la categoría no puede estar vacío');
      }

      // Si cambió el nombre, validar que no choque con otra categoría existente
      if (nombreLimpio.toLowerCase() !== categoriaExistente.nombre.toLowerCase()) {
        const duplicado = await categoriaRepository.findByNombre(nombreLimpio);
        if (duplicado && duplicado.id !== id) {
          throw new Error(`Ya existe otra categoría con el nombre "${nombreLimpio}"`);
        }
      }
      updateData.nombre = nombreLimpio;
    }

    if (data.descripcion !== undefined) {
      updateData.descripcion = data.descripcion ? data.descripcion.trim() : null;
    }

    return categoriaRepository.update(id, updateData);
  }

  async deleteCategoria(id: string) {
    const categoriaExistente = await categoriaRepository.findById(id);
    if (!categoriaExistente) {
      throw new Error('Categoría no encontrada para eliminar');
    }

    // Verificar si tiene productos asociados antes de eliminar
    if (categoriaExistente.productos && categoriaExistente.productos.length > 0) {
      throw new Error(`No se puede eliminar la categoría "${categoriaExistente.nombre}" porque tiene ${categoriaExistente.productos.length} producto(s) asociado(s). Reasigna los productos primero.`);
    }

    return categoriaRepository.delete(id);
  }
}
