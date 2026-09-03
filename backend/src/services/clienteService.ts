import { ClienteRepository } from '../repositories/clienteRepository';

const clienteRepository = new ClienteRepository();

export class ClienteService {
  async getAllClientes() {
    return clienteRepository.findAll();
  }

  async getClienteById(id: number) {
    const cliente = await clienteRepository.findById(id);
    if (!cliente) {
      throw new Error('Cliente no encontrado');
    }
    return cliente;
  }
}
