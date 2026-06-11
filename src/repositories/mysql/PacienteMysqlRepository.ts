import { BaseMysqlRepository } from './BaseMysqlRepository.js';

export class PacienteMysqlRepository extends BaseMysqlRepository {
  constructor() {
    super('pacientes');
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
