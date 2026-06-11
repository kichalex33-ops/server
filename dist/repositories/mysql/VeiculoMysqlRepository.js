import { BaseMysqlRepository } from './BaseMysqlRepository.js';
export class VeiculoMysqlRepository extends BaseMysqlRepository {
    constructor() {
        super('veiculos');
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
