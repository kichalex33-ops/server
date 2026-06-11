import { BaseMysqlRepository } from './BaseMysqlRepository.js';
export class MotoristaMysqlRepository extends BaseMysqlRepository {
    constructor() {
        super('motoristas');
    }
    // Sobrescreve addItem para compatibilidade com interface do factory
    async addItem(collection, item) {
        return this.create(item);
    }
    async updateItem(collection, id, patch) {
        return this.update(id, patch);
    }
    getCollection(collection) {
        return this.findAll();
    }
}
