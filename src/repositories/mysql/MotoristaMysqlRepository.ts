import { BaseMysqlRepository } from './BaseMysqlRepository.js';

export class MotoristaMysqlRepository extends BaseMysqlRepository {
  constructor() {
    super('motoristas');
  }

  // Sobrescreve addItem para compatibilidade com interface do factory
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
