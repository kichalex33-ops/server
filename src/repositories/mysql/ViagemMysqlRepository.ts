import { BaseMysqlRepository } from './BaseMysqlRepository.js';

export class ViagemMysqlRepository extends BaseMysqlRepository {
  constructor() {
    super('viagens');
  }

  async addItem(collection: string, item: any) {
    return this.create(item);
  }

  async updateItem(collection: string, id: string, patch: any) {
    return this.update(id, patch);
  }

  getCollection(collection: string) {
    return this.findAll();
  }
  
  // Implementação específica para buscar passageiros da viagem
  async findPassageiros(viagemId: string) {
    const [rows] = await this.pool.query(
      'SELECT * FROM passageiros WHERE viagem_id = ?',
      [viagemId]
    );
    return rows;
  }
}
