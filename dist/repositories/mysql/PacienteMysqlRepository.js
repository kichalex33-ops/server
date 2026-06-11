import { BaseMysqlRepository } from './BaseMysqlRepository.js';
export class PacienteMysqlRepository extends BaseMysqlRepository {
    constructor() {
        super('pacientes');
    }
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
