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

  async createCategoria(data: any) {
    if (!data.nombre) {
      throw new Error('El nombre de la categoría es obligatorio');
    }
    
    // Verificar si ya existe una categoría con ese nombre
    const existing = await categoriaRepository.findAll();
    const isDuplicate = existing.some(
      (c) => c.nombre.toLowerCase() === data.nombre.trim().toLowerCase()
    );

    if (isDuplicate) {
      throw new Error(`Ya existe una categoría llamada "${data.nombre}"`);
    }

    return categoriaRepository.create({
      nombre: data.nombre.trim(),
      descripcion: data.descripcion ? data.descripcion.trim() : null,
    });
  }
}
