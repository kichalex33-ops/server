import { BaseMysqlRepository } from './BaseMysqlRepository.js';

export class VeiculoMysqlRepository extends BaseMysqlRepository {
  constructor() {
    super('veiculos');
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
}
