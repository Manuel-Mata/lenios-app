import { CategoriaRepository } from '../repositories/categoriaRepository';

const categoriaRepository = new CategoriaRepository();

export class CategoriaService {
  async getAllCategorias() {
    return categoriaRepository.findAll();
  }

  async getCategoriaById(id: number) {
    const categoria = await categoriaRepository.findById(id);
    if (!categoria) {
      throw new Error('Categoría no encontrada');
    }
    return categoria;
  }

  async createCategoria(data: any) {
    return categoriaRepository.create(data);
  }
}
